import type {
  ChatMessage,
  ContentLanguage,
  GatewayStatus,
  MarketingBriefInput,
  PaymentRecord,
  PlanId,
  SavedProject,
  UserProfile,
} from '../types/mushray';

const SESSION_STORAGE_KEY = 'mushray_session_token';
const GUEST_STORAGE_KEY = 'mushray_guest_token';

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Ignore storage restrictions
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const sessionToken = readStorage(SESSION_STORAGE_KEY);
  const guestToken = readStorage(GUEST_STORAGE_KEY);
  const authHeaders: Record<string, string> = {};
  if (sessionToken) authHeaders.Authorization = `Bearer ${sessionToken}`;
  if (guestToken) authHeaders['X-Guest-Token'] = guestToken;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error('नेटवर्क कनेक्शन की समस्या है। कृपया इंटरनेट जाँचें और दोबारा प्रयास करें।');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 503 && !data.error) {
      throw new Error(
        'अभी AI सेवा व्यस्त है (Error 503)। कृपया कुछ सेकंड बाद दोबारा प्रयास करें।'
      );
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export interface SessionResponse {
  authenticated: boolean;
  user: UserProfile | null;
  guestToken?: string | null;
  guestQuota?: {
    used: number;
    limit: number;
    monthKey: string;
  };
}

export const api = {
  getSession: async () => {
    const res = await requestJson<SessionResponse>('/api/auth/me');
    if (res.guestToken) writeStorage(GUEST_STORAGE_KEY, res.guestToken);
    return res;
  },

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    businessCategory: string;
  }) => {
    const res = await requestJson<{ user: UserProfile; sessionToken?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.sessionToken) writeStorage(SESSION_STORAGE_KEY, res.sessionToken);
    return res;
  },

  login: async (payload: { email: string; password: string }) => {
    const res = await requestJson<{ user: UserProfile; sessionToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.sessionToken) writeStorage(SESSION_STORAGE_KEY, res.sessionToken);
    return res;
  },

  logout: async () => {
    const res = await requestJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    });
    writeStorage(SESSION_STORAGE_KEY, null);
    return res;
  },

  updateProfile: (payload: Partial<UserProfile>) =>
    requestJson<{ user: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  generateMarketingContent: (brief: MarketingBriefInput) =>
    requestJson<{
      output: Record<string, unknown>;
      quota: { used: number; limit: number | null; monthKey: string };
      modelUsed?: string;
    }>('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(brief),
    }),

  analyzeProductImage: (payload: {
    imageBase64: string;
    mimeType: string;
    businessName: string;
    productName: string;
    language: ContentLanguage;
  }) =>
    requestJson<{
      analysis: {
        productType: string;
        lightingFeedback: string;
        recommendedBackground: string;
        ecommerceTitle: string;
        shortCaption: string;
      };
    }>('/api/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  askAssistant: (payload: {
    messages: Pick<ChatMessage, 'role' | 'text'>[];
    businessContext: string;
    language: ContentLanguage;
  }) =>
    requestJson<{ reply: string }>('/api/ai/assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProjects: () => requestJson<{ projects: SavedProject[] }>('/api/projects'),

  saveProject: (payload: {
    toolId: string;
    title: string;
    language: ContentLanguage;
    businessName: string;
    productName: string;
    inputBrief: MarketingBriefInput;
    outputData: Record<string, unknown>;
    previewImageDataUrl?: string;
  }) =>
    requestJson<{ project: SavedProject }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteProject: (id: string) =>
    requestJson<{ ok: boolean }>(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getBillingStatus: () =>
    requestJson<{ gateway: GatewayStatus; payments: PaymentRecord[] }>('/api/billing/status'),

  createRazorpayOrder: (planId: PlanId) =>
    requestJson<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      planId: PlanId;
    }>('/api/billing/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),

  verifyRazorpayPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) =>
    requestJson<{ user: UserProfile; payment: PaymentRecord }>('/api/billing/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
