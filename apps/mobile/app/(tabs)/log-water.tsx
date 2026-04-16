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
  amountMl: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 50 && n <= 5000;
    }, "Enter ml (50–5000)"),
});

type FormValues = z.infer<typeof Schema>;

export default function LogWaterScreen() {
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
    defaultValues: { amountMl: "" },
  });

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      const amount_ml = Math.round(Number(values.amountMl));
      const { error } = await supabase.from("water_logs").insert({
        user_id: session.user.id,
        amount_ml,
        logged_at: new Date().toISOString(),
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      Alert.alert("Saved", "Water logged.");
      router.back();
    } finally {
      setSaving(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log water</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Amount (ml)"
          value={watch("amountMl")}
          onChangeText={(t: string) =>
            setValue("amountMl", t, { shouldValidate: true })
          }
          keyboardType="number-pad"
          placeholder="250"
          error={errors.amountMl?.message}
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
