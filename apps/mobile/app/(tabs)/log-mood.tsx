import * as React from "react";
import {
  View, Text, StyleSheet, Pressable, Alert, Animated, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";

const MOODS = [
  { score: 2,  emoji: "😔", label: "Low" },
  { score: 4,  emoji: "😐", label: "Meh" },
  { score: 6,  emoji: "🙂", label: "Okay" },
  { score: 8,  emoji: "😄", label: "Good" },
  { score: 10, emoji: "🤩", label: "Great" },
];

export default function LogMoodScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Scale animations per emoji button
  const scales = React.useRef(MOODS.map(() => new Animated.Value(1))).current;

  // Fade-in on mount
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const onSelect = (index: number, score: number) => {
    setSelected(score);
    // Bounce the selected emoji
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 1.35, speed: 30, bounciness: 10, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1,    speed: 20, bounciness: 6,  useNativeDriver: true }),
    ]).start();
  };

  const onSave = async () => {
    if (selected === null) { Alert.alert("Pick a mood", "Tap one of the emoji above first."); return; }
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("mood_logs").insert({
        user_id: session.user.id,
        mood_score: selected,
        logged_at: new Date().toISOString(),
        tags: [],
      });
      if (error) { Alert.alert("Save failed", error.message); return; }
      Alert.alert("Logged!", `Mood: ${MOODS.find(m => m.score === selected)?.emoji} saved.`);
      router.back();
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.title}>How do you feel?</Text>
        <Text style={styles.subtitle}>Tap the emoji that best describes your mood right now.</Text>

        {/* Emoji picker */}
        <View style={styles.emojiRow}>
          {MOODS.map((m, i) => (
            <Animated.View key={m.score} style={{ transform: [{ scale: scales[i] }] }}>
              <Pressable
                style={[
                  styles.emojiBtn,
                  selected === m.score && styles.emojiBtnSelected,
                ]}
                onPress={() => onSelect(i, m.score)}
              >
                <Text style={styles.emoji}>{m.emoji}</Text>
                <Text style={[styles.emojiLabel, selected === m.score && styles.emojiLabelSelected]}>
                  {m.label}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {selected !== null && (
          <View style={styles.selectedDisplay}>
            <Text style={styles.selectedText}>
              You selected: {MOODS.find(m => m.score === selected)?.emoji} {MOODS.find(m => m.score === selected)?.label} ({selected}/10)
            </Text>
          </View>
        )}

        <Pressable
          style={[styles.saveBtn, (saving || selected === null) && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving || selected === null}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Mood"}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 24, gap: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20, marginBottom: 8 },

  emojiRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  emojiBtn: {
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    width: "18%",
    gap: 4,
  },
  emojiBtnSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  emoji: { fontSize: 28 },
  emojiLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  emojiLabelSelected: { color: "#4F46E5" },

  selectedDisplay: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  selectedText: { fontSize: 15, color: "#4F46E5", fontWeight: "700" },

  saveBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
