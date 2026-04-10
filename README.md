# 桌游攻略网站

一个面向桌游新手的图文攻略平台，提供游戏浏览、分类筛选、详情攻略、热门排行和新手指南等功能，并配备完整的后台管理系统。同时集成了在线 UNO 联机游戏模块，支持 2～4 人实时对战。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| 后端 | Node.js + Express.js + TypeScript |
| 数据库 | SQLite（better-sqlite3） |
| 实时通信 | Socket.io（服务端） + socket.io-client（客户端） |
| 数据请求 | @tanstack/react-query |
| 表单校验 | react-hook-form + zod |
| 拖拽排序 | @dnd-kit |

## 项目结构

```
project-root/
├── src/                    # 前端源码
│   ├── api/                # API 客户端（client.ts + adminClient.ts）
│   ├── hooks/              # React Query Hooks
│   ├── pages/              # 页面组件
│   │   ├── admin/          # 后台管理页面
│   │   ├── uno/            # UNO 在线联机页面
│   │   └── ...             # 用户端页面
│   └── components/         # 通用组件
├── server/                 # 后端源码
│   ├── src/
│   │   ├── routes/         # 只读 API 路由
│   │   │   └── admin/      # 管理 API 路由
│   │   ├── uno/            # UNO 游戏后端模块（引擎、房间、AI、WebSocket）
│   │   ├── middleware/     # 中间件（错误处理、校验）
│   │   ├── db.ts           # 数据库连接
│   │   ├── seed.ts         # 种子数据脚本
│   │   └── index.ts        # 服务入口（集成 Socket.io）
│   └── public/images/      # 游戏图片资源
└── ...
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

### 1. 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd server
pnpm install
cd ..
```

### 2. 初始化数据库

```bash
cd server
pnpm run seed
cd ..
```

执行后会在 `server/` 目录下生成 `data.db` 文件，包含 8 款桌游数据、3 条游戏详情、分类选项、FAQ 和新手指南等初始数据。

### 3. 启动服务

需要同时启动后端和前端两个服务：

```bash
# 终端 1：启动后端（默认端口 3001）
cd server
pnpm run dev

# 终端 2：启动前端（默认端口 5173）
pnpm run dev
```

启动后访问：
- 用户端：http://localhost:5173
- 管理后台：http://localhost:5173/admin

## 用户端

用户端是面向桌游玩家的展示网站，所有数据通过 API 从后端获取。

### 页面说明

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 热门桌游推荐、分类快速入口 |
| `/categories` | 分类浏览 | 按类型、人数、时长筛选游戏，支持搜索 |
| `/game-detail/:id` | 游戏详情 | 游戏攻略，包含简介、玩法步骤、获胜条件、新手提示 |
| `/trending` | 热门排行 | 按热度排名的桌游榜单 |
| `/beginners` | 新手指南 | 桌游基础流程和常见问题 FAQ |
| `/about` | 关于 | 关于页面 |
| `/uno` | UNO 联机 | 在线 UNO 游戏入口（详见 UNO 在线联机章节） |

## 管理后台

管理后台提供对网站所有内容数据的可视化管理，访问 `/admin` 进入。

### 功能模块

| 路径 | 模块 | 说明 |
|------|------|------|
| `/admin` | 仪表盘 | 各数据表记录数统计概览 |
| `/admin/games` | 游戏管理 | 游戏列表的增删改，支持图片上传 |
| `/admin/games/:id/details` | 游戏详情管理 | 编辑游戏攻略内容（获胜条件、玩法步骤、提示等动态列表） |
| `/admin/category-options` | 分类选项管理 | 编辑游戏类型、玩家人数、游戏时长的筛选选项 |
| `/admin/quick-links` | 快速链接管理 | 首页分类快速入口的增删改 |
| `/admin/faqs` | 常见问题管理 | FAQ 的增删改，支持拖拽排序 |
| `/admin/guide-steps` | 新手指南管理 | 指南步骤的增删改，支持拖拽排序 |

## 后端 API

