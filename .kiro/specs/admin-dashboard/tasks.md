# 实现计划：后台管理系统（Admin Dashboard）

## 概述

基于现有 Express + React + shadcn/ui 技术栈，为桌游攻略网站添加完整的后台管理系统。实现顺序为：后端校验中间件 → 后端管理 API → 图片上传 → 前端 API 客户端与 hooks → 前端管理布局与页面。每个阶段完成后设置检查点确保质量。

## 任务

- [x] 1. 后端请求校验中间件与类型扩展
  - [x] 1.1 在 `server/src/middleware/validation.ts` 中创建请求校验中间件
    - 安装 `zod` 依赖到 server 项目
    - 创建通用的 `validate(schema)` 中间件工厂函数，对请求体进行 zod schema 校验
    - 校验失败返回 HTTP 400，响应格式 `{ error: "具体字段错误描述" }`
    - 创建 `validateId` 中间件，校验路径参数 `:id` 为数字，非数字返回 HTTP 400
    - _需求: 6.1, 6.5_

  - [x] 1.2 在 `server/src/routes/admin/schemas.ts` 中定义所有管理 API 的 zod 校验 schema
    - 定义 `gameSchema`（title、type、players、time、image、difficulty、tags 必填，isHot、rank、comment、isTrending 可选）
    - 定义 `gameDetailSchema`（introduction、objective、victoryConditions、gameplaySteps、tips 必填）
    - 定义 `quickLinkSchema`（name、icon、color、link 必填）
    - 定义 `faqSchema`（question、answer 必填）
    - 定义 `guideStepSchema`（step、description 必填）
    - 定义 `reorderSchema`（ids 为 number 数组）
    - _需求: 1.4, 2.6, 3.5, 4.7, 4.8_

  - [x] 1.3 在 `server/src/types.ts` 中扩展管理 API 所需的输入类型
    - 添加 `GameInput`、`GameDetailInput`、`QuickLinkInput`、`FAQInput`、`GuideStepInput` 接口
    - 添加 `DashboardStats` 接口
    - _需求: 1.1, 2.1, 3.2, 4.1, 4.4, 10.4_

  - [ ]* 1.4 为校验中间件编写属性测试
    - **Property 6: 必填字段校验返回 400**
    - **Property 10: 非法 JSON 请求体返回 400**
    - **Property 12: 非数字 id 参数返回 400**
    - **验证: 需求 1.4, 2.6, 3.5, 4.7, 4.8, 6.1, 6.5**

- [x] 2. 检查点 - 校验中间件完成
  - 确保所有测试通过，如有问题请与用户讨论。

- [x] 3. 后端管理 API — 游戏 CRUD
  - [x] 3.1 创建 `server/src/routes/admin/games.ts` 路由文件
    - 实现 `POST /api/admin/games`：校验请求体，插入 games 表，返回 201 和完整 Game 数据
    - 实现 `PUT /api/admin/games/:id`：校验请求体和 id，更新 games 表对应记录，不存在返回 404，成功返回 200
    - 实现 `DELETE /api/admin/games/:id`：校验 id，级联删除 game_details 和 games 记录，不存在返回 404，成功返回 200
    - JSON 数组字段 `tags` 使用 `JSON.stringify()` 写入，布尔字段转换为 0/1
    - _需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 创建 `server/src/routes/admin/games.ts` 中的游戏详情管理路由
    - 实现 `POST /api/admin/games/:id/details`：校验游戏存在性，校验详情不重复（409），插入 game_details 表，返回 201
    - 实现 `PUT /api/admin/games/:id/details`：校验游戏和详情存在性，更新 game_details 表，返回 200
    - 实现 `DELETE /api/admin/games/:id/details`：删除 game_details 记录，返回 200
    - JSON 数组字段 `victoryConditions`、`gameplaySteps`、`tips` 使用 `JSON.stringify()` 写入
    - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.3 为游戏 CRUD 编写属性测试
    - **Property 1: 游戏 CRUD round-trip**
    - **验证: 需求 1.1, 1.2**

  - [ ]* 3.4 为游戏详情 CRUD 编写属性测试
    - **Property 2: 游戏详情 CRUD round-trip**
    - **验证: 需求 2.1, 2.2**

  - [ ]* 3.5 为删除后资源不存在编写属性测试（游戏部分）
    - **Property 5: 删除后资源不存在（游戏和游戏详情级联删除）**
    - **验证: 需求 1.3, 2.3**

