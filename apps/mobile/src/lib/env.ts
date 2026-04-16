import { z } from "zod";
import Constants from "expo-constants";

const ExtraSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export function getPublicEnv() {
  const extra = (Constants.expoConfig?.extra ?? {}) as unknown;
  const parsed = ExtraSchema.safeParse(extra);

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
