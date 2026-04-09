# 富文本编辑器 Bugfix 设计文档

## 概述

后台管理系统的游戏详情编辑页面（`GameDetailManage.tsx`）中，`introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 四个文本字段使用普通 `Textarea`/`Input` 组件，无法输入富文本格式内容。前台详情页面（`GameDetail.tsx`）将所有内容作为纯文本渲染，无法展示 HTML 格式化内容。

修复方案：在后台引入 TipTap 富文本编辑器替换上述字段的输入组件，内容以 HTML 字符串存储；前台使用 `dangerouslySetInnerHTML` 渲染 HTML 内容，同时兼容已有的纯文本数据。

### 库选型：TipTap

选择 TipTap 作为富文本编辑器库，理由如下：
- 基于 ProseMirror，稳定且可扩展
- 提供 `@tiptap/react` 官方 React 绑定，与 React 19 兼容
- 无头（headless）设计，工具栏 UI 可完全自定义，与项目现有 shadcn/ui 风格统一
- 轻量，按需引入扩展（加粗、斜体、列表、链接等）
- 输出 HTML 字符串，可直接存入现有 TEXT 字段，无需变更数据库 schema

## 术语表

- **Bug_Condition (C)**：后台文本字段使用普通输入组件，前台以纯文本方式渲染内容
- **Property (P)**：后台使用富文本编辑器输入 HTML 内容，前台正确渲染 HTML 富文本
- **Preservation**：不涉及富文本的字段（tips、步骤标题、图片路径）保持原有输入方式和渲染方式不变
- **GameDetailManage**：`src/pages/admin/GameDetailManage.tsx`，后台游戏详情编辑页面
- **GameDetail**：`src/pages/GameDetail.tsx`，前台游戏详情展示页面
- **RichTextEditor**：待创建的 TipTap 富文本编辑器封装组件

## Bug 详情

### Bug 条件

当管理员需要为游戏详情的 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 字段输入格式化内容（加粗、列表、链接等）时，系统仅提供纯文本输入组件，无法满足需求。当前台接收到包含 HTML 标签的内容时，将标签作为纯文本显示而非渲染为格式化内容。

**形式化规约：**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { fieldName: string, content: string, context: 'admin' | 'frontend' }
  OUTPUT: boolean

  richTextFields := ['introduction', 'objective', 'victoryConditions.text', 'gameplaySteps.desc']

  IF input.context == 'admin' THEN
    RETURN input.fieldName IN richTextFields
           AND currentEditor(input.fieldName) IS PlainTextInput
  END IF

  IF input.context == 'frontend' THEN
    RETURN input.fieldName IN richTextFields
           AND input.content CONTAINS htmlTags
           AND renderMethod(input.fieldName) IS PlainTextRender
  END IF

  RETURN false
END FUNCTION
```

### 示例

- 管理员在 `introduction` 字段输入 `<strong>经典</strong>桌游`，保存后前台显示为 `<strong>经典</strong>桌游`（纯文本），期望显示为 **经典**桌游
- 管理员在 `gameplaySteps.desc` 字段想输入有序列表，但 Textarea 无法创建列表格式
- 管理员在 `victoryConditions.text` 字段想加粗关键词，但 Input 组件不支持格式化
- 已有纯文本数据 `这是一段普通文本` 在修复后仍应正常显示为 `这是一段普通文本`

## 期望行为

### 保持不变的行为

**不变行为：**
- `gameplaySteps.title`（步骤标题）继续使用普通 Input 输入框
- `victoryConditions.image` 和 `gameplaySteps.image`（图片路径）继续使用普通 Input 输入框
- `tips`（新手提示）继续使用普通 Input 输入框，前台继续纯文本渲染
- 后端 API 的请求/响应格式不变，`introduction`、`objective` 仍为 `string` 类型
- 数据库 `game_details` 表结构不变，所有 TEXT 字段兼容存储 HTML 字符串
- 前台游戏基础信息（标题、标签、玩家人数、难度等）渲染不受影响
- 已有的纯文本游戏详情数据在前台仍能正确显示

**范围：**
所有不涉及 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 四个字段的输入和渲染逻辑不受此次修复影响。包括：
- 所有普通 Input/Textarea 字段的输入行为
- 鼠标点击、键盘操作等基本交互
- 后端数据校验逻辑（zod schema 仍校验 string 类型）

## 假设的根因

基于 Bug 分析，根因如下：