后端运行在 `http://localhost:3001`，端口可通过环境变量 `PORT` 覆盖。

### 只读接口（用户端使用）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/games` | 所有游戏列表 |
| GET | `/api/games/trending` | 热门游戏 |
| GET | `/api/games/ranked` | 排行榜游戏（按 rank 升序） |
| GET | `/api/games/:id` | 指定游戏 |
| GET | `/api/games/:id/details` | 游戏详情 |
| GET | `/api/categories/options` | 分类筛选选项 |
| GET | `/api/categories/quick-links` | 分类快速链接 |
| GET | `/api/guide/faqs` | 常见问题列表 |
| GET | `/api/guide/steps` | 新手指南步骤 |

### 管理接口（后台使用）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/games` | 创建游戏 |
| PUT | `/api/admin/games/:id` | 更新游戏 |
| DELETE | `/api/admin/games/:id` | 删除游戏（级联删除详情） |
| POST | `/api/admin/games/:id/details` | 创建游戏详情 |
| PUT | `/api/admin/games/:id/details` | 更新游戏详情 |
| DELETE | `/api/admin/games/:id/details` | 删除游戏详情 |
| PUT | `/api/admin/categories/options` | 更新分类选项 |
| POST | `/api/admin/categories/quick-links` | 创建快速链接 |
| PUT | `/api/admin/categories/quick-links/:id` | 更新快速链接 |
| DELETE | `/api/admin/categories/quick-links/:id` | 删除快速链接 |
| POST | `/api/admin/guide/faqs` | 创建 FAQ |
| PUT | `/api/admin/guide/faqs/:id` | 更新 FAQ |
| DELETE | `/api/admin/guide/faqs/:id` | 删除 FAQ |
| PUT | `/api/admin/guide/faqs/reorder` | FAQ 排序 |
| POST | `/api/admin/guide/steps` | 创建指南步骤 |
| PUT | `/api/admin/guide/steps/:id` | 更新指南步骤 |
| DELETE | `/api/admin/guide/steps/:id` | 删除指南步骤 |
| PUT | `/api/admin/guide/steps/reorder` | 指南步骤排序 |
| POST | `/api/admin/upload` | 上传图片（JPEG/PNG/WebP，≤5MB） |
| GET | `/api/admin/stats` | 仪表盘统计数据 |

### 响应格式

```json
// 成功
{ "data": { ... } }

// 错误
{ "error": "错误描述" }
```

## UNO 在线联机

在桌游攻略网站基础上新增的在线 UNO 联机游戏模块。玩家无需登录，通过 6 位数字房间号即可创建或加入房间，支持 2～4 人实时对战。

### 核心特性

- 基于官方 UNO 规则的完整游戏引擎（108 张标准牌组）
- 房间系统：创建/加入房间、准备、房主开始游戏
- 功能牌效果：Skip、Reverse、Draw+2、Wild、Wild+4
- Wild+4 质疑机制
- UNO 喊牌与举报机制
- 回合超时处理（出牌 30 秒、选色 15 秒、质疑 10 秒）
- 断线重连与 AI 托管补位
- AI 人机玩家（房主可添加/移除）
- WebSocket（Socket.io）实时状态同步

### 新增技术依赖

| 层级 | 技术 |
|------|------|
| 实时通信（后端） | Socket.io ^4.8.3 |
| 实时通信（前端） | socket.io-client ^4.8.3 |

### UNO 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/uno` | 游戏首页 | 创建房间、加入房间入口 |
| `/uno/room/:roomId` | 房间页 | 玩家列表、准备状态、开始游戏 |
| `/uno/game/:roomId` | 游戏页 | 出牌、摸牌、喊 UNO、质疑等游戏操作 |
| `/uno/result/:roomId` | 结算页 | 胜利者展示、排名、再来一局 |

### WebSocket 事件协议

Socket.io 与 HTTP 服务共享同一端口（默认 3001）。

#### 客户端 → 服务端

