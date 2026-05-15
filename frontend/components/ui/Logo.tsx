"use client";

import Image from "next/image";

import { HomeLink } from "@/components/ui/HomeLink";

type LogoProps = {
  className?: string;
  compact?: boolean;
  href?: string;
  iconClassName?: string;
  onNavigate?: () => void;
  showLink?: boolean;
};

export function Logo({
  className,
  compact = false,
  href = "/",
  iconClassName,
  onNavigate,
  showLink = true,
}: LogoProps) {
  const content = (
    <span
      className={[
        "inline-flex items-center gap-3 rounded-xl text-zinc-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:text-zinc-100 dark:focus-visible:ring-emerald-400/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        alt="PDFTools by WellFriend"
        className={iconClassName ?? "h-10 w-10"}
        height={40}
        priority
        src="/logo-mark.svg"
        width={40}
      />
      {!compact ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[18px] font-extrabold tracking-[-0.02em]">
            <span className="text-emerald-600 dark:text-emerald-400">PDF</span>
            <span className="text-current">Tools</span>
          </span>
          <span className="hidden text-[11px] font-medium text-current opacity-70 sm:block">
            by WellFriend
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!showLink) {
    return content;
  }

  return (
    <HomeLink
      ariaLabel="PDFTools by WellFriend"
      className="inline-flex cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:focus-visible:ring-emerald-400/40"
      href={href}
      onNavigate={onNavigate}
    >
      {content}
    </HomeLink>
  );
}
