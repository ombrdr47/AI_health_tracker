import * as React from "react";
import { View, Text, StyleSheet, Alert, ImageBackground } from "react-native";
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
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop" }}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* App branding */}
        <View style={styles.brandingBlock}>
          <Text style={styles.appName}>🥗 NutriTrack</Text>
          <Text style={styles.appTagline}>Your AI-powered health companion</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your dashboard.</Text>

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
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 30, 0.62)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 20,
  },
  brandingBlock: {
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  form: {
    marginTop: 8,
    gap: 14,
  },
  linkRow: {
    textAlign: "center",
    color: "#4F46E5",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#374151",
  },
});
