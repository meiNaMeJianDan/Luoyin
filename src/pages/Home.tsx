import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Brain, Tent, Baby, BookOpen, ChevronRight } from 'lucide-react';
import GameCard from '../components/GameCard';
import { useTrendingGames, useQuickLinks } from '@/hooks/useGameData';
import { BASE_URL } from '@/api/client';

const Home = () => {
  // 从 API 获取热门游戏和分类快速链接数据
  const { data: trendingGames, isLoading: trendingLoading, error: trendingError } = useTrendingGames();
  const { data: quickLinks, isLoading: linksLoading, error: linksError } = useQuickLinks();

  // 将图标字符串映射为 React 组件
  const categories = (quickLinks ?? []).map(cat => ({
    ...cat,
    icon: cat.icon === 'Tent' ? <Tent size={32} /> :
          cat.icon === 'Brain' ? <Brain size={32} /> :
          cat.icon === 'BookOpen' ? <BookOpen size={32} /> :
          cat.icon === 'Baby' ? <Baby size={32} /> :
          <Gamepad2 size={32} />
  }));

  return (
    <div className="w-full flex flex-col gap-16 pb-16">
      
      {/* Hero Banner Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-8">
        <div className="relative w-full rounded-[2rem] overflow-hidden bg-gradient-to-r from-primary/90 to-primary h-[400px] md:h-[500px] shadow-custom flex items-center">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1543165365-07232ed12fad?q=80&w=1600&auto=format&fit=crop" 
              alt="People playing board games" 
              className="w-full h-full object-cover opacity-20 mix-blend-overlay"
            />
          </div>
          
          <div className="relative z-10 px-8 md:px-16 max-w-3xl">
            <span className="inline-block py-1 px-3 rounded-full bg-white/20 text-white font-bold text-sm mb-4 backdrop-blur-sm border border-white/30">
              🎉 聚会零门槛
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-md">
              拯救冷场尴尬 <br/>
              <span className="text-yellow-200">一秒点燃聚会氛围</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
              最全的新手向桌游图文攻略，从5分钟破冰到爆笑推理，总有一款适合你的小团体！
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/categories" className="btn-bounce bg-white text-primary px-8 py-3.5 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all">
                立即探索桌游
              </Link>
              <Link to="/beginners" className="btn-bounce bg-black/20 backdrop-blur-sm text-white border border-white/30 px-8 py-3.5 rounded-full font-bold text-lg hover:bg-black/30 transition-all">
                新手入门指南
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Categories */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">找点乐子</h2>
        </div>
        
        {linksLoading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : linksError ? (
          <div className="text-center text-destructive py-8">加载分类数据失败，请稍后重试</div>
        ) : (
          <div className="flex overflow-x-auto no-scrollbar gap-4 md:grid md:grid-cols-5 md:gap-6 pb-4">
            {categories.map((cat, idx) => (
              <Link 
                key={idx} 
                to={cat.link}
                className="group flex-shrink-0 w-[120px] md:w-auto flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border shadow-sm hover:shadow-custom hover:-translate-y-2 transition-all duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="font-bold text-foreground">{cat.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending Games */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">🔥 热门聚会桌游推荐</h2>
            <p className="text-muted-foreground">新手友好，规则简单，五分钟快速上手！</p>
          </div>
          <Link to="/categoriesc" className="hidden md:flex items-center text-primary font-bold hover:underline">
            查看全部 <ChevronRight size={20} />
          </Link>
        </div>

        {trendingLoading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : trendingError ? (
          <div className="text-center text-destructive py-8">加载热门游戏失败，请稍后重试</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(trendingGames ?? []).map((game, idx) => (
              <GameCard key={idx} {...game} image={`${BASE_URL}${game.image}`} />
            ))}
          </div>
        )}
        
        <div className="mt-8 flex justify-center md:hidden">
          <Link to="/trending" className="btn-bounce w-full max-w-[300px] text-center bg-accent text-accent-foreground py-3 rounded-full font-bold border border-primary/20">
            查看全部热门桌游
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;