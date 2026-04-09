# 需求文档

## 简介

本项目旨在为桌游攻略网站添加后台管理系统（Admin Dashboard）。当前网站数据只能通过种子脚本初始化，缺乏增删改的能力。后台管理系统将为网站管理员提供可视化的数据管理界面，支持对所有内容数据（游戏、游戏详情、分类选项、快速链接、常见问题、新手指南步骤）进行完整的 CRUD 操作，使管理员无需直接操作数据库或修改代码即可维护网站内容。

## 术语表

- **Admin_Dashboard**: 后台管理系统前端应用，提供数据管理的可视化界面
- **Admin_API**: 后端管理接口，提供数据增删改的 RESTful API
- **Admin_User**: 后台管理系统的使用者，即网站管理员
- **Game_Entity**: 游戏基础信息实体，对应 games 表
- **GameDetail_Entity**: 游戏详情实体，对应 game_details 表
- **CategoryOption_Entity**: 分类筛选选项实体，对应 category_options 表
- **QuickLink_Entity**: 分类快速链接实体，对应 quick_links 表
- **FAQ_Entity**: 新手常见问题实体，对应 faqs 表
- **GuideStep_Entity**: 新手指南步骤实体，对应 guide_steps 表
- **Image_Service**: 图片上传与管理服务，负责处理游戏图片的上传、存储和删除

## 需求

### 需求 1：后端管理 API — 游戏管理

**用户故事：** 作为网站管理员，我希望通过 API 对游戏数据进行增删改操作，以便灵活管理网站上展示的桌游内容。

#### 验收标准

1. WHEN Admin_User 发送 `POST /api/admin/games` 请求并携带合法的 Game_Entity 数据时，THE Admin_API SHALL 在 games 表中创建一条新记录，并返回 HTTP 201 状态码和创建后的完整 Game_Entity 数据
2. WHEN Admin_User 发送 `PUT /api/admin/games/:id` 请求并携带合法的 Game_Entity 数据时，THE Admin_API SHALL 更新 games 表中对应 id 的记录，并返回 HTTP 200 状态码和更新后的完整 Game_Entity 数据
3. WHEN Admin_User 发送 `DELETE /api/admin/games/:id` 请求时，THE Admin_API SHALL 删除 games 表中对应 id 的记录及其关联的 game_details 记录，并返回 HTTP 200 状态码
4. IF 创建或更新 Game_Entity 时缺少必填字段（title、type、players、time、image、difficulty、tags），THEN THE Admin_API SHALL 返回 HTTP 400 状态码和包含具体缺失字段说明的错误信息
5. IF 删除的 Game_Entity id 不存在，THEN THE Admin_API SHALL 返回 HTTP 404 状态码和错误描述信息
6. IF 更新的 Game_Entity id 不存在，THEN THE Admin_API SHALL 返回 HTTP 404 状态码和错误描述信息

### 需求 2：后端管理 API — 游戏详情管理

**用户故事：** 作为网站管理员，我希望通过 API 对游戏详情数据进行增删改操作，以便为每款游戏维护详细的攻略内容。

#### 验收标准

1. WHEN Admin_User 发送 `POST /api/admin/games/:id/details` 请求并携带合法的 GameDetail_Entity 数据时，THE Admin_API SHALL 在 game_details 表中创建一条关联该游戏的详情记录，并返回 HTTP 201 状态码和创建后的完整 GameDetail_Entity 数据
2. WHEN Admin_User 发送 `PUT /api/admin/games/:id/details` 请求并携带合法的 GameDetail_Entity 数据时，THE Admin_API SHALL 更新 game_details 表中对应 game_id 的记录，并返回 HTTP 200 状态码和更新后的完整 GameDetail_Entity 数据
3. WHEN Admin_User 发送 `DELETE /api/admin/games/:id/details` 请求时，THE Admin_API SHALL 删除 game_details 表中对应 game_id 的记录，并返回 HTTP 200 状态码
4. IF 创建 GameDetail_Entity 时对应的 game_id 在 games 表中不存在，THEN THE Admin_API SHALL 返回 HTTP 404 状态码和错误描述信息
5. IF 创建 GameDetail_Entity 时该游戏已存在详情记录，THEN THE Admin_API SHALL 返回 HTTP 409 状态码和冲突描述信息
6. IF 创建或更新 GameDetail_Entity 时缺少必填字段（introduction、objective、victoryConditions、gameplaySteps、tips），THEN THE Admin_API SHALL 返回 HTTP 400 状态码和包含具体缺失字段说明的错误信息

