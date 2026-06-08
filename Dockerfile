FROM --platform=$BUILDPLATFORM node:26-alpine AS base

WORKDIR /app

COPY package*.json .npmrc ./

# ── Stage 1: Development ─────────────────────────────────────────────────────
FROM base AS development

RUN npm ci

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Stage 2: Builder ──────────────────────────────────────────────────────────
FROM development AS builder

COPY . .
RUN npm run build

# ── Stage 3: Production Dependencies ──────────────────────────────────────────
FROM base AS production-deps

RUN npm ci --omit=dev

# ── Stage 4: Production ───────────────────────────────────────────────────────
FROM --platform=$TARGETPLATFORM node:26-alpine AS production

WORKDIR /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY package.json ./

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

CMD ["node", "build"]
