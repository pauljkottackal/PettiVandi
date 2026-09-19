# PettiVandi (പെട്ടിവണ്ടി) — System Context & Architecture

> **KSRTC Parcel Booking & Tracking Digital Platform**  
> *Digitizing state bus luggage hold parcel transport across Kerala.*

---

## 1. Project Overview & Background

**PettiVandi** (*Petti* = Box, *Vandi* = Vehicle in Malayalam) is a full-stack digital solution for the **Kerala State Road Transport Corporation (KSRTC)** parcel courier system.

KSRTC operates a wide network of buses connecting thousands of towns and villages across Kerala. While parcel transport in bus luggage holds has historically operated manually—relying on handwritten physical paper waybills, manual ledger tracking, and phone calls—PettiVandi digitizes the end-to-end parcel lifecycle:

- **Depot Counter**: Swift parcel registration, automated distance & weight-based tariff computation, instant printable QR waybill slip generation.
- **Conductor / Transit Operations**: On-bus smartphone camera QR scanning, single-tap state transitions, and offline-first queueing for low/no-connectivity transit corridors across ghats and rural areas.
- **Citizen Experience**: Self-service waybill tracking, live timeline progression, and Twilio WhatsApp notifications for dispatch, transit, arrival, and collection updates.

---

## 2. Technology Stack

| Layer | Technology | Details / Rationale |
| :--- | :--- | :--- |
| **Framework** | [Next.js 15 (App Router)](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/package.json) | React 19, TypeScript, unified full-stack pages and API routes |
| **Database & ORM** | [PostgreSQL + Prisma ORM 5.22](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/prisma/schema.prisma) | Relational integrity, foreign key constraints, migration workflows |
| **Styling & UI** | [Tailwind CSS v4](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/app/globals.css) | Custom utility theme inspired by KSRTC liveries (Deep Green `#0B6157`, KSRTC Amber `#E8820C`, Stone paper `#F5F2EE`, and IBM Plex Sans font) |
| **QR Code Engine** | `qrcode` & `html5-qrcode` | Client-side QR generation on waybills; HTML5 camera QR scanner for conductors |
| **Notifications** | Twilio WhatsApp API | WhatsApp Sandbox alerts dispatched at key lifecycle stages |
| **Offline Sync** | HTML5 `localStorage` | Client-side sync queue with automated retries for conductors with flaky network |
| **Deployment Target** | Vercel + Vercel Postgres | Serverless edge hosting with automatic HTTPS (mandatory for camera QR scanner) |

---

## 3. User Roles & Core Workflows

### 3.1. Role Selector / Landing Page (`/`)
- Entry point for all users ([src/app/page.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/app/page.tsx)).
- Direct links to the three dedicated sub-interfaces without requiring authentication in the MVP phase.

```
                  ┌───────────────────────────────┐
                  │          PettiVandi           │
                  │   Landing / Role Selector     │
                  │             (/)               │
                  └───────────────┬───────────────┘
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   Depot Clerk     │   │     Conductor     │   │  Citizen Tracking │
│     (/depot)      │   │   (/conductor)    │   │     (/track)      │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

### 3.2. Depot Clerk View (`/depot`)
- **File**: [src/app/depot/page.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/app/depot/page.tsx)
- **Functions**:
  1. **New Parcel Booking**: Input sender & receiver details (name, phone), parcel weight in kilograms, description, and assign an active scheduled KSRTC trip.
  2. **Real-Time Fare Preview**: Dynamically recalculates the fare breakdown as weight and route selections change.
  3. **Printable Waybill Modal**: Renders [src/components/WaybillSlip.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/components/WaybillSlip.tsx) with a high-density QR code, route details, and fare breakdown ready for printing on counter thermal slips.
  4. **Active Parcels Manifest**: Lists booked parcels waiting at the depot for loading onto departing buses.

### 3.3. Bus Conductor View (`/conductor`)
- **File**: [src/app/conductor/page.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/app/conductor/page.tsx)
- **Functions**:
  1. **Trip Selection**: Conductor selects their active bus run (e.g., *KL-07-5678: Kochi → Thrissur*).
  2. **Camera QR Scanning**: Embedded camera scanner ([src/components/QRScanner.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/components/QRScanner.tsx)) reads the waybill QR code.
  3. **One-Tap Progression**: Displays current parcel details and prompts with the only valid next action (e.g., "Confirm Loaded", "Confirm In Transit", "Confirm Unloaded").
  4. **Offline Resilience**: If the conductor is traveling through areas with poor mobile signal, updates are saved to the offline queue ([src/lib/offlineQueue.ts](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/lib/offlineQueue.ts)) and synced once connectivity returns.

### 3.4. Citizen Tracking View (`/track`)
- **File**: [src/app/track/page.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/app/track/page.tsx)
- **Functions**:
  1. **Waybill Lookup**: Fast search by Waybill ID (e.g., `PV-2026-XXXX`).
  2. **Visual Progress Timeline**: Animated sequential progress tracker ([src/components/StatusTimeline.tsx](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/components/StatusTimeline.tsx)) showing completed, current, and pending steps with timestamps and depot notes.
  3. **WhatsApp Notification Opt-in**: Single-click `wa.me` deep link to subscribe the receiver's phone number to automated Twilio WhatsApp alerts.

---

## 4. Core Business Logic & Rules

### 4.1. Parcel Lifecycle State Machine
Parcels follow a strict, unidirectional 5-stage lifecycle. No stages can be skipped, and no reversals are permitted:

```
┌──────────┐     ┌──────────┐     ┌────────────┐     ┌────────────┐     ┌───────────┐
│  BOOKED  │ ──► │  LOADED  │ ──► │ IN_TRANSIT │ ──► │  UNLOADED  │ ──► │  CLAIMED  │
└──────────┘     └──────────┘     └────────────┘     └────────────┘     └───────────┘
 Counter booking    Bus luggage       En route to       Arrived at       Handed over
  at origin depot    bay loaded       destination      dest. depot        to receiver
