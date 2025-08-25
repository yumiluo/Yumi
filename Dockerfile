# 多階段構建
FROM node:18-alpine AS base

# 安裝依賴
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 複製package文件
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# 構建階段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 構建Next.js應用
RUN npm run build

# 生產階段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 創建非root用戶
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製構建產物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 複製服務器文件
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 啟動腳本
CMD ["node", "server/enhanced-vr-server.js"]
