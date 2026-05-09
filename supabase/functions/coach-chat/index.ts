import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { groqChat } from "../_shared/groq.ts";

// ── Question classifier ───────────────────────────────────────────────────────
// Classifies the user message so we can fetch only relevant context.
type QuestionType = "DIET_PLAN" | "WEIGHT_GOAL" | "SYMPTOM" | "LOG_HELP" | "MENSTRUAL" | "GENERAL";

function classifyQuestion(msg: string): QuestionType {
  const m = msg.toLowerCase();
  if (/period|menstrual|cycle|cramp|pms|iron|bleeding/.test(m))          return "MENSTRUAL";
  if (/lose weight|gain weight|weight loss|weight gain|fat|slim|bulk/.test(m)) return "WEIGHT_GOAL";
  if (/feel sick|nausea|bloat|tired|fatigue|dizzy|headache|pain|symptom/.test(m)) return "SYMPTOM";
  if (/how to log|how do i log|where to log|track|record|app|feature/.test(m)) return "LOG_HELP";
  if (/eat|food|meal|diet|breakfast|lunch|dinner|snack|recipe|cook|calorie|protein|carb|fat|nutrition/.test(m)) return "DIET_PLAN";
  return "GENERAL";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const message = body?.message;

    if (typeof message !== "string" || message.trim().length < 1) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message too long" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode JWT
    const token = authHeader.replace("Bearer ", "").trim();
    let userId: string;
    try {
      const payloadB64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      userId = JSON.parse(atob(payloadB64)).sub;
      if (!userId) throw new Error("No sub in JWT");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JWT" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient(authHeader);
    const qtype = classifyQuestion(message);

    // ── Fetch base profile (always needed) ───────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("height_cm, weight_kg, bmi, age_years, diet_type, allergies, cuisine_preferences, goal, gender")
      .eq("user_id", userId)
      .maybeSingle();

    // ── Selectively fetch context based on question type ─────────────────────
    let recentMeals: { title: string; meal_time: string }[] = [];
    let weightTrend: { weight_kg: number; logged_at: string }[] = [];
    let menstrualContext = "";

    // Always fetch last 5 meals for diet/nutrition questions
    if (qtype === "DIET_PLAN" || qtype === "WEIGHT_GOAL" || qtype === "GENERAL") {
      const { data } = await supabase
        .from("meals")
        .select("title, meal_time")
        .order("meal_time", { ascending: false })
        .limit(5);
      recentMeals = data ?? [];
    }

    // Fetch weight trend for weight goal questions
    if (qtype === "WEIGHT_GOAL") {
      const { data } = await supabase
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .order("logged_at", { ascending: false })
        .limit(7);
      weightTrend = data ?? [];
    }

    // Always fetch menstrual context for female users or menstrual questions
    if (profile?.gender === "Female" || qtype === "MENSTRUAL") {
      const { data: logs } = await supabase
        .from("menstrual_logs")
        .select("start_date, end_date")
        .eq("user_id", userId)
        .order("start_date", { ascending: false })
        .limit(1);

      if (logs && logs.length > 0) {
        if (!logs[0].end_date) {
          menstrualContext = `Currently menstruating since ${logs[0].start_date}. Prioritise iron-rich foods (spinach, lentils, dates), comfort and hydration. Avoid recommending intense workouts.`;
        } else {
          menstrualContext = `Last period ended on ${logs[0].end_date}.`;
        }
      }
    }

    // ── Persist user message ─────────────────────────────────────────────────
    await supabase.from("coach_messages").insert({
      user_id: userId, role: "user", content: message.trim(),
    });

    // ── Build system prompt with structured sections ──────────────────────────
    const bmi = profile?.bmi ? Number(profile.bmi) : null;
    const bmiClass = bmi == null ? null :
      bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";

    // Role & ground rules (always included)
    const roleSection =
      "You are a knowledgeable, concise nutrition coach for an Indian food tracking app. " +
      "You specialise in Indian and Indian-diaspora cuisine (dal, roti, sabzi, biryani, idli, dosa, etc.). " +
      "Keep ALL responses brief, practical, and structured — use bullet points or short paragraphs. Never write long essays.";

    const rulesSection =
      "STRICT RULES:\n" +
      (profile?.diet_type === "Vegetarian" || profile?.diet_type === "Vegan"
        ? `- User is ${profile.diet_type}. NEVER suggest meat, poultry, seafood, or eggs under ANY circumstances.\n`
        : "") +
      (profile?.allergies ? `- User allergies: ${profile.allergies}. Never suggest these foods.\n` : "") +
      "- Never diagnose medical conditions or provide medical treatment advice.\n" +
      "- If a symptom sounds serious, advise consulting a doctor.\n" +
      "- Never invent precise calorie numbers unless the user provided the food data.\n" +
      "- For LOG_HELP questions: explain the app has tabs for logging meals, water, weight, sleep, mood.\n";

    // Dynamic context section (varies by question type)
    const contextLines: string[] = [];

    if (bmi !== null) {
      contextLines.push(`BMI: ${bmi.toFixed(1)} (${bmiClass})`);
      if (bmiClass === "Obese" || bmiClass === "Overweight") {
        contextLines.push(`Weight goal: caloric deficit diet recommended. Focus on low-cal, high-fibre, high-protein Indian foods.`);
      } else if (bmiClass === "Underweight") {
        contextLines.push(`Weight goal: caloric surplus recommended. Focus on calorie-dense, nutrient-rich foods.`);
      }
    }
    if (profile?.weight_kg)   contextLines.push(`Current weight: ${profile.weight_kg} kg`);
    if (profile?.age_years)   contextLines.push(`Age: ${profile.age_years} years`);
    if (profile?.goal)        contextLines.push(`User's stated goal: ${profile.goal}`);
    if (profile?.diet_type)   contextLines.push(`Diet: ${profile.diet_type}`);
    if (profile?.cuisine_preferences) contextLines.push(`Cuisine preferences: ${profile.cuisine_preferences}`);
    if (menstrualContext)     contextLines.push(`Menstrual info: ${menstrualContext}`);

    if (recentMeals.length > 0) {
      contextLines.push(`Recent meals: ${recentMeals.map(m => m.title).join(", ")}`);
    }

    if (weightTrend.length >= 2) {
      const oldest = weightTrend[weightTrend.length - 1].weight_kg;
      const newest = weightTrend[0].weight_kg;
      const diff = newest - oldest;
      const direction = diff > 0.2 ? "gaining" : diff < -0.2 ? "losing" : "stable";
      contextLines.push(`Weight trend (last ${weightTrend.length} logs): ${direction} (${oldest.toFixed(1)} → ${newest.toFixed(1)} kg)`);
    }

    // Question-type-specific instruction
    const qtypeInstruction: Record<QuestionType, string> = {
      DIET_PLAN:    "Answer with specific Indian food suggestions. Give 2-3 practical options with estimated portions.",
      WEIGHT_GOAL:  "Answer with weight management advice grounded in their BMI and trend. Give actionable steps.",
      SYMPTOM:      "Acknowledge the symptom empathetically. Suggest relevant dietary adjustments. If serious, recommend seeing a doctor.",
      LOG_HELP:     "Explain how to use the app to log the relevant metric. Be brief and step-by-step.",
      MENSTRUAL:    "Give period-specific nutrition advice: iron-rich foods, hydration, comfort foods relevant to Indian cuisine.",
      GENERAL:      "Give a helpful, concise response relevant to health and nutrition.",
    };

    // ── Conversation history (last 10 messages) ──────────────────────────────
    const { data: historyData } = await supabase
      .from("coach_messages")
      .select("role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = ((historyData ?? []).reverse()).filter(h => h.role !== "system");

    // ── Build final message array ─────────────────────────────────────────────
    const chatPayload: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: roleSection },
      { role: "system", content: rulesSection },
    ];

    if (contextLines.length > 0) {
      chatPayload.push({ role: "system", content: `User context:\n${contextLines.join("\n")}` });
    }

    chatPayload.push({ role: "system", content: `Question type detected: ${qtype}. ${qtypeInstruction[qtype]}` });

    for (const msg of history) {
      chatPayload.push({ role: msg.role as "user" | "assistant" | "system", content: msg.content });
    }

    const assistant = await groqChat({ messages: chatPayload });

    await supabase.from("coach_messages").insert({
      user_id: userId, role: "assistant", content: assistant,
    });

    return new Response(JSON.stringify({ reply: assistant }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
