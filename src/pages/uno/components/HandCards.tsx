/**
 * 手牌区域组件
 *
 * 在页面底部展示当前玩家手牌
 * 可出的牌高亮，不可出的牌灰显
 * 点击可出的牌发送出牌请求
 */

import CardView from './CardView'
import type { Card, CardColor } from '../context/GameContext'

interface HandCardsProps {
  cards: Card[]
  playableCardIds: string[]
  isMyTurn: boolean
  onPlayCard: (cardId: string, chosenColor?: CardColor) => void
  onNeedChooseColor: (cardId: string) => void
}

export default function HandCards({
  cards,
  playableCardIds,
  isMyTurn,
  onPlayCard,
  onNeedChooseColor,
}: HandCardsProps) {
  const handleClick = (card: Card) => {
    if (!isMyTurn) return
    if (!playableCardIds.includes(card.id)) return

    // Wild 牌需要先选颜色
    if (card.value === 'wild' || card.value === 'wild_draw_four') {
      onNeedChooseColor(card.id)
      return
    }

    onPlayCard(card.id)
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-end justify-center gap-1 min-w-min px-4">
        {cards.map((card) => {
          const isPlayable = isMyTurn && playableCardIds.includes(card.id)
          return (
            <div
              key={card.id}
              className="transition-transform duration-200 flex-shrink-0"
            >
              <CardView
                card={card}
                playable={isPlayable}
                onClick={isPlayable ? () => handleClick(card) : undefined}
                size="md"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
