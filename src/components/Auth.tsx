import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, ShieldCheck, Globe, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { sendTelegramMessage, escapeHtml } from '../services/telegramService';

interface AuthProps {
  type: 'login' | 'signup';
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSuccess: (user: { name: string; email: string }) => void;
  onSwitch: () => void;
  onBack: () => void;
}

export function Auth({ type, lang, onLanguageChange, onSuccess, onSwitch, onBack }: AuthProps) {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    badgeNumber: ''
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const isIframe = window.self !== window.top;

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err: any) {
      console.error('Reset error:', err);
      let message = (t as any).auth.generalError;
      if (err.code === 'auth/user-not-found') {
        message = (t as any).auth.invalidEmail;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, {
          displayName: formData.name
        });
        
        // Send Telegram notification for new signup
        await sendTelegramMessage(`👤 <b>New Officer Registered</b>\n---------------------------\n<b>Name:</b> ${escapeHtml(formData.name)}\n<b>Email:</b> ${escapeHtml(formData.email)}\n<b>Badge:</b> ${escapeHtml(formData.badgeNumber)}`);

        onSuccess({
          name: formData.name,
          email: formData.email
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        onSuccess({
          name: userCredential.user.displayName || 'Officer',
          email: userCredential.user.email || ''
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = (t as any).auth.generalError;
      
      if (err.code === 'auth/email-already-in-use') {
        message = (t as any).auth.emailInUse;
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = (t as any).auth.invalidCredentials;
      } else if (err.code === 'auth/invalid-email') {
        message = (t as any).auth.invalidEmail;
      } else if (err.code === 'auth/weak-password') {
        message = (t as any).auth.weakPassword;
      } else if (err.code === 'auth/network-request-failed') {
        message = (t as any).auth.networkError;
      } else if (err.code === 'auth/too-many-requests') {
        message = (t as any).auth.tooManyRequests;
      } else if (err.code === 'auth/operation-not-allowed') {
        message = (t as any).auth.operationNotAllowed;
      } else if (err.code === 'auth/user-disabled') {
        message = (t as any).auth.accountDisabled;
      } else if (err.code) {
        message += ` (${err.code})`;
      }
      
      setError(message);
      
      // Auto-reconnect attempt if network error
      if (err.code === 'auth/network-request-failed') {
        setTimeout(() => {
          setError((t as any).auth.reconnecting);
          handleReconnect();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if we are in a native app context
      const isNative = window.location.protocol === 'capacitor:' || window.location.protocol === 'http:';
      
      // Safety check for browser popup blocking
      const popupTimeout = setTimeout(() => {
        if (loading) {
          setError(lang === 'am' ? 'Google መግቢያው ረጅም ጊዜ እየወሰደ ነው። እባክዎ ብቅ ባይ (Popup) እንዲፈቀድ ያረጋግጡ።' : 'Google Sign-in is taking too long. Please ensure popups are allowed for this site.');
        }
      }, 10000);

      try {
        if (isNative && !isIframe) {
          setError(lang === 'am' ? 'በአፕሊኬሽኑ ውስጥ የGoogle መግቢያ ለጊዜው አይሰራም። እባክዎ በኢሜይል እና የይለፍ ቃል ይግቡ ወይም በብራውዘር ይክፈቱት።' : 'Google Sign-in is not supported directly in the app yet. Please use Email/Password or open in a browser.');
          setLoading(false);
          clearTimeout(popupTimeout);
          return;
        }

        const result = await signInWithPopup(auth, googleProvider);
        clearTimeout(popupTimeout);
        onSuccess({
          name: result.user.displayName || 'Officer',
          email: result.user.email || ''
        });
      } catch (err: any) {
        clearTimeout(popupTimeout);
        throw err;
      }
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError((t as any).auth.popupClosed);
      } else if (err.code === 'auth/unauthorized-domain') {
        setError((t as any).auth.unauthorizedDomain);
      } else if (err.code === 'auth/network-request-failed') {
        setError((t as any).auth.networkError);
      } else {
        setError((t as any).auth.googleError + (err.code ? ` (${err.code})` : ''));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    const { forceReconnect } = await import('../firebase');
    await forceReconnect();
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#002B5B] flex items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-white/60 hover:text-white transition-colors flex items-center gap-2 z-50"
      >
        <ArrowLeft size={24} />
        <span className="font-bold">{t.back}</span>
      </button>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20">
            <button 
              onClick={() => onLanguageChange('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'en' ? 'bg-[#FFD700] text-[#002B5B] shadow-lg shadow-[#FFD700]/20' : 'text-white/60 hover:text-white'}`}
            >
              EN
            </button>
            <button 
              onClick={() => onLanguageChange('am')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === 'am' ? 'bg-[#FFD700] text-[#002B5B] shadow-lg shadow-[#FFD700]/20' : 'text-white/60 hover:text-white'}`}
            >
              AM
            </button>
          </div>
        </div>

        <div className="text-center mb-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-[#FFD700]/10 rounded-full flex items-center justify-center mb-4 border-2 border-[#FFD700]/20 shadow-lg">
              <Shield className="text-[#FFD700]" size={40} />
            </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 text-white">
            {t.appName}
          </h1>
          <p className="text-[#FFD700] font-bold text-lg mb-4 italic">
            "{t.motto}"
          </p>
          <h2 className="text-lg font-medium text-[#FFD700] mb-2">
            {type === 'login' ? t.loginTitle : t.signupTitle}
          </h2>
          
          {isIframe && (
            <div className="mb-4 p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-xl text-xs text-brand-accent flex flex-col items-center gap-2">
              <p className="text-center">
                {t.iframeMobileNotice}
              </p>
              <button 
                onClick={handleOpenInNewTab}
                className="px-3 py-1 bg-brand-accent text-brand-bg rounded-lg font-bold hover:bg-brand-accent/90 transition-all"
              >
                {t.openInNewTab}
              </button>
            </div>
          )}

          <p className="text-white/60 text-sm">
            {type === 'login' ? t.loginDesc : t.signupDesc}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl"
        >
          {error && (
            <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-200 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {showForgotPassword ? (
            <motion.form
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleForgotPassword}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <ShieldCheck className="w-12 h-12 text-[#FFD700] mx-auto mb-2" />
                <h3 className="text-xl font-bold text-white">{(t as any).auth.forgotPassword}</h3>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 ml-1">
                  {t.officialEmail}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-[#FFD700] transition-colors" />
                  <input
                    type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all h-12"
                    placeholder="email@wgpolice.gov.et"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {resetSent ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
                  <CheckCircle size={20} />
                  <p className="text-sm">{(t as any).auth.resetSent}</p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FFD700] text-[#002B5B] font-bold py-3 rounded-xl hover:bg-[#FFD700]/90 transition-all flex items-center justify-center gap-2 h-12 shadow-lg shadow-[#FFD700]/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : (t as any).auth.resetPassword}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-sm text-white/60 hover:text-white transition-colors"
              >
                {t.back}
              </button>
            </motion.form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            {type === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">{t.fullName}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      required
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
                      placeholder={t.fullNamePlaceholder || "Enter your full name"}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">{t.badgeNumber}</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      required
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
                      placeholder={t.badgePlaceholder}
                      value={formData.badgeNumber}
                      onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t.officialEmail}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  required
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
                  placeholder={t.emailPlaceholder}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  required
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#FFD700] text-[#002B5B] py-3 rounded-xl font-bold text-lg mt-4 flex items-center justify-center gap-2 hover:bg-[#FFD700]/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FFD700]/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {type === 'login' ? t.loginButton : t.signupButton}
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {type === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-[#FFD700] hover:text-[#FFD700]/80 transition-colors font-medium border-b border-transparent hover:border-[#FFD700]"
                >
                  {(t as any).auth.forgotPassword}
                </button>
              </div>
            )}
          </form>
        )}

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#002B5B] px-2 text-white/40">{t.orContinueWith}</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all font-medium disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t.signInWithGoogle}
          </button>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-white/60 text-sm">
              {type === 'login' ? t.dontHaveAccount : t.alreadyHaveAccount}
              <button
                onClick={onSwitch}
                className="ml-2 text-[#FFD700] font-bold hover:underline"
              >
                {type === 'login' ? t.registerHere : t.signInHere}
              </button>
            </p>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-xs text-white/40">
          {t.authorizedPersonnelOnly}
        </p>
      </div>
    </div>
  );
}
