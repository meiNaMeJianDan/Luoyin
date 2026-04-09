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

import { useFAQs } from '@/hooks/useGameData';
import {
  useCreateFAQ,
  useUpdateFAQ,
  useDeleteFAQ,
  useReorderFAQs,
} from '@/hooks/useAdminData';
import type { FAQ } from '@/api/client';

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

const faqFormSchema = z.object({
  question: z.string().min(1, '问题不能为空'),
  answer: z.string().min(1, '答案不能为空'),
});

type FAQFormValues = z.infer<typeof faqFormSchema>;

const defaultFormValues: FAQFormValues = { question: '', answer: '' };

// ============ 可排序 FAQ 项组件 ============

function SortableFAQItem({
  faq,
  onEdit,
  onDelete,
}: {
  faq: FAQ;
  onEdit: (faq: FAQ) => void;
  onDelete: (faq: FAQ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id! });

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

      {/* FAQ 内容 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{faq.q}</p>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{faq.a}</p>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onEdit(faq)} title="编辑">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(faq)} title="删除">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// ============ FAQ 表单 Dialog 组件 ============

function FAQFormDialog({
  open,
  onOpenChange,
  editingFAQ,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFAQ: FAQ | null;
}) {
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();
  const isEditing = editingFAQ !== null;

  const form = useForm<FAQFormValues>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: defaultFormValues,
    values: editingFAQ
      ? { question: editingFAQ.q, answer: editingFAQ.a }
      : defaultFormValues,
  });

  const isPending = createFAQ.isPending || updateFAQ.isPending;

  const onSubmit = async (values: FAQFormValues) => {
    try {
      if (isEditing && editingFAQ.id) {
        await updateFAQ.mutateAsync({ id: editingFAQ.id, data: values });
        toast.success('常见问题更新成功');
      } else {
        await createFAQ.mutateAsync(values);
        toast.success('常见问题创建成功');
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
          <DialogTitle>{isEditing ? '编辑常见问题' : '新增常见问题'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="faq-question">问题 *</Label>
            <Input id="faq-question" {...form.register('question')} placeholder="输入问题" />
            {form.formState.errors.question && (
              <p className="text-sm text-destructive">{form.formState.errors.question.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="faq-answer">答案 *</Label>
            <Textarea id="faq-answer" {...form.register('answer')} placeholder="输入答案" rows={4} />
            {form.formState.errors.answer && (
              <p className="text-sm text-destructive">{form.formState.errors.answer.message}</p>
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

function DeleteFAQDialog({
  faq,
  onClose,
}: {
  faq: FAQ | null;
  onClose: () => void;
}) {
  const deleteFAQ = useDeleteFAQ();

  const handleDelete = async () => {
    if (!faq?.id) return;
    try {
      await deleteFAQ.mutateAsync(faq.id);
      toast.success('已删除常见问题');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <AlertDialog open={faq !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除该常见问题吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteFAQ.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteFAQ.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============ 常见问题管理主页面 ============

const FAQsManage = () => {
  const { data: faqs, isLoading } = useFAQs();
  const reorderFAQs = useReorderFAQs();

  const [formOpen, setFormOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [deletingFAQ, setDeletingFAQ] = useState<FAQ | null>(null);
  // 本地排序状态，用于拖拽时即时更新 UI
  const [localFAQs, setLocalFAQs] = useState<FAQ[] | null>(null);

  // 实际展示的列表：拖拽中使用本地状态，否则使用服务端数据
  const displayFAQs = localFAQs ?? faqs ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = () => {
    setEditingFAQ(null);
    setFormOpen(true);
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormOpen(true);
  };

  // 拖拽结束处理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = [...displayFAQs];
    const oldIndex = items.findIndex((f) => f.id === active.id);
    const newIndex = items.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setLocalFAQs(reordered);

    try {
      await reorderFAQs.mutateAsync(reordered.map((f) => f.id!));
      toast.success('排序已保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '排序保存失败');
    } finally {
      setLocalFAQs(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载常见问题中…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">常见问题管理</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增问题
        </Button>
      </div>

      {displayFAQs.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">暂无常见问题</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={displayFAQs.map((f) => f.id!)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {displayFAQs.map((faq) => (
                <SortableFAQItem
                  key={faq.id}
                  faq={faq}
                  onEdit={handleEdit}
                  onDelete={setDeletingFAQ}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FAQFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingFAQ={editingFAQ}
      />

      <DeleteFAQDialog faq={deletingFAQ} onClose={() => setDeletingFAQ(null)} />
    </div>
  );
};

export default FAQsManage;
