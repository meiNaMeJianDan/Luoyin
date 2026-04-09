# 需求文档

## 简介

本项目为现有桌游攻略网站新增一个在线 UNO 联机游戏模块。玩家无需登录，通过房间号即可创建或加入游戏房间，支持 2～4 人实时对战。游戏基于官方 UNO 规则，使用 WebSocket（Socket.io）实现实时状态同步。支持掉线重连、AI 托管补位、功能牌连锁、Wild+4 质疑等完整机制。前端使用 React + Tailwind + Socket.io-client，后端在现有 Express 服务基础上集成 Socket.io。

## 术语表

- **Game_Engine**: 服务端游戏核心逻辑引擎，负责牌组管理、出牌合法性判断、功能牌效果执行、回合流转、胜利判定等
- **Room_Manager**: 服务端房间管理模块，负责房间的创建、加入、退出、状态维护
- **WS_Server**: 服务端 WebSocket 通信层，基于 Socket.io，负责接收客户端事件并广播游戏状态
- **WS_Client**: 前端 WebSocket 客户端，基于 Socket.io-client，负责与服务端建立连接并收发事件
- **Game_UI**: 前端游戏界面，包括首页、房间页、游戏页、结算页
- **Deck**: 一副完整的 UNO 牌组，共 108 张牌
- **Number_Card**: 数字牌，红/黄/蓝/绿四色各含 0（1张）和 1-9（各2张），共 76 张
- **Action_Card**: 功能牌，包括 Skip（跳过）、Reverse（反转）、Draw_Two（+2），每色各 2 张，共 24 张
- **Wild_Card**: 万能牌，包括 Wild（指定颜色）4 张和 Wild_Draw_Four（指定颜色+摸4）4 张，共 8 张
- **Discard_Pile**: 弃牌堆，玩家出的牌放置于此，堆顶牌决定下一位玩家的出牌条件
- **Draw_Pile**: 摸牌堆，玩家无法出牌时从此处摸牌
- **Player**: 游戏中的参与者，可以是真人玩家或 AI 托管
- **AI_Player**: AI 控制的玩家，用于掉线托管或补位
- **Room**: 游戏房间，通过 6 位数字房间号标识，包含 2～4 名玩家
- **Turn**: 当前回合，指示轮到哪位玩家操作
- **UNO_Call**: 玩家手牌剩余 1 张时的喊牌行为
- **Challenge**: 对 Wild_Draw_Four 出牌的质疑行为

## 需求

### 需求 1：牌组数据模型与初始化

**用户故事：** 作为开发者，我希望有一个准确的 UNO 牌组数据模型和初始化逻辑，以便游戏能基于标准规则正确运行。

#### 验收标准

1. THE Game_Engine SHALL 定义 UNO 牌的数据结构，每张牌包含唯一标识（id）、颜色（color：red/yellow/blue/green/wild）、类型（type：number/action/wild）、值（value：0-9/skip/reverse/draw_two/wild/wild_draw_four）
2. WHEN Game_Engine 初始化一副 Deck 时，THE Game_Engine SHALL 生成恰好 108 张牌：76 张 Number_Card（每色 0 各 1 张、1-9 各 2 张）、24 张 Action_Card（Skip/Reverse/Draw_Two 每色各 2 张）、8 张 Wild_Card（Wild 4 张、Wild_Draw_Four 4 张）
3. WHEN Game_Engine 初始化 Deck 时，THE Game_Engine SHALL 使用随机洗牌算法（Fisher-Yates）对牌组进行充分随机化
4. WHEN Draw_Pile 中的牌全部摸完时，THE Game_Engine SHALL 将 Discard_Pile 中除堆顶牌以外的所有牌重新洗牌后放回 Draw_Pile
5. IF 重新洗牌后 Draw_Pile 仍然为空（仅剩堆顶 1 张牌），THEN THE Game_Engine SHALL 跳过摸牌操作并将回合传递给下一位 Player

### 需求 2：游戏初始化与发牌流程

