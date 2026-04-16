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
  quality: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 && n <= 5;
    }, "Enter quality (1–5)"),
  hours: z
    .string()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 24;
    }, "Enter hours (0–24)"),
});

type FormValues = z.infer<typeof Schema>;

export default function LogSleepScreen() {
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
    defaultValues: { quality: "", hours: "" },
  });

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const quality = Math.round(Number(values.quality));
      const hours = values.hours ? Number(values.hours) : null;

      const { error } = await supabase.from("sleep_logs").insert({
        user_id: session.user.id,
        quality,
        hours,
        logged_at: new Date().toISOString(),
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      Alert.alert("Saved", "Sleep logged.");
      router.back();
    } finally {
      setSaving(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log sleep</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Sleep quality (1–5)"
          value={watch("quality")}
          onChangeText={(t: string) => setValue("quality", t, { shouldValidate: true })}
          keyboardType="number-pad"
          placeholder="4"
          error={errors.quality?.message}
        />
        <FormTextInput
          label="Hours (optional)"
          value={watch("hours") ?? ""}
          onChangeText={(t: string) => setValue("hours", t, { shouldValidate: true })}
          keyboardType="decimal-pad"
          placeholder="7.5"
          error={errors.hours?.message}
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
