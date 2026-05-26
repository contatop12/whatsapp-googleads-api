FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf http://localhost:3000/ > /dev/null || exit 1

CMD ["node", "-e", "const p=process.env; console.log('[START]', new Date().toISOString()); console.log('[ENV] NODE_ENV=' + p.NODE_ENV + ' PORT=' + (p.PORT||3000)); console.log('[ENV] API_URL=' + (p.NEXT_PUBLIC_SUPABASE_URL||'not set')); require('./server.js')"  ]
