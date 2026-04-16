import * as React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Link, Redirect } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";
import { FormTextInput } from "../../src/components/FormTextInput";
import { PrimaryButton } from "../../src/components/PrimaryButton";

WebBrowser.maybeCompleteAuthSession();

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof Schema>;

function extractCodeFromUrl(url: string) {
  const match = url.match(/[?&]code=([^&]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export default function SignInScreen() {
  const { session, initializing } = useSession();
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { email: "", password: "" },
  });

  if (!initializing && session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) Alert.alert("Sign in failed", error.message);
    } finally {
      setLoading(false);
    }
  });

  const onGoogle = async () => {
    setOauthLoading(true);
    try {
      const isExpoGo = Constants.executionEnvironment === "storeClient";
      const redirectTo = isExpoGo
        ? AuthSession.makeRedirectUri({ path: "auth/callback" })
        : AuthSession.makeRedirectUri({
            scheme: "foodtracker",
            path: "auth/callback",
          });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        Alert.alert("Google sign-in failed", error.message);
        return;
      }

      const authUrl = data?.url;
      if (!authUrl) {
        Alert.alert("Google sign-in failed", "No authorization URL returned");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type !== "success" || !result.url) return;

      const code = extractCodeFromUrl(result.url);
      if (!code) {
        Alert.alert("Google sign-in failed", "Missing auth code");
        return;
      }

      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error) {
        Alert.alert("Google sign-in failed", exchange.error.message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Continue to your nutrition dashboard.</Text>

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
        <FormTextInput
          label="Password"
          value={watch("password")}
          onChangeText={(t) => setValue("password", t, { shouldValidate: true })}
          secureTextEntry
          textContentType="password"
          error={errors.password?.message}
        />

        <PrimaryButton title="Sign in" onPress={onSubmit} loading={loading} />
        <PrimaryButton
          title="Continue with Google"
          onPress={onGoogle}
          loading={oauthLoading}
        />

        <Text style={styles.linkRow}>
          <Link href="/(auth)/reset-password">Forgot password?</Link>
        </Text>

        <Text style={styles.footer}>
          No account? <Link href="/(auth)/sign-up">Create one</Link>
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
  linkRow: {
    textAlign: "center",
    color: "#374151",
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    color: "#374151",
  },
});
