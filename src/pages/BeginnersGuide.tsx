import { useState } from 'react';
import { HelpCircle, ChevronDown, CheckCircle2, PlaySquare } from 'lucide-react';
import { useFAQs, useGuideSteps } from '@/hooks/useGameData';

const BeginnersGuide = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 从 API 获取新手常见问题和基础流程步骤
  const { data: faqs, isLoading: faqsLoading, error: faqsError } = useFAQs();
  const { data: guideSteps, isLoading: stepsLoading, error: stepsError } = useGuideSteps();

  // 合并加载和错误状态
  const isLoading = faqsLoading || stepsLoading;
  const error = faqsError || stepsError;

  // 加载状态
  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-4xl mx-auto text-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-4xl mx-auto text-center text-destructive">
        加载新手指南数据失败，请稍后重试
      </div>
    );
  }

  // 使用 API 返回的数据，提供空数组兜底
  const faqList = faqs ?? [];
  const stepList = guideSteps ?? [];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12 max-w-4xl mx-auto">
      
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-4">新手入门指南</h1>
        <p className="text-xl text-muted-foreground">从小白到聚会破冰王，只需掌握这几步！</p>
      </div>

      {/* 桌游基础流程 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <PlaySquare className="text-primary" /> 桌游基础流程
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stepList.map((item, idx) => (
            <div key={idx} className="bg-card p-6 rounded-3xl border border-border shadow-sm relative overflow-hidden group hover:shadow-custom transition-all">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-secondary/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              <CheckCircle2 className="text-secondary mb-4 relative z-10" size={32} />
              <h3 className="text-xl font-bold mb-2 relative z-10">{item.step}</h3>
              <p className="text-muted-foreground relative z-10">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 新手常见问题 */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <HelpCircle className="text-secondary" /> 新手常见问题 (FAQ)
        </h2>
        <div className="flex flex-col gap-4">
          {faqList.map((faq, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <button 
                className="w-full px-6 py-4 flex items-center justify-between font-bold text-lg text-left hover:bg-muted/50 transition-colors"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                {faq.q}
                <ChevronDown className={`transform transition-transform duration-300 text-primary ${openFaq === idx ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === idx ? (
                <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                  {faq.a}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* 实用小工具占位 */}
      <section className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl p-8 md:p-12 text-center border border-primary/20">
        <h2 className="text-2xl font-bold mb-4">实用小工具即将上线</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          我们正在开发纯前端的「桌游计分器」和「角色抽签工具」，免去纸笔烦恼，让聚会更轻松。敬请期待！
        </p>
        <button className="btn-bounce bg-white text-foreground px-6 py-2.5 rounded-full font-bold shadow-md hover:bg-muted">
          告诉我们你需要什么工具
        </button>
      </section>

    </div>
  );
};

export default BeginnersGuide;