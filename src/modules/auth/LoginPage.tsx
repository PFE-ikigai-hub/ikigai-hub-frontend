import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { 

  SignInIcon as SignIn, 
  ArrowLeftIcon as ArrowLeft, 
  EnvelopeSimpleIcon as EnvelopeSimple, 
  LockIcon as Lock, 
  PaperPlaneTiltIcon as PaperPlaneTilt, 
  EyeIcon as Eye, 
  EyeSlashIcon as EyeSlash 
} from "@phosphor-icons/react";
import { useAuth } from "@/core/auth/AuthProvider";
import { useI18n } from "@/core/i18n/I18nProvider";
import { authApi } from "@/core/api/client";
import Prism from "@/shared/components/effects/Prism";

type PageState = 'login' | 'forgot' | 'reset-success';

export function LoginPage() {
  const { login, isAuthenticated, isLoading, isFullyReady } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pageState, setPageState] = useState<PageState>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t("login.fillAllFields"));
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const backendMessage = err.response?.data?.message as string | undefined;
        const isTimeout = err.code === "ECONNABORTED";
        const isNetworkError = !err.response;
        if (status === 401) {
          setError(backendMessage || t("login.error") || "Identifiants incorrects");
        } else if (isTimeout) {
          setError("Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez.");
        } else if (isNetworkError) {
          setError("Impossible de joindre le serveur. Vérifiez que le backend est lancé puis réessayez.");
        } else {
          setError(backendMessage || "Connexion impossible. Veuillez réessayer.");
        }
      } else {
        setError(t("login.error") || "Identifiants incorrects");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setIsForgotSubmitting(true);
    try {
      await authApi.forgotPassword(resetEmail);
      setPageState('reset-success');
    } catch (err: any) {
      setPageState('reset-success');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem("ikigai:authNotice");
      if (notice) {
        setAuthNotice(notice);
        sessionStorage.removeItem("ikigai:authNotice");
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isFullyReady) return;
    const searchParams = new URLSearchParams(location.search);
    const redirectTo = searchParams.get("redirect");
    const safeRedirect =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.startsWith("/login")
        ? redirectTo
        : null;
    if (safeRedirect) {
      navigate(safeRedirect, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, isFullyReady, location.search, navigate]);

  const pageVariants: any = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: 'easeIn' } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0b] transition-colors duration-500">
      <div className="absolute inset-0 z-0">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        <div className="bg-[#111113] rounded-2xl shadow-2xl shadow-black/60 border border-stone-800/80 overflow-hidden" style={{ fontFamily: "'Old Standard TT', serif" }}>
          <div className="px-8 pt-12 pb-8 text-center border-b border-stone-800/60 flex flex-col items-center">
            <p className="text-xs md:text-sm tracking-[0.16em] text-stone-400 uppercase mb-2">
              {t("login.welcomeTo")}
            </p>
            <h1 className="brand-text text-3xl md:text-3xl tracking-[0.08em] text-white font-normal">
              Ikigai Hub
            </h1>
          </div>
          <div className="px-8 py-8 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait">
              {pageState === 'login' && (
                <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1">
                  <div className="mb-7">
                    <h2 className="text-xl text-white mb-1 font-normal">Connexion</h2>
                    <p className="text-sm text-stone-400">Connectez-vous à votre espace</p>
                  </div>

                  <AnimatePresence>
                    {authNotice && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 px-4 py-3 bg-blue-50/10 border border-blue-300/30 rounded-xl"
                      >
                        <p className="text-sm text-blue-300">{authNotice}</p>
                      </motion.div>
                    )}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 px-4 py-3 bg-[#111113] border border-stone-700 rounded-xl"
                      >
                        <p className="text-sm text-red-400">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={onSubmit} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wide">Email</label>
                      <div className="relative">
                        <EnvelopeSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre.email@exemple.com"
                          className="w-full pl-10 pr-4 py-3 border border-stone-700 rounded-xl bg-[#111113] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200/20 transition-all duration-200"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wide">Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="hide-password-reveal w-full pl-10 pr-12 py-3 border border-stone-700 rounded-xl bg-[#111113] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200/20 transition-all duration-200"
                          required
                          minLength={6}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setPageState('forgot')}
                        className="text-xs text-stone-400 hover:text-white transition-colors underline underline-offset-2"
                      >
                        {t('login.forgotPassword')}
                      </button>
                    </div>

                    <div className="flex-1" />

                      <motion.button
                        type="submit"
                        whileHover={{ scale: isSubmitting ? 1 : 1.015 }}
                        whileTap={{ scale: isSubmitting ? 1 : 0.985 }}
                        disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-white text-black hover:bg-stone-200 transition-colors shadow-lg shadow-stone-900/10 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <SignIn className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          {isSubmitting ? t("login.signingIn") : t("login.signIn")}
                        </span>

                      </motion.button>
                  </form>
                </motion.div>
              )}
              {pageState === 'forgot' && (
                <motion.div key="forgot" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1">
                  <button
                    onClick={() => setPageState('login')}
                    className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 transition-colors mb-7 w-fit"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t('login.backToLogin')}
                  </button>

                  <div className="mb-7">
	                    <h2 className="text-xl text-white mb-1 font-normal">{t('login.forgotPasswordTitle')}</h2>
	                    <p className="text-sm text-stone-400">{t('login.forgotPasswordDesc')}</p>
                  </div>

                  <form onSubmit={handleForgotSubmit} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wide">Email</label>
                      <div className="relative">
                        <EnvelopeSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="votre.email@exemple.com"
                          className="w-full pl-10 pr-4 py-3 border border-stone-700 rounded-xl bg-[#111113] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200/20 transition-all duration-200"
                          required
                          disabled={isForgotSubmitting}
                        />
                      </div>
                    </div>

                    <div className="flex-1" />

                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        disabled={isForgotSubmitting}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-white text-black hover:bg-stone-200 transition-colors shadow-lg shadow-stone-900/10 disabled:opacity-60"
                      >
                        {isForgotSubmitting ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          <PaperPlaneTilt className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{t('login.sendResetLink')}</span>
                      </motion.button>
                  </form>
                </motion.div>
              )}
              {pageState === 'reset-success' && (
                <motion.div key="success" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center flex-1 text-center py-6">
	                  <h2 className="text-xl text-white mb-2 font-normal">{t('login.resetSuccess')}</h2>
	                  <p className="text-sm text-stone-400 max-w-[300px] leading-relaxed mb-8">{t('login.resetSuccessDesc')}</p>
                  <button
                    onClick={() => { setPageState('login'); setResetEmail(''); }}
	                    className="flex items-center gap-2 text-sm text-stone-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('login.backToLogin')}
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
          <div className="px-8 py-4 border-t border-stone-800/60 bg-[#111113] text-center">
            <p className="text-xs text-stone-500">
              {t("login.needAccess")}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
