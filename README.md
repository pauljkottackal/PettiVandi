# PettiVandi — KSRTC Parcel Booking & Tracking

A hackathon MVP for digitizing parcel booking and tracking on Kerala KSRTC state buses.

## What is PettiVandi?

*Petti* (box) + *Vandi* (vehicle) in Malayalam. KSRTC already runs a manual parcel service — senders bring parcels to a depot counter, staff weigh them, assign a bus route, generate a waybill, and the parcel travels in the bus's luggage hold to be collected at the destination depot.

This app digitizes that exact workflow, with:
- **Depot Clerk view** — booking form with live fare calculation, waybill/QR generation, loading manifest
- **Conductor view** — camera QR scanner, single-tap status transitions, offline queue with manual sync
- **Citizen Tracking view** — waybill lookup, full status timeline, WhatsApp notification opt-in

## Tech Stack

- **Next.js 15** (App Router) — full-stack, pages + API routes in one project
- **Prisma ORM** + **PostgreSQL** (Vercel Postgres)
- **Twilio WhatsApp Sandbox** — status notifications
- **qrcode** — waybill QR generation
- **html5-qrcode** — camera-based QR scanning in the conductor view
- Deploy target: **Vercel**

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or cloud)
- Twilio account with WhatsApp Sandbox enabled (optional for dev)

### Setup

1. **Clone the repo and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd pettivandi
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and fill in your DATABASE_URL and Twilio credentials
   ```

3. **Initialize the database**
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

1. **Push to GitHub**
   ```bash
   git init  # if not already
   git add .
   git commit -m "Initial commit — PettiVandi MVP"
   git remote add origin https://github.com/<your-username>/pettivandi.git
   git push -u origin main
   ```

2. **Create a Vercel project**
   - Go to [vercel.com](https://vercel.com) → "Add New Project" → import your GitHub repo.

3. **Add a Postgres database**
   - In your Vercel project → **Storage** tab → **Create Database** → **Postgres**.
   - Vercel auto-populates `DATABASE_URL` as an environment variable.

4. **Add Twilio environment variables**
   In Vercel project settings → **Environment Variables**, add:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   TWILIO_SANDBOX_JOIN_CODE=your-sandbox-code
   NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER=+14155238886
   NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE=your-sandbox-code
   ```
   Get these from your [Twilio Console](https://console.twilio.com/) → Messaging → Try it out → Send a WhatsApp message.

5. **Set the Build Command**
   In Vercel project settings → **General** → **Build & Development Settings**:
   ```
   Build Command: prisma generate && prisma migrate deploy && next build
   ```

6. **Deploy**
   Click **Deploy**. Vercel will build and deploy automatically.

7. **Seed the production database** (first deploy only)
   ```bash
   # Pull production env vars locally
   vercel env pull .env.production.local

   # Run seed against production DB
   npx dotenv -e .env.production.local -- npx prisma db seed
   ```

8. **Test on a real phone**
   - Test all three routes (`/depot`, `/conductor`, `/track`) on an actual phone browser.
   - The conductor's QR scanner requires camera permissions — Vercel provides HTTPS by default, which is required.
   - Test the WhatsApp opt-in flow end-to-end: join the Twilio sandbox, book a parcel, transition its status, and verify the notification arrives.

## State Machine

Parcels move through these states in strict order — no skipping, no reversals:

```
BOOKED → LOADED → IN_TRANSIT → UNLOADED → CLAIMED
```

Every transition is validated by `src/lib/stateMachine.ts` and every successful transition writes an entry to `StatusLog`.

## Fare Calculation

```
Fare = (₹20 base + weightKg × ₹15) × distanceBandMultiplier

Distance bands:
  < 50 km   → ×1.0 (short route)
  50–100 km → ×1.3 (medium route)
  > 100 km  → ×1.6 (long route)
```

## WhatsApp Integration

Uses Twilio's WhatsApp Sandbox (not production API). The sandbox requires recipients to first join by texting a code to the sandbox number. The citizen tracking page handles this with a one-tap wa.me link that pre-fills the join message, followed by an in-page confirmation step.

**Sandbox limitation**: Recipients must have joined your specific sandbox to receive messages. This is disclosed honestly — this is a sandbox-based demo, not a production WhatsApp Business API integration.

## Project Structure

```
src/
  app/
    api/
      parcels/           # POST (create), GET (list by status)
        [waybillId]/     # GET single parcel
          transition/    # POST status transition
          whatsapp-optin/ # POST opt-in
      trips/             # GET list
    depot/               # Depot Clerk view
    conductor/           # Conductor view
    track/               # Citizen Tracking view
    page.tsx             # Landing / role selector
  components/
    WaybillSlip.tsx      # Print-ready QR slip
    StatusTimeline.tsx   # Animated status history
    QRScanner.tsx        # html5-qrcode wrapper
  lib/
    fareCalculation.ts   # Fare formula
    stateMachine.ts      # Transition validation
    whatsapp.ts          # Twilio sender
    offlineQueue.ts      # Conductor offline queue
    prisma.ts            # Prisma singleton
    waybill.ts           # Waybill ID generator
prisma/
  schema.prisma
  seed.ts
```

## Out of Scope (MVP)

- No authentication/login — role is selected on the landing page
- No production WhatsApp Business API (sandbox only)
- No admin analytics dashboard
- No native mobile app — mobile web only