1. **后台组件选型不当**：`GameDetailManage.tsx` 中四个需要富文本的字段直接使用了 `Textarea` 或 `Input` 组件，这些组件只支持纯文本输入，不支持格式化操作

2. **前台渲染方式不当**：`GameDetail.tsx` 中使用 `<p>{content}</p>` 方式渲染内容，React 会将 HTML 标签转义为纯文本，而非解析为 DOM 元素

3. **缺少富文本编辑器组件**：项目中没有封装富文本编辑器组件，也没有安装相关依赖（如 TipTap）

4. **数据格式未区分**：系统未区分纯文本和 HTML 内容，前台渲染时没有根据内容类型选择不同的渲染策略

## 正确性属性

Property 1: Bug Condition - 富文本字段使用富文本编辑器并输出 HTML

_For any_ 后台编辑操作，当字段为 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 之一时，修复后的页面 SHALL 渲染 TipTap 富文本编辑器组件，且编辑器输出的内容为 HTML 字符串格式。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition - 前台正确渲染 HTML 富文本内容

_For any_ 前台渲染操作，当 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 字段内容包含 HTML 标签时，修复后的页面 SHALL 将 HTML 标签解析为对应的 DOM 元素（如 `<strong>` 渲染为加粗文本），而非显示为纯文本。

**Validates: Requirements 2.5, 2.6, 2.7, 2.8**

Property 3: Preservation - 非富文本字段保持原有行为

_For any_ 后台编辑操作，当字段为 `gameplaySteps.title`、图片路径、`tips` 时，修复后的页面 SHALL 继续使用原有的 Input/Textarea 组件，行为与修复前完全一致。

**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

Property 4: Preservation - 向后兼容纯文本数据

_For any_ 前台渲染操作，当 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 字段内容为纯文本（不含 HTML 标签）时，修复后的页面 SHALL 正确显示该纯文本内容，不产生任何视觉差异。

**Validates: Requirements 3.6, 3.7**

## 修复实现

### 所需变更

假设根因分析正确：

**新增依赖**（前端 `package.json`）：
- `@tiptap/react` - TipTap React 绑定
- `@tiptap/starter-kit` - 基础扩展包（加粗、斜体、标题、列表等）
- `@tiptap/extension-link` - 链接扩展
- `@tiptap/pm` - ProseMirror 核心依赖

**新增文件**：`src/components/RichTextEditor.tsx`

1. **创建 RichTextEditor 组件**：封装 TipTap 编辑器
   - 使用 `useEditor` hook 初始化编辑器实例
   - 配置 StarterKit（加粗、斜体、标题、有序/无序列表、引用）和 Link 扩展
   - 自定义工具栏，使用项目现有的 `Button`、`Toggle` 等 shadcn/ui 组件
   - 通过 `onUpdate` 回调输出 HTML 字符串
   - 接收 `value`（HTML 字符串）和 `onChange`（回调函数）props，兼容 react-hook-form

2. **改造 GameDetailManage.tsx**：替换四个字段的输入组件
   - `introduction`：`Textarea` → `RichTextEditor`
   - `objective`：`Textarea` → `RichTextEditor`
   - `victoryConditions[n].text`：`Input` → `RichTextEditor`
   - `gameplaySteps[n].desc`：`Textarea` → `RichTextEditor`
   - 使用 `Controller` 组件（react-hook-form）包裹 `RichTextEditor`，实现受控表单集成
   - 移除 `gameplaySteps.desc` 提交时的换行分割逻辑（HTML 内容不再需要按换行拆分为数组）

3. **改造 GameDetail.tsx**：替换四个字段的渲染方式
   - `introduction`：`<p>{content}</p>` → `<div dangerouslySetInnerHTML={{ __html: content }} />`
   - `objective`：同上
   - `victoryConditions.text`：`<span>{text}</span>` → `<div dangerouslySetInnerHTML={{ __html: text }} />`
   - `gameplaySteps.desc`：纯文本/数组渲染 → `<div dangerouslySetInnerHTML={{ __html: content }} />`
   - 为 HTML 渲染容器添加 `prose` 样式类（可选，使用 Tailwind Typography 插件美化排版）

4. **向后兼容处理**：
   - 前台渲染时，纯文本内容通过 `dangerouslySetInnerHTML` 渲染不会产生问题（纯文本不含 HTML 标签，渲染结果与直接文本渲染一致）
   - 后台编辑时，TipTap 编辑器接收纯文本内容会自动包裹为 `<p>` 标签，编辑后保存为 HTML 格式
   - `gameplaySteps.desc` 字段原有的 `string | string[]` 类型需要兼容：如果是数组，前台渲染时拼接为 HTML 段落

