# Swipr — Feature Audit & Improvement Brief
> Prepared 2026-04-26. For use as a Codex implementation brief.

---

## What Swipr Is

Swipr is a React Native / Expo 54 app backed by Supabase. Its core mechanic is **swipe-to-barter**: users list secondhand items, swipe through other users' listings (right = like, left = pass), and when two users have mutually right-swiped on each other's items, a match is created. Matched users can chat and propose a direct trade (no money). The trade proposal has a full lifecycle: propose → accept/decline → withdraw → complete. On completion, both items are marked unavailable.

**Stack:** React Native 0.81.5, React 19, Expo 54, Supabase (Postgres, Realtime, Storage, Auth), Reanimated 4, Moti, Gesture Handler, React Navigation v7.

---

## Current Feature Inventory

### Fully Implemented
- Email/password auth + persistent session
- Onboarding: interest tag selection (18 tags), free-text location
- Profile: avatar, bio, username, edit sheet, theme switcher (dark/light/auto/time-based)
- Item listings: up to 4 photos, title, description, category (5), condition (4)
- Discover feed: swipe cards, category filter chips, undo (5s), interest-based smart ranking via `discover_feed()` RPC
- Match system: server-side trigger (`create_match_on_swipe()`), unseen badge, match modal + confetti
- Real-time chat: typing indicators, message bubbles, Supabase Realtime subscriptions
- Trade proposals: propose/accept/decline/withdraw/complete, atomic `complete_trade()` RPC marks both items unavailable
- Achievements: 7 types (first listing, first match, 10 swipes, 50 swipes, first trade, 3 trades, 5 listings)
- Item detail modal: image gallery, similar items horizontal scroll, seller card
- Haptics, skeleton loaders, toast notifications, empty states

### Partially Implemented
- Notifications: in-app only via Realtime — no push notifications
- Search/filtering: category chips only — no text search, no condition filter, no location filter
- Location: captured at onboarding but never used in any query

### Not Implemented
- Push notifications
- User ratings/reviews
- Block/report user
- Full-text search
- Location-based filtering
- Shipping / meetup coordination
- Dispute resolution
- Wishlists / saved items
- Public profiles (only visible within swipe feed or to matches)
- Social graph (follows/followers)
- AI listing assistance
- Seller analytics
- Cash top-up on trade proposals
- Trade history archive
- External sharing / deep links

---

## Supabase Schema (Current)

| Table | Key Fields |
|---|---|
| `profiles` | id, username, full_name, avatar_url, bio, location (text), interests[], accent_color, onboarded_at |
| `items` | id, user_id, title, description, category, condition, images[], is_available, created_at |
| `swipes` | id, swiper_id, item_id, direction (left/right), created_at — unique(swiper_id, item_id) |
| `matches` | id, user1_id, user2_id, item1_id, item2_id, status, user1_seen, user2_seen, created_at |
| `trade_proposals` | id, match_id, proposer_id, status (pending/accepted/declined), created_at, responded_at |
| `messages` | id, match_id, sender_id, content, created_at |
| `achievements` | id, user_id, type, earned_at |
| `storage/items` | public bucket, path: `{userId}/{timestamp}-{random}.jpg` |

**RPCs:** `discover_feed(p_category, p_limit)`, `create_match_on_swipe()` (trigger), `complete_trade(p_match_id, p_proposal_id)`

---

## Competitive Landscape

| Platform | Model | Key differentiator vs Swipr |
|---|---|---|
| **Depop** | Buy/sell (monetary) | AI listing from photo, outfit curation, wishlists, social follows, full-text search, push notifications |
| **Vinted** | Buy/sell (monetary), zero seller fees | Buyer protection, dispute resolution, prepaid shipping labels, price negotiation/offers, expanded categories, Bump (paid visibility) |
| **Poshmark** | Buy/sell (monetary) | Social graph (follows, likes, Love Notes reviews), live selling, closet stats, AI "For You" feed, brand resell partnerships |
| **OfferUp** | Buy/sell + local meetup | Verified profiles, star ratings, local/proximity filtering, TruYou identity verification |
| **Mercari** | Buy/sell (monetary) | QR code shipping, Mercari Local (doorstep pickup), two-way ratings, offer/negotiation |
| **Zéya** | Barter (closest direct competitor) | Group/community swap rooms by niche, delivery partner (UniHop), ~30k downloads as of 2025 |
| **Bunz** | Barter + BTZ token | Social networking layer, goods + services trading |

---

## Improvement Recommendations

Items are ordered by priority. Each entry includes the file/table area Codex should touch.

---

### CRITICAL — Fix Before Growth

---

#### 1. Push Notifications
**Why it matters:** Users who close the app miss every match, message, and trade proposal. This is the single biggest retention hole. Realtime subscriptions only work while the app is foregrounded.

