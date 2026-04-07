import GameCard from '../components/GameCard';
import { Trophy, Flame } from 'lucide-react';
import { useRankedGames } from '@/hooks/useGameData';
import { BASE_URL } from '@/api/client';

const Trending = () => {
  // 从 API 获取排行榜游戏数据
  const { data: rankedGames, isLoading, error } = useRankedGames();

  // 使用 API 返回的排行榜数据
  const topGames = rankedGames ?? [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-destructive text-white p-2 rounded-xl">
          <Flame size={28} />
        </div>
        <h1 className="text-4xl font-black text-foreground">热门排行榜</h1>
      </div>
      <p className="text-xl text-muted-foreground mb-10">根据玩家搜索热度、新手友好度及聚会适配度综合排序。</p>

      {/* 加载状态 */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : error ? (
        /* 错误状态 */
        <div className="text-center text-destructive py-8">加载排行榜数据失败，请稍后重试</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {topGames.map((game, idx) => (
            <div key={idx} className="relative pt-6">
              {/* 排名徽章 */}
              <div className={`absolute top-0 left-6 z-20 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-md border-4 border-background ${
                idx === 0 ? 'bg-yellow-400 text-white' : 
                idx === 1 ? 'bg-slate-300 text-white' : 
                idx === 2 ? 'bg-amber-600 text-white' : 
                'bg-muted-foreground text-white'
              }`}>
                #{game.rank}
              </div>
              
              <div className="relative z-10">
                <GameCard 
                  id={game.id} 
                  title={game.title} 
                  tags={game.tags || [game.type]} 
                  players={game.players} 
                  isHot={game.isHot}
                  image={`${BASE_URL}${game.image}`}
                />
                <div className="mt-4 bg-accent p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <Trophy size={20} className="text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-foreground">{game.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;
