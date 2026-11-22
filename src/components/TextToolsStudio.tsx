import { useEffect, useState, type FormEvent } from 'react';
import { BookmarkPlus, Check, Copy, ExternalLink, Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { TOOLS_CATALOG } from '../data/toolsCatalog';
import { api } from '../lib/api';
import { copyTextToClipboard } from '../lib/clipboard';
import type { ContentLanguage, MarketingBriefInput, ToolId, UiLanguage, UserProfile } from '../types/mushray';

export type TextToolId =
  | 'social-post'
  | 'instagram-caption'
  | 'facebook-post'
  | 'ad-script'
  | 'whatsapp-marketing'
  | 'product-description'
  | 'marketing-strategy';

const TEXT_TOOLS: TextToolId[] = [
  'social-post',
  'instagram-caption',
  'facebook-post',
  'ad-script',
  'whatsapp-marketing',
  'product-description',
  'marketing-strategy',
];

interface TextToolsStudioProps {
  initialToolId: TextToolId;
  uiLang: UiLanguage;
  user: UserProfile | null;
  onQuotaUpdated: (used: number, limit: number | null) => void;
  onRequireAuth: () => void;
  onProjectSaved: () => void;
  onSendToPoster: (brief: MarketingBriefInput, copy: { headline?: string; subheadline?: string; cta?: string }) => void;
}

export function TextToolsStudio({
  initialToolId,
  uiLang,
  user,
  onQuotaUpdated,
  onRequireAuth,
  onProjectSaved,
  onSendToPoster,
}: TextToolsStudioProps) {
  const [toolId, setToolId] = useState<TextToolId>(initialToolId);
  const [language, setLanguage] = useState<ContentLanguage>(user?.defaultContentLanguage ?? 'hinglish');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState(user?.defaultAudience ?? '');
  const [offerOrPrice, setOfferOrPrice] = useState('');
  const [tone, setTone] = useState('Trustworthy & energetic');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setToolId(initialToolId);
    setResult(null);
    setError('');
  }, [initialToolId]);

  useEffect(() => {
    if (!user) return;
    setBusinessName((prev) => prev || user.businessName || '');
    setTargetAudience((prev) => prev || user.defaultAudience || '');
    setLanguage(user.defaultContentLanguage ?? 'hinglish');
  }, [user?.id]);

  const currentToolMeta = TOOLS_CATALOG.find((t) => t.id === toolId);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSavedToast(false);
    try {
      const brief: MarketingBriefInput = {
        toolId,
        language,
        businessName,
        productName,
        description,
        targetAudience,
        offerOrPrice,
        tone,
      };
      const res = await api.generateMarketingContent(brief);
      setResult(res.output);
      onQuotaUpdated(res.quota.used, res.quota.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI content.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(key: string, text: string) {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  }

  async function handleSaveProject() {
    if (!result) return;
    if (!user) {
      onRequireAuth();
      return;
    }
    setSaving(true);
    try {
      await api.saveProject({
        toolId,
        title: `${currentToolMeta?.name ?? toolId} — ${productName}`,
        language,
        businessName,
        productName,
        inputBrief: {
          toolId,
          language,
          businessName,
          productName,
          description,
          targetAudience,
          offerOrPrice,
          tone,
        },
        outputData: result,
      });
      setSavedToast(true);
      onProjectSaved();
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save project.');
    } finally {
      setSaving(false);
    }
  }

  function fillDemoExample() {
    if (!businessName) setBusinessName('Aarav Ethnic Wear');
    setProductName('Festive Cotton Kurta Collection');
    setDescription('Breathable handloom cotton kurtas with modern cuts, available in 6 festive colors with free home delivery.');
    if (!targetAudience) setTargetAudience('Young professionals and families aged 22-45 in tier-1 & tier-2 Indian cities');
    setOfferOrPrice('Flat 20% Off + Free Delivery above ₹999');
  }

  return (
    <div className="space-y-6">
      {/* Tool Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#0C1222] border border-slate-800/80">
        {TEXT_TOOLS.map((id) => {
          const meta = TOOLS_CATALOG.find((t) => t.id === id);
          const active = toolId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setToolId(id);
                setResult(null);
                setError('');
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              {uiLang === 'hi' ? meta?.nameHi.replace('AI ', '') : meta?.name.replace('AI ', '').replace(' Generator', '').replace(' Writer', '')}
            </button>
          );
        })}
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Form */}
        <form
          onSubmit={handleGenerate}
          className="xl:col-span-5 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                {uiLang === 'hi' ? currentToolMeta?.nameHi : currentToolMeta?.name}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {uiLang === 'hi' ? currentToolMeta?.shortDescHi : currentToolMeta?.shortDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={fillDemoExample}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap shrink-0"
            >
              {uiLang === 'hi' ? 'उदाहरण भरें' : 'Fill Sample'}
            </button>
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {uiLang === 'hi' ? 'कंटेंट की भाषा चुनें' : 'Output Language'}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#070A15] border border-slate-800">
              {(
                [
                  { id: 'hinglish', label: 'Hinglish' },
                  { id: 'hi', label: 'हिंदी (Hindi)' },
                  { id: 'en', label: 'English' },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`py-2 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${
                    language === lang.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {uiLang === 'hi' ? 'बिजनेस का नाम *' : 'Business Name *'}
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sharma Electronics"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {uiLang === 'hi' ? 'प्रोडक्ट / सर्विस *' : 'Product / Service *'}
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Smart LED TV 43-inch"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {uiLang === 'hi' ? 'प्रोडक्ट विवरण / खासियत' : 'Product Description & Key Benefits'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                uiLang === 'hi'
                  ? 'अपने प्रोडक्ट की खासियत, कीमत या डिलीवरी के बारे में लिखें...'
                  : 'Describe what makes your product or service special...'
              }
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {uiLang === 'hi' ? 'टारगेट ग्राहक' : 'Target Audience'}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Families, Students, Shoppers"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {uiLang === 'hi' ? 'ऑफर या कीमत (वैकल्पिक)' : 'Offer / Price (Optional)'}
              </label>
              <input
                type="text"
                value={offerOrPrice}
                onChange={(e) => setOfferOrPrice(e.target.value)}
                placeholder="e.g. Flat 20% Off · ₹799"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {uiLang === 'hi' ? 'अंदाज़ (Tone)' : 'Brand Tone'}
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Trustworthy & energetic">Trustworthy & Energetic</option>
              <option value="Friendly & conversational">Friendly & Conversational</option>
              <option value="Premium & luxury">Premium & Luxury</option>
              <option value="Urgent festive sale">Urgent Sale / Festive Offer</option>
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200 space-y-2">
              <p className="leading-relaxed">{error}</p>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-red-900/60 hover:bg-red-800/70 border border-red-700/60 text-white transition-colors"
              >
                {uiLang === 'hi' ? 'दोबारा कोशिश करें' : 'Retry / दोबारा कोशिश करें'}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {uiLang === 'hi' ? 'AI कंटेंट तैयार हो रहा है...' : 'Generating with MUSHRAY AI...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {uiLang === 'hi' ? 'AI से कंटेंट जनरेट करें' : 'Generate Marketing Content'}
              </>
            )}
          </button>
        </form>

        {/* Right Output Canvas */}
        <div className="xl:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 sm:p-6 min-h-[420px] flex flex-col justify-between">
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="h-12 w-12 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-semibold text-white mb-1.5">
                {uiLang === 'hi' ? 'आपका AI आउटपुट यहाँ दिखेगा' : 'Ready to Generate Your Campaign'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                {uiLang === 'hi'
                  ? 'बाईं ओर अपने बिजनेस और प्रोडक्ट की जानकारी भरें और "AI से कंटेंट जनरेट करें" दबाएं।'
                  : 'Enter your business name, product details, and target audience on the left, then click Generate.'}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex-1 space-y-4 py-4">
              <div className="h-6 w-2/3 rounded bg-slate-800/80 animate-pulse" />
              <div className="h-24 w-full rounded bg-slate-800/60 animate-pulse" />
              <div className="h-24 w-full rounded bg-slate-800/60 animate-pulse" />
              <div className="h-12 w-1/2 rounded bg-slate-800/60 animate-pulse" />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="text-xs text-slate-400">
                  {currentToolMeta?.name} · <span className="uppercase">{language}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSendToPoster(
                        {
                          toolId: 'poster-maker',
                          language,
                          businessName,
                          productName,
                          description,
                          targetAudience,
                          offerOrPrice,
                          tone,
                        },
                        {
                          headline: typeof result.headline === 'string' ? result.headline : productName,
                          subheadline:
                            typeof result.hook === 'string'
                              ? result.hook
                              : typeof result.seoTitle === 'string'
                              ? result.seoTitle
                              : description.slice(0, 80),
                          cta: typeof result.cta === 'string' ? result.cta : 'Order Now',
                        }
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#121A30] border border-slate-700 text-slate-200 hover:border-violet-500/60 whitespace-nowrap"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
                    {uiLang === 'hi' ? 'इसका पोस्टर बनाएं' : 'Turn into Poster'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white whitespace-nowrap"
                  >
                    {savedToast ? <Check className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    {savedToast
                      ? uiLang === 'hi'
                        ? 'सेव हो गया!'
                        : 'Saved!'
                      : uiLang === 'hi'
                      ? 'प्रोजेक्ट सेव करें'
                      : 'Save Project'}
                  </button>
                </div>
              </div>

              {/* Structured Tool Renderers */}
              <GeneratedResultView
                toolId={toolId}
                data={result}
                copiedKey={copiedKey}
                onCopy={handleCopy}
                uiLang={uiLang}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyButton({
  id,
  text,
  copiedKey,
  onCopy,
}: {
  id: string;
  text: string;
  copiedKey: string | null;
  onCopy: (k: string, t: string) => void;
}) {
  const isCopied = copiedKey === id;
  return (
    <button
      type="button"
      onClick={() => onCopy(id, text)}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#121A30] border border-slate-700/80 hover:text-white hover:border-blue-500/50 whitespace-nowrap shrink-0"
    >
      {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {isCopied ? 'Copied' : 'Copy'}
    </button>
  );
}

function SectionBlock({
  title,
  copyKey,
  content,
  copiedKey,
  onCopy,
  extraAction,
}: {
  title: string;
  copyKey: string;
  content: string;
  copiedKey: string | null;
  onCopy: (k: string, t: string) => void;
  extraAction?: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-[#080C18] border border-slate-800/80 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-blue-400">{title}</span>
        <div className="flex items-center gap-2">
          {extraAction}
          <CopyButton id={copyKey} text={content} copiedKey={copiedKey} onCopy={onCopy} />
        </div>
      </div>
      <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

function GeneratedResultView({
  toolId,
  data,
  copiedKey,
  onCopy,
  uiLang,
}: {
  toolId: TextToolId;
  data: Record<string, unknown>;
  copiedKey: string | null;
  onCopy: (k: string, t: string) => void;
  uiLang: UiLanguage;
}) {
  if (toolId === 'social-post') {
    const hashtags = Array.isArray(data.hashtags) ? (data.hashtags as string[]).join(' ') : '';
    const fullPost = `${String(data.hook ?? '')}\n\n${String(data.body ?? '')}\n\n${String(data.cta ?? '')}\n\n${hashtags}`;
    return (
      <div className="space-y-4">
        <SectionBlock
          title={uiLang === 'hi' ? 'पूरा सोशल मीडिया पोस्ट' : 'Complete Post (Ready to Publish)'}
          copyKey="full-post"
          content={fullPost}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400 mb-1">
              {uiLang === 'hi' ? 'पोस्ट करने का सही समय' : 'Best Posting Window'}
            </div>
            <div className="text-sm text-white font-medium">{String(data.bestTime ?? '')}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400 mb-1">
              {uiLang === 'hi' ? 'विजुअल / फोटो सुझाव' : 'Visual Suggestion'}
            </div>
            <div className="text-xs text-slate-200 leading-relaxed">{String(data.visualIdea ?? '')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (toolId === 'instagram-caption') {
    const hashtags = Array.isArray(data.hashtags) ? (data.hashtags as string[]).join(' ') : '';
    return (
      <div className="space-y-3">
        <SectionBlock title="Storytelling Caption" copyKey="ig-story" content={String(data.storyCaption ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <SectionBlock title="Short & Punchy Caption" copyKey="ig-short" content={String(data.shortCaption ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <SectionBlock title="Sales & Offer Caption" copyKey="ig-sales" content={String(data.salesCaption ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <SectionBlock title="Pinned First Comment & Hashtags" copyKey="ig-tags" content={`${String(data.firstCommentPrompt ?? '')}\n\n${hashtags}`} copiedKey={copiedKey} onCopy={onCopy} />
      </div>
    );
  }

  if (toolId === 'facebook-post') {
    const pollOpts = Array.isArray(data.pollOptions) ? (data.pollOptions as string[]) : [];
    return (
      <div className="space-y-3">
        <SectionBlock title="Offer Announcement Post" copyKey="fb-offer" content={String(data.offerPost ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <SectionBlock title="Trust & Community Story Post" copyKey="fb-comm" content={String(data.communityPost ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <SectionBlock
          title={`Engagement Poll (CTA: ${String(data.recommendedCtaButton ?? 'Message')})`}
          copyKey="fb-poll"
          content={`${String(data.pollQuestion ?? '')}\n${pollOpts.map((o, i) => `${i + 1}. ${o}`).join('\n')}`}
          copiedKey={copiedKey}
          onCopy={onCopy}
        />
      </div>
    );
  }

  if (toolId === 'whatsapp-marketing') {
    const broadcast = String(data.broadcastMessage ?? '');
    return (
      <div className="space-y-3">
        <SectionBlock
          title="WhatsApp Broadcast Message"
          copyKey="wa-main"
          content={broadcast}
          copiedKey={copiedKey}
          onCopy={onCopy}
          extraAction={
            <a
              href={`https://wa.me/?text=${encodeURIComponent(broadcast)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 whitespace-nowrap"
            >
              <ExternalLink className="h-3 w-3" />
              WhatsApp
            </a>
          }
        />
        <SectionBlock title="Follow-Up Reminder" copyKey="wa-follow" content={String(data.followUpMessage ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
        <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80 text-xs text-slate-300">
          <span className="font-semibold text-violet-400">Broadcast Tip: </span>
          {String(data.broadcastTip ?? '')} · Quick Reply: {String(data.quickReplyCta ?? '')}
        </div>
      </div>
    );
  }

  if (toolId === 'ad-script') {
    const scenes = Array.isArray(data.scenes)
      ? (data.scenes as { timeRange: string; visualAction: string; onScreenText: string; voiceover: string }[])
      : [];
    const fullScript = scenes
      .map((s) => `[${s.timeRange}] Visual: ${s.visualAction}\nText: ${s.onScreenText}\nVoiceover: ${s.voiceover}`)
      .join('\n\n');
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-display font-semibold text-white text-base">{String(data.adTitle ?? 'Video Ad Script')}</h4>
            <div className="text-xs text-slate-400">
              {String(data.durationSeconds ?? '25s')} · {String(data.targetHookAngle ?? '')}
            </div>
          </div>
          <CopyButton id="ad-all" text={fullScript} copiedKey={copiedKey} onCopy={onCopy} />
        </div>
        <div className="space-y-2.5">
          {scenes.map((scene, idx) => (
            <div key={idx} className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80 space-y-1.5">
              <div className="text-xs font-mono-num text-blue-400">{scene.timeRange}</div>
              <div className="text-xs text-slate-400">Camera: {scene.visualAction}</div>
              <div className="text-xs font-semibold text-violet-300">On-Screen: {scene.onScreenText}</div>
              <div className="text-sm text-white">Voiceover: &ldquo;{scene.voiceover}&rdquo;</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (toolId === 'product-description') {
    const bullets = Array.isArray(data.bulletPoints) ? (data.bulletPoints as string[]) : [];
    const keywords = Array.isArray(data.searchKeywords) ? (data.searchKeywords as string[]) : [];
    const combined = `${String(data.seoTitle ?? '')}\n\n${String(data.description ?? '')}\n\n${bullets.map((b) => `• ${b}`).join('\n')}`;
    return (
      <div className="space-y-3">
        <SectionBlock title="SEO Marketplace Listing" copyKey="pd-all" content={combined} copiedKey={copiedKey} onCopy={onCopy} />
        <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80">
          <div className="text-xs font-medium text-slate-400 mb-1.5">Search Keywords</div>
          <div className="text-xs text-slate-200 leading-relaxed">{keywords.join(' · ')}</div>
        </div>
      </div>
    );
  }

  // Marketing Strategy
  const weeks = Array.isArray(data.weeklyRoadmap)
    ? (data.weeklyRoadmap as { week: string; focus: string; actions: string[] }[])
    : [];
  const channels = Array.isArray(data.channelMix)
    ? (data.channelMix as { channel: string; allocationPercent: string; tactic: string }[])
    : [];
  const kpis = Array.isArray(data.kpis) ? (data.kpis as string[]) : [];

  return (
    <div className="space-y-4">
      <SectionBlock title="Executive Summary" copyKey="ms-sum" content={String(data.executiveSummary ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
      <SectionBlock title="Target Buyer Persona" copyKey="ms-per" content={String(data.audiencePersona ?? '')} copiedKey={copiedKey} onCopy={onCopy} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {weeks.map((w, i) => (
          <div key={i} className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80 space-y-1.5">
            <div className="text-xs font-semibold text-blue-400">{w.week} · {w.focus}</div>
            <ul className="space-y-1 text-xs text-slate-200 list-disc pl-4">
              {w.actions?.map((a, idx) => <li key={idx}>{a}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80 space-y-2">
        <div className="text-xs font-semibold text-violet-400">Channel & Budget Allocation</div>
        <div className="divide-y divide-slate-800/70">
          {channels.map((c, idx) => (
            <div key={idx} className="py-2 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="font-medium text-white">{c.channel}</div>
                <div className="text-slate-400">{c.tactic}</div>
              </div>
              <span className="font-mono-num font-semibold text-blue-300 shrink-0">{c.allocationPercent}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3.5 rounded-lg bg-[#080C18] border border-slate-800/80 text-xs text-slate-200">
        <span className="font-semibold text-blue-400">30-Day KPIs: </span>
        {kpis.join(' · ')}
      </div>
    </div>
  );
}
