import { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { BackgroundRemoverStudio } from './components/BackgroundRemoverStudio';
import { BrandLogoStudio } from './components/BrandLogoStudio';
import { DashboardHome } from './components/DashboardHome';
import { MarketingAssistant } from './components/MarketingAssistant';
import { PosterStudio } from './components/PosterStudio';
import { ProfileSettings } from './components/ProfileSettings';
import { ProjectsLibrary } from './components/ProjectsLibrary';
import { Sidebar } from './components/Sidebar';
import { SubscriptionBilling } from './components/SubscriptionBilling';
import { TextToolsStudio, type TextToolId } from './components/TextToolsStudio';
import { TopBar } from './components/TopBar';
import { VideoCreatorStudio } from './components/VideoCreatorStudio';
import { TOOLS_CATALOG } from './data/toolsCatalog';
import { api } from './lib/api';
import type {
  MarketingBriefInput,
  NavSection,
  SavedProject,
  ToolId,
  UiLanguage,
  UserProfile,
} from './types/mushray';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [activeTool, setActiveTool] = useState<ToolId>('social-post');
  const [uiLang, setUiLang] = useState<UiLanguage>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [usageUsed, setUsageUsed] = useState(0);
  const [usageLimit, setUsageLimit] = useState<number | null>(10);
  const [projects, setProjects] = useState<SavedProject[]>([]);

  const [posterPrefillBrief, setPosterPrefillBrief] = useState<MarketingBriefInput | null>(null);
  const [posterPrefillCopy, setPosterPrefillCopy] = useState<{
    headline?: string;
    subheadline?: string;
    cta?: string;
  } | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await api.getProjects();
      setProjects(res.projects);
    } catch {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    api
      .getSession()
      .then((res) => {
        if (res.user) {
          setUser(res.user);
          setUiLang(res.user.uiLanguage);
          setUsageUsed(res.user.usageThisMonth);
          setUsageLimit(res.user.usageLimit);
          refreshProjects();
        } else if (res.guestQuota) {
          setUsageUsed(res.guestQuota.used);
          setUsageLimit(res.guestQuota.limit);
        }
      })
      .catch(() => {});
  }, [refreshProjects]);

  function handleSelectNav(nav: NavSection) {
    setActiveNav(nav);
    if (nav === 'post-generator') {
      setActiveTool('social-post');
    } else if (nav === 'poster-maker') {
      setActiveTool('poster-maker');
    } else if (nav === 'video-maker') {
      setActiveTool('video-creator');
    }
  }

  function handleSelectTool(toolId: ToolId) {
    setActiveTool(toolId);
    if (toolId === 'social-post') {
      setActiveNav('post-generator');
    } else if (toolId === 'poster-maker' || toolId === 'festival-poster') {
      setActiveNav('poster-maker');
    } else if (toolId === 'video-creator') {
      setActiveNav('video-maker');
    } else {
      setActiveNav('tools');
    }
  }

  function handleAuthenticated(u: UserProfile) {
    setUser(u);
    setUiLang(u.uiLanguage);
    setUsageUsed(u.usageThisMonth);
    setUsageLimit(u.usageLimit);
    refreshProjects();
  }

  const planDisplayName = user
    ? user.planId === 'premium'
      ? 'Premium Plan'
      : user.planId === 'pro'
      ? 'Pro Plan'
      : 'Free Plan'
    : 'Guest Preview';

  const isTextTool =
    activeTool === 'social-post' ||
    activeTool === 'instagram-caption' ||
    activeTool === 'facebook-post' ||
    activeTool === 'ad-script' ||
    activeTool === 'whatsapp-marketing' ||
    activeTool === 'product-description' ||
    activeTool === 'marketing-strategy';

  return (
    <div className="min-h-screen flex bg-[#070913] text-slate-100">
      <Sidebar
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        uiLang={uiLang}
        usageUsed={usageUsed}
        usageLimit={usageLimit}
        planName={planDisplayName}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeNav={activeNav}
          uiLang={uiLang}
          onToggleUiLang={setUiLang}
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onSelectNav={handleSelectNav}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeNav === 'dashboard' && (
            <DashboardHome
              uiLang={uiLang}
              user={user}
              usageUsed={usageUsed}
              usageLimit={usageLimit}
              projects={projects}
              onSelectTool={handleSelectTool}
              onSelectNav={handleSelectNav}
            />
          )}

          {activeNav === 'tools' && (
            <div className="space-y-6">
              {/* Quick Tool Selector Bar for All 12 Tools */}
              <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-800/80">
                {TOOLS_CATALOG.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTool(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeTool === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0C1222] border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {uiLang === 'hi' ? t.nameHi : t.name}
                  </button>
                ))}
              </div>

              {isTextTool && (
                <TextToolsStudio
                  initialToolId={activeTool as TextToolId}
                  uiLang={uiLang}
                  user={user}
                  onQuotaUpdated={(used, limit) => {
                    setUsageUsed(used);
                    setUsageLimit(limit);
                  }}
                  onRequireAuth={() => setAuthModalOpen(true)}
                  onProjectSaved={refreshProjects}
                  onSendToPoster={(brief, copy) => {
                    setPosterPrefillBrief(brief);
                    setPosterPrefillCopy(copy);
                    setActiveTool('poster-maker');
                    setActiveNav('poster-maker');
                  }}
                />
              )}

              {activeTool === 'bg-remover' && <BackgroundRemoverStudio uiLang={uiLang} user={user} />}

              {activeTool === 'brand-logo' && (
                <BrandLogoStudio
                  uiLang={uiLang}
                  user={user}
                  onQuotaUpdated={(used, limit) => {
                    setUsageUsed(used);
                    setUsageLimit(limit);
                  }}
                />
              )}
            </div>
          )}

          {activeNav === 'post-generator' && (
            <TextToolsStudio
              initialToolId="social-post"
              uiLang={uiLang}
              user={user}
              onQuotaUpdated={(used, limit) => {
                setUsageUsed(used);
                setUsageLimit(limit);
              }}
              onRequireAuth={() => setAuthModalOpen(true)}
              onProjectSaved={refreshProjects}
              onSendToPoster={(brief, copy) => {
                setPosterPrefillBrief(brief);
                setPosterPrefillCopy(copy);
                setActiveTool('poster-maker');
                setActiveNav('poster-maker');
              }}
            />
          )}

          {activeNav === 'poster-maker' && (
            <PosterStudio
              initialFestivalMode={activeTool === 'festival-poster'}
              prefillBrief={posterPrefillBrief}
              prefillCopy={posterPrefillCopy}
              uiLang={uiLang}
              user={user}
              onQuotaUpdated={(used, limit) => {
                setUsageUsed(used);
                setUsageLimit(limit);
              }}
              onRequireAuth={() => setAuthModalOpen(true)}
              onProjectSaved={refreshProjects}
            />
          )}

          {activeNav === 'video-maker' && (
            <VideoCreatorStudio
              uiLang={uiLang}
              user={user}
              onQuotaUpdated={(used, limit) => {
                setUsageUsed(used);
                setUsageLimit(limit);
              }}
            />
          )}

          {activeNav === 'assistant' && <MarketingAssistant uiLang={uiLang} user={user} />}

          {activeNav === 'projects' && (
            <ProjectsLibrary
              uiLang={uiLang}
              user={user}
              projects={projects}
              onRefreshProjects={refreshProjects}
              onOpenAuth={() => setAuthModalOpen(true)}
              onSelectNav={handleSelectNav}
            />
          )}

          {activeNav === 'billing' && (
            <SubscriptionBilling
              uiLang={uiLang}
              user={user}
              usageUsed={usageUsed}
              usageLimit={usageLimit}
              onOpenAuth={() => setAuthModalOpen(true)}
              onUserUpdated={handleAuthenticated}
            />
          )}

          {(activeNav === 'profile' || activeNav === 'settings') && (
            <ProfileSettings
              mode={activeNav}
              uiLang={uiLang}
              user={user}
              onToggleUiLang={setUiLang}
              onUserUpdated={handleAuthenticated}
              onLoggedOut={() => {
                setUser(null);
                setProjects([]);
                setUsageUsed(0);
                setUsageLimit(10);
              }}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          )}
        </main>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        uiLang={uiLang}
      />
    </div>
  );
}
