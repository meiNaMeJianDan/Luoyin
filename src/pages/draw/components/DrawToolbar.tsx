/**
 * 绘画工具栏
 *
 * 12 种预设颜色选择器、3 种画笔粗细、橡皮擦、撤销、清空按钮。
 * 仅 Drawer 可见。
 */

import React from 'react'
import type { DrawToolType } from '../context/DrawGameContext'
import { Eraser, Undo2, Trash2, Pen } from 'lucide-react'

/** 预设颜色（与 server/src/draw/types.ts 保持一致） */
const PRESET_COLORS = [
  '#000000', '#FF0000', '#0000FF', '#00AA00',
  '#FFFF00', '#FF8800', '#8800FF', '#FF69B4',
  '#8B4513', '#808080', '#FFFFFF', '#00CCCC',
]

/** 画笔粗细选项 */
const LINE_WIDTHS = [2, 5, 10]

interface DrawToolbarProps {
  color: string
  lineWidth: number
  tool: DrawToolType
  onColorChange: (color: string) => void
  onLineWidthChange: (width: number) => void
  onToolChange: (tool: DrawToolType) => void
  onUndo: () => void
  onClear: () => void
}

const DrawToolbar = React.memo(function DrawToolbar({
  color,
  lineWidth,
  tool,
  onColorChange,
  onLineWidthChange,
  onToolChange,
  onUndo,
  onClear,
}: DrawToolbarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap bg-white rounded-xl px-4 py-2.5 shadow border border-gray-200">
      {/* 颜色选择器 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              onColorChange(c)
              onToolChange('pen')
            }}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              tool === 'pen' && color === c ? 'border-indigo-500 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-200" />

      {/* 画笔粗细 */}
      <div className="flex items-center gap-1.5">
        {LINE_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => onLineWidthChange(w)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              lineWidth === w ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={`${w}px`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: Math.max(w, 4), height: Math.max(w, 4) }}
            />
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-200" />

      {/* 画笔 / 橡皮擦 */}
      <button
        onClick={() => onToolChange('pen')}
        className={`p-2 rounded-lg transition-colors ${
          tool === 'pen' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'
        }`}
        title="画笔"
      >
        <Pen className="size-4" />
      </button>
      <button
        onClick={() => onToolChange('eraser')}
        className={`p-2 rounded-lg transition-colors ${
          tool === 'eraser' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'
        }`}
        title="橡皮擦"
      >
        <Eraser className="size-4" />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-200" />

      {/* 撤销 */}
      <button
        onClick={onUndo}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        title="撤销"
      >
        <Undo2 className="size-4" />
      </button>

      {/* 清空 */}
      <button
        onClick={onClear}
        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
        title="清空画板"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  )
})

export default DrawToolbar
