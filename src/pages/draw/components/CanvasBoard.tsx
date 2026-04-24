/**
 * 画板组件
 *
 * 基于 HTML5 Canvas 实现自由绘制，使用百分比坐标（0-1）适配不同屏幕。
 * Drawer 模式可绘画，Guesser 模式仅查看。
 * 通过 forwardRef + useImperativeHandle 暴露 replayAction / replayHistory / undoLast / clearAll 方法。
 */

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import type { DrawAction, DrawToolType } from '../context/DrawGameContext'

export interface CanvasBoardProps {
  /** 是否为画画玩家 */
  isDrawer: boolean
  /** 画笔颜色 */
  color: string
  /** 画笔粗细 */
  lineWidth: number
  /** 当前工具 */
  tool: DrawToolType
  /** 绘画动作回调 */
  onDrawAction: (action: DrawAction) => void
  /** 撤销回调 */
  onUndo: () => void
  /** 清空回调 */
  onClear: () => void
}

export interface CanvasBoardRef {
  /** 重放单个绘画动作 */
  replayAction: (action: DrawAction) => void
  /** 批量重放绘画历史 */
  replayHistory: (actions: DrawAction[]) => void
  /** 撤销最后一笔（本地重绘） */
  undoLast: () => void
  /** 清空画板 */
  clearAll: () => void
}

/** 生成唯一 ID */
let actionIdCounter = 0
function genActionId(): string {
  return `a_${Date.now()}_${++actionIdCounter}`
}

