import {
  CreditCard,
  Film,
  FolderKanban,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquareText,
  PenSquare,
  Settings,
  UserCircle2,
  X,
} from 'lucide-react';
import type { NavSection, UiLanguage } from '../types/mushray';

interface SidebarProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  uiLang: UiLanguage;
  usageUsed: number;
  usageLimit: number | null;
  planName: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  labelHi: string;
  icon: typeof Home;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: Home },
  { id: 'tools', label: 'AI Tools', labelHi: 'सभी AI टूल्स', icon: LayoutGrid },
  { id: 'post-generator', label: 'Post Generator', labelHi: 'पोस्ट जनरेटर', icon: PenSquare },
  { id: 'poster-maker', label: 'Poster Maker', labelHi: 'पोस्टर मेकर', icon: ImageIcon },
  { id: 'video-maker', label: 'Video Maker', labelHi: 'वीडियो मेकर', icon: Film },
  { id: 'assistant', label: 'Marketing Assistant', labelHi: 'मार्केटिंग असिस्टेंट', icon: MessageSquareText },
];

const WORKSPACE_NAV: NavItem[] = [
  { id: 'projects', label: 'My Projects', labelHi: 'मेरे प्रोजेक्ट्स', icon: FolderKanban },
  { id: 'billing', label: 'Subscription Plans', labelHi: 'सब्सक्रिप्शन प्लान', icon: CreditCard },
  { id: 'profile', label: 'User Profile', labelHi: 'बिजनेस प्रोफाइल', icon: UserCircle2 },
  { id: 'settings', label: 'Settings', labelHi: 'सेटिंग्स', icon: Settings },
];

export function Sidebar({
  activeNav,
  onSelectNav,
  uiLang,
  usageUsed,
  usageLimit,
  planName,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const usagePct = usageLimit ? Math.min(100, Math.round((usageUsed / usageLimit) * 100)) : 0;

  const navContent = (
    <div className="flex h-full flex-col bg-[#0A0E1C] border-r border-slate-800/80 text-slate-200">
      {/* Brand Lockup */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/70">
        <button
          type="button"
          onClick={() => {
            onSelectNav('dashboard');
            onCloseMobile();
          }}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white font-display font-bold text-base">
            M
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
              MUSHRAY AI
            </div>
            <div className="text-xs text-slate-400 whitespace-nowrap">
              Create · Market · Grow
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Primary Navigation">
        <div>
          <div className="px-3 pb-2 text-xs font-medium text-slate-400">
            {uiLang === 'hi' ? 'क्रिएटिव स्टूडियो' : 'Creative Studio'}
          </div>
          <ul className="space-y-1">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectNav(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-white border border-blue-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{uiLang === 'hi' ? item.labelHi : item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-slate-800/70 pt-4">
          <div className="px-3 pb-2 text-xs font-medium text-slate-400">
            {uiLang === 'hi' ? 'अकाउंट और प्रोजेक्ट्स' : 'Workspace & Billing'}
          </div>
          <ul className="space-y-1">
            {WORKSPACE_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectNav(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-white border border-blue-500/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                    <span className="truncate">{uiLang === 'hi' ? item.labelHi : item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Monthly Quota Summary */}
      <div className="p-4 border-t border-slate-800/70 bg-[#0D1326]">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
          <span className="font-medium truncate">{planName}</span>
          <span className="font-mono-num text-slate-400 shrink-0">
            {usageLimit === null ? `${usageUsed} / ∞` : `${usageUsed} / ${usageLimit}`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
            style={{ width: `${usageLimit === null ? 25 : usagePct}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => {
            onSelectNav('billing');
            onCloseMobile();
          }}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors whitespace-nowrap"
        >
          {uiLang === 'hi' ? 'प्लान अपग्रेड करें' : 'Manage Plan'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
