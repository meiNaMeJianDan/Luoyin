# 桌游攻略 & 在线桌游平台

一个面向桌游爱好者的综合平台，包含图文攻略网站、后台管理系统，以及 **5 款在线联机桌游** 和 **塔罗占卜** 功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS 4 + shadcn/ui |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | SQLite（better-sqlite3） |
| 实时通信 | Socket.io（WebSocket） |
| 数据请求 | @tanstack/react-query |
| 表单校验 | react-hook-form + zod |
| 拖拽排序 | @dnd-kit |
| 测试 | Vitest + fast-check（属性测试） |

## 功能概览

### 🎲 在线联机桌游（5 款）

所有联机游戏共享统一架构：纯函数引擎 + 房间管理 + Socket.io 实时同步 + AI 托管。

| 游戏 | 路由 | 人数 | 核心特性 |
|------|------|------|----------|
| **UNO** | `/uno` | 2-4 人 | 108 张标准牌组、功能牌效果、Wild+4 质疑、UNO 喊牌举报 |
| **卡坦岛** | `/catan` | 2-4 人 | 六角地图（轴坐标系）、资源采集、建造、交易、发展卡、最长路/最大军队 |
| **德国心脏病** | `/halli` | 2-6 人 | 水果牌翻牌、抢铃铛、实时反应竞速 |
| **你画我猜** | `/draw` | 2-8 人 | Canvas 实时画板、200+ 中文词库、猜词聊天、提示揭露 |
| **璀璨宝石** | `/splendor` | 2-4 人 | 90 张发展卡 + 10 位贵族、宝石经济系统、购买/保留/拿取策略 |

### 🔮 塔罗占卜

纯前端功能，无需后端。78 张完整塔罗牌（22 大阿卡纳 + 56 小阿卡纳），支持三种牌阵：

| 牌阵 | 路由 | 说明 |
|------|------|------|
| 每日运势 | `/tarot/reading/single` | 单张牌，快速占卜 |
| 三张牌阵 | `/tarot/reading/three` | 过去、现在、未来 |
| 凯尔特十字 | `/tarot/reading/celtic` | 10 张牌深度解读 |

支持正逆位、3D 翻牌动画、详细解读、历史记录（localStorage）。

### 📖 桌游攻略网站

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 热门桌游推荐、分类快速入口 |
| `/categories` | 分类浏览 | 按类型、人数、时长筛选，支持搜索 |
| `/game-detail/:id` | 游戏详情 | 攻略内容：简介、玩法步骤、获胜条件、新手提示 |
| `/trending` | 热门排行 | 按热度排名的桌游榜单 |
| `/beginners` | 新手指南 | 桌游基础流程和 FAQ |
| `/about` | 关于 | 关于页面 |

### 🛠️ 管理后台

访问 `/admin`，提供游戏管理、详情编辑、分类选项、快速链接、FAQ、新手指南的可视化管理，支持拖拽排序。

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

### 1. 安装依赖

```bash
# 前端
pnpm install

# 后端
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

### 3. 启动服务

```bash
# 终端 1：后端（默认端口 3001）
cd server
pnpm run dev

