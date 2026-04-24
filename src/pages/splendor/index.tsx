/**
 * 璀璨宝石首页
 *
 * 创建房间/加入房间，昵称输入，翡翠绿色系渐变
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
import { Gem, Users, Sparkles } from 'lucide-react'

function SplendorHomeInner() {
  const { createRoom, joinRoom, isConnected } = useGame()

  const [roomId, setRoomId] = useState('')
  const [nickname, setNickname] = useState('')
  const [dialogMode, setDialogMode] = useState<'create' | 'join' | null>(null)

  const isRoomIdValid = /^\d{6}$/.test(roomId)
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-700 to-green-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 space-y-8">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 bg-clip-text text-transparent">
            璀璨宝石
          </h1>
          <p className="text-gray-500 text-sm">在线联机 · 2～4 人实时对战</p>
        </div>

        {/* 简要规则 */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Sparkles className="size-4" />
            <span>快速规则</span>
          </div>
          <p>收集宝石筹码，购买发展卡获得永久折扣和声望点数，吸引贵族来访。率先达到 15 点声望的玩家获胜！</p>
        </div>

        {/* 创建房间 */}
        <Button
          className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setDialogMode('create')}
          disabled={!isConnected}
        >
          <Gem className="size-5 mr-2" />
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

        {!isConnected && (
          <p className="text-center text-xs text-emerald-600">正在连接服务器...</p>
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
              <Button onClick={handleConfirm} disabled={!isNicknameValid} className="bg-emerald-600 hover:bg-emerald-700">
                确认
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function SplendorHome() {
  return <SplendorHomeInner />
}
