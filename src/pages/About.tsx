import React from 'react';
import { Mail, MessageCircle, Heart, Star } from 'lucide-react';

const About = () => {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12 max-w-3xl mx-auto">
      
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-3xl mb-6">
          <Heart size={40} />
        </div>
        <h1 className="text-4xl font-black text-foreground mb-4">关于落樱桌游库</h1>
        <p className="text-xl text-muted-foreground">致力于让每一次线下相聚都充满欢笑</p>
      </div>

      <div className="bg-card rounded-3xl p-8 md:p-12 border border-border shadow-sm mb-8 space-y-6 text-lg leading-relaxed text-foreground">
        <p>
          欢迎来到<strong className="text-primary">落樱桌游库</strong>！是一个由桌游热爱者自发建立的分享网站。
        </p>
        <p>
          我们发现，很多人在朋友聚会时想玩桌游，却常常因为**“选错游戏”**或**“规则太复杂教不会”**而冷场。因此，我们决定做一个专门针对**新手和聚会场景**的桌游攻略站。
        </p>
        <p>
          在这里，没有晦涩难懂的术语，只有**大白话解析、清晰的步骤和最实在的避坑指南**。
        </p>
        <div className="flex gap-4 pt-4 border-t border-border mt-4">
          <span className="flex items-center gap-2 text-sm font-bold bg-muted px-3 py-1 rounded-full"><Star size={16} className="text-yellow-400"/> 免费查阅</span>
          <span className="flex items-center gap-2 text-sm font-bold bg-muted px-3 py-1 rounded-full"><Star size={16} className="text-yellow-400"/> 实用攻略</span>
          <span className="flex items-center gap-2 text-sm font-bold bg-muted px-3 py-1 rounded-full"><Star size={16} className="text-yellow-400"/> 新手友好</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-secondary/20 to-primary/10 rounded-3xl p-8 md:p-12 border border-border">
        <h2 className="text-2xl font-bold mb-6">商务与合作</h2>
        <p className="text-muted-foreground mb-6">
          如果您是桌游发行商、设计师，或者需要定制专属的活动页面、工具开发，欢迎与我们取得联系。我们承接相关推广与前端页面开发。
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="mailto:1469104767@qq.com" className="flex items-center justify-center gap-2 bg-white px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-shadow flex-1">
            <Mail className="text-primary" />
            发邮件联系
          </a>
          <button className="flex items-center justify-center gap-2 bg-[#07C160] text-white px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-shadow flex-1">
            <MessageCircle />
            添加微信客服
          </button>
        </div>
      </div>

    </div>
  );
};

export default About;