"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

const SCROLL_THRESHOLD_PX = 480;

/**
 * A subtle floating "back to top" button for long mobile pages. Only renders
 * after the user scrolls past SCROLL_THRESHOLD_PX. Hidden on lg+ where the
 * page is short and a back-to-top affordance would be noise.
 *
 * Position is offset above the workspace's sticky bottom action bar and
 * settings FAB so it never sits on top of the primary action button.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      aria-label="Back to top"
      className={[
        "fixed left-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full",
        "border border-zinc-200 bg-white text-zinc-700 shadow-lg shadow-black/10",
        "transition hover:bg-zinc-50 active:scale-95",
        "dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:shadow-black/30 dark:hover:bg-zinc-800",
        "lg:hidden",
        // Sit above the sticky bottom action bar (~3.5rem) plus safe area.
        "bottom-[calc(env(safe-area-inset-bottom)+5rem)]",
      ].join(" ")}
      onClick={handleClick}
      type="button"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
