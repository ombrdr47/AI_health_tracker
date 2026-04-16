import * as React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../src/lib/supabase";
import { useSession } from "../../src/providers/SessionProvider";

function getFirstParam(value: string | string[] | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session, initializing } = useSession();
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (initializing) return;

    if (session) {
      router.replace("/(tabs)/dashboard");
      return;
    }

    const code = getFirstParam(params.code);
    const errorDescription =
      getFirstParam(params.error_description) || getFirstParam(params.error);

    if (!code && !errorDescription) {
      Alert.alert("Google sign-in failed", "Missing auth callback parameters");
      router.replace("/(auth)/sign-in");
      return;
    }

    if (errorDescription) {
      Alert.alert("Google sign-in failed", errorDescription);
      router.replace("/(auth)/sign-in");
      return;
    }

    if (!code) {
      Alert.alert("Google sign-in failed", "Missing auth code");
      router.replace("/(auth)/sign-in");
      return;
    }

    if (ranRef.current) return;
    ranRef.current = true;

    let cancelled = false;
    (async () => {
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;

      if (exchange.error) {
        const after = await supabase.auth.getSession();
        if (after.data.session) {
          router.replace("/(tabs)/dashboard");
          return;
        }

        Alert.alert("Google sign-in failed", exchange.error.message);
        router.replace("/(auth)/sign-in");
        return;
      }

      router.replace("/(tabs)/dashboard");
    })();

    return () => {
      cancelled = true;
    };
  }, [initializing, params, router, session]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.text}>Finishing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  text: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
});
