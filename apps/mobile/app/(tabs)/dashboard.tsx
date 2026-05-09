import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ProgressChart, LineChart } from "react-native-chart-kit";
import * as SecureStore from "expo-secure-store";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const SCREEN_WIDTH = Dimensions.get("window").width;

type ProfileRow = {
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  gender: string | null;
  updated_at: string;
};

type MealRow = { id: string; title: string; meal_time: string };
type MoodRow = { mood_score: number; logged_at: string };
type SleepRow = { hours: number | null; quality: number; logged_at: string };
type WeightRow = { weight_kg: number; logged_at: string };
type MenstrualRow = { id: string; start_date: string; end_date: string | null; notes: string | null };
type DailyPlan = { date: string; meals: { time: string; food: string }[]; sleep_hours: number; water_ml: number };

function startOfLocalDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, days: number) { const x = new Date(d); x.setDate(x.getDate() + days); return x; }
function formatTime(iso: string) { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); }

function getBmiLabel(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "#2563EB", bg: "#DBEAFE" };
  if (bmi < 25)   return { label: "Normal",      color: "#16A34A", bg: "#DCFCE7" };
  if (bmi < 30)   return { label: "Overweight",  color: "#D97706", bg: "#FEF3C7" };
  return              { label: "Obese",       color: "#DC2626", bg: "#FEE2E2" };
}

// ── BMI Card ──────────────────────────────────────────────────────────────────
function BmiCard({ bmi }: { bmi: number | null }) {
  if (bmi == null) {
    return (
      <View style={[styles.card, { borderColor: "#E5E7EB" }]}>
        <Text style={styles.cardTitle}>Body Mass Index (BMI)</Text>
        <Text style={styles.muted}>
          Go to Profile tab and save your height & weight to calculate BMI.
        </Text>
      </View>
    );
  }

  const { label, color, bg } = getBmiLabel(bmi);
  // BMI bar: map 10–40 range to 0–100%
  const barPct = Math.min(Math.max((bmi - 10) / 30, 0), 1);

  return (
    <View style={[styles.card, { borderColor: color, borderWidth: 1.5 }]}>
      <Text style={styles.cardTitle}>Body Mass Index (BMI)</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View>
          <Text style={{ fontSize: 42, fontWeight: "800", color }}>{bmi.toFixed(1)}</Text>
        </View>
        <View style={[styles.bmiBadge, { backgroundColor: bg }]}>
          <Text style={[styles.bmiBadgeText, { color }]}>{label}</Text>
        </View>
      </View>

      {/* BMI scale bar */}
      <View style={{ marginTop: 4 }}>
        <View style={styles.bmiBar}>
          <View style={[styles.bmiBarUnder,  { flex: 0.245 }]} />
          <View style={[styles.bmiBarNormal, { flex: 0.217 }]} />
          <View style={[styles.bmiBarOver,   { flex: 0.167 }]} />
          <View style={[styles.bmiBarObese,  { flex: 0.371 }]} />
        </View>
        {/* Needle */}
        <View style={[styles.bmiNeedle, { left: `${(barPct * 100).toFixed(0)}%` as any }]} />
        <View style={styles.bmiLabelsRow}>
          <Text style={styles.bmiScaleLabel}>10</Text>
          <Text style={styles.bmiScaleLabel}>18.5</Text>
          <Text style={styles.bmiScaleLabel}>25</Text>
          <Text style={styles.bmiScaleLabel}>30</Text>
          <Text style={styles.bmiScaleLabel}>40</Text>
        </View>
      </View>

      <Text style={[styles.muted, { marginTop: 2 }]}>
        {label === "Underweight" && "Your diet plan will focus on healthy caloric surplus and protein."}
        {label === "Normal"      && "You're in a healthy range. Plan focuses on maintaining balance."}
        {label === "Overweight"  && "Your diet plan will target a moderate caloric deficit."}
        {label === "Obese"       && "Your diet plan will focus on a structured caloric deficit."}
      </Text>
    </View>
  );
}

