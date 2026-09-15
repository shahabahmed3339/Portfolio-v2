"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  /** animate.css class to apply once the element is in view. */
  animateIn: string;
  /** Delay in milliseconds before the animation starts. */
  delay?: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Animate only the first time the element enters view (default: replay). */
  once?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reveal-on-scroll wrapper.
 *
 * Replaces `react-animate-on-scroll`, whose visibility maths relies on
 * `offsetTop`/`offsetParent` and only runs inside a scroll listener — so
 * content already on screen at load stayed at `opacity: 0` until the user
 * scrolled.
 *
 * Uses IntersectionObserver, which reports visibility immediately on
 * observe(), so the first screen animates in on load without needing a scroll.
 *
 * Like the library it replaces, the animation REPLAYS every time the element
 * scrolls back into view (the observer is never disconnected and the class is
 * removed again on exit). Pass `once` to make it animate a single time.
 */
export function Reveal({
  animateIn,
  delay = 0,
  duration = 0.6,
  once = false,
  children,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (very old browser) -> show immediately.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    // Respect users who asked for reduced motion: show without animating.
    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setShown(true);
      return;
    }

    // Two observers with different jobs:
    //
    // - `visible` uses the full viewport (no inset). As soon as any pixel is on
    //   screen the element is shown, so nothing is ever hidden while it is
    //   actually visible. This is what fixes blank content on load.
    // - `reset` is inset, so it only reports false once the element has left
    //   the viewport completely. That is what re-arms the animation for the
    //   next time it scrolls back in, without hiding anything that is on screen.
    const visible = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) visible.disconnect();
          }
        }
      },
      { threshold: 0 },
    );

    const reset = once
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              // Fully out of view -> re-arm so the animation replays next time.
              if (!entry.isIntersecting) setShown(false);
            }
          },
          // A generous margin keeps the element "armed" while it is still
          // anywhere near the viewport, so it does not flicker at the edges.
          { threshold: 0, rootMargin: "100px 0px 100px 0px" },
        );

    visible.observe(node);
    reset?.observe(node);

    return () => {
      visible.disconnect();
      reset?.disconnect();
    };
  }, [once]);

  return (
    <div
      ref={ref}
      className={[
        "reveal",
        shown ? `animated ${animateIn}` : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        // Hidden only until revealed; the CSS transition below handles the fade
        // so there is no dependency on animate.css having loaded.
        opacity: shown ? undefined : 0,
        animationDelay: shown && delay ? `${delay}ms` : undefined,
        animationDuration: shown ? `${duration}s` : undefined,
        animationFillMode: shown ? "both" : undefined,
      }}
    >
      {children}
    </div>
  );
}
