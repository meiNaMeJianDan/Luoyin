import type { Word, WordDifficulty, WordCategory } from './types.js';

// ============================================================
// 内置词库（200+ 中文词语）
// 难度分布：easy ~40%, medium ~35%, hard ~25%
// 分类：动物、食物、物品、动作、职业、地点、其他
// ============================================================

/** 内置词库数据 */
const WORD_POOL: Word[] = [
  // ==================== 动物（animal） ====================
  // easy
  { text: '猫', difficulty: 'easy', category: 'animal' },
  { text: '狗', difficulty: 'easy', category: 'animal' },
  { text: '兔子', difficulty: 'easy', category: 'animal' },
  { text: '鱼', difficulty: 'easy', category: 'animal' },
  { text: '鸟', difficulty: 'easy', category: 'animal' },
  { text: '鸡', difficulty: 'easy', category: 'animal' },
  { text: '鸭子', difficulty: 'easy', category: 'animal' },
  { text: '猪', difficulty: 'easy', category: 'animal' },
  { text: '牛', difficulty: 'easy', category: 'animal' },
  { text: '马', difficulty: 'easy', category: 'animal' },
  { text: '羊', difficulty: 'easy', category: 'animal' },
  { text: '蛇', difficulty: 'easy', category: 'animal' },
  { text: '老鼠', difficulty: 'easy', category: 'animal' },
  { text: '青蛙', difficulty: 'easy', category: 'animal' },
  { text: '蝴蝶', difficulty: 'easy', category: 'animal' },
  // medium
  { text: '大象', difficulty: 'medium', category: 'animal' },
  { text: '长颈鹿', difficulty: 'medium', category: 'animal' },
  { text: '企鹅', difficulty: 'medium', category: 'animal' },
  { text: '熊猫', difficulty: 'medium', category: 'animal' },
  { text: '老虎', difficulty: 'medium', category: 'animal' },
  { text: '狮子', difficulty: 'medium', category: 'animal' },
  { text: '猴子', difficulty: 'medium', category: 'animal' },
  { text: '鳄鱼', difficulty: 'medium', category: 'animal' },
  { text: '海豚', difficulty: 'medium', category: 'animal' },
  { text: '蜗牛', difficulty: 'medium', category: 'animal' },
  // hard
  { text: '变色龙', difficulty: 'hard', category: 'animal' },
  { text: '刺猬', difficulty: 'hard', category: 'animal' },
  { text: '啄木鸟', difficulty: 'hard', category: 'animal' },
  { text: '河马', difficulty: 'hard', category: 'animal' },
  { text: '孔雀', difficulty: 'hard', category: 'animal' },

  // ==================== 食物（food） ====================
  // easy
  { text: '苹果', difficulty: 'easy', category: 'food' },
  { text: '香蕉', difficulty: 'easy', category: 'food' },
  { text: '西瓜', difficulty: 'easy', category: 'food' },
  { text: '蛋糕', difficulty: 'easy', category: 'food' },
  { text: '面条', difficulty: 'easy', category: 'food' },
  { text: '米饭', difficulty: 'easy', category: 'food' },
  { text: '鸡蛋', difficulty: 'easy', category: 'food' },
  { text: '面包', difficulty: 'easy', category: 'food' },
  { text: '糖果', difficulty: 'easy', category: 'food' },
  { text: '冰淇淋', difficulty: 'easy', category: 'food' },
  { text: '葡萄', difficulty: 'easy', category: 'food' },
  { text: '草莓', difficulty: 'easy', category: 'food' },
  { text: '饺子', difficulty: 'easy', category: 'food' },
  // medium
  { text: '火锅', difficulty: 'medium', category: 'food' },
  { text: '汉堡', difficulty: 'medium', category: 'food' },
  { text: '披萨', difficulty: 'medium', category: 'food' },
  { text: '寿司', difficulty: 'medium', category: 'food' },
  { text: '月饼', difficulty: 'medium', category: 'food' },
  { text: '粽子', difficulty: 'medium', category: 'food' },
  { text: '棒棒糖', difficulty: 'medium', category: 'food' },
  { text: '爆米花', difficulty: 'medium', category: 'food' },
  { text: '三明治', difficulty: 'medium', category: 'food' },
  { text: '巧克力', difficulty: 'medium', category: 'food' },
  // hard
  { text: '北京烤鸭', difficulty: 'hard', category: 'food' },
  { text: '糖葫芦', difficulty: 'hard', category: 'food' },
  { text: '臭豆腐', difficulty: 'hard', category: 'food' },
  { text: '麻辣烫', difficulty: 'hard', category: 'food' },
  { text: '煎饼果子', difficulty: 'hard', category: 'food' },

  // ==================== 物品（object） ====================
  // easy
  { text: '手机', difficulty: 'easy', category: 'object' },
  { text: '电脑', difficulty: 'easy', category: 'object' },
  { text: '雨伞', difficulty: 'easy', category: 'object' },
  { text: '钥匙', difficulty: 'easy', category: 'object' },
  { text: '眼镜', difficulty: 'easy', category: 'object' },
  { text: '书', difficulty: 'easy', category: 'object' },
  { text: '杯子', difficulty: 'easy', category: 'object' },
  { text: '椅子', difficulty: 'easy', category: 'object' },
  { text: '桌子', difficulty: 'easy', category: 'object' },
  { text: '电视', difficulty: 'easy', category: 'object' },
  { text: '灯泡', difficulty: 'easy', category: 'object' },
  { text: '剪刀', difficulty: 'easy', category: 'object' },
  { text: '帽子', difficulty: 'easy', category: 'object' },
  { text: '鞋子', difficulty: 'easy', category: 'object' },
  { text: '闹钟', difficulty: 'easy', category: 'object' },
  // medium
  { text: '吉他', difficulty: 'medium', category: 'object' },
  { text: '望远镜', difficulty: 'medium', category: 'object' },
  { text: '显微镜', difficulty: 'medium', category: 'object' },
  { text: '风筝', difficulty: 'medium', category: 'object' },
  { text: '地球仪', difficulty: 'medium', category: 'object' },
  { text: '沙漏', difficulty: 'medium', category: 'object' },
  { text: '指南针', difficulty: 'medium', category: 'object' },
  { text: '灭火器', difficulty: 'medium', category: 'object' },
  { text: '听诊器', difficulty: 'medium', category: 'object' },
  { text: '手电筒', difficulty: 'medium', category: 'object' },
  // hard
  { text: '留声机', difficulty: 'hard', category: 'object' },
  { text: '摩天轮', difficulty: 'hard', category: 'object' },
  { text: '红绿灯', difficulty: 'hard', category: 'object' },
  { text: '热气球', difficulty: 'hard', category: 'object' },
  { text: '过山车', difficulty: 'hard', category: 'object' },

  // ==================== 动作（action） ====================
  // easy
  { text: '跑步', difficulty: 'easy', category: 'action' },
  { text: '睡觉', difficulty: 'easy', category: 'action' },
  { text: '吃饭', difficulty: 'easy', category: 'action' },
  { text: '喝水', difficulty: 'easy', category: 'action' },
  { text: '唱歌', difficulty: 'easy', category: 'action' },
  { text: '画画', difficulty: 'easy', category: 'action' },
  { text: '拍照', difficulty: 'easy', category: 'action' },
  { text: '写字', difficulty: 'easy', category: 'action' },
  { text: '洗手', difficulty: 'easy', category: 'action' },
  { text: '刷牙', difficulty: 'easy', category: 'action' },
  // medium
  { text: '游泳', difficulty: 'medium', category: 'action' },
  { text: '跳舞', difficulty: 'medium', category: 'action' },
  { text: '钓鱼', difficulty: 'medium', category: 'action' },
  { text: '骑马', difficulty: 'medium', category: 'action' },
  { text: '滑雪', difficulty: 'medium', category: 'action' },
  { text: '打篮球', difficulty: 'medium', category: 'action' },
  { text: '踢足球', difficulty: 'medium', category: 'action' },
  { text: '弹钢琴', difficulty: 'medium', category: 'action' },
  { text: '放风筝', difficulty: 'medium', category: 'action' },
  { text: '打乒乓球', difficulty: 'medium', category: 'action' },
  // hard
  { text: '蹦极', difficulty: 'hard', category: 'action' },
  { text: '冲浪', difficulty: 'hard', category: 'action' },
  { text: '攀岩', difficulty: 'hard', category: 'action' },
  { text: '跳伞', difficulty: 'hard', category: 'action' },
  { text: '潜水', difficulty: 'hard', category: 'action' },
  { text: '翻跟头', difficulty: 'hard', category: 'action' },

  // ==================== 职业（profession） ====================
  // easy
  { text: '医生', difficulty: 'easy', category: 'profession' },
  { text: '老师', difficulty: 'easy', category: 'profession' },
  { text: '警察', difficulty: 'easy', category: 'profession' },
  { text: '厨师', difficulty: 'easy', category: 'profession' },
  { text: '军人', difficulty: 'easy', category: 'profession' },
  { text: '工人', difficulty: 'easy', category: 'profession' },
  // medium
  { text: '消防员', difficulty: 'medium', category: 'profession' },
  { text: '飞行员', difficulty: 'medium', category: 'profession' },
  { text: '护士', difficulty: 'medium', category: 'profession' },
  { text: '画家', difficulty: 'medium', category: 'profession' },
  { text: '歌手', difficulty: 'medium', category: 'profession' },
  { text: '司机', difficulty: 'medium', category: 'profession' },
  { text: '农民', difficulty: 'medium', category: 'profession' },
  { text: '理发师', difficulty: 'medium', category: 'profession' },
  // hard
  { text: '宇航员', difficulty: 'hard', category: 'profession' },
  { text: '魔术师', difficulty: 'hard', category: 'profession' },
  { text: '考古学家', difficulty: 'hard', category: 'profession' },
  { text: '建筑师', difficulty: 'hard', category: 'profession' },
  { text: '指挥家', difficulty: 'hard', category: 'profession' },

  // ==================== 地点（place） ====================
  // easy
  { text: '学校', difficulty: 'easy', category: 'place' },
  { text: '医院', difficulty: 'easy', category: 'place' },
  { text: '超市', difficulty: 'easy', category: 'place' },
  { text: '公园', difficulty: 'easy', category: 'place' },
  { text: '动物园', difficulty: 'easy', category: 'place' },
  { text: '家', difficulty: 'easy', category: 'place' },
  // medium
  { text: '图书馆', difficulty: 'medium', category: 'place' },
  { text: '游乐场', difficulty: 'medium', category: 'place' },
  { text: '电影院', difficulty: 'medium', category: 'place' },
  { text: '火车站', difficulty: 'medium', category: 'place' },
  { text: '游泳池', difficulty: 'medium', category: 'place' },
  { text: '博物馆', difficulty: 'medium', category: 'place' },
  { text: '加油站', difficulty: 'medium', category: 'place' },
  { text: '海滩', difficulty: 'medium', category: 'place' },
  { text: '机场', difficulty: 'medium', category: 'place' },
  // hard
  { text: '长城', difficulty: 'hard', category: 'place' },
  { text: '金字塔', difficulty: 'hard', category: 'place' },
  { text: '自由女神像', difficulty: 'hard', category: 'place' },
  { text: '埃菲尔铁塔', difficulty: 'hard', category: 'place' },
  { text: '天安门', difficulty: 'hard', category: 'place' },
  { text: '故宫', difficulty: 'hard', category: 'place' },
  { text: '比萨斜塔', difficulty: 'hard', category: 'place' },

  // ==================== 其他（other） ====================
  // easy
  { text: '太阳', difficulty: 'easy', category: 'other' },
  { text: '月亮', difficulty: 'easy', category: 'other' },
  { text: '星星', difficulty: 'easy', category: 'other' },
  { text: '彩虹', difficulty: 'easy', category: 'other' },
  { text: '雪人', difficulty: 'easy', category: 'other' },
  { text: '圣诞树', difficulty: 'easy', category: 'other' },
  { text: '气球', difficulty: 'easy', category: 'other' },
  { text: '花', difficulty: 'easy', category: 'other' },
  { text: '树', difficulty: 'easy', category: 'other' },
  { text: '云', difficulty: 'easy', category: 'other' },
  { text: '火山', difficulty: 'easy', category: 'other' },
  { text: '闪电', difficulty: 'easy', category: 'other' },
  { text: '雪', difficulty: 'easy', category: 'other' },
  { text: '风', difficulty: 'easy', category: 'other' },
  { text: '火', difficulty: 'easy', category: 'other' },
  { text: '山', difficulty: 'easy', category: 'other' },
  { text: '河', difficulty: 'easy', category: 'other' },
  // medium
  { text: '飞机', difficulty: 'medium', category: 'other' },
  { text: '火箭', difficulty: 'medium', category: 'other' },
  { text: '轮船', difficulty: 'medium', category: 'other' },
  { text: '自行车', difficulty: 'medium', category: 'other' },
  { text: '直升机', difficulty: 'medium', category: 'other' },
  { text: '潜水艇', difficulty: 'medium', category: 'other' },
  { text: '救护车', difficulty: 'medium', category: 'other' },
  { text: '消防车', difficulty: 'medium', category: 'other' },
  { text: '龙卷风', difficulty: 'medium', category: 'other' },
  { text: '仙人掌', difficulty: 'medium', category: 'other' },
  { text: '向日葵', difficulty: 'medium', category: 'other' },
  { text: '稻草人', difficulty: 'medium', category: 'other' },
  { text: '雪花', difficulty: 'medium', category: 'other' },
  { text: '沙滩', difficulty: 'medium', category: 'other' },
  // hard
  { text: '海市蜃楼', difficulty: 'hard', category: 'other' },
  { text: '北极光', difficulty: 'hard', category: 'other' },
  { text: '日食', difficulty: 'hard', category: 'other' },
  { text: '黑洞', difficulty: 'hard', category: 'other' },
  { text: '地震', difficulty: 'hard', category: 'other' },
  { text: '沙尘暴', difficulty: 'hard', category: 'other' },
  { text: '机器人', difficulty: 'hard', category: 'other' },
  { text: '外星人', difficulty: 'hard', category: 'other' },
  { text: '时光机', difficulty: 'hard', category: 'other' },
  { text: '迷宫', difficulty: 'hard', category: 'other' },
  { text: '海盗船', difficulty: 'hard', category: 'other' },
  { text: '木乃伊', difficulty: 'hard', category: 'other' },
  { text: '稻田', difficulty: 'hard', category: 'other' },
  { text: '灯笼', difficulty: 'hard', category: 'other' },
];

