# 实现计划：UNO 联机游戏

## 概述

基于现有桌游攻略网站，新增 UNO 联机游戏模块。后端在 Express 服务上集成 Socket.io，前端使用 React + Tailwind + Socket.io-client。实现顺序为：类型定义 → 核心引擎 → 房间管理 → AI 策略 → 计时器 → WebSocket 层 → 后端集成 → 前端状态管理 → 前端页面 → 动画交互。

## 任务

- [x] 1. 安装依赖并定义核心类型
  - [x] 1.1 安装后端依赖（socket.io、vitest、fast-check、socket.io-client）和前端依赖（socket.io-client）
    - 后端：`cd server && npm install socket.io && npm install -D vitest fast-check socket.io-client`
    - 前端：`npm install socket.io-client`
    - _需求：10.1_

  - [x] 1.2 创建 `server/src/uno/types.ts`，定义所有核心类型
    - 定义 CardColor、CardType、CardValue、Card、Player、Direction、GamePhase、GameState、RoomStatus、Room、ChallengeResult、AiDecision、ClientGameState、ClientPlayer 等类型
    - 导出所有类型供其他模块使用
    - _需求：1.1_

- [ ] 2. 实现 Game Engine 核心逻辑
  - [x] 2.1 创建 `server/src/uno/engine.ts`，实现牌组初始化和洗牌
    - 实现 `createDeck()`：生成标准 108 张 UNO 牌（76 张数字牌 + 24 张功能牌 + 8 张万能牌）
    - 实现 `shuffleDeck()`：Fisher-Yates 洗牌算法
    - 实现 `reshuffleDiscardToDraw()`：弃牌堆重洗到摸牌堆（保留堆顶牌）
    - _需求：1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 编写属性测试：洗牌排列不变量
    - **属性 1：洗牌排列不变量**
    - **验证需求：1.3**

  - [ ]* 2.3 编写属性测试：重洗弃牌堆保持牌总量不变
    - **属性 2：重洗弃牌堆保持牌总量不变**
    - **验证需求：1.4**

  - [x] 2.4 实现出牌合法性判断
    - 实现 `isValidPlay()`：判断单张牌是否可出（同色/同值/万能牌）
    - 实现 `getPlayableCards()`：获取手牌中所有可出的牌
    - _需求：3.1, 3.2_

  - [ ]* 2.5 编写属性测试：出牌合法性判断一致性
    - **属性 4：出牌合法性判断一致性**
    - **验证需求：3.1, 3.2**

  - [x] 2.6 实现出牌和摸牌操作
    - 实现 `playCard()`：执行出牌，更新游戏状态，处理 Wild 牌颜色选择
    - 实现 `drawCard()`：从摸牌堆取牌，必要时触发重洗弃牌堆
    - 实现 `advanceTurn()`：推进到下一回合
    - _需求：3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.7 编写属性测试：出牌状态转换不变量
    - **属性 5：出牌状态转换不变量**
    - **验证需求：3.3, 3.5**

  - [ ]* 2.8 编写属性测试：摸牌状态转换不变量
    - **属性 6：摸牌状态转换不变量**
    - **验证需求：3.6**

  - [x] 2.9 实现功能牌效果处理
    - 实现 `applyActionEffect()`：处理 Skip（跳过）、Reverse（反转，2 人时等同 Skip）、Draw_Two（+2 摸牌并跳过）、Wild（指定颜色）、Wild_Draw_Four（指定颜色 + 摸 4 + 跳过）
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 2.10 编写属性测试：功能牌效果正确性
    - **属性 7：功能牌效果正确性**
    - **验证需求：4.1, 4.2, 4.3, 4.4**

  - [x] 2.11 实现 Wild+4 质疑机制
    - 实现 `checkChallenge()`：检查出牌方是否持有同色牌，质疑成功出牌方摸 4 张，质疑失败质疑方摸 6 张
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.12 编写属性测试：Wild+4 质疑机制正确性
    - **属性 8：Wild+4 质疑机制正确性**
    - **验证需求：5.2, 5.3, 5.4**

  - [x] 2.13 实现游戏初始化和胜利判定
    - 实现 `initGame()`：发牌（每人 7 张）、翻起始牌（Wild_Draw_Four 重翻）、处理起始牌为 Wild/Action 的特殊效果、随机选择首位出牌者
    - 实现 `checkWinner()`：检查是否有玩家手牌为 0
    - 实现 `toClientGameState()`：将完整游戏状态转换为客户端可见状态（隐藏其他玩家手牌）
    - _需求：2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.1, 10.5_

  - [ ]* 2.14 编写属性测试：游戏初始化不变量
    - **属性 3：游戏初始化不变量**
    - **验证需求：2.2, 2.3, 2.4, 2.7**

  - [ ]* 2.15 编写属性测试：胜利判定正确性
    - **属性 9：胜利判定正确性**
    - **验证需求：8.1**

  - [ ]* 2.16 编写属性测试：客户端游戏状态手牌隐藏
    - **属性 11：客户端游戏状态手牌隐藏**
    - **验证需求：10.5**

  - [x] 2.17 实现 UNO 喊牌与举报逻辑
    - 在 engine 中实现 UNO 喊牌状态管理（calledUno 标记）
    - 实现举报逻辑：检查被举报玩家是否已喊 UNO，未喊则罚摸 2 张
    - 实现举报时间窗口：下一位玩家操作后不再接受举报
    - _需求：6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 3. 检查点 - 确保 Game Engine 核心逻辑完整
  - 确保所有测试通过，如有问题请与用户讨论。

