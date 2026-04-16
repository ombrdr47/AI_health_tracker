import * as React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "../../src/lib/supabase";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

const Schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof Schema>;

export default function ResetPasswordScreen() {
  const [loading, setLoading] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert("Reset failed", error.message);
        return;
      }
      Alert.alert(
        "Email sent",
        "If an account exists for that email, you'll receive a reset link."
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        We'll email you a password reset link.
      </Text>

      <View style={styles.form}>
        <FormTextInput
          label="Email"
          value={watch("email")}
          onChangeText={(t) => setValue("email", t, { shouldValidate: true })}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email?.message}
        />

        <PrimaryButton title="Send reset email" onPress={onSubmit} loading={loading} />

        <Text style={styles.footer}>
          <Link href="/(auth)/sign-in">Back to sign in</Link>
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
