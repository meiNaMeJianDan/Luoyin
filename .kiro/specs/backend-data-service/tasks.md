# 实现计划：后端数据服务

## 概述

将桌游攻略网站从纯前端静态数据架构改造为前后端分离架构。核心工作包括：搭建 Express.js 后端服务、创建 SQLite 数据库与种子数据、实现 RESTful API、创建前端 API 客户端与 React Query Hooks、改造前端页面从 API 获取数据。

## 任务

- [x] 1. 搭建后端项目结构与基础配置
  - [x] 1.1 初始化 server/ 目录，创建 package.json 和 tsconfig.json
    - 在项目根目录下创建 `server/` 目录
    - 创建 `server/package.json`，添加 express、better-sqlite3、cors、typescript 等依赖
    - 创建 `server/tsconfig.json`，配置 TypeScript 编译选项
    - 添加 `dev` 和 `build` 脚本
    - _需求: 2.1_

  - [x] 1.2 创建共享类型定义文件 `server/src/types.ts`
    - 定义 Game、GameDetail、VictoryCondition、GameplayStep、CategoryOptions、QuickLink、FAQ、GuideStep 接口
    - 定义 SuccessResponse<T> 和 ErrorResponse 接口
    - _需求: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2_

  - [x] 1.3 创建数据库连接模块 `server/src/db.ts`
    - 使用 better-sqlite3 创建数据库连接
    - 实现数据库初始化函数，创建所有表（games、game_details、category_options、quick_links、faqs、guide_steps）
    - 连接失败时输出错误日志并 process.exit(1)
    - _需求: 1.1, 1.2, 1.3, 1.4, 2.4, 2.5_

  - [x] 1.4 创建 Express 服务入口文件 `server/src/index.ts`
    - 配置 Express 应用，启用 JSON 解析
    - 配置 CORS 中间件，允许 localhost:5173 访问
    - 配置静态文件服务 `/images` 路径
    - 监听可配置端口（默认 3001）
    - 启动时连接数据库
    - _需求: 2.1, 2.2, 2.3, 2.4, 8.1, 8.4_

- [x] 2. 实现数据库 Schema 与种子数据
  - [x] 2.1 复制图片资源到 `server/public/images/` 目录
    - 将 `src/assets/` 下的所有游戏图片复制到 `server/public/images/`
    - 保持子目录结构（如 `catan/` 子目录）
    - _需求: 8.2, 8.4_

  - [x] 2.2 创建种子数据脚本 `server/src/seed.ts`
    - 从 `src/constant/` 中提取所有静态数据，转换为 SQL INSERT 语句
    - 插入 8 条 Game 记录，图片路径使用 `/images/xxx.png` 格式
    - 插入 3 条 GameDetail 记录（id 为 1、2、6 的游戏）
    - 插入 CategoryOption 数据（GAME_TYPES、PLAYER_COUNTS、GAME_DURATIONS）
    - 插入 QuickLink 数据（CATEGORIES_QUICK_LINKS）
    - 插入 FAQ 数据（BEGINNER_FAQS）
    - 插入 GuideStep 数据（GAME_GUIDE_STEPS）
    - JSON 数组字段使用 JSON.stringify() 序列化存储
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 2.3 编写属性测试：数据存储 round-trip
    - **Property 1: 数据存储 round-trip**
    - 验证任意有效数据实体写入 SQLite 后查询出来与原始对象语义等价
    - 特别验证 JSON 数组字段（tags、victoryConditions、gameplaySteps、tips）的序列化/反序列化一致性
    - **验证: 需求 1.1, 1.2, 1.3, 1.4**

  - [ ]* 2.4 编写单元测试：种子脚本验证
    - 执行种子脚本后验证 8 条 Game 记录和 3 条 GameDetail 记录
    - 验证 CategoryOption、QuickLink、FAQ、GuideStep 数据完整性
    - **验证: 需求 1.5, 1.6**

- [x] 3. 检查点 - 确保后端基础设施就绪
  - 确保所有测试通过，如有问题请与用户讨论。

