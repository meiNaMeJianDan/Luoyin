# 实现计划

- [ ] 1. 编写 Bug 条件探索性测试
  - **Property 1: Bug Condition** - 富文本字段使用纯文本输入组件且前台以纯文本渲染 HTML
  - **重要**: 此测试必须在实施修复之前编写
  - **关键**: 此测试在未修复代码上必须失败——失败即确认 Bug 存在
  - **不要**在测试失败时尝试修复测试或代码
  - **说明**: 此测试编码了期望行为——修复后测试通过即验证修复正确
  - **目标**: 产生反例，证明 Bug 存在
  - **Scoped PBT 方法**: 针对确定性 Bug，将属性范围限定到具体失败用例以确保可复现
  - 测试后台 `GameDetailManage` 组件：验证 `introduction`、`objective`、`victoryConditions.text`、`gameplaySteps.desc` 四个字段当前使用的是 `Textarea`/`Input` 纯文本组件（来自设计文档 Bug Condition）
  - 测试前台 `GameDetail` 组件：传入包含 `<strong>测试</strong>` 的 HTML 内容，验证页面将 HTML 标签作为纯文本显示而非渲染为 DOM 元素
  - 测试断言应匹配设计文档中的期望行为属性：后台应渲染 RichTextEditor 组件，前台应将 HTML 标签解析为 DOM 元素
  - 在未修复代码上运行测试
  - **预期结果**: 测试失败（这是正确的——证明 Bug 存在）
  - 记录发现的反例以理解根因（如：`introduction` 字段渲染为 `<textarea>` 而非富文本编辑器；前台 `<strong>` 标签显示为纯文本）
  - 任务完成标准：测试已编写、已运行、失败已记录
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 2. 编写保持不变行为的属性测试（在实施修复之前）
  - **Property 2: Preservation** - 非富文本字段保持原有输入方式和渲染方式
  - **重要**: 遵循观察优先方法论
  - 观察：在未修复代码上，`tips` 字段在后台使用 `Input` 组件，前台以纯文本渲染
  - 观察：在未修复代码上，`gameplaySteps.title` 字段在后台使用 `Input` 组件
  - 观察：在未修复代码上，`victoryConditions.image` 和 `gameplaySteps.image` 字段在后台使用 `Input` 组件
  - 观察：在未修复代码上，纯文本内容（如 `这是一段普通文本`）在前台正确显示为纯文本
  - 编写属性测试：对所有非富文本字段（`tips`、`gameplaySteps.title`、图片路径），验证后台仍使用 `Input` 组件（来自设计文档 Preservation Requirements）
  - 编写属性测试：对纯文本内容，验证前台渲染结果与修复前一致（向后兼容）
  - 属性测试自动生成多种测试用例，提供更强的保持不变保证
  - 在未修复代码上运行测试
  - **预期结果**: 测试通过（确认需要保持的基线行为）
  - 任务完成标准：测试已编写、已运行、在未修复代码上通过
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_

