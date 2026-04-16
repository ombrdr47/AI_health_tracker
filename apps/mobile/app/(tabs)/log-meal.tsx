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
  title: z.string().min(1, "Enter a meal title"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

export default function LogMealScreen() {
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

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      Alert.alert("Saved", "Meal logged.");
      router.back();
    } finally {
      setSaving(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log meal</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Meal title"
          value={watch("title")}
          onChangeText={(t: string) => setValue("title", t, { shouldValidate: true })}
          placeholder="e.g., Poha + chai"
          error={errors.title?.message}
        />
        <FormTextInput
          label="Notes (optional)"
          value={watch("notes") ?? ""}
          onChangeText={(t: string) => setValue("notes", t)}
          placeholder="Hunger, portion size, where you ate..."
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
