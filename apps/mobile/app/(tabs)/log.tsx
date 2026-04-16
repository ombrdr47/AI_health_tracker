import * as React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LogScreen() {
  const router = useRouter();

  const LOG_OPTIONS = [
    { title: "Meal", icon: "restaurant-outline", route: "/(tabs)/log-meal", color: "#F59E0B" },
    { title: "Water", icon: "water-outline", route: "/(tabs)/log-water", color: "#3B82F6" },
    { title: "Mood", icon: "happy-outline", route: "/(tabs)/log-mood", color: "#10B981" },
    { title: "Sleep", icon: "bed-outline", route: "/(tabs)/log-sleep", color: "#8B5CF6" },
    { title: "Weight", icon: "scale-outline", route: "/(tabs)/log-weight", color: "#6366F1" },
  ] as const;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Track Your Day</Text>
      <Text style={styles.subtitle}>
        Consistency is the key to maintaining your health. What would you like to log?
      </Text>

      <View style={styles.grid}>
        {LOG_OPTIONS.map((item) => (
          <Pressable 
            key={item.title} 
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} 
            onPress={() => router.push(item.route)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={32} color={item.color} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        Your dashbaords and AI coach rely on your logged data.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 60, gap: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 15, color: "#4B5563", lineHeight: 22, paddingBottom: 10 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
    minHeight: 120,
  },
  cardPressed: {
    backgroundColor: "#F3F4F6",
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  hint: { fontSize: 13, color: "#9CA3AF", lineHeight: 18, textAlign: "center", marginTop: 20 },
});
