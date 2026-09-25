FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build needs the PUBLIC Supabase values: NEXT_PUBLIC_* are inlined into the
# client bundle, generateStaticParams reads the cities table, and next.config
# allow-lists the project's Storage host — so switching projects means
# rebuilding. The publishable key is safe to embed (RLS governs it).
#
# The build must NEVER see secrets: not SUPABASE_SECRET_KEY, not paid-provider
# keys. Build args persist in image layers (incident action P4), and the cost
# guard is cache-only at build time anyway. Provide secrets at runtime only,
# via env_file.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN mkdir -p /app/.next/cache \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
