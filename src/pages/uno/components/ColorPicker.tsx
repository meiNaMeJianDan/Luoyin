/**
 * 颜色选择弹窗组件
 *
 * 出 Wild/Wild_Draw_Four 时弹出
 * 提供红/黄/蓝/绿四个颜色选项
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CardColor } from '../context/GameContext'

const colors: { color: CardColor; label: string; bg: string; hover: string }[] = [
  { color: 'red', label: '红', bg: 'bg-red-500', hover: 'hover:bg-red-600' },
  { color: 'yellow', label: '黄', bg: 'bg-yellow-400', hover: 'hover:bg-yellow-500' },
  { color: 'blue', label: '蓝', bg: 'bg-blue-500', hover: 'hover:bg-blue-600' },
  { color: 'green', label: '绿', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
]

interface ColorPickerProps {
  open: boolean
  onChoose: (color: CardColor) => void
}

export default function ColorPicker({ open, onChoose }: ColorPickerProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">选择颜色</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 p-2">
          {colors.map(({ color, label, bg, hover }) => (
            <button
              key={color}
              onClick={() => onChoose(color)}
              className={`${bg} ${hover} text-white font-bold text-lg h-16 rounded-xl transition-all active:scale-95 shadow-md`}
            >
              {label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
