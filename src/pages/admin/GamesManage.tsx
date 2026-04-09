import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, FileText, Upload } from 'lucide-react';

import { useAllGames } from '@/hooks/useGameData';
import {
  useCreateGame,
  useUpdateGame,
  useDeleteGame,
  useUploadImage,
} from '@/hooks/useAdminData';
import type { Game } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============ 表单校验 schema ============

const gameFormSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  type: z.string().min(1, '类型不能为空'),
  players: z.string().min(1, '玩家人数不能为空'),
  time: z.string().min(1, '游戏时长不能为空'),
  image: z.string().min(1, '图片路径不能为空'),
  difficulty: z.string().min(1, '难度不能为空'),
  tags: z.string().min(1, '标签不能为空'),
  isHot: z.boolean(),
  isTrending: z.boolean(),
  rank: z.string(),
  comment: z.string(),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

// ============ 默认表单值 ============

const defaultFormValues: GameFormValues = {
  title: '',
  type: '',
  players: '',
  time: '',
  image: '',
  difficulty: '',
  tags: '',
  isHot: false,
  isTrending: false,
  rank: '',
  comment: '',
};

// ============ 游戏表单 Dialog 组件 ============

function GameFormDialog({
  open,
  onOpenChange,
  editingGame,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGame: Game | null;
}) {
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const uploadImage = useUploadImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingGame !== null;

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: defaultFormValues,
    values: editingGame
      ? {
          title: editingGame.title,
          type: editingGame.type,
          players: editingGame.players,
          time: editingGame.time,
          image: editingGame.image,
          difficulty: editingGame.difficulty,
          tags: editingGame.tags.join(', '),
          isHot: editingGame.isHot,
          isTrending: editingGame.isTrending,
          rank: editingGame.rank?.toString() ?? '',
          comment: editingGame.comment ?? '',
        }
      : defaultFormValues,
  });

  const isPending = createGame.isPending || updateGame.isPending;

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const path = await uploadImage.mutateAsync(file);
      form.setValue('image', path, { shouldValidate: true });
      toast.success('图片上传成功');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '图片上传失败');
    }
    // 重置 file input，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 提交表单
  const onSubmit = async (values: GameFormValues) => {
    // 将逗号分隔的 tags 转为数组
    const tagsArray = values.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: values.title,
      type: values.type,
      players: values.players,
      time: values.time,
      image: values.image,
      difficulty: values.difficulty,
      tags: tagsArray,
      isHot: values.isHot,
      isTrending: values.isTrending,
      rank: values.rank ? Number(values.rank) : null,
      comment: values.comment || null,
    };

    try {
      if (isEditing) {
        await updateGame.mutateAsync({ id: editingGame.id, data: payload });
        toast.success('游戏更新成功');
      } else {
        await createGame.mutateAsync(payload);
        toast.success('游戏创建成功');
      }
      onOpenChange(false);
      form.reset(defaultFormValues);
    } catch (err) {
      // 服务端校验错误展示在表单顶部
      const message = err instanceof Error ? err.message : '操作失败';
      form.setError('root', { message });
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) form.reset(defaultFormValues);
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑游戏' : '新增游戏'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 服务端错误提示 */}
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          {/* 标题 */}
          <div className="grid gap-1.5">
            <Label htmlFor="title">标题 *</Label>
            <Input id="title" {...form.register('title')} placeholder="游戏标题" />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* 类型 + 难度 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="type">类型 *</Label>
              <Input id="type" {...form.register('type')} placeholder="如：策略" />
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="difficulty">难度 *</Label>
              <Input id="difficulty" {...form.register('difficulty')} placeholder="如：中等" />
              {form.formState.errors.difficulty && (
                <p className="text-sm text-destructive">{form.formState.errors.difficulty.message}</p>
              )}
            </div>
          </div>

          {/* 玩家人数 + 时长 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="players">玩家人数 *</Label>
              <Input id="players" {...form.register('players')} placeholder="如：3-5人" />
              {form.formState.errors.players && (
                <p className="text-sm text-destructive">{form.formState.errors.players.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="time">游戏时长 *</Label>
              <Input id="time" {...form.register('time')} placeholder="如：60-90分钟" />
              {form.formState.errors.time && (
                <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>
              )}
            </div>
          </div>

          {/* 图片 */}
          <div className="grid gap-1.5">
            <Label htmlFor="image">图片 *</Label>
            <div className="flex gap-2">
              <Input id="image" {...form.register('image')} placeholder="图片路径" className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadImage.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1">上传</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            {form.formState.errors.image && (
              <p className="text-sm text-destructive">{form.formState.errors.image.message}</p>
            )}
          </div>

          {/* 标签 */}
          <div className="grid gap-1.5">
            <Label htmlFor="tags">标签 *（逗号分隔）</Label>
            <Input id="tags" {...form.register('tags')} placeholder="如：策略, 经典, 多人" />
            {form.formState.errors.tags && (
              <p className="text-sm text-destructive">{form.formState.errors.tags.message}</p>
            )}
          </div>

          {/* 排名 + 评语 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="rank">排名（可选）</Label>
              <Input id="rank" type="number" {...form.register('rank')} placeholder="如：1" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="comment">评语（可选）</Label>
              <Input id="comment" {...form.register('comment')} placeholder="一句话评语" />
            </div>
          </div>

          {/* 开关：是否热门 + 是否趋势 */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Switch
                id="isHot"
                checked={form.watch('isHot')}
                onCheckedChange={(v) => form.setValue('isHot', v)}
              />
              <Label htmlFor="isHot">热门推荐</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isTrending"
                checked={form.watch('isTrending')}
                onCheckedChange={(v) => form.setValue('isTrending', v)}
              />
              <Label htmlFor="isTrending">趋势上升</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============ 删除确认 AlertDialog 组件 ============

function DeleteGameDialog({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const deleteGame = useDeleteGame();

  const handleDelete = async () => {
    if (!game) return;
    try {
      await deleteGame.mutateAsync(game.id);
      toast.success(`已删除游戏「${game.title}」`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <AlertDialog open={game !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除游戏「{game?.title}」吗？此操作将同时删除关联的游戏详情，且不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteGame.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteGame.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============ 游戏管理主页面 ============

const GamesManage = () => {
  const navigate = useNavigate();
  const { data: games, isLoading } = useAllGames();

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [deletingGame, setDeletingGame] = useState<Game | null>(null);

  // 打开新增弹窗
  const handleAdd = () => {
    setEditingGame(null);
    setFormOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (game: Game) => {
    setEditingGame(game);
    setFormOpen(true);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载游戏列表中…</span>
      </div>
    );
  }

  return (
    <div>
      {/* 页面标题与操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">游戏管理</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增游戏
        </Button>
      </div>

      {/* 游戏列表表格 */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>标题</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>玩家人数</TableHead>
            <TableHead>时长</TableHead>
            <TableHead>难度</TableHead>
            <TableHead>热门</TableHead>
            <TableHead>趋势</TableHead>
            <TableHead>排名</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games?.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                暂无游戏数据
              </TableCell>
            </TableRow>
          )}
          {games?.map((game) => (
            <TableRow key={game.id}>
              <TableCell>{game.id}</TableCell>
              <TableCell className="font-medium">{game.title}</TableCell>
              <TableCell>{game.type}</TableCell>
              <TableCell>{game.players}</TableCell>
              <TableCell>{game.time}</TableCell>
              <TableCell>{game.difficulty}</TableCell>
              <TableCell>{game.isHot ? '✅' : '—'}</TableCell>
              <TableCell>{game.isTrending ? '✅' : '—'}</TableCell>
              <TableCell>{game.rank ?? '—'}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(game)} title="编辑">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingGame(game)} title="删除">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/admin/games/${game.id}/details`)}
                    title="管理详情"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 新增/编辑表单弹窗 */}
      <GameFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingGame={editingGame}
      />

      {/* 删除确认弹窗 */}
      <DeleteGameDialog game={deletingGame} onClose={() => setDeletingGame(null)} />
    </div>
  );
};

export default GamesManage;
