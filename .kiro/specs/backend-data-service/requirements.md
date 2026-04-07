# 需求文档

## 简介

本项目旨在为现有的桌游攻略 React 前端应用添加 Node.js 后端服务层和本地数据库。当前前端通过 `src/constant/` 目录下的静态常量文件直接导入游戏数据（包括游戏列表、游戏详情、分类选项、新手指南等）。本次改造将这些静态数据迁移到本地数据库中，通过 Node.js 服务层提供 RESTful API 接口，前端改为通过 HTTP 请求获取数据，实现前后端分离架构。

## 术语表

- **API_Server**: Node.js 后端服务，负责处理 HTTP 请求并从数据库读取数据返回给前端
- **Database**: 本地数据库，用于持久化存储原先在前端常量文件中定义的所有游戏相关数据
- **Frontend**: 基于 React + Vite + TypeScript 的前端应用
- **Game**: 桌游基础信息实体，包含 id、标题、类型、玩家人数、时长、难度、标签等字段
- **GameDetail**: 桌游详细规则信息实体，包含简介、目标、获胜条件、玩法步骤、新手提示等字段
- **CategoryOption**: 分类筛选选项，包括游戏类型、玩家人数、游戏时长
- **BeginnerGuide**: 新手指南数据，包括常见问题(FAQ)和基础流程步骤
- **API_Client**: 前端中负责发起 HTTP 请求并处理响应的服务模块

## 需求

### 需求 1：数据库设计与数据迁移

**用户故事：** 作为开发者，我希望将前端静态常量数据迁移到本地数据库中，以便实现数据的集中管理和持久化存储。

#### 验收标准

1. THE Database SHALL 存储所有 Game 实体数据，包含以下字段：id（数字）、title（字符串）、type（字符串）、players（字符串）、time（字符串）、image（字符串路径）、difficulty（字符串）、tags（字符串数组）、isHot（布尔值）、rank（可选数字）、comment（可选字符串）、isTrending（布尔值）
2. THE Database SHALL 存储所有 GameDetail 实体数据，包含以下字段：gameId（关联 Game 的 id）、introduction（字符串）、objective（字符串）、victoryConditions（包含 text 和 image 字段的数组）、gameplaySteps（包含 title、desc、image 字段的数组）、tips（字符串数组）
3. THE Database SHALL 存储 CategoryOption 数据，包括游戏类型列表（GAME_TYPES）、玩家人数选项（PLAYER_COUNTS）、游戏时长选项（GAME_DURATIONS）
4. THE Database SHALL 存储 BeginnerGuide 数据，包括常见问题列表（BEGINNER_FAQS）、基础流程步骤（GAME_GUIDE_STEPS）、分类快速链接（CATEGORIES_QUICK_LINKS）
5. THE Database SHALL 包含初始化种子脚本，将 `src/constant/` 目录下所有现有数据完整迁移到数据库中
6. WHEN 种子脚本执行完成后，THE Database SHALL 包含与当前前端常量文件完全一致的 8 条 Game 记录和 3 条 GameDetail 记录（id 为 1、2、6 的游戏）

### 需求 2：Node.js 后端服务搭建

**用户故事：** 作为开发者，我希望搭建一个 Node.js 后端服务，以便为前端提供统一的数据访问接口。

#### 验收标准

1. THE API_Server SHALL 使用 Node.js 运行时环境，并提供 RESTful 风格的 HTTP 接口
2. THE API_Server SHALL 监听可配置的端口号，默认为 3001
3. THE API_Server SHALL 支持 CORS 跨域请求，允许前端开发服务器（默认 localhost:5173）访问
4. THE API_Server SHALL 在启动时自动连接 Database，连接成功后开始接受请求
5. IF API_Server 无法连接 Database，THEN THE API_Server SHALL 输出错误日志并以非零退出码终止进程

### 需求 3：游戏数据 API 接口

**用户故事：** 作为前端开发者，我希望通过 API 接口获取游戏列表和详情数据，以便替代直接导入常量文件的方式。

#### 验收标准

1. WHEN 前端请求 `GET /api/games` 时，THE API_Server SHALL 返回所有 Game 实体的完整列表，数据格式为 JSON 数组
2. WHEN 前端请求 `GET /api/games/:id` 时，THE API_Server SHALL 返回指定 id 的 Game 实体数据
3. IF 请求的 Game id 不存在，THEN THE API_Server SHALL 返回 HTTP 404 状态码和包含错误描述的 JSON 响应体
4. WHEN 前端请求 `GET /api/games/:id/details` 时，THE API_Server SHALL 返回指定游戏的 GameDetail 数据
5. IF 请求的 GameDetail 不存在，THEN THE API_Server SHALL 返回 HTTP 404 状态码和包含错误描述的 JSON 响应体
6. WHEN 前端请求 `GET /api/games/trending` 时，THE API_Server SHALL 返回所有 isTrending 为 true 的 Game 列表
7. WHEN 前端请求 `GET /api/games/ranked` 时，THE API_Server SHALL 返回所有具有 rank 字段的 Game 列表，按 rank 升序排列


