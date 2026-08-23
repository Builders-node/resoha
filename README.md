# Resoha Roatán — real-estate MVP

A deliberately small marketplace prototype for **Roatán, Bay Islands, Honduras**.
Structure and visual language follow **lun.ua** — dark icon rail on the left, category tiles on the
home page, black primary buttons on an orange accent, and a full-screen filters sheet with sorting,
chips, switches and a price histogram. Card and gallery patterns come from **airbnb.com**.
Re-cut for an island market: USD prices, titled land, oceanfront filter, WhatsApp-first contact.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Supabase**: Postgres + Row Level Security, Supabase Auth, Supabase Storage
- Own **REST API** on Route Handlers (`app/api/**`) — a thin layer over Supabase, always querying
  with the *user's* session, so RLS is what actually enforces access (no service-role key anywhere)
- Map: Leaflet + OpenStreetMap (no API key)
- Plain CSS, no UI framework (`app/globals.css`)
- ~64 demo listings across 7 agencies: 12 written by hand, the rest generated deterministically
  (seeded LCG) so filters, facet counts and the price histogram have something real to chew on
- One local SVG icon set (`components/Icon.tsx`) — no emoji, no icon dependency

## Run

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev
```

Open http://localhost:3000

Project: **resoha-roatan** (`zgfcysoyksticnbgbhxb`, us-east-1). Schema, policies and RPCs live in
migrations — see [supabase/README.md](supabase/README.md).

### Two toggles left in the Supabase dashboard

Neither can be set from SQL, both take a click in **Authentication → Sign In / Providers → Email**:

1. **Confirm email** is ON. New signups therefore get "check your inbox" instead of a session — the
   app handles that state, but for a demo you probably want it OFF. (Supabase's built-in mailer only
   delivers to your own team addresses, and it rejects emails on domains without MX records.)
2. **Leaked password protection** is OFF — worth enabling (checks HaveIBeenPwned).

## Screens

| Route | What it is |
|---|---|
| `/` | Home: island picker, category tiles, featured, areas, agency board, “Buying on Roatán” explainer |
| `/listings` | Compact filter bar + full filters sheet, result list, island map with price pins and hover cards |
| `/listings/[id]` | Property page: gallery, specs, map, agent card with phone/WhatsApp, enquiry form |
| `/agent` | Agent dashboard: stats, my listings, leads, new-listing form |
| `/account` | Buyer account: saved properties, saved searches, profile |

## Branches

```
dev   ← daily work lands here; every push builds a Vercel preview
main  ← production; only fast-forwarded from dev once a preview looks right
```

Publish to `dev` first, check the preview URL, then promote:

```bash
git checkout main && git merge --ff-only dev && git push origin main
git checkout dev
```

Preview builds read the **Preview** scope of the Vercel environment variables, so the same two
Supabase values have to be filled in for Preview as well as Production.

## Deploy (Vercel)

The repo is linked to the Vercel project **resoha** (`frorexstudios-projects`), so every push to
`main` builds automatically. Three things are configured outside the repo:

1. **Environment variables** — Settings → Environment Variables, for Production *and* Preview:
   ```
   NEXT_PUBLIC_SUPABASE_URL       https://zgfcysoyksticnbgbhxb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  <publishable key from Supabase → Settings → API>
   ```
   Both are public by design; the database is protected by RLS, not by hiding them. Without them
   every request dies in middleware with
   *“Your project's URL and Key are required to create a Supabase client”*.
2. **Supabase → Authentication → URL Configuration** — add the deployment origin to *Site URL* and
   *Redirect URLs*, otherwise confirmation and password-reset links bounce back to localhost.
3. **Deployment protection** — new projects here start with Vercel Authentication on, so the
   `.vercel.app` URLs ask for a Vercel login. Turn it off (Settings → Deployment Protection) to make
   the preview publicly shareable.

Redeploy after changing environment variables — Vercel injects them at build time.

## Accounts, agencies and permissions

Three kinds of account, created at `/signup`:

| Account | What it is | Listings publish as |
|---|---|---|
| **Buyer** | saves listings and searches | — |
| **Realtor** | independent agent, or a member of an agency | own name, or the agency once joined |
| **Agency** | creates the agency and becomes its **owner** | the agency brand |

**How a realtor joins an agency.** The owner has an invite code in their dashboard (`Team` tab) —
`ABCD-2345`, copyable and regenerable. A realtor enters it at signup, or later from
`Agency → Join an agency`. From that moment their new listings carry `agencyId`, show the agency
name on the card, and appear in the agency's board tile.

**An agency is not a signup-only decision.** Any realtor can open one later from
`Dashboard → Agency → Open your own agency` (name, contacts, description, brand colour). Their
existing listings move under the new brand and they become its owner. Equally, anyone can walk back
out — `Leave agency` returns them to listing under their own name.

**Who can do what**

| | Independent realtor | Agency member | Agency owner |
|---|---|---|---|
| Own listings | ✓ | ✓ | ✓ |
| Team's listings and leads | — | — | ✓ |
| Edit agency profile (name, contacts, about, brand) | — | — | ✓ |
| Invite code: view / regenerate | — | — | ✓ |
| Edit a teammate (name, phone, WhatsApp, years, bio) | — | — | ✓ |
| Verify / suspend a teammate | — | — | ✓ |
| Promote to owner, demote, remove | — | — | ✓ |
| Open own agency | ✓ | — | — |
| Leave | — | ✓ | ✓ (after handing over) |

Guard rails, all enforced server-side in `lib/db.ts`: an agency always keeps at least one owner, an
owner cannot suspend their own account, the last owner has to hand the role over before leaving
(unless they are alone — then leaving closes the agency and its listings go independent), and a
non-owner touching team or agency endpoints gets `403`.

**Photos** go to the `listing-photos` Storage bucket, each agent into their own folder (the storage
policy checks `auth.uid()`), and the listing keeps the public URL. `photoUrl()` passes real URLs
through and only turns bare demo seeds into placeholders.

**Where the rules live.** Access control is in the database, not in the route handlers:
`listings_update` lets the author *or* the agency owner edit; `leads_read` shows an owner the whole
team's enquiries; `profiles_read` hides buyer accounts from agents. Multi-step operations
(create/join/leave an agency, remove a member, rotate the invite code) are `SECURITY DEFINER` RPCs
with the guard rails inside — the last-owner rule is a trigger, so it holds no matter who calls.

**Auth** is Supabase Auth (email + password); `@supabase/ssr` keeps the session in httpOnly cookies
and `middleware.ts` refreshes it. A `profiles` row is created by the `handle_new_user` trigger from
the signup metadata. Demo accounts (password `demo1234`):

```
marla@islandliferoatan.com    agency owner — Island Life Realty
kevin@islandliferoatan.com    realtor inside that agency
tanya@roatanmail.com          independent realtor
dana.whitfield@example.com    buyer
```

## Agency board

The home page carries a lun.ua-style agency block: one brand-coloured card per agency with a
wordmark, its live listing count and review count. Opening a card lands on `/listings?agentId=…`
with that agency's whole portfolio — sale *and* rent, unlike the default sale-only view.

## Filters sheet

Modelled on the lun.ua filter modal, with island-relevant controls:

- **Sorting** — default / most viewed / newest / cheapest / most expensive / largest
- **Main** — listing type, property type, price (dual slider over a real price histogram, USD ⇄ HNL
  display toggle), bedrooms (multi-select), bathrooms
- **About the property** — interior ft² and lot acres ranges, amenity switches with live counts
  (Pool, Private dock, Gated, Turnkey, Rental income, Off-grid solar, Golf, Ocean view)
- **Title & fees** — free & clear title, owner financing, HOA band, year built
- **Areas of Roatán** — multi-select with per-area counts
- Footer shows a **live result count** (`/api/listings?...&countOnly=1`, debounced) before you apply

Sale and rent are treated as separate markets — `/listings` defaults to `deal=sale`, otherwise the
price histogram would mix $1.1K/mo rentals with $1.7M villas.

## Island-specific data model

Fields that actually matter to buyers here, not generic ones:

- `oceanfront` — filter and badge, not a tag
- `titled` — *free & clear title*; the most common way money is lost on the island
- `lotAcres` / `sqft` — acres for land, ft² for interiors
- `hoa` — monthly HOA, common in gated communities (Parrot Tree, Pristine Bay, Lawson Rock)
- `neighborhood` — West Bay → Camp Bay, the axis everyone actually searches by
- agent `whatsapp` + `languages` — the primary contact channel in Honduras

Home page also states the **3,000 m² foreign-ownership rule** in plain language, which is the
first question every foreign buyer asks.

## API

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/listings` | Paged (`page`, `pageSize`, default 24), `mode=pins` returns map pins for every match, `countOnly=1` returns just the number. Filters: `deal, type, island, neighborhoods, beds, bathsMin, priceMin, priceMax, sqftMin, sqftMax, lotMin, lotMax, hoaMax, yearMin, oceanfront, titled, ownerFinancing, tags, q, sort, ids, agentId, countOnly` |
| POST | `/api/listings` | Create (agent role only) |
| GET | `/api/listings/:id` | Listing + its agent (`?view=1` bumps the view counter) |
| PATCH | `/api/listings/:id` | Edit every field, publish / unpublish (author or agency owner) |
| DELETE | `/api/listings/:id` | Delete (owner only) |
| GET | `/api/facets` | Price histogram, size/lot ranges, tag and area counts — feeds the filters sheet |
| GET | `/api/agents` | All agents |
| GET | `/api/agents/:id` | Profile + listings + stats |
| POST | `/api/auth/signup` | `{ mode: 'buyer'\|'agent'\|'agency', name, email, password, phone?, agencyName?, inviteCode? }` |
| POST | `/api/auth/login` | `{ email, password }` → sets the session cookie |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Current session + agency |
| PATCH | `/api/profile` | Edit your own profile (role and agency are not editable here) |
| GET / POST / PATCH | `/api/agency` | Own agency / open a new one / edit its profile (owner) |
| POST | `/api/agency/leave` | Leave the agency — closes it if you were the only member |
| GET / POST | `/api/agency/members` | Team + invite code (owner only sees the code) / join by code |
| PATCH | `/api/agency/members/:id` | Owner edits a teammate: profile, `verified`, `active`, `isOwner` |
| DELETE | `/api/agency/members/:id` | Owner removes a realtor from the agency |
| POST | `/api/agency/invite` | Owner regenerates the invite code |
| PATCH | `/api/leads/:id` | Mark an enquiry handled / reopen it |
| GET / POST | `/api/reviews` | Agent reviews — one per author, re-posting updates it |
| POST | `/api/auth/forgot` / `/api/auth/reset` | Password reset by email link |
| GET | `/auth/callback` | Exchanges the emailed code for a session |
| POST | `/api/uploads` | Photos (listings and avatars), `multipart/form-data` — JPEG/PNG/WebP/AVIF, ≤ 8 MB, ≤ 12 per call |
| GET / POST | `/api/favorites` | Buyer shortlist (POST toggles by `listingId`) |
| GET / POST | `/api/leads` | Enquiries: GET for the agent, POST from a property page |
| GET / POST | `/api/saved-searches` | Saved searches |
| DELETE | `/api/saved-searches/:id` | Remove one |

