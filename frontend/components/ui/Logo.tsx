"use client";

import Link from "next/link";
import type { SVGProps } from "react";

type LogoProps = {
  className?: string;
  compact?: boolean;
  href?: string;
  iconClassName?: string;
  showLink?: boolean;
};

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#EFF6FF" height="26" rx="7" width="20" x="5" y="3" />
      <path
        d="M11 9.5H18.5L22 13V22.5C22 23.8807 20.8807 25 19.5 25H11C9.61929 25 8.5 23.8807 8.5 22.5V12C8.5 10.6193 9.61929 9.5 11 9.5Z"
        fill="white"
        stroke="#2563EB"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M18.5 9.5V13H22" stroke="#2563EB" strokeLinejoin="round" strokeWidth="1.8" />
      <path
        d="M18.2 14.6H14.9L17.2 10.9L11.9 17.4H15.1L13 21.1L18.2 14.6Z"
        fill="#2563EB"
        stroke="#2563EB"
        strokeLinejoin="round"
        strokeWidth="0.4"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  href = "/",
  iconClassName,
  showLink = true,
}: LogoProps) {
  const content = (
    <span className={["inline-flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#2563EB]">
        <LogoMark className={iconClassName ?? "h-8 w-8"} />
      </span>
      {!compact ? (
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-current">PDFTools</span>
          <span className="text-sm font-medium text-slate-500">by WellFriend</span>
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

export function LogoSymbol(props: SVGProps<SVGSVGElement>) {
  return <LogoMark className={props.className} />;
}