# 终端 2：前端（默认端口 5173）
pnpm run dev
```

启动后访问：
- 用户端：http://localhost:5173
- 管理后台：http://localhost:5173/admin
- UNO：http://localhost:5173/uno
- 卡坦岛：http://localhost:5173/catan
- 德国心脏病：http://localhost:5173/halli
- 你画我猜：http://localhost:5173/draw
- 璀璨宝石：http://localhost:5173/splendor
- 塔罗占卜：http://localhost:5173/tarot

## 项目结构

```
project-root/
├── src/                          # 前端源码
│   ├── api/                      # API 客户端
│   ├── components/               # 通用组件（Layout、Header、Footer、shadcn/ui）
│   ├── pages/
│   │   ├── admin/                # 管理后台页面
│   │   ├── uno/                  # UNO 联机
│   │   │   ├── context/          #   GameContext（Socket 连接管理）
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   CardView、HandCards、ColorPicker 等
│   │   ├── catan/                # 卡坦岛
│   │   │   ├── context/          #   CatanGameContext
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   HexMap、HexTile、Vertex、Edge、TradeDialog 等
│   │   ├── halli/                # 德国心脏病
│   │   │   ├── context/          #   HalliGameContext
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   BellButton、FruitCard、GameBoard 等
│   │   ├── draw/                 # 你画我猜
│   │   │   ├── context/          #   DrawGameContext
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   CanvasBoard、DrawToolbar、ChatPanel 等
│   │   ├── splendor/             # 璀璨宝石
│   │   │   ├── context/          #   SplendorGameContext
│   │   │   ├── hooks/            #   useSocket、useGame
│   │   │   └── components/       #   DevelopmentCard、GemPool、NobleCard 等
│   │   ├── tarot/                # 塔罗占卜（纯前端）
│   │   │   ├── data.ts           #   78 张牌数据
│   │   │   ├── components/       #   TarotCard、SpreadLayout
│   │   │   ├── Reading.tsx       #   占卜页面
│   │   │   └── History.tsx       #   历史记录
│   │   └── ...                   # 攻略网站页面（Home、Categories 等）
│   └── App.tsx                   # 路由配置
│
├── server/                       # 后端源码
│   ├── src/
│   │   ├── index.ts              # 服务入口（Express + Socket.io）
│   │   ├── db.ts                 # SQLite 数据库连接
│   │   ├── seed.ts               # 种子数据
│   │   ├── routes/               # REST API 路由
│   │   │   └── admin/            # 管理接口
│   │   ├── middleware/           # 错误处理、校验中间件
│   │   ├── uno/                  # UNO 后端模块
│   │   │   ├── types.ts          #   类型定义
│   │   │   ├── engine.ts         #   游戏引擎（纯函数）
│   │   │   ├── room.ts           #   房间管理
│   │   │   ├── socket.ts         #   WebSocket 事件（创建唯一 io 实例）
│   │   │   ├── timer.ts          #   回合计时器
│   │   │   └── ai.ts             #   AI 策略
│   │   ├── catan/                # 卡坦岛后端模块
│   │   │   ├── types.ts
│   │   │   ├── engine.ts         #   游戏引擎
│   │   │   ├── map.ts            #   地图生成（轴坐标系）
│   │   │   ├── room.ts
│   │   │   ├── socket.ts         #   共享 io 实例，catan: 前缀
│   │   │   ├── timer.ts
│   │   │   ├── ai.ts
│   │   │   └── __tests__/        #   引擎和地图测试
│   │   ├── halli/                # 德国心脏病后端模块
│   │   │   ├── types.ts
│   │   │   ├── engine.ts
│   │   │   ├── room.ts
│   │   │   ├── socket.ts         #   共享 io 实例，halli: 前缀
│   │   │   ├── timer.ts
│   │   │   └── ai.ts
│   │   ├── draw/                 # 你画我猜后端模块
│   │   │   ├── types.ts
│   │   │   ├── engine.ts
│   │   │   ├── words.ts          #   200+ 中文词库
│   │   │   ├── room.ts
│   │   │   ├── socket.ts         #   共享 io 实例，draw: 前缀
│   │   │   ├── timer.ts
│   │   │   └── __tests__/
│   │   └── splendor/             # 璀璨宝石后端模块
│   │       ├── types.ts
│   │       ├── cards.ts          #   90 张发展卡 + 10 位贵族数据
│   │       ├── engine.ts         #   游戏引擎（16 个纯函数）
│   │       ├── room.ts
│   │       ├── socket.ts         #   共享 io 实例，splendor: 前缀
│   │       ├── timer.ts
│   │       ├── ai.ts
│   │       └── __tests__/        #   引擎和卡牌测试
│   └── public/images/            # 游戏图片资源
└── ...
```

## 架构设计

### 统一的游戏模块架构

所有 5 款联机游戏遵循相同的分层架构：

```
┌─────────────────────────────────────────────┐
│  前端：Context → useSocket → useGame → UI   │
├─────────────────────────────────────────────┤
│  Socket.io（WebSocket 实时通信）             │
├─────────────────────────────────────────────┤
│  后端：socket.ts → room.ts → engine.ts      │
│        timer.ts    ai.ts                     │
└─────────────────────────────────────────────┘
```

- **engine.ts**：纯函数游戏引擎，不依赖任何外部状态，便于单元测试
- **room.ts**：房间生命周期管理（创建、加入、离开、断线重连）
- **socket.ts**：WebSocket 事件处理，连接前端和引擎
- **timer.ts**：回合超时管理
- **ai.ts**：AI 托管策略

### Socket.io 架构

所有游戏共享单一 `SocketIOServer` 实例（由 UNO 模块创建），通过事件名前缀隔离：

| 游戏 | 事件前缀 | 示例 |
|------|----------|------|
| UNO | 无前缀 | `create_room`、`play_card` |
| 卡坦岛 | `catan:` | `catan:create_room`、`catan:build` |
| 德国心脏病 | `halli:` | `halli:create_room`、`halli:slap_bell` |
| 你画我猜 | `draw:` | `draw:create_room`、`draw:draw_line` |
| 璀璨宝石 | `splendor:` | `splendor:create_room`、`splendor:buy_card` |

### 前端 Hooks 模式

每个游戏模块遵循统一的 Hook 模式：

- **GameContext**：通过 React Context + Outlet 共享 Socket 连接，避免页面切换时重建连接
- **useSocket**：管理 Socket.io 连接生命周期，返回 `socketRef`
- **useGame**：封装游戏逻辑和状态管理，使用 `stateRef` + `navigateRef` 避免 useEffect 依赖问题

### 服务端权威 + 状态脱敏

所有游戏逻辑在服务端执行，客户端仅发送操作指令。服务端在广播状态时对每位玩家进行脱敏处理（如隐藏其他玩家手牌），防止作弊。

## 项目亮点

1. **统一架构**：5 款游戏共享相同的模块结构和设计模式，代码一致性高
2. **纯函数引擎**：游戏核心逻辑为纯函数，无副作用，易于测试和推理
3. **服务端权威**：所有游戏状态由服务端管理，客户端无法篡改
4. **卡坦岛地图系统**：基于轴坐标系（Axial Coordinates）的六角网格，支持顶点/边编码和邻接关系计算
5. **Canvas 实时同步**：你画我猜使用百分比坐标系，确保不同分辨率下画面一致
6. **断线重连**：所有游戏支持断线后重新加入，AI 自动托管
7. **属性测试**：使用 fast-check 进行属性测试，验证引擎的正确性

## 技术难点

1. **卡坦岛拓扑关系**：六角网格的顶点、边邻接关系计算，使用预计算缓存优化性能
2. **实时一致性**：多人游戏中 Socket.io 事件的顺序保证和状态同步
3. **React + Socket 生命周期**：使用 Ref 模式避免闭包陷阱和重复事件监听
4. **Wild+4 质疑机制**：UNO 中需要回溯上一手牌判断是否合法出牌
5. **宝石经济系统**：璀璨宝石中 Bonus + 黄金的复合支付计算

## 后端 API

后端运行在 `http://localhost:3001`，端口可通过环境变量 `PORT` 覆盖。

### 只读接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/games` | 所有游戏列表 |
| GET | `/api/games/trending` | 热门游戏 |
| GET | `/api/games/ranked` | 排行榜 |
| GET | `/api/games/:id` | 指定游戏 |
| GET | `/api/games/:id/details` | 游戏详情 |
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
| POST | `/api/admin/upload` | 图片上传（≤5MB） |
| GET | `/api/admin/stats` | 仪表盘统计 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端服务端口 |
| `CORS_ORIGIN` | `*` | CORS 允许的来源 |

## 构建部署

```bash
# 构建前端
pnpm run build

# 构建后端
cd server
pnpm run build
pnpm run start
```
