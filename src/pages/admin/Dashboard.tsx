import {
  Gamepad2,
  FileText,
  HelpCircle,
  BookOpen,
  Link2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/useAdminData';

/** 统计卡片配置 */
const statCards = [
  { key: 'gameCount' as const, label: '游戏数量', icon: Gamepad2, color: 'text-blue-600' },
  { key: 'detailCount' as const, label: '详情数量', icon: FileText, color: 'text-emerald-600' },
  { key: 'faqCount' as const, label: 'FAQ 数量', icon: HelpCircle, color: 'text-amber-600' },
  { key: 'guideStepCount' as const, label: '指南步骤数量', icon: BookOpen, color: 'text-purple-600' },
  { key: 'quickLinkCount' as const, label: '快速链接数量', icon: Link2, color: 'text-rose-600' },
] as const;

/** 仪表盘概览页面 — 展示各数据表的记录总数 */
const Dashboard = () => {
  const { data: stats, isLoading, isError, error } = useDashboardStats();

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">加载统计数据中…</span>
      </div>
    );
  }

  // 错误状态
  if (isError) {
    return (
      <div className="flex items-center justify-center py-20 text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>加载失败：{error?.message ?? '未知错误'}</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘概览</h1>

      {/* 统计卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.[key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
