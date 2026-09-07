# Self-host VirtuaLab Digital — the sub-domain builder, deployable on your own VPS.
#
# Free tier: run this on any 2GB+ VPS (Hetzner ~$4/mo, OVH, DigitalOcean, your laptop).
# All data stays on your server. No telemetry. No paid tiers required.
#
# Usage:
#   1. cp .env.example .env  && edit (set AGENCY_NAME, AGENCY_MAIN_URL)
#   2. docker compose up -d
#   3. Open http://localhost:3000
#
# Update:
#   docker compose pull && docker compose up -d

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/data/virtulab.db
RUN mkdir -p /data
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
VOLUME ["/data"]
CMD ["bun", ".next/standalone/server.js"]
