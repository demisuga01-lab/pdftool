"use client";

import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  className?: string;
  compact?: boolean;
  href?: string;
  iconClassName?: string;
  showLink?: boolean;
};

export function Logo({
  className,
  compact = false,
  href = "/",
  iconClassName,
  showLink = true,
}: LogoProps) {
  const content = (
    <span className={["inline-flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#2563EB] shadow-sm shadow-slate-900/5 dark:border-white/10 dark:bg-slate-900">
        <Image
          alt="PDFTools by WellFriend"
          className={iconClassName ?? "h-10 w-10"}
          height={40}
          priority
          src="/logo.png"
          width={40}
        />
      </span>
      {!compact ? (
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-current">PDFTools</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">by WellFriend</span>
        </span>
      ) : null}
    </span>
  );

  if (!showLink) {
    return content;
  }

  return (
    <Link aria-label="PDFTools by WellFriend" href={href}>
      {content}
    </Link>
  );
}
