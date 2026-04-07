---
inclusion: manual
---

# Incremental ESLint Check

当用户要求对增量/变更文件运行 ESLint 时，遵循以下流程。

## 步骤 1：确定增量文件范围

- 默认：`git diff --name-only` + `git diff --name-only --cached`，合并去重
- 只校验暂存：`git diff --name-only --cached`
- 对比分支：`git diff --name-only <base-branch>...HEAD`
- 无 git 时：使用当前会话中最近编辑的文件

## 步骤 2：筛选文件

只保留 `.js`、`.jsx`、`.ts`、`.tsx`、`.vue` 文件。
过滤掉 `dist/`、`build/`、`coverage/` 等构建产物。
筛选后为空则告知用户无需校验。

## 步骤 3：执行 ESLint

优先级：
1. 项目 lint 脚本（`pnpm lint -- <files>`）
2. `npx eslint <files>`

多包项目根据文件路径选择对应子项目的 lint 命令。
超长文件列表分批执行。

## 步骤 4：输出结果

- 无错误：简要说明校验通过
- 有错误/警告：按文件归类展示，不隐藏任何错误信息
