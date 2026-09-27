import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TEMPLATES: Record<string, string> = {
  new_enquiry: "New enquiry from a traveller on Amuddu. Check your inbox to respond within 24 hours.",
  reminder_18h: "You have an enquiry that has not been answered for 18 hours. Please respond soon.",
  booking_confirmed: "A booking has been confirmed. Check your Amuddu portal for details.",
  booking_changed: "A booking has been changed. Please review the details in your Amuddu portal.",
  booking_cancelled: "A booking has been cancelled. Check your Amuddu portal for details.",
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

    const { provider_org_id, template_type, booking_id } = await req.json();

    if (!provider_org_id || !template_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = TEMPLATES[template_type];
    if (!message) {
      return new Response(JSON.stringify({ error: "Unknown template type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch provider phone
    const { data: provider, error: pErr } = await supabase
      .from("provider_org")
      .select("display_name, legal_name")
      .eq("id", provider_org_id)
      .maybeSingle();

    if (pErr || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // In production, this would call the WhatsApp Business API with a pre-approved template.
    // For MVP, we log the notification and write an outbox event.
    await supabase.from("outbox").insert({
      aggregate_type: "provider_notification",
      aggregate_id: provider_org_id,
      event_type: `whatsapp_${template_type}`,
      payload: {
        provider_org_id,
        template_type,
        message,
        booking_id: booking_id ?? null,
        provider_name: (provider as { display_name: string }).display_name,
      },
      status: "pending",
    });

    // Also write audit log
    await supabase.from("audit_log").insert({
      action: `whatsapp_${template_type}`,
      target_type: "provider_org",
      target_id: provider_org_id,
      reason: `WhatsApp notification sent: ${template_type}`,
    });

    return new Response(JSON.stringify({
      message: "WhatsApp notification queued",
      template: template_type,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
