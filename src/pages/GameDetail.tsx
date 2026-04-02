import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Clock, Star, Flame, Target, MessageSquare, AlertCircle, BookmarkPlus } from 'lucide-react';
import GameCard from '../components/GameCard';
import ImageViewer from '../components/ImageViewer';
import { ALL_GAMES, GAME_DETAILS } from '@/constant';

const GameDetail = () => {
  // 获取URL中的游戏ID参数
  const { id } = useParams<{ id: string }>();

  // 将ID转换为数字类型
  const gameId = id ? parseInt(id, 10) : 0;

  // 根据ID从游戏数据中找到对应的游戏
  const game = ALL_GAMES.find(g => g.id === gameId);

  // 如果游戏不存在，显示错误信息
  if (!game) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-8 py-16">
        <AlertCircle size={64} className="text-destructive" />
        <h1 className="text-3xl font-bold">游戏不存在</h1>
        <p className="text-muted-foreground">您访问的游戏不存在或已被删除</p>
      </div>
    );
  }

  // 从GAME_DETAILS获取当前游戏的详细信息
  // 将游戏ID转换为字符串类型，确保与GAME_DETAILS的键类型匹配
  const gameIdStr = game.id.toString();
  const gameDetails = GAME_DETAILS[gameIdStr];

  // 图片查看器状态
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedAlt, setSelectedAlt] = useState<string>('');

  // 打开图片查看器
  const openImageViewer = (src: string, alt: string) => {
    setSelectedImage(src);
    setSelectedAlt(alt);
    setIsImageViewerOpen(true);
  };

  // 关闭图片查看器
  const closeImageViewer = () => {
    setIsImageViewerOpen(false);
  };

  return (
    <div className="w-full flex flex-col gap-8 pb-16">

      {/* Top Banner / Hero Info */}
      <div className="bg-card border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col md:flex-row gap-8 lg:gap-12">

          {/* Game Image */}
          <div className="w-full md:w-[400px] lg:w-[500px] flex-shrink-0">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-custom relative cursor-pointer hover:opacity-95 transition-opacity">
              <img
                src={game.image}
                alt={game.title}
                className="w-full h-full object-cover"
                onClick={() => openImageViewer(game.image, game.title)}
              />
              {game.isHot && (
                <div className="absolute top-4 left-4 bg-destructive text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 shadow-md">
                  <Flame size={16} /> 聚会爆款
                </div>
              )}
            </div>
          </div>

          {/* Game Basic Info */}
          <div className="flex flex-col justify-center">
            <div className="flex gap-2 mb-4 flex-wrap">
              {game.tags.map((tag, idx) => (
                <span key={idx} className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-foreground mb-4">{game.title}</h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
              {game.comment}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-muted p-4 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Users className="text-primary mb-1" size={24} />
                <span className="text-sm text-muted-foreground">玩家人数</span>
                <span className="font-bold text-foreground">{game.players}</span>
              </div>
              <div className="bg-muted p-4 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Clock className="text-secondary mb-1" size={24} />
                <span className="text-sm text-muted-foreground">游戏时长</span>
                <span className="font-bold text-foreground">{game.time}</span>
              </div>
              <div className="bg-muted p-4 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Star className="text-yellow-400 fill-yellow-400 mb-1" size={24} />
                <span className="text-sm text-muted-foreground">难度等级</span>
                <span className="font-bold text-foreground">{game.difficulty}</span>
              </div>
              <div className="bg-muted p-4 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Target className="text-purple-400 mb-1" size={24} />
                <span className="text-sm text-muted-foreground">适合人群</span>
                <span className="font-bold text-foreground">新手/熟人</span>
              </div>
            </div>

            {/* <button className="btn-bounce bg-primary text-primary-foreground w-full sm:w-fit px-8 py-4 rounded-full font-bold text-lg shadow-custom hover:bg-primary/90 flex items-center justify-center gap-2">
              <BookmarkPlus size={20} />
              收藏这篇攻略
            </button> */}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left Column: Rules & Guide */}
        <div className="lg:col-span-2 flex flex-col gap-10">

          {/* 如果有详细信息，使用数据驱动的方式渲染 */}
          {gameDetails && (
            <>
              {/* Section 1: 游戏简介 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-primary text-primary-foreground w-8 h-8 rounded-xl flex items-center justify-center text-xl">1</span>
                  游戏简介
                </h2>
                <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm text-lg text-foreground leading-relaxed">
                  <p>{gameDetails.introduction}</p>
                </div>
              </section>

              {/* Section 2: 游戏目标与获胜条件 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-primary text-primary-foreground w-8 h-8 rounded-xl flex items-center justify-center text-xl">2</span>
                  游戏玩法
                </h2>
                <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm text-lg text-foreground leading-relaxed">
                  <p className="mb-4">{gameDetails.objective}</p>
                  <ul className="list-disc list-inside space-y-4 ml-4">
                    {gameDetails.victoryConditions.map((condition, idx) => (
                      <li key={idx} className="flex flex-col gap-2">
                        <span>{condition.text}</span>
                        {condition.image && (
                          <img
                            src={condition.image}
                            alt={`获胜条件${idx + 1}`}
                            className="rounded-lg w-full max-w-md mx-auto my-2 cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => openImageViewer(condition.image, `获胜条件${idx + 1}`)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Section 3: 核心玩法步骤 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-secondary text-secondary-foreground w-8 h-8 rounded-xl flex items-center justify-center text-xl">3</span>
                  核心玩法步骤
                </h2>
                <div className="space-y-6">
                  {gameDetails.gameplaySteps.map((step, idx) => (
                    <div key={idx} className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <div className="p-5">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <MessageSquare size={24} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                            <p className="text-muted-foreground">{
                              Array.isArray(step.desc) ? step.desc.map(item => <div className='mb-4'>{item}</div>) : step.desc
                            }</p>
                          </div>
                        </div>
                      </div>
                      {step.image && (
                        <div className="p-0.5 pt-0 cursor-pointer hover:opacity-95 transition-opacity">
                          <img
                            src={step.image}
                            alt={`${step.title}`}
                            className="rounded-b-2xl w-full object-cover"
                            style={{ height: 'auto', maxHeight: '300px' }}
                            onClick={() => openImageViewer(step.image, step.title)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 4: 新手小贴士 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-yellow-400 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xl">4</span>
                  新手小贴士
                </h2>
                <div className="bg-accent/50 rounded-3xl p-6 md:p-8 border border-primary/10">
                  <div className="flex gap-3 mb-4">
                    <AlertCircle className="text-primary flex-shrink-0" size={24} />
                    <p className="text-foreground font-medium">作为新手，以下几点策略可以帮助你更好地体验游戏：</p>
                  </div>
                  <ul className="list-disc list-inside space-y-3 ml-4">
                    {gameDetails.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          )}

          {/* 如果没有详细信息，显示默认内容 */}
          {!gameDetails && (
            <>
              {/* Section 1 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-primary text-primary-foreground w-8 h-8 rounded-xl flex items-center justify-center text-xl">1</span>
                  游戏目标与获胜条件
                </h2>
                <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm text-lg text-foreground leading-relaxed">
                  <p className="text-center">该游戏的详细信息正在完善中...</p>
                </div>
              </section>

              {/* Section 2 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-secondary text-secondary-foreground w-8 h-8 rounded-xl flex items-center justify-center text-xl">2</span>
                  核心玩法步骤
                </h2>
                <div className="bg-card rounded-3xl p-6 md:p-8 border border-border shadow-sm text-lg text-foreground leading-relaxed">
                  <p className="text-center">该游戏的详细信息正在完善中...</p>
                </div>
              </section>

              {/* Section 3 */}
              <section>
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="bg-yellow-400 text-white w-8 h-8 rounded-xl flex items-center justify-center text-xl">3</span>
                  新手小贴士
                </h2>
                <div className="bg-accent/50 rounded-3xl p-6 md:p-8 border border-primary/10">
                  <p className="text-center">该游戏的详细信息正在完善中...</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* 图片查看器组件 */}
      <ImageViewer
        isOpen={isImageViewerOpen}
        src={selectedImage}
        alt={selectedAlt}
        onClose={closeImageViewer}
      />
    </div>
  );
};

export default GameDetail;