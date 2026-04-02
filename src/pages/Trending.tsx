import GameCard from '../components/GameCard';
import { Trophy, Flame } from 'lucide-react';
import { RANKED_GAMES } from '@/constant';

const Trending = () => {
  // 使用合并后的排行榜数据
  const topGames = RANKED_GAMES;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-[1440px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-destructive text-white p-2 rounded-xl">
          <Flame size={28} />
        </div>
        <h1 className="text-4xl font-black text-foreground">热门排行榜</h1>
      </div>
      <p className="text-xl text-muted-foreground mb-10">根据玩家搜索热度、新手友好度及聚会适配度综合排序。</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {topGames.map((game, idx) => (
          <div key={idx} className="relative pt-6">
            {/* Rank Badge */}
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
                image={game.image || `https://images.unsplash.com/photo-${1600000000000 + idx}?q=80&w=600&auto=format&fit=crop`}
              />
              <div className="mt-4 bg-accent p-4 rounded-2xl border border-primary/10 flex items-start gap-3">
                <Trophy size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">{game.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trending;