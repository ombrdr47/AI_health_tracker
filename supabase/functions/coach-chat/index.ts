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

    const body = await req.json().catch(() => null);
    const message = body?.message;

    if (typeof message !== "string" || message.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic abuse prevention (per-request size)
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(authHeader);

    // Decode Kong-verified JWT directly to bypass Deno/jose ES256 algorithm support bug
    const token = authHeader.replace("Bearer ", "").trim();
    let userId: string;
    try {
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payloadStr = atob(payloadB64);
      userId = JSON.parse(payloadStr).sub;
      if (!userId) throw new Error("No sub in JWT");
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid verified JWT format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("height_cm, weight_kg, bmi, diet_type, allergies, cuisine_preferences, goal, gender")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: recentMeals } = await supabase
      .from("meals")
      .select("id, meal_time, title")
      .order("meal_time", { ascending: false })
      .limit(5);

    let menstrualContext = null;
    if (profile?.gender === "Female") {
      const { data: logs } = await supabase
        .from("menstrual_logs")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(1);
      
      if (logs && logs.length > 0 && !logs[0].end_date) {
        menstrualContext = `Currently Mentstruating since ${logs[0].start_date}. Guide them on healthy iron/comfort foods correctly.`;
      }
    }

    // Persist user message
    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "user",
      content: message.trim(),
    });

    const system =
      "You are a nutrition coach for an Android app focused on Indian and Indian-diaspora foods. " +
      "Keep responses very brief and strictly structured. Provide maximum detail in minimal words. Avoid long prose. " +
      "Be practical and culturally relevant (Indian home food, snacks, eating out). " +
      "Use the user's BMI, diet_type, and goals if available. " +
      "CRITICAL: If the user is Vegetarian or Vegan, absolutely DO NOT suggest non-veg/meat/seafood/eggs. " +
      "Do not claim to be a doctor, do not diagnose, and do not provide medical treatment instructions. " +
      "If the user asks for medical advice, recommend consulting a clinician. " +
      "Never invent precise calories/macros unless the user provided them; give ranges and portion guidance instead.";

    const contextLines: string[] = [];
    if (profile?.height_cm) contextLines.push(`Height: ${profile.height_cm} cm`);
    if (profile?.weight_kg) contextLines.push(`Weight: ${profile.weight_kg} kg`);
    if (profile?.bmi) contextLines.push(`BMI: ${profile.bmi}`);
    if (profile?.gender) contextLines.push(`Gender: ${profile.gender}`);
    if (profile?.goal) contextLines.push(`Goal: ${profile.goal}`);
    if (profile?.diet_type) contextLines.push(`Diet: ${profile.diet_type}`);
    if (profile?.allergies) contextLines.push(`Allergies: ${profile.allergies}`);
    if (menstrualContext) contextLines.push(`Cycle: ${menstrualContext}`);
    if (profile?.cuisine_preferences)
      contextLines.push(`Cuisine preferences: ${profile.cuisine_preferences}`);
    if (recentMeals && recentMeals.length > 0) {
      contextLines.push(
        `Recent meals: ${recentMeals
          .map((m) => `${m.title} (${new Date(m.meal_time).toLocaleString("en-IN")})`)
          .join(", ")}`
      );
    }

    // Fetch conversation history
    const { data: historyData } = await supabase
      .from("coach_messages")
      .select("role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
      
    // Reverse it to put the oldest memory first, omitting the brand new message we just inserted above
    const history = (historyData ?? [])
      .reverse()
      .filter(h => h.role !== "system");

    const chatPayload: { role: "system"|"user"|"assistant", content: string }[] = [
      { role: "system", content: system },
      ...(contextLines.length ? [{ role: "system", content: `User context:\n${contextLines.join("\n")}` } as const] : [])
    ];

    // Append the last ~10 messages (including the one the user just sent)
    for (const msg of history) {
        chatPayload.push({ role: msg.role as 'user'|'assistant'|'system', content: msg.content });
    }

    const assistant = await groqChat({
      messages: chatPayload,
    });

    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "assistant",
      content: assistant,
    });

    return new Response(JSON.stringify({ reply: assistant }), {
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