- [ ] 3. 修复富文本编辑器 Bug

  - [x] 3.1 安装 TipTap 依赖
    - 安装 `@tiptap/react`、`@tiptap/starter-kit`、`@tiptap/extension-link`、`@tiptap/pm`
    - 使用 `pnpm add` 命令安装到前端项目
    - 验证依赖安装成功且无版本冲突
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.2 创建 RichTextEditor 组件
    - 新建 `src/components/RichTextEditor.tsx`
    - 使用 `useEditor` hook 初始化 TipTap 编辑器实例
    - 配置 StarterKit 扩展（加粗、斜体、标题、有序/无序列表、引用）和 Link 扩展
    - 自定义工具栏 UI，使用项目现有的 shadcn/ui `Button`、`Toggle` 组件，保持风格统一
    - 通过 `onUpdate` 回调输出 HTML 字符串
    - 接收 `value`（HTML 字符串）和 `onChange`（回调函数）props
    - 兼容 react-hook-form 的 `Controller` 组件使用方式
    - 纯文本内容传入时，TipTap 自动包裹为 `<p>` 标签（向后兼容）
    - _Bug_Condition: isBugCondition(input) where input.fieldName IN richTextFields AND currentEditor IS PlainTextInput_
    - _Expected_Behavior: 后台富文本字段渲染 TipTap 编辑器，输出 HTML 字符串_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 改造 GameDetailManage.tsx 后台编辑页面
    - 导入 `RichTextEditor` 组件和 react-hook-form 的 `Controller`
    - `introduction` 字段：将 `Textarea` 替换为 `Controller` + `RichTextEditor`
    - `objective` 字段：将 `Textarea` 替换为 `Controller` + `RichTextEditor`
    - `victoryConditions[n].text` 字段：将 `Input` 替换为 `Controller` + `RichTextEditor`
    - `gameplaySteps[n].desc` 字段：将 `Textarea` 替换为 `Controller` + `RichTextEditor`
    - 更新 `gameplaySteps.desc` 的 Label，移除「换行将转为多段」提示
    - 移除 `onSubmit` 中 `gameplaySteps.desc` 的换行分割逻辑（`desc.includes('\n')` 分支），HTML 内容直接作为字符串提交
    - 保持 `gameplaySteps.title`、图片路径、`tips` 字段继续使用原有 `Input` 组件不变
    - _Bug_Condition: isBugCondition(input) where context='admin' AND fieldName IN richTextFields_
    - _Expected_Behavior: 四个富文本字段使用 RichTextEditor，其余字段保持 Input/Textarea_
    - _Preservation: tips、gameplaySteps.title、图片路径字段保持原有 Input 组件_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 3.4 改造 GameDetail.tsx 前台展示页面
    - `introduction` 字段：将 `<p>{gameDetails.introduction}</p>` 替换为 `<div dangerouslySetInnerHTML={{ __html: gameDetails.introduction }} />`
    - `objective` 字段：将 `<p>{gameDetails.objective}</p>` 替换为 `<div dangerouslySetInnerHTML={{ __html: gameDetails.objective }} />`
    - `victoryConditions.text` 字段：将 `<span>{condition.text}</span>` 替换为 `<span dangerouslySetInnerHTML={{ __html: condition.text || '' }} />`
    - `gameplaySteps.desc` 字段：将纯文本/数组渲染逻辑替换为 `<div dangerouslySetInnerHTML={{ __html: Array.isArray(step.desc) ? step.desc.join('') : step.desc }} />`
    - 向后兼容：纯文本内容通过 `dangerouslySetInnerHTML` 渲染不会产生视觉差异
    - 保持 `tips` 字段继续以纯文本方式渲染不变
    - _Bug_Condition: isBugCondition(input) where context='frontend' AND content CONTAINS htmlTags_
    - _Expected_Behavior: HTML 标签解析为 DOM 元素，纯文本内容正常显示_
    - _Preservation: tips 字段保持纯文本渲染，游戏基础信息渲染不受影响_
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 3.5, 3.6, 3.7_

  - [ ] 3.5 验证 Bug 条件探索性测试现在通过
    - **Property 1: Expected Behavior** - 富文本字段使用富文本编辑器并输出 HTML，前台正确渲染 HTML
    - **重要**: 重新运行任务 1 中的同一测试——不要编写新测试
    - 任务 1 的测试编码了期望行为
    - 当此测试通过时，确认期望行为已满足
    - 运行任务 1 的 Bug 条件探索性测试
    - **预期结果**: 测试通过（确认 Bug 已修复）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 3.6 验证保持不变行为测试仍然通过
    - **Property 2: Preservation** - 非富文本字段保持原有行为
    - **重要**: 重新运行任务 2 中的同一测试——不要编写新测试
    - 运行任务 2 的保持不变属性测试
    - **预期结果**: 测试通过（确认无回归）
    - 确认修复后所有保持不变测试仍然通过

- [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题与用户讨论。
