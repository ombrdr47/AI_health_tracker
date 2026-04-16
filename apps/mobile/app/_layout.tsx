import * as React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";

import { SessionProvider } from "../src/providers/SessionProvider";

export default function RootLayout() {
  // Ensure tab icons render reliably on first load.
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
});
