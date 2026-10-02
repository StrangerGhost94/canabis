# Cairn

A jurisdiction-aware **marketplace** for licensed cannabis retailers in Canada. Adults browse products across stores, fill a cart from one store, and place a pickup or delivery order. The **licensed store is always the seller**: it accepts the order, prepares it, checks government ID and takes payment at handover. Cairn never holds product or takes payment. Includes a verified referral-partner network and a full admin/compliance console.

See **BRAND.md** for the brand and design rationale.

> **No demo mode.** Cairn runs on real data only: stores, products and partners come from real sign-ups and every licence is checked by a person. Any data left over from the old demo environment is deleted automatically on start.

## Stack
Next.js 15 (App Router, server actions) · React 19 · TypeScript · PostgreSQL · Drizzle ORM · Zod · argon2id · hand-written CSS design system (no UI kit) · no client-side analytics or third-party scripts.

## Run it
```bash
cp .env.example .env          # fill in secrets
npm install
npm run db:migrate             # applies drizzle/*.sql
npm run db:seed                # provinces + rules, admin from ADMIN_EMAIL
npm run dev
```
Production: `npm run build && npm start` (start runs migrations and the seed, both idempotent). Set a strong `SESSION_SECRET`, `HASH_SALT`, `CRON_SECRET`, `ADMIN_EMAIL`, and schedule `POST /api/cron/licences` daily with header `x-cron-secret`.

## Going live
- Remove the old `DEMO_MODE` variable from Railway if it is still set (it is ignored now). On every start, `npm start` runs migrations and the seed, which deletes any leftover demo store, account, order and simulated rule setting. It is idempotent and never touches real data.
- Set `ADMIN_EMAIL` to your address, then **sign up on the site with that email**. That account becomes the platform administrator; no admin password is stored in settings.
- In **Admin → Jurisdiction rules**, record a legal basis for each capability you want on (listing, prices, ordering, pickup, delivery, vapes, edibles, partners) per province. Everything stays off until you do.
- Stores sign up at **List your store**, upload their licence, and appear once you verify them in **Admin → Verification queue**.

## Deploy on Railway
1. Push this repo to GitHub and create a Railway project from it.
2. Add a **PostgreSQL** service; Railway exposes `DATABASE_URL` — reference it in the app service's variables.
3. Set variables on the app service: `SESSION_SECRET` (openssl rand -base64 48), `HASH_SALT` (openssl rand -base64 24), `APP_URL` (your Railway URL), `ADMIN_EMAIL`, `CRON_SECRET`, and `UPLOAD_DIR=/data/uploads`.
4. Attach a **volume** mounted at `/data` so licence documents and product images survive redeploys.
5. Deploy. Migrations run automatically on start (`npm start`); `/api/health` is the health check.
6. Sign up on the site with your `ADMIN_EMAIL` address to become the administrator.
7. Schedule a daily `POST https://<app>/api/cron/licences` with header `x-cron-secret: $CRON_SECRET` (Railway cron service or any scheduler).

## What's in it
**Customers** — province/age gate, plain-language guide (`/guide`) and FAQ, location by postal code, city or device, storefront home with format shelves, shop grid with filters (format, THC:CBD balance, price where permitted, in stock, open now, distance), store pages with per-location stock, product pages, one-store cart (guest carts carry over on sign-in), live 30 g possession-limit meter, checkout for pickup or delivery with ID confirmation, order tracking with progress and notifications, saved items, settings.

**Retailers** — onboarding with licence upload, order board (new / preparing / ready to hand over) with accept, decline with reason, ready or out-for-delivery, and completion gated on an ID check; menu and per-location stock, product pack shots, dried-cannabis equivalents, ordering settings (on/off, prep time, delivery fee/minimum/radius), locations and hours, partner requests, purchase reporting API for off-platform sales, licence renewal.

**Partners** — application with conduct attestation, review status, links per campaign with QR codes (SVG download), store partnership requests, funnel analytics, earnings (only where permitted), public profile with automatic paid-recommendation disclosure.

**Admins** — overview, verification queue (licences and partners), retailers/partners/users/products enforcement, referrals and commission approval, jurisdiction rules matrix, risk flags and public reports, audit log, system/provider status and licence sweep.

