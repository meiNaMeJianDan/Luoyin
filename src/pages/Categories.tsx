import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import GameCard from '../components/GameCard';
import { useAllGames, useCategoryOptions } from '@/hooks/useGameData';
import { BASE_URL } from '@/api/client';

const Categories = () => {
  const [activeType, setActiveType] = useState('全部');
  const [activePlayers, setActivePlayers] = useState('不限');
  const [activeDuration, setActiveDuration] = useState('不限');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // 从 API 获取所有游戏和分类筛选选项
  const { data: allGames, isLoading: gamesLoading, error: gamesError } = useAllGames();
  const { data: categoryOptions, isLoading: optionsLoading, error: optionsError } = useCategoryOptions();

  // 从分类选项中提取筛选数据，提供默认值
  const types = categoryOptions?.types ?? [];
  const playerCounts = categoryOptions?.playerCounts ?? [];
  const durations = categoryOptions?.durations ?? [];

  // 解析玩家人数字符串为最小值和最大值
  const parsePlayers = (players: string): { min: number; max: number } => {
    if (players.includes('以上')) {
      const min = parseInt(players.split('人')[0]);
      return { min, max: Infinity };
    } else if (players.includes('-')) {
      const [min, max] = players.split('-').map(p => parseInt(p.replace('人', '')));
      return { min, max };
    } else {
      const num = parseInt(players.replace('人', ''));
      return { min: num, max: num };
    }
  };

  // 解析游戏时长字符串为分钟数
  const parseDuration = (duration: string): number => {
    const minutes = parseInt(duration.replace('分钟', ''));
    return minutes;
  };

  // 检查玩家人数是否匹配
  const matchPlayers = (gamePlayers: string, selectedPlayers: string): boolean => {
    if (selectedPlayers === '不限') return true;
    
    const gameRange = parsePlayers(gamePlayers);
    
    switch (selectedPlayers) {
      case '2人':
        return gameRange.min <= 2 && gameRange.max >= 2;
      case '3-5人':
        return (gameRange.min <= 3 && gameRange.max >= 3) || 
               (gameRange.min <= 5 && gameRange.max >= 5) ||
               (gameRange.min >= 3 && gameRange.max <= 5);
      case '6人以上':
        return gameRange.max >= 6;
      default:
        return true;
    }
  };

  // 检查游戏时长是否匹配
  const matchDuration = (gameTime: string, selectedDuration: string): boolean => {
    if (selectedDuration === '不限') return true;
    
    const gameMinutes = parseDuration(gameTime);
    
    switch (selectedDuration) {
      case '15分钟内':
        return gameMinutes <= 15;
      case '15-30分钟':
        return gameMinutes >= 15 && gameMinutes <= 30;
      case '30分钟以上':
        return gameMinutes >= 30;
      default:
        return true;
    }
  };

  // 完整的筛选逻辑
  const filteredGames = (allGames ?? []).filter(game => {
    const matchType = activeType === '全部' || game.type === activeType;
    const matchPlayersFilter = matchPlayers(game.players, activePlayers);
    const matchDurationFilter = matchDuration(game.time, activeDuration);
    const matchSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchPlayersFilter && matchDurationFilter && matchSearch;
  });

  // 分页逻辑
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 重置到第一页当筛选条件改变
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeType, activePlayers, activeDuration, searchQuery]);

  // 加载状态
  const isLoading = gamesLoading || optionsLoading;
  // 错误状态
  const hasError = gamesError || optionsError;

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-destructive">加载数据失败，请稍后重试</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
      
      {/* 侧边栏 / 筛选器（移动端顶部，桌面端左侧） */}
      <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-6">
        
        {/* 搜索框 */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="搜索桌游..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          />
          <Search size={20} className="absolute left-3 top-3.5 text-muted-foreground" />
        </div>

        {/* 筛选条件 */}
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 font-bold text-lg text-foreground border-b border-border pb-4">
            <Filter size={20} className="text-primary" />
            筛选条件
          </div>

          {/* 桌游类型筛选 */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">桌游类型</h4>
            <div className="flex flex-wrap gap-2">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeType === t 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 玩家人数筛选 */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">玩家人数</h4>
            <div className="flex flex-wrap gap-2">
              {playerCounts.map((p) => (
                <button 
                  key={p} 
                  onClick={() => setActivePlayers(p)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activePlayers === p ? 'bg-secondary text-secondary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-secondary/20'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 游戏时长筛选 */}
          <div>
            <h4 className="font-semibold mb-3 text-foreground">游戏时长</h4>
            <div className="flex flex-wrap gap-2">
              {durations.map((d) => (
                <button 
                  key={d} 
                  onClick={() => setActiveDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeDuration === d ? 'bg-secondary text-secondary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-secondary/20'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

        </div>
      </aside>

      {/* 主内容区：游戏卡片网格 */}
      <main className="flex-grow">
        <div className="mb-6 flex justify-between items-end">
          <h1 className="text-3xl font-black text-foreground">
            {activeType === '全部' ? '全部桌游' : activeType}
          </h1>
          <span className="text-muted-foreground text-sm font-medium">共 {filteredGames.length} 款游戏</span>
        </div>

        {filteredGames.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedGames.map((game, idx) => (
                <GameCard key={idx} {...game} image={`${BASE_URL}${game.image}`} />
              ))}
            </div>

            {/* 分页组件 */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <div className="inline-flex items-center gap-1">
                  {/* 上一页按钮 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-card border border-border hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>

                  {/* 页码 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentPage === page ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:bg-primary/10'}`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* 下一页按钮 */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors bg-card border border-border hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search size={48} className="mb-4 opacity-20" />
            <p>没有找到相关桌游，换个关键词试试？</p>
          </div>
        )}
      </main>

    </div>
  );
};

export default Categories;
