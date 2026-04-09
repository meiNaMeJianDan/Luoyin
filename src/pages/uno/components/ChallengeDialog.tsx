/**
 * 质疑决策弹窗组件
 *
 * 上一位玩家出 Wild_Draw_Four 时弹出
 * 提供"接受"和"质疑"两个选项
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldQuestion, ShieldCheck } from 'lucide-react'

interface ChallengeDialogProps {
  open: boolean
  onChallenge: () => void
  onAccept: () => void
}

export default function ChallengeDialog({
  open,
  onChallenge,
  onAccept,
}: ChallengeDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Wild +4 质疑</DialogTitle>
          <DialogDescription className="text-center">
            上一位玩家出了 Wild+4，你可以选择接受或质疑
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 p-2">
          <Button
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={onAccept}
          >
            <ShieldCheck className="size-5 mr-2" />
            接受（摸 4 张）
          </Button>
          <Button
            variant="destructive"
            className="flex-1 h-14 text-base"
            onClick={onChallenge}
          >
            <ShieldQuestion className="size-5 mr-2" />
            质疑
          </Button>
        </div>
        <p className="text-xs text-center text-gray-500">
          质疑成功：对方摸 4 张 | 质疑失败：你摸 6 张
        </p>
      </DialogContent>
    </Dialog>
  )
}
