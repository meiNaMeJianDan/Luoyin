import React from 'react';
import { Dices, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer data-cmp="Footer" className="bg-card border-t border-border mt-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-secondary text-secondary-foreground p-2 rounded-xl">
                <Dices size={24} />
              </div>
              <span className="text-xl font-bold">落樱桌游库</span>
            </div>
            <p className="text-muted-foreground">
              致力于为新手和玩家提供最全的聚会桌游攻略、推荐与指南。让每一次聚会都不再冷场！
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">快速链接</h3>
            <div className="flex flex-col gap-2">
              <Link to="/beginners" className="text-muted-foreground hover:text-primary transition-colors">新手入门指南</Link>
              <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors">全部分类</Link>
              <Link to="/trending" className="text-muted-foreground hover:text-primary transition-colors">热门排行榜</Link>
            </div>
          </div>

          {/* Contact & Collab */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground">联系我们</h3>
            <p className="text-muted-foreground text-sm">
              欢迎承接桌游推广、网站定制等商务合作。
            </p>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail size={18} />
              <span>1469104767@qq.com</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <MessageCircle size={18} />
              <span>WeChat: lo20_p</span>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} 落樱桌游库 PartyBoardGames. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;