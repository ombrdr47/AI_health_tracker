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
  weightKg: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 20 && n <= 400;
    }, "Enter weight in kg (20–400)"),
});

type FormValues = z.infer<typeof Schema>;

export default function LogWeightScreen() {
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
    defaultValues: { weightKg: "" },
  });

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const weight_kg = Number(values.weightKg);

      const { error } = await supabase.from("weight_logs").insert({
        user_id: session.user.id,
        weight_kg,
        logged_at: new Date().toISOString(),
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      // Auto-update BMI in profiles whenever weight is logged
      let bmiMessage = "";
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("height_cm")
          .maybeSingle();

        if (profileData?.height_cm) {
          const hM = profileData.height_cm / 100;
          const newBmi = weight_kg / (hM * hM);
          const bmiClass =
            newBmi < 18.5 ? "Underweight" :
            newBmi < 25 ? "Normal" :
            newBmi < 30 ? "Overweight" : "Obese";

          await supabase.from("profiles").upsert({
            user_id: session.user.id,
            weight_kg,
            bmi: newBmi,
            updated_at: new Date().toISOString(),
          });

          bmiMessage = `\nBMI updated: ${newBmi.toFixed(1)} (${bmiClass})`;
        }
      } catch {
        // BMI update is best-effort — don't fail the weight log
      }

      Alert.alert("Saved", `Weight logged: ${weight_kg} kg${bmiMessage}`);
      router.back();
    } finally {
      setSaving(false);
    }
  });


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log weight</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Weight (kg)"
          value={watch("weightKg")}
          onChangeText={(t: string) => setValue("weightKg", t, { shouldValidate: true })}
          keyboardType="decimal-pad"
          placeholder="72.4"
          error={errors.weightKg?.message}
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
