import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'mushray-store.json');

const SESSION_COOKIE = 'mushray_session';
const GUEST_COOKIE = 'mushray_guest';
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'CHANGE_ME_TO_A_RANDOM_64_CHAR_HEX_STRING'
    ? process.env.SESSION_SECRET
    : crypto.createHash('sha256').update(`mushray-dev-${process.cwd()}`).digest('hex');

type PlanId = 'free' | 'pro' | 'premium';
type ContentLanguage = 'en' | 'hi' | 'hinglish';

interface DbUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  businessName: string;
  businessCategory: string;
  defaultAudience: string;
  phone: string;
  city: string;
  uiLanguage: 'en' | 'hi';
  defaultContentLanguage: ContentLanguage;
  planId: PlanId;
  usageThisMonth: number;
  usageMonthKey: string;
  createdAt: string;
}

interface DbProject {
  id: string;
  userId: string;
  toolId: string;
  title: string;
  language: ContentLanguage;
  businessName: string;
  productName: string;
  inputBrief: Record<string, unknown>;
  outputData: Record<string, unknown>;
  previewImageDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface DbPayment {
  id: string;
  userId: string;
  planId: PlanId;
  amountInr: number;
  currency: string;
  gateway: string;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
}

interface StoreShape {
  users: DbUser[];
  projects: DbProject[];
  payments: DbPayment[];
  guestUsage: Record<string, { monthKey: string; count: number }>;
}

const PLAN_LIMITS: Record<PlanId, number | null> = {
  free: 25,
  pro: 250,
  premium: null,
};

const PLAN_PRICES_INR: Record<PlanId, number> = {
  free: 0,
  pro: 199,
  premium: 299,
};

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

let storeCache: StoreShape | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureStore(): Promise<StoreShape> {
  if (storeCache) return storeCache;
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreShape = { users: [], projects: [], payments: [], guestUsage: {} };
    await fsp.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    storeCache = initial;
    return storeCache;
  }
  try {
    const raw = await fsp.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    storeCache = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      guestUsage: parsed.guestUsage && typeof parsed.guestUsage === 'object' ? parsed.guestUsage : {},
    };
  } catch {
    storeCache = { users: [], projects: [], payments: [], guestUsage: {} };
  }
  return storeCache;
}

