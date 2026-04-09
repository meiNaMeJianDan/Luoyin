# Bugfix 需求文档

## 简介

后台管理系统中游戏详情管理页面（`GameDetailManage.tsx`）的多个文本字段使用普通多行输入框（`Textarea`）或单行输入框（`Input`），无法输入富文本内容（如加粗、列表、链接等格式化文本）。同时，前台游戏详情页面（`GameDetail.tsx`）将所有内容作为纯文本渲染，无法正确展示富文本 HTML 内容。这导致管理员无法为游戏详情添加格式化内容，影响内容展示效果。

涉及的字段：
- `introduction`（游戏简介）
- `objective`（游戏目标）
- `victoryConditions` 中的 `text` 字段（获胜条件描述）
- `gameplaySteps` 中的 `desc` 字段（玩法步骤描述）

## Bug 分析

### 当前行为（缺陷）

1.1 WHEN 管理员在后台编辑游戏简介（introduction）字段时 THEN 系统仅提供普通 Textarea 输入框，无法输入加粗、斜体、列表、链接等富文本格式

1.2 WHEN 管理员在后台编辑游戏目标（objective）字段时 THEN 系统仅提供普通 Textarea 输入框，无法输入富文本格式

1.3 WHEN 管理员在后台编辑获胜条件描述（victoryConditions.text）字段时 THEN 系统仅提供普通 Input 单行输入框，无法输入富文本格式，且无法输入多行内容

1.4 WHEN 管理员在后台编辑玩法步骤描述（gameplaySteps.desc）字段时 THEN 系统仅提供普通 Textarea 输入框，无法输入富文本格式

1.5 WHEN 前台页面渲染包含 HTML 标签的游戏简介内容时 THEN 系统将 HTML 标签作为纯文本显示，而非渲染为格式化内容

1.6 WHEN 前台页面渲染包含 HTML 标签的游戏目标内容时 THEN 系统将 HTML 标签作为纯文本显示

1.7 WHEN 前台页面渲染包含 HTML 标签的获胜条件描述时 THEN 系统将 HTML 标签作为纯文本显示

1.8 WHEN 前台页面渲染包含 HTML 标签的玩法步骤描述时 THEN 系统将 HTML 标签作为纯文本显示

### 期望行为（正确）

2.1 WHEN 管理员在后台编辑游戏简介（introduction）字段时 THEN 系统 SHALL 提供富文本编辑器，支持加粗、斜体、列表、链接等基本格式化操作，并将内容以 HTML 格式存储

2.2 WHEN 管理员在后台编辑游戏目标（objective）字段时 THEN 系统 SHALL 提供富文本编辑器，支持基本格式化操作，并将内容以 HTML 格式存储

2.3 WHEN 管理员在后台编辑获胜条件描述（victoryConditions.text）字段时 THEN 系统 SHALL 提供富文本编辑器，支持基本格式化操作，并将内容以 HTML 格式存储

2.4 WHEN 管理员在后台编辑玩法步骤描述（gameplaySteps.desc）字段时 THEN 系统 SHALL 提供富文本编辑器，支持基本格式化操作，并将内容以 HTML 格式存储

2.5 WHEN 前台页面渲染包含 HTML 标签的游戏简介内容时 THEN 系统 SHALL 使用 dangerouslySetInnerHTML 或等效方式正确渲染 HTML 富文本内容

2.6 WHEN 前台页面渲染包含 HTML 标签的游戏目标内容时 THEN 系统 SHALL 正确渲染 HTML 富文本内容

2.7 WHEN 前台页面渲染包含 HTML 标签的获胜条件描述时 THEN 系统 SHALL 正确渲染 HTML 富文本内容

2.8 WHEN 前台页面渲染包含 HTML 标签的玩法步骤描述时 THEN 系统 SHALL 正确渲染 HTML 富文本内容

### 不变行为（回归防护）

3.1 WHEN 管理员编辑游戏详情中的步骤标题（gameplaySteps.title）字段时 THEN 系统 SHALL CONTINUE TO 使用普通 Input 输入框

3.2 WHEN 管理员编辑游戏详情中的图片路径字段时 THEN 系统 SHALL CONTINUE TO 使用普通 Input 输入框

3.3 WHEN 管理员编辑游戏详情中的新手提示（tips）字段时 THEN 系统 SHALL CONTINUE TO 使用普通 Input 输入框

3.4 WHEN 后端 API 接收游戏详情的创建/更新请求时 THEN 系统 SHALL CONTINUE TO 正确校验和存储所有字段数据（introduction、objective、victoryConditions、gameplaySteps、tips）

3.5 WHEN 前台页面渲染新手提示内容时 THEN 系统 SHALL CONTINUE TO 以纯文本方式正确显示

3.6 WHEN 前台页面渲染游戏基础信息（标题、标签、玩家人数等）时 THEN 系统 SHALL CONTINUE TO 正常显示不受影响

3.7 WHEN 数据库中已有的纯文本游戏详情数据被前台页面渲染时 THEN 系统 SHALL CONTINUE TO 正确显示（向后兼容纯文本内容）
