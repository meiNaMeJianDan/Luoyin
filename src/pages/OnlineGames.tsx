// 在线游戏大厅
// 集中展示所有联机游戏与塔罗占卜入口

import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Sparkles, Users } from 'lucide-react';
import { ONLINE_GAMES } from '@/constant/onlineGames';

const OnlineGames = () => {
  return (
    <div className="w-full">
      {/* 顶部横幅 */}
      <section className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur-sm border border-white/30">
            <Gamepad2 size={16} /> 实时联机 · 无需下载
          </span>
          <h1 className="text-3xl md:text-5xl font-black">在线游戏大厅</h1>
          <p className="max-w-2xl text-base md:text-lg text-primary-foreground/90">
            创建房间后把 6 位房间号发给朋友，就能立刻开局。支持 AI 托管，人不够也能玩。
          </p>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col gap-10">
        {/* 联机游戏列表 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">🎮 联机桌游</h2>
            <span className="text-sm text-muted-foreground">共 {ONLINE_GAMES.length} 款</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ONLINE_GAMES.map((game) => {
              const Icon = game.icon;
              return (
                <Link
                  key={game.key}
                  to={game.path}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm hover:shadow-custom hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`relative h-36 bg-gradient-to-br ${game.gradient} flex items-center justify-center`}>
                    <Icon size={52} className="text-white/90 group-hover:scale-110 transition-transform duration-300" />
                    {game.badge && (
                      <span className="absolute top-4 right-4 rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                        {game.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{game.title}</h3>
                        <p className="text-sm text-primary font-medium">{game.subtitle}</p>
                      </div>
                      <ArrowRight size={20} className="mt-1 flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{game.description}</p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm text-muted-foreground">
                      <Users size={14} /> {game.players}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* 塔罗占卜（单人） */}
            <Link
              to="/tarot"
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 shadow-sm hover:shadow-custom hover:-translate-y-1 transition-all duration-300"
            >
              <div className="relative h-36 flex items-center justify-center">
                <Sparkles size={52} className="text-amber-200/90 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute top-4 right-4 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  单人
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-6 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">塔罗占卜</h3>
                    <p className="text-sm text-purple-200 font-medium">78 张牌 · 三种牌阵</p>
                  </div>
                  <ArrowRight size={20} className="mt-1 flex-shrink-0 text-purple-200 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm text-purple-200/80 leading-relaxed">
                  每日运势、过去现在未来、凯尔特十字，随时探索内心的指引。
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm text-purple-200/80">
                  <Sparkles size={14} /> 无需房间，随时开始
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* 使用提示 */}
        <section className="rounded-3xl border border-border bg-muted/50 p-6 md:p-8">
          <h2 className="text-lg font-bold text-foreground mb-4">怎么开始？</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              选择想玩的游戏，点击进入
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              创建房间，获得 6 位房间号
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              把房间号发给朋友，输入昵称即可加入
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
};

export default OnlineGames;
