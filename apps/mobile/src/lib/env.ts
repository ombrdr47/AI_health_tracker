import { z } from "zod";
import Constants from "expo-constants";

const ExtraSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export function getPublicEnv() {
  // Primary source: extra config embedded by app.config.ts / app.json
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

  // Fallback: EXPO_PUBLIC_* vars are inlined at bundle time by Metro,
  // so they're always available even if extra config is missing.
  const merged = {
    supabaseUrl:
      (extra.supabaseUrl as string | undefined) ||
      process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey:
      (extra.supabaseAnonKey as string | undefined) ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  const parsed = ExtraSchema.safeParse(merged);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Invalid app configuration. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ${issues}`
    );
  }

  return parsed.data;
}
