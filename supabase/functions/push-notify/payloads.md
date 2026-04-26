# Push Payloads

Use the `push-notify` Edge Function with these payload shapes.

## New Message

```json
{
  "userId": "TARGET_USER_UUID",
  "title": "New message",
  "body": "@alex sent you a message",
  "data": {
    "type": "message",
    "matchId": "MATCH_UUID"
  }
}
```

## New Match

```json
{
  "userId": "TARGET_USER_UUID",
  "title": "New match",
  "body": "You matched with @alex",
  "data": {
    "type": "match",
    "matchId": "MATCH_UUID"
  }
}
```

## Trade Proposal

```json
{
  "userId": "TARGET_USER_UUID",
  "title": "Trade proposal",
  "body": "@alex proposed a trade",
  "data": {
    "type": "trade_proposal",
    "matchId": "MATCH_UUID"
  }
}
```