### 需求 3：后端管理 API — 分类选项与快速链接管理

**用户故事：** 作为网站管理员，我希望通过 API 管理分类筛选选项和快速链接数据，以便灵活调整网站的分类导航结构。

#### 验收标准

1. WHEN Admin_User 发送 `PUT /api/admin/categories/options` 请求并携带合法的 CategoryOption_Entity 数据时，THE Admin_API SHALL 更新 category_options 表中对应 key 的记录，并返回 HTTP 200 状态码和更新后的完整数据
2. WHEN Admin_User 发送 `POST /api/admin/categories/quick-links` 请求并携带合法的 QuickLink_Entity 数据时，THE Admin_API SHALL 在 quick_links 表中创建一条新记录，并返回 HTTP 201 状态码和创建后的完整数据
3. WHEN Admin_User 发送 `PUT /api/admin/categories/quick-links/:id` 请求并携带合法的 QuickLink_Entity 数据时，THE Admin_API SHALL 更新 quick_links 表中对应 id 的记录，并返回 HTTP 200 状态码
4. WHEN Admin_User 发送 `DELETE /api/admin/categories/quick-links/:id` 请求时，THE Admin_API SHALL 删除 quick_links 表中对应 id 的记录，并返回 HTTP 200 状态码
5. IF 创建或更新 QuickLink_Entity 时缺少必填字段（name、icon、color、link），THEN THE Admin_API SHALL 返回 HTTP 400 状态码和包含具体缺失字段说明的错误信息

### 需求 4：后端管理 API — 常见问题与新手指南管理

**用户故事：** 作为网站管理员，我希望通过 API 管理新手常见问题和指南步骤数据，以便持续优化新手引导内容。

#### 验收标准

1. WHEN Admin_User 发送 `POST /api/admin/guide/faqs` 请求并携带合法的 FAQ_Entity 数据时，THE Admin_API SHALL 在 faqs 表中创建一条新记录，并返回 HTTP 201 状态码和创建后的完整数据
2. WHEN Admin_User 发送 `PUT /api/admin/guide/faqs/:id` 请求并携带合法的 FAQ_Entity 数据时，THE Admin_API SHALL 更新 faqs 表中对应 id 的记录，并返回 HTTP 200 状态码
3. WHEN Admin_User 发送 `DELETE /api/admin/guide/faqs/:id` 请求时，THE Admin_API SHALL 删除 faqs 表中对应 id 的记录，并返回 HTTP 200 状态码
4. WHEN Admin_User 发送 `POST /api/admin/guide/steps` 请求并携带合法的 GuideStep_Entity 数据时，THE Admin_API SHALL 在 guide_steps 表中创建一条新记录，并返回 HTTP 201 状态码和创建后的完整数据
5. WHEN Admin_User 发送 `PUT /api/admin/guide/steps/:id` 请求并携带合法的 GuideStep_Entity 数据时，THE Admin_API SHALL 更新 guide_steps 表中对应 id 的记录，并返回 HTTP 200 状态码
6. WHEN Admin_User 发送 `DELETE /api/admin/guide/steps/:id` 请求时，THE Admin_API SHALL 删除 guide_steps 表中对应 id 的记录，并返回 HTTP 200 状态码
7. IF 创建或更新 FAQ_Entity 时缺少必填字段（question、answer），THEN THE Admin_API SHALL 返回 HTTP 400 状态码和包含具体缺失字段说明的错误信息
8. IF 创建或更新 GuideStep_Entity 时缺少必填字段（step、description），THEN THE Admin_API SHALL 返回 HTTP 400 状态码和包含具体缺失字段说明的错误信息
9. WHEN Admin_User 发送 `PUT /api/admin/guide/faqs/reorder` 请求并携带 FAQ id 排序数组时，THE Admin_API SHALL 批量更新 faqs 表中各记录的 sort_order 字段，并返回 HTTP 200 状态码
10. WHEN Admin_User 发送 `PUT /api/admin/guide/steps/reorder` 请求并携带 GuideStep id 排序数组时，THE Admin_API SHALL 批量更新 guide_steps 表中各记录的 sort_order 字段，并返回 HTTP 200 状态码