### 需求 4：筛选选项与新手指南 API 接口

**用户故事：** 作为前端开发者，我希望通过 API 接口获取分类筛选选项和新手指南数据，以便前端页面动态加载这些配置信息。

#### 验收标准

1. WHEN 前端请求 `GET /api/categories/options` 时，THE API_Server SHALL 返回包含游戏类型（types）、玩家人数选项（playerCounts）、游戏时长选项（durations）的 JSON 对象
2. WHEN 前端请求 `GET /api/categories/quick-links` 时，THE API_Server SHALL 返回分类快速链接列表，每项包含 name、icon、color、link 字段
3. WHEN 前端请求 `GET /api/guide/faqs` 时，THE API_Server SHALL 返回新手常见问题列表，每项包含 q（问题）和 a（回答）字段
4. WHEN 前端请求 `GET /api/guide/steps` 时，THE API_Server SHALL 返回桌游基础流程步骤列表，每项包含 step 和 desc 字段

### 需求 5：API 响应格式与错误处理

**用户故事：** 作为前端开发者，我希望 API 返回统一格式的响应，以便前端能够一致地处理成功和错误情况。

#### 验收标准

1. THE API_Server SHALL 对所有成功响应返回 HTTP 200 状态码，响应体为 JSON 格式，包含 `data` 字段承载业务数据
2. THE API_Server SHALL 对所有错误响应返回适当的 HTTP 状态码（400、404、500），响应体为 JSON 格式，包含 `error` 字段承载错误描述信息
3. IF API_Server 在处理请求时发生未预期的异常，THEN THE API_Server SHALL 返回 HTTP 500 状态码，响应体包含通用错误信息，且不暴露内部实现细节
4. THE API_Server SHALL 在所有响应中设置 `Content-Type: application/json` 头部

### 需求 6：前端 API 客户端层

**用户故事：** 作为前端开发者，我希望有一个统一的 API 客户端模块，以便前端各页面通过该模块调用后端接口获取数据。

#### 验收标准

1. THE API_Client SHALL 提供与当前常量导出一一对应的异步函数，包括：获取所有游戏、获取热门游戏、获取排行榜游戏、获取游戏详情、获取分类选项、获取快速链接、获取新手 FAQ、获取新手流程步骤
2. THE API_Client SHALL 将后端 API 的基础 URL 配置为可通过环境变量覆盖的值
3. IF API 请求失败（网络错误或非 2xx 响应），THEN THE API_Client SHALL 抛出包含错误描述的异常
4. THE API_Client SHALL 从响应体的 `data` 字段中提取业务数据并返回给调用方

### 需求 7：前端页面改造

**用户故事：** 作为前端开发者，我希望将各页面从直接导入常量文件改为通过 API 获取数据，以便实现前后端分离。

#### 验收标准

1. WHEN Home 页面加载时，THE Frontend SHALL 通过 API_Client 获取热门游戏列表（TRENDING_GAMES）和分类快速链接（CATEGORIES_QUICK_LINKS），替代从 `@/constant` 的直接导入
2. WHEN Categories 页面加载时，THE Frontend SHALL 通过 API_Client 获取所有游戏列表（MERGED_GAMES）和分类筛选选项（GAME_TYPES、PLAYER_COUNTS、GAME_DURATIONS），替代从 `@/constant` 的直接导入
3. WHEN GameDetail 页面加载时，THE Frontend SHALL 通过 API_Client 根据 URL 参数中的游戏 id 获取对应的 Game 数据和 GameDetail 数据，替代从 `@/constant` 的直接导入
4. WHEN Trending 页面加载时，THE Frontend SHALL 通过 API_Client 获取排行榜游戏列表（RANKED_GAMES），替代从 `@/constant` 的直接导入
5. WHEN BeginnersGuide 页面加载时，THE Frontend SHALL 通过 API_Client 获取新手 FAQ（BEGINNER_FAQS）和基础流程步骤（GAME_GUIDE_STEPS），替代从 `@/constant` 的直接导入
6. WHILE 数据正在加载中，THE Frontend SHALL 显示加载状态指示器，避免页面出现空白或闪烁
7. IF API 请求失败，THEN THE Frontend SHALL 显示用户友好的错误提示信息

### 需求 8：图片资源处理

**用户故事：** 作为开发者，我希望妥善处理游戏图片资源的引用方式，以便在前后端分离架构下图片能正常显示。

#### 验收标准

1. THE API_Server SHALL 提供静态文件服务，使前端能够通过 HTTP URL 访问游戏图片资源
2. THE Database SHALL 存储图片的相对路径或 URL，而非 Vite 模块导入引用
3. WHEN 前端通过 API 获取到图片路径时，THE Frontend SHALL 能够正确渲染图片，图片显示效果与改造前保持一致
4. THE API_Server SHALL 将原 `src/assets/` 目录下的图片资源复制到后端可访问的静态资源目录中
