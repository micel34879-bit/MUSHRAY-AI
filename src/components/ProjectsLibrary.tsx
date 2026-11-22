import { useState } from 'react';
import { Check, Copy, FolderKanban, Search, Trash2 } from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { api } from '../lib/api';
import { copyTextToClipboard } from '../lib/clipboard';
import type { NavSection, SavedProject, UiLanguage, UserProfile } from '../types/mushray';

interface ProjectsLibraryProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
  projects: SavedProject[];
  onRefreshProjects: () => void;
  onOpenAuth: () => void;
  onSelectNav: (nav: NavSection) => void;
}

export function ProjectsLibrary({
  uiLang,
  user,
  projects,
  onRefreshProjects,
  onOpenAuth,
  onSelectNav,
}: ProjectsLibraryProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  if (!user) {
    return (
      <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-10 text-center max-w-xl mx-auto my-8 space-y-4">
        <FolderKanban className="h-10 w-10 text-blue-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">
          {uiLang === 'hi' ? 'प्रोजेक्ट्स सेव करने के लिए लॉगिन करें' : 'Sign In to Access My Projects'}
        </h2>
        <p className="text-sm text-slate-400">
          {uiLang === 'hi'
            ? 'आपका सारा AI कंटेंट, पोस्टर और मार्केटिंग प्लान आपके अकाउंट में सुरक्षित सेव रहता है।'
            : 'Keep all your AI posts, posters, and marketing plans organized in one workspace.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600"
        >
          {uiLang === 'hi' ? 'फ्री अकाउंट बनाएं / लॉगिन करें' : 'Sign In / Create Free Account'}
        </button>
      </div>
    );
  }

  const filtered = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      p.businessName.toLowerCase().includes(q) ||
      p.productName.toLowerCase().includes(q)
    );
  });

  const activeProject = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  async function handleDelete(id: string) {
    setActionError('');
    setDeletingId(id);
    try {
      await api.deleteProject(id);
      if (selectedId === id) setSelectedId(null);
      onRefreshProjects();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete project.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopyProject(project: SavedProject) {
    setActionError('');
    const readable = Object.entries(project.outputData)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join('\n\n');
    const ok = await copyTextToClipboard(readable);
    if (ok) {
      setCopiedId(project.id);
      setTimeout(() => setCopiedId(null), 1800);
    } else {
      setActionError('क्लिपबोर्ड पर कॉपी नहीं हो सका। कृपया टेक्स्ट चुनकर कॉपी करें।');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={uiLang === 'hi' ? 'प्रोजेक्ट खोजें...' : 'Search saved campaigns...'}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0C1222] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => onSelectNav('post-generator')}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 whitespace-nowrap self-start"
        >
          {uiLang === 'hi' ? '+ नया पोस्ट बनाएं' : '+ New AI Campaign'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-12 text-center space-y-3">
          <FolderKanban className="h-9 w-9 text-slate-500 mx-auto" />
          <h3 className="font-display text-base font-semibold text-white">
            {uiLang === 'hi' ? 'अभी कोई प्रोजेक्ट सेव नहीं है' : 'No Saved Projects Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {uiLang === 'hi'
              ? 'Post Generator या Poster Maker में जाकर कोई भी कंटेंट बनाएं और "Save Project" बटन दबाएं।'
              : 'Generate a social post or design a poster, then click Save Project to store it here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* List */}
          <div className="lg:col-span-5 space-y-2.5">
            {filtered.map((p) => {
              const toolMeta = TOOLS_CATALOG.find((t) => t.id === p.toolId);
              const isSelected = activeProject?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-[#111933] border-blue-500/60'
                      : 'bg-[#0C1222] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs text-slate-400 mb-1">
                    {toolMeta?.name ?? p.toolId} · {p.language.toUpperCase()} ·{' '}
                    <span className="font-mono-num">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="font-display font-semibold text-sm text-white truncate">{p.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {p.businessName} · {p.productName}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Inspector */}
          {activeProject && (
            <div className="lg:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">{activeProject.title}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {activeProject.businessName} · {activeProject.productName} ·{' '}
                    <span className="font-mono-num">{new Date(activeProject.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyProject(activeProject)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#070A15] border border-slate-700 text-slate-200 hover:border-blue-500"
                  >
                    {copiedId === activeProject.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === activeProject.id ? 'Copied' : 'Copy All'}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === activeProject.id}
                    onClick={() => handleDelete(activeProject.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/50 border border-red-900/60 text-red-300 hover:bg-red-900/50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === activeProject.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">
                  {actionError}
                </div>
              )}

              {activeProject.previewImageDataUrl && (
                <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#060811] p-3 flex justify-center">
                  <img
                    src={activeProject.previewImageDataUrl}
                    alt={activeProject.title}
                    className="max-h-72 w-auto rounded"
                  />
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(activeProject.outputData).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-lg bg-[#070A15] border border-slate-800/80">
                    <div className="text-[11px] font-mono-num uppercase text-blue-400 mb-1">{key}</div>
                    <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {Array.isArray(val)
                        ? val.map((item, i) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join('\n• ')
                        : typeof val === 'object' && val !== null
                        ? JSON.stringify(val, null, 2)
                        : String(val)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
