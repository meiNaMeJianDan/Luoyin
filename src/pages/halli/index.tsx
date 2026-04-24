/**
 * 德国心脏病首页
 *
 * 创建房间/加入房间，昵称输入
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useGame } from './hooks/useGame'
import { Gamepad2, Users, Sparkles } from 'lucide-react'

/** 首页内部组件（需要在 HalliGameProvider 内） */
function HalliHomeInner() {
  const { createRoom, joinRoom, isConnected } = useGame()

  const [roomId, setRoomId] = useState('')
  const [nickname, setNickname] = useState('')
  const [dialogMode, setDialogMode] = useState<'create' | 'join' | null>(null)

  // 房间号校验：6 位数字
  const isRoomIdValid = /^\d{6}$/.test(roomId)
  // 昵称校验：2～8 个字符
  const isNicknameValid = nickname.trim().length >= 2 && nickname.trim().length <= 8

  const handleConfirm = () => {
    if (!isNicknameValid) return
    if (dialogMode === 'create') {
      createRoom(nickname.trim())
    } else if (dialogMode === 'join' && isRoomIdValid) {
      joinRoom(roomId, nickname.trim())
    }
    setDialogMode(null)
    setNickname('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            德国心脏病
          </h1>
          <p className="text-gray-500 text-sm">在线联机 · 2～6 人实时对战</p>
        </div>

        {/* 简要规则 */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Sparkles className="size-4" />
            <span>快速规则</span>
          </div>
          <p>轮流翻牌，当场上某种水果总数恰好为 5 时抢按铃铛！最先按铃者收走所有翻出的牌，最后剩余的玩家获胜！</p>
        </div>

        {/* 创建房间 */}
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={() => setDialogMode('create')}
          disabled={!isConnected}
        >
          <Gamepad2 className="size-5 mr-2" />
          创建房间
        </Button>

        {/* 加入房间 */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="输入 6 位房间号"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
            />
            <Button
              variant="outline"
              className="shrink-0"
              disabled={!isRoomIdValid || !isConnected}
              onClick={() => setDialogMode('join')}
            >
              <Users className="size-4 mr-1" />
              加入
            </Button>
          </div>
        </div>

        {/* 连接状态 */}
        {!isConnected && (
          <p className="text-center text-xs text-orange-500">正在连接服务器...</p>
        )}

        {/* 昵称输入弹窗 */}
        <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create' ? '创建房间' : '加入房间'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">输入你的昵称（2～8 个字符）</label>
              <Input
                placeholder="你的昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 8))}
                maxLength={8}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogMode(null)}>
                取消
              </Button>
              <Button onClick={handleConfirm} disabled={!isNicknameValid}>
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

/** 德国心脏病首页（HalliGameProvider 由 App.tsx 统一提供） */
export default function HalliHome() {
  return <HalliHomeInner />
}
