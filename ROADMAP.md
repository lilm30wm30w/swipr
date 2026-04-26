# Swipr Roadmap
> Prepared 2026-04-26. Execution order after cleanup/stability pass.

## Goal

Turn the audit into a practical build queue that improves:
- retention
- trust
- trade completion
- discoverability

This roadmap assumes the current app is stable and ready for feature work.

## Working Rules

- Ship one vertical slice at a time.
- Keep schema migrations isolated per feature.
- Re-run `npx tsc --noEmit` and `npx expo export --platform android` after each major slice.
- Prefer additive changes before refactors.
- Do not combine trust/safety work with growth features in the same pass.

## Phase 1: Retention Baseline

### 1. Push Notifications
Why first:
- highest retention gap
- unlocks re-engagement for matches, messages, and proposals

Scope:
- add Expo notifications client setup
- store device tokens
- add Supabase Edge Function for push fanout
- trigger on new match, message, trade proposal

Done when:
- a logged-in user receives a push for a new message while the app is backgrounded
- invalid tokens are handled cleanly

### 2. Trade Completion Guidance
Why second:
- current flow ends too early after acceptance
- users need help actually completing the exchange

Scope:
- inject system guidance message after completed trade
- add meetup proposal model and simple UI
- allow confirm/counter flow in chat

Done when:
- accepted trades create a clear next action inside chat
- meetup proposals can be created and responded to

## Phase 2: Trust Layer

### 3. Ratings and Reviews
Why here:
- trust is the next major blocker after retention
- completed trades need visible reputation

Scope:
- add `reviews` table
- prompt both users after completed trades
- show average rating on profile and seller surfaces

Done when:
- only completed-trade participants can review
- profile and item seller views show rating summary

### 4. Block and Report
Why here:
- must exist before broader user growth
- low complexity, high platform value

Scope:
- add `blocks` and `reports`
- exclude blocked users from discover and chat interaction
- add report/block actions to seller and chat surfaces

Done when:
- blocked users disappear from feed and messaging paths
- reports persist with enough context for later moderation

### 5. Disputes
Why here:
- completes the trust/safety baseline
- gives recourse after bad trades

Scope:
- add `disputes`
- allow completed-match issue reporting
- send support notification via Edge Function

Done when:
- a user can file a dispute from a completed trade
- support receives a structured alert

## Phase 3: Discoverability

### 6. Expanded Categories
Why first in this phase:
- simple schema/UI win
- improves listing quality before search/filter work

Scope:
- expand categories from 5 to 14
- update form types and feed filters

Done when:
- users can create and browse listings in the expanded category set

### 7. Feed Filters
Why next:
- low-medium effort with immediate UX payoff
- builds on category cleanup

Scope:
- filter sheet
- condition filter
- active filter badge
- RPC support for condition arrays

Done when:
- feed can be filtered by condition without breaking swipe flow

### 8. Full-Text Search
Why after filters:
- more complex than filters
- should land after category taxonomy is fixed

Scope:
- add search vector and GIN index
- new search RPC
- new `SearchScreen`

Done when:
- users can search listings by title/description
- search results open item detail cleanly

### 9. Location Precision and Distance Filtering
Why after search:
- requires profile schema improvement and geocoding choices
- stronger when paired with existing filter/search surfaces

Scope:
- store `lat`/`lng`
- replace loose location capture with structured place selection
- add distance filtering to feed

Done when:
- location is queryable
- users can constrain feed by distance

## Phase 4: Inventory and Identity

### 10. Public Profiles
Scope:
- view seller profile
- browse all active listings from one seller
- expose ratings on public profile

### 11. Wishlists / Saved Items
Scope:
- save without matching
- profile-accessible saved inventory

### 12. Trade History Archive
Scope:
- show past trades
- allow read-only revisit of completed conversations

### 13. Seller Analytics
Scope:
- swipes received
- match rate
- average time to trade

## Phase 5: Growth and Differentiation

### 14. External Sharing / Deep Links
Why:
- first lightweight acquisition loop

### 15. AI Listing Assistance
Why:
- reduces listing friction
- differentiates Swipr from basic barter apps

### 16. Cash Top-Up on Trades
Why last:
- largest operational and payment complexity
- should only be attempted after core trust and trade flows are solid

## Suggested Build Order

1. Push notifications
2. Meetup / post-trade flow
3. Ratings and reviews
4. Block and report
5. Disputes
6. Expanded categories
7. Feed filters
8. Full-text search
9. Structured location + distance filtering
10. Public profiles
11. Saved items
12. Trade history
13. Seller analytics
14. External sharing / deep links
15. AI listing assistance
16. Cash top-up

## Recommended Next Implementation Slice

If the next coding pass starts immediately, the best first slice is:

### Slice A
- push notifications
- token storage
- edge function trigger for messages and matches first

Why:
- strongest retention return
- contained schema and infra work
- no major UI refactor required

## Out of Scope for the Next Slice

- payments
- public profiles
- AI features
- distance filtering
- multi-surface search redesign

Those are valuable, but they should not delay the retention/trust baseline.