- [x] 4. 后端管理 API — 分类选项与快速链接
  - [x] 4.1 创建 `server/src/routes/admin/categories.ts` 路由文件
    - 实现 `PUT /api/admin/categories/options`：校验请求体，更新 category_options 表对应 key 的 value，返回 200
    - 实现 `POST /api/admin/categories/quick-links`：校验请求体，插入 quick_links 表，返回 201
    - 实现 `PUT /api/admin/categories/quick-links/:id`：校验请求体和 id，更新 quick_links 表，不存在返回 404，返回 200
    - 实现 `DELETE /api/admin/categories/quick-links/:id`：校验 id，删除 quick_links 记录，返回 200
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.2 为分类与快速链接 CRUD 编写属性测试
    - **Property 3: 分类与快速链接 CRUD round-trip**
    - **验证: 需求 3.1, 3.2, 3.3**

  - [ ]* 4.3 为删除后资源不存在编写属性测试（快速链接部分）
    - **Property 5: 删除后资源不存在（快速链接）**
    - **验证: 需求 3.4**

- [x] 5. 后端管理 API — FAQ 与指南步骤
  - [x] 5.1 创建 `server/src/routes/admin/guide.ts` 路由文件
    - 实现 `POST /api/admin/guide/faqs`：校验请求体，插入 faqs 表（自动设置 sort_order），返回 201
    - 实现 `PUT /api/admin/guide/faqs/:id`：校验请求体和 id，更新 faqs 表，返回 200
    - 实现 `DELETE /api/admin/guide/faqs/:id`：删除 faqs 记录，返回 200
    - 实现 `PUT /api/admin/guide/faqs/reorder`：校验 ids 数组，使用事务批量更新 sort_order，返回 200
    - 实现 `POST /api/admin/guide/steps`：校验请求体，插入 guide_steps 表，返回 201
    - 实现 `PUT /api/admin/guide/steps/:id`：校验请求体和 id，更新 guide_steps 表，返回 200
    - 实现 `DELETE /api/admin/guide/steps/:id`：删除 guide_steps 记录，返回 200
    - 实现 `PUT /api/admin/guide/steps/reorder`：校验 ids 数组，使用事务批量更新 sort_order，返回 200
    - 注意 reorder 路由必须在 `:id` 路由之前注册
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 5.2 为 FAQ 与指南步骤 CRUD 编写属性测试
    - **Property 4: FAQ 与指南步骤 CRUD round-trip**
    - **验证: 需求 4.1, 4.2, 4.4, 4.5**

  - [ ]* 5.3 为排序功能编写属性测试
    - **Property 7: 排序 round-trip**
    - **验证: 需求 4.9, 4.10**

  - [ ]* 5.4 为删除后资源不存在编写属性测试（FAQ 和指南步骤部分）
    - **Property 5: 删除后资源不存在（FAQ 和指南步骤）**
    - **验证: 需求 4.3, 4.6**

- [x] 6. 后端管理 API — 图片上传
  - [x] 6.1 创建 `server/src/routes/admin/upload.ts` 路由文件
    - 安装 `multer` 和 `uuid` 依赖及其类型声明到 server 项目
    - 配置 multer storage，目标目录为 `server/public/images/`
    - 使用 UUID 重命名上传文件，保留原始扩展名
    - 配置文件大小上限 5MB
    - 配置 fileFilter 仅允许 JPEG、PNG、WebP 格式
    - 实现 `POST /api/admin/upload`：处理单文件上传，返回 201 和图片路径 `{ data: { path: "/images/xxx.png" } }`
    - 处理 multer 错误（格式不支持、文件过大），返回 HTTP 400
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 6.2 为图片上传编写属性测试
    - **Property 8: 图片上传路径格式与文件名唯一性**
    - **Property 9: 非法文件格式拒绝**
    - **验证: 需求 5.1, 5.2, 5.4, 5.6**

