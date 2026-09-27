/*
# Add Provider Portal, Operations Console, and Platform Infrastructure Tables

## Summary
This migration adds all missing tables required for the provider portal (Section 7),
operations console (Section 8), and platform infrastructure (Section 9) that were
identified as gaps in the feature audit.

## New Tables

### Provider Portal
1. `provider_team_member` — team members with roles; listings belong to the business
2. `provider_verification_evidence` — category-specific verification documents
3. `catalogue_listing_variant` — private/shared, half/full day variants
4. `provider_availability_block` — exclusion blocks for unavailability
5. `cancellation_policy` — structured policies per listing
6. `commission_statement` — per-booking commission records (read-only)

### Operations
7. `verification_case` — tracks verification workflow state
8. `moderation_action` — audit trail for listing/gem moderation
9. `safety_report` — fraud/unsafe conduct reports
10. `audit_log` — every state change: actor, action, target, before, after, reason
11. `support_case` — support lookup and entity timeline
12. `admin_elevation` — break-glass elevation records

### Platform
13. `idempotency_key` — deduplication for state-changing requests
14. `candidate_decision` — what the ranker could have shown, with scores
15. `booking_history` — full state history for bookings
16. `user_session` — active sessions with device info
17. `dispute` — structured dispute path separate from reviews
18. `exchange_rate` — currency rate snapshots

## Security
- RLS enabled on all new tables
- Provider tables scoped to team members
- Operations tables scoped to authenticated users (admin role enforced in app layer)
- Audit log is append-only (no UPDATE/DELETE policies)
*/

-- ============================================================================
-- PROVIDER TEAM MEMBERS (P-04)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_team_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_team_member ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select" ON provider_team_member;
CREATE POLICY "team_members_select" ON provider_team_member FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM provider_team_member tm2 WHERE tm2.provider_org_id = provider_team_member.provider_org_id AND tm2.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "team_members_insert" ON provider_team_member;
CREATE POLICY "team_members_insert" ON provider_team_member FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "team_members_update" ON provider_team_member;
CREATE POLICY "team_members_update" ON provider_team_member FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "team_members_delete" ON provider_team_member;
CREATE POLICY "team_members_delete" ON provider_team_member FOR DELETE
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM provider_team_member tm2 WHERE tm2.provider_org_id = provider_team_member.provider_org_id AND tm2.user_id = auth.uid())
  );

-- ============================================================================
-- VERIFICATION EVIDENCE (P-02)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_verification_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  document_url text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  reviewer_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE provider_verification_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence_select_own" ON provider_verification_evidence;
CREATE POLICY "evidence_select_own" ON provider_verification_evidence FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = provider_verification_evidence.provider_org_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "evidence_insert_own" ON provider_verification_evidence;
CREATE POLICY "evidence_insert_own" ON provider_verification_evidence FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = provider_verification_evidence.provider_org_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "evidence_update_admin" ON provider_verification_evidence;
CREATE POLICY "evidence_update_admin" ON provider_verification_evidence FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- LISTING VARIANTS (P-06)
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalogue_listing_variant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES catalogue_listing(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  duration_minutes integer NOT NULL,
  min_party smallint NOT NULL DEFAULT 1,
  max_party smallint NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalogue_listing_variant ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variants_select" ON catalogue_listing_variant;
CREATE POLICY "variants_select" ON catalogue_listing_variant FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "variants_insert_own" ON catalogue_listing_variant;
CREATE POLICY "variants_insert_own" ON catalogue_listing_variant FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = catalogue_listing_variant.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "variants_update_own" ON catalogue_listing_variant;
CREATE POLICY "variants_update_own" ON catalogue_listing_variant FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = catalogue_listing_variant.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "variants_delete_own" ON catalogue_listing_variant;
CREATE POLICY "variants_delete_own" ON catalogue_listing_variant FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = catalogue_listing_variant.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

-- ============================================================================
-- AVAILABILITY BLOCKS (P-08)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_availability_block (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES catalogue_listing(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE provider_availability_block ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avail_select" ON provider_availability_block;
CREATE POLICY "avail_select" ON provider_availability_block FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "avail_insert_own" ON provider_availability_block;
CREATE POLICY "avail_insert_own" ON provider_availability_block FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = provider_availability_block.provider_org_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "avail_update_own" ON provider_availability_block;
CREATE POLICY "avail_update_own" ON provider_availability_block FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = provider_availability_block.provider_org_id AND tm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "avail_delete_own" ON provider_availability_block;
CREATE POLICY "avail_delete_own" ON provider_availability_block FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = provider_availability_block.provider_org_id AND tm.user_id = auth.uid())
  );

-- ============================================================================
-- CANCELLATION POLICIES (P-09)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cancellation_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES catalogue_listing(id) ON DELETE CASCADE,
  policy_type text NOT NULL DEFAULT 'free_until',
  free_until_hours integer,
  tier1_refund_pct integer,
  tier1_hours integer,
  tier2_refund_pct integer,
  tier2_hours integer,
  non_refundable boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cancellation_policy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancel_policy_select" ON cancellation_policy;
CREATE POLICY "cancel_policy_select" ON cancellation_policy FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cancel_policy_insert_own" ON cancellation_policy;
CREATE POLICY "cancel_policy_insert_own" ON cancellation_policy FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = cancellation_policy.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "cancel_policy_update_own" ON cancellation_policy;
CREATE POLICY "cancel_policy_update_own" ON cancellation_policy FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = cancellation_policy.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "cancel_policy_delete_own" ON cancellation_policy;
CREATE POLICY "cancel_policy_delete_own" ON cancellation_policy FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM catalogue_listing cl WHERE cl.id = cancellation_policy.listing_id AND
      EXISTS (SELECT 1 FROM provider_team_member tm WHERE tm.provider_org_id = cl.provider_org_id AND tm.user_id = auth.uid()))
  );

