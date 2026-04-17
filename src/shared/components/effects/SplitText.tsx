import React, { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string | ((t: number) => number);
  splitType?: "chars" | "words" | "lines" | "words, chars";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  textAlign?: React.CSSProperties["textAlign"];
  onLetterAnimationComplete?: () => void;
  showCallback?: boolean;
}

type Token = { value: string; animate: boolean; key: string };

function tokenize(text: string, splitType: SplitTextProps["splitType"]): Token[] {
  if (splitType === "words" || splitType === "lines") {
    return text.split(/(\s+)/).map((part, index) => ({
      value: part,
      animate: !/^\s+$/.test(part),
      key: `${index}-${part}`,
    }));
  }
  if (splitType === "words, chars") {
    const out: Token[] = [];
    text.split(/(\s+)/).forEach((part, wIndex) => {
      if (/^\s+$/.test(part)) {
        out.push({ value: part, animate: false, key: `s-${wIndex}` });
      } else {
        part.split("").forEach((ch, cIndex) => {
          out.push({ value: ch, animate: true, key: `c-${wIndex}-${cIndex}-${ch}` });
        });
      }
    });
    return out;
  }
  return text.split("").map((char, index) => ({
    value: char,
    animate: char !== " ",
    key: `${index}-${char}`,
  }));
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 50,
  duration = 0.7,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  tag = "p",
  textAlign = "center",
  onLetterAnimationComplete,
}) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const animationDoneRef = useRef(false);
  const tokens = useMemo(() => tokenize(text, splitType), [text, splitType]);

  useEffect(() => {
    if (!rootRef.current || !text) return;
    if (animationDoneRef.current) return;

    const letters = rootRef.current.querySelectorAll<HTMLElement>("[data-split='1']");
    if (letters.length === 0) return;

    const tween = gsap.fromTo(
      letters,
      { ...from },
      {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        onComplete: () => {
          animationDoneRef.current = true;
          onLetterAnimationComplete?.();
        },
      }
    );

    return () => {
      tween.kill();
    };
  }, [text, delay, duration, ease, from, to, onLetterAnimationComplete]);

  const Tag = tag as React.ElementType;

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        rootRef.current = node;
      }}
      style={{ textAlign, wordWrap: "break-word", willChange: "transform, opacity" }}
      className={`split-parent overflow-hidden inline-block whitespace-normal ${className}`}
    >
      {tokens.map((token) =>
        token.animate ? (
          <span key={token.key} data-split="1" className="inline-block">
            {token.value === " " ? "\u00A0" : token.value}
          </span>
        ) : (
          <span key={token.key}>{token.value}</span>
        )
      )}
    </Tag>
  );
};

export default SplitText;