**用户故事：** 作为玩家，我希望游戏开始时能自动发牌并翻出起始牌，以便按照标准 UNO 规则开始游戏。

#### 验收标准

1. WHEN 房间内所有 Player 均已准备且人数在 2～4 人之间时，THE Game_Engine SHALL 允许房主发起开始游戏
2. WHEN 游戏开始时，THE Game_Engine SHALL 从洗好的 Deck 中为每位 Player 发放 7 张手牌
3. WHEN 发牌完成后，THE Game_Engine SHALL 从 Draw_Pile 翻出 1 张牌作为 Discard_Pile 的起始牌
4. IF 起始牌为 Wild_Draw_Four，THEN THE Game_Engine SHALL 将该牌放回 Deck 重新洗牌并重新翻出起始牌，直到起始牌不是 Wild_Draw_Four
5. IF 起始牌为 Wild_Card，THEN THE Game_Engine SHALL 将该牌视为无色牌，第一位 Player 可以出任意牌
6. IF 起始牌为 Action_Card（Skip/Reverse/Draw_Two），THEN THE Game_Engine SHALL 对第一位 Player 执行该功能牌的效果
7. WHEN 游戏开始后，THE Game_Engine SHALL 随机选择一位 Player 作为第一个出牌者，并按顺时针方向确定出牌顺序

### 需求 3：出牌规则与合法性判断

**用户故事：** 作为玩家，我希望系统能自动判断哪些牌可以出，以便我快速做出决策。

#### 验收标准

1. THE Game_Engine SHALL 判定一张牌为合法出牌，当且仅当满足以下条件之一：该牌颜色与 Discard_Pile 堆顶牌颜色相同、该牌数值或功能与堆顶牌相同、该牌为 Wild_Card 或 Wild_Draw_Four
2. WHEN 轮到某位 Player 出牌时，THE Game_Engine SHALL 检查该 Player 手牌中所有牌的合法性，并将结果同步给该 Player 的客户端
3. WHEN Player 出牌时，THE Game_Engine SHALL 验证该牌是否在 Player 手牌中且满足合法出牌条件
4. IF Player 提交了不合法的出牌请求，THEN THE Game_Engine SHALL 拒绝该操作并向该 Player 发送错误提示
5. WHEN Player 成功出牌后，THE Game_Engine SHALL 将该牌从 Player 手牌移至 Discard_Pile 堆顶，并广播更新后的游戏状态给所有 Player
6. WHEN Player 无法出牌时，THE Player SHALL 从 Draw_Pile 摸 1 张牌
7. WHEN Player 摸牌后，IF 摸到的牌可以合法出牌，THEN THE Game_Engine SHALL 允许 Player 选择立即出该牌或保留在手中

### 需求 4：功能牌效果处理

**用户故事：** 作为玩家，我希望功能牌能按照标准 UNO 规则正确生效，以便游戏策略性和趣味性得到保障。

#### 验收标准

1. WHEN Player 出 Skip 牌时，THE Game_Engine SHALL 跳过下一位 Player 的回合，将 Turn 传递给再下一位 Player
2. WHEN Player 出 Reverse 牌时，THE Game_Engine SHALL 反转当前出牌方向（顺时针变逆时针，或逆时针变顺时针）
3. WHILE 游戏仅有 2 名 Player 时，WHEN Player 出 Reverse 牌时，THE Game_Engine SHALL 将 Reverse 视为 Skip，跳过对方回合
4. WHEN Player 出 Draw_Two 牌时，THE Game_Engine SHALL 使下一位 Player 从 Draw_Pile 摸 2 张牌并跳过该 Player 的出牌回合
5. WHEN Player 出 Wild_Card 时，THE Game_Engine SHALL 要求该 Player 指定一种颜色（red/yellow/blue/green），后续出牌以该颜色为基准
6. WHEN Player 出 Wild_Draw_Four 时，THE Game_Engine SHALL 要求该 Player 指定一种颜色，并使下一位 Player 从 Draw_Pile 摸 4 张牌并跳过该 Player 的出牌回合

