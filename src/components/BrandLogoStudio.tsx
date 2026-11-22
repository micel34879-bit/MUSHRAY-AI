import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, Loader2, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import type { ContentLanguage, UiLanguage, UserProfile } from '../types/mushray';

interface BrandIdea {
  name: string;
  initials: string;
  tagline: string;
  handle: string;
  rationale: string;
  primaryHex: string;
  accentHex: string;
}

interface BrandLogoStudioProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
  onQuotaUpdated: (used: number, limit: number | null) => void;
}

export function BrandLogoStudio({ uiLang, user, onQuotaUpdated }: BrandLogoStudioProps) {
  const [language, setLanguage] = useState<ContentLanguage>(user?.defaultContentLanguage ?? 'en');
  const [businessName, setBusinessName] = useState(user?.businessName ?? 'Modern Craft Store');
  const [productName, setProductName] = useState('Handmade Home Decor & Gifts');
  const [description, setDescription] = useState('Modern Indian aesthetic, affordable luxury for gifting and homes');
  const [targetAudience, setTargetAudience] = useState('Urban homeowners & online gift buyers');

  const [ideas, setIdeas] = useState<BrandIdea[]>([]);
  const [selectedName, setSelectedName] = useState('MUSHRAY');
  const [selectedInitials, setSelectedInitials] = useState('MR');
  const [selectedTagline, setSelectedTagline] = useState('Create. Market. Grow.');
  const [primaryHex, setPrimaryHex] = useState('#2563EB');
  const [accentHex, setAccentHex] = useState('#7C3AED');
  const [logoStyle, setLogoStyle] = useState<'monogram' | 'emblem' | 'minimal'>('monogram');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!user?.businessName) return;
    setBusinessName((prev) => (prev === 'Modern Craft Store' ? user.businessName : prev));
  }, [user?.id]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.generateMarketingContent({
        toolId: 'brand-logo',
        language,
        businessName,
        productName,
        description,
        targetAudience,
      });
      const list = Array.isArray(res.output.ideas) ? (res.output.ideas as BrandIdea[]) : [];
      setIdeas(list);
      if (list[0]) applyIdea(list[0]);
      onQuotaUpdated(res.quota.used, res.quota.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brand ideas.');
    } finally {
      setLoading(false);
    }
  }

  function applyIdea(idea: BrandIdea) {
    setSelectedName(idea.name);
    setSelectedInitials(idea.initials.slice(0, 2).toUpperCase());
    setSelectedTagline(idea.tagline);
    if (/^#[0-9A-Fa-f]{6}$/.test(idea.primaryHex)) setPrimaryHex(idea.primaryHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(idea.accentHex)) setAccentHex(idea.accentHex);
  }

  function handleDownloadSvg() {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedName.trim() || 'mushray').toLowerCase().replace(/\s+/g, '-')}-logo.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-5 space-y-5">
        <form onSubmit={handleGenerate} className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {uiLang === 'hi' ? 'बिजनेस नाम और लोगो आइडिया जनरेटर' : 'Business Name & Logo Idea Generator'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {uiLang === 'hi'
                ? 'नए बिजनेस के लिए 6 नाम, टैगलाइन और डाउनलोड करने योग्य SVG लोगो बनाएं।'
                : 'Generate 6 brandable names, handles, taglines, and customizable SVG logo concepts.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Industry / Idea Seed"
              className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
              className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            >
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Main Products / Services"
            className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brand personality & target audience..."
            className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />

          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating Brand Ideas...' : 'Generate 6 Name & Logo Ideas'}
          </button>
        </form>

        {ideas.length > 0 && (
          <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-4 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300">Select an Idea to Preview Logo</div>
            {ideas.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyIdea(idea)}
                className="w-full text-left p-3 rounded-lg bg-[#070A15] border border-slate-800 hover:border-blue-500/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-semibold text-sm text-white">{idea.name}</span>
                  <span className="font-mono-num text-[11px] text-blue-400">{idea.handle}</span>
                </div>
                <div className="text-xs text-violet-300 mt-0.5">{idea.tagline}</div>
                <div className="text-[11px] text-slate-400 mt-1">{idea.rationale}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Interactive SVG Vector Logo Studio */}
      <div className="xl:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#070A15] border border-slate-800">
            {(['monogram', 'emblem', 'minimal'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLogoStyle(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${
                  logoStyle === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600"
          >
            <Download className="h-3.5 w-3.5" />
            Download SVG Logo
          </button>
        </div>

        <div className="rounded-xl bg-[#060914] border border-slate-800/80 p-8 flex items-center justify-center">
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 600 320"
            className="w-full max-w-[520px] h-auto"
          >
            <defs>
              <linearGradient id="mushrayLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={primaryHex} />
                <stop offset="100%" stopColor={accentHex} />
              </linearGradient>
            </defs>
            <rect width="600" height="320" rx="16" fill="#070913" />

            {logoStyle === 'monogram' && (
              <>
                <rect x="240" y="42" width="120" height="120" rx="28" fill="url(#mushrayLogoGrad)" />
                <text
                  x="300"
                  y="120"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight="800"
                  fontSize="52"
                >
                  {selectedInitials}
                </text>
              </>
            )}

            {logoStyle === 'emblem' && (
              <>
                <polygon points="300,34 362,70 362,142 300,178 238,142 238,70" fill="none" stroke="url(#mushrayLogoGrad)" strokeWidth="8" />
                <circle cx="300" cy="106" r="40" fill="url(#mushrayLogoGrad)" />
                <text
                  x="300"
                  y="122"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight="800"
                  fontSize="38"
                >
                  {selectedInitials}
                </text>
              </>
            )}

            {logoStyle === 'minimal' && (
              <>
                <circle cx="278" cy="104" r="36" fill={primaryHex} opacity="0.9" />
                <circle cx="322" cy="104" r="36" fill={accentHex} opacity="0.82" />
              </>
            )}

            <text
              x="300"
              y="228"
              textAnchor="middle"
              fill="#F8FAFC"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="800"
              fontSize={selectedName.length > 18 ? '22' : selectedName.length > 12 ? '27' : '32'}
              letterSpacing="2"
            >
              {selectedName.toUpperCase()}
            </text>
            <text
              x="300"
              y="264"
              textAnchor="middle"
              fill="#94A3B8"
              fontFamily="DM Sans, sans-serif"
              fontWeight="500"
              fontSize="16"
            >
              {selectedTagline}
            </text>
          </svg>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            placeholder="Brand Name"
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
          <input
            type="text"
            maxLength={3}
            value={selectedInitials}
            onChange={(e) => setSelectedInitials(e.target.value.toUpperCase())}
            placeholder="Initials"
            className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
          <div className="flex items-center gap-2">
            <input type="color" value={primaryHex} onChange={(e) => setPrimaryHex(e.target.value)} className="h-9 w-full rounded bg-transparent cursor-pointer" aria-label="Primary Color" />
            <input type="color" value={accentHex} onChange={(e) => setAccentHex(e.target.value)} className="h-9 w-full rounded bg-transparent cursor-pointer" aria-label="Accent Color" />
          </div>
        </div>
        <input
          type="text"
          value={selectedTagline}
          onChange={(e) => setSelectedTagline(e.target.value)}
          placeholder="Tagline"
          className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
        />
      </div>
    </div>
  );
}
