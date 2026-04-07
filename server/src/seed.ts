// 种子数据脚本
// 将前端 src/constant/ 下的所有静态数据迁移到 SQLite 数据库中
// 可通过 npm run seed 执行，支持重复执行（先清空表再插入）

import { getDb } from './db.js';

/** 执行种子数据填充 */
function seed(): void {
  const db = getDb();

  // 使用事务确保数据一致性
  const transaction = db.transaction(() => {
    // ========== 清空所有表（按外键依赖顺序） ==========
    db.exec(`
      DELETE FROM game_details;
      DELETE FROM games;
      DELETE FROM category_options;
      DELETE FROM quick_links;
      DELETE FROM faqs;
      DELETE FROM guide_steps;
    `);

    // ========== 插入 Game 数据（8 条记录） ==========
    const insertGame = db.prepare(`
      INSERT INTO games (id, title, type, players, time, image, difficulty, tags, is_hot, rank, comment, is_trending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // id=1: 一夜终极狼人
    insertGame.run(
      1, '一夜终极狼人', '聚会类', '3-10人', '10分钟',
      '/images/langren.png', '极易',
      JSON.stringify(['聚会必备', '推理']),
      1, 1, '聚会破冰绝对神器，10分钟一把停不下来！', 1
    );

    // id=2: 卡坦岛
    insertGame.run(
      2, '卡坦岛', '策略类', '3-4人', '60分钟',
      '/images/catan.png', '中等',
      JSON.stringify(['经典', '交易']),
      0, 6, '经典德式策略入门，谁能换到羊？', 0
    );

    // id=3: UNO 乌诺
    insertGame.run(
      3, 'UNO 乌诺', '卡牌类', '2-10人', '15分钟',
      '/images/uno_icon.png', '极易',
      JSON.stringify(['友尽神器', '卡牌']),
      1, 3, '地球人都知道的卡牌游戏，友尽必备。', 1
    );

    // id=4: 抵抗组织：阿瓦隆
    insertGame.run(
      4, '抵抗组织：阿瓦隆', '聚会类', '5-10人', '30分钟',
      '/images/awalon.png', '简单',
      JSON.stringify(['阵营', '欺诈']),
      1, 2, '逻辑与演技的巅峰对决，熟人局必玩。', 0
    );

    // id=5: 三国杀
    insertGame.run(
      5, '三国杀', '卡牌类', '2-10人', '40分钟',
      '/images/sanguosha.png', '中等',
      JSON.stringify(['国风', '对抗']),
      0, null, null, 0
    );

    // id=6: 马尼拉
    insertGame.run(
      6, '马尼拉', '聚会类', '3-5人', '45分钟',
      '/images/manila.png', '简单',
      JSON.stringify(['欢乐', '竞拍']),
      0, null, null, 0
    );

    // id=7: 德国心脏病
    insertGame.run(
      7, '德国心脏病', '聚会类', '2-6人', '15分钟',
      '/images/deguoxinzangbing.png', '极易',
      JSON.stringify(['反应力', '欢乐']),
      0, 4, '按铃按到手软，测试反应力的爆笑时刻。', 1
    );

    // id=8: 只言片语
    insertGame.run(
      8, '只言片语', '聚会类', '3-6人', '30分钟',
      '/images/zypy.png', '简单',
      JSON.stringify(['想象力', '唯美']),
      0, 5, '画风绝美，脑洞大开，适合女生多或者文艺青年聚会。', 1
    );

    // ========== 插入 GameDetail 数据（3 条记录：id 1、2、6） ==========
    const insertGameDetail = db.prepare(`
      INSERT INTO game_details (game_id, introduction, objective, victory_conditions, gameplay_steps, tips)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // game_id=1: 一夜终极狼人详情
    insertGameDetail.run(
      1,
      '《一夜终极狼人》是一款经典的身份推理类桌游，适合3-10人游玩，每局游戏仅需10分钟左右。游戏以狼人杀为基础，但进行了创新改良，没有淘汰机制，所有玩家都能参与到游戏结束。',
      '不同阵营有不同的获胜条件：好人阵营需要票死狼人，狼人阵营需要隐藏身份，特殊阵营有独立的胜利条件。',
      JSON.stringify([
        { text: '好人阵营：在投票环节中成功票死至少一名狼人即可获胜', image: null },
        { text: '狼人阵营：隐藏自己的身份，确保没有狼人被票死即可获胜', image: null },
        { text: '特殊阵营（如皮匠）：如果自己被全场票死，则单独获胜', image: null }
      ]),
      JSON.stringify([
        { title: '分发身份', desc: '洗混角色牌（玩家数+3张），每人发一张暗置面前，中央放三张底牌。', image: null },
        { title: '夜晚行动', desc: '所有人闭眼。按照App或主持人的语音提示，特定角色依次睁眼执行技能（如预言家看牌、强盗换牌等）。', image: null },
        { title: '白天讨论', desc: '所有人睁眼。大家有几分钟的时间自由讨论，由于夜晚牌可能被换，所以每个人都可能不再是最初的身份！', image: null },
        { title: '投票处决', desc: '时间到，大家倒数3、2、1，同时指向一名怀疑对象。得票最多的人被处决，翻开他现在的身份牌判定胜负。', image: null }
      ]),
      JSON.stringify([
        '使用官方配套的手机App来替代法官播音，确保夜晚流程不会出错',
        '注意观察其他玩家的表情和发言，寻找逻辑漏洞',
        '作为好人，尽量分享自己的信息，帮助团队找出狼人',
        '作为狼人，要善于伪装，混入好人阵营'
      ])
    );

    // game_id=2: 卡坦岛详情
    insertGameDetail.run(
      2,
      '《卡坦岛》（The Settlers of Catan），亦称《卡坦岛拓荒者》，是一款由德国设计师克劳斯·特伯（Klaus Teuber）设计的多人策略图板游戏。该游戏最初于1995年在德国由Franckh-Kosmos公司出版发行。截至2020年代，其全球累计销量已突破3000万份，正向4500万份迈进。游戏融合了资源收集、经济发展与玩家谈判等核心玩法，被认为是第一款在欧洲以外地区（特别是美国）大受欢迎的德式桌游，具有开创性意义。',
      '玩家扮演拓荒者，目标是通过建造定居点、道路和城市，最先获得10点胜利分数。',
      JSON.stringify([
        {
          text: '《卡坦岛》是一款回合制的资源管理与谈判交易游戏，玩家扮演拓荒者，目标是通过建造定居点、道路和城市，最先获得10点胜利分数。 游戏的核心机制是通过投掷两颗骰子来决定资源产出，玩家需要收集木材、砖块、羊毛、粮食、矿石五种基础资源，用于在六边形地形板块的顶点和边线上建造和发展。游戏地图由19块可随机拼接的六边形地形板块构成，确保了每局游戏地图的独特性',
          image: null
        },
        {
          text: '游戏的特色系统包括玩家交易系统、港口贸易系统和发展卡系统。玩家可以在自己的回合内与其他玩家自由交易资源，这是游戏的核心策略之一。 玩家可以通过建造在港口的定居点，以更优惠的汇率与银行进行资源兑换。玩家可以使用资源购买发展卡，卡牌种类包括骑士卡、垄断卡、丰收卡、道路卡以及直接提供胜利分数的分数卡。',
          image: null
        },
        {
          text: '游戏的互动元素主要体现在"强盗"机制上，当有玩家掷出骰子点数为7时，强盗会被激活，所有手牌超过7张的玩家需弃掉一半资源，掷出7点的玩家可将强盗移动至任意地形板块，阻碍该板块的资源生产，并可掠夺该板块上一名玩家的一张随机资源卡。 游戏还设有最长道路奖和最大军队奖两项竞争性奖励，当玩家连接的道路长度达到5节或使用的骑士卡数量达到3张并保持领先时，可分别获得2点额外分数。《卡坦岛》因其规则相对简单和玩家互动性强，常被用作入门桌游',
          image: '/images/catan/catan_1.png'
        },
        { image: '/images/catan/catan_2.png' },
        { image: '/images/catan/catan_3.png' }
      ]),
      JSON.stringify([
        {
          title: '地图准备',
          desc: [
            '1.游戏中有五种资源,木头(wood),砖块(brick),羊毛(wool),粮食(grain),矿石(ore)',
            '2.地图上的每个六边形分别对应每种资源,分别是深绿-森林,红色-泥土,浅绿-草地,黄色-庄稼,黑色-矿山,白色-荒地在六边形的六个顶点上可以修建定居点(settle)',
            '3.每个六边形中标有一个数字,当有玩家掷出的色子点数和这个数字相同时这个六边形顶点上的定居点就会得到这个六边形对应的1点资源,而城市可以获得2点资源',
            '4.没有对应7点的六边形,当掷出7时,手中资源总数超过7的玩家就会爆掉(BUST),会被迫扔掉一半的资源,同时掷出7的玩家可以移动强盗(robber)',
            '5.移动强盗到某个六边形,你可以抢劫这个六边形顶点上的任意个玩家的1点资源,资源的种类由系统随机选取,同时强盗所在的六边形将不再产生资源',
            '6.使用强盗后，可以勒索其余玩家，若其他玩家上供后，可将强盗移动到未上供玩家的资源区域。'
          ],
          image: null
        },
        {
          title: '建造发展',
          desc: [
            '1.在建筑面板里我们可以看到可以修筑的建筑和它们的花费,道路(road)1木头,1砖块,定居点(settle)1木头,1砖块,1羊毛,1粮食,城市(city)2粮食,3矿石',
            '2.道路的修筑必须连着自己的道路或定居点',
            '3.当连在一起的道路长度第一个达到5,可以得到最长道路奖(longest road prize),获得两个积分,但是并不会永久持有,当有玩家的道路长度超过你,他将获得这两个积分,最长道路奖的得主及其道路长度在游戏画面的左上角',
            '4.定居点是用来获取资源的,但是定居点必须修建在道路连接到的地方,而且不能修在另一个定居点紧邻的几点,同时你每拥有一个定居点可以获得1点积分',
            '5.定居点可以升级为城市,花费为2粮食,3矿石,当有玩家掷出和城市旁边六边形相同的数字时,城市可以获得2点资源,同时你每拥有一个城市可以获得2点积分'
          ],
          image: null
        },
        {
          title: '卡片面板',
          desc: [
            '1.在卡片面板的第一项是产生一张卡片,花费为1羊毛,1粮食,1矿石,卡片的种类是由系统随机决定的,左下角是拥有的卡片数',
            '2.点数(point)卡被产生出来后会自动被使用,增加玩家积分1点',
            '3.使用士兵(soldier)卡片可以获得一次移动强盗的机会',
            '4.第一个使用士兵卡达到3次的玩家会获得最大军队奖(largest army prize) 获得两个积分,但是并不会永久持有,当有玩家使用的骑士卡数超过你,他将获得这两个积分, 最大军队奖的得主及其骑士卡数在游戏画面的右上角,你已使用的骑士卡数在游戏画面的右下角',
            '5.使用丰收(year of plenty)卡片可以获得任意两点资源.资源种类由自己指定',
            '6.使用垄断(monopoly)卡片可以夺取所有玩家的某一种资源到自己手上',
            '7.使用道路(road building)卡片可以免费修建两条道路'
          ],
          image: null
        },
        {
          title: '贸易面板',
          desc: [
            '1.交易分为3种,玩家间贸易,航海贸易,4:1贸易',
            '2.玩家间贸易可以选择给予(give),需求(wanted),交换(trade),其中给予和需求,其他玩家会开出对应的条件,答应后便会交易,而交换的条件是自己定好的',
            '3.当你占领了港口(harbor),你就可以进行航海贸易,港口分为两种, 三比一港口, 和特殊资源港口.占领3:1港口后, 玩家可以选择用三点同样种类的资源换取一点任意其他种类的资源,占领特殊资源港口后(比如,占领了砖头2:1港口), 可以用两点该资源(两点砖头)换取一点任意其他种类的资源',
            '4.当你需要某种资源,但没有港口时,你必须用4个其他任一种类的资源换取这种资源,游戏以回合进行，每位玩家进行完自己的回合就轮到下一个玩家，所有玩家都进行完后又回到第一位玩家的回合。直到某位玩家满足胜利条件时游戏结束。'
          ],
          image: null
        }
      ]),
      JSON.stringify([
        '优先建立连接良好的定居点，确保资源多样性',
        '不要忽视交易的重要性，善于与其他玩家谈判获取所需资源',
        '合理利用港口优势，优化资源兑换',
        '注意强盗机制，避免在有太多手牌时被抢劫',
        '关注最长道路奖和最大军队奖，这是快速获取胜利分数的关键'
      ])
    );

    // game_id=6: 马尼拉详情
    insertGameDetail.run(
      6,
      '游戏背景设定在1821年西班牙殖民时期的马尼拉，玩家扮演黑市商人，目标是通过走私贸易积累财富。碰撞、运输、利益都是"马尼拉"这款游戏的内容。它是一款适合3~5人的策略性游戏。游戏中，玩家们的目的，是要沿着海岸线完成货物的运输。但是这却不是简单的任务，过程中，可能会在仓库装卸货物的过程中遇到危险，也可能在运输的过程中遭遇暴风雨而葬身大海。当玩家为自己的成功和失败谋划的时候，未知的命运却由骰子决定。',
      '游戏的目标是成为最富有的商人。当任意一种货物的黑市价值升至30比索时，游戏立即结束。此时，所有玩家结算其持有的现金与股票的总价值，总价值最高的玩家获得胜利',
      JSON.stringify([
        {
          text: '游戏以19世纪马尼拉走私贸易为背景，核心机制围绕海上货运的风险与收益展开。每轮首先通过竞标海港办事处领导权以获得特权，包括优先购买股票、决定运输货物、设置船只初始位置及优先部署手下。玩家需部署手下至货舱押运员、领航员、海盗、搬运工、修船工或保险公司等不同岗位，以影响航程与分配风险。船只移动由投掷骰子决定，航程中可能触发海盗劫掠或顺风的港湾等特殊事件。游戏包含独特的经济系统，如股票抵押贷款、保险赔付机制，破产玩家可成为"盲目的旅客"',
          image: null
        }
      ]),
      JSON.stringify([
        {
          title: '游戏配件',
          desc: [
            '一个游戏板',
            '4个货物的货仓',
            '4个骰子（以颜色代表四种货物）',
            '4个价格指示标志（以颜色代表四种货物）',
            '三艘平底船',
            '20张股份，四种货物每种五张',
            '20个同伙，五种颜色每种四个',
            '一些菲律宾币值（披索）的硬币',
            '一本规则'
          ],
          image: null
        },
        {
          title: '游戏概要',
          desc: [
            '游戏进行若干回合（称为航程）。在每个航程之中，三艘平底船上装载货物并航向马尼拉。平底船根据掷骰点数移动，一种货物由一颗骰子决定。抵达目的地港口的机会因货物种类而异，但是利润往往大於风险。',
            '每位玩家起始时有两件货物以及30元披索。',
            '在每段航程的起初，大家竞标海港负责人的办事处。办事处很重要，只有海港负责人可以决定上哪些货物以及平底船从哪一点出发，比其他玩家多出一些好处。海港负责人可以购买一份股份，作为未来的投资。当海港负责人执行完他的办事处的职责，所有玩家可以召募同夥帮助他们在航程中赚钱：',
            '他们可以部署在平底船上，如果平底船平安抵达马尼拉，他们可以赚钱。',
            '－　他们可以部署在港口或修船场，如果抵达目的地港口或是损坏而必须进入修船场，他们可以赚钱。',
            '－　一个同夥可以被部署为保险仲介者。他因为他的工作而收到10元披索，但是只要有平底船无法抵达马尼拉，他必须付出理赔金作为修理平底船之用。',
            '－　他们可以部署为海盗，试图登上或是掠夺不幸的平底船。',
            '－　最后，他们可以部署为领航员，在平底船往马尼拉的航程中帮助或是阻挠它们。',
            '－　在航程的最后，玩家从成功的同夥那里得到利润。成功运抵马尼拉的货物，可以在黑市提升价格。当一件货物的价值达到30元时，游戏结束。累积最多财富的玩家成为胜利者。'
          ],
          image: null
        },
        {
          title: '卡片面板',
          desc: [
            '1.在卡片面板的第一项是产生一张卡片,花费为1羊毛,1粮食,1矿石,卡片的种类是由系统随机决定的,左下角是拥有的卡片数',
            '2.点数(point)卡被产生出来后会自动被使用,增加玩家积分1点',
            '3.使用士兵(soldier)卡片可以获得一次移动强盗的机会',
            '4.第一个使用士兵卡达到3次的玩家会获得最大军队奖(largest army prize) 获得两个积分,但是并不会永久持有,当有玩家使用的骑士卡数超过你,他将获得这两个积分, 最大军队奖的得主及其骑士卡数在游戏画面的右上角,你已使用的骑士卡数在游戏画面的右下角',
            '5.使用丰收(year of plenty)卡片可以获得任意两点资源.资源种类由自己指定',
            '6.使用垄断(monopoly)卡片可以夺取所有玩家的某一种资源到自己手上',
            '7.使用道路(road building)卡片可以免费修建两条道路'
          ],
          image: null
        },
        {
          title: '贸易面板',
          desc: [
            '1.交易分为3种,玩家间贸易,航海贸易,4:1贸易',
            '2.玩家间贸易可以选择给予(give),需求(wanted),交换(trade),其中给予和需求,其他玩家会开出对应的条件,答应后便会交易,而交换的条件是自己定好的',
            '3.当你占领了港口(harbor),你就可以进行航海贸易,港口分为两种, 三比一港口, 和特殊资源港口.占领3:1港口后, 玩家可以选择用三点同样种类的资源换取一点任意其他种类的资源,占领特殊资源港口后(比如,占领了砖头2:1港口), 可以用两点该资源(两点砖头)换取一点任意其他种类的资源',
            '4.当你需要某种资源,但没有港口时,你必须用4个其他任一种类的资源换取这种资源,游戏以回合进行，每位玩家进行完自己的回合就轮到下一个玩家，所有玩家都进行完后又回到第一位玩家的回合。直到某位玩家满足胜利条件时游戏结束。'
          ],
          image: null
        }
      ]),
      JSON.stringify([
        '优先建立连接良好的定居点，确保资源多样性',
        '不要忽视交易的重要性，善于与其他玩家谈判获取所需资源',
        '合理利用港口优势，优化资源兑换',
        '注意强盗机制，避免在有太多手牌时被抢劫',
        '关注最长道路奖和最大军队奖，这是快速获取胜利分数的关键'
      ])
    );

    // ========== 插入 CategoryOption 数据 ==========
    const insertCategoryOption = db.prepare(`
      INSERT INTO category_options (key, value) VALUES (?, ?)
    `);

    // 游戏类型
    insertCategoryOption.run('types', JSON.stringify(['全部', '聚会类', '策略类', '卡牌类', '儿童类', '跑团类']));
    // 玩家人数选项
    insertCategoryOption.run('playerCounts', JSON.stringify(['不限', '2人', '3-5人', '6人以上']));
    // 游戏时长选项
    insertCategoryOption.run('durations', JSON.stringify(['不限', '15分钟内', '15-30分钟', '30分钟以上']));

    // ========== 插入 QuickLink 数据 ==========
    const insertQuickLink = db.prepare(`
      INSERT INTO quick_links (name, icon, color, link) VALUES (?, ?, ?, ?)
    `);

    insertQuickLink.run('聚会类', 'Tent', 'bg-[rgba(255,127,80,0.1)] text-primary', '/categories');
    insertQuickLink.run('策略类', 'Brain', 'bg-[rgba(135,206,235,0.2)] text-secondary-foreground', '/categories');
    insertQuickLink.run('卡牌类', 'BookOpen', 'bg-green-100 text-green-600', '/categories');
    insertQuickLink.run('儿童类', 'Baby', 'bg-yellow-100 text-yellow-600', '/categories');
    insertQuickLink.run('跑团类', 'Gamepad2', 'bg-purple-100 text-purple-600', '/categories');

    // ========== 插入 FAQ 数据 ==========
    const insertFaq = db.prepare(`
      INSERT INTO faqs (question, answer, sort_order) VALUES (?, ?, ?)
    `);

    insertFaq.run('第一次玩桌游，不知道选什么好？', '推荐从「聚会类」和「极易上手」的标签开始看。比如《UNO》、《德国心脏病》、《只言片语》，这些游戏规则简单，几分钟就能学会，而且非常欢乐，不容易冷场。', 0);
    insertFaq.run('游戏规则看不懂怎么办？', '我们的网站为每款热门桌游提炼了「核心玩法步骤」，摒弃了冗长的官方说明书。你可以直接看详情页的图文步骤，或者找带"教学视频"标签的桌游。', 1);
    insertFaq.run('聚会人数经常变动，怎么买桌游？', '建议购买几款弹性人数大的桌游。比如《一夜终极狼人》支持3-10人，《只言片语》支持3-6人。《截码战》支持人数更是可以到8人左右。', 2);

    // ========== 插入 GuideStep 数据 ==========
    const insertGuideStep = db.prepare(`
      INSERT INTO guide_steps (step, description, sort_order) VALUES (?, ?, ?)
    `);

    insertGuideStep.run('1. 了解人数与时长', '在开始前，清点在场人数，预估大家愿意投入的时间（15分钟还是1小时）。', 0);
    insertGuideStep.run('2. 推选规则讲解员', '让最懂规则的人先看本站的攻略，用大白话分步骤讲解，不要照念说明书。', 1);
    insertGuideStep.run('3. 试玩一局', '直接上手玩一轮明牌局，遇到问题再看规则，这是最快的学习方式！', 2);
  });

  // 执行事务
  transaction();

  // 验证数据
  const gameCount = (db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }).count;
  const detailCount = (db.prepare('SELECT COUNT(*) as count FROM game_details').get() as { count: number }).count;
  const categoryCount = (db.prepare('SELECT COUNT(*) as count FROM category_options').get() as { count: number }).count;
  const quickLinkCount = (db.prepare('SELECT COUNT(*) as count FROM quick_links').get() as { count: number }).count;
  const faqCount = (db.prepare('SELECT COUNT(*) as count FROM faqs').get() as { count: number }).count;
  const guideStepCount = (db.prepare('SELECT COUNT(*) as count FROM guide_steps').get() as { count: number }).count;

  console.log('✅ 种子数据填充完成：');
  console.log(`   - Games: ${gameCount} 条`);
  console.log(`   - GameDetails: ${detailCount} 条`);
  console.log(`   - CategoryOptions: ${categoryCount} 条`);
  console.log(`   - QuickLinks: ${quickLinkCount} 条`);
  console.log(`   - FAQs: ${faqCount} 条`);
  console.log(`   - GuideSteps: ${guideStepCount} 条`);
}

// 执行种子脚本
seed();
