# push-notify

HTTP Edge Function for Expo push notifications.

## Expected request body

```json
{
  "userId": "uuid",
  "title": "New message",
  "body": "@alex sent you a message",
  "data": {
    "matchId": "uuid",
    "type": "message"
  }
}
```

## Notes

- This function reads device tokens from `public.push_tokens`.
- It removes Expo tokens that come back as `DeviceNotRegistered`.
- Wire this function to your database events with Supabase database webhooks or invoke it from your backend when `messages`, `matches`, or `trade_proposals` change.
