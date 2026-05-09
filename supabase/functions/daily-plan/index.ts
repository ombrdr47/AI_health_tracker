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

    // Decode JWT to get userId
    const token = authHeader.replace("Bearer ", "").trim();
    let userId: string;
    try {
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const parsed = JSON.parse(atob(payloadB64));
      userId = parsed.sub;
      if (!userId) throw new Error("No sub in JWT");
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JWT", details: e instanceof Error ? e.message : String(e) }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile including age_years (fix: was using parsed.user_metadata.age which is undefined)
    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("bmi, goal, diet_type, gender, age_years, height_cm, weight_kg, cuisine_preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (dbError) {
      console.error("DB error fetching profile:", dbError.message);
    }

    // Menstrual context for female users
    let menstrualContext = "";
    if (profile?.gender === "Female") {
      const { data: logs } = await supabase
        .from("menstrual_logs")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(1);

      if (logs && logs.length > 0 && !logs[0].end_date) {
        menstrualContext = `User is currently menstruating (since ${logs[0].start_date}). Include iron-rich foods (spinach, lentils, dates), comfort foods, and gentle hydration targets. Avoid extreme exercise recommendations.`;
      }
    }

    // Today's meals for context
    const since = new Date();
    since.setHours(since.getHours() - 24);
    const { data: todayMeals } = await supabase
      .from("meals")
      .select("title")
      .gte("meal_time", since.toISOString());

    // BMI-based caloric guidance — Feature 4 fix
    const bmi = profile?.bmi ? Number(profile.bmi) : null;
    let caloricGuidance = "";
    if (bmi !== null) {
      if (bmi >= 30) {
        caloricGuidance = `BMI is ${bmi.toFixed(1)} (Obese). Generate a STRICT caloric deficit plan: target ~1400-1600 kcal/day. Emphasize high-fibre vegetables, dal, salads, roti over rice, avoid fried food and sweets entirely.`;
      } else if (bmi >= 25) {
        caloricGuidance = `BMI is ${bmi.toFixed(1)} (Overweight). Generate a MODERATE caloric deficit plan: target ~1600-1800 kcal/day. Reduce portion sizes, emphasise protein-rich foods, limit refined carbs.`;
      } else if (bmi >= 18.5) {
        caloricGuidance = `BMI is ${bmi.toFixed(1)} (Normal). Generate a MAINTENANCE plan: target ~1800-2200 kcal/day depending on activity. Balanced macros, variety of Indian foods.`;
      } else {
        caloricGuidance = `BMI is ${bmi.toFixed(1)} (Underweight). Generate a CALORIC SURPLUS plan: target ~2400-2800 kcal/day. Focus on calorie-dense, protein-rich Indian foods: paneer, dal, ghee, nuts, full-fat milk, banana.`;
      }
    }

    const system =
      "You are a strict JSON-only AI nutrition coach. Generate a personalised daily meal plan for tomorrow. " +
      "Include meals for Morning, Afternoon, Evening, and Dinner, plus recommended sleep_hours and water_ml. " +
      "Focus on Indian home food and regional cuisine preferences where provided. " +
      "CRITICAL DIET RULE: If the user is Vegetarian or Vegan, absolutely DO NOT suggest any non-veg, meat, seafood, or eggs. " +
      "CRITICAL FORMAT: NO markdown, NO extra text, ONLY valid JSON. " +
      `Schema: {"meals": [{"time":"Morning","food":"..."},{"time":"Afternoon","food":"..."},{"time":"Evening","food":"..."},{"time":"Dinner","food":"..."}], "sleep_hours": 8, "water_ml": 2500}`;

    const contextParts: string[] = [];
    if (bmi !== null)        contextParts.push(caloricGuidance);
    if (profile?.goal)       contextParts.push(`Goal: ${profile.goal}`);
    if (profile?.diet_type)  contextParts.push(`Diet type: ${profile.diet_type}`);
    if (profile?.gender)     contextParts.push(`Gender: ${profile.gender}`);
    if (profile?.age_years)  contextParts.push(`Age: ${profile.age_years} years`);  // Fix: was using wrong variable
    if (profile?.cuisine_preferences) contextParts.push(`Cuisine: ${profile.cuisine_preferences}`);
    if (menstrualContext)    contextParts.push(menstrualContext);
    if (todayMeals && todayMeals.length > 0) {
      contextParts.push(`Today's meals already eaten: ${todayMeals.map(m => m.title).join(", ")}. Plan meals that complement these.`);
    }

    const result = await groqChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: contextParts.join("\n") || "Generate a healthy Indian meal plan." },
      ],
    });

    let plan;
    try {
      const jsonStart = result.indexOf("{");
      const jsonEnd = result.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        plan = JSON.parse(result.slice(jsonStart, jsonEnd + 1));
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // Fallback plan
      plan = {
        meals: [
          { time: "Morning", food: "Oats with banana and nuts" },
          { time: "Afternoon", food: "Dal rice with sabzi" },
          { time: "Evening", food: "Sprouts chaat or fruit" },
          { time: "Dinner", food: "Roti with paneer or chicken curry" },
        ],
        sleep_hours: 8,
        water_ml: 2500,
      };
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
