import { useEffect, useState, type FormEvent } from 'react';
import { Check, LogOut, Save, UserCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import type { ContentLanguage, UiLanguage, UserProfile } from '../types/mushray';

interface ProfileSettingsProps {
  mode: 'profile' | 'settings';
  uiLang: UiLanguage;
  user: UserProfile | null;
  onToggleUiLang: (lang: UiLanguage) => void;
  onUserUpdated: (user: UserProfile) => void;
  onLoggedOut: () => void;
  onOpenAuth: () => void;
}

export function ProfileSettings({
  mode,
  uiLang,
  user,
  onToggleUiLang,
  onUserUpdated,
  onLoggedOut,
  onOpenAuth,
}: ProfileSettingsProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [businessCategory, setBusinessCategory] = useState(user?.businessCategory ?? 'Retail & Shopkeeper');
  const [defaultAudience, setDefaultAudience] = useState(user?.defaultAudience ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [defaultContentLanguage, setDefaultContentLanguage] = useState<ContentLanguage>(
    user?.defaultContentLanguage ?? 'hinglish'
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setBusinessName(user.businessName ?? '');
    setBusinessCategory(user.businessCategory ?? 'Retail & Shopkeeper');
    setDefaultAudience(user.defaultAudience ?? '');
    setPhone(user.phone ?? '');
    setCity(user.city ?? '');
    setDefaultContentLanguage(user.defaultContentLanguage ?? 'hinglish');
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-10 text-center max-w-xl mx-auto my-8 space-y-4">
        <UserCircle2 className="h-10 w-10 text-blue-400 mx-auto" />
        <h2 className="font-display text-xl font-bold text-white">
          {uiLang === 'hi' ? 'अपनी बिजनेस प्रोफाइल सेट करें' : 'Sign In to Manage Your Business Profile'}
        </h2>
        <p className="text-sm text-slate-400">
          {uiLang === 'hi'
            ? 'एक बार अपने बिजनेस का नाम, नंबर और ग्राहक चुन लें — सभी AI टूल्स इसे अपने आप भर लेंगे।'
            : 'Save your business defaults once so every AI tool pre-fills your brand details automatically.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600"
        >
          {uiLang === 'hi' ? 'फ्री अकाउंट बनाएं / लॉगिन करें' : 'Sign In / Create Free Account'}
        </button>
      </div>
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.updateProfile({
        name,
        businessName,
        businessCategory,
        defaultAudience,
        phone,
        city,
        uiLanguage: uiLang,
        defaultContentLanguage,
      });
      onUserUpdated(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    onLoggedOut();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={handleSave} className="rounded-xl bg-[#0C1222] border border-slate-800/80 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              {mode === 'settings'
                ? uiLang === 'hi'
                  ? 'ऐप व भाषा सेटिंग्स'
                  : 'Workspace & Language Settings'
                : uiLang === 'hi'
                ? 'यूजर व बिजनेस प्रोफाइल'
                : 'User & Business Profile'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#070A15] border border-slate-700 text-slate-300 hover:text-white hover:border-red-500/60"
          >
            <LogOut className="h-3.5 w-3.5" />
            {uiLang === 'hi' ? 'लॉगआउट' : 'Sign Out'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Business / Shop Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Category</label>
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">WhatsApp / Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">City / Location</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Jaipur, Delhi, Pune"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Default AI Output Language</label>
            <select
              value={defaultContentLanguage}
              onChange={(e) => setDefaultContentLanguage(e.target.value as ContentLanguage)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
            >
              <option value="hinglish">Hinglish (Best for Indian SMBs)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Default Target Audience</label>
          <input
            type="text"
            value={defaultAudience}
            onChange={(e) => setDefaultAudience(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white"
          />
        </div>

        <div className="pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">
              {uiLang === 'hi' ? 'ऐप इंटरफेस की भाषा:' : 'Interface Language:'}
            </span>
            <div className="flex p-1 rounded-lg bg-[#070A15] border border-slate-800">
              <button
                type="button"
                onClick={() => onToggleUiLang('en')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  uiLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onToggleUiLang('hi')}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  uiLang === 'hi' ? 'bg-violet-600 text-white' : 'text-slate-400'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600"
          >
            {saved ? <Check className="h-4 w-4 text-emerald-300" /> : <Save className="h-4 w-4" />}
            {saved ? (uiLang === 'hi' ? 'सेव हो गया!' : 'Saved!') : uiLang === 'hi' ? 'प्रोफाइल सेव करें' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/70 text-xs text-red-200">{error}</div>
        )}
      </form>
    </div>
  );
}