- [x] 7. 后端管理 API — 仪表盘统计与路由注册
  - [x] 7.1 在管理路由中添加仪表盘统计接口
    - 创建 `GET /api/admin/stats` 接口，查询各表 COUNT(*) 返回统计数据
    - 返回 `{ data: { gameCount, detailCount, faqCount, guideStepCount, quickLinkCount, categoryOptionCount } }`
    - _需求: 10.4_

  - [x] 7.2 在 `server/src/index.ts` 中注册所有管理路由
    - 导入并注册 `adminGamesRouter` 到 `/api/admin/games`
    - 导入并注册 `adminCategoriesRouter` 到 `/api/admin/categories`
    - 导入并注册 `adminGuideRouter` 到 `/api/admin/guide`
    - 导入并注册 `adminUploadRouter` 到 `/api/admin/upload`
    - 导入并注册 `adminStatsRouter` 到 `/api/admin`（stats 路由）
    - 确保管理路由在错误处理中间件之前注册
    - _需求: 1.1, 2.1, 3.1, 4.1, 5.1, 10.4_

  - [ ]* 7.3 为响应格式不变量编写属性测试
    - **Property 11: 响应格式不变量**
    - **验证: 需求 6.2, 6.3**

  - [ ]* 7.4 为仪表盘统计编写属性测试
    - **Property 13: 仪表盘统计与数据库一致**
    - **验证: 需求 10.4**

- [x] 8. 检查点 - 后端管理 API 全部完成
  - 确保所有后端路由正常工作，所有测试通过，如有问题请与用户讨论。

- [x] 9. 前端管理 API 客户端与 Hooks
  - [x] 9.1 创建 `src/api/adminClient.ts` 管理 API 客户端
    - 定义管理 API 输入类型（`GameInput`、`GameDetailInput`、`QuickLinkInput`、`FAQInput`、`GuideStepInput`、`DashboardStats`）
    - 封装通用的 `mutationRequest<T>(method, path, data?)` 函数，处理 POST/PUT/DELETE 请求
    - 实现游戏管理函数：`createGame`、`updateGame`、`deleteGame`
    - 实现游戏详情管理函数：`createGameDetail`、`updateGameDetail`、`deleteGameDetail`
    - 实现分类选项管理函数：`updateCategoryOption`
    - 实现快速链接管理函数：`createQuickLink`、`updateQuickLink`、`deleteQuickLink`
    - 实现 FAQ 管理函数：`createFAQ`、`updateFAQ`、`deleteFAQ`、`reorderFAQs`
    - 实现指南步骤管理函数：`createGuideStep`、`updateGuideStep`、`deleteGuideStep`、`reorderGuideSteps`
    - 实现图片上传函数：`uploadImage`（使用 FormData）
    - 实现统计数据函数：`fetchDashboardStats`
    - _需求: 7.3, 7.5, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 9.2 创建 `src/hooks/useAdminData.ts` 管理 mutation hooks
    - 使用 `useMutation` 封装所有写操作 hooks
    - 每个 mutation 的 `onSuccess` 中调用 `queryClient.invalidateQueries` 刷新对应列表
    - 实现 `useCreateGame`、`useUpdateGame`、`useDeleteGame`
    - 实现 `useCreateGameDetail`、`useUpdateGameDetail`、`useDeleteGameDetail`
    - 实现 `useUpdateCategoryOption`
    - 实现 `useCreateQuickLink`、`useUpdateQuickLink`、`useDeleteQuickLink`
    - 实现 `useCreateFAQ`、`useUpdateFAQ`、`useDeleteFAQ`、`useReorderFAQs`
    - 实现 `useCreateGuideStep`、`useUpdateGuideStep`、`useDeleteGuideStep`、`useReorderGuideSteps`
    - 实现 `useUploadImage`
    - 实现 `useDashboardStats` 查询 hook
    - _需求: 7.3, 7.7, 8.7_

