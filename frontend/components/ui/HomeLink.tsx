"use client";

import type { MouseEvent, ReactNode } from "react";

type HomeLinkProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  href?: string;
  onNavigate?: () => void;
};

function isModifiedNavigation(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function HomeLink({
  ariaLabel,
  children,
  className,
  href = "/",
  onNavigate,
}: HomeLinkProps) {
  return (
    <a
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={(event) => {
        if (isModifiedNavigation(event)) {
          return;
        }

        event.preventDefault();
        onNavigate?.();

        if (window.location.pathname === "/") {
          window.location.reload();
          return;
        }

        window.location.assign("/");
      }}
    >
      {children}
    </a>
  );
}
