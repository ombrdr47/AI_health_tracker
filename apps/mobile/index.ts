// URL polyfill MUST be the first import — required for Supabase fetch to work
// on Android production builds (fixes 'Network request failed' error)
import 'react-native-url-polyfill/auto';
import 'expo-router/entry';
