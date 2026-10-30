# 后端服务镜像：Node + Express + Socket.io
# 构建上下文：./server

# ---------- 依赖安装 ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- TypeScript 编译 ----------
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# ---------- 运行时 ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5050
RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/dist ./dist
COPY public ./public

# 上传图片目录（生产环境建议挂载数据卷持久化）
RUN mkdir -p /app/public/images

EXPOSE 5050
CMD ["node", "dist/index.js"]