- [ ] 4. 实现 Room Manager 房间管理
  - [x] 4.1 创建 `server/src/uno/room.ts`，实现房间生命周期管理
    - 使用 Map 存储所有房间
    - 实现 `createRoom()`：生成唯一 6 位数字房间号，创建者为房主
    - 实现 `joinRoom()`：校验房间存在、未满员、未开始游戏，校验昵称长度 2～8 字符
    - 实现 `leaveRoom()`：玩家离开房间，房主离开时转移房主
    - 实现 `toggleReady()`：切换准备状态
    - 实现 `canStartGame()`：检查所有玩家已准备且人数 2～4
    - 实现 `getRoom()`：获取房间信息
    - _需求：9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ]* 4.2 编写属性测试：开始游戏条件判断
    - **属性 10：开始游戏条件判断**
    - **验证需求：2.1, 9.8**

  - [x] 4.3 实现断线重连逻辑
    - 实现 `handleDisconnect()`：标记玩家掉线，游戏中保留位置 120 秒，房间页面 30 秒后移除
    - 实现 `handleReconnect()`：恢复玩家状态，更新 socketId
    - _需求：11.1, 11.2, 11.4, 11.5, 11.6_

- [ ] 5. 实现 AI Player 策略
  - [x] 5.1 创建 `server/src/uno/ai.ts`，实现 AI 出牌策略
    - 实现 `aiDecide()`：按优先级出牌（同色 > 同值 > Wild > Wild_Draw_Four），无牌可出则摸牌
    - 实现 `aiChooseColor()`：选择手牌中数量最多的颜色
    - 实现 `aiShouldChallenge()`：始终返回 false（不质疑）
    - AI 手牌剩余 1 张时自动喊 UNO
    - _需求：12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 5.2 编写属性测试：AI 颜色选择最优性
    - **属性 12：AI 颜色选择最优性**
    - **验证需求：12.3**

- [ ] 6. 实现计时器管理
  - [x] 6.1 创建 `server/src/uno/timer.ts`，实现回合超时管理
    - 实现回合超时（30 秒）：超时自动摸牌并传递回合
    - 实现颜色选择超时（15 秒）：超时随机指定颜色
    - 实现质疑决策超时（10 秒）：超时默认接受
    - 实现 AI 操作延迟（2～4 秒随机）
    - _需求：7.1, 7.2, 7.3, 7.4, 7.5, 12.1_

- [x] 7. 检查点 - 确保后端核心模块完整
  - 确保所有测试通过，如有问题请与用户讨论。

