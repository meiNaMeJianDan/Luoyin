---
inclusion: manual
---

# Git Commit Helper

当用户要求生成 git 提交信息时，遵循以下规则。

## 流程

1. 分析 `git status` 和 `git diff`（已暂存 + 未暂存改动）
2. 归纳改动的核心目的（1-2 个主目标）
3. 选择合适的 Conventional Commits type
4. 构造提交信息

## Type 选择

- `feat`：新增或对外可见的功能改动
- `fix`：修复 bug 或明显错误
- `refactor`：重构代码，不改变对外行为
- `docs`：仅文档相关变更
- `test`：仅测试相关
- `chore`：构建、依赖、脚手架等杂项维护

## Scope 推断

根据改动文件路径推断模块，如 `auth`、`loan`、`ui`、`build`、`deps`。不清晰时省略。

## 输出格式

标题行：`type(scope): subject`（约 72 字符以内）

正文（可选，复杂改动时推荐）：
```
type(scope): subject

- 关键改动点 1
- 关键改动点 2
```

## 规则

- 只输出一条最合适的提交信息，不附加解释
- 标题和正文之间必须有空行
- 可使用中文、英文或混合，保证语义清晰
- 改动过多时建议用户拆分提交