- [x] 10. 前端管理布局与路由
  - [x] 10.1 创建 `src/pages/admin/AdminLayout.tsx` 管理后台布局组件
    - 使用 shadcn/ui Sidebar 组件构建左侧导航栏
    - 侧边栏菜单项：仪表盘概览、游戏管理、分类选项管理、快速链接管理、常见问题管理、新手指南管理
    - 右侧内容区使用 React Router `<Outlet />` 渲染子路由
    - 当前选中菜单项高亮显示
    - 采用管理后台风格 UI，与前台网站布局区分
    - _需求: 10.1, 10.2, 10.3, 10.5_

  - [x] 10.2 在 `src/App.tsx` 中配置管理路由
    - 添加 `/admin` 路由组，使用 `AdminLayout` 作为布局组件
    - 配置子路由：index（Dashboard）、games、games/:id/details、category-options、quick-links、faqs、guide-steps
    - 确保管理路由独立于前台路由，不使用前台 Layout
    - _需求: 10.1_

- [x] 11. 前端管理页面 — 仪表盘概览
  - [x] 11.1 创建 `src/pages/admin/Dashboard.tsx` 仪表盘页面
    - 调用 `useDashboardStats` 获取统计数据
    - 使用 shadcn/ui Card 组件展示各数据表的记录总数（游戏数量、详情数量、FAQ 数量、指南步骤数量、快速链接数量）
    - 显示加载状态和错误状态
    - _需求: 10.4_

- [x] 12. 检查点 - 管理布局与仪表盘完成
  - 确保管理后台布局正常渲染，侧边栏导航可用，仪表盘统计数据正确显示，如有问题请与用户讨论。

- [x] 13. 前端管理页面 — 游戏管理
  - [x] 13.1 创建 `src/pages/admin/GamesManage.tsx` 游戏管理页面
    - 使用 shadcn/ui Table 组件展示所有游戏列表，包含 id、标题、类型、玩家人数、时长、难度、是否热门、排名等列
    - 调用 `useAllGames` 获取游戏列表数据
    - 显示加载状态指示器
    - 实现"新增游戏"按钮，点击弹出包含所有 Game 字段的表单 Dialog
    - 实现每行"编辑"按钮，点击弹出预填充数据的编辑表单 Dialog
    - 实现每行"删除"按钮，点击弹出 AlertDialog 确认后调用删除 API
    - 实现每行"管理详情"按钮，点击导航到 `/admin/games/:id/details`
    - 表单使用 react-hook-form + zod 进行客户端校验
    - 表单中图片字段支持通过 `uploadImage` 上传图片
    - 提交时显示加载状态，防止重复提交
    - API 返回校验错误时在表单中展示对应字段的错误提示
    - 操作成功后刷新列表并关闭弹窗，使用 sonner toast 提示
    - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 14. 前端管理页面 — 游戏详情管理
  - [x] 14.1 创建 `src/pages/admin/GameDetailManage.tsx` 游戏详情管理页面
    - 从路由参数获取游戏 id，调用 `useGameById` 和 `useGameDetails` 获取数据
    - 无详情时展示空状态提示和"创建详情"按钮
    - 有详情时展示编辑表单，包含简介、目标、获胜条件列表、玩法步骤列表、新手提示列表
    - 获胜条件列表支持动态增删，每项包含 text 和 image 字段
    - 玩法步骤列表支持动态增删，每项包含 title、desc、image 字段
    - 新手提示列表支持动态增删，每项为一条文本
    - 表单使用 react-hook-form + zod 进行校验
    - 提交时根据是否已有详情调用创建或更新 API
    - 操作成功后显示 sonner toast 提示
    - 提供删除详情按钮，确认后调用删除 API
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 14.2 为动态列表增删编写属性测试
    - **Property 14: 动态列表增删不变量**
    - **验证: 需求 8.4, 8.5, 8.6**