### 需求 5：Wild+4 质疑机制

**用户故事：** 作为玩家，我希望能对对手的 Wild+4 出牌发起质疑，以便防止对手滥用 Wild+4。

#### 验收标准

1. WHEN 上一位 Player 出了 Wild_Draw_Four 时，THE Game_Engine SHALL 在下一位 Player 摸牌前提供质疑选项，允许该 Player 选择"接受"或"质疑"
2. WHEN Player 选择质疑时，THE Game_Engine SHALL 检查出 Wild_Draw_Four 的 Player 在出牌时手中是否持有与 Discard_Pile 前一张堆顶牌颜色相同的牌
3. IF 质疑成功（出牌方手中持有同色牌），THEN THE Game_Engine SHALL 使出 Wild_Draw_Four 的 Player 摸 4 张牌，质疑方不摸牌且正常进行回合
4. IF 质疑失败（出牌方手中无同色牌），THEN THE Game_Engine SHALL 使质疑方摸 6 张牌（原 4 张加罚 2 张）并跳过质疑方的出牌回合
5. THE Game_Engine SHALL 在质疑判定过程中向所有 Player 展示质疑结果，但仅向质疑方短暂展示被质疑方的手牌信息
6. WHEN Player 选择接受 Wild_Draw_Four 时，THE Game_Engine SHALL 使该 Player 摸 4 张牌并跳过其出牌回合

### 需求 6：UNO 喊牌与举报机制

**用户故事：** 作为玩家，我希望在手牌剩余 1 张时能喊 UNO，并能举报忘记喊 UNO 的对手，以便增加游戏的互动性。

#### 验收标准

1. WHEN Player 出牌后手牌剩余 1 张时，THE Game_UI SHALL 显示 UNO 喊牌按钮，允许 Player 在出牌的同时或出牌后 3 秒内点击喊 UNO
2. WHEN Player 成功喊 UNO 时，THE WS_Server SHALL 向所有 Player 广播该 Player 的 UNO_Call 状态
3. IF Player 手牌剩余 1 张且未在 3 秒内喊 UNO，THEN 其他 Player 可以通过点击举报按钮对该 Player 发起举报
4. WHEN 举报成功时（被举报 Player 确实未喊 UNO），THE Game_Engine SHALL 使被举报的 Player 从 Draw_Pile 摸 2 张罚牌
5. IF 被举报的 Player 已经喊过 UNO，THEN THE Game_Engine SHALL 忽略该举报请求
6. WHEN 下一位 Player 已经开始操作（出牌或摸牌）后，THE Game_Engine SHALL 不再接受对上一位 Player 的举报

### 需求 7：回合管理与超时处理

**用户故事：** 作为玩家，我希望游戏有合理的超时机制，以便防止某位玩家长时间不操作导致游戏卡住。

#### 验收标准

1. THE Game_Engine SHALL 为每个 Turn 设置 30 秒的操作超时时间
2. WHEN Turn 开始时，THE WS_Server SHALL 向所有 Player 同步当前回合信息，包括当前操作 Player、剩余时间、出牌方向
3. IF Player 在 30 秒内未完成操作，THEN THE Game_Engine SHALL 自动为该 Player 执行摸牌操作并将 Turn 传递给下一位 Player
4. WHEN 需要 Player 选择颜色（Wild_Card/Wild_Draw_Four）时，THE Game_Engine SHALL 为颜色选择设置 15 秒超时，超时后随机指定一种颜色
5. WHEN 需要 Player 决定是否质疑 Wild_Draw_Four 时，THE Game_Engine SHALL 为质疑决定设置 10 秒超时，超时后默认选择接受

### 需求 8：胜利判定与游戏结束

**用户故事：** 作为玩家，我希望在有人出完所有手牌时游戏能正确结束并展示结果，以便我了解游戏结果。

#### 验收标准

