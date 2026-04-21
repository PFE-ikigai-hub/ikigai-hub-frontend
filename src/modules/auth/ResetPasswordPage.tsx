import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { 
  Lock, 
  PaperPlaneTilt, 
  CheckCircle, 
  Eye, 
  EyeSlash,
  ArrowLeft
} from "@phosphor-icons/react";
import { useI18n } from "@/core/i18n/I18nProvider";
import { authApi } from "@/core/api/client";
import Prism from "@/shared/components/effects/Prism";
import BorderGlow from "@/shared/components/effects/BorderGlow";
import SplitText from "@/shared/components/effects/SplitText";

export function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const passwordRulesMessage = "Le mot de passe doit contenir au moins 6 caractères, avec au moins 1 lettre et 1 chiffre.";

  const isPasswordValid = (value: string) => {
    if (value.length < 6) return false;
    const hasLetter = /[A-Za-z]/.test(value);
    const hasDigit = /\d/.test(value);
    return hasLetter && hasDigit;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Jeton de réinitialisation manquant ou invalide.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!isPasswordValid(password)) {
      setError(passwordRulesMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const backendMessage = err.response?.data?.message as string | undefined;
        const normalized = backendMessage?.toLowerCase() ?? "";
        const passwordRelated =
          normalized.includes("mot de passe") ||
          normalized.includes("password") ||
          normalized.includes("weak") ||
          normalized.includes("short") ||
          normalized.includes("min");

        if (passwordRelated) {
          setError(passwordRulesMessage);
        } else {
          setError(backendMessage || "Le lien a expiré ou est invalide. Veuillez recommencer la procédure.");
        }
      } else {
        setError("Une erreur est survenue lors de la réinitialisation.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, scale: 0.97, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
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
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="relative w-full max-w-[420px]"
      >
        <div className="bg-[#111113] rounded-2xl shadow-2xl shadow-black/60 border border-stone-800/80 overflow-hidden" style={{ fontFamily: "'Old Standard TT', serif" }}>
          
          <div className="px-8 pt-10 pb-6 text-center border-b border-stone-800/60">
            <SplitText
              text="Ikigai Hub"
              tag="h1"
              className="brand-text text-3xl md:text-4xl tracking-[0.08em] text-white font-normal"
              delay={30}
              duration={0.8}
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
            />
          </div>

          <div className="px-8 py-8 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-7">
                    <h2 className="text-xl text-white mb-1 font-normal">Nouveau mot de passe</h2>
                    <p className="text-sm text-stone-400">Définissez votre nouveau mot de passe sécurisé</p>
                  </div>

                  {error && (
                    <div className="mb-5 px-4 py-3 bg-red-50/10 border border-red-500/20 rounded-xl">
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wide">Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-12 py-3 border border-stone-700 rounded-xl bg-[#111113] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200/20 transition-all duration-200"
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
                      <p className="mt-1.5 text-[11px] text-stone-400">
                        {passwordRulesMessage}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wide">{t("common.confirmPassword")}</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-12 py-3 border border-stone-700 rounded-xl bg-[#111113] text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200/20 transition-all duration-200"
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

                    <div className="pt-4">
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        disabled={isSubmitting || !token}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 ikg-gradient-btn rounded-xl transition-colors shadow-lg shadow-stone-900/10 disabled:opacity-60"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <PaperPlaneTilt className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">Réinitialiser le mot de passe</span>
                      </motion.button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center flex-1 text-center py-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-5 border border-green-500/20">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-xl text-white mb-2 font-normal">Succès !</h2>
                  <p className="text-sm text-stone-400 max-w-[300px] leading-relaxed mb-8">
                    Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
                  </p>
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 text-sm text-stone-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 py-4 border-t border-stone-800/60 bg-[#111113] text-center">
            <p className="text-xs text-stone-500">
              © {new Date().getFullYear()} Ikigai Hub - Studio de Création
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