- [ ] 8. 实现 WebSocket 事件处理层并集成到 Express
  - [x] 8.1 创建 `server/src/uno/socket.ts`，实现 Socket.io 事件注册
    - 实现 `initSocketServer()`：初始化 Socket.io Server，配置 CORS
    - 注册所有客户端到服务端事件处理：create_room、join_room、leave_room、player_ready、start_game、play_card、draw_card、call_uno、report_uno、choose_color、challenge_wild4、accept_wild4
    - 对所有事件进行参数校验（使用 zod）
    - 实现游戏状态广播：每位玩家仅能看到自己的手牌详情
    - 实现断线检测（disconnect 事件）和重连处理
    - 实现 AI 托管触发：掉线玩家轮到时自动执行 AI 操作
    - _需求：10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 11.1, 11.3, 11.4, 11.5_

  - [x] 8.2 修改 `server/src/index.ts`，集成 Socket.io
    - 将 Express app 包装为 HTTP server（`createServer(app)`）
    - 调用 `initSocketServer(httpServer)` 初始化 Socket.io
    - 改用 `httpServer.listen()` 替代 `app.listen()`
    - _需求：10.1_

- [x] 9. 检查点 - 确保后端 WebSocket 层完整
  - 确保所有测试通过，如有问题请与用户讨论。

- [ ] 10. 实现前端状态管理和 Socket 连接
  - [x] 10.1 创建 `src/pages/uno/context/GameContext.tsx`，定义游戏状态 Context
    - 定义前端使用的类型（复用后端 types 中的 ClientGameState、ClientPlayer、Card 等）
    - 实现 useReducer 管理游戏状态，定义所有 action 类型
    - 提供 GameProvider 和 useGameContext hook
    - _需求：10.5, 15.1, 15.2, 15.3_

  - [x] 10.2 创建 `src/pages/uno/hooks/useSocket.ts`，实现 Socket.io 连接管理
    - 建立与后端的 Socket.io 连接
    - 实现连接状态管理（connected/disconnected）
    - 实现自动重连和心跳检测
    - 使用 localStorage 存储房间号和玩家标识用于重连
    - _需求：11.7, 17.5_

  - [x] 10.3 创建 `src/pages/uno/hooks/useGame.ts`，实现游戏操作 hook
    - 封装所有游戏操作：playCard、drawCard、callUno、reportUno、challengeWild4、acceptWild4、chooseColor
    - 监听所有服务端事件并更新 Context 状态
    - 处理错误事件，使用 sonner toast 显示错误消息
    - _需求：10.3, 10.4_

- [ ] 11. 实现前端游戏首页和房间页面
  - [x] 11.1 创建 `src/pages/uno/index.tsx`，实现 UNO 游戏首页
    - 显示游戏标题和简要规则说明
    - 实现"创建房间"按钮，点击弹出昵称输入框
    - 实现"加入房间"输入框（6 位数字校验）和加入按钮，点击弹出昵称输入框
    - 昵称校验：2～8 个字符
    - 错误提示：房间不存在/房间已满/游戏已开始
    - _需求：13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 11.2 创建 `src/pages/uno/Room.tsx`，实现房间页面
    - 顶部显示房间号，提供一键复制功能
    - 显示玩家列表（昵称、准备状态），空位显示"等待加入"
    - 实现"准备/取消准备"按钮
    - 房主可见"开始游戏"按钮（所有人准备且人数 ≥ 2 时激活）
    - 实现"离开房间"按钮
    - 实时更新玩家加入/离开
    - _需求：14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x] 11.3 修改 `src/App.tsx`，添加 `/uno` 相关路由
    - 添加 `/uno`（首页）、`/uno/room/:roomId`（房间页）、`/uno/game/:roomId`（游戏页）、`/uno/result/:roomId`（结算页）路由
    - _需求：13.1_

  - [x] 11.4 修改 `vite.config.ts`，添加 WebSocket 代理配置
    - 新增 `/socket.io` 代理到 `http://localhost:3001`，启用 ws
    - _需求：10.1_

- [ ] 12. 检查点 - 确保前端基础页面和路由正常
  - 确保所有测试通过，如有问题请与用户讨论。

