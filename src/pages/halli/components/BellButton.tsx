/**
 * 中央铃铛按钮组件
 *
 * 铃铛按钮居中显示，使用 🔔 emoji
 * 按铃成功时播放震动动画（CSS animation）
 * 按铃窗口期外禁用按钮
 */

import React from 'react'

interface BellButtonProps {
  /** 按铃回调 */
  onRing: () => void
  /** 是否禁用（按铃窗口期外） */
  disabled: boolean
  /** 是否正在震动（按铃成功反馈） */
  isRinging?: boolean
}

/** 中央铃铛按钮组件 */
export const BellButton = React.memo(function BellButton({
  onRing,
  disabled,
  isRinging = false,
}: BellButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onRing}
        disabled={disabled}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-200 select-none
          ${
            disabled
              ? 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-60'
              : 'bg-gradient-to-b from-yellow-300 to-yellow-500 border-yellow-600 hover:from-yellow-400 hover:to-yellow-600 active:scale-95 cursor-pointer shadow-lg hover:shadow-xl'
          }
          border-4
          ${isRinging ? 'animate-bell-ring' : ''}
        `}
        aria-label="按铃"
      >
        <span className="text-4xl">{disabled ? '🔕' : '🔔'}</span>

        {/* 按铃可用时的脉冲提示 */}
        {!disabled && (
          <span className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping opacity-30" />
        )}
      </button>

      <span className={`text-xs ${disabled ? 'text-gray-400' : 'text-yellow-600 font-medium'}`}>
        {disabled ? '等待翻牌' : '快按铃！'}
      </span>

      {/* 震动动画 CSS */}
      <style>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-12deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-8deg); }
          50% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(2deg); }
          80% { transform: rotate(-1deg); }
          90% { transform: rotate(0.5deg); }
        }
        .animate-bell-ring {
          animation: bell-ring 0.6s ease-in-out;
        }
      `}</style>
    </div>
  )
})