### 需求 5：图片上传管理

**用户故事：** 作为网站管理员，我希望能够上传和管理游戏图片，以便在创建或编辑游戏时关联图片资源。

#### 验收标准

1. WHEN Admin_User 发送 `POST /api/admin/upload` 请求并携带图片文件时，THE Image_Service SHALL 将图片保存到 `server/public/images/` 目录，并返回 HTTP 201 状态码和图片的相对路径（如 `/images/filename.png`）
2. THE Image_Service SHALL 仅接受 JPEG、PNG、WebP 格式的图片文件
3. THE Image_Service SHALL 限制单个图片文件大小上限为 5MB
4. IF 上传的文件格式不在允许范围内，THEN THE Image_Service SHALL 返回 HTTP 400 状态码和格式错误描述信息
5. IF 上传的文件大小超过 5MB，THEN THE Image_Service SHALL 返回 HTTP 400 状态码和文件过大描述信息
6. THE Image_Service SHALL 对上传的文件名进行重命名处理（使用时间戳或 UUID），避免文件名冲突

### 需求 6：管理 API 请求校验与错误处理

**用户故事：** 作为网站管理员，我希望管理 API 返回清晰的错误信息，以便快速定位和修正操作问题。

#### 验收标准

1. THE Admin_API SHALL 对所有写入操作（POST、PUT）的请求体进行 JSON 格式校验，请求体为空或非合法 JSON 时返回 HTTP 400 状态码
2. THE Admin_API SHALL 对所有成功的写入操作返回包含 `data` 字段的 JSON 响应，与现有只读 API 的响应格式保持一致
3. THE Admin_API SHALL 对所有错误响应返回包含 `error` 字段的 JSON 响应，与现有只读 API 的错误格式保持一致
4. IF Admin_API 在处理写入请求时发生未预期的数据库异常，THEN THE Admin_API SHALL 返回 HTTP 500 状态码和通用错误信息，且不暴露内部实现细节
5. THE Admin_API SHALL 对路径参数中的 id 进行数字格式校验，非数字 id 返回 HTTP 400 状态码

### 需求 7：后台管理前端 — 游戏管理页面

**用户故事：** 作为网站管理员，我希望在后台管理界面中查看、创建、编辑和删除游戏数据，以便通过可视化操作管理网站内容。

#### 验收标准

1. WHEN Admin_User 访问后台管理的游戏管理页面时，THE Admin_Dashboard SHALL 以表格形式展示所有 Game_Entity 数据，包含 id、标题、类型、玩家人数、时长、难度、是否热门、排名等列
2. WHEN Admin_User 点击"新增游戏"按钮时，THE Admin_Dashboard SHALL 展示包含所有 Game_Entity 字段的表单弹窗
3. WHEN Admin_User 在新增表单中填写完整数据并提交时，THE Admin_Dashboard SHALL 调用 Admin_API 创建游戏，成功后刷新游戏列表并关闭弹窗
4. WHEN Admin_User 点击某条游戏记录的"编辑"按钮时，THE Admin_Dashboard SHALL 展示预填充该游戏数据的编辑表单弹窗
5. WHEN Admin_User 点击某条游戏记录的"删除"按钮时，THE Admin_Dashboard SHALL 展示确认对话框，确认后调用 Admin_API 删除该游戏并刷新列表
6. IF Admin_API 返回校验错误，THEN THE Admin_Dashboard SHALL 在表单中展示对应字段的错误提示信息
7. WHILE 数据正在加载或提交中，THE Admin_Dashboard SHALL 显示加载状态指示器，防止重复提交

