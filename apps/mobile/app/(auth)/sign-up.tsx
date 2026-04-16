import * as React from "react";
import { View, Text, StyleSheet, Alert, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "../../src/lib/supabase";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const Schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(8),
  diet_type: z.enum(["Vegetarian", "Non-Vegetarian", "Vegan"]),
});

type FormValues = z.infer<typeof Schema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", email: "", password: "", diet_type: "Vegetarian" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.name,
          },
        },
      });
      if (error) {
        Alert.alert("Sign up failed", error.message);
        return;
      }
      
      // Attempt to immediately insert preferences to the profile
      if (data?.user?.id) {
         await supabase.from("profiles").upsert({
           user_id: data.user.id,
           diet_type: values.diet_type
         });
      }

      Alert.alert(
        "Account created",
        "Welcome to Food Tracker! You are safely logged in now."
      );
      router.replace("/(tabs)/dashboard");
    } finally {
      setLoading(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start logging meals and mood.</Text>

      <View style={styles.form}>
        <FormTextInput
          label="Name"
          value={watch("name")}
          onChangeText={(t) => setValue("name", t, { shouldValidate: true })}
          autoCapitalize="words"
          textContentType="name"
          error={errors.name?.message}
        />
        <FormTextInput
          label="Email"
          value={watch("email")}
          onChangeText={(t) => setValue("email", t, { shouldValidate: true })}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email?.message}
        />
        <FormTextInput
          label="Password"
          value={watch("password")}
          onChangeText={(t) => setValue("password", t, { shouldValidate: true })}
          secureTextEntry
          textContentType="newPassword"
          error={errors.password?.message}
        />

        <View style={{ marginTop: 4 }}>
           <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 }}>Dietary Preference</Text>
           <View style={{ flexDirection: "row", gap: 8 }}>
             {["Vegetarian", "Non-Vegetarian", "Vegan"].map((type) => {
                const isSelected = watch("diet_type") === type;
                return (
                   <Pressable 
                     key={type} 
                     onPress={() => setValue("diet_type", type as "Vegetarian" | "Non-Vegetarian" | "Vegan", { shouldValidate: true })}
                     style={[
                       { flex: 1, paddingVertical: 12, paddingHorizontal: 2, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
                       isSelected ? { backgroundColor: "#EEF2FF", borderColor: "#6366F1" } : { backgroundColor: "#fff", borderColor: "#E5E7EB" }
                     ]}
                   >
                     <Text style={{ fontSize: 13, fontWeight: "700", color: isSelected ? "#4F46E5" : "#6B7280", textAlign: "center" }}>
                        {type === "Non-Vegetarian" ? "Non-Veg" : type}
                     </Text>
                   </Pressable>
                );
             })}
           </View>
        </View>

        <PrimaryButton title="Create account" onPress={onSubmit} loading={loading} style={{ marginTop: 8 }} />

        <Text style={styles.footer}>
          Already have an account? <Link href="/(auth)/sign-in">Sign in</Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  form: {
    marginTop: 16,
    gap: 14,
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    color: "#374151",
  },
});
