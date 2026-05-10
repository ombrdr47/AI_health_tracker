import * as React from "react";
import {
  View, Text, StyleSheet, Pressable, Alert, Animated,
  TextInput, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";

const QUICK_OPTIONS = [
  { label: "1 Glass",       ml: 250,  icon: "🥛" },
  { label: "1 Bottle",      ml: 500,  icon: "💧" },
  { label: "Large Bottle",  ml: 1000, icon: "🫙" },
  { label: "2L Bottle",     ml: 2000, icon: "🧴" },
];

export default function LogWaterScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [customMl, setCustomMl] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  // Scale animations per quick-pick button
  const scales = React.useRef(QUICK_OPTIONS.map(() => new Animated.Value(1))).current;

  // Slide-up fade-in on mount
  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const onQuickPick = (index: number, ml: number) => {
    setSelected(ml);
    setCustomMl("");
    setError("");
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 1.12, speed: 30, bounciness: 8, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1,    speed: 20, bounciness: 5, useNativeDriver: true }),
    ]).start();
  };

  const effectiveMl = (): number | null => {
    if (customMl) {
      const n = Number(customMl);
      return Number.isFinite(n) && n >= 50 && n <= 5000 ? n : null;
    }
    return selected;
  };

  const onSave = async () => {
    const ml = effectiveMl();
    if (!ml) {
      setError(customMl ? "Enter a value between 50 and 5000 ml" : "Pick an amount or enter a custom value");
      return;
    }
    setError("");
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error: dbError } = await supabase.from("water_logs").insert({
        user_id: session.user.id,
        amount_ml: Math.round(ml),
        logged_at: new Date().toISOString(),
      });
      if (dbError) { Alert.alert("Save failed", dbError.message); return; }
      Alert.alert("Logged! 💧", `${Math.round(ml)} ml of water logged.`);
      router.back();
    } finally { setSaving(false); }
  };

  const totalMl = effectiveMl();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 20 }}>
        <View>
          <Text style={styles.title}>Log Water 💧</Text>
          <Text style={styles.subtitle}>Stay hydrated! Tap a quick option or enter a custom amount.</Text>
        </View>

        {/* Quick picks */}
        <View style={styles.quickGrid}>
          {QUICK_OPTIONS.map((opt, i) => (
            <Animated.View key={opt.ml} style={{ transform: [{ scale: scales[i] }], width: "47%" }}>
              <Pressable
                style={[
                  styles.quickBtn,
                  selected === opt.ml && !customMl && styles.quickBtnSelected,
                ]}
                onPress={() => onQuickPick(i, opt.ml)}
              >
                <Text style={styles.quickIcon}>{opt.icon}</Text>
                <Text style={styles.quickLabel}>{opt.label}</Text>
                <Text style={[styles.quickMl, selected === opt.ml && !customMl && styles.quickMlSelected]}>
                  {opt.ml >= 1000 ? `${opt.ml / 1000}L` : `${opt.ml}ml`}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Custom amount */}
        <View style={styles.customRow}>
          <Text style={styles.customLabel}>Or enter a custom amount (ml):</Text>
          <TextInput
            value={customMl}
            onChangeText={t => { setCustomMl(t); setSelected(null); setError(""); }}
            keyboardType="number-pad"
            placeholder="e.g. 350"
            placeholderTextColor="#9CA3AF"
            style={styles.customInput}
          />
        </View>

        {/* Live total display */}
        {totalMl && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>Adding: {totalMl >= 1000 ? `${(totalMl/1000).toFixed(1)}L` : `${totalMl}ml`}</Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.saveBtn, (saving || !totalMl) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving || !totalMl}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Log Water"}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  quickBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  quickBtnSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  quickIcon:  { fontSize: 26 },
  quickLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  quickMl:    { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  quickMlSelected: { color: "#3B82F6", fontWeight: "700" },

  customRow:   { gap: 6 },
  customLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  customInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },

  totalBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  totalText: { fontSize: 15, fontWeight: "700", color: "#1D4ED8" },

  errorText: { fontSize: 13, color: "#DC2626", fontWeight: "500" },

  saveBtn: {
    backgroundColor: "#3B82F6",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
