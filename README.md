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

SHA requires the following 7 environment variables for local development and production deployment.

| Variable | Purpose | How to generate/obtain |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string | Atlas Console → Connect → Drivers |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production domain for NextAuth callbacks | e.g. `https://main.d1cuvfcb286qsc.amplifyapp.com` |
| `MEGA_EMAIL` | MEGA service account email | MEGA account (disable 2FA on service account) |
| `MEGA_PASSWORD` | MEGA service account password | MEGA account |
| `SEED_SECRET` | Guards `/api/seed` and `/api/health/db` | Any secure random string |
| `ABLY_API_KEY` | Ably Realtime for inbox notifications | Ably Console → API Keys (gracefully degrades if missing) |

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

Note: `.env.local.example` also contains additional variables used by E2E tests and email delivery, but the 7 variables above are the required application variables.

## Deployment on AWS Amplify

- Production URL: `https://main.d1cuvfcb286qsc.amplifyapp.com`
- Build config: `amplify.yml`
- All 7 environment variables must be set in Amplify Console → App settings → Environment variables for the `main` branch

Amplify uses two environment-variable paths during deployment:

1. Amplify Console environment variables are read at SSR runtime.
2. The build phase writes environment variables into `.env.production` for SSG and other build-time paths.

Both are required: Amplify Console variables for SSR, and `.env.production` for SSG.

## Key API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/seed` | Seeds the database with demo data. Requires `x-seed-secret` header. |
| `GET` | `/api/health/db` | Checks MongoDB connection. Requires `x-debug-key` header equal to `SEED_SECRET`. |
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
SEED_SECRET=<value> npm run test:e2e:ci
```

The suite covers 11 test cases: `TC01` through `TC10`, plus `TC06b`. Coverage includes landlord registration, listing creation, student registration, applications, forum flows, inbox messaging, and notifications.

The runner auto-seeds the database before the test suite starts.

## Known MVP Limitations

- Inbox is async polling, so users must refresh to see new messages. Real-time Ably client subscription is planned for v1.1.
- Forum is student-only. Landlords and admins receive `403` on forum API calls. This is planned for v1.1.
- There is no password reset flow. Users who forget passwords should contact `admin@sha.co.zw`. This is planned for v1.1.
- Listings cannot be edited after submission. This is planned for v1.1.
- Bulk admin actions are not available in v1.0. This is planned for v1.1.

## Seeding Production

```bash
curl -X POST https://main.d1cuvfcb286qsc.amplifyapp.com/api/seed \
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