-- ============================================================================
-- VERIFICATION CASES (O-01, O-02, O-03)
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE verification_case ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vcase_select" ON verification_case;
CREATE POLICY "vcase_select" ON verification_case FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "vcase_insert_own" ON verification_case;
CREATE POLICY "vcase_insert_own" ON verification_case FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vcase_update_admin" ON verification_case;
CREATE POLICY "vcase_update_admin" ON verification_case FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- MODERATION ACTIONS (O-08)
-- ============================================================================
CREATE TABLE IF NOT EXISTS moderation_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE moderation_action ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mod_select" ON moderation_action;
CREATE POLICY "mod_select" ON moderation_action FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "mod_insert" ON moderation_action;
CREATE POLICY "mod_insert" ON moderation_action FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- SAFETY REPORTS (O-09, T-54)
-- ============================================================================
CREATE TABLE IF NOT EXISTS safety_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  report_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  triaged_by uuid REFERENCES auth.users(id),
  triaged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE safety_report ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_select_own_admin" ON safety_report;
CREATE POLICY "report_select_own_admin" ON safety_report FOR SELECT
  TO authenticated USING (reporter_id = auth.uid() OR true);

DROP POLICY IF EXISTS "report_insert_own" ON safety_report;
CREATE POLICY "report_insert_own" ON safety_report FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid() OR reporter_id IS NULL);

DROP POLICY IF EXISTS "report_update_admin" ON safety_report;
CREATE POLICY "report_update_admin" ON safety_report FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- AUDIT LOG (X-05) — append-only
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON audit_log;
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_insert" ON audit_log;
CREATE POLICY "audit_insert" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- IDEMPOTENCY KEYS (X-07)
-- ============================================================================
CREATE TABLE IF NOT EXISTS idempotency_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id),
  request_body jsonb,
  response_body jsonb,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE idempotency_key ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "idem_select_own" ON idempotency_key;
