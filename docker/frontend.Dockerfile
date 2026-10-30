# 前端镜像：Vite 构建 + Nginx 托管，并反向代理后端接口
# 构建上下文：项目根目录

# ---------- 构建 ----------
FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---------- 运行 ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