**What to build:**
- Install `expo-notifications` and register device tokens on auth
- Store tokens in a new `push_tokens` table: `(id, user_id, token, platform, created_at)`
- Write a Supabase Edge Function (Deno) that fires on `INSERT` to `messages`, `matches`, and `trade_proposals`
- Edge Function calls Expo Push API with the relevant token and a contextual message body
- Handle token refresh and invalid token cleanup

**Files to touch:** new `supabase/functions/push-notify/index.ts`, new migration for `push_tokens`, `src/lib/notifications.ts` (new), `src/context/AuthContext` (register token on login)

---

#### 2. User Ratings & Reviews (Trust System)
**Why it matters:** No reputation system means bad actors face zero consequences. Every major competitor (Poshmark Love Notes, Mercari two-way ratings, OfferUp stars) has this.

**What to build:**
- New table: `reviews` — `(id, reviewer_id, reviewee_id, match_id, rating INT 1–5, comment TEXT, created_at)` — unique(reviewer_id, match_id)
- After `matches.status` changes to `'completed'`, show a rating prompt to both users on next app open
- Display average rating + count on profile and seller card in item detail
- Gate: only matched/completed-trade users can leave a review

**Files to touch:** new migration, `src/screens/Profile.tsx` (show rating), `src/components/SellerCard.tsx` (show rating), new `src/screens/RateTradeScreen.tsx`

---

#### 3. Block & Report
**Why it matters:** Without moderation tools, the platform cannot scale safely.

**What to build:**
- New table: `blocks` — `(blocker_id, blocked_id, created_at)` — unique(blocker_id, blocked_id)
- New table: `reports` — `(reporter_id, reported_id, item_id nullable, reason TEXT, created_at)`
- Blocked users are excluded from `discover_feed()` RPC and cannot message each other
- Add "Block user" and "Report" options to the chat header menu and item detail seller card
- No admin dashboard needed yet — reports just land in the table

**Files to touch:** new migration, `supabase/functions/discover_feed` (add block exclusion), `src/screens/Chat.tsx` (header menu), `src/components/SellerCard.tsx` (report option)

---

#### 4. Full-Text Search
**Why it matters:** Users with a specific item in mind (e.g., "vintage Levi's jacket") have no way to find it. This is a fundamental usability gap.

**What to build:**
- Add a `tsvector` generated column on `items`: `search_vector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED`
- Create a GIN index on `search_vector`
- New RPC `search_items(query TEXT, category TEXT, condition TEXT, limit INT)` using `websearch_to_tsquery`
- New `SearchScreen` accessible from the Discover tab header (magnifying glass icon)
- Search results rendered as a flat list of item cards (not swipe stack)

**Files to touch:** new migration, new RPC, new `src/screens/SearchScreen.tsx`, `src/navigation` (add search screen), `src/screens/Discover.tsx` (add search icon in header)

---

#### 5. Post-Trade Exchange Flow (Meetup / Shipping)
**Why it matters:** When a trade is accepted, nothing happens to facilitate the actual physical exchange. Users complete a trade inside the app and then have no guidance on how to proceed. Trades will die here.

**What to build (Phase 1 — meetup):**
- After `complete_trade()` succeeds, inject a system message into chat: "Trade accepted! Agree on a meetup time and place below."
- Add a "Suggest meetup" button in chat that opens a simple form: date/time picker + location text field
- Store meetup proposals in a `meetup_proposals` table: `(id, match_id, proposer_id, proposed_time, proposed_location, status, created_at)`
- Other user can confirm or counter-propose

**What to build (Phase 2 — shipping, optional later):**
- Integrate Shippo or EasyPost API to generate prepaid labels
- Surface "Ship this item" option post-acceptance with address collection

**Files to touch:** new migration for `meetup_proposals`, `src/screens/Chat.tsx` (inject system message, meetup button), new `src/components/MeetupCard.tsx`

---

#### 6. Dispute Resolution
**Why it matters:** If a trade goes wrong (no-show, wrong item, damaged) there is zero recourse. One viral bad experience will damage trust.

**What to build:**
- "Report a problem with this trade" button on completed match cards
- New table: `disputes` — `(id, match_id, reporter_id, reason TEXT, status, created_at)`
- Statuses: `open`, `resolved`, `closed`
- Short-term: creates a record + sends an email to a support address via Supabase Edge Function
- Long-term: admin dashboard to triage

**Files to touch:** new migration, `src/screens/Matches.tsx` (add report option on completed cards), new Supabase Edge Function for email notification

---

### HIGH PRIORITY — Competitive Parity

---

#### 7. Location-Based Filtering
**Why it matters:** Location is captured at onboarding and stored on `profiles` but is never used in any query. Since trades require physical exchange, proximity is critical.