const CanvasBoard = forwardRef<CanvasBoardRef, CanvasBoardProps>(
  function CanvasBoard({ isDrawer, color, lineWidth, tool, onDrawAction, onUndo, onClear }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    /** 本地维护的绘画历史（用于撤销时重绘） */
    const historyRef = useRef<DrawAction[]>([])
    /** 当前正在绘制的笔画 */
    const currentStrokeRef = useRef<DrawAction | null>(null)
    /** 是否正在绘制 */
    const isDrawingRef = useRef(false)

    /** 获取 Canvas 2D 上下文 */
    const getCtx = useCallback(() => {
      return canvasRef.current?.getContext('2d') ?? null
    }, [])

    /** 获取画布实际尺寸 */
    const getCanvasSize = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return { w: 0, h: 0 }
      return { w: canvas.width, h: canvas.height }
    }, [])

    /** 将百分比坐标转换为像素坐标 */
    const toPixel = useCallback(
      (point: { x: number; y: number }) => {
        const { w, h } = getCanvasSize()
        return { x: point.x * w, y: point.y * h }
      },
      [getCanvasSize],
    )

    /** 将像素坐标转换为百分比坐标 */
    const toPercent = useCallback(
      (px: number, py: number) => {
        const { w, h } = getCanvasSize()
        if (w === 0 || h === 0) return { x: 0, y: 0 }
        return {
          x: Math.max(0, Math.min(1, px / w)),
          y: Math.max(0, Math.min(1, py / h)),
        }
      },
      [getCanvasSize],
    )

    /** 在 Canvas 上绘制一个 DrawAction */
    const drawAction = useCallback(
      (ctx: CanvasRenderingContext2D, action: DrawAction) => {
        if (action.points.length === 0) return
        const { w, h } = getCanvasSize()
        if (w === 0 || h === 0) return

        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = action.lineWidth

        if (action.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.strokeStyle = 'rgba(0,0,0,1)'
        } else {
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = action.color ?? '#000000'
        }

        ctx.beginPath()
        const first = toPixel(action.points[0])
        ctx.moveTo(first.x, first.y)

        if (action.points.length === 1) {
          /* 单点画一个小圆 */
          ctx.arc(first.x, first.y, action.lineWidth / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          for (let i = 1; i < action.points.length; i++) {
            const p = toPixel(action.points[i])
            ctx.lineTo(p.x, p.y)
          }
          ctx.stroke()
        }

        ctx.restore()
      },
      [getCanvasSize, toPixel],
    )

    /** 清空画布 */
    const clearCanvas = useCallback(() => {
      const ctx = getCtx()
      if (!ctx) return
      const { w, h } = getCanvasSize()
      ctx.clearRect(0, 0, w, h)
    }, [getCtx, getCanvasSize])

    /** 根据历史重绘整个画布 */
    const redrawAll = useCallback(() => {
      clearCanvas()
      const ctx = getCtx()
      if (!ctx) return
      for (const action of historyRef.current) {
        drawAction(ctx, action)
      }
    }, [clearCanvas, getCtx, drawAction])

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        replayAction(action: DrawAction) {
          historyRef.current.push(action)
          const ctx = getCtx()
          if (ctx) drawAction(ctx, action)
        },
        replayHistory(actions: DrawAction[]) {
          historyRef.current = [...actions]
          redrawAll()
        },
        undoLast() {
          if (historyRef.current.length > 0) {
            historyRef.current.pop()
            redrawAll()
          }
        },
        clearAll() {
          historyRef.current = []
          clearCanvas()
        },
      }),
      [getCtx, drawAction, redrawAll, clearCanvas],
    )

    /** 调整 Canvas 分辨率以匹配容器 */
    useEffect(() => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const observer = new ResizeObserver(() => {
        const rect = container.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(dpr, dpr)
        /* 分辨率变化后需要重绘 */
        redrawAll()
      })

      observer.observe(container)
      return () => observer.disconnect()
    }, [redrawAll])

    // ============================================================
    // 鼠标 / 触摸事件处理（仅 Drawer 模式）
    // ============================================================

    /** 获取事件相对于 Canvas 的像素坐标 */
    const getEventPos = useCallback(
      (e: MouseEvent | Touch) => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }
        const rect = canvas.getBoundingClientRect()
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      },
      [],
    )

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawer) return
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        isDrawingRef.current = true

        const pos = getEventPos(e.nativeEvent)
        const pct = toPercent(pos.x, pos.y)

        const stroke: DrawAction = {
          id: genActionId(),
          tool,
          color: tool === 'eraser' ? null : color,
          lineWidth,
          points: [pct],
        }
        currentStrokeRef.current = stroke

        /* 实时绘制起点 */
        const ctx = getCtx()
        if (ctx) drawAction(ctx, stroke)
      },
      [isDrawer, tool, color, lineWidth, getEventPos, toPercent, getCtx, drawAction],
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return
        e.preventDefault()

        const pos = getEventPos(e.nativeEvent)
        const pct = toPercent(pos.x, pos.y)
        currentStrokeRef.current.points.push(pct)

        /* 增量绘制最后一段 */
        const ctx = getCtx()
        if (!ctx) return
        const pts = currentStrokeRef.current.points
        if (pts.length < 2) return

        const { w, h } = getCanvasSize()
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = currentStrokeRef.current.lineWidth

        if (currentStrokeRef.current.tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out'
          ctx.strokeStyle = 'rgba(0,0,0,1)'
        } else {
          ctx.globalCompositeOperation = 'source-over'
          ctx.strokeStyle = currentStrokeRef.current.color ?? '#000000'
        }

        const prev = pts[pts.length - 2]
        const curr = pts[pts.length - 1]
        ctx.beginPath()
        ctx.moveTo(prev.x * w, prev.y * h)
        ctx.lineTo(curr.x * w, curr.y * h)
        ctx.stroke()
        ctx.restore()
      },
      [isDrawer, getEventPos, toPercent, getCtx, getCanvasSize],
    )

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!isDrawer || !isDrawingRef.current) return
        e.preventDefault()
        isDrawingRef.current = false

        const stroke = currentStrokeRef.current
        currentStrokeRef.current = null
        if (!stroke) return

        /* 保存到本地历史 */
        historyRef.current.push(stroke)
        /* 通知父组件 */
        onDrawAction(stroke)
      },
      [isDrawer, onDrawAction],
    )

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-inner"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ cursor: isDrawer ? 'crosshair' : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    )
  },
)

export default CanvasBoard