- [x] 4. 实现游戏数据 API 路由
  - [x] 4.1 创建统一错误处理中间件 `server/src/middleware/errorHandler.ts`
    - 实现 Express 错误处理中间件，捕获所有未处理异常
    - 返回 HTTP 500，响应体 `{ error: "服务器内部错误" }`，不暴露堆栈信息
    - 实现未匹配路由处理，返回 HTTP 404，`{ error: "接口不存在" }`
    - _需求: 5.2, 5.3, 5.4_

  - [x] 4.2 创建游戏路由 `server/src/routes/games.ts`
    - 实现 `GET /api/games` 返回所有游戏列表
    - 实现 `GET /api/games/trending` 返回 isTrending 为 true 的游戏（必须在 `:id` 路由之前注册）
    - 实现 `GET /api/games/ranked` 返回有 rank 的游戏，按 rank 升序排列（必须在 `:id` 路由之前注册）
    - 实现 `GET /api/games/:id` 返回指定游戏，id 非数字返回 400，不存在返回 404
    - 实现 `GET /api/games/:id/details` 返回游戏详情，不存在返回 404
    - 实现 rowToGame 数据库行到 TypeScript 对象的映射函数
    - 所有成功响应使用 `{ data: ... }` 格式
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2_

  - [ ]* 4.3 编写属性测试：GET /api/games 返回完整列表
    - **Property 2: GET /api/games 返回完整列表**
    - 验证返回列表长度等于数据库中 games 表总记录数
    - **验证: 需求 3.1**

  - [ ]* 4.4 编写属性测试：按 ID 查询返回正确数据
    - **Property 3: 按 ID 查询返回正确数据**
    - 验证 GET /api/games/:id 和 GET /api/games/:id/details 返回与数据库对应记录一致的数据
    - **验证: 需求 3.2, 3.4**

  - [ ]* 4.5 编写属性测试：trending 过滤正确性
    - **Property 4: trending 过滤正确性**
    - 验证 GET /api/games/trending 返回的每条记录 isTrending 为 true，且数量正确
    - **验证: 需求 3.6**

  - [ ]* 4.6 编写属性测试：ranked 过滤与排序正确性
    - **Property 5: ranked 过滤与排序正确性**
    - 验证 GET /api/games/ranked 返回的记录都有非空 rank，数量正确，且按 rank 升序排列
    - **验证: 需求 3.7**

  - [ ]* 4.7 编写单元测试：404 和参数校验
    - 请求不存在的 Game ID 返回 404
    - 请求不存在的 GameDetail 返回 404
    - id 参数非数字返回 400
    - **验证: 需求 3.3, 3.5**

- [x] 5. 实现分类选项与新手指南 API 路由
  - [x] 5.1 创建分类选项路由 `server/src/routes/categories.ts`
    - 实现 `GET /api/categories/options` 返回筛选选项（types、playerCounts、durations）
    - 实现 `GET /api/categories/quick-links` 返回分类快速链接列表
    - 所有成功响应使用 `{ data: ... }` 格式
    - _需求: 4.1, 4.2, 5.1_

  - [x] 5.2 创建新手指南路由 `server/src/routes/guide.ts`
    - 实现 `GET /api/guide/faqs` 返回常见问题列表
    - 实现 `GET /api/guide/steps` 返回基础流程步骤列表
    - 所有成功响应使用 `{ data: ... }` 格式
    - _需求: 4.3, 4.4, 5.1_

  - [x] 5.3 在 `server/src/index.ts` 中注册所有路由和中间件
    - 注册 games、categories、guide 路由
    - 注册错误处理中间件（必须在路由之后）
    - _需求: 2.1_

  - [ ]* 5.4 编写属性测试：成功响应格式不变量
    - **Property 6: 成功响应格式不变量**
    - 验证所有成功 API 请求返回 HTTP 200，响应体包含 data 字段，Content-Type 包含 application/json
    - **验证: 需求 5.1, 5.4**

  - [ ]* 5.5 编写属性测试：错误响应格式不变量
    - **Property 7: 错误响应格式不变量**
    - 验证所有失败 API 请求返回 4xx/5xx，响应体包含 error 字段（字符串），Content-Type 包含 application/json
    - **验证: 需求 5.2**

  - [ ]* 5.6 编写单元测试：CORS 和端口配置
    - 验证响应包含正确的 CORS 头部
    - 验证默认端口 3001 和自定义端口
    - 模拟数据库异常验证返回 500 且不暴露内部细节
    - **验证: 需求 2.2, 2.3, 5.3**