- [ ] 13. 实现前端游戏页面核心组件
  - [x] 13.1 创建 `src/pages/uno/components/CardView.tsx`，实现单张牌渲染
    - 根据牌的颜色、类型、值渲染对应的卡牌样式
    - 支持高亮（可出）和灰显（不可出）状态
    - 支持牌背面渲染（其他玩家手牌）
    - _需求：15.2_

  - [x] 13.2 创建 `src/pages/uno/components/HandCards.tsx`，实现手牌区域
    - 在页面底部展示当前玩家手牌
    - 可出的牌高亮，不可出的牌灰显
    - 点击可出的牌发送出牌请求
    - _需求：15.2, 15.5_

  - [x] 13.3 创建 `src/pages/uno/components/DiscardPile.tsx` 和 `DrawPile.tsx`
    - DiscardPile：显示弃牌堆堆顶牌
    - DrawPile：显示摸牌堆（牌背面），点击发送摸牌请求
    - _需求：15.1, 15.6_

  - [x] 13.4 创建 `src/pages/uno/components/PlayerInfo.tsx`，实现其他玩家信息展示
    - 显示昵称、手牌数量、是否为当前回合
    - 当前回合玩家高亮显示
    - _需求：15.3, 15.4_

  - [x] 13.5 创建 `src/pages/uno/components/ColorPicker.tsx`，实现颜色选择弹窗
    - 出 Wild/Wild_Draw_Four 时弹出
    - 提供红/黄/蓝/绿四个颜色选项
    - _需求：15.7_

  - [x] 13.6 创建 `src/pages/uno/components/ChallengeDialog.tsx`，实现质疑决策弹窗
    - 上一位玩家出 Wild_Draw_Four 时弹出
    - 提供"接受"和"质疑"两个选项
    - _需求：15.8_

  - [x] 13.7 创建 `src/pages/uno/components/UnoButton.tsx`，实现 UNO 喊牌按钮
    - 手牌剩余 2 张且出牌后将剩余 1 张时显示
    - 3 秒内可点击喊 UNO
    - _需求：15.9, 6.1_

  - [x] 13.8 创建 `src/pages/uno/components/GameMessages.tsx`，实现消息提示区域
    - 展示出牌、摸牌、喊 UNO、举报、质疑等操作的实时消息
    - _需求：15.11_

  - [x] 13.9 创建 `src/pages/uno/components/DirectionIndicator.tsx`，实现出牌方向指示
    - 显示当前出牌方向（顺时针/逆时针）
    - _需求：15.10_

- [ ] 14. 实现前端游戏主页面
  - [x] 14.1 创建 `src/pages/uno/Game.tsx`，组装游戏页面
    - 页面中央：弃牌堆和摸牌堆
    - 页面底部：当前玩家手牌
    - 页面其他位置：其他玩家信息
    - 当前回合高亮提示和倒计时显示
    - 集成颜色选择弹窗、质疑决策弹窗、UNO 喊牌按钮、消息提示区域、方向指示
    - 支持移动端响应式布局
    - _需求：15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9, 15.10, 15.11, 17.4_

- [ ] 15. 实现前端结算页面
  - [x] 15.1 创建 `src/pages/uno/Result.tsx`，实现结算页面
    - 游戏结束时自动跳转
    - 显示胜利者昵称和胜利动画效果
    - 显示所有玩家排名和剩余手牌数量
    - 提供"再来一局"按钮（返回房间页面）
    - 提供"返回首页"按钮（退出房间，返回 /uno）
    - _需求：16.1, 16.2, 16.3, 16.4, 16.5_

- [ ] 16. 检查点 - 确保前端游戏页面和结算页面完整
  - 确保所有测试通过，如有问题请与用户讨论。

- [ ] 17. 实现前端动画与交互体验
  - [x] 17.1 实现出牌和摸牌动画
    - 出牌时：手牌移动到弃牌堆的过渡动画
    - 摸牌时：牌从摸牌堆移动到手牌区域的过渡动画
    - _需求：17.1, 17.2_

  - [x] 17.2 实现功能牌视觉效果
    - Skip：显示禁止图标
    - Reverse：显示方向切换动画
    - +2/+4：显示摸牌数量提示
    - _需求：17.3_

  - [x] 17.3 实现连接状态提示
    - WebSocket 连接异常时显示"连接中断，正在重连"提示
    - _需求：17.5_

- [x] 18. 最终检查点 - 确保所有功能完整
  - 确保所有测试通过，如有问题请与用户讨论。

## 备注

- 标记 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务引用了对应的需求编号，确保需求全覆盖
- 检查点用于阶段性验证，确保增量开发的正确性
- 属性测试验证核心游戏逻辑的正确性属性
- 单元测试验证具体场景和边界情况
