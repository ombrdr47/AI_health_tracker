import * as React from "react";
import { View, Text, StyleSheet, Alert, Animated, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const Schema = z.object({
  title: z.string().min(1, "Enter a meal title"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

const MEAL_SUGGESTIONS = ["Poha + chai", "Dal rice + sabzi", "Roti + paneer curry", "Idli + sambar", "Biryani", "Curd rice"];

export default function LogMealScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const fadeAnim  = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 14, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, []);

  const { handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { title: "", notes: "" },
  });

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("meals").insert({
        user_id: session.user.id,
        title: values.title.trim(),
        notes: values.notes?.trim() || null,
        meal_time: new Date().toISOString(),
      });
      if (error) { Alert.alert("Save failed", error.message); return; }
      Alert.alert("Meal logged! 🍽️", `"${values.title.trim()}" has been saved.`);
      router.back();
    } finally { setSaving(false); }
  });

  const title = watch("title");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], gap: 16 }}>
        <View>
          <Text style={styles.title}>Log Meal 🍽️</Text>
          <Text style={styles.subtitle}>What did you eat? Even a snack counts!</Text>
        </View>

        <FormTextInput
          label="Meal title"
          value={title}
          onChangeText={(t: string) => setValue("title", t, { shouldValidate: true })}
          placeholder="e.g. Poha + chai"
          error={errors.title?.message}
        />

        {/* Quick suggestions — tap to fill */}
        {!title && (
          <View style={styles.suggestionsBlock}>
            <Text style={styles.suggestionsLabel}>Quick suggestions:</Text>
            <View style={styles.suggestionsRow}>
              {MEAL_SUGGESTIONS.map(s => (
                <Text
                  key={s}
                  style={styles.chip}
                  onPress={() => setValue("title", s, { shouldValidate: true })}
                >
                  {s}
                </Text>
              ))}
            </View>
          </View>
        )}

        <FormTextInput
          label="Notes (optional)"
          value={watch("notes") ?? ""}
          onChangeText={(t: string) => setValue("notes", t)}
          placeholder="Hunger level, portion size, how you felt..."
          multiline
          error={errors.notes?.message}
        />

        <PrimaryButton title="Save Meal" onPress={onSave} loading={saving} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", lineHeight: 20 },

  suggestionsBlock: { gap: 8 },
  suggestionsLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  suggestionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "600",
    overflow: "hidden",
  },
});
