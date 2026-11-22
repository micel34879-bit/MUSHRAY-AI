import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Download, Film, ImagePlus, Loader2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import type { ContentLanguage, UiLanguage, UserProfile } from '../types/mushray';

interface VideoScene {
  sceneLabel: string;
  headline: string;
  subtitle: string;
  badge: string;
  voiceover: string;
}

interface VideoCreatorStudioProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
  onQuotaUpdated: (used: number, limit: number | null) => void;
}

const DEFAULT_SCENES: VideoScene[] = [
  {
    sceneLabel: '01 · Hook',
    headline: 'Looking for Quality You Can Trust?',
    subtitle: 'Discover our bestselling collection crafted for everyday excellence',
    badge: 'NEW ARRIVAL',
    voiceover: 'Upgrade your everyday style with trusted quality.',
  },
  {
    sceneLabel: '02 · Showcase',
    headline: 'Built for Modern Living',
    subtitle: 'Handpicked materials, crisp finish, and verified customer satisfaction',
    badge: 'TOP RATED',
    voiceover: 'Crafted carefully with features your family will love.',
  },
  {
    sceneLabel: '03 · Offer',
    headline: 'Flat 20% Festive Offer',
    subtitle: 'Limited-time pricing plus fast doorstep delivery across India',
    badge: 'SAVE 20%',
    voiceover: 'Enjoy flat twenty percent off for a limited time.',
  },
  {
    sceneLabel: '04 · Call to Action',
    headline: 'Order Today on WhatsApp',
    subtitle: 'Message us now to book your order before stock runs out',
    badge: 'SHOP NOW',
    voiceover: 'Click or message us on WhatsApp to order today.',
  },
];

