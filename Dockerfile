# ── Stage 1: Development ─────────────────────────────────────────────────────
FROM node:22-alpine AS development

WORKDIR /app

# Install deps first (layer cache)
COPY package*.json .npmrc ./
RUN npm ci

# Mount source at runtime; this stage is for hot-reload dev
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ── Stage 2: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build


# ── Stage 3: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only production deps
COPY package*.json .npmrc ./
RUN npm ci --omit=dev

# Copy built artefact from builder
COPY --from=builder /app/build ./build

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

CMD ["node", "build/index.js"]
