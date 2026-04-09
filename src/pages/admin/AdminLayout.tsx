import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Gamepad2,
  ListFilter,
  Link2,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** 侧边栏菜单项配置 */
const menuItems: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }[] = [
  { to: '/admin', label: '仪表盘概览', icon: LayoutDashboard, end: true },
  { to: '/admin/games', label: '游戏管理', icon: Gamepad2 },
  { to: '/admin/category-options', label: '分类选项管理', icon: ListFilter },
  { to: '/admin/quick-links', label: '快速链接管理', icon: Link2 },
  { to: '/admin/faqs', label: '常见问题管理', icon: HelpCircle },
  { to: '/admin/guide-steps', label: '新手指南管理', icon: BookOpen },
];

/** 管理后台布局组件 — 左侧导航 + 右侧内容区 */
const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧导航栏 */}
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col">
        {/* Logo / 标题 */}
        <div className="h-14 flex items-center px-5 border-b border-slate-700">
          <span className="text-lg font-semibold text-white tracking-wide">
            管理后台
          </span>
        </div>

        {/* 菜单列表 */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* 底部信息 */}
        <div className="px-5 py-3 border-t border-slate-700 text-xs text-slate-500">
          桌游攻略管理系统
        </div>
      </aside>

      {/* 右侧内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