// ── Weight Progress Graph ─────────────────────────────────────────────────────
function WeightGraph({ history }: { history: [string, number][] }) {
  if (history.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weight Progress</Text>
        <Text style={styles.muted}>Log your weight at least twice to see your progress graph.</Text>
      </View>
    );
  }

  // Use last 7 entries
  const recent = history.slice(-7);
  const labels = recent.map(([d]) => d);
  const data   = recent.map(([, w]) => w);

  const first = data[0];
  const last  = data[data.length - 1];
  const diff  = last - first;
  const trend = diff > 0.2 ? "↗ Gaining" : diff < -0.2 ? "↘ Losing" : "→ Stable";
  const trendColor = diff > 0.2 ? "#DC2626" : diff < -0.2 ? "#16A34A" : "#6B7280";

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.cardTitle}>Weight Progress</Text>
        <Text style={[styles.muted, { color: trendColor, fontWeight: "700", fontSize: 13 }]}>{trend}</Text>
      </View>
      <Text style={styles.muted}>Last {recent.length} entries • kg</Text>
      <LineChart
        data={{ labels, datasets: [{ data }] }}
        width={SCREEN_WIDTH - 64}
        height={160}
        yAxisSuffix=" kg"
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 1,
          color: (o = 1) => `rgba(99, 102, 241, ${o})`,
          labelColor: (o = 1) => `rgba(107, 114, 128, ${o})`,
          propsForDots: { r: "4", strokeWidth: "2", stroke: "#6366F1" },
        }}
        bezier
        style={{ borderRadius: 10, marginLeft: -16 }}
        withShadow={false}
      />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useSession();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [meals, setMeals] = React.useState<MealRow[]>([]);
  const [waterTotalMl, setWaterTotalMl] = React.useState<number>(0);
  const [mood, setMood] = React.useState<MoodRow | null>(null);
  const [sleep, setSleep] = React.useState<SleepRow | null>(null);
  const [weight, setWeight] = React.useState<WeightRow | null>(null);
  const [weightHistory, setWeightHistory] = React.useState<[string, number][]>([]);
  const [menstrualLogs, setMenstrualLogs] = React.useState<MenstrualRow[]>([]);

  const [nextPlan, setNextPlan] = React.useState<DailyPlan | null>(null);
  const [pastPlanToReview, setPastPlanToReview] = React.useState<DailyPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    setError(null);

    const now = new Date();
    const start = startOfLocalDay(now).toISOString();
    const end = addDays(startOfLocalDay(now), 1).toISOString();

    const [profileRes, mealsRes, waterRes, moodRes, sleepRes, weightRes, menstrualRes, whRes] =
      await Promise.all([
        supabase.from("profiles").select("height_cm,weight_kg,bmi,gender,updated_at").maybeSingle(),
        supabase.from("meals").select("id,title,meal_time").gte("meal_time", start).lt("meal_time", end).order("meal_time", { ascending: false }).limit(10),
        supabase.from("water_logs").select("amount_ml,logged_at").gte("logged_at", start).lt("logged_at", end),
        supabase.from("mood_logs").select("mood_score,logged_at").gte("logged_at", start).lt("logged_at", end).order("logged_at", { ascending: false }).limit(1),
        supabase.from("sleep_logs").select("hours,quality,logged_at").gte("logged_at", start).lt("logged_at", end).order("logged_at", { ascending: false }).limit(1),
        supabase.from("weight_logs").select("weight_kg,logged_at").gte("logged_at", start).lt("logged_at", end).order("logged_at", { ascending: false }).limit(1),
        supabase.from("menstrual_logs").select("id,start_date,end_date,notes").order("start_date", { ascending: false }).limit(5),
        supabase.from("weight_logs").select("weight_kg,logged_at").order("logged_at", { ascending: true }).limit(30),
      ]);

    const firstError = profileRes.error || mealsRes.error || waterRes.error || moodRes.error || sleepRes.error || weightRes.error || menstrualRes.error || whRes.error;
    if (firstError) setError(firstError.message ?? "Failed to load dashboard");

    setProfile((profileRes.data as ProfileRow | null) ?? null);
    setMeals((mealsRes.data as MealRow[]) ?? []);
    setMenstrualLogs((menstrualRes.data as MenstrualRow[]) ?? []);
    setWaterTotalMl(((waterRes.data as { amount_ml: number }[]) ?? []).reduce((s, r) => s + (r.amount_ml || 0), 0));
    setMood(((moodRes.data as MoodRow[] | null)?.[0]) ?? null);
    setSleep(((sleepRes.data as SleepRow[] | null)?.[0]) ?? null);
    setWeight(((weightRes.data as WeightRow[] | null)?.[0]) ?? null);

    if (whRes.data) {
      const trend = (whRes.data as WeightRow[]).map(w =>
        [new Date(w.logged_at).toLocaleDateString([], { month: "short", day: "numeric" }), w.weight_kg] as [string, number]
      );
      setWeightHistory(trend);
    }

    // Load stored AI plan
    try {
      const safeKey = `ai_plan_${session.user.id.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storedGen = await SecureStore.getItemAsync(safeKey);
      if (storedGen) {
        const parsed: DailyPlan = JSON.parse(storedGen);
        const todayStr = startOfLocalDay(new Date()).toISOString();
        const planDateStr = startOfLocalDay(new Date(parsed.date)).toISOString();
        if (planDateStr < todayStr) { setPastPlanToReview(parsed); setNextPlan(null); }
        else { setNextPlan(parsed); setPastPlanToReview(null); }
      } else { setNextPlan(null); setPastPlanToReview(null); }
    } catch { /* ignore */ }

    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const generatePlan = async () => {
    if (!session?.user?.id || !session.access_token) return;
    setGeneratingPlan(true);
    try {
      const resp = await supabase.functions.invoke("daily-plan", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (resp.error) throw resp.error;
      const pd = resp.data as Partial<DailyPlan>;
      const plan: DailyPlan = {
        date: addDays(new Date(), 1).toISOString(),
        meals: pd.meals ?? [{ time: "Morning", food: "Oats with nuts" }, { time: "Afternoon", food: "Lentils and rice" }, { time: "Evening", food: "Yogurt" }, { time: "Dinner", food: "Salad and soup" }],
        sleep_hours: pd.sleep_hours ?? 8,
        water_ml: pd.water_ml ?? 2500,
      };
      const safeKey = `ai_plan_${session.user.id.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await SecureStore.setItemAsync(safeKey, JSON.stringify(plan));
      setNextPlan(plan); setPastPlanToReview(null);
    } catch (err) {
      setError("AI Plan Failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally { setGeneratingPlan(false); }
  };

  const regeneratePlan = async () => {
    const safeKey = `ai_plan_${session!.user.id.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    await SecureStore.deleteItemAsync(safeKey);
    setNextPlan(null);
    await generatePlan();
  };

  const clearPlan = async () => {
    const safeKey = `ai_plan_${session!.user.id.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    await SecureStore.deleteItemAsync(safeKey);
    setNextPlan(null);
  };

  const logPeriodStart = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const today = startOfLocalDay(new Date()).toISOString().split("T")[0];
    const { error } = await supabase.from("menstrual_logs").insert({ user_id: session.user.id, start_date: today });
    if (error) setError(error.message);
    await load();
  };

  const logPeriodEnd = async (logId: string) => {
    setLoading(true);
    const today = startOfLocalDay(new Date()).toISOString().split("T")[0];
    const { error } = await supabase.from("menstrual_logs").update({ end_date: today }).eq("id", logId);
    if (error) setError(error.message);
    await load();
  };

  const confirmPlanComplete = async () => {
    if (!session?.user?.id || !pastPlanToReview) return;
    const safeKey = `ai_plan_${session.user.id.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    await SecureStore.deleteItemAsync(safeKey);
    setPastPlanToReview(null); setNextPlan(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading your dashboard…</Text>
      </View>
    );
  }

  const userName = session?.user?.user_metadata?.full_name || "there";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Hello, {userName}!</Text>
      <Text style={styles.subtitle}>Here is your day at a glance</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Quick Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{meals.length}</Text>
            <Text style={styles.statLabel}>meals</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{waterTotalMl}</Text>
            <Text style={styles.statLabel}>ml water</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{mood ? mood.mood_score : "—"}</Text>
            <Text style={styles.statLabel}>mood</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{sleep?.hours != null ? Number(sleep.hours).toFixed(1) : "—"}</Text>
            <Text style={styles.statLabel}>sleep hrs</Text>
          </View>
        </View>
        {weight && (
          <Text style={styles.muted}>Last weight: {Number(weight.weight_kg).toFixed(1)} kg</Text>
        )}
        <PrimaryButton title="Log something" onPress={() => router.navigate("/(tabs)/log")} />
      </View>

      {/* BMI Card — Feature 1 */}
      <BmiCard bmi={profile?.bmi ?? null} />

      {/* Weight Progress Graph — Feature 3 */}
      <WeightGraph history={weightHistory} />

      {/* Menstrual Cycle */}
      {profile?.gender === "Female" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Menstrual Cycle</Text>
          {menstrualLogs.length > 0 && menstrualLogs[0].start_date ? (
            <View style={{ marginVertical: 6 }}>
              <Text style={{ fontSize: 13, color: "#374151" }}>
                Active Cycle Start: <Text style={{ fontWeight: "700" }}>{menstrualLogs[0].start_date}</Text>
              </Text>
              {!menstrualLogs[0].end_date ? (
                <View style={{ marginTop: 8 }}>
                  <PrimaryButton title="Log Period End" onPress={() => logPeriodEnd(menstrualLogs[0].id)} />
                </View>
              ) : (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 8 }}>Last period ended on {menstrualLogs[0].end_date}</Text>
                  <PrimaryButton title="Log Period Start" onPress={logPeriodStart} />
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginVertical: 6 }}>
              <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>No cycle logged yet.</Text>
              <PrimaryButton title="Log Period Start" onPress={logPeriodStart} />
            </View>
          )}
        </View>
      )}

      {/* Daily Water Goal */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chartTitle}>Daily Water Goal</Text>
            <Text style={styles.muted}>Daily target: 2000ml</Text>
            <Text style={[styles.statValue, { fontSize: 24, marginTop: 4 }]}>{waterTotalMl}ml</Text>
          </View>
          <ProgressChart
            data={{ labels: ["Water"], data: [Math.min(waterTotalMl / 2000, 1)] }}
            width={100} height={100} strokeWidth={12} radius={36}
            chartConfig={{ backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", color: (o = 1) => `rgba(59, 130, 246, ${o})` }}
            hideLegend={true}
          />
        </View>
      </View>

      {/* Recent Meals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent meals</Text>
        {meals.length === 0 ? (
          <Text style={styles.muted}>No meals logged today.</Text>
        ) : (
          meals.map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <Text style={styles.mealTitle}>{m.title}</Text>
              <Text style={styles.mealTime}>{formatTime(m.meal_time)}</Text>
            </View>
          ))
        )}
      </View>

      {/* AI Daily Plan */}
      {pastPlanToReview ? (
        <View style={[styles.card, { borderColor: "#F59E0B", borderWidth: 2 }]}>
          <Text style={styles.cardTitle}>Review Yesterday's Plan</Text>
          <Text style={styles.muted}>Did you follow the AI meal plan and maintain {pastPlanToReview.water_ml}ml water and {pastPlanToReview.sleep_hours}h sleep?</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}><PrimaryButton title="Yes, done" onPress={() => confirmPlanComplete()} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="No, skipped" onPress={() => confirmPlanComplete()} /></View>
          </View>
        </View>
      ) : !nextPlan ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily AI Plan</Text>
          <Text style={styles.muted}>Generate a personalised meal plan for tomorrow based on your BMI and goals.</Text>
          <PrimaryButton title="Generate Plan" loading={generatingPlan} onPress={generatePlan} />
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: "#EEF2FF", borderColor: "#818CF8" }]}>
          <Text style={styles.cardTitle}>Tomorrow's AI Plan</Text>
          <View style={styles.planSection}>
            <Text style={styles.chartTitle}>Target Requirements</Text>
            <Text style={styles.statLabel}>Water Goal: {nextPlan.water_ml}ml</Text>
            <Text style={styles.statLabel}>Sleep Target: {nextPlan.sleep_hours} hours</Text>
          </View>
          <Text style={[styles.chartTitle, { marginTop: 10 }]}>Recommended Meals</Text>
          {(nextPlan.meals || []).map((m, idx) => (
            <View key={idx} style={styles.mealRow}>
              <Text style={styles.mealTitle}>{m.food}</Text>
              <Text style={styles.mealTime}>{m.time}</Text>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}><PrimaryButton title="Regenerate" onPress={regeneratePlan} loading={generatingPlan} /></View>
            <View style={{ flex: 1 }}><PrimaryButton title="Clear Plan" onPress={clearPlan} /></View>
          </View>
        </View>
      )}

      <Text style={styles.footerHint}>Pull down to refresh • Your data, no mock data.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  center: { alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },

  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, fontWeight: "700", color: "#374151" },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  chartTitle: { fontSize: 14, fontWeight: "700", color: "#374151", marginTop: 4 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 12, color: "#6B7280" },

  // BMI card
  bmiBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bmiBadgeText: { fontSize: 13, fontWeight: "800" },
  bmiBar: { flexDirection: "row", height: 10, borderRadius: 6, overflow: "hidden", marginBottom: 6 },
  bmiBarUnder:  { backgroundColor: "#93C5FD" },
  bmiBarNormal: { backgroundColor: "#86EFAC" },
  bmiBarOver:   { backgroundColor: "#FCD34D" },
  bmiBarObese:  { backgroundColor: "#FCA5A5" },
  bmiNeedle: { position: "absolute", top: -2, width: 3, height: 14, backgroundColor: "#111827", borderRadius: 2 },
  bmiLabelsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  bmiScaleLabel: { fontSize: 9, color: "#9CA3AF" },

  mealRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  mealTitle: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  mealTime: { fontSize: 12, color: "#6B7280", marginLeft: 10 },
  planSection: { backgroundColor: "#fff", padding: 10, borderRadius: 8, gap: 4 },

  muted: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
  error: { fontSize: 12, color: "#B91C1C", lineHeight: 18 },
  footerHint: { fontSize: 12, color: "#6B7280", lineHeight: 18, paddingTop: 2, textAlign: "center" },
});