5. **后端无需变更**：
   - 数据库 `game_details` 表的 `introduction`、`objective` 字段为 TEXT 类型，天然支持存储 HTML 字符串
   - `victory_conditions`、`gameplay_steps` 字段为 JSON 字符串，其中的 `text`/`desc` 字段也是字符串类型，支持 HTML
   - zod schema 校验 `z.string()` 对 HTML 字符串同样有效，无需修改

## 测试策略

### 验证方法

测试策略分两阶段：先在未修复代码上验证 Bug 存在，再验证修复后的正确性和保持不变的行为。

### 探索性 Bug 条件检查

**目标**：在实施修复前，验证 Bug 确实存在，确认或否定根因分析。

**测试计划**：编写组件渲染测试，验证当前 `GameDetailManage.tsx` 中四个字段使用的是 `Textarea`/`Input` 组件，以及 `GameDetail.tsx` 中内容以纯文本方式渲染。

**测试用例**：
1. **后台 introduction 字段测试**：渲染 GameDetailManage，验证 introduction 字段为 Textarea 组件（未修复代码将通过此测试）
2. **前台 HTML 渲染测试**：渲染 GameDetail，传入包含 `<strong>` 标签的 introduction 内容，验证页面上显示的是 `<strong>` 文本而非加粗效果（未修复代码将通过此测试）
3. **后台 victoryConditions.text 字段测试**：验证该字段为 Input 组件（未修复代码将通过此测试）
4. **后台 gameplaySteps.desc 字段测试**：验证该字段为 Textarea 组件（未修复代码将通过此测试）

**预期反例**：
- 后台四个字段均为纯文本输入组件，不支持格式化
- 前台 HTML 标签被转义为纯文本显示

### 修复检查

**目标**：验证修复后，所有 Bug 条件下的输入均产生期望行为。

**伪代码：**
```
FOR ALL field IN ['introduction', 'objective', 'victoryConditions.text', 'gameplaySteps.desc'] DO
  // 后台验证
  editor := renderAdminPage(field)
  ASSERT editor IS RichTextEditor
  ASSERT editor.output IS HTMLString

  // 前台验证
  htmlContent := '<strong>测试</strong>内容'
  rendered := renderFrontendPage(field, htmlContent)
  ASSERT rendered CONTAINS <strong> DOM element
  ASSERT rendered NOT CONTAINS literal '<strong>' text
END FOR
```

### 保持不变检查

**目标**：验证修复后，所有非 Bug 条件下的行为与修复前一致。

**伪代码：**
```
FOR ALL field WHERE NOT isBugCondition(field) DO
  ASSERT renderAdminPage_original(field) = renderAdminPage_fixed(field)
  ASSERT renderFrontendPage_original(field, plainText) = renderFrontendPage_fixed(field, plainText)
END FOR
```

**测试方法**：属性测试适用于保持不变检查，因为：
- 可自动生成大量纯文本内容，验证前台渲染结果一致
- 可覆盖各种边界情况（空字符串、特殊字符、超长文本等）
- 提供强保证：所有非 Bug 输入的行为不变

**测试计划**：先在未修复代码上观察非 Bug 字段的行为，再编写属性测试验证修复后行为一致。

**测试用例**：
1. **tips 字段保持不变**：验证 tips 字段在后台仍为 Input 组件，前台仍为纯文本渲染
2. **步骤标题保持不变**：验证 gameplaySteps.title 在后台仍为 Input 组件
3. **图片路径保持不变**：验证图片路径字段在后台仍为 Input 组件
4. **纯文本向后兼容**：验证已有纯文本数据在前台渲染结果与修复前一致

### 单元测试

- 测试 RichTextEditor 组件：初始化、内容输出为 HTML、工具栏按钮功能
- 测试前台 HTML 渲染：各种 HTML 标签的正确渲染
- 测试向后兼容：纯文本内容和 `string[]` 类型 desc 的正确处理

### 属性测试

- 生成随机 HTML 内容，验证前台渲染后 DOM 结构正确
- 生成随机纯文本内容，验证前台渲染结果与修复前一致
- 生成随机表单数据，验证后台提交的 payload 格式正确

### 集成测试

- 测试完整编辑流程：后台输入富文本 → 保存 → 前台正确渲染
- 测试已有数据编辑：加载纯文本数据 → 编辑器正确显示 → 修改后保存为 HTML
- 测试表单校验：富文本字段为空时的校验提示
