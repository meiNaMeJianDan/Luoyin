# 桌游攻略 & 在线桌游平台

一个面向桌游爱好者的综合平台：**图文攻略 + 在线联机桌游 + 塔罗占卜 + 可视化管理后台**。

- 5 款实时联机桌游：UNO、卡坦岛、德国心脏病、你画我猜、璀璨宝石
- 78 张塔罗牌、三种牌阵，每日运势当天固定、支持历史记录与重置
- 管理后台可维护游戏、详情、分类、FAQ 等内容
- 前后端同源部署，Docker 一键启动

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [项目结构](#项目结构)
- [架构设计](#架构设计)
- [后端 API](#后端-api)
- [环境变量](#环境变量)
- [常见问题](#常见问题)

---

## 功能特性

### 🎲 在线联机桌游（5 款）

所有联机游戏共享统一架构：**纯函数引擎 + 房间管理 + Socket.io 实时同步 + AI 托管 + 断线重连**。

| 游戏 | 入口 | 人数 | 核心特性 |
|------|------|------|----------|
| **UNO** | `/uno` | 2-4 人 | 108 张标准牌组、功能牌、Wild+4 质疑、UNO 喊牌与举报 |
| **卡坦岛** | `/catan` | 2-4 人 | 六角地图（轴坐标系）、资源采集、建造、交易、发展卡、最长路/最大军队 |
| **德国心脏病** | `/halli` | 2-6 人 | 水果牌翻牌、抢铃铛、实时反应竞速 |
| **你画我猜** | `/draw` | 2-8 人 | Canvas 实时画板、200+ 中文词库、猜词聊天、词语提示可开关 |
| **璀璨宝石** | `/splendor` | 2-4 人 | 90 张发展卡 + 10 位贵族、宝石经济、购买/保留/拿取 |

> 统一入口：**`/online` 在线游戏大厅**（首页导航「在线游戏」、首页「在线开玩」专区均可进入）

### 🔮 塔罗占卜

纯前端功能，无需后端。78 张完整塔罗牌（22 大阿卡纳 + 56 小阿卡纳），支持正逆位、3D 翻牌动画与详细解读。

| 牌阵 | 路由 | 说明 |
|------|------|------|
| 每日运势 | `/tarot/reading/single` | 单张牌，快速占卜 |
| 三张牌阵 | `/tarot/reading/three` | 过去、现在、未来 |
| 凯尔特十字 | `/tarot/reading/celtic` | 10 张牌深度解读 |

- **每日运势当天固定**：抽牌即写入 localStorage，当天重复进入仍是同一张牌（正逆位也固定），次日自动失效
- **历史记录**：最多保留 50 条，每日运势带独立标签；可在 `/tarot/history` 查看、清空
- **重置今日运势**：占卜页或塔罗首页可重置后重新抽取（不影响历史记录）

### 📖 桌游攻略网站

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 热门推荐、分类入口、在线游戏专区 |
| `/online` | 在线游戏大厅 | 联机游戏 + 塔罗占卜统一入口 |
| `/categories` | 分类浏览 | 按类型、人数、时长筛选，支持搜索 |
| `/game-detail/:id` | 游戏详情 | 简介、玩法步骤、获胜条件、新手提示（未录入时显示「筹备中」） |
| `/trending` | 热门排行 | 按热度排名的榜单 |
| `/beginners` | 新手指南 | 基础流程与 FAQ |
| `/about` | 关于 | 关于页面 |

### 🛠️ 管理后台

访问 `/admin`，支持游戏、游戏详情、分类选项、快速链接、FAQ、新手指南的可视化 CRUD，FAQ/指南支持拖拽排序，图片可上传（≤5MB）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui |
| 后端 | Node.js + Express 4 + TypeScript |
| 数据库 | MySQL 8（mysql2 连接池） |
| 实时通信 | Socket.io 4（WebSocket） |
| 数据请求 | TanStack Query |
| 表单校验 | React Hook Form + Zod |
| 拖拽排序 | dnd-kit |
| 测试工具 | Vitest + fast-check |
| 部署 | Docker / Docker Compose + Nginx |

---

## 快速开始

### 环境要求

- **Node.js >= 20.19**（推荐 22 LTS；Vite 7 的最低要求）
- **pnpm 10**（仓库使用 pnpm 锁定依赖）
- **MySQL 8**（本地开发使用本机 `3306`；也可直接用 Docker，见下节）

### 1. 安装依赖

```bash
# 前端
pnpm install

# 后端
cd server
pnpm install
cd ..
```

### 2. 初始化数据库（本地测试环境，3306）

创建数据库后执行建表 + 种子数据：

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS boardgame DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci"

cd server
pnpm run seed
cd ..
```

> - `pnpm run seed` 实际执行 `docker/mysql/init.sql`，**会先删除再重建 6 张表**，请勿对已有业务数据的库执行。
> - 连接信息通过 `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` 配置，默认 `127.0.0.1:3306`、`root` / `123456`、`boardgame`。
> - 本地后端直接读取进程环境变量（未集成 dotenv），需要时在命令前临时指定，例如 `DB_PASSWORD=xxx pnpm run dev`。

**端口约定**

| 场景 | MySQL 地址 |
|------|-----------|
| 本地 / 测试 | 宿主机 `127.0.0.1:3306`（默认，无需额外配置） |
| Docker 线上 | 宿主机 `4768` → 容器 `3306`；后端走内网 `mysql:3306` |

两者互不影响，宿主机 `3306` 可继续被其他项目使用。

### 3. 启动开发服务

```bash
# 终端 1：后端（默认 5050）
cd server
pnpm run dev

# 终端 2：前端（默认 5173）
pnpm run dev
```

Vite 已配置代理：`/api`、`/images`、`/socket.io` → `http://localhost:5050`，前端无需处理跨域。

启动后访问：

| 页面 | 地址 |
|------|------|
| 用户端 | http://localhost:5173 |
| 在线游戏大厅 | http://localhost:5173/online |
| 管理后台 | http://localhost:5173/admin |
| 塔罗占卜 | http://localhost:5173/tarot |

### 常用脚本

| 位置 | 命令 | 说明 |
|------|------|------|
| 根目录 | `pnpm run dev` | 启动前端开发服务器 |
| 根目录 | `pnpm run build` | 构建前端到 `dist/` |
| 根目录 | `pnpm run preview` | 预览构建产物 |
| 根目录 | `pnpm run lint` | ESLint 检查 |
| `server/` | `pnpm run dev` | 启动后端（tsx watch） |
| `server/` | `pnpm run build` | TypeScript 编译到 `dist/` |
| `server/` | `pnpm run start` | 运行编译后的服务 |
| `server/` | `pnpm run seed` | 执行 `docker/mysql/init.sql`（重建表） |

---

## Docker 部署

### 架构与端口

```
浏览器 ──5000──> frontend（Nginx）
                    ├── /            静态资源（SPA 回退）
                    ├── /api/*       反代 ──> backend:5050
                    ├── /images/*    反代 ──> backend:5050
                    └── /socket.io/* 反代 ──> backend:5050（WebSocket）

backend:5050 ──> mysql:3306（宿主机映射 4768）
```

| 服务 | 容器名 | 宿主机端口 | 说明 |
|------|--------|-----------|------|
| 前端 | `luoyin-frontend` | `5000` | Nginx 托管 + 同源反代 |
| 后端 | `luoyin-backend` | `5050` | Node 运行时 |
| 数据库 | `luoyin-mysql` | `4768` | MySQL 8.0，数据卷持久化 |

### 启动

```bash
# 可选：自定义密码 / 端口
cp .env.example .env

docker compose up -d --build
```

首次启动约需 1 分钟（MySQL 初始化 + 健康检查）。启动完成后：

- 站点：`http://服务器IP:5000`
- 管理后台：`http://服务器IP:5000/admin`

### 运维

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f backend
docker compose logs -f mysql

# 停止（保留数据库数据）
docker compose down

# 停止并删除数据卷（数据库会被重置）
docker compose down -v

# 重新构建并启动
docker compose up -d --build
```

**数据持久化**

- MySQL 数据：命名卷 `luoyin_mysql_data`
- 上传图片：宿主机 `server/public/images`（已挂载到容器 `/app/public/images`）

**备份数据库**

```bash
docker exec luoyin-mysql sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" boardgame' > backup_$(date +%F).sql
```

### 生产注意事项

1. **修改默认密码**：在 `.env` 中设置强密码，避免使用示例的 `123456`。
2. **收敛端口暴露**：前端经 Nginx 已能访问全部能力，通常只需对外暴露 `5000`；可视情况删除 `backend` 的 `5050` 和 `mysql` 的 `4768` 映射，减少攻击面。
3. **HTTPS**：若服务器已有外层 Nginx / 负载均衡，可将前端映射改为仅内网并配置证书。
4. **初始化脚本只运行一次**：`docker/mysql/init.sql` 仅在数据卷为空时执行；修改脚本后需 `docker compose down -v` 才会重新执行（会清空数据）。
5. **图片目录权限**：上传文件写入挂载的 `server/public/images`。若调整容器运行用户，需确保该目录对相应用户可写。

---

## 项目结构

```text
project-root/
├── src/                          # 前端源码
│   ├── api/                      # API 客户端（client.ts / adminClient.ts）
│   ├── components/               # 通用组件（Layout、Header、Footer、shadcn/ui）
│   ├── constant/                 # 在线游戏入口配置
│   ├── hooks/                    # React Query Hooks
│   ├── pages/
│   │   ├── admin/                # 管理后台页面
│   │   ├── OnlineGames.tsx       # 在线游戏大厅
│   │   ├── uno/                  # UNO 联机
│   │   │   ├── context/          #   GameContext（Socket 连接共享）
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   CardView、HandCards、ColorPicker 等
│   │   ├── catan/                # 卡坦岛（HexMap、Vertex、Edge 等）
│   │   ├── halli/                # 德国心脏病（GameBoard、FruitCard 等）
│   │   ├── draw/                 # 你画我猜（CanvasBoard、DrawToolbar 等）
│   │   ├── splendor/             # 璀璨宝石（DevelopmentCard、GemPool 等）
│   │   ├── tarot/                # 塔罗占卜（纯前端）
│   │   │   ├── data.ts           #   78 张牌数据
│   │   │   ├── storage.ts        #   历史记录 / 每日运势存取
│   │   │   ├── Reading.tsx       #   占卜页
│   │   │   └── History.tsx       #   历史记录页
│   │   └── ...                   # 攻略站页面（Home、Categories 等）
│   ├── App.tsx                   # 路由配置
│   └── main.tsx                  # 应用入口
│
├── server/                       # 后端源码
│   ├── src/
│   │   ├── index.ts              # 服务入口（Express + Socket.io）
│   │   ├── db.ts                 # MySQL 连接池与查询封装
│   │   ├── seed.ts               # 执行 init.sql 初始化数据
│   │   ├── routes/               # REST API（admin/ 为管理接口）
│   │   ├── middleware/           # 错误处理、校验、asyncHandler
│   │   ├── uno/                  # 游戏模块：types/engine/room/socket/timer/ai
│   │   ├── catan/                #   同上 + map.ts（轴坐标地图）
│   │   ├── halli/                #   同上
│   │   ├── draw/                 #   同上 + words.ts（词库）
│   │   └── splendor/             #   同上 + cards.ts（卡牌数据）
│   ├── public/images/            # 游戏图片（含后台上传）
│   └── Dockerfile
│
├── docker/
│   ├── mysql/init.sql            # MySQL 建表 + 种子数据
│   ├── nginx.conf                # Nginx 站点配置（反代 /api /images /socket.io）
│   └── frontend.Dockerfile       # 前端多阶段构建
├── docker-compose.yml            # 三服务编排
├── .env.example                  # 部署环境变量模板
└── vite.config.ts                # Vite 配置（代理、自动导入、别名）
```

---

## 架构设计

### 游戏模块分层

5 款联机游戏遵循同一套结构：

```
前端：Context → useSocket → useGame → UI
                 ⇅ Socket.io（WebSocket）
后端：socket.ts → room.ts → engine.ts
        timer.ts    ai.ts
```

| 文件 | 职责 |
|------|------|
| `engine.ts` | 纯函数游戏引擎，不依赖外部状态，便于测试与推理 |
| `room.ts` | 房间生命周期：创建、加入、离开、断线重连 |
| `socket.ts` | WebSocket 事件入口，连接前端与引擎 |
| `timer.ts` | 回合超时管理（超时自动操作/AI 托管） |
| `ai.ts` | AI 决策策略 |

### Socket.io 事件隔离

所有游戏共享单一 `SocketIOServer` 实例（由 UNO 模块创建），通过事件名前缀隔离：

| 游戏 | 前缀 | 示例 |
|------|------|------|
| UNO | 无 | `create_room`、`play_card` |
| 卡坦岛 | `catan:` | `catan:create_room`、`catan:build` |
| 德国心脏病 | `halli:` | `halli:create_room`、`halli:slap_bell` |
| 你画我猜 | `draw:` | `draw:create_room`、`draw:draw_line` |
| 璀璨宝石 | `splendor:` | `splendor:create_room`、`splendor:buy_card` |

### 前端状态与连接

- **GameContext**：通过 Context + `<Outlet />` 共享 Socket 连接，切换房间内页面不会重建连接
- **useSocket**：管理连接生命周期与自动重连
- **useGame**：封装游戏状态与操作，使用 Ref 规避闭包与重复监听问题

### 服务端权威 + 状态脱敏

所有规则判定在服务端执行，客户端只发送操作意图。广播状态时按玩家脱敏（如隐藏他人手牌），防止作弊。

### 关键设计点

- **卡坦岛**：轴坐标系（Axial Coordinates）六角网格，预计算顶点/边邻接关系与像素坐标
- **你画我猜**：画布使用百分比坐标，保证不同分辨率下笔迹一致
- **UNO**：Wild+4 质疑需要回溯上一手牌判断合法性
- **璀璨宝石**：Bonus + 黄金的复合支付计算

---

## 后端 API

后端默认运行在 `http://localhost:5050`，端口可通过 `PORT` 覆盖。

统一响应格式：

```jsonc
// 成功
{ "data": { /* ... */ } }
// 失败（HTTP 4xx/5xx）
{ "error": "错误描述" }
```

### 只读接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/games` | 所有游戏 |
| GET | `/api/games/trending` | 热门游戏 |
| GET | `/api/games/ranked` | 排行榜（按 `game_rank`） |
| GET | `/api/games/:id` | 指定游戏 |
| GET | `/api/games/:id/details` | 游戏详情（未录入时 `data: null`） |
| GET | `/api/categories/options` | 分类筛选选项 |
| GET | `/api/categories/quick-links` | 分类快速链接 |
| GET | `/api/guide/faqs` | FAQ 列表 |
| GET | `/api/guide/steps` | 新手指南步骤 |

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST/PUT/DELETE | `/api/admin/games[/:id]` | 游戏 CRUD |
| POST/PUT/DELETE | `/api/admin/games/:id/details` | 游戏详情 CRUD |
| PUT | `/api/admin/categories/options` | 更新分类选项 |
| POST/PUT/DELETE | `/api/admin/categories/quick-links[/:id]` | 快速链接 CRUD |
| POST/PUT/DELETE | `/api/admin/guide/faqs[/:id]` | FAQ CRUD |
| PUT | `/api/admin/guide/faqs/reorder` | FAQ 排序 |
| POST/PUT/DELETE | `/api/admin/guide/steps[/:id]` | 指南步骤 CRUD |
| PUT | `/api/admin/guide/steps/reorder` | 指南步骤排序 |
| POST | `/api/admin/upload` | 图片上传（≤5MB，JPEG/PNG/WebP） |
| GET | `/api/admin/stats` | 仪表盘统计 |

> 数据库字段说明：MySQL 保留字做了重命名——`rank` → `game_rank`，`key` → `option_key`；API 返回字段仍为 `rank` / `key`，前端无感知。

---

## 环境变量

### 后端

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `5050` | 后端服务端口 |
| `DB_HOST` | `127.0.0.1` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | MySQL 用户名 |
| `DB_PASSWORD` | `123456` | MySQL 密码 |
| `DB_NAME` | `boardgame` | 数据库名 |
| `DB_POOL_SIZE` | `10` | 连接池大小 |
| `CORS_ORIGIN` | `*` | 允许的来源（同源部署时保持默认） |

### 前端（构建时）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | 空（相对路径） | 接口基础地址；默认同源，由 Vite/Nginx 代理 |

### Docker Compose（`.env`，参考 `.env.example`）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MYSQL_ROOT_PASSWORD` | `123456` | MySQL root 密码 |
| `MYSQL_DATABASE` | `boardgame` | 初始数据库名 |
| `MYSQL_PORT` | `4768` | MySQL 宿主机端口 |
| `BACKEND_PORT` | `5050` | 后端宿主机端口 |
| `FRONTEND_PORT` | `5000` | 前端宿主机端口 |
| `CORS_ORIGIN` | `*` | 允许的来源 |
| `TZ` | `Asia/Shanghai` | 时区 |

---

## 常见问题

**Q：启动后端报数据库连接失败？**
检查 `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`，确认 MySQL 已启动、库已创建且已执行 `pnpm run seed`。

**Q：改了 `init.sql`，重新 `up` 后没生效？**
初始化脚本只在 MySQL 数据卷为空时执行。需要重新初始化时：`docker compose down -v && docker compose up -d`（**会清空数据库**）。

**Q：端口被占用（`EADDRINUSE`）？**
本地后端默认 `5050`、前端 `5173`、MySQL `3306`；Docker 使用 `5000 / 5050 / 4768`。可通过对应环境变量或 `.env` 修改。

**Q：3306 已被其他项目占用，会冲突吗？**
不会。Docker 中 MySQL 对外只用 `4768`，容器内的 `3306` 与宿主机隔离；本地开发则直接连接宿主机现有的 `3306`。

**Q：前端构建后接口请求到了 localhost？**
前端默认使用相对路径（同源），由 Nginx 反代。若需直连独立域名，构建时设置 `VITE_API_BASE_URL`。

**Q：后台上传的图片重启后丢失？**
Docker 部署已把 `server/public/images` 挂载到宿主机；请确认该目录存在且可写。

**Q：塔罗每日运势如何重新抽？**
在占卜页底部点击「重置今日运势」，或在塔罗首页的今日运势卡片点击「重置」。数据保存在浏览器 localStorage（`tarot_daily`、`tarot_history`），换设备/清缓存会重新开始。

**Q：多人游戏需要额外配置吗？**
不需要。房间号由服务端生成，Socket.io 与页面同源；生产环境确保 Nginx 已转发 `/socket.io/` 的 WebSocket 升级（仓库内配置已包含）。

---

## 说明

- 游戏对局状态保存在服务端内存中，服务重启后房间会被清空；攻略、分类、FAQ 等内容存储在 MySQL。
- 塔罗占卜与每日运势完全在浏览器本地运行，不产生后端请求。
