import * as React from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const Schema = z.object({
  ageYears: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 5 && n <= 120;
    }, "Enter age (5-120)"),
  heightCm: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 100 && n <= 250;
    }, "Enter height in cm (100–250)"),
  weightKg: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 25 && n <= 400;
    }, "Enter weight in kg (25–400)"),
  gender: z.string().optional(),
  dietType: z.string().optional(),
  cuisinePreferences: z.string().optional(),
  goal: z.string().optional(),
});

type FormValues = z.infer<typeof Schema>;

type ProfileRow = {
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  gender: string | null;
  diet_type: string | null;
  cuisine_preferences: string | null;
  goal: string | null;
  updated_at: string;
};

function bmiFromCmKg(heightCm: number, weightKg: number) {
  const hM = heightCm / 100;
  return weightKg / (hM * hM);
}

function getBmiClass(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function ProfileScreen() {
  const { session } = useSession();
  const [saving, setSaving] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { ageYears: "", heightCm: "", weightKg: "", gender: "Male", dietType: "Vegetarian", cuisinePreferences: "", goal: "General Health" },
  });

  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);

  const loadProfile = React.useCallback(async () => {
    if (!session?.user?.id) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("height_cm,weight_kg,bmi,gender,diet_type,cuisine_preferences,goal,updated_at")
      .maybeSingle();

    if (error) {
      Alert.alert("Load failed", error.message);
      setLoadingProfile(false);
      return;
    }

    const row = (data as ProfileRow | null) ?? null;
    setProfile(row);
    if (session?.user?.user_metadata?.age) {
      setValue("ageYears", String(session.user.user_metadata.age), { shouldValidate: true });
    }

    if (row?.height_cm != null) {
      setValue("heightCm", String(row.height_cm), { shouldValidate: true });
    }
    if (row?.weight_kg != null) {
      setValue("weightKg", String(row.weight_kg), { shouldValidate: true });
    }
    if (row?.gender != null) {
      setValue("gender", row.gender, { shouldValidate: true });
    }
    if (row?.diet_type != null) {
      setValue("dietType", row.diet_type, { shouldValidate: true });
    }
    if (row?.cuisine_preferences != null) {
      setValue("cuisinePreferences", row.cuisine_preferences, { shouldValidate: true });
    }
    if (row?.goal != null) {
      setValue("goal", row.goal, { shouldValidate: true });
    }

    setLoadingProfile(false);
  }, [session?.user?.id, setValue]);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const onSave = handleSubmit(async (values) => {
    if (!session?.user?.id) return;

    const heightCm = Number(values.heightCm);
    const weightKg = Number(values.weightKg);
    const bmi = bmiFromCmKg(heightCm, weightKg);

    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();

      const { error } = await supabase.from("profiles").upsert({
        user_id: session.user.id,
        height_cm: heightCm,
        weight_kg: weightKg,
        bmi,
        gender: values.gender,
        diet_type: values.dietType,
        cuisine_preferences: values.cuisinePreferences,
        goal: values.goal,
        updated_at: updatedAt,
      });

      if (error) {
        Alert.alert("Save failed", error.message);
        return;
      }

      setProfile({
        height_cm: heightCm,
        weight_kg: weightKg,
        bmi,
        gender: values.gender || null,
        diet_type: values.dietType || null,
        cuisine_preferences: values.cuisinePreferences || null,
        goal: values.goal || null,
        updated_at: updatedAt,
      });

      Alert.alert("Saved", `Profile updated.`);
    } finally {
      setSaving(false);
    }
  });

  const heightCmInput = watch("heightCm");
  const weightKgInput = watch("weightKg");

  const liveBmi = React.useMemo(() => {
    const heightCm = Number(heightCmInput);
    const weightKg = Number(weightKgInput);

    if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
    if (heightCm < 100 || heightCm > 250) return null;
    if (weightKg < 25 || weightKg > 400) return null;

    return bmiFromCmKg(heightCm, weightKg);
  }, [heightCmInput, weightKgInput]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F9FAFB" }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.body}>
          Add your details to calculate BMI and personalize Indian-diet recommendations.
        </Text>

        <View style={styles.formCard}>
          <FormTextInput
            label="Height (cm)"
          value={heightCmInput}
          onChangeText={(t) => setValue("heightCm", t, { shouldValidate: true })}
          keyboardType="number-pad"
          error={errors.heightCm?.message}
        />
        <FormTextInput
          label="Weight (kg)"
          value={weightKgInput}
          onChangeText={(t) => setValue("weightKg", t, { shouldValidate: true })}
          keyboardType="decimal-pad"
          error={errors.weightKg?.message}
        />

        <View style={{ marginTop: 4 }}>
           <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>Gender</Text>
           <View style={{ flexDirection: "row", gap: 8 }}>
             {["Male", "Female", "Other"].map((type) => {
                const isSelected = watch("gender") === type;
                return (
                   <Pressable 
                     key={type} 
                     onPress={() => setValue("gender", type, { shouldValidate: true })}
                     style={[
                       { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
                       isSelected ? { backgroundColor: "#EEF2FF", borderColor: "#6366F1" } : { backgroundColor: "#fff", borderColor: "#E5E7EB" }
                     ]}
                   >
                     <Text style={{ fontSize: 12, fontWeight: "700", color: isSelected ? "#4F46E5" : "#6B7280", textAlign: "center" }}>
                        {type}
                     </Text>
                   </Pressable>
                );
             })}
           </View>
        </View>

        <View style={{ marginTop: 4 }}>
           <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>Diet Type</Text>
           <View style={{ flexDirection: "row", gap: 8 }}>
             {["Vegetarian", "Non-Vegetarian", "Vegan"].map((type) => {
                const isSelected = watch("dietType") === type;
                return (
                   <Pressable 
                     key={type} 
                     onPress={() => setValue("dietType", type, { shouldValidate: true })}
                     style={[
                       { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
                       isSelected ? { backgroundColor: "#EEF2FF", borderColor: "#6366F1" } : { backgroundColor: "#fff", borderColor: "#E5E7EB" }
                     ]}
                   >
                     <Text style={{ fontSize: 12, fontWeight: "700", color: isSelected ? "#4F46E5" : "#6B7280", textAlign: "center" }}>
                        {type === "Non-Vegetarian" ? "Non-Veg" : type}
                     </Text>
                   </Pressable>
                );
             })}
           </View>
        </View>

        <FormTextInput
          label="Cuisine Preferences (e.g. South Indian, North Indian)"
          value={watch("cuisinePreferences")}
          onChangeText={(t) => setValue("cuisinePreferences", t, { shouldValidate: true })}
          error={errors.cuisinePreferences?.message}
        />

        <FormTextInput
          label="Goals & Activity (e.g. Gym everyday, high protein)"
          value={watch("goal")}
          onChangeText={(t) => setValue("goal", t, { shouldValidate: true })}
          error={errors.goal?.message}
        />

        <View style={styles.meta}>
          {loadingProfile ? (
            <View style={styles.inline}>
              <ActivityIndicator size="small" />
              <Text style={styles.muted}>Loading saved profile…</Text>
            </View>
          ) : profile?.bmi != null ? (
            <Text style={styles.muted}>
              Saved BMI: {Number(profile.bmi).toFixed(1)} ({getBmiClass(Number(profile.bmi))})
            </Text>
          ) : (
            <Text style={styles.muted}>No saved profile yet.</Text>
          )}

          {liveBmi != null ? (
            <Text style={styles.muted}>
              Current BMI (from inputs): {liveBmi.toFixed(1)} ({getBmiClass(liveBmi)})
            </Text>
          ) : null}
        </View>

        <PrimaryButton title="Save Profile" onPress={onSave} loading={saving} />

        <Pressable
          style={styles.signOutButton}
          onPress={async () => {
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: async () => await supabase.auth.signOut() },
            ]);
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 60, gap: 10 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", marginTop: 10 },
  body: { fontSize: 14, color: "#4B5563", lineHeight: 22, marginBottom: 10 },
  formCard: { 
    backgroundColor: "#ffffff", 
    padding: 20, 
    borderRadius: 16, 
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },

  meta: { gap: 6, backgroundColor: "#F3F4F6", padding: 12, borderRadius: 10 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { fontSize: 13, color: "#4B5563", lineHeight: 18, fontWeight: "500" },
  signOutButton: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#EF4444",
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: "#FEF2F2"
  },
  signOutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 15,
  }
});