```bash
curl "http://localhost:3000/api/listings?type=condo&oceanfront=1&priceMax=700000"
```

## Layout

```
app/
  page.tsx                 home
  login/ signup/           auth screens
  listings/page.tsx        search + map
  listings/[id]/page.tsx   property page
  agent/page.tsx           agent dashboard
  account/page.tsx         buyer account
  api/**                   REST API over Supabase
components/                Sidebar, ListingCard, MapView, ListingsExplorer, FiltersModal,
                           AgentDashboard, AgencyPanel, ListingForm, PhotoUploader, UserAccount…
lib/
  types.ts                 data model (mirrors the tables)
  db.ts                    every Supabase query + row mappers
  session.ts               current user / session from Supabase Auth
  filters.ts               shared filter model ↔ URL
  format.ts                USD, ft²/acres, dates, photo URLs
  supabase/server.ts       server client bound to the user's cookies
middleware.ts              refreshes the Supabase session
supabase/migrations/       schema, RLS, RPC — exported from the live database
```

## What each role can do

| | Guest | Buyer | Realtor | Agency owner | Admin |
|---|---|---|---|---|---|
| Search, map, property pages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Send an enquiry | ✓ | ✓ (kept in the account) | ✓ | ✓ | ✓ |
| Save listings and searches | — | ✓ | ✓ | ✓ | ✓ |
| Review an agent | — | ✓ | ✓ | ✓ | ✓ |
| Publish and edit listings | — | — | ✓ | ✓ + the whole team's | any |
| Leads inbox | — | own enquiries | own listings | whole agency | all |
| Agency profile, invite code, team | — | — | join / open one | full control | verify any |

