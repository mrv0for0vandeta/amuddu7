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

    // Check for active bookings — schedule deletion if any are active
    const { data: activeBookings } = await supabase
      .from("booking")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["pending", "quoted", "confirmed"]);

    if (activeBookings && activeBookings.length > 0) {
      // Scheduled deletion — mark for deletion after bookings resolve
      await supabase.from("audit_log").insert({
        actor_id: user.id,
        action: "account_deletion_scheduled",
        target_type: "user",
        target_id: user.id,
        reason: `Active bookings: ${activeBookings.length}. Deletion scheduled.`,
      });
      return new Response(JSON.stringify({
        message: "Account deletion scheduled. It will complete once your active bookings are resolved.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Immediate deletion — erase stored and derived data
    const tables = [
      { table: "traveller_profile", column: "user_id" },
      { table: "user_consent", column: "user_id" },
      { table: "user_session", column: "user_id" },
      { table: "item_feedback", column: "user_id" },
    ];

    for (const { table, column } of tables) {
      await supabase.from(table).delete().eq(column, user.id);
    }

    // Soft-delete trips
    await supabase.from("trip").update({ deleted_at: new Date().toISOString() }).eq("user_id", user.id);

    // Delete auth user
    await supabase.auth.admin.deleteUser(user.id);

    await supabase.from("audit_log").insert({
      actor_id: user.id,
      action: "account_deleted",
      target_type: "user",
      target_id: user.id,
      reason: "User requested immediate deletion",
    });

    return new Response(JSON.stringify({ message: "Account deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
