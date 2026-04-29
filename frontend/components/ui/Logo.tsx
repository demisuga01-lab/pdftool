"use client";

import Image from "next/image";
import Link from "next/link";

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
    <span className={["inline-flex items-center gap-3 text-zinc-900 dark:text-zinc-100", className].filter(Boolean).join(" ")}>
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
    <Link aria-label="PDFTools by WellFriend" href={href}>
      {content}
    </Link>
  );
}