**Admin panel** at `/admin`, gated on the `is_admin` flag: platform overview, every listing
(hidden included) with feature / take-down, agency and realtor verification, account suspension,
and review moderation. Admin rights are an extra flag on top of a normal account, and the API
refuses to let an admin suspend or demote themselves. Demo login: `admin@resoha.dev` / `demo1234`.

Public pages: `/agency/[id]` (brand header, contacts, team, listings) and `/agents/[id]`
(bio, contacts, listings, reviews).

## Still missing

| Gap | Note |
|---|---|
| **Transactional email** | Supabase's built-in SMTP is rate-limited, so confirmation and password-reset letters stall. The flows are built and handled gracefully; connect your own SMTP (or switch *Confirm email* off) to make them real |
| **Saved-search alerts** | Counts are live, but nothing emails you when a match appears — same SMTP dependency |
| **Map viewport search** | Clusters work; “search this area” as you pan does not exist yet |

## Deliberately out of scope

- Agent `rating` / `reviews` and agency `verified` are seeded numbers — there is no reviews table or
  moderation flow behind them yet.
- The island picker on the home page only lists Roatán; Utila and Guanaja are marked "soon".
- No password reset flow or agency licence check yet — an agency is `verified: false` until someone flips it.
- The seed (5 agencies, 10 accounts, 64 listings) was imported once via a temporary SECURITY DEFINER
  function that refused to run on a non-empty database; it has been dropped.
- Data lives in Supabase Postgres; the demo seed is a one-off import, not a fixture reset on restart.
- Seeded demo listings still use picsum placeholders for photos; uploads go to Supabase Storage.
- Coordinates are entered manually (no geocoder).
- No payments, moderation, chat or pagination.
- **All listing data is fictional.** Prices are plausible for the market but not real inventory.

## Next steps

1. Agent verification against AHDEPI / licence number, and an admin role to grant `verified`.
2. Password reset + email templates on your own SMTP domain.
3. Address geocoding; MLS/IDX import if a feed is available.
4. Marker clustering, pagination, map-bounds search (“search this area”).
5. Vacation-rental mode: nightly rates, availability calendar, projected ROI — the other half of this market.
6. Spanish locale next to English (`next-intl`), since resident sellers read Spanish.
