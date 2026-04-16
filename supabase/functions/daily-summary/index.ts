import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { groqChat } from "../_shared/groq.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(authHeader);
    const { data: userData, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("bmi, goal, diet_type")
      .eq("user_id", userId)
      .maybeSingle();

    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: meals } = await supabase
      .from("meals")
      .select("meal_time, title")
      .gte("meal_time", since.toISOString())
      .order("meal_time", { ascending: true });

    const { data: moods } = await supabase
      .from("mood_logs")
      .select("logged_at, mood_score")
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: true });

    const { data: water } = await supabase
      .from("water_logs")
      .select("logged_at, amount_ml")
      .gte("logged_at", since.toISOString());

    const { data: sleep } = await supabase
      .from("sleep_logs")
      .select("logged_at, quality, hours")
      .gte("logged_at", since.toISOString())
      .order("logged_at", { ascending: false })
      .limit(1);

    const system =
      "You are a nutrition coach focused on Indian and Indian-diaspora foods. " +
      "Summarize the last 24 hours and propose 3 concrete next-day actions. " +
      "If data is missing, say so and suggest what to log. Avoid medical advice.";

    const context = {
      profile,
      meals: meals ?? [],
      mood: moods ?? [],
      water_ml_total: (water ?? []).reduce((sum, w) => sum + (w.amount_ml ?? 0), 0),
      last_sleep: sleep?.[0] ?? null,
    };

    const summary = await groqChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(context) },
      ],
    });

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});


console.log("Updated model to openai/gpt-oss-120b");
