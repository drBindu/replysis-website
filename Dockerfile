FROM node:22-alpine AS base

# Stage 1 — install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY scripts/copy-pdf-worker.mjs ./scripts/copy-pdf-worker.mjs
RUN npm ci

# Stage 2 — build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BACKEND_URL=https://coopilotxai.com
ARG NEXT_PUBLIC_SPEECHMATICS_RT_HOST=us.rt.speechmatics.com
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_SPEECHMATICS_RT_HOST=$NEXT_PUBLIC_SPEECHMATICS_RT_HOST
RUN node scripts/copy-pdf-worker.mjs && npm run build

# Stage 3 — production runner (small image)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--openssl-legacy-provider"

CMD ["node", "server.js"]
