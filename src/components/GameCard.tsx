import React from 'react';
import { Users, Clock, Star, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GameCardProps {
  id?: number;
  title?: string;
  image?: string;
  players?: string;
  time?: string;
  difficulty?: string;
  tags?: string[];
  isHot?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  id,
  title = "示例桌游名称",
  image = "https://images.unsplash.com/photo-1611891487122-207578367798?q=80&w=600&auto=format&fit=crop",
  players = "4-8人",
  time = "30分钟",
  difficulty = "新手友好",
  tags = ["聚会", "破冰"],
  isHot = false
}) => {
  // Use dynamic route with game id for navigation
  const linkTo = id ? `/game-detail/${id}` : "/game-detail";
  
  return (
    <Link to={linkTo} data-cmp="GameCard" className="block group">
      <div className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border hover:shadow-custom hover:-translate-y-1 transition-all duration-300 relative">
        
        {/* Hot Badge */}
        {isHot && (
          <div className="absolute top-4 left-4 bg-destructive text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 z-10 shadow-md">
            <Flame size={14} />
            热门推荐
          </div>
        )}

        {/* Image Container */}
        <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted">
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex gap-2 mb-3 flex-wrap">
            {tags.map((tag, i) => (
              <span key={i} className="bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {tag}
              </span>
            ))}
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-4 line-clamp-1">{title}</h3>
          
          <div className="flex items-center justify-between text-muted-foreground text-sm">
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-primary" />
              <span>{players}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={16} className="text-secondary" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span>{difficulty}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GameCard;