```

- **Implementation**: [src/lib/stateMachine.ts](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/lib/stateMachine.ts)
- **Validation**: Every transition request is validated by `canTransition(currentStatus, requestedStatus)`.
- **Audit Trail**: Every valid transition automatically inserts an immutable entry into `StatusLog` with timestamp and optional notes.

### 4.2. Fare Calculation Formula
Tariff calculation ensures transparent and predictable pricing based on luggage weight and journey distance:

$$\text{Fare} = \left(\text{Base Fee} + \text{Weight (kg)} \times \text{Per-Kg Rate}\right) \times \text{Distance Band Multiplier}$$

- **Base Fee**: ₹20 flat counter booking charge
- **Weight Rate**: ₹15 per kg
- **Distance Multipliers**:
  - **Short Route** ($< 50\text{ km}$): $\times 1.0$
  - **Medium Route** ($50 - 100\text{ km}$): $\times 1.3$
  - **Long Route** ($> 100\text{ km}$): $\times 1.6$
- **Implementation**: [src/lib/fareCalculation.ts](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/lib/fareCalculation.ts)

### 4.3. Waybill Identification Format
- **Pattern**: `PV-YYYY-NNNNXXX`
- **Example**: `PV-2026-4821A9F`
- **Implementation**: [src/lib/waybill.ts](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/lib/waybill.ts)

### 4.4. Offline Sync Architecture (Conductor View)
1. Conductor taps transition button.
2. If online and API responds `200 OK`, UI updates immediately.
3. If network fails or times out:
   - Transition payload is serialized and appended to `localStorage` (`pettivandi_offline_queue`).
   - UI reflects the local change and indicates a pending sync badge.
   - Conductor can trigger manual sync or the app flushes items automatically when back online (up to 5 retries before marking as permanently failed).
- **Implementation**: [src/lib/offlineQueue.ts](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/src/lib/offlineQueue.ts)

---

## 5. Database Schema (Prisma ORM)

Defined in [prisma/schema.prisma](file:///c:/Users/paulj/Desktop/new%20projects/PettiVandi/pettivandi/prisma/schema.prisma):

```prisma
enum ParcelStatus {
  BOOKED
  LOADED
  IN_TRANSIT
  UNLOADED
  CLAIMED
}

