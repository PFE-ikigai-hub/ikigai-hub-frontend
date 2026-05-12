import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import SplitText from "@/shared/components/effects/SplitText";
import Prism from "@/shared/components/effects/Prism";
import { PreloaderIndicator } from "./PreloaderIndicator";
import { useI18n } from "@/core/i18n/I18nProvider";


interface SplashScreenProps {
  isLoading: boolean;
  children: React.ReactNode;
}

const SPLASH_DURATION = 1000;

export function SplashScreen({ isLoading, children }: SplashScreenProps) {
  const { t } = useI18n();
  const [showSplash, setShowSplash] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(minTimer);
    };
  }, []);

  useEffect(() => {
    if (animationComplete && !isLoading) {
      const hideTimer = setTimeout(() => {
        setShowSplash(false);
      }, 200);

      return () => clearTimeout(hideTimer);
    }
  }, [animationComplete, isLoading]);
  if (!showSplash && !isLoading) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      {showSplash && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0b] overflow-hidden"
        >
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
          <div className="relative z-10 text-center">
            <p className="text-xs md:text-sm tracking-[0.16em] text-stone-300 uppercase mb-2">
              {t("login.welcomeTo")}
            </p>
            <SplitText
              text="Ikigai Hub"
              tag="h1"
              className="brand-text text-4xl md:text-5xl tracking-[0.08em] text-white font-normal"
              delay={30}
              duration={0.8}
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
            />
            {animationComplete && isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <PreloaderIndicator size={1.2} />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
