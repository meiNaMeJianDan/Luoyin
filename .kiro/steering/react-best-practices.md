---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,ts,js}"
---

# React 与 Next.js 最佳实践

来自 Vercel Engineering 的性能优化指南。编写、审查或重构 React/Next.js 代码时遵循以下规则。

## 1. 消除瀑布流（CRITICAL）

- 仅在实际用到时再 await，提前 return 的分支不要等待不需要的数据
- 独立操作用 `Promise.all()` 并行处理
- 部分依赖场景使用 `better-all` 或手动 promise 编排最大化并行
- API 路由中尽早启动 promise，延后 await
- 用 `<Suspense>` 实现内容流式加载，不要让整个页面等待单个数据源

## 2. 包体积优化（CRITICAL）

- 直接从源文件导入，避免 barrel 文件（如 `import Button from '@mui/material/Button'`）
- 大组件用 `next/dynamic` 动态导入
- 第三方分析/日志库延后加载（hydration 后），使用 `dynamic(() => ..., { ssr: false })`
- 按需加载模块（功能激活时才 import）
- 悬停/聚焦时预加载组件提升感知速度

## 3. 服务端性能（HIGH）

- Server Actions 必须做身份鉴权，像对待 API 路由一样
- 用 `React.cache()` 实现请求内去重（注意参数用同一引用）
- 跨请求缓存用 LRU cache
- 避免 RSC props 重复序列化：转换操作放客户端做
- 静态 IO（字体/Logo）提升到模块级，只加载一次
- 最小化传递到客户端的数据，只传 UI 需要的字段
- 组件重组以并行数据获取
- 用 `after()` 实现非阻塞操作（日志、分析等）

## 4. 客户端数据获取（MEDIUM-HIGH）

- 用 SWR 实现请求自动去重和缓存
- 去重全局事件监听（用 `useSWRSubscription`）
- 滚动/触摸事件用 `{ passive: true }`
- localStorage 数据需版本化并最小化存储

## 5. 重渲优化（MEDIUM）

- 派生状态在 render 阶段计算，不要用 state + effect
- 回调中用到的状态别订阅到渲染（如 searchParams 在 handler 中读取即可）
- 简单原始类型表达式不需要 useMemo
- 不要在组件体内声明子组件（会导致每次渲染重新挂载）
- memoized 组件的默认非原始类型 props 提取为常量
- 将耗时渲染提取为 memo 组件
- effect 依赖使用原始值（如 `user.id` 而非 `user`）
- 交互逻辑写到事件处理器里，不要用 state + effect 建模
- 只订阅派生布尔量，不订阅连续变化的原始值
- 用函数式 setState 保证回调稳定（`setItems(curr => ...)`）
- 用工厂函数初始化耗时状态（`useState(() => expensive())`）
- 非紧急更新用 `startTransition`
- 高频临时值用 `useRef`

## 6. 渲染性能（MEDIUM）

- SVG 动画写在外层 `<div>` 上，不直接动画 SVG 元素（启用 GPU 加速）
- 长列表用 `content-visibility: auto` 跳过屏幕外元素渲染
- 静态 JSX 提取到组件外部避免重复创建
- SVG 坐标数值降精度
- 客户端数据用行内 `<script>` 防止 hydration 闪烁
- 预期的 hydration 不匹配用 `suppressHydrationWarning`
- 用 `<Activity>` 组件统一控制显隐，保留状态和 DOM
- script 标签使用 `defer`/`async`，Next.js 中用 `<Script strategy="...">`
- 条件渲染用三元运算符，不要用 `&&`（防止渲染 `0` 或 `NaN`）
- 用 React DOM 资源提示预加载（`prefetchDNS`、`preconnect`、`preload` 等）
- 加载指示首选 `useTransition` 而非手动 useState loading

## 7. JavaScript 性能（LOW-MEDIUM）

- CSS 改动批量处理，避免读写交替导致 layout thrashing
- 多次检索用 `Map` 结构存储（O(1) 查找）
- 循环中缓存对象属性访问
- 函数结果缓存于模块级 Map
- localStorage/sessionStorage 读取做内存缓存
- 多次 `filter`/`map` 合并为一次遍历
- 数组比较前先查长度
- 有返回条件时立即 return
- 循环用到的正则提到外部（注意全局正则有 `lastIndex` 状态）
- `map` + `filter` 合并用 `flatMap`
- 求极值用循环不 sort（O(n) vs O(n log n)）
- 用 `Set`/`Map` 做 O(1) 查找
- 用 `toSorted()` 保证原数组不变（避免 `.sort()` 原地修改）

## 8. 进阶模式（LOW）

- 应用初始化只进行一次（模块级 guard，不要放 `useEffect([], ...)` 里）
- 事件处理器存于 ref 或用 `useEffectEvent` 保证订阅稳定
- 用 `useEffectEvent` 保证回调引用稳定，避免 effect 重跑

完整代码示例参考：`.cursor/skills/react-best-practices/AGENTS.md`