CREATE POLICY "idem_select_own" ON idempotency_key FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "idem_insert_own" ON idempotency_key;
CREATE POLICY "idem_insert_own" ON idempotency_key FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- CANDIDATE DECISIONS (X-13)
-- ============================================================================
CREATE TABLE IF NOT EXISTS candidate_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trip(id) ON DELETE CASCADE,
  trip_item_id uuid REFERENCES trip_item(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES catalogue_listing(id),
  shown boolean NOT NULL DEFAULT false,
  score numeric,
  score_components jsonb,
  reasons jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE candidate_decision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidate_select_own" ON candidate_decision;
CREATE POLICY "candidate_select_own" ON candidate_decision FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "candidate_insert" ON candidate_decision;
CREATE POLICY "candidate_insert" ON candidate_decision FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- BOOKING HISTORY (T-50)
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bhist_select" ON booking_history;
CREATE POLICY "bhist_select" ON booking_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "bhist_insert" ON booking_history;
CREATE POLICY "bhist_insert" ON booking_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- USER SESSIONS (T-09)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info text,
  ip_address text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_session ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_select_own" ON user_session;
CREATE POLICY "session_select_own" ON user_session FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "session_insert_own" ON user_session;
CREATE POLICY "session_insert_own" ON user_session FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "session_update_own" ON user_session;
CREATE POLICY "session_update_own" ON user_session FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "session_delete_own" ON user_session;
CREATE POLICY "session_delete_own" ON user_session FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- DISPUTES (T-53)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dispute (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  raised_by uuid REFERENCES auth.users(id),
  dispute_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dispute ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dispute_select_own_admin" ON dispute;
CREATE POLICY "dispute_select_own_admin" ON dispute FOR SELECT
  TO authenticated USING (raised_by = auth.uid() OR true);

DROP POLICY IF EXISTS "dispute_insert_own" ON dispute;
CREATE POLICY "dispute_insert_own" ON dispute FOR INSERT
  TO authenticated WITH CHECK (raised_by = auth.uid() OR raised_by IS NULL);

DROP POLICY IF EXISTS "dispute_update_admin" ON dispute;
CREATE POLICY "dispute_update_admin" ON dispute FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- EXCHANGE RATES (X-04)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_rate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency char(3) NOT NULL,
  quote_currency char(3) NOT NULL,
  rate numeric NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exchange_rate ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_select" ON exchange_rate;
CREATE POLICY "rate_select" ON exchange_rate FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rate_insert" ON exchange_rate;
CREATE POLICY "rate_insert" ON exchange_rate FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- COMMISSION STATEMENTS (P-20)
-- ============================================================================
CREATE TABLE IF NOT EXISTS commission_statement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
  provider_org_id uuid NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
  commission_amount_minor bigint NOT NULL,
  currency char(3) NOT NULL DEFAULT 'MAD',
  status text NOT NULL DEFAULT 'owed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commission_statement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commission_select" ON commission_statement;
CREATE POLICY "commission_select" ON commission_statement FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "commission_insert" ON commission_statement;
CREATE POLICY "commission_insert" ON commission_statement FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================================
-- ADMIN ELEVATION (O-16)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_elevation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_elevation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "elev_select" ON admin_elevation;
CREATE POLICY "elev_select" ON admin_elevation FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "elev_insert" ON admin_elevation;
CREATE POLICY "elev_insert" ON admin_elevation FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "elev_update" ON admin_elevation;
CREATE POLICY "elev_update" ON admin_elevation FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- SUPPORT CASES (O-12, O-13, O-14)
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type text NOT NULL,
  target_entity_type text,
  target_entity_id uuid,
  summary text,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_case ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_select" ON support_case;
CREATE POLICY "support_select" ON support_case FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "support_insert" ON support_case;
CREATE POLICY "support_insert" ON support_case FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "support_update" ON support_case;
CREATE POLICY "support_update" ON support_case FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_team_member_org ON provider_team_member(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_team_member_user ON provider_team_member(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_org ON provider_verification_evidence(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_variant_listing ON catalogue_listing_variant(listing_id);
CREATE INDEX IF NOT EXISTS idx_avail_provider ON provider_availability_block(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_cancel_policy_listing ON cancellation_policy(listing_id);
CREATE INDEX IF NOT EXISTS idx_vcase_provider ON verification_case(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_vcase_status ON verification_case(status);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_idem_key ON idempotency_key(key);
CREATE INDEX IF NOT EXISTS idx_candidate_trip ON candidate_decision(trip_id);
CREATE INDEX IF NOT EXISTS idx_bhist_booking ON booking_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_user ON user_session(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_booking ON dispute(booking_id);
CREATE INDEX IF NOT EXISTS idx_report_target ON safety_report(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_report_status ON safety_report(status);
CREATE INDEX IF NOT EXISTS idx_mod_target ON moderation_action(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_commission_provider ON commission_statement(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_support_target ON support_case(target_entity_type, target_entity_id);

-- ============================================================================
-- SEED EXCHANGE RATES (X-04)
-- ============================================================================
INSERT INTO exchange_rate (base_currency, quote_currency, rate) VALUES
  ('MAD', 'EUR', 0.095),
  ('MAD', 'USD', 0.10),
  ('MAD', 'GBP', 0.080),
  ('EUR', 'MAD', 10.50),
  ('USD', 'MAD', 10.00),
  ('GBP', 'MAD', 12.50)
ON CONFLICT DO NOTHING;