1. WHEN Player 出完手中最后一张牌时，THE Game_Engine SHALL 判定该 Player 为本局游戏的胜利者
2. WHEN 胜利者确定后，THE Game_Engine SHALL 立即结束游戏并通过 WS_Server 向所有 Player 广播游戏结束事件，包含胜利者信息
3. WHEN 游戏结束后，THE Game_UI SHALL 展示结算页面，显示胜利者昵称和所有 Player 的剩余手牌数量
4. WHEN 结算页面展示后，THE Game_UI SHALL 提供"再来一局"按钮，点击后所有 Player 返回房间页面并保持在同一 Room 中
5. IF 游戏过程中所有其他 Player 均已退出（仅剩 1 名真人 Player），THEN THE Game_Engine SHALL 判定剩余 Player 为胜利者并结束游戏

### 需求 9：房间系统

**用户故事：** 作为玩家，我希望能方便地创建或加入游戏房间，以便与朋友一起玩 UNO。

#### 验收标准

1. WHEN Player 在首页点击"创建房间"时，THE Room_Manager SHALL 生成一个唯一的 6 位数字房间号并创建 Room，该 Player 自动成为房主
2. WHEN Player 输入 6 位数字房间号并点击"加入房间"时，THE Room_Manager SHALL 验证房间是否存在且未满员（少于 4 人），验证通过后将 Player 加入该 Room
3. IF Player 尝试加入不存在的 Room，THEN THE Room_Manager SHALL 返回"房间不存在"的错误提示
4. IF Player 尝试加入已满员的 Room（已有 4 名 Player），THEN THE Room_Manager SHALL 返回"房间已满"的错误提示
5. IF Player 尝试加入已开始游戏的 Room，THEN THE Room_Manager SHALL 返回"游戏已开始"的错误提示
6. WHEN Player 进入 Room 后，THE Game_UI SHALL 显示房间页面，包含房间号、当前玩家列表、每位玩家的准备状态
7. THE Room_Manager SHALL 要求每位 Player 在加入房间时输入昵称（2～8 个字符）
8. WHEN 房间内所有 Player 均已准备且人数达到 2 人及以上时，THE Game_UI SHALL 允许房主点击"开始游戏"按钮
9. WHEN 房主点击"开始游戏"后，THE Room_Manager SHALL 将 Room 状态设为"游戏中"并通知 Game_Engine 初始化游戏

### 需求 10：WebSocket 实时通信

**用户故事：** 作为玩家，我希望游戏中的所有操作能实时同步给所有玩家，以便获得流畅的联机体验。

#### 验收标准

1. THE WS_Server SHALL 在现有 Express 服务基础上集成 Socket.io，与 HTTP 服务共享同一端口
2. WHEN Player 连接 WS_Server 时，THE WS_Server SHALL 为每个连接分配唯一的 socket id，并将该 Player 加入对应 Room 的 Socket.io 房间
3. THE WS_Server SHALL 定义以下客户端到服务端事件：join_room（加入房间）、leave_room（离开房间）、player_ready（玩家准备）、start_game（开始游戏）、play_card（出牌）、draw_card（摸牌）、call_uno（喊 UNO）、report_uno（举报未喊 UNO）、choose_color（选择颜色）、challenge_wild4（质疑 Wild+4）、accept_wild4（接受 Wild+4）
4. THE WS_Server SHALL 定义以下服务端到客户端事件：room_updated（房间状态更新）、game_started（游戏开始）、game_state（游戏状态同步）、card_played（出牌通知）、card_drawn（摸牌通知）、turn_changed（回合切换）、uno_called（UNO 喊牌通知）、uno_reported（举报结果）、color_chosen（颜色选择结果）、challenge_result（质疑结果）、game_over（游戏结束）、player_disconnected（玩家断线）、player_reconnected（玩家重连）、error（错误通知）
5. WHEN 游戏状态发生变化时，THE WS_Server SHALL 向 Room 内所有 Player 广播更新后的游戏状态，每位 Player 仅能看到自己的手牌详情，其他 Player 的手牌仅显示数量
6. THE WS_Server SHALL 对所有客户端事件进行参数校验，拒绝格式不正确或参数缺失的请求