- [x] 15. 检查点 - 游戏管理页面完成
  - 确保游戏列表展示、新增/编辑/删除操作、游戏详情管理全部正常工作，如有问题请与用户讨论。

- [x] 16. 前端管理页面 — 分类选项管理
  - [x] 16.1 创建 `src/pages/admin/CategoryOptions.tsx` 分类选项管理页面
    - 调用 `useCategoryOptions` 获取当前分类选项数据
    - 展示游戏类型列表、玩家人数选项、游戏时长选项三个编辑区域
    - 每个区域支持编辑选项值（添加/删除选项项）
    - 提交时调用 `useUpdateCategoryOption` 保存更改
    - 操作成功后显示 sonner toast 提示
    - _需求: 9.1_

- [x] 17. 前端管理页面 — 快速链接管理
  - [x] 17.1 创建 `src/pages/admin/QuickLinks.tsx` 快速链接管理页面
    - 调用 `useQuickLinks` 获取快速链接列表
    - 以列表/表格形式展示所有快速链接，包含 name、icon、color、link 字段
    - 实现新增、编辑（Dialog 表单）、删除（AlertDialog 确认）操作
    - 表单使用 react-hook-form + zod 校验
    - 操作成功后刷新列表，使用 sonner toast 提示
    - _需求: 9.2_

- [x] 18. 前端管理页面 — 常见问题管理
  - [x] 18.1 创建 `src/pages/admin/FAQsManage.tsx` 常见问题管理页面
    - 安装 `@dnd-kit/core` 和 `@dnd-kit/sortable` 依赖到前端项目
    - 调用现有查询 hook 获取 FAQ 列表（需要扩展现有 hook 返回 id 和 sort_order）
    - 以列表形式展示所有 FAQ，包含 question 和 answer 字段
    - 实现新增、编辑（Dialog 表单）、删除（AlertDialog 确认）操作
    - 实现拖拽排序功能，使用 @dnd-kit/sortable
    - 拖拽结束后调用 `useReorderFAQs` 保存新排序
    - 表单使用 react-hook-form + zod 校验
    - 操作成功后刷新列表，使用 sonner toast 提示
    - _需求: 9.3, 9.5_

- [x] 19. 前端管理页面 — 新手指南步骤管理
  - [x] 19.1 创建 `src/pages/admin/GuideSteps.tsx` 新手指南步骤管理页面
    - 调用现有查询 hook 获取指南步骤列表（需要扩展现有 hook 返回 id 和 sort_order）
    - 以列表形式展示所有指南步骤，包含 step 和 description 字段
    - 实现新增、编辑（Dialog 表单）、删除（AlertDialog 确认）操作
    - 实现拖拽排序功能，使用 @dnd-kit/sortable
    - 拖拽结束后调用 `useReorderGuideSteps` 保存新排序
    - 表单使用 react-hook-form + zod 校验
    - 操作成功后刷新列表，使用 sonner toast 提示
    - _需求: 9.4, 9.5_

- [x] 20. 扩展现有只读 API 以支持管理页面
  - [x] 20.1 扩展现有只读路由返回 id 和 sort_order 字段
    - 修改 `server/src/routes/guide.ts` 中 FAQ 和指南步骤查询，返回 id 和 sort_order 字段
    - 修改 `server/src/routes/categories.ts` 中快速链接查询，返回 id 字段
    - 更新 `server/src/types.ts` 和 `src/api/client.ts` 中对应的类型定义，添加可选的 id 和 sort_order 字段
    - 更新 `src/hooks/useGameData.ts` 中对应 hook 的类型
    - _需求: 9.3, 9.4, 9.5_

- [x] 21. 最终检查点 - 全部功能完成
  - 确保所有管理页面正常工作，所有 CRUD 操作、拖拽排序、图片上传功能正常，所有测试通过，如有问题请与用户讨论。

## 备注

- 标记 `*` 的任务为可选测试任务，可跳过以加快 MVP 进度
- 每个任务引用了具体的需求编号，确保可追溯性
- 检查点确保增量验证，及时发现问题
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
