# AI Food & Fitness Tracker 🍏💪

A complete, Android-first React Native (Expo) application for tracking daily nutrition, sleep, mood, weight, and menstrual cycles. It features a fully integrated **AI Coach** and **Daily Meal Planner** powered by Groq (LLaMA/GPT architectures) and Supabase Edge Functions.

## 🏗️ Architecture

- **Frontend:** React Native (Expo), styling with React Native StyleSheet, Zod for validation, Expo SecureStore for caching.
- **Backend:** Supabase (PostgreSQL) with Row Level Security (RLS) ensuring strict privacy. No mock data.
- **AI Serverless:** Supabase Edge Functions (Deno) communicating with Groq API for lightning-fast AI context delivery.

---

## 🚀 Prerequisites for Local Setup

Before your friend begins, they must have the following installed:
1. **Node.js** (v18+) & **npm**
2. **Supabase CLI**: `npm install -g supabase` or via Homebrew `brew install supabase/tap/supabase`
3. **Expo CLI**: `npm install -g eas-cli`
4. **Expo Go** app installed on an Android/iOS physical device.
5. A Free **Supabase Account** (https://supabase.com)
6. A Free **Groq API Key** (https://console.groq.com)

---

## 🛠️ Step-by-Step Setup Guide

### 1. Clone the Repository & Install Dependencies
```bash
git clone <repository_url>
cd food_tracker_app

# Install mobile dependencies
cd apps/mobile
npm install
cd ../..
```

### 2. Set up your own Supabase Backend (Cloud Recommended)
Because the AI features rely on external edge functions and secure JWT parsing, setting up a free remote Supabase project is the easiest path.

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard) and create a **New Project**.
2. Once provisioned, note your **Project URL**, **Anon Key**, and **Database Password**.
3. Link your local project to this new cloud project:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your_new_project_ref>
   ```
   *(You can find your `project-ref` in the Supabase Project Settings > General > Reference ID).*

### 3. Push Database Schema & Policies
We do not use mock data. Push the official tables (profiles, meals, mood, sleep, weight, menstrual logs) directly to your new database:
```bash
npx supabase db push
```

*Note: If email confirmations are blocking your test sign-ups, go to Supabase Dashboard -> Authentication -> Providers -> Email, and uncheck "Confirm Email".*

### 4. Setup Edge Functions & Groq AI
The AI logic runs securely on Supabase Edge Functions. 

1. **Set the Groq API Key** securely in Supabase:
   ```bash
   npx supabase secrets set GROQ_API_KEY=your_groq_api_key_here
   ```

2. **Deploy the AI Edge Functions**:
   *(We use `--no-verify-jwt` to handle direct decoding in the Deno script and bypass native Deno ES256 crypto bugs).*
   ```bash
   npx supabase functions deploy coach-chat --no-verify-jwt
   npx supabase functions deploy daily-plan --no-verify-jwt
   ```

### 5. Frontend Environment Configuration
The React Native app needs to know where to talk to your backend.

1. Navigate to the mobile app folder:
   ```bash
   cd apps/mobile
   ```
2. Create a `.env` file in the `apps/mobile` directory:
   ```bash
   touch .env
   ```
3. Add the following to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://<your_new_project_ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your_brand_new_anon_key>
   ```

### 6. Run the App using Expo Go!
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
3. Create an account, fill out your profile (Gender/Height/Weight), and chat with the AI!

---

## 📦 Building a standalone APK (Optional)
If you want to build a real Android `.apk` file that installs natively without Expo Go:

1. Ensure you have an Expo account (`eas login`).
2. Run the EAS build command:
   ```bash
   cd apps/mobile
   eas build -p android --profile preview
   ```
3. Wait for the build to finish. It will provide a direct download link for the `.apk` file.