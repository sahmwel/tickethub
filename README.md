# Sahm TicketHub — full stack

Complete scaffold: homepage, event discovery, event detail with a live map
and Uber/Bolt deep-links, checkout with **inline** Paystack/Flutterwave
popups (server-verified, not just trusted from the client), auth, organizer
dashboard, admin dashboard, and a backend with email + QR ticket issuance.
All event data comes live from Supabase — there's no mock data file.

**Two interchangeable backends** — same endpoints, same contract, pick one:
- **`server/`** — Node/Express + Nodemailer
- **`php-server/`** — plain PHP, runs under XAMPP/WAMP/MAMP's Apache, no
  Node required. See `php-server/README.md` for setup.

Both talk to the same Supabase project over its REST API using the service
role key; the frontend only needs `VITE_API_BASE_URL` pointed at whichever
one you're running.

## Project layout

```
sahm-tickethub/
├── src/                      # React + TypeScript + Tailwind frontend
│   ├── components/           # Navbar, Hero, EventCard, PaymentModal, RideButtons, etc.
│   ├── context/AuthContext.tsx
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client (anon key)
│   │   └── queries.ts        # every event/sponsor fetch — the data layer
│   ├── pages/
│   │   ├── Home.tsx / Events.tsx / EventDetail.tsx / Checkout.tsx
│   │   ├── About.tsx / Contact.tsx / Login.tsx / Signup.tsx / CreateEvent.tsx
│   │   ├── Pricing.tsx / Privacy.tsx
│   │   ├── organizer/Dashboard.tsx / organizer/ScanTickets.tsx
│   │   └── admin/Dashboard.tsx
│   └── types/
├── server/                   # Node/Express backend (option 1)
│   ├── routes/ (orders, payments, contact, geocode)
│   ├── lib/ (supabaseAdmin, mailer, geocode)
│   └── scripts/seed.js       # creates a demo organizer + sample events
├── php-server/                # PHP backend for XAMPP/WAMP/MAMP (option 2)
│   ├── api/ (orders, contact, geocode, payments/verify, payments/webhook/*)
│   └── lib/ (supabase REST client, payments, mailer, geocode)
└── supabase/
    ├── schema.sql             # full schema + RLS policies
    └── storage.sql            # event-covers bucket + policies
```

## Run it


**Frontend**
```bash
npm install
cp .env.example .env   # fill in your Supabase + Paystack + Flutterwave public keys
npm run dev             # http://localhost:5173
```

**Backend — pick one:**

_Option A — Node/Express:_
```bash
cd server
npm install
cp .env.example .env   # fill in Supabase service role key, Paystack/Flutterwave secret keys, SMTP
npm run dev              # http://localhost:4000
```

_Option B — PHP (XAMPP/WAMP/MAMP), no Node:_
See `php-server/README.md` for full setup — copy `php-server/` into your
`htdocs`, enable `mod_rewrite`, `composer require phpmailer/phpmailer`,
fill in `.env`, then point the frontend's `VITE_API_BASE_URL` at it
(e.g. `http://localhost/sahm-api`).


**Database**
Paste `supabase/schema.sql` into your Supabase project's SQL editor and run it.
Then run `supabase/storage.sql` to create the `event-covers` bucket used for
event cover image uploads. Finally create a `SUPABASE_SERVICE_ROLE_KEY`
(Project Settings → API) for the backend `.env` — never expose that key to
the frontend.

## What's real vs. what needs your keys

Everything is wired end to end — the pages call real Supabase queries and a
real backend, not mocked responses. What you need to supply before it goes
live:
- Supabase project URL + anon key (frontend) + service role key (backend)
- Paystack public key (frontend) + secret key (backend)
- Flutterwave public key (frontend) + secret key (backend)
- SMTP credentials for Nodemailer (Gmail app password works fine to start)

The homepage (`src/data/events.ts`) still ships with placeholder Unsplash
images and mock events so it renders instantly without any setup — every
other page (checkout, dashboards, auth) is live-wired to Supabase/Express
and needs the `.env` files filled in to actually persist data.

## How the payment flow works (inline, not redirect)

1. `EventDetail` → buyer picks a ticket type + quantity → `Checkout`.
2. `Checkout` calls `POST /api/orders` on the backend, which creates a
   **pending** order row in Supabase before any money moves.
3. `PaymentModal` opens Paystack or Flutterwave's **inline popup** — the
   buyer never leaves the page.
4. On the popup's client-side success callback, the frontend calls
   `POST /api/payments/verify`. The backend re-verifies the transaction
   directly against Paystack/Flutterwave's API using the **secret** key,
   confirms the amount matches the order, then — and only then — issues
   ticket rows with QR codes and emails them via Nodemailer.