### 需求 11：断线重连与托管

**用户故事：** 作为玩家，我希望在网络断开后能重新连接回游戏，以便不会因为短暂的网络问题而丢失游戏进度。

#### 验收标准

1. WHEN Player 的 WebSocket 连接断开时，THE WS_Server SHALL 将该 Player 标记为"掉线"状态，并向 Room 内其他 Player 广播掉线通知
2. THE WS_Server SHALL 为掉线 Player 保留游戏位置和手牌数据，等待时长为 120 秒
3. WHILE Player 处于掉线状态时，THE Game_Engine SHALL 使用 AI_Player 逻辑自动为该 Player 执行操作（托管模式）
4. WHEN 掉线 Player 在 120 秒内重新连接时，THE WS_Server SHALL 恢复该 Player 的游戏状态，包括手牌、当前回合信息、游戏进度，并向 Room 内其他 Player 广播重连通知
5. IF 掉线 Player 超过 120 秒未重连，THEN THE Room_Manager SHALL 将该 Player 永久替换为 AI_Player，释放该玩家位置
6. WHEN Player 在房间页面（游戏未开始）断线超过 30 秒时，THE Room_Manager SHALL 将该 Player 从 Room 中移除
7. WHEN Player 重连时，THE WS_Client SHALL 使用本地存储的房间号和玩家标识自动尝试重新加入游戏

### 需求 12：AI 补位策略

**用户故事：** 作为玩家，我希望 AI 托管的玩家能做出合理的出牌决策，以便游戏体验不会因为有人掉线而严重下降。

#### 验收标准

1. WHEN 轮到 AI_Player 操作时，THE Game_Engine SHALL 在 2～4 秒的随机延迟后执行 AI 出牌决策，模拟真人操作节奏
2. THE AI_Player SHALL 按以下优先级选择出牌：优先出与堆顶牌同色的牌，其次出同数值/同功能的牌，再次出 Wild_Card，最后出 Wild_Draw_Four
3. WHEN AI_Player 出 Wild_Card 或 Wild_Draw_Four 时，THE AI_Player SHALL 选择手牌中数量最多的颜色作为指定颜色
4. WHEN AI_Player 手牌剩余 1 张时，THE AI_Player SHALL 自动执行 UNO_Call
5. WHEN AI_Player 面对 Wild_Draw_Four 质疑选项时，THE AI_Player SHALL 始终选择接受（不质疑）
6. IF AI_Player 手牌中无合法出牌，THEN THE AI_Player SHALL 执行摸牌操作，摸到可出的牌时自动出牌

### 需求 13：前端游戏首页

**用户故事：** 作为玩家，我希望有一个简洁的游戏入口页面，以便快速创建或加入游戏房间。

#### 验收标准

1. THE Game_UI SHALL 在网站中提供 UNO 游戏的独立入口页面，路径为 `/uno`
2. THE Game_UI SHALL 在首页显示游戏标题、简要规则说明、"创建房间"按钮和"加入房间"输入框（含加入按钮）
3. WHEN Player 点击"创建房间"时，THE Game_UI SHALL 弹出昵称输入框，输入后向 WS_Server 发送创建房间请求
4. WHEN Player 输入房间号并点击"加入房间"时，THE Game_UI SHALL 弹出昵称输入框，输入后向 WS_Server 发送加入房间请求
5. IF 创建或加入房间失败，THEN THE Game_UI SHALL 显示对应的错误提示信息（房间不存在/房间已满/游戏已开始）

### 需求 14：前端房间页面

**用户故事：** 作为玩家，我希望在房间中能看到所有玩家的状态，以便了解何时可以开始游戏。

#### 验收标准