- [x] 6. 检查点 - 确保后端 API 全部就绪
  - 确保所有测试通过，如有问题请与用户讨论。

- [x] 7. 创建前端 API 客户端与 React Query Hooks
  - [x] 7.1 创建 API 客户端模块 `src/api/client.ts`
    - 配置 BASE_URL，支持 VITE_API_BASE_URL 环境变量覆盖，默认 http://localhost:3001
    - 实现通用 fetch 封装函数，自动提取 data 字段
    - 非 2xx 响应解析 error 字段并抛出异常
    - 实现所有 API 函数：fetchAllGames、fetchTrendingGames、fetchRankedGames、fetchGameById、fetchGameDetails、fetchCategoryOptions、fetchQuickLinks、fetchFAQs、fetchGuideSteps
    - _需求: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 创建 React Query Hooks `src/hooks/useGameData.ts`
    - 实现 useTrendingGames、useQuickLinks（Home 页面）
    - 实现 useAllGames、useCategoryOptions（Categories 页面）
    - 实现 useGameById、useGameDetails（GameDetail 页面）
    - 实现 useRankedGames（Trending 页面）
    - 实现 useFAQs、useGuideSteps（BeginnersGuide 页面）
    - 每个 Hook 返回 data、isLoading、error 状态
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 7.3 编写属性测试：API 客户端响应处理
    - **Property 8: API 客户端响应处理**
    - 验证成功响应时提取 data 字段返回，错误响应时抛出包含错误描述的异常
    - **验证: 需求 6.3, 6.4**

  - [ ]* 7.4 编写单元测试：环境变量覆盖
    - 验证 API 客户端 BASE_URL 可通过环境变量配置
    - **验证: 需求 6.2**

- [x] 8. 改造前端页面使用 API 数据
  - [x] 8.1 改造 Home 页面 `src/pages/Home.tsx`
    - 使用 useTrendingGames 替代 TRENDING_GAMES 常量导入
    - 使用 useQuickLinks 替代 CATEGORIES_QUICK_LINKS 常量导入
    - 添加加载状态和错误状态处理
    - 图片 URL 拼接 BASE_URL 前缀
    - _需求: 7.1, 7.6, 7.7_

  - [x] 8.2 改造 Categories 页面 `src/pages/Categories.tsx`
    - 使用 useAllGames 替代 MERGED_GAMES 常量导入
    - 使用 useCategoryOptions 替代 GAME_TYPES、PLAYER_COUNTS、GAME_DURATIONS 常量导入
    - 添加加载状态和错误状态处理
    - 图片 URL 拼接 BASE_URL 前缀
    - _需求: 7.2, 7.6, 7.7_

  - [x] 8.3 改造 GameDetail 页面 `src/pages/GameDetail.tsx`
    - 使用 useGameById 替代 ALL_GAMES.find() 查找
    - 使用 useGameDetails 替代 GAME_DETAILS 常量导入
    - 添加加载状态和错误状态处理
    - 图片 URL 拼接 BASE_URL 前缀
    - _需求: 7.3, 7.6, 7.7_

  - [x] 8.4 改造 Trending 页面 `src/pages/Trending.tsx`
    - 使用 useRankedGames 替代 RANKED_GAMES 常量导入
    - 添加加载状态和错误状态处理
    - 图片 URL 拼接 BASE_URL 前缀
    - _需求: 7.4, 7.6, 7.7_

  - [x] 8.5 改造 BeginnersGuide 页面 `src/pages/BeginnersGuide.tsx`
    - 使用 useFAQs 替代 BEGINNER_FAQS 常量导入
    - 使用 useGuideSteps 替代 GAME_GUIDE_STEPS 常量导入
    - 添加加载状态和错误状态处理
    - _需求: 7.5, 7.6, 7.7_

  - [ ]* 8.6 编写属性测试：图片路径格式不变量
    - **Property 9: 图片路径格式不变量**
    - 验证数据库中所有图片路径以 `/images/` 开头，不包含 Vite 模块导入语法，为合法 URL 路径格式
    - **验证: 需求 8.2**

  - [ ]* 8.7 编写单元测试：静态文件服务
    - 验证图片资源可通过 HTTP 访问
    - **验证: 需求 8.1, 8.4**

- [x] 9. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请与用户讨论。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加速 MVP 开发
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点任务确保增量验证
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
