import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react';

import { useGameById, useGameDetails } from '@/hooks/useGameData';
import {
  useCreateGameDetail,
  useUpdateGameDetail,
  useDeleteGameDetail,
} from '@/hooks/useAdminData';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ============ 表单校验 schema ============

const gameDetailFormSchema = z.object({
  introduction: z.string().min(1, '简介不能为空'),
  objective: z.string().min(1, '目标不能为空'),
  victoryConditions: z
    .array(
      z.object({
        text: z.string(),
        image: z.string(),
      }),
    )
    .min(1, '至少需要一个获胜条件'),
  gameplaySteps: z
    .array(
      z.object({
        title: z.string().min(1, '步骤标题不能为空'),
        desc: z.string().min(1, '步骤描述不能为空'),
        image: z.string(),
      }),
    )
    .min(1, '至少需要一个玩法步骤'),
  tips: z
    .array(
      z.object({
        value: z.string().min(1, '提示内容不能为空'),
      }),
    )
    .min(1, '至少需要一条新手提示'),
});

type GameDetailFormValues = z.infer<typeof gameDetailFormSchema>;

// ============ 游戏详情管理页面 ============

const GameDetailManage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const gameId = id ? parseInt(id, 10) : 0;

  // 获取游戏基础信息和详情数据
  const { data: game, isLoading: gameLoading } = useGameById(gameId);
  const { data: details, isLoading: detailsLoading, error: detailsError } = useGameDetails(gameId);

  // mutation hooks
  const createDetail = useCreateGameDetail();
  const updateDetail = useUpdateGameDetail();
  const deleteDetail = useDeleteGameDetail();

  // 判断是否已有详情（404 错误表示无详情）
  const hasDetails = !!details && !detailsError;

  // 将 API 返回的详情数据转换为表单值
  const detailsToFormValues = (): GameDetailFormValues | undefined => {
    if (!details) return undefined;
    return {
      introduction: details.introduction,
      objective: details.objective,
      victoryConditions: details.victoryConditions.map((vc) => ({
        text: vc.text ?? '',
        image: (vc.image as string) ?? '',
      })),
      gameplaySteps: details.gameplaySteps.map((gs) => ({
        title: gs.title,
        // desc 可能是数组，转为换行分隔的字符串
        desc: Array.isArray(gs.desc) ? gs.desc.join('\n') : gs.desc,
        image: (gs.image as string) ?? '',
      })),
      tips: details.tips.map((t) => ({ value: t })),
    };
  };

  const defaultValues: GameDetailFormValues = {
    introduction: '',
    objective: '',
    victoryConditions: [{ text: '', image: '' }],
    gameplaySteps: [{ title: '', desc: '', image: '' }],
    tips: [{ value: '' }],
  };

  const form = useForm<GameDetailFormValues>({
    resolver: zodResolver(gameDetailFormSchema),
    defaultValues,
    values: hasDetails ? detailsToFormValues() : undefined,
  });

  // 动态列表管理
  const vcFields = useFieldArray({ control: form.control, name: 'victoryConditions' });
  const gsFields = useFieldArray({ control: form.control, name: 'gameplaySteps' });
  const tipFields = useFieldArray({ control: form.control, name: 'tips' });

  const isPending = createDetail.isPending || updateDetail.isPending;

  // 提交表单
  const onSubmit = async (values: GameDetailFormValues) => {
    // 构建 API payload
    const payload = {
      introduction: values.introduction,
      objective: values.objective,
      victoryConditions: values.victoryConditions.map((vc) => ({
        text: vc.text || undefined,
        image: vc.image || null,
      })),
      gameplaySteps: values.gameplaySteps.map((gs) => ({
        title: gs.title,
        // HTML 内容直接作为字符串提交
        desc: gs.desc,
        image: gs.image || null,
      })),
      tips: values.tips.map((t) => t.value),
    };

    try {
      if (hasDetails) {
        await updateDetail.mutateAsync({ gameId, data: payload });
        toast.success('游戏详情更新成功');
      } else {
        await createDetail.mutateAsync({ gameId, data: payload });
        toast.success('游戏详情创建成功');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      toast.error(message);
    }
  };

  // 删除详情
  const handleDelete = async () => {
    try {
      await deleteDetail.mutateAsync(gameId);
      toast.success('游戏详情已删除');
      form.reset(defaultValues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 创建详情（从空状态进入编辑模式）
  const handleCreateMode = () => {
    form.reset(defaultValues);
  };

  // 加载状态
  if (gameLoading || detailsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载中…</span>
      </div>
    );
  }

  // 游戏不存在
  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">游戏不存在</p>
        <Button variant="outline" onClick={() => navigate('/admin/games')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回游戏列表
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题与面包屑 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/games')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{game.title} — 详情管理</h1>
            <p className="text-sm text-muted-foreground">管理该游戏的攻略详情内容</p>
          </div>
        </div>

        {/* 删除详情按钮 */}
        {hasDetails && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleteDetail.isPending}>
                {deleteDetail.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                删除详情
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除「{game.title}」的游戏详情吗？此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* 无详情时的空状态 */}
      {!hasDetails && !form.formState.isDirty && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground">该游戏暂无详情数据</p>
            <Button onClick={handleCreateMode}>
              <Plus className="mr-2 h-4 w-4" />
              创建详情
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 编辑表单（有详情或用户点击了创建） */}
      {(hasDetails || form.formState.isDirty) && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 简介 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>游戏简介 *</Label>
                <Controller
                  name="introduction"
                  control={form.control}
                  render={({ field }) => (
                    <RichTextEditor value={field.value} onChange={field.onChange} placeholder="输入游戏简介" />
                  )}
                />
                {form.formState.errors.introduction && (
                  <p className="text-sm text-destructive">{form.formState.errors.introduction.message}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>游戏目标 *</Label>
                <Controller
                  name="objective"
                  control={form.control}
                  render={({ field }) => (
                    <RichTextEditor value={field.value} onChange={field.onChange} placeholder="输入游戏目标" />
                  )}
                />
                {form.formState.errors.objective && (
                  <p className="text-sm text-destructive">{form.formState.errors.objective.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 获胜条件列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>获胜条件</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => vcFields.append({ text: '', image: '' })}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加条件
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.formState.errors.victoryConditions?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.victoryConditions.root.message}</p>
              )}
              {vcFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start border rounded-lg p-3">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-1">
                      <Label>条件描述</Label>
                      <Controller
                        name={`victoryConditions.${index}.text`}
                        control={form.control}
                        render={({ field }) => (
                          <RichTextEditor value={field.value} onChange={field.onChange} placeholder="获胜条件描述" />
                        )}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>图片路径（可选）</Label>
                      <Input
                        {...form.register(`victoryConditions.${index}.image`)}
                        placeholder="如 /images/xxx.png"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => vcFields.remove(index)}
                    disabled={vcFields.fields.length <= 1}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 玩法步骤列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>玩法步骤</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => gsFields.append({ title: '', desc: '', image: '' })}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加步骤
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.formState.errors.gameplaySteps?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.gameplaySteps.root.message}</p>
              )}
              {gsFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start border rounded-lg p-3">
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-1">
                      <Label>步骤标题 *</Label>
                      <Input
                        {...form.register(`gameplaySteps.${index}.title`)}
                        placeholder="步骤标题"
                      />
                      {form.formState.errors.gameplaySteps?.[index]?.title && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.gameplaySteps[index].title?.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Label>步骤描述 *</Label>
                      <Controller
                        name={`gameplaySteps.${index}.desc`}
                        control={form.control}
                        render={({ field }) => (
                          <RichTextEditor value={field.value} onChange={field.onChange} placeholder="步骤描述" />
                        )}
                      />
                      {form.formState.errors.gameplaySteps?.[index]?.desc && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.gameplaySteps[index].desc?.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <Label>图片路径（可选）</Label>
                      <Input
                        {...form.register(`gameplaySteps.${index}.image`)}
                        placeholder="如 /images/xxx.png"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => gsFields.remove(index)}
                    disabled={gsFields.fields.length <= 1}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 新手提示列表 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>新手提示</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => tipFields.append({ value: '' })}
              >
                <Plus className="mr-1 h-4 w-4" />
                添加提示
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.formState.errors.tips?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.tips.root.message}</p>
              )}
              {tipFields.fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-center">
                  <Input
                    {...form.register(`tips.${index}.value`)}
                    placeholder="输入一条新手提示"
                    className="flex-1"
                  />
                  {form.formState.errors.tips?.[index]?.value && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.tips[index].value?.message}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => tipFields.remove(index)}
                    disabled={tipFields.fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasDetails ? '保存修改' : '创建详情'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GameDetailManage;