| 事件 | 参数 | 说明 |
|------|------|------|
| `create_room` | `{ playerName }` | 创建房间 |
| `join_room` | `{ roomId, playerName }` | 加入房间 |
| `leave_room` | `{ roomId }` | 离开房间 |
| `player_ready` | `{ roomId }` | 切换准备状态 |
| `start_game` | `{ roomId }` | 开始游戏（仅房主） |
| `play_card` | `{ roomId, cardId, chosenColor? }` | 出牌 |
| `draw_card` | `{ roomId }` | 摸牌 |
| `call_uno` | `{ roomId }` | 喊 UNO |
| `report_uno` | `{ roomId, targetPlayerId }` | 举报未喊 UNO |
| `choose_color` | `{ roomId, color }` | 选择颜色（Wild 牌） |
| `challenge_wild4` | `{ roomId }` | 质疑 Wild+4 |
| `accept_wild4` | `{ roomId }` | 接受 Wild+4 |
| `toggle_ai` | `{ roomId }` | 切换 AI 托管开关（仅房主） |
| `add_ai` | `{ roomId }` | 添加人机玩家（仅房主） |
| `remove_ai` | `{ roomId }` | 移除人机玩家（仅房主） |
| `reconnect_game` | `{ roomId, playerId }` | 断线重连 |

#### 服务端 → 客户端

| 事件 | 说明 |
|------|------|
| `room_created` | 房间创建成功，返回 roomId 和 playerId |
| `room_joined` | 加入房间成功 |
| `room_updated` | 房间状态更新（玩家列表、准备状态等） |
| `game_started` | 游戏开始，返回初始游戏状态 |
| `game_state` | 游戏状态同步（每位玩家仅可见自己的手牌） |
| `card_played` | 出牌通知 |
| `card_drawn` | 摸牌通知 |
| `uno_called` | UNO 喊牌通知 |
| `uno_reported` | 举报结果 |
| `color_chosen` | 颜色选择结果 |
| `challenge_result` | 质疑结果 |
| `game_over` | 游戏结束，包含胜利者和所有玩家信息 |
| `player_disconnected` | 玩家断线通知 |
| `player_reconnected` | 玩家重连通知 |
| `error` | 错误通知 |

### UNO 项目结构

```
server/src/uno/           # UNO 后端模块
├── types.ts              # 数据类型定义（Card、Player、Room、GameState 等）
├── engine.ts             # 游戏核心引擎（发牌、出牌、功能牌效果、胜利判定）
├── room.ts               # 房间管理（创建、加入、离开、断线重连）
├── ai.ts                 # AI 出牌策略
├── timer.ts              # 回合计时器管理
└── socket.ts             # WebSocket 事件处理层

src/pages/uno/            # UNO 前端页面
├── index.tsx             # 游戏首页（创建/加入房间）
├── Room.tsx              # 房间页
├── Game.tsx              # 游戏页
├── Result.tsx            # 结算页
├── context/
│   └── GameContext.tsx    # 游戏全局状态（Socket 连接管理）
├── hooks/
│   ├── useSocket.ts      # Socket.io 连接 Hook
│   └── useGame.ts        # 游戏逻辑 Hook
└── components/
    ├── CardView.tsx       # 单张牌渲染
    ├── HandCards.tsx       # 手牌区域
    ├── DiscardPile.tsx    # 弃牌堆
    ├── DrawPile.tsx       # 摸牌堆
    ├── PlayerInfo.tsx     # 玩家信息
    ├── ColorPicker.tsx    # 颜色选择弹窗
    ├── ChallengeDialog.tsx # 质疑决策弹窗
    ├── UnoButton.tsx      # UNO 喊牌按钮
    ├── DirectionIndicator.tsx # 出牌方向指示
    └── GameMessages.tsx   # 实时消息提示
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端服务端口 |
| `VITE_API_BASE_URL` | `http://localhost:3001` | 前端 API 基础地址 |

## 构建部署

```bash
# 构建前端
pnpm run build

# 构建后端
cd server
pnpm run build
pnpm run start
```