5. Provider webhooks (`/api/payments/webhook/paystack` and `/flutterwave`)
   are also wired as a second, signature-checked confirmation path, in case
   the buyer closes the tab right after paying.

This two-step verify (client callback + server-side re-check) is the part
most tutorials skip — never trust a payment based on the client callback alone.

## Ride integration

`RideButtons` (used on `EventDetail`) builds Uber and Bolt deep-links from
the event's lat/lng, so tapping either opens that app with the destination
pre-filled.

## Auth & roles

`AuthContext` wraps Supabase Auth. Sign-up lets a user pick `attendee` or
`organizer`; `admin` is assigned manually in the `profiles` table.
`ProtectedRoute` gates `/create-event`, `/organizer`, and `/admin` by role.

## Still worth adding as you grow

- Refunds flow from the admin dashboard
- Push/SMS reminders before an event starts
- Multi-currency support beyond NGN

Ask for any of these next and I'll build it the same way — schema, API,
and page together.

## What was added in this pass

- **Ticket scanner** (`/organizer/scan/:eventId`) — live camera QR reader
  (`html5-qrcode`) that looks up the scanned code against the `tickets`
  table, rejects codes from the wrong event or already checked in, and
  marks valid ones as admitted in real time.
- **Cover image upload** — `CreateEvent` now has a real file picker that
  uploads to Supabase Storage (`event-covers` bucket, one folder per
  organizer) and uses the returned public URL; pasting a URL still works
  as a fallback. Run `supabase/storage.sql` after `schema.sql` to create
  the bucket and its policies.
- **Server-side geocoding** — publishing an event now calls
  `POST /api/geocode` (OpenStreetMap Nominatim, no API key needed) to turn
  the venue address into lat/lng automatically, so the map and Uber/Bolt
  links on the event page work without the organizer typing coordinates.
  If geocoding fails (bad address, network hiccup) the event still
  publishes — just without a pinned location.

## Latest pass — events now come from Supabase, not mock data

Every page (`Home`, `Events`, `EventDetail`, `Checkout`) now fetches real
events from Supabase via `src/lib/queries.ts` — the old `src/data/events.ts`
mock file is gone. There's nothing to see until your `events` table has
published rows.

**Get demo data in fast:**
```bash
cd server
npm install
cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY at minimum
npm run seed
```
This creates a demo organizer account (`demo-organizer@sahmtickethub.online`
/ `SahmDemo2026!`, printed at the end) and publishes 6 sample events with
ticket types — the same ones that used to be hardcoded in the frontend.
Safe to re-run; it upserts by slug instead of duplicating.

**Why a script and not just SQL:** `profiles.id` is a foreign key into
Supabase's `auth.users`, so a demo organizer has to be created through the
Auth admin API (which needs the service role key) before any events can
reference them — plain `insert` statements in the SQL editor can't do that.

**What's derived instead of stored:** "Live now", "New", "Trending", and
which event is "Featured" aren't columns — `src/lib/queries.ts` computes them:
- **Live** — current time falls between `start_at` and `end_at` (or
  `start_at` + 8h if `end_at` is empty).
- **New** — `created_at` within the last 21 days.
- **Trending** — ranked by total `quantity_sold` across an event's ticket types.
- **Featured** — the soonest upcoming event with `is_verified = true`
  (set by an admin approving it on `/admin`).

Homepage load order: `Hero`'s three bouncing posters now use the 3 soonest
upcoming events' real cover images instead of static stock photos.

## Earlier pass

- **Homepage** no longer shows a single "Featured event" banner — it now
  shows an **"Coming up next" timeline** of the 3 soonest events, sorted by
  actual date.
- The **Featured event banner moved to the Events page** (`/events`), above
  the filters.
- **Events page** now has an "Events near me" button — uses the browser's
  geolocation API, computes distance to every event with the haversine
  formula (`src/utils/geo.ts`), and sorts results nearest-first. Each card
  shows its distance when sorted this way.
- **CreateEvent** now collects: an optional **guest artiste**, a required
  **contact email/phone** for the event, and optional **photos from past
  editions** (multi-file upload to Supabase Storage). All of it shows on
  the event detail page — guest artiste under the title, a "From past
  editions" gallery, and a "Contact the organizer" block with mailto/tel links.
- Added the **Pricing** and **Privacy** pages (already linked from the
  footer, now they resolve instead of 404ing).
- `supabase/schema.sql` updated with `guest_artiste`, `contact_email`,
  `contact_phone`, `past_gallery` columns — includes a safe
  `alter table ... add column if not exists` migration block at the bottom
  for databases that already ran an earlier version of this file.
#   t i c k e t h u b  
 