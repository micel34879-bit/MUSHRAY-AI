import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, Copy, Download, ImagePlus, Loader2, Scissors, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { copyTextToClipboard } from '../lib/clipboard';
import type { ContentLanguage, UiLanguage, UserProfile } from '../types/mushray';

interface BackgroundRemoverStudioProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
}

type StudioBackdrop = 'transparent' | 'white' | 'royal' | 'obsidian';

export function BackgroundRemoverStudio({ uiLang, user }: BackgroundRemoverStudioProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMime, setSourceMime] = useState('image/png');
  const [tolerance, setTolerance] = useState(42);
  const [feather, setFeather] = useState(14);
  const [backdrop, setBackdrop] = useState<StudioBackdrop>('transparent');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [productName, setProductName] = useState('');
  const [language, setLanguage] = useState<ContentLanguage>(user?.defaultContentLanguage ?? 'hinglish');

  const [analyzing, setAnalyzing] = useState(false);
  const [copiedAnalysis, setCopiedAnalysis] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<{
    productType: string;
    lightingFeedback: string;
    recommendedBackground: string;
    ecommerceTitle: string;
    shortCaption: string;
  } | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const processCanvas = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return;

    const maxDim = 900;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // Sample 4 corners to estimate dominant backdrop color
    const corners = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
    ];
    let avgR = 0;
    let avgG = 0;
    let avgB = 0;
    for (const idx of corners) {
      avgR += data[idx];
      avgG += data[idx + 1];
      avgB += data[idx + 2];
    }
    avgR /= corners.length;
    avgG /= corners.length;
    avgB /= corners.length;

    const tol = tolerance * 2.2;
    const softBand = Math.max(1, feather * 2.2);

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - avgR;
      const dg = data[i + 1] - avgG;
      const db = data[i + 2] - avgB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= tol) {
        data[i + 3] = 0;
      } else if (dist < tol + softBand) {
        const factor = (dist - tol) / softBand;
        data[i + 3] = Math.round(data[i + 3] * factor);
      }
    }

    // Put isolated foreground onto temporary canvas
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = w;
    fgCanvas.height = h;
    const fgCtx = fgCanvas.getContext('2d');
    if (!fgCtx) return;
    fgCtx.putImageData(imageData, 0, 0);

    // Draw chosen studio background
    ctx.clearRect(0, 0, w, h);
    if (backdrop === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
    } else if (backdrop === 'royal') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1D4ED8');
      grad.addColorStop(1, '#6D28D9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (backdrop === 'obsidian') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090D1A');
      grad.addColorStop(1, '#111827');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.drawImage(fgCanvas, 0, 0);
  }, [backdrop, feather, tolerance]);

  useEffect(() => {
    processCanvas();
  }, [processCanvas]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setAnalysis(null);
    setSourceMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setSourceUrl(url);
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        processCanvas();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyzeWithAi() {
    if (!sourceUrl) return;
    setAnalyzing(true);
    setError('');
    try {
      const base64 = sourceUrl.split(',')[1] ?? '';
      const res = await api.analyzeProductImage({
        imageBase64: base64,
        mimeType: sourceMime,
        businessName,
        productName,
        language,
      });
      setAnalysis(res.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `mushray-cutout-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleCopyAnalysis() {
    if (!analysis) return;
    const ok = await copyTextToClipboard(`${analysis.ecommerceTitle}\n\n${analysis.shortCaption}`);
    if (ok) {
      setCopiedAnalysis(true);
      setTimeout(() => setCopiedAnalysis(false), 1800);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Controls */}
      <div className="xl:col-span-5 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            {uiLang === 'hi' ? 'AI प्रोडक्ट फोटो बैकग्राउंड रिमूवर' : 'AI Product Photo Background Remover'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {uiLang === 'hi'
              ? 'सफेद या सिंगल-कलर बैकग्राउंड वाली प्रोडक्ट फोटो अपलोड करें, बैकग्राउंड हटाएं और AI कैटलॉग सुझाव पाएं।'
              : 'Upload a product photo to isolate the subject onto transparent or studio backdrops and generate AI catalog copy.'}
          </p>
        </div>

        <label className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-slate-700 hover:border-blue-500 bg-[#070A15] cursor-pointer transition-colors text-center">
          <ImagePlus className="h-7 w-7 text-blue-400 mb-2" />
          <span className="text-sm font-medium text-white">
            {sourceUrl
              ? uiLang === 'hi'
                ? 'दूसरी फोटो चुनें'
                : 'Upload Another Product Photo'
              : uiLang === 'hi'
              ? 'प्रोडक्ट फोटो अपलोड करें (PNG / JPG)'
              : 'Upload Product Photo (PNG / JPG)'}
          </span>
          <span className="text-xs text-slate-500 mt-1">Best results with clean solid backgrounds</span>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>{uiLang === 'hi' ? 'बैकग्राउंड संवेदनशीलता (Tolerance)' : 'Background Tolerance'}</span>
              <span className="font-mono-num text-blue-400">{tolerance}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span>{uiLang === 'hi' ? 'एज स्मूथिंग (Edge Feather)' : 'Edge Feathering'}</span>
              <span className="font-mono-num text-violet-400">{feather}</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              value={feather}
              onChange={(e) => setFeather(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-2">
              {uiLang === 'hi' ? 'नया स्टूडियो बैकग्राउंड चुनें' : 'Replacement Backdrop'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'transparent', label: 'Transparent PNG' },
                  { id: 'white', label: 'Studio White' },
                  { id: 'royal', label: 'Royal Blue-Violet' },
                  { id: 'obsidian', label: 'Obsidian Dark' },
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackdrop(bg.id)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    backdrop === bg.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#070A15] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business Name"
              className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            />
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product Name"
              className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
              className="px-3 py-2 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
            >
              <option value="hinglish">Hinglish</option>
              <option value="hi">Hindi</option>
              <option value="en">English</option>
            </select>
            <button
              type="button"
              disabled={!sourceUrl || analyzing}
              onClick={handleAnalyzeWithAi}
              className="flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {uiLang === 'hi' ? 'AI फोटो विश्लेषण करें' : 'Analyze Photo with AI'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">{error}</div>
        )}
      </div>

      {/* Preview + AI Catalog Result */}
      <div className="xl:col-span-7 space-y-5">
        <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-xs font-medium text-slate-400">
              {uiLang === 'hi' ? 'कटआउट प्रिव्यू' : 'Cutout & Studio Backdrop Preview'}
            </span>
            <button
              type="button"
              disabled={!sourceUrl}
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              {uiLang === 'hi' ? 'PNG डाउनलोड करें' : 'Download PNG'}
            </button>
          </div>

          <div className="studio-checkerboard rounded-xl border border-slate-800 min-h-[340px] flex items-center justify-center p-4">
            {sourceUrl ? (
              <canvas ref={canvasRef} className="max-w-full max-h-[420px] h-auto rounded-lg" />
            ) : (
              <div className="text-center text-slate-400 space-y-2 py-12">
                <Scissors className="h-8 w-8 mx-auto text-slate-500" />
                <div className="text-sm font-medium text-slate-300">
                  {uiLang === 'hi' ? 'शुरू करने के लिए ऊपर प्रोडक्ट फोटो अपलोड करें' : 'Upload a product photo to preview background removal'}
                </div>
              </div>
            )}
          </div>
        </div>

        {analysis && (
          <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-blue-400">
                AI Studio Analysis · {analysis.productType}
              </div>
              <button
                type="button"
                onClick={handleCopyAnalysis}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 bg-[#121A30] border border-slate-700/80 hover:text-white hover:border-blue-500/50 whitespace-nowrap"
              >
                {copiedAnalysis ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedAnalysis ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="text-sm font-semibold text-white">{analysis.ecommerceTitle}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{analysis.shortCaption}</p>
            <div className="pt-2 border-t border-slate-800/70 text-xs text-slate-400">
              <span className="font-semibold text-violet-300">Lighting & Studio Tip: </span>
              {analysis.lightingFeedback} (Recommended: {analysis.recommendedBackground})
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
