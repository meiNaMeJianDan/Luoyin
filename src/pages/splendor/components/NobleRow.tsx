/**
 * 贵族展示区 — 顶部一行展示所有公共贵族
 */

import type { Noble } from '../context/SplendorGameContext'
import { NobleCard } from './NobleCard'

interface NobleRowProps {
  nobles: Noble[]
}

export function NobleRow({ nobles }: NobleRowProps) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {nobles.map(noble => (
        <NobleCard key={noble.id} noble={noble} />
      ))}
      {nobles.length === 0 && (
        <p className="text-xs text-white/40">暂无贵族</p>
      )}
    </div>
  )
}
