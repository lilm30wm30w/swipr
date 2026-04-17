# Swipr Deployment Guide

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it `swipr`, choose a region close to your users
3. In the SQL Editor, run the entire contents of `src/lib/schema.sql`
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```
6. In **Authentication → Settings**, disable email confirmation (optional, for testing)

---

## 2. Local Development

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Scan QR code with Expo Go app on Android
```

---

## 3. Android Build with EAS

### First-time setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to Expo account (create one at expo.dev if needed)
eas login

# Configure the project (links it to your Expo account)
eas build:configure

# Update the projectId in app.json → extra.eas.projectId
```

### Build APK (for testing, sideload to device)

```bash
eas build --platform android --profile preview
```

### Build AAB (for Google Play Store production)

```bash
eas build --platform android --profile production
```

The build runs in the cloud. You'll get a download link when it's done.

---

## 4. Android Studio (optional, local builds)

1. Install [Android Studio](https://developer.android.com/studio)
2. Run `npx expo run:android` — this generates the `android/` folder and opens in Android Studio
3. Or use Android Studio just for the emulator: open Android Studio → Virtual Device Manager → create a Pixel device → start it → then run `npx expo start` and press `a`

---

## 5. Google Play Store Deployment

### Prerequisites
- Google Play Developer account ($25 one-time fee) at [play.google.com/console](https://play.google.com/console)
- Production AAB from EAS (step 3 above)

### Steps

1. **Create app in Play Console**
   - New app → fill in details → app name: "Swipr"
   - Package name: `com.swipr.app`

2. **Store listing**
   - Add description, screenshots, icon (1024x1024)
   - Screenshots: take from Expo Go or Android emulator

3. **Upload AAB**
   - Production → Create new release → Upload your `.aab` file

4. **Submit for review**
   - Fill in content rating questionnaire
   - Set pricing (free)
   - Submit — review takes 1-3 days

### Automated submission with EAS Submit

```bash
# Requires Google Play service account JSON key
# See: https://docs.expo.dev/submit/android/
eas submit --platform android --profile production
```

---

## 6. App Icon & Splash Screen

Replace the files in `assets/`:
- `icon.png` — 1024x1024 (app icon)
- `adaptive-icon.png` — 1024x1024 (Android adaptive icon foreground)
- `splash-icon.png` — 200x200 centered on transparent (splash screen logo)

The splash screen background is already set to `#0A0A0F` (dark) in `app.json`.

---

## 7. Environment Variables in EAS

For cloud builds to access Supabase credentials:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxx.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJxxx..."
```

---

## Architecture

```
swipr/
  App.tsx                    # Entry point, gesture handler root
  src/
    context/AuthContext.tsx  # Supabase auth state
    lib/
      supabase.ts            # Supabase client
      schema.sql             # Database schema (run in Supabase)
    navigation/AppNavigator  # Root + auth + tab navigation
    screens/
      Auth/                  # Login + Signup
      Discover/              # Swipe cards with category filter
      AddItem/               # List items with photo upload
      Matches/               # All trade matches
      Chat/                  # Real-time trade negotiation
      Profile/               # User profile + item management
    components/
      SwipeCard.tsx          # Draggable swipe card (gesture + reanimated)
      MatchModal.tsx         # Animated match celebration modal
    theme/colors.ts          # Black/purple color palette
    types/index.ts           # TypeScript types
```
