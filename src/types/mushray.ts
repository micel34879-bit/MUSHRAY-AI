export type ContentLanguage = 'en' | 'hi' | 'hinglish';
export type UiLanguage = 'en' | 'hi';

export type ToolId =
  | 'social-post'
  | 'instagram-caption'
  | 'facebook-post'
  | 'poster-maker'
  | 'festival-poster'
  | 'ad-script'
  | 'whatsapp-marketing'
  | 'product-description'
  | 'bg-remover'
  | 'video-creator'
  | 'brand-logo'
  | 'marketing-strategy';

export type NavSection =
  | 'dashboard'
  | 'tools'
  | 'post-generator'
  | 'poster-maker'
  | 'video-maker'
  | 'assistant'
  | 'projects'
  | 'billing'
  | 'profile'
  | 'settings';

export type PlanId = 'free' | 'pro' | 'premium';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  nameHi: string;
  audience: string;
  audienceHi: string;
  priceInr: number;
  billingCycle: string;
  monthlyGenerationLimit: number | null; // null = unlimited
  limitsSummary: { label: string; value: string }[];
  features: string[];
  featuresHi: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  businessName: string;
  businessCategory: string;
  defaultAudience: string;
  phone: string;
  city: string;
  uiLanguage: UiLanguage;
  defaultContentLanguage: ContentLanguage;
  planId: PlanId;
  usageThisMonth: number;
  usageLimit: number | null;
  usageMonthKey: string;
  createdAt: string;
}

export interface MarketingBriefInput {
  toolId: ToolId;
  language: ContentLanguage;
  businessName: string;
  productName: string;
  description: string;
  targetAudience: string;
  offerOrPrice?: string;
  tone?: string;
  festivalName?: string;
  platform?: string;
}

export interface SavedProject {
  id: string;
  userId: string;
  toolId: ToolId;
  title: string;
  language: ContentLanguage;
  businessName: string;
  productName: string;
  inputBrief: MarketingBriefInput;
  outputData: Record<string, unknown>;
  previewImageDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
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

export interface GatewayStatus {
  configured: boolean;
  gateway: 'razorpay';
  mode: 'live_keys_missing' | 'ready';
  message: string;
  messageHi: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ToolCatalogItem {
  id: ToolId;
  name: string;
  nameHi: string;
  shortDesc: string;
  shortDescHi: string;
  category: 'social' | 'visual' | 'growth';
  tierLabel: 'Free' | 'Pro' | 'Premium';
  navTarget: NavSection;
}
