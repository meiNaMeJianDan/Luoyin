import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';

import { useCategoryOptions } from '@/hooks/useGameData';
import { useUpdateCategoryOption } from '@/hooks/useAdminData';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============ 分类选项编辑区域组件 ============

/** 单个分类选项编辑区域 */
function OptionEditor({
  title,
  optionKey,
  values,
}: {
  title: string;
  optionKey: string;
  values: string[];
}) {
  const [items, setItems] = useState<string[]>(values);
  const [newItem, setNewItem] = useState('');
  const updateOption = useUpdateCategoryOption();

  // 添加选项
  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      toast.error('该选项已存在');
      return;
    }
    setItems((prev) => [...prev, trimmed]);
    setNewItem('');
  };

  // 删除选项
  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 保存更改
  const handleSave = async () => {
    try {
      await updateOption.mutateAsync({ key: optionKey, value: items });
      toast.success(`${title}已保存`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前选项列表 */}
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <Badge key={index} variant="secondary" className="gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {items.length === 0 && (
            <span className="text-sm text-muted-foreground">暂无选项</span>
          )}
        </div>

        {/* 添加新选项 */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="输入新选项"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>

        {/* 保存按钮 */}
        <Button onClick={handleSave} disabled={updateOption.isPending} size="sm">
          {updateOption.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          保存更改
        </Button>
      </CardContent>
    </Card>
  );
}

// ============ 分类选项管理主页面 ============

const CategoryOptions = () => {
  const { data: options, isLoading } = useCategoryOptions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载分类选项中…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">分类选项管理</h1>
      </div>

      <div className="grid gap-6">
        <OptionEditor
          title="游戏类型"
          optionKey="types"
          values={options?.types ?? []}
        />
        <OptionEditor
          title="玩家人数"
          optionKey="playerCounts"
          values={options?.playerCounts ?? []}
        />
        <OptionEditor
          title="游戏时长"
          optionKey="durations"
          values={options?.durations ?? []}
        />
      </div>
    </div>
  );
};

export default CategoryOptions;
