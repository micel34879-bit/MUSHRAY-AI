import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../data/toolsCatalog';
import { api } from '../lib/api';
import type { GatewayStatus, PaymentRecord, PlanId, UiLanguage, UserProfile } from '../types/mushray';

interface SubscriptionBillingProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
  usageUsed: number;
  usageLimit: number | null;
  onOpenAuth: () => void;
  onUserUpdated: (user: UserProfile) => void;
}

export function SubscriptionBilling({
  uiLang,
  user,
  usageUsed,
  usageLimit,
  onOpenAuth,
  onUserUpdated,
}: SubscriptionBillingProps) {
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [processingPlan, setProcessingPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getBillingStatus()
      .then((res) => {
        if (!active) return;
        setGateway(res.gateway);
        setPayments(res.payments);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handlePlanAction(planId: PlanId) {
    setCheckoutError('');
    if (!user) {
      onOpenAuth();
      return;
    }
    if (planId === 'free' || planId === user.planId) return;

    setProcessingPlan(planId);
    try {
      const order = await api.createRazorpayOrder(planId);
      // Load Razorpay Checkout script dynamically only when real keys are configured
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const RazorpayCtor = (window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }).Razorpay;
        if (!RazorpayCtor) {
          setCheckoutError('Unable to load Razorpay Checkout SDK.');
          setProcessingPlan(null);
          return;
        }
        const rzp = new RazorpayCtor({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'MUSHRAY AI',
          description: `Subscription Upgrade: ${planId.toUpperCase()}`,
          order_id: order.orderId,
          prefill: { name: user.name, email: user.email },
          handler: async (resp: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verified = await api.verifyRazorpayPayment(resp);
              onUserUpdated(verified.user);
              setPayments((prev) => [verified.payment, ...prev]);
            } catch (err) {
              setCheckoutError(err instanceof Error ? err.message : 'Payment verification failed.');
            } finally {
              setProcessingPlan(null);
            }
          },
          modal: {
            ondismiss: () => setProcessingPlan(null),
          },
        });
        rzp.open();
      };
      script.onerror = () => {
        setCheckoutError('Failed to load Razorpay Checkout script.');
        setProcessingPlan(null);
      };
      document.body.appendChild(script);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout unavailable.');
      setProcessingPlan(null);
    }
  }

  const currentPlanId: PlanId = user?.planId ?? 'free';

  return (
    <div className="space-y-8">
      {/* Usage & Gateway Transparency Notice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 space-y-3">
          <div className="text-xs text-slate-400">
            {uiLang === 'hi' ? 'वर्तमान प्लान और उपयोग सीमा' : 'Active Plan & Usage Limits'}
          </div>
          <div className="flex items-baseline justify-between">
            <div className="font-display text-xl font-bold text-white capitalize">
              {currentPlanId} Plan
            </div>
            <div className="font-mono-num text-sm text-blue-400">
              {usageLimit === null ? `${usageUsed} / Unlimited` : `${usageUsed} / ${usageLimit} used`}
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
              style={{
                width: `${usageLimit ? Math.min(100, Math.round((usageUsed / usageLimit) * 100)) : 20}%`,
              }}
            />
          </div>
          <div className="text-xs text-slate-400">
            {user
              ? `${user.businessName} · ${user.email}`
              : uiLang === 'hi'
              ? 'गैस्ट प्रिव्यू (10 फ्री जनरेशन) — 25/महीना पाने के लिए फ्री अकाउंट बनाएं।'
              : 'Guest Preview (10 free generations) — Create a free account for 25/month.'}
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl bg-[#0C1222] border border-slate-800/80 p-5 flex items-start gap-4">
          {gateway?.configured ? (
            <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1.5">
            <div className="font-display text-sm font-semibold text-white">
              {gateway?.configured
                ? 'Razorpay Payment Gateway Connected'
                : uiLang === 'hi'
                ? 'पेमेंट गेटवे स्थिति: अभी लाइव कीज़ (Keys) कनेक्ट नहीं हैं'
                : 'Payment Gateway Status: Live Keys Not Connected Yet'}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {loading
                ? 'Checking payment gateway status...'
                : uiLang === 'hi'
                ? gateway?.messageHi
                : gateway?.message}
            </p>
            <div className="text-[11px] font-mono-num text-slate-400">
              Backend endpoints wired: /api/billing/create-order · /api/billing/verify (HMAC-SHA256)
            </div>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-800/70 text-xs text-amber-200">
          {checkoutError}
        </div>
      )}

      {/* 3 Pricing Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = currentPlanId === plan.id && Boolean(user);
          const isRecommended = plan.id === 'pro';
          return (
            <div
              key={plan.id}
              className={`rounded-xl p-6 flex flex-col justify-between gap-6 border ${
                isRecommended
                  ? 'bg-[#101830] border-blue-500/60'
                  : 'bg-[#0C1222] border-slate-800/80'
              }`}
            >
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-blue-400">
                    {uiLang === 'hi' ? plan.audienceHi : plan.audience}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mt-1">
                    {uiLang === 'hi' ? plan.nameHi : plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-mono-num text-3xl font-bold text-white">
                      ₹{plan.priceInr}
                    </span>
                    <span className="text-xs text-slate-400">/ {plan.billingCycle}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                  {plan.limitsSummary.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="font-mono-num font-semibold text-white">{row.value}</span>
                    </div>
                  ))}
                </div>

                <ul className="space-y-2.5">
                  {(uiLang === 'hi' ? plan.featuresHi : plan.features).map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-slate-200">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent || processingPlan === plan.id}
                onClick={() => handlePlanAction(plan.id)}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-400 cursor-default'
                    : plan.id === 'free'
                    ? 'bg-[#121A30] border border-slate-700 text-white hover:border-blue-500'
                    : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white'
                }`}
              >
                {isCurrent
                  ? uiLang === 'hi'
                    ? 'वर्तमान सक्रिय प्लान'
                    : 'Current Active Plan'
                  : processingPlan === plan.id
                  ? 'Opening Checkout...'
                  : plan.id === 'free'
                  ? user
                    ? 'Included Free Tier'
                    : 'Start Free (₹0)'
                  : uiLang === 'hi'
                  ? `₹${plan.priceInr}/महीना अपग्रेड करें`
                  : `Upgrade for ₹${plan.priceInr}/mo`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment History Table */}
      <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-400" />
            <h3 className="font-display text-sm font-semibold text-white">
              {uiLang === 'hi' ? 'पेमेंट इतिहास (Payment History)' : 'Payment History'}
            </h3>
          </div>
          <span className="font-mono-num text-xs text-slate-400">{payments.length} records</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {uiLang === 'hi'
              ? 'अभी कोई सत्यापित पेमेंट रिकॉर्ड नहीं है। लाइव Razorpay पेमेंट के बाद सभी रसीदें यहाँ दिखेंगी।'
              : 'No verified transactions yet. Real Razorpay orders and receipts appear here once completed.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#080C18] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Order ID</th>
                  <th className="py-3 px-4 font-medium">Plan</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono-num text-slate-300">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-slate-300">{p.gatewayOrderId}</td>
                    <td className="py-3 px-4 capitalize text-white">{p.planId}</td>
                    <td className="py-3 px-4 capitalize text-slate-200">{p.status}</td>
                    <td className="py-3 px-4 font-mono-num text-right text-white">₹{p.amountInr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
