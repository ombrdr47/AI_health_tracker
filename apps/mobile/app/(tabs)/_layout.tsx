import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSession } from "../../src/providers/SessionProvider";

export default function TabsLayout() {
  const { session, initializing } = useSession();

  if (!initializing && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      {/* Hide the index route from the tab bar (it just redirects to Dashboard). */}
      <Tabs.Screen name="index" options={{ href: null }} />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Log",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "add-circle" : "add-circle-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      {/* Hidden routes (pushed from Log tab) */}
      <Tabs.Screen name="log-meal" options={{ href: null, title: "Log meal" }} />
      <Tabs.Screen name="log-mood" options={{ href: null, title: "Log mood" }} />
      <Tabs.Screen name="log-water" options={{ href: null, title: "Log water" }} />
      <Tabs.Screen name="log-sleep" options={{ href: null, title: "Log sleep" }} />
      <Tabs.Screen name="log-weight" options={{ href: null, title: "Log weight" }} />
    </Tabs>
  );
}
