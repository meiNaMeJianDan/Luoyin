/**
 * 翻牌动画组件
 *
 * 实现翻牌动画效果（CSS transition/animation）
 * 使用 CSS 3D transform 实现卡牌翻转
 */

import React from 'react'
import type { FruitCard } from '../context/HalliGameContext'
import { FruitCardComponent } from './FruitCard'

interface CardFlipAnimationProps {
  /** 水果牌数据 */
  card: FruitCard | null
  /** 是否正在翻牌 */
  isFlipping?: boolean
}

/** 翻牌动画组件 */
export const CardFlipAnimation = React.memo(function CardFlipAnimation({
  card,
  isFlipping = false,
}: CardFlipAnimationProps) {
  return (
    <div className="perspective-500">
      <div
        className={`relative transition-transform duration-500 transform-style-3d ${
          isFlipping ? 'animate-flip' : ''
        }`}
      >
        {/* 正面（水果面） */}
        <div className="backface-hidden">
          <FruitCardComponent card={card} faceDown={false} size="md" />
        </div>
      </div>

      {/* 翻牌动画 CSS */}
      <style>{`
        .perspective-500 {
          perspective: 500px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        @keyframes flip {
          0% {
            transform: rotateY(180deg) scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: rotateY(90deg) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        .animate-flip {
          animation: flip 0.5s ease-out;
        }
      `}</style>
    </div>
  )
})
