import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { groqChat } from "../_shared/groq.ts";

Deno.serve(async (req) => {
  console.log("=== EDGE FUNCTION TRACE: daily-plan STARTED ===");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header exists:", !!authHeader);
    
    if (!authHeader) {
      console.error("Missing Auth header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(authHeader);

    // Decode Kong-verified JWT directly
    const token = authHeader.replace("Bearer ", "").trim();
    let userId: string;
    try {
      console.log("Attempting to parse base64 JWT payload...");
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payloadStr = atob(payloadB64);
      const parsed = JSON.parse(payloadStr);
      console.log("JWT Payload decoded successfully, sub:", parsed.sub);
      userId = parsed.sub;
      if (!userId) throw new Error("No sub in JWT");
    } catch (e) {
      console.error("JWT Parsing Error:", e);
      return new Response(JSON.stringify({ error: "Invalid verified JWT format", details: e instanceof Error ? e.message : String(e) }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Executing Supabase DB Query for userId:", userId);
    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("bmi, goal, diet_type, gender")
      .eq("user_id", userId)
      .maybeSingle();

    if (dbError) {
      console.error("Database Error:", dbError);
    } else {
      console.log("Profile retrieved successfully");
    }

    let menstrualLogs = [];
    if (profile?.gender === "Female") {
      const { data: logs } = await supabase
        .from("menstrual_logs")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(1);
      
      if (logs && logs.length > 0) {
        menstrualLogs = logs;
      }
    }

    const system =
      "You are a strict JSON-only AI nutrition coach. Generate a daily meal plan for tomorrow. " +
      "Include recommended food for morning, afternoon, evening, and dinner. " +
      "Also include recommended sleep_hours and water_ml based on user profile. " +
      "CRITICAL: If the user is Vegetarian or Vegan strictly avoid suggesting any non-veg or meat items. You can suggest vegetarian diets to non-vegetarians if it fits their goals. " +
      "Take into account their cuisine preferences (e.g., South Indian, North Indian) and their goals (e.g., Gym, high protein). " +
      "If the user is Female and currently menstruating (e.g., has an active menstrual_log start_date without an end_date), carefully incorporate iron-rich foods, comfortable hydration goals, and gentle adjustments to the plan avoiding extreme workouts. " +
      "NO markdown, NO outside text, ONLY valid JSON. " +
      "Schema: {\"meals\": [{\"time\":\"Morning\", \"food\":\"...\"}], \"sleep_hours\": 8, \"water_ml\": 2500}";

    const since = new Date();
    since.setHours(since.getHours() - 24);

    const { data: todayMeals } = await supabase
      .from("meals")
      .select("title")
      .gte("meal_time", since.toISOString());

    const context = {
      profile: profile ?? {},
      menstrual_info: menstrualLogs,
      today_meals: todayMeals ?? []
    };

    const result = await groqChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(context) },
      ],
    });

    let plan;
    try {
        const jsonStart = result.indexOf("{");
        const jsonEnd = result.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
            plan = JSON.parse(result.slice(jsonStart, jsonEnd + 1));
        } else {
            throw new Error("No JSON found");
        }
    } catch {
        plan = { meals: [{time: "Morning", food: "Oats with fruits"}, {time: "Afternoon", food: "Rice and lentils"}], sleep_hours: 8, water_ml: 2500 };
    }

    return new Response(JSON.stringify(plan), {
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
