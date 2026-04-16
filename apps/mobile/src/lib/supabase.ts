import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "./env";

const storageKeyPrefix = "sb";

function toSecureStoreKey(key: string) {
  const sanitized = (key || "empty").replace(/[^a-zA-Z0-9._-]/g, "_") || "empty";
  return `${storageKeyPrefix}_${sanitized}`;
}

const secureStore = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(toSecureStoreKey(key));
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(toSecureStoreKey(key), value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(toSecureStoreKey(key));
  },
};

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStore,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
