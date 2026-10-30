// 在线游戏入口配置
// 统一维护 5 款联机游戏的展示信息，供首页专区与游戏大厅页复用

import type { LucideIcon } from 'lucide-react';
import { Bell, Gem, Hexagon, Layers, Paintbrush } from 'lucide-react';

export interface OnlineGameEntry {
  /** 唯一标识 */
  key: string;
  /** 游戏名称 */
  title: string;
  /** 一句话定位 */
  subtitle: string;
  /** 支持人数 */
  players: string;
  /** 简介 */
  description: string;
  /** 游戏入口路由 */
  path: string;
  /** 卡片渐变色 */
  gradient: string;
  /** 图标 */
  icon: LucideIcon;
  /** 可选角标 */
  badge?: string;
}

export const ONLINE_GAMES: OnlineGameEntry[] = [
  {
    key: 'uno',
    title: 'UNO 乌诺',
    subtitle: '经典卡牌 · 友尽必备',
    players: '2-4 人',
    description: '出完手牌即获胜，Wild+4 质疑、UNO 喊牌举报，全都在线还原。',
    path: '/uno',
    gradient: 'from-red-500 via-yellow-400 to-green-500',
    icon: Layers,
    badge: '热门',
  },
  {
    key: 'catan',
    title: '卡坦岛',
    subtitle: '资源交易 · 德式策略',
    players: '2-4 人',
    description: '掷骰收资源、修路建城，用交易与策略率先拿到 10 点胜利分。',
    path: '/catan',
    gradient: 'from-amber-600 via-green-700 to-blue-800',
    icon: Hexagon,
    badge: '经典',
  },
  {
    key: 'halli',
    title: '德国心脏病',
    subtitle: '反应竞速 · 按铃抢牌',
    players: '2-6 人',
    description: '翻牌凑齐 5 个相同水果立刻按铃，手速与眼力的双重考验。',
    path: '/halli',
    gradient: 'from-yellow-400 via-orange-500 to-red-500',
    icon: Bell,
  },
  {
    key: 'draw',
    title: '你画我猜',
    subtitle: '实时画板 · 灵魂画手',
    players: '2-8 人',
    description: '轮流作画、队友抢答，200+ 中文词库，猜得越快分数越高。',
    path: '/draw',
    gradient: 'from-blue-500 via-indigo-500 to-purple-600',
    icon: Paintbrush,
  },
  {
    key: 'splendor',
    title: '璀璨宝石',
    subtitle: '宝石经济 · 收集贵族',
    players: '2-4 人',
    description: '收集宝石筹码、购买发展卡，率先达到 15 点声望赢得胜利。',
    path: '/splendor',
    gradient: 'from-emerald-600 via-teal-700 to-green-800',
    icon: Gem,
  },
];
