"use client";

import { useEffect } from "react";

let bodyScrollLockCount = 0;
let previousBodyOverflow = "";

function lockBodyScroll() {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const { body } = document;
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = body.style.overflow;
    body.style.overflow = "hidden";
  }

  bodyScrollLockCount += 1;

  return () => {
    if (typeof document === "undefined" || bodyScrollLockCount === 0) {
      return;
    }

    bodyScrollLockCount -= 1;
    if (bodyScrollLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      previousBodyOverflow = "";
    }
  };
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    return lockBodyScroll();
  }, [active]);
}
