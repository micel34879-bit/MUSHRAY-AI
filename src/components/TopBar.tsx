import { Menu } from 'lucide-react';
import type { NavSection, UiLanguage, UserProfile } from '../types/mushray';

interface TopBarProps {
  activeNav: NavSection;
  uiLang: UiLanguage;
  onToggleUiLang: (lang: UiLanguage) => void;
  user: UserProfile | null;
  onOpenMobileMenu: () => void;
  onOpenAuth: () => void;
  onSelectNav: (nav: NavSection) => void;
}

const NAV_TITLES: Record<NavSection, { en: string; hi: string }> = {
  dashboard: { en: 'Welcome to MUSHRAY AI', hi: 'MUSHRAY AI में आपका स्वागत है' },
  tools: { en: 'AI Marketing Tools', hi: 'सभी AI मार्केटिंग टूल्स' },
  'post-generator': { en: 'AI Social Post Generator', hi: 'AI सोशल पोस्ट जनरेटर' },
  'poster-maker': { en: 'AI Poster & Festival Studio', hi: 'AI पोस्टर और फेस्टिवल स्टूडियो' },
  'video-maker': { en: 'AI Promotional Video Creator', hi: 'AI प्रमोशनल वीडियो क्रिएटर' },
  assistant: { en: 'AI Marketing Assistant', hi: 'AI मार्केटिंग असिस्टेंट' },
  projects: { en: 'My Saved Projects', hi: 'मेरे सेव्ड प्रोजेक्ट्स' },
  billing: { en: 'Subscription & Billing', hi: 'सब्सक्रिप्शन प्लान और बिलिंग' },
  profile: { en: 'Business Profile', hi: 'बिजनेस प्रोफाइल' },
  settings: { en: 'Workspace Settings', hi: 'ऐप सेटिंग्स' },
};

export function TopBar({
  activeNav,
  uiLang,
  onToggleUiLang,
  user,
  onOpenMobileMenu,
  onOpenAuth,
  onSelectNav,
}: TopBarProps) {
  const titleObj = NAV_TITLES[activeNav];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3.5 bg-[#070913]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg border border-slate-800 bg-[#0E1426] text-slate-200 hover:bg-slate-800 shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display font-semibold text-base sm:text-lg text-white truncate">
            {uiLang === 'hi' ? titleObj.hi : titleObj.en}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center p-1 rounded-lg bg-[#0F1629] border border-slate-800">
          <button
            type="button"
            onClick={() => onToggleUiLang('en')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              uiLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onToggleUiLang('hi')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              uiLang === 'hi' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            हिंदी
          </button>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => onSelectNav('profile')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0F1629] hover:border-blue-500/40 text-sm text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[140px] truncate">{user.businessName || user.name}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-colors whitespace-nowrap shrink-0"
          >
            {uiLang === 'hi' ? 'लॉगिन / अकाउंट बनाएं' : 'Sign In / Free Account'}
          </button>
        )}
      </div>
    </header>
  );
}