export function VideoCreatorStudio({ uiLang, user, onQuotaUpdated }: VideoCreatorStudioProps) {
  const [language, setLanguage] = useState<ContentLanguage>(user?.defaultContentLanguage ?? 'hinglish');
  const [businessName, setBusinessName] = useState(user?.businessName ?? 'MUSHRAY Store');
  const [productName, setProductName] = useState('Festive Smart Watch Pro');
  const [description, setDescription] = useState('AMOLED display, 7-day battery, Bluetooth calling, 1-year warranty');
  const [targetAudience, setTargetAudience] = useState(user?.defaultAudience ?? 'Young professionals & gift shoppers');
  const [offerOrPrice, setOfferOrPrice] = useState('₹1,999 Only · Flat 20% Off');

  const [scenes, setScenes] = useState<VideoScene[]>(DEFAULT_SCENES);
  const [reelTitle, setReelTitle] = useState('4-Scene Product Promo Reel');
  const [aspect, setAspect] = useState<'9:16' | '1:1'>('9:16');
  const [playing, setPlaying] = useState(true);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const productImgRef = useRef<HTMLImageElement | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  const SCENE_DURATION_MS = 2800;
  const TOTAL_DURATION_MS = SCENE_DURATION_MS * Math.max(1, scenes.length);

  const renderFrame = useCallback(
    (elapsedMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = aspect === '9:16' ? 540 : 720;
      const h = aspect === '9:16' ? 960 : 720;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const loopMs = elapsedMs % TOTAL_DURATION_MS;
      const sceneIdx = Math.min(scenes.length - 1, Math.floor(loopMs / SCENE_DURATION_MS));
      const sceneProgress = (loopMs % SCENE_DURATION_MS) / SCENE_DURATION_MS;
      const scene = scenes[sceneIdx] ?? DEFAULT_SCENES[0];

      // Animated deep blue-purple-obsidian gradient background
      const shift = Math.sin((elapsedMs / 2400) * Math.PI) * 0.15;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#070A16');
      grad.addColorStop(Math.max(0.2, Math.min(0.8, 0.5 + shift)), sceneIdx % 2 === 0 ? '#1E3A8A' : '#4C1D95');
      grad.addColorStop(1, '#090D1C');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Animated subtle geometric ring
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.22)';
      ctx.lineWidth = 2;
      const ringRadius = (w * 0.34) + Math.sin(sceneProgress * Math.PI) * 18;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.38, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Optional product photo zoom/pan showcase (cleanly framed above text zone)
      const hasVideoImg =
        productImgRef.current && productImgRef.current.complete && productImgRef.current.naturalWidth > 0;
      if (hasVideoImg && productImgRef.current) {
        const img = productImgRef.current;
        const zoom = 1 + sceneProgress * 0.06;
        const baseBox = aspect === '1:1' ? 210 : 250;
        const boxW = baseBox * zoom;
        const boxH = baseBox * zoom;
        const bx = (w - boxW) / 2;
        const topBase = aspect === '1:1' ? 92 : 112;
        const by = topBase - (boxH - baseBox) / 2;
        ctx.save();
        ctx.globalAlpha = Math.min(1, sceneProgress * 4);
        drawRoundedRect(ctx, bx, by, boxW, boxH, 16);
        ctx.clip();
        ctx.drawImage(img, bx, by, boxW, boxH);
        ctx.restore();
      }

      // Brand header
      ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
      ctx.font = '700 20px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(businessName.toUpperCase(), w / 2, 62, w - 64);

      // Animated entrance fade & slide
      const enter = Math.min(1, sceneProgress * 4.5);
      const slideY = (1 - enter) * 22;

      ctx.save();
      ctx.globalAlpha = enter;

      // Badge
      const badgeText = scene.badge.toUpperCase();
      ctx.font = '700 17px "JetBrains Mono", monospace';
      const bw = Math.min(w - 80, ctx.measureText(badgeText).width + 36);
      const bx = (w - bw) / 2;
      const by = (hasVideoImg ? (aspect === '1:1' ? 326 : 395) : h * 0.34) + slideY;
      ctx.fillStyle = sceneIdx === 2 ? '#7C3AED' : '#2563EB';
      drawRoundedRect(ctx, bx, by, bw, 38, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badgeText, w / 2, by + 25, bw - 20);

      // Headline (scaled for 1:1 vs 9:16 to prevent bottom progress bar collision)
      const headFontSize = aspect === '1:1' && hasVideoImg ? 30 : 36;
      const headLineH = Math.round(headFontSize * 1.22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 ${headFontSize}px "Plus Jakarta Sans", "Noto Sans Devanagari", sans-serif`;
      const afterTitleY = drawCenteredWrappedText(
        ctx,
        scene.headline,
        w / 2,
        by + 84,
        w - 84,
        headLineH,
        3
      );

      // Subtitle
      const subFontSize = aspect === '1:1' && hasVideoImg ? 19 : 21;
      const subStartY = Math.min(h - 135, afterTitleY + 38);
      ctx.fillStyle = '#CBD5E1';
      ctx.font = `500 ${subFontSize}px "DM Sans", "Noto Sans Devanagari", sans-serif`;
      drawCenteredWrappedText(ctx, scene.subtitle, w / 2, subStartY, w - 96, 28, 3);

      ctx.restore();

      // Bottom Progress Bar across 4 scenes
      const barW = w - 80;
      const totalProg = loopMs / TOTAL_DURATION_MS;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.fillRect(40, h - 48, barW, 5);
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(40, h - 48, barW * totalProg, 5);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText(`${scene.sceneLabel} · MUSHRAY AI`, w / 2, h - 64, w - 80);
      ctx.textAlign = 'left';
    },
    [TOTAL_DURATION_MS, aspect, businessName, scenes]
  );

  useEffect(() => {
    let rafId = 0;
    const loop = (now: number) => {
      if (playing) {
        renderFrame(now - startTimeRef.current);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [playing, renderFrame]);

  async function handleGenerateVideoScript(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.generateMarketingContent({
        toolId: 'video-creator',
        language,
        businessName,
        productName,
        description,
        targetAudience,
        offerOrPrice,
      });
      const out = res.output;
      if (typeof out.reelTitle === 'string') setReelTitle(out.reelTitle);
      if (Array.isArray(out.scenes) && out.scenes.length > 0) {
        setScenes(out.scenes as VideoScene[]);
        startTimeRef.current = performance.now();
        setPlaying(true);
      }
      onQuotaUpdated(res.quota.used, res.quota.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video storyboard.');
    } finally {
      setLoading(false);
    }
  }

  function handleUploadImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        productImgRef.current = img;
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleExportWebm() {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      setError('Video recording is not supported in this browser.');
      return;
    }
    setError('');
    setRecording(true);
    startTimeRef.current = performance.now();
    setPlaying(true);

    try {
      const stream = canvas.captureStream(30);
      const preferredTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
      const supportedMime =
        typeof MediaRecorder.isTypeSupported === 'function'
          ? preferredTypes.find((t) => MediaRecorder.isTypeSupported(t))
          : undefined;
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const ext = supportedMime?.includes('mp4') ? 'mp4' : 'webm';

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: supportedMime || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mushray-promo-reel-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setRecording(false);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, Math.min(TOTAL_DURATION_MS, 11500));
    } catch {
      setError('इस ब्राउज़र में वीडियो एक्सपोर्ट शुरू नहीं हो सका। कृपया Chrome या Desktop ब्राउज़र का उपयोग करें।');
      setRecording(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <form
        onSubmit={handleGenerateVideoScript}
        className="xl:col-span-5 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-4"
      >
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            {uiLang === 'hi' ? 'AI प्रमोशनल वीडियो क्रिएटर' : 'AI Promotional Video Creator'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {uiLang === 'hi'
              ? 'अपने प्रोडक्ट से 4-सीन वाला एनिमेटेड प्रोमो रील बनाएं और WebM वीडियो डाउनलोड करें।'
              : 'Generate a 4-scene animated promotional reel and export as a playable WebM video.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
              className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            >
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Video Format</label>
            <select
              value={aspect}
              onChange={(e) => setAspect(e.target.value as '9:16' | '1:1')}
              className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            >
              <option value="9:16">9:16 Reels / Shorts</option>
              <option value="1:1">1:1 Square Feed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business Name"
            className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Product Name"
            className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
        </div>

        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Key benefits or features..."
          className="w-full px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={offerOrPrice}
            onChange={(e) => setOfferOrPrice(e.target.value)}
            placeholder="Offer / Price"
            className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="Target Audience"
            className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
          />
        </div>

        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#070A15] border border-slate-700 hover:border-blue-500 text-xs text-slate-200 cursor-pointer">
          <ImagePlus className="h-4 w-4 text-blue-400" />
          {uiLang === 'hi' ? 'वीडियो में प्रोडक्ट फोटो जोड़ें' : 'Add Product Photo to Video'}
          <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
        </label>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading
            ? uiLang === 'hi'
              ? 'AI वीडियो स्क्रिप्ट बन रही है...'
              : 'Generating 4-Scene Reel...'
            : uiLang === 'hi'
            ? 'AI से प्रोमो वीडियो बनाएं'
            : 'Generate AI Promo Video'}
        </button>

        {/* Scene Script List */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="text-xs font-semibold text-slate-300">{reelTitle}</div>
          {scenes.map((s, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-[#070A15] border border-slate-800/80 text-xs">
              <div className="font-mono-num text-blue-400 text-[11px]">{s.sceneLabel}</div>
              <div className="font-semibold text-white">{s.headline}</div>
              <div className="text-slate-400 mt-0.5">VO: {s.voiceover}</div>
            </div>
          ))}
        </div>
      </form>

      {/* Right Live Player & Export */}
      <div className="xl:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 flex flex-col items-center">
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Film className="h-4 w-4 text-violet-400" />
            <span>{uiLang === 'hi' ? 'लाइव वीडियो प्रिव्यू' : 'Live Motion Reel Preview'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#070A15] border border-slate-700 text-white"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => {
                startTimeRef.current = performance.now();
                setPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#070A15] border border-slate-700 text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
            <button
              type="button"
              disabled={recording}
              onClick={handleExportWebm}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-60"
            >
              {recording ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {recording
                ? uiLang === 'hi'
                  ? 'रिकॉर्ड हो रहा है...'
                  : 'Recording (11s)...'
                : uiLang === 'hi'
                ? 'वीडियो डाउनलोड (.webm)'
                : 'Export Video (.webm)'}
            </button>
          </div>
        </div>

        <div className="w-full flex items-center justify-center bg-[#060811] rounded-xl p-4 border border-slate-800/70">
          <canvas ref={canvasRef} className="max-w-full max-h-[560px] h-auto rounded-lg shadow-2xl" />
        </div>
      </div>
    </div>
  );
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  let cy = y;
  for (const l of lines.slice(0, maxLines)) {
    ctx.fillText(l, cx, cy, maxWidth);
    cy += lineHeight;
  }
  return cy - lineHeight;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