**What to build:**
- Change onboarding location input from free-text to a geocoded picker (use `expo-location` + a geocoding API or Expo's built-in)
- Add `lat FLOAT, lng FLOAT` columns to `profiles`
- Add optional `max_distance_km INT` parameter to `discover_feed()` RPC, filtering by haversine formula (or use PostGIS `ST_DWithin` if PostGIS is enabled on the Supabase project)
- Add distance filter chip/slider to Discover screen

**Files to touch:** new migration (add lat/lng to profiles), `supabase/functions/discover_feed` (distance param), `src/screens/Onboarding.tsx` (location picker), `src/screens/Discover.tsx` (filter UI)

---

#### 8. Expanded Categories (5 → 14)
**Why it matters:** The current 5 categories (Clothes, Shoes, Gadgets, Accessories, Other) are too coarse. "Other" is a dump. The 18 onboarding interest tags already imply finer granularity.

**Suggested new categories:**
`Tops`, `Bottoms`, `Outerwear`, `Shoes`, `Bags`, `Jewellery`, `Electronics`, `Gaming`, `Cameras`, `Books`, `Music`, `Collectibles`, `Home & Decor`, `Other`

**What to build:**
- Update `items.category` enum/check constraint in a new migration
- Update category arrays in `src/screens/AddItem.tsx` and `src/screens/Discover.tsx` (filter chips)
- Update `src/types/index.ts` category type
- The `discover_feed()` RPC already supports category filtering — no RPC changes needed

**Files to touch:** new migration, `src/screens/AddItem.tsx`, `src/screens/Discover.tsx`, `src/types/index.ts`

---

#### 9. Feed Filters (Condition + Distance)
**Why it matters:** Users can only filter by category. A user who only wants "Like New" or "New" items has to swipe through everything.

**What to build:**
- Filter bottom sheet on Discover screen (triggered by a filter icon in the header)
- Filter options: Category (move from chips to sheet), Condition (multi-select), Max Distance (if location is implemented)
- Active filter count badge on the filter icon
- Pass selected filters to `discover_feed()` RPC (add `p_condition TEXT[]` param)

**Files to touch:** `src/screens/Discover.tsx`, `supabase/functions/discover_feed` (add condition param), new `src/components/FilterSheet.tsx`

---

#### 10. Wishlists / Saved Items
**Why it matters:** Swiping right is the only way to express interest, which immediately enters the match flow. Users who want to save something to revisit have no lightweight option.

**What to build:**
- New table: `saved_items` — `(user_id, item_id, created_at)` — unique(user_id, item_id)
- "Bookmark" icon on item cards and item detail modal
- New "Saved" tab or section accessible from Profile
- Saved items do not trigger match logic

**Files to touch:** new migration, `src/screens/ItemDetail.tsx` (bookmark button), `src/components/SwipeCard.tsx` (bookmark icon), new `src/screens/SavedItemsScreen.tsx`

---

#### 11. Public Profiles & "View All Listings"
**Why it matters:** Profiles are invisible unless you've matched. There's no way to browse a seller's full inventory, no word-of-mouth sharing, and no SEO surface.

**What to build:**
- Make `profiles` and `items` (available only) readable by any authenticated user via RLS update
- New `PublicProfileScreen` showing avatar, name, bio, ratings, and all active listings
- "View all from this seller" button on item detail seller card
- Tapping a listing from a public profile opens item detail as normal

**Files to touch:** new migration (RLS update), new `src/screens/PublicProfileScreen.tsx`, `src/components/SellerCard.tsx` (add "View profile" button), `src/navigation` (add public profile route)

---

#### 12. AI Listing Assistance
**Why it matters:** Friction in listing creation is the #1 reason sellers don't list. Competitors like Depop auto-fill listing fields from a single photo.

**What to build:**
- After the first image is added on the Add Item screen, show an "Auto-fill with AI" button
- Button calls a Supabase Edge Function that sends the image to a vision model (Claude claude-haiku-4-5-20251001 via Anthropic API for cost efficiency)
- Prompt: extract suggested title, description, category (from the 14 categories), and condition
- Return JSON; pre-fill the form fields (user can edit before submitting)
- Add `ANTHROPIC_API_KEY` to Supabase secrets

**Files to touch:** new `supabase/functions/ai-listing-assist/index.ts`, `src/screens/AddItem.tsx` (AI button + field pre-fill)

---

### MEDIUM PRIORITY — Differentiation & Retention

---

#### 13. Trade History Archive
**Why it matters:** Completed trades currently disappear. Users have no record of past activity.

**What to build:**
- New "Past Trades" section on Profile screen (below active listings)
- Query: `matches` where status = `completed` and (user1_id = me OR user2_id = me), joined with `items` and `profiles`
- Show card: their avatar, their username, your item, their item, date completed
- Tapping a past trade opens a read-only chat view and surfaces the rating prompt if not yet rated

**Files to touch:** `src/screens/Profile.tsx` (new section), new `src/components/PastTradeCard.tsx`

---

#### 14. Seller Analytics
**Why it matters:** Power users who list frequently have no insight into what's performing. Competitors like Poshmark have closet stats.

**What to build:**
- Expand the stats row on Profile to include: total swipes received on your items, match rate (matches / right-swipes received), average days to complete a trade
- These can be derived from existing `swipes`, `matches`, and `trade_proposals` tables — no new tables needed

**Files to touch:** `src/screens/Profile.tsx` (expand stats section), new Supabase RPC `get_user_stats(p_user_id)`

---

#### 15. External Sharing & Deep Links
**Why it matters:** There is no organic distribution. Every discovery happens inside the app. Sharing a listing to Instagram or WhatsApp is zero-cost viral marketing.

**What to build:**
- Configure Expo `linking` with a scheme (e.g., `swipr://item/:id`) and universal links
- Add a share button to `ItemDetail` that calls `Share.share()` with a deep link URL
- Handle deep link navigation on app open (navigate to the correct item detail)

**Files to touch:** `app.json` (linking config), `src/screens/ItemDetail.tsx` (share button), `src/navigation` (deep link handler)

---

#### 16. Cash Top-Up on Trade Proposals
**Why it matters:** Item-for-item trades often feel unfair when items have different perceived values. A "top-up" option closes that gap and unlocks more trades.

**What to build:**
- Add `cash_topup_amount INT, topup_direction TEXT (user1|user2)` fields to `trade_proposals`
- UI in the trade proposal card: optional "Add cash top-up" toggle that reveals an amount input
- When accepted and a top-up amount > 0 exists, initiate a Stripe PaymentIntent between the two users (Stripe Connect or a simple direct charge)
- `complete_trade()` RPC should only mark items unavailable after payment confirmation

**Files to touch:** new migration (alter `trade_proposals`), new `supabase/functions/create-payment/index.ts`, `src/components/TradeProposalCard.tsx` (top-up UI), `STRIPE_SECRET_KEY` in Supabase secrets

> Note: This requires Stripe Connect setup for marketplace payments. Scope carefully — do as a separate sprint.

---

#### 17. Onboarding Location Precision
**Why it matters:** Location is a free-text field ("city/region"). This makes any location-based filtering unreliable and hard to query.

**What to build:**
- Replace free-text location input in `OnboardingScreen` with a place-autocomplete input (use Google Places API or `expo-location` + reverse geocoding)
- On selection, store both the human-readable label AND `lat`/`lng` on `profiles`
- Migrate existing free-text locations gracefully (leave as-is, they just won't have coordinates until user updates profile)

**Files to touch:** `src/screens/Onboarding.tsx`, `src/screens/Profile.tsx` (edit sheet location field), new migration (add lat/lng columns)

---

## Priority Matrix (Quick Reference)

| Priority | Feature | Est. Effort |
|---|---|---|
| CRITICAL | Push Notifications | M |
| CRITICAL | User Ratings & Reviews | M |
| CRITICAL | Block & Report | S |
| CRITICAL | Full-Text Search | M |
| CRITICAL | Post-Trade Exchange Flow | M |
| CRITICAL | Dispute Resolution | S |
| HIGH | Location-Based Filtering | M |
| HIGH | Expanded Categories (14) | S |
| HIGH | Feed Filters (condition + distance) | S |
| HIGH | Wishlists / Saved Items | S |
| HIGH | Public Profiles | M |
| HIGH | AI Listing Assistance | M |
| MEDIUM | Trade History Archive | S |
| MEDIUM | Seller Analytics | S |
| MEDIUM | External Sharing / Deep Links | S |
| MEDIUM | Cash Top-Up on Proposals | L |
| MEDIUM | Onboarding Location Precision | S |

**Effort key:** S = small (< 1 day), M = medium (1–3 days), L = large (3+ days / separate sprint)

---

## Notes for Codex

- All Supabase schema changes should be written as new migration files in `supabase/migrations/`
- RLS policies must be updated alongside any new tables — every table needs policies
- The `discover_feed()` function is a Postgres RPC defined in migrations — modify it there, not via the Supabase dashboard
- Realtime is already configured for `messages`, `matches`, `trade_proposals` — extend to new tables where needed
- The app uses `src/types/index.ts` as the central type definition file — keep it updated with any schema changes
- Do not touch `.env` directly — use `.env.example` as reference for any new environment variables needed
- New screens go in `src/screens/`, new reusable components in `src/components/`
- Navigation changes go in `src/navigation/` — the root navigator pattern is already established
