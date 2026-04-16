import * as React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const Schema = z.object({
  moodScore: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 && n <= 10;
    }, "Enter a mood score (1–10)"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

export default function LogMoodScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { moodScore: "", notes: "" },
  });

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const mood_score = Math.round(Number(values.moodScore));

      const { error } = await supabase.from("mood_logs").insert({
        user_id: session.user.id,
        mood_score,
        notes: values.notes?.trim() || null,
        logged_at: new Date().toISOString(),
        tags: [],
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      Alert.alert("Saved", "Mood logged.");
      router.back();
    } finally {
      setSaving(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log mood</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Mood score (1–10)"
          value={watch("moodScore")}
          onChangeText={(t: string) =>
            setValue("moodScore", t, { shouldValidate: true })
          }
          keyboardType="number-pad"
          placeholder="7"
          error={errors.moodScore?.message}
        />
        <FormTextInput
          label="Notes (optional)"
          value={watch("notes") ?? ""}
          onChangeText={(t: string) => setValue("notes", t)}
          placeholder="What influenced your mood?"
          multiline
          error={errors.notes?.message}
        />

        <PrimaryButton title="Save" onPress={onSave} loading={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F9FAFB", gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  form: { marginTop: 10, gap: 12 },
});