function persistStore(store: StoreShape): Promise<void> {
  storeCache = store;
  const payload = JSON.stringify(store, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmpPath = `${STORE_PATH}.tmp`;
    await fsp.writeFile(tmpPath, payload, 'utf8');
    await fsp.rename(tmpPath, STORE_PATH);
  });
  return writeQueue;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function signToken(payload: Record<string, unknown>, ttlSeconds = 60 * 60 * 24 * 30): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: nowSec, exp: nowSec + ttlSeconds };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken<T extends Record<string, unknown>>(token: string | undefined): T | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T & { exp?: number };
    if (typeof parsed.exp === 'number' && Math.floor(Date.now() / 1000) > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function setCookie(
  req: Request,
  res: Response,
  name: string,
  value: string,
  maxAgeSeconds = 60 * 60 * 24 * 30
) {
  const https = isHttpsRequest(req);
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    https ? 'SameSite=None' : 'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (https || IS_PROD) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function clearCookie(req: Request, res: Response, name: string) {
  const https = isHttpsRequest(req);
  const parts = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    https ? 'SameSite=None' : 'SameSite=Lax',
    'Max-Age=0',
  ];
  if (https || IS_PROD) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

function sanitizeUser(user: DbUser) {
  const monthKey = currentMonthKey();
  const usageThisMonth = user.usageMonthKey === monthKey ? user.usageThisMonth : 0;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    businessCategory: user.businessCategory,
    defaultAudience: user.defaultAudience,
    phone: user.phone,
    city: user.city,
    uiLanguage: user.uiLanguage,
    defaultContentLanguage: user.defaultContentLanguage,
    planId: user.planId,
    usageThisMonth,
    usageLimit: PLAN_LIMITS[user.planId],
    usageMonthKey: monthKey,
    createdAt: user.createdAt,
  };
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is missing. Please configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PRIMARY_AI_MODEL = 'gemini-4-hydrogen';
const FALLBACK_AI_MODEL = 'gemini-3.1-flash-lite';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorInfo(err: unknown): { status: number; message: string } {
  const anyErr = err as { status?: number; code?: number; message?: string };
  const rawMessage = anyErr?.message ? String(anyErr.message) : String(err ?? '');
  let status = Number(anyErr?.status ?? anyErr?.code ?? 0);

  if (!status) {
    if (rawMessage.includes('"code":503') || rawMessage.includes('503') || rawMessage.includes('UNAVAILABLE')) {
      status = 503;
    } else if (rawMessage.includes('"code":429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
      status = 429;
    } else if (rawMessage.includes('"code":404') || rawMessage.includes('NOT_FOUND')) {
      status = 404;
    } else if (rawMessage.includes('"code":403') || rawMessage.includes('PERMISSION_DENIED')) {
      status = 403;
    } else if (rawMessage.includes('"code":400') || rawMessage.includes('API_KEY_INVALID')) {
      status = 400;
    }
  }
  return { status, message: rawMessage };
}

function isRetryableError(err: unknown): boolean {
  const { status, message } = getErrorInfo(err);
  const upper = message.toUpperCase();
  return (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    status === 429 ||
    upper.includes('UNAVAILABLE') ||
    upper.includes('HIGH DEMAND') ||
    upper.includes('TEMPORARILY') ||
    upper.includes('OVERLOADED') ||
    upper.includes('ECONNRESET') ||
    upper.includes('ETIMEDOUT')
  );
}

function isModelUnavailableForFallback(err: unknown): boolean {
  const { status, message } = getErrorInfo(err);
  return isRetryableError(err) || status === 404 || message.toUpperCase().includes('NOT_FOUND');
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`503 UNAVAILABLE: ${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithRetryAndFallback(params: {
  ai: GoogleGenAI;
  contents: unknown;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: unknown;
}) {
  const models: { name: string; useLowThinking: boolean; timeoutMs: number; maxAttempts: number }[] = [
    { name: PRIMARY_AI_MODEL, useLowThinking: true, timeoutMs: 8000, maxAttempts: 2 },
    { name: FALLBACK_AI_MODEL, useLowThinking: false, timeoutMs: 18000, maxAttempts: 2 },
  ];

  let lastError: unknown = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const candidate = models[mIdx];
    const maxAttemptsPerModel = candidate.maxAttempts;

    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const config: Record<string, unknown> = {};
        if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
        if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
        if (params.responseSchema) config.responseSchema = params.responseSchema;
        if (candidate.useLowThinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await withTimeout(
          params.ai.models.generateContent({
            model: candidate.name,
            contents: params.contents as never,
            config: config as never,
          }),
          candidate.timeoutMs,
          candidate.name
        );

        return { response, modelUsed: candidate.name };
      } catch (err) {
        lastError = err;
        const info = getErrorInfo(err);
        const timedOut = info.message.includes('timed out after');
        console.warn(
          `[MUSHRAY AI] Model "${candidate.name}" attempt ${attempt}/${maxAttemptsPerModel} failed (status=${info.status}): ${info.message.slice(0, 180)}`
        );

        // Retry same model quickly only if it failed fast (e.g. instant 503), not after a timeout
        if (!timedOut && isRetryableError(err) && attempt < maxAttemptsPerModel) {
          await sleep(800 * attempt);
          continue;
        }

        if (isModelUnavailableForFallback(err) && mIdx < models.length - 1) {
          await sleep(250);
          break; // Move promptly to fallback model
        }

        throw err;
      }
    }
  }

  throw lastError ?? new Error('AI service unavailable');
}

function sendAiErrorResponse(res: Response, err: unknown, fallbackMessage: string) {
  const { status, message } = getErrorInfo(err);
  const upper = message.toUpperCase();

  if (status === 503 || upper.includes('UNAVAILABLE') || upper.includes('HIGH DEMAND')) {
    res.status(503).json({
      code: 'AI_UNAVAILABLE',
      error:
        'अभी AI सर्वर पर बहुत ज़्यादा ट्रैफ़िक है (Error 503: Service Temporarily Unavailable)। हमने ऑटोमैटिक री-ट्राई और बैकअप मॉडल भी आज़माया, लेकिन सेवा अभी व्यस्त है। कृपया 10-15 सेकंड बाद दोबारा कोशिश करें।',
    });
    return;
  }

  if (status === 429 || upper.includes('RESOURCE_EXHAUSTED')) {
    res.status(429).json({
      code: 'AI_RATE_LIMIT',
      error:
        'AI API की वर्तमान रिक्वेस्ट लिमिट पूरी हो गई है (429)। कृपया कुछ सेकंड रुककर दोबारा प्रयास करें।',
    });
    return;
  }

  if (status === 403 || upper.includes('API_KEY_INVALID') || upper.includes('GEMINI_API_KEY')) {
    res.status(403).json({
      code: 'AI_KEY_ERROR',
      error:
        'Gemini API Key अमान्य या सेट नहीं है। कृपया Settings > Secrets में जाकर अपनी API Key जाँचें।',
    });
    return;
  }

  res.status(500).json({
    code: 'AI_ERROR',
    error: message || fallbackMessage,
  });
}

function languageInstruction(lang: ContentLanguage): string {
  if (lang === 'hi') {
    return 'Write all marketing copy, headlines, captions, bullets, and CTAs in natural, clear, persuasive Hindi (Devanagari script, e.g. नमस्ते, शानदार ऑफर). Keep hashtags and technical brand terms crisp.';
  }
  if (lang === 'hinglish') {
    return 'Write all marketing copy in natural, relatable Indian Hinglish (Hindi words written in Roman English mixed with simple English, e.g., "Aaj hi order karein aur paayein flat 20% off!").';
  }
  return 'Write all marketing copy in clear, high-converting, beginner-friendly English tailored for modern digital commerce.';
}

function safeParseAiJson(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(unfenced) as Record<string, unknown>;
  } catch {
    const firstBrace = unfenced.indexOf('{');
    const lastBrace = unfenced.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(unfenced.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
    }
    throw new Error('503 UNAVAILABLE: AI response format was incomplete, retrying');
  }
}

function enforceExactOfferAccuracy(
  data: Record<string, unknown>,
  offerOrPrice: string,
  toolId: string
): Record<string, unknown> {
  const cleanOffer = offerOrPrice.trim();
  if (!cleanOffer) return data;

  const percentMatches = cleanOffer.match(/\d+(?:\.\d+)?\s*%/g);
  const primaryPercent = percentMatches?.[0]?.replace(/\s+/g, '');

  const normalizeValue = (val: unknown): unknown => {
    if (typeof val === 'string') {
      if (primaryPercent) {
        return val.replace(/\d+(?:\.\d+)?\s*%/g, primaryPercent);
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(normalizeValue);
    }
    if (val && typeof val === 'object') {
      const nextObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        nextObj[k] = normalizeValue(v);
      }
      return nextObj;
    }
    return val;
  };

  const normalized = normalizeValue(data) as Record<string, unknown>;

  if (toolId === 'poster-maker' || toolId === 'festival-poster') {
    const badge = typeof normalized.offerBadge === 'string' ? normalized.offerBadge.trim() : '';
    const hasExactPercent = primaryPercent ? badge.includes(primaryPercent) : true;
    const priceMatch = cleanOffer.match(/(?:₹|Rs\.?|INR)\s*\d[\d,]*/i)?.[0];
    const hasExactPrice = priceMatch ? badge.toLowerCase().includes(priceMatch.toLowerCase().replace(/\s+/g, '')) || badge.includes(priceMatch.replace(/[^\d]/g, '')) : true;

    if (!badge || !hasExactPercent || !hasExactPrice) {
      normalized.offerBadge = cleanOffer.slice(0, 26).toUpperCase();
    }
  }

  return normalized;
}

function getToolGenerationSpec(toolId: string) {
  switch (toolId) {
    case 'social-post':
      return {
        role: 'You are an expert Indian SMB social media strategist for MUSHRAY AI.',
        task: 'Create a complete high-converting social media campaign post with a scroll-stopping hook, engaging body copy, clear call-to-action, 8 relevant hashtags, best posting window, and visual design direction.',
        schema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            hook: { type: Type.STRING },
            body: { type: Type.STRING },
            cta: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestTime: { type: Type.STRING },
            visualIdea: { type: Type.STRING },
          },
          required: ['headline', 'hook', 'body', 'cta', 'hashtags', 'bestTime', 'visualIdea'],
        },
      };
    case 'instagram-caption':
      return {
        role: 'You are an Instagram growth copywriter specializing in reels, carousels, and D2C brands.',
        task: 'Generate 3 distinct Instagram captions (1: Story-driven, 2: Short & Punchy, 3: Sales/Offer Conversion), plus 12 targeted hashtags.',
        schema: {
          type: Type.OBJECT,
          properties: {
            storyCaption: { type: Type.STRING },
            shortCaption: { type: Type.STRING },
            salesCaption: { type: Type.STRING },
            firstCommentPrompt: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['storyCaption', 'shortCaption', 'salesCaption', 'firstCommentPrompt', 'hashtags'],
        },
      };
    case 'facebook-post':
      return {
        role: 'You are a local business & Facebook community marketing expert.',
        task: 'Generate 3 Facebook post formats: a local offer announcement, a trust-building customer story post, and an interactive community poll question with 3 poll options.',
        schema: {
          type: Type.OBJECT,
          properties: {
            offerPost: { type: Type.STRING },
            communityPost: { type: Type.STRING },
            pollQuestion: { type: Type.STRING },
            pollOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedCtaButton: { type: Type.STRING },
          },
          required: ['offerPost', 'communityPost', 'pollQuestion', 'pollOptions', 'recommendedCtaButton'],
        },
      };
    case 'poster-maker':
    case 'festival-poster':
      return {
        role: 'You are a senior retail poster copywriter and creative director.',
        task: 'Create punchy, ultra-concise text designed to fit cleanly on a promotional poster or festival banner: short headline (max 6 words), subheadline (max 10 words), offer badge (max 4 words), 3 short bullet highlights (max 5 words each), and a short CTA button label (max 4 words).',
        schema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            subheadline: { type: Type.STRING },
            offerBadge: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            ctaText: { type: Type.STRING },
            tagline: { type: Type.STRING },
          },
          required: ['headline', 'subheadline', 'offerBadge', 'highlights', 'ctaText', 'tagline'],
        },
      };
    case 'ad-script':
      return {
        role: 'You are a direct-response video ad scriptwriter for Instagram Reels, YouTube Shorts, and Meta Ads.',
        task: 'Write a 20-30 second promotional video ad script broken into 4 timed scenes (Hook, Problem, Solution/Product, Offer & CTA) with visual direction, on-screen text, and spoken voiceover.',
        schema: {
          type: Type.OBJECT,
          properties: {
            adTitle: { type: Type.STRING },
            durationSeconds: { type: Type.STRING },
            targetHookAngle: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeRange: { type: Type.STRING },
                  visualAction: { type: Type.STRING },
                  onScreenText: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                },
                required: ['timeRange', 'visualAction', 'onScreenText', 'voiceover'],
              },
            },
          },
          required: ['adTitle', 'durationSeconds', 'targetHookAngle', 'scenes'],
        },
      };
    case 'whatsapp-marketing':
      return {
        role: 'You are a WhatsApp Business marketing specialist helping local shops convert repeat customers.',
        task: 'Generate a ready-to-send WhatsApp broadcast message using clean WhatsApp formatting (*bold* and bullet points), plus a shorter follow-up reminder message and a quick-reply CTA line.',
        schema: {
          type: Type.OBJECT,
          properties: {
            broadcastMessage: { type: Type.STRING },
            followUpMessage: { type: Type.STRING },
            quickReplyCta: { type: Type.STRING },
            broadcastTip: { type: Type.STRING },
          },
          required: ['broadcastMessage', 'followUpMessage', 'quickReplyCta', 'broadcastTip'],
        },
      };
    case 'product-description':
      return {
        role: 'You are an e-commerce conversion copywriter for Amazon, Flipkart, Meesho, and Shopify stores.',
        task: 'Write an SEO-optimized product title, a persuasive 2-paragraph product description, 5 scannable benefit bullet points, and 8 high-intent search keywords.',
        schema: {
          type: Type.OBJECT,
          properties: {
            seoTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            searchKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['seoTitle', 'description', 'bulletPoints', 'searchKeywords'],
        },
      };
    case 'video-creator':
      return {
        role: 'You are a motion-reel creative director for short-form promotional videos.',
        task: 'Create exactly 4 ultra-punchy animated video scenes (1: Attention Hook, 2: Product Showcase, 3: Special Offer/Value, 4: Call to Action) where each scene has a short bold title (max 5 words), subtitle (max 9 words), badge text (max 3 words), and narration script.',
        schema: {
          type: Type.OBJECT,
          properties: {
            reelTitle: { type: Type.STRING },
            musicMood: { type: Type.STRING },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sceneLabel: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  badge: { type: Type.STRING },
                  voiceover: { type: Type.STRING },
                },
                required: ['sceneLabel', 'headline', 'subtitle', 'badge', 'voiceover'],
              },
            },
          },
          required: ['reelTitle', 'musicMood', 'scenes'],
        },
      };
    case 'brand-logo':
      return {
        role: 'You are a brand naming and visual identity strategist.',
        task: 'Generate 6 memorable business name ideas with taglines, 2-letter monogram initials, suggested Instagram handles, and brand positioning notes, plus a recommended primary and accent hex color pair.',
        schema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  initials: { type: Type.STRING },
                  tagline: { type: Type.STRING },
                  handle: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  primaryHex: { type: Type.STRING },
                  accentHex: { type: Type.STRING },
                },
                required: ['name', 'initials', 'tagline', 'handle', 'rationale', 'primaryHex', 'accentHex'],
              },
            },
          },
          required: ['ideas'],
        },
      };
    case 'marketing-strategy':
      return {
        role: 'You are a senior startup growth & small-business marketing consultant.',
        task: 'Create a practical 30-day marketing strategy containing target audience persona summary, 4 weekly execution phases, recommended channel mix with INR percentage allocation, and 4 measurable KPIs.',
        schema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            audiencePersona: { type: Type.STRING },
            weeklyRoadmap: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  week: { type: Type.STRING },
                  focus: { type: Type.STRING },
                  actions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['week', 'focus', 'actions'],
              },
            },
            channelMix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  channel: { type: Type.STRING },
                  allocationPercent: { type: Type.STRING },
                  tactic: { type: Type.STRING },
                },
                required: ['channel', 'allocationPercent', 'tactic'],
              },
            },
            kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['executiveSummary', 'audiencePersona', 'weeklyRoadmap', 'channelMix', 'kpis'],
        },
      };
    default:
      return null;
  }
}

async function resolveActor(req: Request, res: Response) {
  const store = await ensureStore();
  const cookies = parseCookies(req);
  const authHeader = req.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : undefined;

  const sessionPayload = verifyToken<{ uid: string }>(bearerToken || cookies[SESSION_COOKIE]);
  if (sessionPayload?.uid) {
    const user = store.users.find((u) => u.id === sessionPayload.uid);
    if (user) {
      return { store, user, guestId: null as string | null, guestToken: null as string | null };
    }
  }

  const guestHeader =
    typeof req.headers['x-guest-token'] === 'string' ? req.headers['x-guest-token'] : undefined;
  const guestPayload = verifyToken<{ gid: string }>(guestHeader || cookies[GUEST_COOKIE]);
  let guestId = guestPayload?.gid ?? null;
  let guestToken = guestHeader || cookies[GUEST_COOKIE] || null;
  if (!guestId) {
    guestId = `guest_${crypto.randomBytes(10).toString('hex')}`;
    guestToken = signToken({ gid: guestId });
    setCookie(req, res, GUEST_COOKIE, guestToken, 60 * 60 * 24 * 30);
  }
  return { store, user: null as DbUser | null, guestId, guestToken };
}

async function main() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '12mb' }));

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'mushray-ai', timestamp: new Date().toISOString() });
  });

  // Auth: Get current session & quota
  app.get('/api/auth/me', async (req, res) => {
    const { store, user, guestId, guestToken } = await resolveActor(req, res);
    const monthKey = currentMonthKey();
    if (user) {
      res.json({ authenticated: true, user: sanitizeUser(user) });
      return;
    }
    const guestEntry = guestId ? store.guestUsage[guestId] : undefined;
    const guestCount = guestEntry && guestEntry.monthKey === monthKey ? guestEntry.count : 0;
    res.json({
      authenticated: false,
      user: null,
      guestToken,
      guestQuota: { used: guestCount, limit: 10, monthKey },
    });
  });

  // Auth: Register
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, businessName, businessCategory } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const store = await ensureStore();
    const normalizedEmail = email.trim().toLowerCase();
    if (store.users.some((u) => u.email === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const newUser: DbUser = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      name: name.trim().slice(0, 80),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      businessName: typeof businessName === 'string' && businessName.trim() ? businessName.trim().slice(0, 100) : 'My Business',
      businessCategory: typeof businessCategory === 'string' && businessCategory.trim() ? businessCategory.trim().slice(0, 80) : 'Retail & Local Commerce',
      defaultAudience: 'Local shoppers and online buyers aged 18-45',
      phone: '',
      city: '',
      uiLanguage: 'en',
      defaultContentLanguage: 'hinglish',
      planId: 'free',
      usageThisMonth: 0,
      usageMonthKey: currentMonthKey(),
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    await persistStore(store);

    const sessionToken = signToken({ uid: newUser.id });
    setCookie(req, res, SESSION_COOKIE, sessionToken);
    res.status(201).json({ user: sanitizeUser(newUser), sessionToken });
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const store = await ensureStore();
    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find((u) => u.email === normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const sessionToken = signToken({ uid: user.id });
    setCookie(req, res, SESSION_COOKIE, sessionToken);
    res.json({ user: sanitizeUser(user), sessionToken });
  });

  // Auth: Logout
  app.post('/api/auth/logout', (req, res) => {
    clearCookie(req, res, SESSION_COOKIE);
    res.json({ ok: true });
  });

  // Profile & Settings update
  app.put('/api/profile', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to save your profile and business settings.' });
      return;
    }
    const body = req.body ?? {};
    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim().slice(0, 80);
    if (typeof body.businessName === 'string') user.businessName = body.businessName.trim().slice(0, 100);
    if (typeof body.businessCategory === 'string') user.businessCategory = body.businessCategory.trim().slice(0, 80);
    if (typeof body.defaultAudience === 'string') user.defaultAudience = body.defaultAudience.trim().slice(0, 200);
    if (typeof body.phone === 'string') user.phone = body.phone.trim().slice(0, 30);
    if (typeof body.city === 'string') user.city = body.city.trim().slice(0, 60);
    if (body.uiLanguage === 'en' || body.uiLanguage === 'hi') user.uiLanguage = body.uiLanguage;
    if (body.defaultContentLanguage === 'en' || body.defaultContentLanguage === 'hi' || body.defaultContentLanguage === 'hinglish') {
      user.defaultContentLanguage = body.defaultContentLanguage;
    }

    await persistStore(store);
    res.json({ user: sanitizeUser(user) });
  });

  // AI Marketing Content Generation (All text & structured tool studios)
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { store, user, guestId } = await resolveActor(req, res);
      const monthKey = currentMonthKey();

      // Check monthly usage limit
      if (user) {
        if (user.usageMonthKey !== monthKey) {
          user.usageMonthKey = monthKey;
          user.usageThisMonth = 0;
        }
        const limit = PLAN_LIMITS[user.planId];
        if (limit !== null && user.usageThisMonth >= limit) {
          res.status(429).json({
            error: `Monthly limit reached (${limit} generations on ${user.planId.toUpperCase()} plan). Upgrade your plan for higher limits.`,
          });
          return;
        }
      } else if (guestId) {
        const entry = store.guestUsage[guestId] ?? { monthKey, count: 0 };
        const used = entry.monthKey === monthKey ? entry.count : 0;
        if (used >= 10) {
          res.status(429).json({
            error: 'Free guest preview limit reached (10/10). Please create a free MUSHRAY AI account to get 25 monthly generations.',
          });
          return;
        }
      }

      const {
        toolId,
        language = 'hinglish',
        businessName = '',
        productName = '',
        description = '',
        targetAudience = '',
        offerOrPrice = '',
        tone = 'Trustworthy & energetic',
        festivalName = '',
        platform = 'Instagram & Facebook',
      } = req.body ?? {};

      const spec = getToolGenerationSpec(String(toolId));
      if (!spec) {
        res.status(400).json({ error: 'Unsupported AI tool selected.' });
        return;
      }

      if (!String(businessName).trim() || !String(productName).trim()) {
        res.status(400).json({ error: 'Business Name and Product / Service Name are required.' });
        return;
      }

      const contentLang: ContentLanguage =
        language === 'hi' || language === 'hinglish' ? language : 'en';

      const cleanOffer = String(offerOrPrice || '').trim();
      const prompt = [
        `Business Name: ${String(businessName).trim()}`,
        `Product / Service: ${String(productName).trim()}`,
        `Details & Benefits: ${String(description || 'High quality product with great customer value').trim()}`,
        `Target Audience: ${String(targetAudience || 'Indian shoppers and local buyers').trim()}`,
        cleanOffer ? `Offer / Price (EXACT — preserve exact percentage/price verbatim): ${cleanOffer}` : '',
        festivalName ? `Festival / Occasion: ${String(festivalName).trim()}` : '',
        `Preferred Platform: ${String(platform).trim()}`,
        `Tone: ${String(tone).trim()}`,
        languageInstruction(contentLang),
      ]
        .filter(Boolean)
        .join('\n');

      const offerAccuracyRule = cleanOffer
        ? `\nSTRICT OFFER ACCURACY RULE: The user specified the exact offer/price "${cleanOffer}". Use this EXACT discount percentage or price everywhere you mention an offer. NEVER change, round, or invent a different discount number (for example, if 20% is specified, keep 20% everywhere and never write 25% or 50%).`
        : '';

      const ai = getAiClient();
      const { response, modelUsed } = await generateWithRetryAndFallback({
        ai,
        contents: prompt,
        systemInstruction: `${spec.role}\n${spec.task}\nKeep content practical, authentic, non-spammy, and tailored for small businesses, creators, and online sellers.${offerAccuracyRule}`,
        responseMimeType: 'application/json',
        responseSchema: spec.schema,
      });

      const rawText = (response.text ?? '{}').trim();
      const parsedOutput = safeParseAiJson(rawText);
      const outputData = enforceExactOfferAccuracy(parsedOutput, cleanOffer, String(toolId));

      // Increment usage counter after successful AI generation
      let quotaInfo: { used: number; limit: number | null; monthKey: string };
      if (user) {
        user.usageThisMonth += 1;
        user.usageMonthKey = monthKey;
        quotaInfo = {
          used: user.usageThisMonth,
          limit: PLAN_LIMITS[user.planId],
          monthKey,
        };
      } else if (guestId) {
        const prev = store.guestUsage[guestId];
        const nextCount = prev && prev.monthKey === monthKey ? prev.count + 1 : 1;
        store.guestUsage[guestId] = { monthKey, count: nextCount };
        quotaInfo = { used: nextCount, limit: 10, monthKey };
      } else {
        quotaInfo = { used: 1, limit: 10, monthKey };
      }
      await persistStore(store);

      res.json({ output: outputData, quota: quotaInfo, modelUsed });
    } catch (err) {
      console.error('AI generation error:', err);
      sendAiErrorResponse(res, err, 'AI कंटेंट जनरेट करने में समस्या आई। कृपया फिर से प्रयास करें।');
    }
  });

  // AI Image Analysis for Background Remover Studio (Gemini multimodal vision)
  app.post('/api/ai/analyze-image', async (req, res) => {
    try {
      await resolveActor(req, res);
      const { imageBase64, mimeType = 'image/png', businessName = '', productName = '', language = 'hinglish' } = req.body ?? {};
      if (typeof imageBase64 !== 'string' || imageBase64.length < 20 || imageBase64.length > 10_500_000) {
        res.status(400).json({ error: 'A valid product image (under 8MB) is required for AI analysis.' });
        return;
      }
      const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
      const safeMime = allowedMimes.has(String(mimeType).toLowerCase()) ? String(mimeType).toLowerCase() : 'image/png';

      const contentLang: ContentLanguage =
        language === 'hi' || language === 'hinglish' ? language : 'en';

      const ai = getAiClient();
      const { response } = await generateWithRetryAndFallback({
        ai,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime === 'image/jpg' ? 'image/jpeg' : safeMime,
                data: imageBase64,
              },
            },
            {
              text: `Analyze this product image for ${String(businessName).slice(0, 100) || 'an online seller'} (${String(productName).slice(0, 100) || 'featured product'}). ${languageInstruction(contentLang)} Return JSON with productType, lightingFeedback, recommendedBackground (white | midnight | royal | warm), and a punchy ecommerceTitle + shortCaption.`,
            },
          ],
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING },
            lightingFeedback: { type: Type.STRING },
            recommendedBackground: { type: Type.STRING },
            ecommerceTitle: { type: Type.STRING },
            shortCaption: { type: Type.STRING },
          },
          required: ['productType', 'lightingFeedback', 'recommendedBackground', 'ecommerceTitle', 'shortCaption'],
        },
      });

      const parsed = safeParseAiJson(response.text ?? '{}');
      res.json({ analysis: parsed });
    } catch (err) {
      console.error('Image analysis error:', err);
      sendAiErrorResponse(res, err, 'प्रोडक्ट फोटो का विश्लेषण नहीं हो सका। कृपया फिर से प्रयास करें।');
    }
  });

  // AI Marketing Assistant Chat
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      await resolveActor(req, res);
      const { messages = [], businessContext = '', language = 'hinglish' } = req.body ?? {};
      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'Please enter a marketing question.' });
        return;
      }

      const contentLang: ContentLanguage =
        language === 'hi' || language === 'hinglish' ? language : 'en';

      const conversationText = messages
        .slice(-10)
        .map((m: { role?: string; text?: string }) =>
          `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${String(m.text ?? '').slice(0, 1500)}`
        )
        .join('\n');

      const ai = getAiClient();
      const { response } = await generateWithRetryAndFallback({
        ai,
        contents: `${businessContext ? `Business Context: ${String(businessContext).slice(0, 400)}\n\n` : ''}${conversationText}`,
        systemInstruction: `You are MUSHRAY AI Marketing Assistant — a warm, practical digital marketing mentor for Indian shopkeepers, small businesses, creators, and online sellers. ${languageInstruction(contentLang)} Give actionable, step-by-step advice with clear bullet points and real examples.`,
      });

      res.json({ reply: response.text ?? '' });
    } catch (err) {
      console.error('Assistant error:', err);
      sendAiErrorResponse(res, err, 'मार्केटिंग असिस्टेंट अभी जवाब नहीं दे पा रहा है। कृपया कुछ देर बाद प्रयास करें।');
    }
  });

  // Saved Projects CRUD
  app.get('/api/projects', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.json({ projects: [] });
      return;
    }
    const projects = store.projects
      .filter((p) => p.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ projects });
  });

  app.post('/api/projects', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.status(401).json({ error: 'Please sign in or create a free account to save projects.' });
      return;
    }
    const { toolId, title, language, businessName, productName, inputBrief, outputData, previewImageDataUrl } = req.body ?? {};
    if (typeof toolId !== 'string' || typeof title !== 'string' || !outputData) {
      res.status(400).json({ error: 'Project title, toolId, and generated content are required.' });
      return;
    }

    const now = new Date().toISOString();
    const project: DbProject = {
      id: `prj_${crypto.randomBytes(8).toString('hex')}`,
      userId: user.id,
      toolId,
      title: title.trim().slice(0, 140),
      language: language === 'hi' || language === 'hinglish' ? language : 'en',
      businessName: String(businessName ?? '').slice(0, 100),
      productName: String(productName ?? '').slice(0, 100),
      inputBrief: (inputBrief && typeof inputBrief === 'object' ? inputBrief : {}) as Record<string, unknown>,
      outputData: outputData as Record<string, unknown>,
      previewImageDataUrl: typeof previewImageDataUrl === 'string' && previewImageDataUrl.length < 2_500_000 ? previewImageDataUrl : undefined,
      createdAt: now,
      updatedAt: now,
    };

    store.projects.push(project);
    await persistStore(store);
    res.status(201).json({ project });
  });

  app.delete('/api/projects/:id', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const idx = store.projects.findIndex((p) => p.id === req.params.id && p.userId === user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }
    store.projects.splice(idx, 1);
    await persistStore(store);
    res.json({ ok: true });
  });

  // Billing & Payment Gateway (Transparent Razorpay integration — never fakes payments)
  app.get('/api/billing/status', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    const keyId = process.env.RAZORPAY_KEY_ID ?? '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    const configured = Boolean(keyId && keySecret);
    const payments = user
      ? store.payments
          .filter((p) => p.userId === user.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [];

    res.json({
      gateway: {
        configured,
        gateway: 'razorpay',
        mode: configured ? 'ready' : 'live_keys_missing',
        message: configured
          ? 'Razorpay payment gateway is connected and ready for live INR checkout.'
          : 'Live payment gateway keys (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are not connected yet. No fake or simulated payments are processed.',
        messageHi: configured
          ? 'Razorpay पेमेंट गेटवे कनेक्ट है और लाइव INR पेमेंट के लिए तैयार है।'
          : 'अभी लाइव पेमेंट गेटवे (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) कनेक्ट नहीं है। जब तक असली गेटवे टेस्ट नहीं होता, नकली पेमेंट स्वीकार नहीं किया जाएगा।',
      },
      payments,
    });
  });

  app.post('/api/billing/create-order', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.status(401).json({ error: 'Please sign in before starting a subscription checkout.' });
      return;
    }
    const planId = req.body?.planId as PlanId;
    if (planId !== 'pro' && planId !== 'premium') {
      res.status(400).json({ error: 'Select Pro (₹199/month) or Premium (₹299/month) to create a payment order.' });
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      res.status(503).json({
        error: 'Live Razorpay gateway is not connected (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing). Connect and test a real Razorpay merchant key before accepting payments.',
      });
      return;
    }

    const amountInr = PLAN_PRICES_INR[planId];
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInr * 100,
        currency: 'INR',
        receipt: `mushray_${user.id}_${Date.now()}`,
        notes: { userId: user.id, planId },
      }),
    });

    if (!orderRes.ok) {
      const detail = await orderRes.text();
      res.status(502).json({ error: `Razorpay order creation failed: ${detail}` });
      return;
    }

    const orderJson = (await orderRes.json()) as { id: string };
    const paymentRecord: DbPayment = {
      id: `pay_${crypto.randomBytes(8).toString('hex')}`,
      userId: user.id,
      planId,
      amountInr,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: orderJson.id,
      status: 'created',
      createdAt: new Date().toISOString(),
    };
    store.payments.push(paymentRecord);
    await persistStore(store);

    res.json({
      orderId: orderJson.id,
      amount: amountInr * 100,
      currency: 'INR',
      keyId,
      planId,
    });
  });

  app.post('/api/billing/verify', async (req, res) => {
    const { store, user } = await resolveActor(req, res);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(503).json({ error: 'Payment gateway secret is not configured.' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
    if (
      typeof razorpay_order_id !== 'string' ||
      typeof razorpay_payment_id !== 'string' ||
      typeof razorpay_signature !== 'string'
    ) {
      res.status(400).json({ error: 'Missing Razorpay verification signature fields.' });
      return;
    }

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const actualBuf = Buffer.from(razorpay_signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      res.status(400).json({ error: 'Payment signature verification failed.' });
      return;
    }

    const record = store.payments.find(
      (p) => p.gatewayOrderId === razorpay_order_id && p.userId === user.id
    );
    if (!record) {
      res.status(404).json({ error: 'Order record not found.' });
      return;
    }

    record.status = 'paid';
    record.gatewayPaymentId = razorpay_payment_id;
    user.planId = record.planId;
    await persistStore(store);

    res.json({ user: sanitizeUser(user), payment: record });
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Vite / Static Frontend Serving
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const anyErr = err as { type?: string; status?: number };
    if (anyErr?.type === 'entity.too.large') {
      res.status(413).json({ error: 'अपलोड की गई फाइल बहुत बड़ी है। कृपया छोटी इमेज चुनें।' });
      return;
    }
    if (anyErr?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'अमान्य रिक्वेस्ट डेटा प्राप्त हुआ।' });
      return;
    }
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'सर्वर में अस्थायी समस्या आई। कृपया दोबारा प्रयास करें।' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MUSHRAY AI server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