// ============================================================
// 词库管理函数
// ============================================================

/**
 * 获取完整词库
 * @returns 所有内置词语的副本
 */
export function getWordPool(): Word[] {
  return [...WORD_POOL];
}

/**
 * 从词库中随机选取 3 个不同难度的候选词语（1 easy + 1 medium + 1 hard）
 * 排除已使用过的词语
 * @param usedWords 已使用的词语文本列表
 * @returns 包含 3 个不同难度词语的数组 [easy, medium, hard]
 */
export function pickCandidateWords(usedWords: string[]): Word[] {
  const usedSet = new Set(usedWords);

  // 按难度分组，排除已用词
  const easyWords = WORD_POOL.filter(w => w.difficulty === 'easy' && !usedSet.has(w.text));
  const mediumWords = WORD_POOL.filter(w => w.difficulty === 'medium' && !usedSet.has(w.text));
  const hardWords = WORD_POOL.filter(w => w.difficulty === 'hard' && !usedSet.has(w.text));

  // 从每个难度中随机选一个
  const pickRandom = (words: Word[]): Word => {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
  };

  return [
    pickRandom(easyWords),
    pickRandom(mediumWords),
    pickRandom(hardWords),
  ];
}

/**
 * 将词库序列化为 JSON 字符串
 * @param words 词语数组
 * @returns JSON 字符串
 */
export function serializeWordPool(words: Word[]): string {
  return JSON.stringify(words);
}

/**
 * 将 JSON 字符串反序列化为词库
 * @param json JSON 字符串
 * @returns 词语数组
 */
export function deserializeWordPool(json: string): Word[] {
  return JSON.parse(json) as Word[];
}
