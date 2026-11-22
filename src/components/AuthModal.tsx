import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import type { UiLanguage, UserProfile } from '../types/mushray';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
  uiLang: UiLanguage;
}

export function AuthModal({ open, onClose, onAuthenticated, uiLang }: AuthModalProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Retail & Shopkeeper');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function handleClose() {
    setPassword('');
    setError('');
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({ name, email, password, businessName, businessCategory })
          : await api.login({ email, password });
      setPassword('');
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-[#0D1324] border border-slate-800 p-6 text-slate-100"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-white">
              {mode === 'register'
                ? uiLang === 'hi'
                  ? 'फ्री MUSHRAY AI अकाउंट बनाएं'
                  : 'Create Free MUSHRAY AI Account'
                : uiLang === 'hi'
                ? 'MUSHRAY AI में लॉगिन करें'
                : 'Sign In to MUSHRAY AI'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {uiLang === 'hi'
                ? 'अपने प्रोजेक्ट्स सेव करें और 25 फ्री मासिक AI जनरेशन पाएं।'
                : 'Save campaigns to My Projects and unlock 25 monthly free generations.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex p-1 rounded-lg bg-[#080C18] border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              mode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {uiLang === 'hi' ? 'नया अकाउंट' : 'Create Account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
              mode === 'login' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {uiLang === 'hi' ? 'लॉगिन' : 'Sign In'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {uiLang === 'hi' ? 'आपका नाम' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {uiLang === 'hi' ? 'बिजनेस का नाम' : 'Business Name'}
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Sarees"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {uiLang === 'hi' ? 'कैटेगरी' : 'Category'}
                  </label>
                  <select
                    value={businessCategory}
                    onChange={(e) => setBusinessCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option>Retail & Shopkeeper</option>
                    <option>Fashion & Apparel</option>
                    <option>Food & Restaurant</option>
                    <option>E-Commerce Seller</option>
                    <option>Creator & Coaching</option>
                    <option>Local Services</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {uiLang === 'hi' ? 'ईमेल एड्रेस' : 'Email Address'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {uiLang === 'hi' ? 'पासवर्ड (कम से कम 6 अक्षर)' : 'Password (min 6 characters)'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070A15] border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-60 transition-colors"
          >
            {loading
              ? uiLang === 'hi'
                ? 'कृपया प्रतीक्षा करें...'
                : 'Please wait...'
              : mode === 'register'
              ? uiLang === 'hi'
                ? 'फ्री अकाउंट बनाएं'
                : 'Create Free Account'
              : uiLang === 'hi'
              ? 'लॉगिन करें'
              : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
