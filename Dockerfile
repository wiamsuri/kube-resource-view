FROM node:26-alpine AS base

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


# ── Stage 3: Production ───────────────────────────────────────────────────────
FROM base AS production

RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

CMD ["node", "build/index.js"]
