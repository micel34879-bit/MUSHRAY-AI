import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { BookmarkPlus, Check, Download, ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { FESTIVAL_LIST, GENERATED_BACKDROPS } from '../data/toolsCatalog';
import { api } from '../lib/api';
import type { ContentLanguage, MarketingBriefInput, UiLanguage, UserProfile } from '../types/mushray';

interface PosterStudioProps {
  initialFestivalMode?: boolean;
  prefillBrief?: MarketingBriefInput | null;
  prefillCopy?: { headline?: string; subheadline?: string; cta?: string } | null;
  uiLang: UiLanguage;
  user: UserProfile | null;
  onQuotaUpdated: (used: number, limit: number | null) => void;
  onRequireAuth: () => void;
  onProjectSaved: () => void;
}

type PosterAspect = '1:1' | '9:16' | '16:9';
type PosterTheme = 'blue-silk' | 'festival-gold' | 'midnight-violet' | 'obsidian-clean';

export function PosterStudio({
  initialFestivalMode = false,
  prefillBrief,
  prefillCopy,
  uiLang,
  user,
  onQuotaUpdated,
  onRequireAuth,
  onProjectSaved,
}: PosterStudioProps) {
  const [mode, setMode] = useState<'poster-maker' | 'festival-poster'>(
    initialFestivalMode ? 'festival-poster' : 'poster-maker'
  );
  const [language, setLanguage] = useState<ContentLanguage>(
    prefillBrief?.language ?? user?.defaultContentLanguage ?? 'hinglish'
  );
  const [businessName, setBusinessName] = useState(prefillBrief?.businessName ?? user?.businessName ?? 'MUSHRAY Store');
  const [productName, setProductName] = useState(prefillBrief?.productName ?? 'Premium Collection');
  const [description, setDescription] = useState(prefillBrief?.description ?? 'Top quality products at unbeatable prices');
  const [targetAudience, setTargetAudience] = useState(prefillBrief?.targetAudience ?? user?.defaultAudience ?? 'Local shoppers');
  const [offerOrPrice, setOfferOrPrice] = useState(prefillBrief?.offerOrPrice ?? 'FLAT 20% OFF');
  const [festivalName, setFestivalName] = useState(FESTIVAL_LIST[0]);

  const [aspect, setAspect] = useState<PosterAspect>('1:1');
  const [theme, setTheme] = useState<PosterTheme>(initialFestivalMode ? 'festival-gold' : 'blue-silk');

  // Editable poster fields
  const [headline, setHeadline] = useState(prefillCopy?.headline || 'Grand Festive Savings');
  const [subheadline, setSubheadline] = useState(
    prefillCopy?.subheadline || 'Upgrade your lifestyle with trusted quality and direct delivery'
  );
  const [offerBadge, setOfferBadge] = useState((prefillBrief?.offerOrPrice ?? 'FLAT 20% OFF').slice(0, 26).toUpperCase());
  const [highlights, setHighlights] = useState<string[]>([
    '100% Quality Checked',
    'Fast Home Delivery',
    'Special Festive Pricing',
  ]);
  const [ctaText, setCtaText] = useState(prefillCopy?.cta || 'Shop Now');
  const [tagline, setTagline] = useState(user?.phone ? `Call / WhatsApp: ${user.phone}` : 'Visit Our Store Today');

  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropImgCache = useRef<Record<string, HTMLImageElement>>({});
  const productImgRef = useRef<HTMLImageElement | null>(null);
  const badgeManualEditRef = useRef(false);

  useEffect(() => {
    setMode(initialFestivalMode ? 'festival-poster' : 'poster-maker');
    setTheme((prev) =>
      initialFestivalMode ? 'festival-gold' : prev === 'festival-gold' ? 'blue-silk' : prev
    );
  }, [initialFestivalMode]);

  useEffect(() => {
    if (!user) return;
    setBusinessName((prev) => (prev === 'MUSHRAY Store' && user.businessName ? user.businessName : prev));
    setTargetAudience((prev) => (prev === 'Local shoppers' && user.defaultAudience ? user.defaultAudience : prev));
    setTagline((prev) => (prev === 'Visit Our Store Today' && user.phone ? `Call / WhatsApp: ${user.phone}` : prev));
  }, [user?.id]);

  useEffect(() => {
    if (prefillBrief) {
      setBusinessName(prefillBrief.businessName);
      setProductName(prefillBrief.productName);
      setDescription(prefillBrief.description);
      setTargetAudience(prefillBrief.targetAudience);
      if (prefillBrief.offerOrPrice) {
        setOfferOrPrice(prefillBrief.offerOrPrice);
        setOfferBadge(prefillBrief.offerOrPrice.slice(0, 26).toUpperCase());
        badgeManualEditRef.current = false;
      }
      setLanguage(prefillBrief.language);
    }
    if (prefillCopy?.headline) setHeadline(prefillCopy.headline);
    if (prefillCopy?.subheadline) setSubheadline(prefillCopy.subheadline);
    if (prefillCopy?.cta) setCtaText(prefillCopy.cta);
  }, [prefillBrief, prefillCopy]);

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dims =
      aspect === '9:16'
        ? { w: 900, h: 1600 }
        : aspect === '16:9'
        ? { w: 1440, h: 810 }
        : { w: 1080, h: 1080 };

    canvas.width = dims.w;
    canvas.height = dims.h;

    const { w, h } = dims;

    // 1. Background Layer
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    if (theme === 'festival-gold') {
      bgGrad.addColorStop(0, '#120C28');
      bgGrad.addColorStop(1, '#070913');
    } else if (theme === 'midnight-violet') {
      bgGrad.addColorStop(0, '#0F172A');
      bgGrad.addColorStop(0.55, '#1E1B4B');
      bgGrad.addColorStop(1, '#070913');
    } else if (theme === 'obsidian-clean') {
      bgGrad.addColorStop(0, '#090D16');
      bgGrad.addColorStop(1, '#111827');
    } else {
      bgGrad.addColorStop(0, '#0B132B');
      bgGrad.addColorStop(1, '#070913');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Optional generated photographic backdrop
    const backdropSrc =
      theme === 'festival-gold'
        ? GENERATED_BACKDROPS.festivalDiwali
        : theme === 'blue-silk'
        ? GENERATED_BACKDROPS.posterBlue
        : null;

    if (backdropSrc) {
      const cached = backdropImgCache.current[backdropSrc];
      if (cached && cached.complete && cached.naturalWidth > 0) {
        const imgAspect = cached.naturalWidth / cached.naturalHeight;
        const canvasAspect = w / h;
        let dw = w;
        let dh = h;
        let dx = 0;
        let dy = 0;
        if (imgAspect > canvasAspect) {
          dw = h * imgAspect;
          dx = (w - dw) / 2;
        } else {
          dh = w / imgAspect;
          dy = (h - dh) / 2;
        }
        ctx.save();
        ctx.globalAlpha = theme === 'festival-gold' ? 0.85 : 0.72;
        ctx.drawImage(cached, dx, dy, dw, dh);
        ctx.restore();
      } else if (!cached) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawPoster();
        img.src = backdropSrc;
        backdropImgCache.current[backdropSrc] = img;
      }
    }

    // Contrast scrim overlay so text is always crisp
    const scrim = ctx.createLinearGradient(0, 0, 0, h);
    scrim.addColorStop(0, 'rgba(7, 9, 19, 0.78)');
    scrim.addColorStop(0.5, 'rgba(7, 9, 19, 0.45)');
    scrim.addColorStop(1, 'rgba(7, 9, 19, 0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);

    // Geometric corner accent frame
    ctx.strokeStyle = theme === 'festival-gold' ? 'rgba(251, 191, 36, 0.35)' : 'rgba(96, 165, 250, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    const padX = aspect === '16:9' ? 76 : 68;

    // 2. Top Brand Header + Offer Badge (non-overlapping layout)
    const cleanBadge = offerBadge.trim();
    let badgeW = 0;
    if (cleanBadge) {
      ctx.font = '700 22px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
      badgeW = Math.min(w * 0.36, Math.max(140, ctx.measureText(cleanBadge).width + 44));
      const badgeX = w - padX - badgeW;
      const badgeY = 66;
      const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + 48);
      if (theme === 'festival-gold') {
        badgeGrad.addColorStop(0, '#F59E0B');
        badgeGrad.addColorStop(1, '#D97706');
      } else {
        badgeGrad.addColorStop(0, '#2563EB');
        badgeGrad.addColorStop(1, '#7C3AED');
      }
      ctx.fillStyle = badgeGrad;
      roundRect(ctx, badgeX, badgeY, badgeW, 48, 10);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(cleanBadge, badgeX + badgeW / 2, badgeY + 32, badgeW - 20);
      ctx.textAlign = 'left';
    }

    const maxBrandW = w - padX * 2 - (badgeW > 0 ? badgeW + 28 : 0);
    const brandText = (businessName.trim() || 'MUSHRAY AI').toUpperCase();
    ctx.fillStyle = '#F8FAFC';
    ctx.font = `700 ${aspect === '16:9' ? 28 : 30}px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif`;
    const brandLines = measureWrappedLines(ctx, brandText, maxBrandW).slice(0, 2);
    let headerBottomY = 100;
    for (let i = 0; i < brandLines.length; i++) {
      const yPos = 98 + i * 36;
      ctx.fillText(brandLines[i], padX, yPos, maxBrandW);
      headerBottomY = yPos + 12;
    }

    if (mode === 'festival-poster') {
      ctx.fillStyle = '#FBBF24';
      ctx.font = '600 22px "DM Sans", "Noto Sans Devanagari", sans-serif';
      ctx.fillText(festivalName.split('/')[0].trim(), padX, headerBottomY + 24, maxBrandW);
      headerBottomY += 36;
    }

    // Footer & CTA geometry (fixed safe zone at bottom)
    const ctaY = h - 168;
    const contentBottomY = ctaY - 26;

    // 3. Optional Uploaded Product Photo (guaranteed non-overlapping bounds)
    const hasProductImg =
      productImgRef.current && productImgRef.current.complete && productImgRef.current.naturalWidth > 0;

    let textMaxW = w - padX * 2;
    let contentStartY = Math.max(headerBottomY + 26, aspect === '16:9' ? 185 : 210);

    if (hasProductImg && productImgRef.current) {
      const pImg = productImgRef.current;
      if (aspect === '9:16') {
        const boxW = 480;
        const boxH = 400;
        const boxX = (w - boxW) / 2;
        const boxY = Math.max(headerBottomY + 20, 200);
        drawProductPhotoBox(ctx, pImg, boxX, boxY, boxW, boxH);
        contentStartY = boxY + boxH + 48;
      } else {
        const boxW = aspect === '16:9' ? 400 : 340;
        const boxY = Math.max(headerBottomY + 20, aspect === '16:9' ? 175 : 220);
        const maxBoxH = Math.max(220, contentBottomY - boxY);
        const boxH = Math.min(aspect === '16:9' ? 360 : 380, maxBoxH);
        const boxX = w - padX - boxW;
        drawProductPhotoBox(ctx, pImg, boxX, boxY, boxW, boxH);
        textMaxW = Math.max(280, boxX - padX - 36);
      }
    }

    // 4 & 5. Auto-fitted Headline, Subheadline & Wrapped Highlights inside [contentStartY .. contentBottomY]
    const availableH = Math.max(160, contentBottomY - contentStartY);
    const activeHighlights = highlights.filter((item) => item.trim().length > 0).slice(0, 3);
    const scales = [1, 0.88, 0.78, 0.68, 0.58];
    let chosenLayout = computePosterTextLayout(
      ctx,
      headline || productName,
      subheadline,
      activeHighlights,
      textMaxW,
      aspect,
      scales[scales.length - 1]
    );

    for (const s of scales) {
      const candidate = computePosterTextLayout(
        ctx,
        headline || productName,
        subheadline,
        activeHighlights,
        textMaxW,
        aspect,
        s
      );
      if (candidate.totalHeight <= availableH) {
        chosenLayout = candidate;
        break;
      }
    }

    let cursorY = contentStartY + chosenLayout.headSize * 0.85;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${chosenLayout.headSize}px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif`;
    for (const line of chosenLayout.headLines) {
      ctx.fillText(line, padX, cursorY, textMaxW);
      cursorY += chosenLayout.headLineH;
    }

    if (chosenLayout.subLines.length > 0) {
      cursorY += chosenLayout.subGap;
      ctx.fillStyle = '#CBD5E1';
      ctx.font = `500 ${chosenLayout.subSize}px "DM Sans", "Noto Sans Devanagari", sans-serif`;
      for (const line of chosenLayout.subLines) {
        ctx.fillText(line, padX, cursorY, textMaxW);
        cursorY += chosenLayout.subLineH;
      }
    }

    if (chosenLayout.bulletGroups.length > 0) {
      cursorY += chosenLayout.bulletGap;
      ctx.font = `600 ${chosenLayout.bulletSize}px "DM Sans", "Noto Sans Devanagari", sans-serif`;
      for (const lines of chosenLayout.bulletGroups) {
        ctx.fillStyle = theme === 'festival-gold' ? '#FBBF24' : '#60A5FA';
        ctx.fillText('●', padX, cursorY);
        ctx.fillStyle = '#F1F5F9';
        for (const line of lines) {
          ctx.fillText(line, padX + 28, cursorY, textMaxW - 28);
          cursorY += chosenLayout.bulletLineH;
        }
        cursorY += chosenLayout.bulletItemGap;
      }
    }

    // 6. CTA Button & Bottom Bar
    const ctaGrad = ctx.createLinearGradient(padX, ctaY, padX + 300, ctaY + 62);
    if (theme === 'festival-gold') {
      ctaGrad.addColorStop(0, '#F59E0B');
      ctaGrad.addColorStop(1, '#EA580C');
    } else {
      ctaGrad.addColorStop(0, '#2563EB');
      ctaGrad.addColorStop(1, '#7C3AED');
    }
    ctx.font = '700 24px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
    const ctaLabel = ctaText.trim() || 'Order Now';
    const ctaW = Math.max(220, Math.min(w - padX * 2, ctx.measureText(ctaLabel).width + 80));
    ctx.fillStyle = ctaGrad;
    roundRect(ctx, padX, ctaY, ctaW, 62, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(ctaLabel, padX + ctaW / 2, ctaY + 40, ctaW - 28);
    ctx.textAlign = 'left';

    // Footer Contact / Tagline (clipped cleanly before MUSHRAY AI mark)
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 20px "DM Sans", "Noto Sans Devanagari", sans-serif';
    ctx.fillText(tagline || businessName, padX, h - 62, w - padX * 2 - 160);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.72)';
    ctx.font = '500 18px "JetBrains Mono", monospace';
    ctx.fillText('MUSHRAY AI', w - padX, h - 62);
    ctx.textAlign = 'left';
  }, [aspect, businessName, ctaText, festivalName, headline, highlights, mode, offerBadge, productName, subheadline, tagline, theme]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  function handleProductUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setProductImageUrl(dataUrl);
      const img = new Image();
      img.onload = () => {
        productImgRef.current = img;
        drawPoster();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerateCopy(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    badgeManualEditRef.current = false;
    try {
      const res = await api.generateMarketingContent({
        toolId: mode,
        language,
        businessName,
        productName,
        description,
        targetAudience,
        offerOrPrice,
        festivalName: mode === 'festival-poster' ? festivalName : undefined,
      });
      const out = res.output;
      const cleanOffer = offerOrPrice.trim();
      const percentMatch = cleanOffer.match(/\d+(?:\.\d+)?\s*%/)?.[0]?.replace(/\s+/g, '');
      const syncPercent = (txt: string) =>
        percentMatch ? txt.replace(/\d+(?:\.\d+)?\s*%/g, percentMatch) : txt;

      if (typeof out.headline === 'string') setHeadline(syncPercent(out.headline));
      if (typeof out.subheadline === 'string') setSubheadline(syncPercent(out.subheadline));

      if (cleanOffer) {
        const aiBadge = typeof out.offerBadge === 'string' ? syncPercent(out.offerBadge).trim() : '';
        const hasExactPercent = percentMatch ? aiBadge.includes(percentMatch) : true;
        setOfferBadge(
          aiBadge && hasExactPercent ? aiBadge.slice(0, 26) : cleanOffer.slice(0, 26).toUpperCase()
        );
      } else if (typeof out.offerBadge === 'string') {
        setOfferBadge(out.offerBadge);
      }

      if (Array.isArray(out.highlights)) {
        setHighlights((out.highlights as string[]).slice(0, 3).map((item) => syncPercent(String(item))));
      }
      if (typeof out.ctaText === 'string') setCtaText(out.ctaText);
      if (typeof out.tagline === 'string') setTagline(syncPercent(out.tagline));
      onQuotaUpdated(res.quota.used, res.quota.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate poster copy.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `mushray-${mode}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleSavePosterProject() {
    if (!user) {
      onRequireAuth();
      return;
    }
    const canvas = canvasRef.current;
    const preview = canvas ? canvas.toDataURL('image/jpeg', 0.72) : undefined;
    setSaving(true);
    try {
      await api.saveProject({
        toolId: mode,
        title: `${mode === 'festival-poster' ? festivalName.split('/')[0].trim() : 'Poster'} — ${headline}`,
        language,
        businessName,
        productName,
        inputBrief: {
          toolId: mode,
          language,
          businessName,
          productName,
          description,
          targetAudience,
          offerOrPrice,
          festivalName: mode === 'festival-poster' ? festivalName : undefined,
        },
        outputData: { headline, subheadline, offerBadge, highlights, ctaText, tagline, aspect, theme },
        previewImageDataUrl: preview,
      });
      setSavedToast(true);
      onProjectSaved();
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save poster.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Studio Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0C1222] border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('poster-maker');
              if (theme === 'festival-gold') setTheme('blue-silk');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'poster-maker' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {uiLang === 'hi' ? 'बिजनेस पोस्टर व बैनर' : 'Business Poster & Banner'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('festival-poster');
              setTheme('festival-gold');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              mode === 'festival-poster' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {uiLang === 'hi' ? 'फेस्टिवल पोस्टर मेकर' : 'Festival Poster Generator'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSavePosterProject}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0C1222] border border-slate-700 text-white hover:border-blue-500 whitespace-nowrap"
          >
            {savedToast ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            {savedToast ? (uiLang === 'hi' ? 'सेव हो गया' : 'Saved') : uiLang === 'hi' ? 'सेव करें' : 'Save Poster'}
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            {uiLang === 'hi' ? 'PNG डाउनलोड करें' : 'Download PNG'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left AI Controls & Live Text Editor */}
        <div className="xl:col-span-5 space-y-5">
          <form onSubmit={handleGenerateCopy} className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-white">
                {uiLang === 'hi' ? '1. AI पोस्टर कॉपी जनरेट करें' : '1. AI Poster Copy Generator'}
              </h3>
              <div className="flex gap-1">
                {(['hinglish', 'hi', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold ${
                      language === l ? 'bg-blue-600 text-white' : 'bg-[#070A15] text-slate-400'
                    }`}
                  >
                    {l === 'hi' ? 'हिंदी' : l === 'hinglish' ? 'Hinglish' : 'EN'}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'festival-poster' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {uiLang === 'hi' ? 'त्योहार चुनें' : 'Select Festival'}
                </label>
                <select
                  value={festivalName}
                  onChange={(e) => setFestivalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
                >
                  {FESTIVAL_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Product / Offer</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Discount / Price</label>
                <input
                  type="text"
                  value={offerOrPrice}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setOfferOrPrice(nextVal);
                    if (!badgeManualEditRef.current) {
                      setOfferBadge(nextVal.slice(0, 26).toUpperCase());
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading
                ? uiLang === 'hi'
                  ? 'कॉपी बन रही है...'
                  : 'Generating Poster Copy...'
                : uiLang === 'hi'
                ? 'AI से पोस्टर टेक्स्ट लिखें'
                : 'Generate Poster Copy with AI'}
            </button>
          </form>

          {/* Design & Live Text Tweaks */}
          <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-white">
              {uiLang === 'hi' ? '2. डिज़ाइन और टेक्स्ट एडिट करें' : '2. Customize Layout & Text'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Poster Size</label>
                <select
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value as PosterAspect)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
                >
                  <option value="1:1">1:1 Instagram / WhatsApp</option>
                  <option value="9:16">9:16 Story / Status</option>
                  <option value="16:9">16:9 Banner / YouTube</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Visual Backdrop</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as PosterTheme)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
                >
                  <option value="blue-silk">Royal Blue Studio</option>
                  <option value="festival-gold">Festive Diya & Gold</option>
                  <option value="midnight-violet">Midnight Violet</option>
                  <option value="obsidian-clean">Obsidian Minimal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#070A15] border border-slate-700 hover:border-blue-500 text-xs text-slate-200 cursor-pointer">
                <ImagePlus className="h-4 w-4 text-blue-400" />
                {productImageUrl
                  ? uiLang === 'hi'
                    ? 'प्रोडक्ट फोटो बदलें'
                    : 'Change Product Photo'
                  : uiLang === 'hi'
                  ? 'अपना प्रोडक्ट फोटो जोड़ें'
                  : 'Upload Product Photo'}
                <input type="file" accept="image/*" onChange={handleProductUpload} className="hidden" />
              </label>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Poster Headline"
                className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
              />
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="Subheadline"
                className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={offerBadge}
                  onChange={(e) => {
                    badgeManualEditRef.current = true;
                    setOfferBadge(e.target.value);
                  }}
                  placeholder="Offer Ribbon"
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
                />
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Button CTA"
                  className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
                />
              </div>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Footer Contact / Address"
                className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Live High-Res Canvas Preview */}
        <div className="xl:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-4">
            <span>{uiLang === 'hi' ? 'लाइव HD पोस्टर प्रिव्यू' : 'Live High-Resolution Preview'}</span>
            <span className="font-mono-num">
              {aspect === '9:16' ? '900 × 1600 px' : aspect === '16:9' ? '1440 × 810 px' : '1080 × 1080 px'}
            </span>
          </div>
          <div className="w-full flex items-center justify-center bg-[#060811] rounded-xl p-4 border border-slate-800/70">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[580px] h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function drawProductPhotoBox(
  ctx: CanvasRenderingContext2D,
  pImg: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  ctx.save();
  roundRect(ctx, boxX, boxY, boxW, boxH, 20);
  ctx.clip();
  const ratio = Math.max(boxW / pImg.naturalWidth, boxH / pImg.naturalHeight);
  const dw = pImg.naturalWidth * ratio;
  const dh = pImg.naturalHeight * ratio;
  ctx.drawImage(pImg, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, boxY, boxW, boxH, 20);
  ctx.stroke();
}

function measureWrappedLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

function computePosterTextLayout(
  ctx: CanvasRenderingContext2D,
  headlineText: string,
  subheadlineText: string,
  highlightsList: string[],
  maxWidth: number,
  aspect: PosterAspect,
  scale: number
) {
  const baseHead = aspect === '16:9' ? 54 : 58;
  const headSize = Math.max(26, Math.round(baseHead * scale));
  const headLineH = Math.round(headSize * 1.15);
  ctx.font = `800 ${headSize}px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif`;
  const headLines = measureWrappedLines(ctx, headlineText, maxWidth).slice(0, 4);

  const subSize = Math.max(18, Math.round(26 * scale));
  const subLineH = Math.round(subSize * 1.38);
  ctx.font = `500 ${subSize}px "DM Sans", "Noto Sans Devanagari", sans-serif`;
  const subLines = subheadlineText.trim()
    ? measureWrappedLines(ctx, subheadlineText, maxWidth).slice(0, 3)
    : [];

  const bulletSize = Math.max(16, Math.round(22 * scale));
  const bulletLineH = Math.round(bulletSize * 1.35);
  ctx.font = `600 ${bulletSize}px "DM Sans", "Noto Sans Devanagari", sans-serif`;
  const bulletGroups = highlightsList.map((item) =>
    measureWrappedLines(ctx, item.trim(), Math.max(140, maxWidth - 28)).slice(0, 2)
  );

  const subGap = Math.round(22 * scale);
  const bulletGap = Math.round(26 * scale);
  const bulletItemGap = Math.round(8 * scale);

  let totalHeight = headLines.length * headLineH;
  if (subLines.length > 0) {
    totalHeight += subGap + subLines.length * subLineH;
  }
  if (bulletGroups.length > 0) {
    totalHeight += bulletGap;
    for (const grp of bulletGroups) {
      totalHeight += grp.length * bulletLineH + bulletItemGap;
    }
  }

  return {
    headSize,
    headLineH,
    headLines,
    subSize,
    subLineH,
    subLines,
    bulletSize,
    bulletLineH,
    bulletGroups,
    subGap,
    bulletGap,
    bulletItemGap,
    totalHeight,
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
