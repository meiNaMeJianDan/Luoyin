import catanImg from '@/assets/catan.png';
import unoImg from '@/assets/uno_icon.png';
import awalonImg from '@/assets/awalon.png';
import sanguoshaImg from '@/assets/sanguosha.png';
import manilaImg from '@/assets/manila.png';
import langImg from '@/assets/langren.png';
import deguoxinzangbing from '@/assets/deguoxinzangbing.png';
import zypy from '@/assets/zypy.png';
// 游戏分类数据
export const GAME_TYPES = ['全部', '聚会类', '策略类', '卡牌类', '儿童类', '跑团类'];

// 玩家人数选项
export const PLAYER_COUNTS = ['不限', '2人', '3-5人', '6人以上'];

// 游戏时长选项
export const GAME_DURATIONS = ['不限', '15分钟内', '15-30分钟', '30分钟以上'];

// 完整的游戏数据库
const GAME_DATABASE = [
  {
    id: 1,
    title: "一夜终极狼人",
    type: "聚会类",
    players: "3-10人",
    time: "10分钟",
    image: langImg,
    difficulty: "极易",
    tags: ["聚会必备", "推理"],
    isHot: true,
    rank: 1,
    comment: "聚会破冰绝对神器，10分钟一把停不下来！",
    isTrending: true
  },
  {
    id: 2,
    title: "卡坦岛",
    type: "策略类",
    players: "3-4人",
    time: "60分钟",
    image: catanImg,
    difficulty: "中等",
    tags: ["经典", "交易"],
    isHot: false,
    rank: 6,
    comment: "经典德式策略入门，谁能换到羊？",
    isTrending: false
  },
  {
    id: 3,
    title: "UNO 乌诺",
    type: "卡牌类",
    players: "2-10人",
    time: "15分钟",
    image: unoImg,
    difficulty: "极易",
    tags: ["友尽神器", "卡牌"],
    isHot: true,
    rank: 3,
    comment: "地球人都知道的卡牌游戏，友尽必备。",
    isTrending: true
  },
  {
    id: 4,
    title: "抵抗组织：阿瓦隆",
    type: "聚会类",
    players: "5-10人",
    time: "30分钟",
    image: awalonImg,
    difficulty: "简单",
    tags: ["阵营", "欺诈"],
    isHot: true,
    rank: 2,
    comment: "逻辑与演技的巅峰对决，熟人局必玩。",
    isTrending: false
  },
  {
    id: 5,
    title: "三国杀",
    type: "卡牌类",
    players: "2-10人",
    time: "40分钟",
    image: sanguoshaImg,
    difficulty: "中等",
    tags: ["国风", "对抗"],
    isHot: false,
    isTrending: false
  },
  {
    id: 6,
    title: "马尼拉",
    type: "聚会类",
    players: "3-5人",
    time: "45分钟",
    image: manilaImg,
    difficulty: "简单",
    tags: ["欢乐", "竞拍"],
    isHot: false,
    isTrending: false
  },
  {
    id: 7,
    title: "德国心脏病",
    type: "聚会类",
    players: "2-6人",
    time: "15分钟",
    image: deguoxinzangbing, // 使用unoImg作为默认图片
    difficulty: "极易",
    tags: ["反应力", "欢乐"],
    isHot: false,
    rank: 4,
    comment: "按铃按到手软，测试反应力的爆笑时刻。",
    isTrending: true
  },
  {
    id: 8,
    title: "只言片语",
    type: "聚会类",
    players: "3-6人",
    time: "30分钟",
    image: zypy, // 使用awalonImg作为默认图片
    difficulty: "简单",
    tags: ["想象力", "唯美"],
    isHot: false,
    rank: 5,
    comment: "画风绝美，脑洞大开，适合女生多或者文艺青年聚会。",
    isTrending: true
  },
];

// 从游戏数据库中导出不同的子集

// 所有桌游数据
export const ALL_GAMES = GAME_DATABASE;

// 热门排行榜游戏（按rank排序）
export const TOP_GAMES = GAME_DATABASE
  .filter(game => game.rank !== undefined)
  .sort((a, b) => (a.rank as number) - (b.rank as number));

// 首页热门游戏
export const TRENDING_GAMES = GAME_DATABASE
  .filter(game => game.isTrending);

// 合并后的游戏数据（包含所有信息）
export const MERGED_GAMES = GAME_DATABASE;

// 排行榜游戏（筛选出有rank的游戏）
export const RANKED_GAMES = TOP_GAMES;

// 首页分类快速链接
export const CATEGORIES_QUICK_LINKS = [
  { name: '聚会类', icon: 'Tent', color: 'bg-[rgba(255,127,80,0.1)] text-primary', link: '/categories' },
  { name: '策略类', icon: 'Brain', color: 'bg-[rgba(135,206,235,0.2)] text-secondary-foreground', link: '/categories' },
  { name: '卡牌类', icon: 'BookOpen', color: 'bg-green-100 text-green-600', link: '/categories' },
  { name: '儿童类', icon: 'Baby', color: 'bg-yellow-100 text-yellow-600', link: '/categories' },
  { name: '跑团类', icon: 'Gamepad2', color: 'bg-purple-100 text-purple-600', link: '/categories' },
];


// 新手常见问题
export const BEGINNER_FAQS = [
  { q: "第一次玩桌游，不知道选什么好？", a: "推荐从「聚会类」和「极易上手」的标签开始看。比如《UNO》、《德国心脏病》、《只言片语》，这些游戏规则简单，几分钟就能学会，而且非常欢乐，不容易冷场。" },
  { q: "游戏规则看不懂怎么办？", a: "我们的网站为每款热门桌游提炼了「核心玩法步骤」，摒弃了冗长的官方说明书。你可以直接看详情页的图文步骤，或者找带“教学视频”标签的桌游。" },
  { q: "聚会人数经常变动，怎么买桌游？", a: "建议购买几款弹性人数大的桌游。比如《一夜终极狼人》支持3-10人，《只言片语》支持3-6人。《截码战》支持人数更是可以到8人左右。" },
];

// 桌游基础流程
export const GAME_GUIDE_STEPS = [
  { step: "1. 了解人数与时长", desc: "在开始前，清点在场人数，预估大家愿意投入的时间（15分钟还是1小时）。" },
  { step: "2. 推选规则讲解员", desc: "让最懂规则的人先看本站的攻略，用大白话分步骤讲解，不要照念说明书。" },
  { step: "3. 试玩一局", desc: "直接上手玩一轮明牌局，遇到问题再看规则，这是最快的学习方式！" }
];

// 游戏详细规则数据 - 从单独文件导入
export { GAME_DETAILS } from './gameDetails';


