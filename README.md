This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load the Geist font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can explore more about the framework in the [Next.js documentation](https://nextjs.org/docs) and [Next.js community resources](https://nextjs.org/community).

## Deploy on AWS Amplify

This app is deployed on [AWS Amplify](https://aws.amazon.com/amplify/) at:
https://main.d3ppbkoectwrsc.amplifyapp.com

## E2E Tests

| Topic | Detail |
|---|---|
| Env source | Runtime environment variables only — no `.env.local` fallback |
| Required vars | `SEED_SECRET` (must match the value set in Amplify Console); one runtime URL env: `BASE_URL` or `NEXTAUTH_URL` |
| Auto-seed | Before any test case runs, the runner calls `POST /api/seed` with `x-seed-secret: $SEED_SECRET` to reset the database |
| Fail-fast | If `SEED_SECRET` or both `BASE_URL` and `NEXTAUTH_URL` are missing, or seed returns non-200, the runner exits immediately with one error message |
| Run locally | `SEED_SECRET=<value> BASE_URL=http://localhost:3000 npm run test:e2e` |
| Run against Amplify | `SEED_SECRET=<value> npm run test:e2e:ci` |
