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
    // Prefer env vars (set in eas.json), fall back to app.json hardcoded values.
    // This prevents supabaseUrl/supabaseAnonKey from ever being undefined.
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ?? config.extra?.supabaseUrl,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? config.extra?.supabaseAnonKey,
  },
});
