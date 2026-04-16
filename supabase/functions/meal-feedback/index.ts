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
    const mealId = body?.mealId;

    if (typeof mealId !== "string" || !mealId) {
      return new Response(JSON.stringify({ error: "Invalid mealId" }), {
        status: 400,
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

    const { data: meal, error: mealErr } = await supabase
      .from("meals")
      .select("id, meal_time, title, notes")
      .eq("id", mealId)
      .single();

    if (mealErr || !meal) {
      return new Response(JSON.stringify({ error: "Meal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("meal_items")
      .select("food_name, quantity, calories_kcal, protein_g, carbs_g, fat_g")
      .eq("meal_id", mealId);

    const system =
      "You are a nutrition coach focused on Indian and Indian-diaspora foods. " +
      "Give practical feedback on the meal: what was good, what to improve, and 2-3 easy swaps. " +
      "Do not invent exact calories/macros if missing; if provided, use them. " +
      "Avoid medical advice.";

    const mealText = [
      `Meal: ${meal.title}`,
      `Time: ${new Date(meal.meal_time).toLocaleString("en-IN")}`,
      meal.notes ? `Notes: ${meal.notes}` : null,
      items && items.length
        ? `Items:\n${items
            .map((i) =>
              `- ${i.food_name}${i.quantity ? ` (${i.quantity})` : ""}` +
              (i.calories_kcal != null
                ? ` | kcal:${i.calories_kcal}` +
                  (i.protein_g != null ? ` p:${i.protein_g}g` : "") +
                  (i.carbs_g != null ? ` c:${i.carbs_g}g` : "") +
                  (i.fat_g != null ? ` f:${i.fat_g}g` : "")
                : "")
            )
            .join("\n")}`
        : "Items: (none provided)",
    ]
      .filter(Boolean)
      .join("\n");

    const feedback = await groqChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: mealText },
      ],
    });

    return new Response(JSON.stringify({ feedback }), {
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
