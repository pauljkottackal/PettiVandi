# 🚌 PettiVandi (പെട്ടിവണ്ടി) — KSRTC Parcel Booking & Tracking

> **Next-Generation Digital Luggage Hold Courier & Consignment Tracking Platform for Kerala State Road Transport Corporation (KSRTC).**

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Twilio](https://img.shields.io/badge/Twilio-WhatsApp_API-F22F46?style=for-the-badge&logo=twilio)](https://www.twilio.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

---

## 📖 Overview

**PettiVandi** (*Petti* = Box, *Vandi* = Vehicle in Malayalam) transforms KSRTC's bus luggage hold parcel transport into an end-to-end digitized logistics system. 

Historically, parcel transport in Kerala state buses relied on handwritten physical paper receipts, manual depot registers, and phone coordination. **PettiVandi** modernizes this into a real-time, transparent platform:

* **🏢 Depot Counter Terminal:** Swift intake, automated distance & weight tariff computation, instant printable 80mm thermal waybills, and 1-click WhatsApp dispatch.
* **📱 Conductor Transit Console:** Camera-based HTML5 QR code scanning, single-tap custody handoffs, and an offline-first sync queue designed for intermittent connectivity in Kerala's Ghats and rural corridors.
* **📍 Citizen Tracking Portal:** Real-time parcel progress timeline, dynamic lookup, bus assignment details, and automated transit alerts.

---

## 📸 Application Walkthrough & Screenshots

### 1. Role Selector & Central Hub
The landing page provides direct role-based entry points tailored for Depot Staff, En-route Bus Conductors, and Citizens.

![Role Selector](docs/screenshots/01-landing-page.png)

---

### 2. Depot Counter Intake & Real-Time Fare Computation
Depot clerks enter sender, receiver, and parcel details. As the route and weight are entered, the system dynamically calculates the official stage fare using KSRTC distance bands.

![Depot Intake Terminal](docs/screenshots/02-depot-booking.png)

---

### 3. Printable Thermal Waybill Slip (80mm & High-Res QR)
Generates an official printable consignment slip formatted for standard 80mm thermal receipt printers with a 400 DPI high-contrast QR code for instant conductor camera scanning.

![Printable Waybill Slip](docs/screenshots/03-waybill-slip.png)

---

### 4. 1-Click WhatsApp Dispatch & Twilio Alerts
Enables depot operators to send instant pre-formatted WhatsApp consignment receipts directly to senders and receivers with zero friction via `wa.me` links, alongside automated Twilio WhatsApp Sandbox triggers.

![WhatsApp Dispatch Panel](docs/screenshots/06-whatsapp-dispatch.png)

---

### 5. Conductor Mobile Scanner & Offline Queue
Conductors scan parcel QR codes directly using their smartphone camera. If network connectivity drops in hilly terrain (e.g. Munnar, Wayanad), state transitions are queued locally in `localStorage` and synchronized automatically when signal returns.

![Conductor Mobile Scanner](docs/screenshots/04-conductor-console.png)

---

### 6. Citizen Real-Time Tracking & Progress Timeline
Senders and recipients track parcel movement across transit hubs with a visual step-by-step progress timeline, scheduled bus information, and live custody logs.

![Citizen Tracking](docs/screenshots/05-citizen-tracking.png)

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Senders_Receivers ["Citizen & Customers"]
        A["Citizen Web Portal (/track)"] -->|Lookup Waybill| API_Track["GET /api/parcels/:waybillId"]
        WA_Engine["WhatsApp Service"] -->|Official Receipts & Alerts| WA_App["WhatsApp Mobile App"]
    end

    subgraph Depot_Counter ["Depot Counter Terminal"]
        D1["Consignment Intake Form"] -->|Compute Fare| Fare_Calc["Tariff Calculator"]
        D1 -->|Create Parcel| API_Parcels["POST /api/parcels"]
        API_Parcels --> Slip["80mm Thermal Waybill Slip with QR"]
        API_Parcels --> WA_Dispatch["1-Click WhatsApp Dispatch Panel"]
    end

    subgraph Conductor_Enroute ["En-route Bus Conductor"]
        C1["HTML5 Camera QR Scanner"] -->|Read Waybill QR| SM["State Machine Validator"]
        SM -->|Online| API_Transition["POST /api/parcels/:id/transition"]
        SM -->|Offline - Ghats Corridor| Offline_Queue["localStorage Sync Queue"]
        Offline_Queue -->|Auto Retry on Reconnect| API_Transition
    end

    subgraph Backend_DB ["Cloud & Database"]
        API_Parcels --> Prisma["Prisma ORM"]
        API_Transition --> Prisma
        API_Track --> Prisma
        Prisma --> DB[(PostgreSQL Database)]
        API_Transition --> WA_Engine
    end
```

---

## 🔄 Parcel State Machine

Parcels follow a strict, irreversible five-stage state transition pipeline:

```
┌──────────┐      ┌──────────┐      ┌────────────┐      ┌────────────┐      ┌───────────┐
│  BOOKED  │ ──>  │  LOADED  │ ──>  │ IN_TRANSIT │ ──>  │  UNLOADED  │ ──>  │  CLAIMED  │
└──────────┘      └──────────┘      └────────────┘      └────────────┘      └───────────┘
 Depot Desk        Conductor          Conductor           Depot Desk          Receiver
 Waybill issued    Scanned onto bus   En route            Arrived at dest     Collected
```

* Every transition is verified against `src/lib/stateMachine.ts`.
* Skipping states or backward transitions are rejected.
* Each successful transition logs timestamp, custody handler, and location into the database.

---

## 💰 Tariff Calculation Formula

Fares are determined by base rate, weight, and route distance multipliers:

$$\text{Total Fare} = (\text{₹}20 \text{ Base} + (\text{Weight in kg} \times \text{₹}15)) \times \text{Distance Multiplier}$$

| Distance Band | Multiplier | Route Classification | Example Routes |
| :--- | :---: | :--- | :--- |
| **$< 50\text{ km}$** | **$1.0\times$** | Short Haul / Feeder | Angamaly → Kochi ($25\text{ km}$) |
| **$50 - 100\text{ km}$** | **$1.3\times$** | Medium Haul | Kochi → Thrissur ($75\text{ km}$) |
| **$> 100\text{ km}$** | **$1.6\times$** | Long Haul / Ghats | Thiruvananthapuram → Kochi ($200\text{ km}$), Kochi → Munnar ($130\text{ km}$) |

---

## 📁 Repository Structure

```
pettivandi/
├── docs/
│   └── screenshots/              # High-resolution screenshots of all interfaces
│       ├── 01-landing-page.png
│       ├── 02-depot-booking.png
│       ├── 03-waybill-slip.png
│       ├── 04-conductor-console.png
│       ├── 05-citizen-tracking.png
│       └── 06-whatsapp-dispatch.png
├── prisma/
│   ├── schema.prisma             # PostgreSQL schema (Parcels, Trips, Logs)
│   ├── migrations/               # Version-controlled DB migrations
│   └── seed.ts                   # Seed data with real KSRTC routes & buses
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parcels/          # Intake, listing & status filters
│   │   │   │   └── [waybillId]/  # Single waybill lookup & transitions
│   │   │   └── trips/            # Active bus schedules & routes with fallbacks
│   │   ├── depot/                # Depot Counter intake, manifest & slips
│   │   ├── conductor/            # Mobile QR scanner & status transitions
│   │   ├── track/                # Citizen waybill tracking & dynamic routes
│   │   ├── layout.tsx            # App root layout & IBM Plex fonts
│   │   └── page.tsx              # Landing page role selector
│   ├── components/
│   │   ├── QRScanner.tsx         # HTML5 camera scanner engine
│   │   ├── StatusTimeline.tsx    # Visual parcel journey timeline
│   │   ├── WaybillSlip.tsx       # 80mm thermal receipt & high-res QR slip
│   │   ├── WhatsAppDispatchPanel.tsx # 1-click WhatsApp modal & receipt generator
│   │   └── Navbar.tsx            # Navigation & KSRTC livery headers
│   └── lib/
│       ├── fareCalculation.ts    # Official KSRTC distance-band tariff engine
│       ├── offlineQueue.ts       # HTML5 localStorage offline sync manager
│       ├── prisma.ts             # Prisma client singleton
│       ├── stateMachine.ts       # Transition validation logic
│       ├── waybill.ts            # Unique Waybill ID generator (PV-YYYY-XXXX)
│       └── whatsappChat.ts       # WhatsApp Click-to-Chat deep links & receipts
└── test/
    └── whatsapp.test.ts          # Comprehensive unit test suite
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **PostgreSQL**: Cloud instance (Supabase, Neon, Vercel Postgres) or local

### 1. Clone the Repository
```bash
git clone https://github.com/pauljkottackal/PettiVandi.git
cd PettiVandi/pettivandi
npm install
```

### 2. Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DATABASE_URL="postgresql://username:password@host:5432/pettivandi?sslmode=require"

# Optional Twilio WhatsApp Sandbox credentials
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
TWILIO_SANDBOX_JOIN_CODE="join your-sandbox-code"

NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER="+14155238886"
NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_CODE="your-sandbox-code"
```

### 3. Initialize & Seed Database
```bash
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Automated Tests
```bash
npx tsx test/whatsapp.test.ts
```

---

## 🚢 Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Connect a **Vercel Postgres** or **Supabase** instance.
4. Set the build command:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```
5. Deploy and run seed:
   ```bash
   npx dotenv -e .env.production.local -- npx tsx prisma/seed.ts
   ```

---

## 🛡️ Security & Privacy
* Real credentials and secrets (`.env`, `.env.local`) are strictly ignored via `.gitignore`.
* A sanitized template (`.env.example`) is maintained for onboarding.
* Scanner feeds operate strictly client-side within the browser camera sandbox without streaming video over the wire.

---

## 📜 License
Distributed under the MIT License. Developed for KSRTC Logistics Modernization.
