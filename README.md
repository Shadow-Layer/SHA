# Student Housing Archive (SHA)

Student Housing Archive (SHA) is a community-driven housing marketplace for university students in Mutare, Zimbabwe. The platform is built with Next.js 14, MongoDB Atlas, AWS Amplify, MEGA storage, and Ably Realtime.

## Local Development Setup

### Prerequisites

- Node.js 20
- npm

### Start the app locally

```bash
git clone <repository-url>
cd SHA
npm install
```

Create a `.env.local` file in the project root with all required environment variables. You can copy the example file first:

```bash
cp .env.local.example .env.local
```

Then start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

SHA requires the following environment variables for local development and production deployment.

| Variable | Purpose | How to generate/obtain |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string | Atlas Console → Connect → Drivers |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production domain for NextAuth callbacks | e.g. `<PRODUCTION_URL>` |
| `MEGA_EMAIL` | MEGA service account email | MEGA account (disable 2FA on service account) |
| `MEGA_PASSWORD` | MEGA service account password | MEGA account |
| `SEED_SECRET` | Guards `/api/seed` and `/api/health/db` | Any secure random string |
| `ABLY_API_KEY` | Ably Realtime for inbox notifications | Ably Console → API Keys (gracefully degrades if missing) |
| `RESEND_API_KEY` | Required for invite delivery and the reset password flow. Without it, invite and password reset emails are skipped. | Resend Console → API Keys |
| `RESEND_FROM_EMAIL` | Required sender address for invite delivery and the reset password flow | Defaults to `SHA <noreply@sha.co.zw>` |

Example `.env.local`:

```bash
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
MEGA_EMAIL=
MEGA_PASSWORD=
SEED_SECRET=
ABLY_API_KEY=
```

Note: `.env.local.example` also contains additional variables used by E2E tests and email delivery. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in every environment where users need invite emails or password reset emails.

## Deployment on AWS Amplify

- Production URL: `<PRODUCTION_URL>`
- Build config: `amplify.yml`
- Set all required environment variables in Amplify Console → App settings → Environment variables for the `main` branch. Include `RESEND_API_KEY` and `RESEND_FROM_EMAIL` if invite emails and password resets must work in that environment.

Amplify uses two environment-variable paths during deployment:

1. Amplify Console environment variables are read at SSR runtime.
2. The build phase writes environment variables into `.env.production` for SSG and other build-time paths.

Both are required: Amplify Console variables for SSR, and `.env.production` for SSG.

## Key API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/seed` | Seeds the database with demo data. Requires `x-seed-secret` header. |
| `GET` | `/api/health/db` | Checks MongoDB connection. Accepts `x-seed-secret` header (preferred), `x-debug-key` header (legacy), or `?key=` query param — all compared against `SEED_SECRET`. |
| `POST` | `/api/auth/register` | User registration. |
| `GET` | `/api/listings` | Browse listings (public). |
| `POST` | `/api/auth/login` | Login. |

## E2E Tests

Run locally:

```bash
SEED_SECRET=<value> BASE_URL=http://localhost:3000 npm run test:e2e
```

Run against production:

```bash
SEED_SECRET=<value> BASE_URL=<PRODUCTION_URL> npm run test:e2e:ci
```

The suite covers 11 test cases: `TC01` through `TC10`, plus `TC06b`. Coverage includes landlord registration, listing creation, student registration, applications, forum flows, inbox messaging, and notifications.

The runner auto-seeds the database before the test suite starts.

## Known MVP Limitations

- Inbox uses Ably Realtime for live message delivery. If `ABLY_API_KEY` is not set, the inbox falls back to manual refresh mode and shows a notice to the user.
- Forum is student-only. Landlords and admins receive `403` on forum API calls. This is planned for v1.1.
- Listings cannot be edited after submission. This is planned for v1.1.
- Bulk admin actions are not available in v1.0. This is planned for v1.1.