model Trip {
  id                 String    @id @default(cuid())
  routeName          String    // e.g. "Kochi → Thrissur"
  busNumber          String    // e.g. "KL-07-5678"
  departureDepot     String    // e.g. "Ernakulam (High Court) Bus Stand"
  arrivalDepot       String    // e.g. "Thrissur KSRTC Bus Stand"
  scheduledDeparture DateTime
  distanceKm         Int       // Distance in km (used for fare band)
  parcels            Parcel[]
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

model Parcel {
  id              String        @id @default(cuid())
  waybillId       String        @unique // e.g. "PV-2026-1234"
  senderName      String
  senderPhone     String
  receiverName    String
  receiverPhone   String
  weightKg        Float
  description     String
  calculatedFare  Float
  status          ParcelStatus  @default(BOOKED)
  tripId          String
  trip            Trip          @relation(fields: [tripId], references: [id])
  whatsappOptedIn Boolean       @default(false)
  statusLogs      StatusLog[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model StatusLog {
  id        String        @id @default(cuid())
  parcelId  String
  parcel    Parcel        @relation(fields: [parcelId], references: [id])
  status    ParcelStatus
  timestamp DateTime      @default(now())
  note      String?
}
```

---

## 6. API Reference

| Endpoint | Method | Description | Key Request / Response Parameters |
| :--- | :---: | :--- | :--- |
| `/api/trips` | `GET` | List all available bus trips | Returns array of `Trip` objects |
| `/api/parcels` | `GET` | List parcels (optional status filter: `?status=BOOKED`) | Returns array of `Parcel` with nested `Trip` |
| `/api/parcels` | `POST` | Create a new parcel booking & log initial status | Body: `{ senderName, senderPhone, receiverName, receiverPhone, weightKg, description, tripId }` |
| `/api/parcels/[waybillId]` | `GET` | Fetch single parcel with full history & trip details | Returns `Parcel` including `trip` and `statusLogs` |
| `/api/parcels/[waybillId]/transition` | `POST` | Perform validated state transition & trigger WhatsApp alert | Body: `{ newStatus, note? }` |
| `/api/parcels/[waybillId]/whatsapp-optin` | `POST` | Opt-in receiver for WhatsApp updates | Body: `{ phone }` |

---

## 7. Directory Structure

```
PettiVandi/
├── context.md                     # High-level system & architectural documentation
└── pettivandi/                    # Application source root
    ├── AGENTS.md                  # Next.js agent operational rules
    ├── README.md                  # Getting started & deployment quickstart
    ├── package.json               # Dependencies and build scripts
    ├── prisma/
    │   ├── schema.prisma          # Database schema definition
    │   └── seed.ts                # Default KSRTC routes and demo data
    └── src/
        ├── app/
        │   ├── layout.tsx         # Root layout with metadata and fonts
        │   ├── globals.css        # Custom theme variables, print styles, animations
        │   ├── page.tsx           # Home / Role selector portal
        │   ├── depot/page.tsx     # Depot clerk counter booking & parcel manifest
        │   ├── conductor/page.tsx # Conductor QR scanner & state updater
        │   ├── track/page.tsx     # Citizen public tracking & WhatsApp opt-in
        │   └── api/
        │       ├── trips/route.ts
        │       └── parcels/
        │           ├── route.ts
        │           └── [waybillId]/
        │               ├── route.ts
        │               ├── transition/route.ts
        │               └── whatsapp-optin/route.ts
        ├── components/
        │   ├── QRScanner.tsx      # HTML5 camera scanner with permissions handling
        │   ├── StatusTimeline.tsx # Animated chronological audit timeline
        │   └── WaybillSlip.tsx    # Thermal-print-ready QR parcel receipt
        └── lib/
            ├── fareCalculation.ts # Tariff algorithm & distance band logic
            ├── offlineQueue.ts    # localStorage offline transition cache
            ├── prisma.ts          # Singleton Prisma client instance
            ├── stateMachine.ts    # State validation rules & notification templates
            ├── waybill.ts         # Waybill ID generation
            └── whatsapp.ts        # Twilio API client & dispatch
```

---

## 8. Local Setup & Execution Guide

### Prerequisites
- Node.js 20+ installed
- PostgreSQL instance running (local or cloud)

### Step-by-Step
```bash
# 1. Navigate into project folder
cd "c:/Users/paulj/Desktop/new projects/PettiVandi/pettivandi"

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env.local
# Set DATABASE_URL and optional TWILIO credentials in .env.local

# 4. Initialize Database & Seed Demo Trips
npx prisma migrate dev --name init
npm run db:seed

# 5. Run Development Server
npm run dev
```

Visit:
- Home: [http://localhost:3000](http://localhost:3000)
- Depot: [http://localhost:3000/depot](http://localhost:3000/depot)
- Conductor: [http://localhost:3000/conductor](http://localhost:3000/conductor)
- Tracking: [http://localhost:3000/track](http://localhost:3000/track)

---

## 9. Current Scope & Future Roadmap

### MVP Boundaries
- **Authentication**: No login required in MVP; role selected directly from `/`.
- **WhatsApp**: Operates via Twilio WhatsApp Sandbox requiring recipient opt-in verification.
- **Hardware**: Uses standard smartphone web camera via browser HTTPS permissions (no dedicated mobile app or scanner hardware needed).

### Future Roadmap
1. **Depot & Conductor Authentication**: KSRTC employee badge SSO or OTP-based crew login.
2. **Online Payment Gateway**: Integration with UPI / BharatQR / payment links at booking.
3. **Multi-Leg Hub & Spoke Routing**: Waybill transfers across intermediary transfer depots for cross-state journeys.
4. **GPS Telematics Integration**: Linking parcels with live bus tracking via KSRTC Chalo/vehicle telematics.
5. **SMS Fallback**: Automated SMS delivery for users without smartphones or WhatsApp.
