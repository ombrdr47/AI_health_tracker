import "dotenv/config";

export default ({ config }: { config: any }) => ({
  ...config,
  name: config.name ?? "Food Tracker",
  slug: config.slug ?? "food-tracker",
  scheme: "foodtracker",
  android: {
    ...config.android,
    package: "com.foodtracker.app",
  },
  ios: {
    ...config.ios,
    bundleIdentifier: "com.foodtracker.app",
  },
  plugins: [...(config.plugins ?? []), "expo-router"],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