## PWA Testing

1. Run `npm install` to install `next-pwa`, then create a production build with `npm run build`.
2. Start the app with `npm run start` and open the site over `http://localhost:3000`.
3. In Chrome DevTools, open Application and confirm that `manifest.json`, `sw.js`, and the two PNG icons are present.
4. Use Lighthouse with the PWA category enabled and verify installability, manifest validity, and service worker registration.
5. In DevTools, switch the Network tab to `Offline`, refresh a previously visited page, and confirm cached assets still load while API-driven content is not cached.
6. Test install flow on desktop and mobile. Confirm the app installs with the SHA name, icon, standalone display mode, and theme color.

## Seeding Production

```bash
curl -X POST <PRODUCTION_URL>/api/seed \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

Seeding creates:

- 6 users (1 admin, 2 landlords, 3 students)
- 5 listings
- 3 service providers
- 6 forum posts
- 2 applications
- 1 conversation
- 2 messages
- 5 notifications

Default seed password for all seeded accounts: `password`

## DB Health Check

Preferred header:

```bash
curl <PRODUCTION_URL>/api/health/db \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

Legacy header:

```bash
curl <PRODUCTION_URL>/api/health/db \
  -H "x-debug-key: YOUR_SEED_SECRET"
```

Query param:

```bash
curl "<PRODUCTION_URL>/api/health/db?key=YOUR_SEED_SECRET"
```

## WhatsApp Outreach

The admin imported-leads dashboard includes an optional **Send via WhatsApp** action for each imported landlord.

### How it works

1. Admin clicks **Send via WhatsApp** on an imported landlord row.
2. The system generates a secure claim link and builds a `wa.me` deep-link.
3. WhatsApp opens on the admin's device with a pre-filled message containing the claim link.
4. The admin reviews the message and **manually taps Send** in WhatsApp.
5. Messages are **not** sent automatically — `wa.me` only pre-fills the message.

### Claim links

- Generated by admin action; expire in **14 days**.
- Each WhatsApp outreach action regenerates the token, invalidating any previous one.
- The same token works for both email and WhatsApp outreach.

### Phone numbers

- Should include country code where possible (e.g. `+263771234567`).
- Numbers starting with `0` are automatically prefixed with Zimbabwe's country code `263`.
- Override the default country code via the `WHATSAPP_DEFAULT_COUNTRY_CODE` environment variable.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEXTAUTH_URL` | **Required in production.** Used as the base URL for claim links. Falls back to the request `origin` header if unset. |
| `WHATSAPP_DEFAULT_COUNTRY_CODE` | Optional. Defaults to `263` (Zimbabwe). |

### Security

- Raw claim tokens are **never** stored in outreach event logs.
- Only the normalised phone number and a redacted message preview are logged.
- The `wa.me` URL format is: `https://wa.me/<number_without_plus>?text=<url_encoded_message>`

### Bulk WhatsApp PDF

Use this flow when you need a downloadable outreach packet for multiple imported landlords:

1. Select the landlords in the admin imported-leads table.
2. Click **Export WhatsApp PDF**.
3. Edit the message template in the modal if needed.
4. Click **Generate PDF** to download the batch PDF.

Supported template placeholders:

- `{landlordName}`
- `{claimLink}`
- `{phone}`
- `{expiresAt}`
- `{listingTitle}`
- `{address}`

Notes:

- `{claimLink}` is required and is automatically appended if it is removed from the template.
- `wa.me` links open WhatsApp with a pre-filled message, but they do **not** auto-send messages.
- Production claim links always use `https://studenthousingarchive.cfd/claim/{token}`.
- Phone numbers should include a country code; numbers that start with `0` are prefixed with Zimbabwe code `263`.
- PDFs contain sensitive claim links, so handle them securely and do not share them publicly.
- Invalid or missing phone numbers are skipped, and the skip count is shown in the success banner.