1. THE Game_UI SHALL 在房间页面顶部显示房间号，并提供一键复制房间号的功能
2. THE Game_UI SHALL 显示当前房间内所有 Player 的昵称和准备状态，空位显示为"等待加入"
3. WHEN Player 点击"准备"按钮时，THE WS_Client SHALL 向 WS_Server 发送准备事件，按钮切换为"取消准备"
4. WHILE 当前 Player 为房主时，WHEN 所有 Player 均已准备且人数达到 2 人及以上时，THE Game_UI SHALL 激活"开始游戏"按钮
5. WHEN 有新 Player 加入或离开 Room 时，THE Game_UI SHALL 实时更新玩家列表
6. THE Game_UI SHALL 提供"离开房间"按钮，点击后 Player 退出 Room 并返回首页

### 需求 15：前端游戏页面

**用户故事：** 作为玩家，我希望游戏界面清晰直观，能方便地查看手牌、出牌和了解游戏状态。

#### 验收标准

1. THE Game_UI SHALL 在游戏页面中央显示 Discard_Pile 堆顶牌和 Draw_Pile
2. THE Game_UI SHALL 在页面底部显示当前 Player 的手牌，可出的牌高亮显示，不可出的牌灰显
3. THE Game_UI SHALL 在页面其他位置显示其他 Player 的信息，包括昵称、手牌数量、是否为当前回合
4. WHEN 轮到当前 Player 出牌时，THE Game_UI SHALL 高亮提示当前为操作回合，并显示倒计时
5. WHEN Player 点击可出的手牌时，THE Game_UI SHALL 向 WS_Server 发送出牌请求
6. WHEN Player 点击 Draw_Pile 时，THE Game_UI SHALL 向 WS_Server 发送摸牌请求
7. WHEN Player 出 Wild_Card 或 Wild_Draw_Four 时，THE Game_UI SHALL 弹出颜色选择弹窗，提供红/黄/蓝/绿四个选项
8. WHEN 上一位 Player 出了 Wild_Draw_Four 时，THE Game_UI SHALL 弹出质疑决策弹窗，提供"接受"和"质疑"两个选项
9. WHEN Player 手牌剩余 2 张且出牌后将剩余 1 张时，THE Game_UI SHALL 显示 UNO 喊牌按钮
10. THE Game_UI SHALL 显示当前出牌方向指示（顺时针/逆时针）
11. THE Game_UI SHALL 在游戏页面显示消息提示区域，展示出牌、摸牌、喊 UNO、举报、质疑等操作的实时消息

### 需求 16：前端结算页面

**用户故事：** 作为玩家，我希望游戏结束后能看到清晰的结算信息，以便了解游戏结果。

#### 验收标准

1. WHEN 游戏结束时，THE Game_UI SHALL 自动跳转到结算页面
2. THE Game_UI SHALL 在结算页面显示胜利者昵称和胜利动画效果
3. THE Game_UI SHALL 在结算页面显示所有 Player 的排名和剩余手牌数量
4. THE Game_UI SHALL 在结算页面提供"再来一局"按钮，点击后返回房间页面
5. THE Game_UI SHALL 在结算页面提供"返回首页"按钮，点击后退出 Room 并返回 UNO 首页

### 需求 17：前端动画与交互体验

**用户故事：** 作为玩家，我希望游戏有流畅的动画效果和良好的交互体验，以便游戏过程更加有趣。

#### 验收标准

1. WHEN Player 出牌时，THE Game_UI SHALL 播放手牌移动到 Discard_Pile 的过渡动画
2. WHEN Player 摸牌时，THE Game_UI SHALL 播放牌从 Draw_Pile 移动到手牌区域的过渡动画
3. WHEN 功能牌生效时，THE Game_UI SHALL 显示对应的视觉效果提示（Skip 显示禁止图标、Reverse 显示方向切换、+2/+4 显示摸牌数量）
4. THE Game_UI SHALL 支持移动端响应式布局，在手机和平板设备上正常显示和操作
5. WHILE 游戏页面处于活跃状态时，THE Game_UI SHALL 保持 WebSocket 连接的心跳检测，连接异常时显示"连接中断，正在重连"的提示
