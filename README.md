# Sahm TicketHub

A ticketing platform for events across Nigeria. Organizers create and publish events; attendees buy tickets online, pay via Paystack or Flutterwave, and receive QR-coded tickets by email.

Live: [sahmtickethub.online](https://sahmtickethub.online)

---

## Features

**For attendees**
- Browse and search upcoming events
- Filter by category, city, or "near me" (browser geolocation + haversine)
- View event details with live map, venue info, and Uber/Bolt deep links
- Buy tickets with card, bank transfer, or USSD
- Receive QR-coded tickets by email
- Support for installment plans (split or monthly)

**For organizers**
- Create and manage events from a dashboard
- Upload cover images, past-edition galleries, and guest artiste photos
- Set ticket types with prices, quantities, and per-order limits
- Auto-geocode event addresses so maps and ride links work without manual coordinates
- Scan tickets at the gate via live camera QR reader
- Track sales and revenue

**For admins**
- Approve and verify events before they go live
- Feature or sponsor events on the homepage
- Manage payout accounts and subaccounts
- View analytics and platform-wide reporting

---

## Tech stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide icons

**Backend**
- Node.js + Express
- MySQL
- Nodemailer (transactional email)
- Paystack + Flutterwave (payments)
- OpenStreetMap Nominatim (geocoding)

**Infrastructure**
- Frontend: Vercel / Netlify
- Backend: cPanel / VPS
- Uploads: local filesystem (`/uploads`)

---

## Project structure

```
sahm-tickethub/
├── src/                       # Frontend
│   ├── components/            # Navbar, EventCard, RideButtons, etc.
│   ├── context/               # AuthContext
│   ├── lib/                   # API client, queries, constants
│   ├── pages/                 # Home, Events, EventDetail, Checkout, …
│   │   ├── organizer/         # Dashboard, CreateEvent, EditEvent, ScanTickets
│   │   └── admin/             # Dashboard
│   └── types/
├── backend/                   # Node/Express API
│   ├── routes/                # events, orders, payments, geocode, uploads, …
│   ├── lib/                   # DB, mailer, geocode, wallet
│   └── middleware/            # auth, admin guards
└── README.md
```

---

## Getting started

### Prerequisites

- Node.js 18+
- MySQL 8+
- Paystack account (NGN) and/or Flutterwave account (other currencies)
- SMTP credentials (Gmail app password works fine)

### Frontend

```bash
git clone https://github.com/sahmwel/tickethub.git
cd tickethub
npm install
cp .env.example .env
# fill in VITE_API_BASE_URL, Paystack public key, Flutterwave public key
npm run dev
# → http://localhost:5173
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in DB credentials, Paystack/Flutterwave secret keys, SMTP, etc.
npm run dev
# → http://localhost:4000
```

### Database

Create a MySQL database and import the schema:

```bash
mysql -u root -p sahm_tickethub < schema.sql
```

Then update your backend `.env` with the DB credentials.

---

## Environment variables

**Frontend (`.env`)**

```
VITE_API_BASE_URL=https://api.sahmtickethub.online
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-...
```

**Backend (`.env`)**

```
NODE_ENV=production
PORT=4000
CLIENT_ORIGINS=https://sahmtickethub.online

DB_HOST=localhost
DB_USER=...
DB_PASSWORD=...
DB_NAME=sahm_tickethub

PAYSTACK_SECRET_KEY=sk_live_...
FLUTTERWAVE_SECRET_KEY=FLWSECK-...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

---

## Payment flow

1. Buyer selects a ticket type and quantity on the event page → goes to checkout.
2. Frontend creates a **pending** order via `POST /api/orders` — no money moves yet.
3. Paystack/Flutterwave **inline popup** opens; buyer pays without leaving the page.
4. Frontend calls `POST /api/payments/verify` on success. The backend **re-verifies** the transaction directly with the provider using the secret key, confirms the amount matches the order, then issues ticket rows with QR codes and emails them.
5. Provider webhooks (`/api/payments/webhook/paystack` and `/flutterwave`) act as a second, signature-checked confirmation path in case the buyer closes the tab.

Payments are never trusted from the client callback alone — the server-side re-verification is mandatory.

---

## Geocoding

When an organizer publishes an event, the backend forwards the venue address to OpenStreetMap's Nominatim service and stores the returned latitude/longitude. The event detail page uses those coordinates for the embedded map and the Uber/Bolt ride buttons. If geocoding fails, the event still publishes — just without a pinned location.

---

## Deployment

**Frontend**

```bash
npm run build
# deploy the /dist folder to Vercel, Netlify, or any static host
```

**Backend**

Deploy to any Node-capable host (cPanel, VPS, Railway, Render). Set `NODE_ENV=production` and ensure `CLIENT_ORIGINS` includes your frontend domain so CORS allows the API calls.

Uploads are stored on the server's filesystem under `/uploads` and served statically. For scale, swap this for S3 or Cloudinary.

---

## License

Proprietary — © Sahm TicketHub. All rights reserved.
