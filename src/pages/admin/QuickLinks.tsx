import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

import { useQuickLinks } from '@/hooks/useGameData';
import {
  useCreateQuickLink,
  useUpdateQuickLink,
  useDeleteQuickLink,
} from '@/hooks/useAdminData';
import type { QuickLink } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const quickLinkFormSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  icon: z.string().min(1, '图标不能为空'),
  color: z.string().min(1, '颜色不能为空'),
  link: z.string().min(1, '链接不能为空'),
});

type QuickLinkFormValues = z.infer<typeof quickLinkFormSchema>;

const defaultFormValues: QuickLinkFormValues = {
  name: '',
  icon: '',
  color: '',
  link: '',
};

// ============ 快速链接表单 Dialog 组件 ============

function QuickLinkFormDialog({
  open,
  onOpenChange,
  editingLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLink: QuickLink | null;
}) {
  const createLink = useCreateQuickLink();
  const updateLink = useUpdateQuickLink();
  const isEditing = editingLink !== null;

  const form = useForm<QuickLinkFormValues>({
    resolver: zodResolver(quickLinkFormSchema),
    defaultValues: defaultFormValues,
    values: editingLink
      ? {
          name: editingLink.name,
          icon: editingLink.icon,
          color: editingLink.color,
          link: editingLink.link,
        }
      : defaultFormValues,
  });

  const isPending = createLink.isPending || updateLink.isPending;

  const onSubmit = async (values: QuickLinkFormValues) => {
    try {
      if (isEditing && editingLink.id) {
        await updateLink.mutateAsync({ id: editingLink.id, data: values });
        toast.success('快速链接更新成功');
      } else {
        await createLink.mutateAsync(values);
        toast.success('快速链接创建成功');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑快速链接' : '新增快速链接'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {form.formState.errors.root && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="ql-name">名称 *</Label>
            <Input id="ql-name" {...form.register('name')} placeholder="如：策略游戏" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ql-icon">图标 *</Label>
            <Input id="ql-icon" {...form.register('icon')} placeholder="如：🎯" />
            {form.formState.errors.icon && (
              <p className="text-sm text-destructive">{form.formState.errors.icon.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ql-color">颜色 *</Label>
            <Input id="ql-color" {...form.register('color')} placeholder="如：bg-blue-100" />
            {form.formState.errors.color && (
              <p className="text-sm text-destructive">{form.formState.errors.color.message}</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ql-link">链接 *</Label>
            <Input id="ql-link" {...form.register('link')} placeholder="如：/categories?type=策略" />
            {form.formState.errors.link && (
              <p className="text-sm text-destructive">{form.formState.errors.link.message}</p>
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

function DeleteQuickLinkDialog({
  link,
  onClose,
}: {
  link: QuickLink | null;
  onClose: () => void;
}) {
  const deleteLink = useDeleteQuickLink();

  const handleDelete = async () => {
    if (!link?.id) return;
    try {
      await deleteLink.mutateAsync(link.id);
      toast.success(`已删除快速链接「${link.name}」`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <AlertDialog open={link !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除快速链接「{link?.name}」吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteLink.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteLink.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============ 快速链接管理主页面 ============

const QuickLinks = () => {
  const { data: links, isLoading } = useQuickLinks();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<QuickLink | null>(null);

  const handleAdd = () => {
    setEditingLink(null);
    setFormOpen(true);
  };

  const handleEdit = (link: QuickLink) => {
    setEditingLink(link);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载快速链接中…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">快速链接管理</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增链接
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>图标</TableHead>
            <TableHead>颜色</TableHead>
            <TableHead>链接</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links?.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                暂无快速链接
              </TableCell>
            </TableRow>
          )}
          {links?.map((link) => (
            <TableRow key={link.id ?? link.name}>
              <TableCell>{link.id ?? '—'}</TableCell>
              <TableCell className="font-medium">{link.name}</TableCell>
              <TableCell>{link.icon}</TableCell>
              <TableCell>
                <span className={`inline-block px-2 py-0.5 rounded text-xs ${link.color}`}>
                  {link.color}
                </span>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{link.link}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(link)} title="编辑">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingLink(link)} title="删除">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <QuickLinkFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingLink={editingLink}
      />

      <DeleteQuickLinkDialog link={deletingLink} onClose={() => setDeletingLink(null)} />
    </div>
  );
};

export default QuickLinks;
