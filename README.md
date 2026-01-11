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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Security (Supabase / Postgres)

This app uses Supabase/Postgres; protect it with **Row Level Security (RLS)** and **least-privilege policies**.

- **Enable RLS + safe policies**: open Supabase → SQL Editor → run `supabase/security.sql`
- **Never expose service role**: do not put `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` env var.
- **RLS is the real security**: the anon key is public by design; data access is controlled by policies.

## Database Performance (Supabase / Postgres)

If fetching/search feels slow, add indexes:

- **Top 10 by population**: `supabase/performance.sql` adds `cities_population_desc_idx`
- **Fast ILIKE search**: enables `pg_trgm` + adds `cities_city_ascii_trgm_idx`

Run `supabase/performance.sql` in Supabase → SQL Editor.

## Development

### Code Quality

This project follows strict coding standards to ensure maintainability and readability:

- **Linting**: Run `npm run lint` to check for code issues
- **Formatting**: Run `npm run format` to format code with Prettier
- **Type Checking**: Run `npm run type-check` to verify TypeScript types

### Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed information about:
- Code style guidelines
- TypeScript conventions
- React/Next.js best practices
- Commit message format
- Pull request process

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # Run TypeScript type checking
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
