import { useState } from 'react';
import {
  ArrowRight,
  Film,
  Image as ImageIcon,
  Layers,
  MessageSquareText,
  PenSquare,
  Scissors,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { GENERATED_BACKDROPS, TOOLS_CATALOG } from '../data/toolsCatalog';
import type { NavSection, SavedProject, ToolId, UiLanguage, UserProfile } from '../types/mushray';

interface DashboardHomeProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
  usageUsed: number;
  usageLimit: number | null;
  projects: SavedProject[];
  onSelectTool: (toolId: ToolId) => void;
  onSelectNav: (nav: NavSection) => void;
}

export function DashboardHome({
  uiLang,
  user,
  usageUsed,
  usageLimit,
  projects,
  onSelectTool,
  onSelectNav,
}: DashboardHomeProps) {
  const [filter, setFilter] = useState<'all' | 'social' | 'visual' | 'growth'>('all');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const filteredTools =
    filter === 'all' ? TOOLS_CATALOG : TOOLS_CATALOG.filter((t) => t.category === filter);

  const planLabel = user
    ? user.planId === 'premium'
      ? 'Premium (₹299/mo)'
      : user.planId === 'pro'
      ? 'Pro (₹199/mo)'
      : 'Free Plan (₹0)'
    : 'Free Preview';

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-xl bg-[#0C1222] border border-slate-800/90 overflow-hidden">
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="text-xs font-medium text-blue-400">
              MUSHRAY AI · {uiLang === 'hi' ? 'डिजिटल मार्केटिंग स्टूडियो' : 'Create. Market. Grow.'}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-2xl">
              {uiLang === 'hi'
                ? 'AI के साथ अपने बिजनेस की मार्केटिंग पोस्ट, पोस्टर और वीडियो मिनटों में बनाएं।'
                : 'Launch high-converting posts, posters, and promo reels for your business in seconds.'}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              {uiLang === 'hi'
                ? 'छोटे दुकानदारों, क्रिएटर्स और ऑनलाइन सेलर्स के लिए बनाया गया आसान AI टूलकिट — हिंदी, English और Hinglish में।'
                : 'Built for small businesses, shopkeepers, creators, and online sellers across Hindi, English, and Hinglish.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTool('social-post')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-colors whitespace-nowrap"
            >
              <PenSquare className="h-4 w-4" />
              {uiLang === 'hi' ? 'AI पोस्ट बनाएं' : 'Create Social Post'}
            </button>
            <button
              type="button"
              onClick={() => onSelectTool('poster-maker')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-100 bg-[#121A30] border border-slate-700 hover:border-blue-500/50 transition-colors whitespace-nowrap"
            >
              <ImageIcon className="h-4 w-4 text-violet-400" />
              {uiLang === 'hi' ? 'पोस्टर डिज़ाइन करें' : 'Open Poster Maker'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-[#090D1A]">
          {!heroImgFailed ? (
            <img
              src={GENERATED_BACKDROPS.heroStudio}
              alt="MUSHRAY AI digital marketing creative studio desk"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-950/60 via-[#0C1222] to-violet-950/60">
              <Sparkles className="h-8 w-8 text-blue-400 mb-2" />
              <span className="text-sm font-medium text-slate-300">MUSHRAY AI Creative Studio</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1222] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#0C1222]/80 lg:via-transparent lg:to-transparent" />
        </div>
      </section>

      {/* KPI Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-[#0C1222] border border-slate-800/80">
          <div className="text-xs text-slate-400 mb-1">
            {uiLang === 'hi' ? 'उपलब्ध AI टूल्स' : 'AI Marketing Tools'}
          </div>
          <div className="font-mono-num text-2xl font-bold text-white">12</div>
          <div className="text-xs text-slate-500 mt-1">EN · HI · Hinglish</div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#0C1222] border border-slate-800/80">
          <div className="text-xs text-slate-400 mb-1">
            {uiLang === 'hi' ? 'इस महीने का उपयोग' : 'Monthly Usage'}
          </div>
          <div className="font-mono-num text-2xl font-bold text-white">
            {usageLimit === null ? `${usageUsed} / ∞` : `${usageUsed} / ${usageLimit}`}
          </div>
          <div className="text-xs text-slate-500 mt-1">{planLabel}</div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#0C1222] border border-slate-800/80">
          <div className="text-xs text-slate-400 mb-1">
            {uiLang === 'hi' ? 'सेव्ड प्रोजेक्ट्स' : 'Saved Projects'}
          </div>
          <div className="font-mono-num text-2xl font-bold text-white">{projects.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {user ? user.businessName : uiLang === 'hi' ? 'सेव करने हेतु लॉगिन करें' : 'Sign in to sync'}
          </div>
        </div>
        <div className="p-4 sm:p-5 rounded-xl bg-[#0C1222] border border-slate-800/80">
          <div className="text-xs text-slate-400 mb-1">
            {uiLang === 'hi' ? 'प्रोमो वीडियो व बैकग्राउंड' : 'Creative Studios'}
          </div>
          <div className="font-mono-num text-2xl font-bold text-white">4</div>
          <div className="text-xs text-slate-500 mt-1">
            {uiLang === 'hi' ? 'पोस्टर · फेस्टिवल · वीडियो · लोगो' : 'Poster · Festival · Video · Logo'}
          </div>
        </div>
      </section>

      {/* Quick Studio Shortcuts */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            title: uiLang === 'hi' ? 'AI पोस्ट जनरेटर' : 'Social Post Studio',
            desc: uiLang === 'hi' ? 'इंस्टाग्राम, फेसबुक व व्हाट्सएप पोस्ट' : 'Instagram, Facebook & WhatsApp copy',
            icon: PenSquare,
            action: () => onSelectTool('social-post'),
          },
          {
            title: uiLang === 'hi' ? 'पोस्टर व फेस्टिवल मेकर' : 'Poster & Festival Maker',
            desc: uiLang === 'hi' ? 'डाउनलोड करने योग्य HD PNG पोस्टर' : 'Export high-res PNG brand posters',
            icon: ImageIcon,
            action: () => onSelectTool('poster-maker'),
          },
          {
            title: uiLang === 'hi' ? 'प्रमोशनल वीडियो मेकर' : 'Promo Video Creator',
            desc: uiLang === 'hi' ? '4-सीन एनिमेटेड रील और WebM एक्सपोर्ट' : 'Animated 4-scene reels with WebM export',
            icon: Film,
            action: () => onSelectTool('video-creator'),
          },
          {
            title: uiLang === 'hi' ? 'मार्केटिंग असिस्टेंट' : 'Marketing Assistant',
            desc: uiLang === 'hi' ? 'बिजनेस ग्रोथ के लिए AI सलाहकार' : '1-on-1 AI advisor for sales growth',
            icon: MessageSquareText,
            action: () => onSelectNav('assistant'),
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="group text-left p-5 rounded-xl bg-[#0C1222] border border-slate-800/80 hover:border-blue-500/50 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <div className="font-display font-semibold text-sm text-white mb-1">{item.title}</div>
                <div className="text-xs text-slate-400 leading-relaxed">{item.desc}</div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Complete 12 AI Tools Directory */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              {uiLang === 'hi' ? 'सभी 12 AI मार्केटिंग टूल्स' : 'All 12 AI Marketing Tools'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {uiLang === 'hi'
                ? 'किसी भी टूल पर क्लिक करें और तुरंत कंटेंट बनाना शुरू करें।'
                : 'Select any tool below to launch its dedicated AI workspace.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0C1222] border border-slate-800 self-start max-w-full">
            {(
              [
                { id: 'all', label: uiLang === 'hi' ? 'सभी (12)' : 'All (12)' },
                { id: 'social', label: uiLang === 'hi' ? 'सोशल' : 'Social' },
                { id: 'visual', label: uiLang === 'hi' ? 'पोस्टर व वीडियो' : 'Visual' },
                { id: 'growth', label: uiLang === 'hi' ? 'ग्रोथ' : 'Growth' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTools.map((tool, index) => {
            const Icon =
              tool.category === 'visual'
                ? tool.id === 'bg-remover'
                  ? Scissors
                  : tool.id === 'video-creator'
                  ? Film
                  : ImageIcon
                : tool.category === 'growth'
                ? TrendingUp
                : Layers;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => onSelectTool(tool.id)}
                className="group text-left p-5 rounded-xl bg-[#0C1222] border border-slate-800/80 hover:border-violet-500/50 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono-num">
                      {String(index + 1).padStart(2, '0')} · {tool.tierLabel}
                    </span>
                    <Icon className="h-4 w-4 text-blue-400 shrink-0" />
                  </div>
                  <div className="font-display font-semibold text-base text-white group-hover:text-blue-300 transition-colors">
                    {uiLang === 'hi' ? tool.nameHi : tool.name}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {uiLang === 'hi' ? tool.shortDescHi : tool.shortDesc}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800/70 text-xs font-medium text-blue-400">
                  <span>{uiLang === 'hi' ? 'टूल खोलें' : 'Open Studio'}</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
