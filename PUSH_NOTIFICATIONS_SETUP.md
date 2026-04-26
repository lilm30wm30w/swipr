# Push Notifications Setup

This project now contains the client registration flow, the `push_tokens` migration, and the `push-notify` Edge Function. Push notifications become live only after these deployment steps are completed.

## 1. Required Inputs

- Expo account logged into EAS
- real EAS project ID
- Supabase personal access token
- Supabase project ref

Current project ref from `.env`:

- `rixjtyglytavebfgzicz`

## 2. Set the EAS Project ID

Update both:

- `.env`
- `app.json -> expo.extra.eas.projectId`

The app now reads the project ID from either:

- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `Constants.expoConfig.extra.eas.projectId`

## 3. Install the Supabase CLI

```powershell
npm install -g supabase
```

## 4. Authenticate the Supabase CLI

```powershell
supabase login
```

Or non-interactively:

```powershell
$env:SUPABASE_ACCESS_TOKEN="YOUR_TOKEN"
```

## 5. Link the Local Repo to the Remote Project

```powershell
supabase link --project-ref rixjtyglytavebfgzicz
```

## 6. Apply the Migration

```powershell
supabase db push
```

This creates:

- `public.push_tokens`
- `register_push_token(text, text)`
- `unregister_push_token(text)`

## 7. Deploy the Edge Function

```powershell
supabase functions deploy push-notify
```

## 8. Verify Function Secrets

The Edge Function expects these standard Supabase runtime secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase provides these automatically for deployed Edge Functions.

## 9. Trigger the Function

You still need a caller. There are two practical options.

### Option A: Database Webhooks in Supabase Dashboard

Create webhooks for:

- `public.messages` `INSERT`
- `public.matches` `INSERT`
- `public.trade_proposals` `INSERT` and `UPDATE`

Target URL:

```text
https://rixjtyglytavebfgzicz.functions.supabase.co/push-notify
```

Use the payload shapes from:

- [payloads.md](C:/Users/thege/Swipr/swipr-clone/supabase/functions/push-notify/payloads.md)

### Option B: Call the Function from Another Trusted Backend

If you later add a server or additional Edge Functions, call `push-notify` from there after message/match/proposal writes.

## 10. Device Test

Push notification testing should be done on:

- a physical Android device
- an installed development/preview build

Recommended flow:

1. Sign in on device A
2. Confirm a token row exists in `push_tokens`
3. Trigger a message or match from device B
4. Confirm `push-notify` is invoked
5. Confirm the push arrives while the app is backgrounded

## 11. Failure Modes

If pushes still do not arrive:

- check that `push_tokens` has rows
- verify the Expo project ID is real, not placeholder text
- verify the function is deployed
- verify webhook payloads match the function contract
- inspect Edge Function logs in Supabase
- confirm you are testing on a real device, not just an Expo bundle session
