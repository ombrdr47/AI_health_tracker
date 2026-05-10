import * as React from "react";
import {
  View, Text, StyleSheet, Pressable, Alert, Animated, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { FormTextInput } from "../../src/components/FormTextInput";

const QUALITY_OPTIONS = [
  { score: 1, label: "Poor",      emoji: "😴", color: "#EF4444" },
  { score: 2, label: "Fair",      emoji: "😪", color: "#F97316" },
  { score: 3, label: "Good",      emoji: "😌", color: "#EAB308" },
  { score: 4, label: "Great",     emoji: "😊", color: "#22C55E" },
  { score: 5, label: "Excellent", emoji: "🌟", color: "#8B5CF6" },
];

export default function LogSleepScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [selectedQuality, setSelectedQuality] = React.useState<number | null>(null);
  const [hours, setHours] = React.useState("");
  const [hoursError, setHoursError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Scale animations per quality button
  const scales = React.useRef(QUALITY_OPTIONS.map(() => new Animated.Value(1))).current;

  // Fade-in on mount
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const onSelectQuality = (index: number, score: number) => {
    setSelectedQuality(score);
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 1.2, speed: 30, bounciness: 8, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1,   speed: 20, bounciness: 5, useNativeDriver: true }),
    ]).start();
  };

  const onSave = async () => {
    if (selectedQuality === null) { Alert.alert("Pick sleep quality", "Tap one of the options above."); return; }

    // Validate hours if provided
    if (hours) {
      const n = Number(hours);
      if (!Number.isFinite(n) || n < 0 || n > 24) {
        setHoursError("Enter hours between 0 and 24");
        return;
      }
    }
    setHoursError("");

    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("sleep_logs").insert({
        user_id: session.user.id,
        quality: selectedQuality,
        hours: hours ? Number(hours) : null,
        logged_at: new Date().toISOString(),
      });
      if (error) { Alert.alert("Save failed", error.message); return; }
      const qualLabel = QUALITY_OPTIONS.find(q => q.score === selectedQuality)?.label;
      Alert.alert("Logged!", `Sleep quality: ${qualLabel}${hours ? ` · ${hours} hrs` : ""}`);
      router.back();
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 20 }}>
        <View>
          <Text style={styles.title}>Log Sleep</Text>
          <Text style={styles.subtitle}>How well did you sleep last night?</Text>
        </View>

        {/* Quality picker */}
        <View style={styles.qualityGrid}>
          {QUALITY_OPTIONS.map((q, i) => (
            <Animated.View key={q.score} style={{ transform: [{ scale: scales[i] }], flex: 1 }}>
              <Pressable
                style={[
                  styles.qualityBtn,
                  selectedQuality === q.score && { borderColor: q.color, backgroundColor: `${q.color}12` },
                ]}
                onPress={() => onSelectQuality(i, q.score)}
              >
                <Text style={styles.qualityEmoji}>{q.emoji}</Text>
                <Text style={[styles.qualityLabel, selectedQuality === q.score && { color: q.color, fontWeight: "800" }]}>
                  {q.label}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Hours input */}
        <FormTextInput
          label="Hours slept (optional)"
          value={hours}
          onChangeText={t => { setHours(t); setHoursError(""); }}
          keyboardType="decimal-pad"
          placeholder="e.g. 7.5"
          error={hoursError}
        />

        <Pressable
          style={[styles.saveBtn, (saving || selectedQuality === null) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving || selectedQuality === null}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Sleep"}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 8 },

  qualityGrid: { flexDirection: "row", gap: 6 },
  qualityBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    gap: 4,
  },
  qualityEmoji: { fontSize: 22 },
  qualityLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600", textAlign: "center" },

  saveBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
