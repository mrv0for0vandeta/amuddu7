import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather all user data
    const [profile, trips, bookings, conversations, consent, sessions] = await Promise.all([
      supabase.from("traveller_profile").select("*").eq("user_id", user.id),
      supabase.from("trip").select("*").eq("user_id", user.id),
      supabase.from("booking").select("*").eq("user_id", user.id),
      supabase.from("conversation").select("*").eq("user_id", user.id),
      supabase.from("user_consent").select("*").eq("user_id", user.id),
      supabase.from("user_session").select("*").eq("user_id", user.id),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      trips: trips.data,
      bookings: bookings.data,
      conversations: conversations.data,
      consent: consent.data,
      sessions: sessions.data,
    };

    // Log the export request
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "data_export",
      target_type: "user",
      target_id: user.id,
      reason: "User requested data export",
    });

    // Return the data directly as machine-readable JSON
    // In production this would generate a signed expiring link
    return new Response(JSON.stringify({
      url: null,
      message: "Your data export is ready. Download it from the account page.",
      data: exportData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
