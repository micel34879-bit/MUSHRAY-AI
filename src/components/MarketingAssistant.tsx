import { useState, type FormEvent } from 'react';
import { Loader2, Send } from 'lucide-react';
import { api } from '../lib/api';
import type { ChatMessage, ContentLanguage, UiLanguage, UserProfile } from '../types/mushray';

interface MarketingAssistantProps {
  uiLang: UiLanguage;
  user: UserProfile | null;
}

const STARTER_PROMPTS = [
  'Mere boutique ki Diwali sales kaise badhayein?',
  'Suggest a ₹2,000/month Instagram & WhatsApp ad plan for a local bakery.',
  'How do I get more repeat orders from WhatsApp Broadcasts?',
];

export function MarketingAssistant({ uiLang, user }: MarketingAssistantProps) {
  const [language, setLanguage] = useState<ContentLanguage>(user?.defaultContentLanguage ?? 'hinglish');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        uiLang === 'hi'
          ? 'नमस्ते! मैं MUSHRAY AI मार्केटिंग असिस्टेंट हूँ। अपने बिजनेस, ऑफर, ग्राहक बढ़ाने या सोशल मीडिया विज्ञापन से जुड़ा कोई भी सवाल पूछें।'
          : 'Welcome to MUSHRAY AI Marketing Assistant! Ask me anything about growing sales, planning Meta/WhatsApp campaigns, pricing offers, or reaching more customers.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function sendQuestion(text: string) {
    if (!text.trim() || loading) return;
    setError('');
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const businessContext = user
        ? `Business: ${user.businessName}, Category: ${user.businessCategory}, Audience: ${user.defaultAudience}, City: ${user.city}`
        : '';
      const res = await api.askAssistant({
        messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        businessContext,
        language,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assistant failed to respond.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuestion(input);
  }

  return (
    <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 flex flex-col h-[calc(100vh-170px)] min-h-[520px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/80">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {uiLang === 'hi' ? 'AI बिजनेस व मार्केटिंग असिस्टेंट' : '1-on-1 AI Marketing Mentor'}
          </h2>
          <p className="text-xs text-slate-400">
            {user?.businessName ? `${user.businessName} · ` : ''}
            {uiLang === 'hi' ? 'हिंदी, English या Hinglish में पूछें' : 'Ask strategy questions in Hindi, English, or Hinglish'}
          </p>
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
          className="px-3 py-1.5 rounded-lg bg-[#070A15] border border-slate-800 text-xs text-white"
        >
          <option value="hinglish">Hinglish</option>
          <option value="hi">Hindi (हिंदी)</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-3xl ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <div
              className={`px-4 py-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white'
                  : 'bg-[#070B17] border border-slate-800 text-slate-100'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[11px] font-mono-num text-slate-500 mt-1">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            MUSHRAY AI is thinking...
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-5 py-2.5 border-t border-slate-800/60 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendQuestion(p)}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#070A15] border border-slate-800 text-slate-300 hover:border-blue-500/60 hover:text-white transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-5 mb-2 p-2.5 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-800/80 flex gap-2 sm:gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            uiLang === 'hi'
              ? 'अपना मार्केटिंग सवाल यहाँ लिखें...'
              : 'Ask how to market your product, run ads, or boost festive sales...'
          }
          className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Send className="h-4 w-4" />
          {uiLang === 'hi' ? 'भेजें' : 'Send'}
        </button>
      </form>
    </div>
  );
}
