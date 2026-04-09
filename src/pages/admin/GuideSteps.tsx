import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

import { useGuideSteps } from '@/hooks/useGameData';
import {
  useCreateGuideStep,
  useUpdateGuideStep,
  useDeleteGuideStep,
  useReorderGuideSteps,
} from '@/hooks/useAdminData';
import type { GuideStep } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============ 表单校验 schema ============

const guideStepFormSchema = z.object({
  step: z.string().min(1, '步骤名不能为空'),
  description: z.string().min(1, '描述不能为空'),
});

type GuideStepFormValues = z.infer<typeof guideStepFormSchema>;

const defaultFormValues: GuideStepFormValues = { step: '', description: '' };

// ============ 可排序指南步骤项组件 ============

function SortableGuideStepItem({
  guideStep,
  onEdit,
  onDelete,
}: {
  guideStep: GuideStep;
  onEdit: (gs: GuideStep) => void;
  onDelete: (gs: GuideStep) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: guideStep.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 border rounded-lg bg-background"
    >
      {/* 拖拽手柄 */}
      <button
        type="button"
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* 步骤内容 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{guideStep.step}</p>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{guideStep.desc}</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onEdit(guideStep)} title="编辑">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(guideStep)} title="删除">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ============ 指南步骤表单 Dialog 组件 ============

function GuideStepFormDialog({
  open,
  onOpenChange,
  editingStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStep: GuideStep | null;
}) {
  const createStep = useCreateGuideStep();
  const updateStep = useUpdateGuideStep();
  const isEditing = editingStep !== null;

  const form = useForm<GuideStepFormValues>({
    resolver: zodResolver(guideStepFormSchema),
    defaultValues: defaultFormValues,
    values: editingStep
      ? { step: editingStep.step, description: editingStep.desc }
      : defaultFormValues,
  });

  const isPending = createStep.isPending || updateStep.isPending;

  const onSubmit = async (values: GuideStepFormValues) => {
    try {
      if (isEditing && editingStep.id) {
        await updateStep.mutateAsync({ id: editingStep.id, data: values });
        toast.success('指南步骤更新成功');
      } else {
        await createStep.mutateAsync(values);
        toast.success('指南步骤创建成功');
      }
      onOpenChange(false);
      form.reset(defaultFormValues);
    } catch (err) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑指南步骤' : '新增指南步骤'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="gs-step">步骤名 *</Label>
            <Input id="gs-step" {...form.register('step')} placeholder="如：选择游戏" />
            {form.formState.errors.step && (
              <p className="text-sm text-destructive">{form.formState.errors.step.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="gs-description">描述 *</Label>
            <Textarea id="gs-description" {...form.register('description')} placeholder="输入步骤描述" rows={4} />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
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

function DeleteGuideStepDialog({
  guideStep,
  onClose,
}: {
  guideStep: GuideStep | null;
  onClose: () => void;
}) {
  const deleteStep = useDeleteGuideStep();

  const handleDelete = async () => {
    if (!guideStep?.id) return;
    try {
      await deleteStep.mutateAsync(guideStep.id);
      toast.success('已删除指南步骤');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <AlertDialog open={guideStep !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除该指南步骤吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteStep.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteStep.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============ 新手指南步骤管理主页面 ============

const GuideSteps = () => {
  const { data: steps, isLoading } = useGuideSteps();
  const reorderSteps = useReorderGuideSteps();

  const [formOpen, setFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<GuideStep | null>(null);
  const [deletingStep, setDeletingStep] = useState<GuideStep | null>(null);
  // 本地排序状态，用于拖拽时即时更新 UI
  const [localSteps, setLocalSteps] = useState<GuideStep[] | null>(null);

  // 实际展示的列表：拖拽中使用本地状态，否则使用服务端数据
  const displaySteps = localSteps ?? steps ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = () => {
    setEditingStep(null);
    setFormOpen(true);
  };

  const handleEdit = (gs: GuideStep) => {
    setEditingStep(gs);
    setFormOpen(true);
  };

  // 拖拽结束处理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = [...displaySteps];
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setLocalSteps(reordered);

    try {
      await reorderSteps.mutateAsync(reordered.map((s) => s.id!));
      toast.success('排序已保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '排序保存失败');
    } finally {
      setLocalSteps(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载指南步骤中…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">新手指南管理</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增步骤
        </Button>
      </div>

      {displaySteps.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">暂无指南步骤</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displaySteps.map((s) => s.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displaySteps.map((gs) => (
                <SortableGuideStepItem
                  key={gs.id}
                  guideStep={gs}
                  onEdit={handleEdit}
                  onDelete={setDeletingStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <GuideStepFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingStep={editingStep}
      />

      <DeleteGuideStepDialog guideStep={deletingStep} onClose={() => setDeletingStep(null)} />
    </div>
  );
};

export default GuideSteps;