## Ordering model (products first, automatic routing)
- **Buyers verify once.** After sign-up they upload a government photo ID and a selfie (`/account/verify`). An admin approves it in **Admin → Verification queue → Buyer IDs**; both images are deleted as soon as a decision is made. Only verified buyers can check out. Stores still check ID at the door, as the law requires.
- **Buyers never pick a store.** The cart holds products (brand + name + size). At checkout `src/lib/routing.ts` sends each item to the nearest licensed store that has it in stock and delivers to the buyer's address (or offers pickup), splitting into as few parts as possible when no single store has everything. Prices on cards and product pages are the routed store's price for that buyer.
- **Moving is automatic.** The saved delivery address (Account → Settings) drives routing, so a new address means the nearest stores there. Changing province clears the address and re-applies that province's rules.
- **Declines reroute.** If a store declines, the order moves to the next-nearest store that can fill all of it; the buyer is told the new store and total and can cancel before acceptance.
- The seller is always named at checkout and on every order (trade name, legal name, regulator and licence number).

## Ordering model (details)
- `src/lib/cart.ts` — one cart per browser or user, one store per cart (asks before replacing), quantity caps, and the federal **30 g public-possession limit** computed from each product's label equivalent.
- `src/lib/orders.ts` — order placement and a strict state machine: `PLACED → ACCEPTED → READY | OUT_FOR_DELIVERY → COMPLETED`, with `REJECTED`/`CANCELLED` exits. Only the store can advance an order; the customer can cancel only before acceptance; completion requires the store to confirm an ID check. Every step is timestamped, audit-logged and notified.
- Delivery postal codes must be in the store's province. Customers can only order from stores in their own province.
- Completed orders that arrived through a partner link create the partner's conversion (and commission, only where permitted) automatically.
- No payment processing: totals are shown as "pay the store at handover". Integrating a store-side payment provider is a store decision and must keep the retailer as merchant of record.

## Compliance architecture
- `src/lib/compliance/rules.ts` — catalogue of capabilities that depend on provincial/territorial law (listing, product visibility, prices, ordering through Cairn, pickup, delivery, promotions, vapes, edibles, partner referrals/profiles/compensation).
- **Fail-closed**: a capability is on only with an `ALLOWED` determination. Missing, `UNCONFIRMED` and `PROHIBITED` are all off. New keys start unconfirmed everywhere. Setting a determination requires a cited legal basis and confirmation, and is audit-logged.
- Legal age per jurisdiction (seeded 18 AB, 21 QC, 19 elsewhere — **verify before launch**), enforced at the gate, at sign-up from date of birth, and on province change.
- Product and profile copy is screened for health claims, youth appeal, lifestyle language and inducements (`copy-check.ts`) — a first pass, not a substitute for legal review.

## Verification
`src/lib/verification/providers.ts` defines the `LicenceVerifier` interface:
- `MANUAL_REGISTRY_CHECK` — real: a reviewer compares with the regulator's public registry and must record the reference.
- `EXTERNAL_API` — integration point; throws until a real, contracted source is connected.

Listings are filtered at read time (verified retailer + verified, unexpired licence), so a lapsed licence disappears from discovery the day it expires; the daily sweep records the change and notifies the store (30- and 7-day reminders too).

## Security
argon2id passwords · DB-backed sessions (hashed tokens, httpOnly/SameSite cookies, `__Host-` in prod) · RBAC plus tenant checks on every action · Zod validation everywhere · Postgres-backed rate limiting (sign-in, sign-up, reports, API, referral/hand-off routes) · append-only audit log · IPs and visitor ids stored only as keyed hashes · uploads sniffed by magic bytes, size-capped, stored outside the web root and served only to admins/owners · strict security headers and CSP · server-action origin checks (Next.js) · no secrets in client code.

## Integration points to connect before launch
Licence registry API · a commercial geocoder at scale (`geocode` in `src/lib/geo.ts` uses OpenStreetMap Nominatim, fine for low volume; customers can also share their device location) · email/SMS for notifications · partner payouts and tax details · legal review of every jurisdiction rule and the legal-age table.
