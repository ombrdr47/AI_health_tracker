import * as React from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function LogScreen() {
  const router = useRouter();

  const LOG_OPTIONS = [
    { title: "Meal",   icon: "restaurant-outline", route: "/(tabs)/log-meal",   color: "#F59E0B", bg: "#FFFBEB", desc: "Food & drinks" },
    { title: "Water",  icon: "water-outline",      route: "/(tabs)/log-water",  color: "#3B82F6", bg: "#EFF6FF", desc: "Hydration" },
    { title: "Mood",   icon: "happy-outline",      route: "/(tabs)/log-mood",   color: "#10B981", bg: "#ECFDF5", desc: "How you feel" },
    { title: "Sleep",  icon: "bed-outline",         route: "/(tabs)/log-sleep",  color: "#8B5CF6", bg: "#F5F3FF", desc: "Rest quality" },
    { title: "Weight", icon: "scale-outline",       route: "/(tabs)/log-weight", color: "#6366F1", bg: "#EEF2FF", desc: "Body weight" },
  ] as const;

  // Staggered fade-in + slide-up for each card
  const anims = React.useRef(LOG_OPTIONS.map(() => ({
    opacity: new Animated.Value(0),
    translateY: new Animated.Value(24),
  }))).current;

  React.useEffect(() => {
    Animated.stagger(
      80,
      anims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity,     { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(a.translateY,  { toValue: 0, speed: 14, bounciness: 5, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Track Your Day</Text>
      <Text style={styles.subtitle}>
        Consistency is the key to your health. What would you like to log?
      </Text>

      <View style={styles.grid}>
        {LOG_OPTIONS.map((item, i) => (
          <Animated.View
            key={item.title}
            style={{
              opacity: anims[i].opacity,
              transform: [{ translateY: anims[i].translateY }],
              width: "48%",
            }}
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: item.bg, borderColor: `${item.color}30` },
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={30} color={item.color} />
              </View>
              <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.hint}>
        Your dashboard and AI coach rely on your logged data.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 15, color: "#4B5563", lineHeight: 22, paddingBottom: 6 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
    minHeight: 130,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardDesc:  { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  hint: { fontSize: 13, color: "#9CA3AF", lineHeight: 18, textAlign: "center", marginTop: 8 },
});
