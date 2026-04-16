# AI Food & Fitness Tracker 🍏💪

A complete, Android-first React Native (Expo) application for tracking daily nutrition, sleep, mood, weight, and menstrual cycles. It features a fully integrated **AI Coach** and **Daily Meal Planner** powered by Groq (LLaMA/GPT architectures) and Supabase Edge Functions.

## 🏗️ Architecture

- **Frontend:** React Native (Expo), styling with React Native StyleSheet, Zod for validation, Expo SecureStore for caching.
- **Backend:** Supabase (PostgreSQL) with Row Level Security (RLS) ensuring strict privacy. No mock data.
- **AI Serverless:** Supabase Edge Functions (Deno) communicating with Groq API for lightning-fast AI context delivery.

---

## 🚀 Prerequisites for Local Setup

Before you begin, ensure you have the following installed:
1. **Node.js** (v18+) & **npm**
2. **Expo CLI**: `npm install -g eas-cli`
3. **Expo Go** app installed on an Android/iOS physical device.

*Note: The backend database and AI edge functions are already hosted collaboratively on Supabase! There is no need to deploy custom edge functions or push any databases.*

---

## 🛠️ Step-by-Step Setup Guide

### 1. Clone the Repository & Install Dependencies
```bash
git clone https://github.com/ombrdr47/AI_health_tracker.git
cd AI_health_tracker/apps/mobile

# Install mobile dependencies
npm install
```

### 2. Frontend Environment Configuration
The React Native app needs to know where to talk to the live Supabase backend. **Ask the project owner for the Supabase keys.**

1. Ensure you are inside the `apps/mobile` directory.
2. Create a `.env` file:
   ```bash
   touch .env
   ```
3. Add the following to `.env` (replace with the exact keys given by the owner):
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<provided_project_ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<provided_anon_key>
   ```

### 3. Run the App using Expo Go!
Inside the `apps/mobile` directory, start the server:

```bash
npx expo start
```
*If you are on a strict network or having firewall issues causing infinite loading on your device, use tunnel mode:*
```bash
# If it prompts you to install @expo/ngrok, say yes
npx expo start --tunnel -c
```

1. Open the **Expo Go** app on your phone.
2. Scan the **QR Code** shown in your computer's terminal.
3. Create an account, fill out your profile, and start testing out the active app!

---

## 📦 Building a standalone APK (Optional)
If you want to build a real Android `.apk` file that installs natively without Expo Go:

1. Ensure you have an Expo account (`eas login`).
2. Run the EAS build command:
   ```bash
   eas build -p android --profile preview
   ```
3. Wait for the build to finish. It will provide a direct download link for the `.apk` file.