### 需求 8：后台管理前端 — 游戏详情管理页面

**用户故事：** 作为网站管理员，我希望在后台管理界面中为游戏添加、编辑和删除详情攻略内容。

#### 验收标准

1. WHEN Admin_User 在游戏列表中点击某条游戏的"管理详情"按钮时，THE Admin_Dashboard SHALL 导航到该游戏的详情管理页面
2. WHILE 该游戏已有详情数据，THE Admin_Dashboard SHALL 展示详情的编辑表单，包含简介、目标、获胜条件列表、玩法步骤列表、新手提示列表等字段
3. WHILE 该游戏没有详情数据，THE Admin_Dashboard SHALL 展示空状态提示和"创建详情"按钮
4. THE Admin_Dashboard SHALL 支持获胜条件列表的动态增删操作，每项包含 text 和 image 字段
5. THE Admin_Dashboard SHALL 支持玩法步骤列表的动态增删操作，每项包含 title、desc、image 字段
6. THE Admin_Dashboard SHALL 支持新手提示列表的动态增删操作，每项为一条文本
7. WHEN Admin_User 提交详情表单时，THE Admin_Dashboard SHALL 调用 Admin_API 创建或更新详情数据，成功后显示操作成功提示

### 需求 9：后台管理前端 — 内容管理页面

**用户故事：** 作为网站管理员，我希望在后台管理界面中管理分类选项、快速链接、常见问题和新手指南步骤。

#### 验收标准

1. WHEN Admin_User 访问分类选项管理页面时，THE Admin_Dashboard SHALL 展示当前的游戏类型列表、玩家人数选项和游戏时长选项，支持编辑和保存
2. WHEN Admin_User 访问快速链接管理页面时，THE Admin_Dashboard SHALL 以列表形式展示所有 QuickLink_Entity，支持新增、编辑和删除操作
3. WHEN Admin_User 访问常见问题管理页面时，THE Admin_Dashboard SHALL 以列表形式展示所有 FAQ_Entity，支持新增、编辑、删除和拖拽排序操作
4. WHEN Admin_User 访问新手指南步骤管理页面时，THE Admin_Dashboard SHALL 以列表形式展示所有 GuideStep_Entity，支持新增、编辑、删除和拖拽排序操作
5. WHEN Admin_User 通过拖拽调整 FAQ 或 GuideStep 的顺序后，THE Admin_Dashboard SHALL 调用 Admin_API 的排序接口保存新的排列顺序

### 需求 10：后台管理前端 — 布局与导航

**用户故事：** 作为网站管理员，我希望后台管理系统有清晰的导航结构，以便快速切换不同的管理模块。

#### 验收标准

1. THE Admin_Dashboard SHALL 提供独立于前台网站的路由入口，路径前缀为 `/admin`
2. THE Admin_Dashboard SHALL 包含侧边栏导航，提供以下菜单项：仪表盘概览、游戏管理、分类选项管理、快速链接管理、常见问题管理、新手指南管理
3. WHEN Admin_User 点击侧边栏菜单项时，THE Admin_Dashboard SHALL 切换到对应的管理页面，当前选中项高亮显示
4. THE Admin_Dashboard SHALL 在仪表盘概览页面展示各数据表的记录总数统计信息（游戏数量、详情数量、FAQ 数量、指南步骤数量）
5. THE Admin_Dashboard SHALL 采用与前台网站不同的布局结构，使用管理后台风格的 UI 设计
