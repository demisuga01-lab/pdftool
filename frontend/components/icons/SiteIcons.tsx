import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function SvgBase({
  children,
  className,
  viewBox = "0 0 24 24",
  ...props
}: IconProps & { viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="14" rx="2.5" width="10" x="4" y="5" />
      <path d="M9 8h6a2 2 0 0 1 2 2v8" />
      <path d="M8 11h3" />
      <path d="M8 14h5" />
    </SvgBase>
  );
}

export function GithubIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M9 18c-4 1.2-4-2-6-2" />
      <path d="M15 22v-3.1a3.3 3.3 0 0 0-.9-2.5c3-.3 6.1-1.5 6.1-6.7a5.2 5.2 0 0 0-1.4-3.6 4.8 4.8 0 0 0-.1-3.6s-1.1-.4-3.7 1.4a12.7 12.7 0 0 0-6 0C6.4 2.1 5.3 2.5 5.3 2.5a4.8 4.8 0 0 0-.1 3.6 5.2 5.2 0 0 0-1.4 3.6c0 5.2 3.1 6.4 6.1 6.7A3.3 3.3 0 0 0 9 19v3" />
    </SvgBase>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </SvgBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M4 19h16" />
    </SvgBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M20 11a8 8 0 1 0-2.35 5.65" />
      <path d="M20 5v6h-6" />
    </SvgBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 20V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M4 5h16" opacity="0.5" />
    </SvgBase>
  );
}

export function DragHandleIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="9" cy="8" fill="currentColor" r="1.1" stroke="none" />
      <circle cx="15" cy="8" fill="currentColor" r="1.1" stroke="none" />
      <circle cx="9" cy="12" fill="currentColor" r="1.1" stroke="none" />
      <circle cx="15" cy="12" fill="currentColor" r="1.1" stroke="none" />
      <circle cx="9" cy="16" fill="currentColor" r="1.1" stroke="none" />
      <circle cx="15" cy="16" fill="currentColor" r="1.1" stroke="none" />
    </SvgBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </SvgBase>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="6" rx="1.2" width="6" x="4" y="4" />
      <rect height="6" rx="1.2" width="6" x="14" y="4" />
      <rect height="6" rx="1.2" width="6" x="4" y="14" />
      <rect height="6" rx="1.2" width="6" x="14" y="14" />
    </SvgBase>
  );
}

export function GridDenseIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="4" rx="0.8" width="4" x="4" y="4" />
      <rect height="4" rx="0.8" width="4" x="10" y="4" />
      <rect height="4" rx="0.8" width="4" x="16" y="4" />
      <rect height="4" rx="0.8" width="4" x="4" y="10" />
      <rect height="4" rx="0.8" width="4" x="10" y="10" />
      <rect height="4" rx="0.8" width="4" x="16" y="10" />
      <rect height="4" rx="0.8" width="4" x="4" y="16" />
      <rect height="4" rx="0.8" width="4" x="10" y="16" />
      <rect height="4" rx="0.8" width="4" x="16" y="16" />
    </SvgBase>
  );
}

export function PageIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 12h6" />
      <path d="M10 16h6" />
    </SvgBase>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m6 18 4.5-4.5 3.5 3.5 2.5-2.5 2.5 3" />
    </SvgBase>
  );
}

export function RotateCwIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M20 12a8 8 0 1 1-3-6.24" />
      <path d="M20 5v6h-6" />
    </SvgBase>
  );
}

export function RotateCcwIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M4 12a8 8 0 1 0 3-6.24" />
      <path d="M4 5v6h6" />
    </SvgBase>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="10" rx="2" width="14" x="5" y="10" />
      <path d="M8 10V8a4 4 0 1 1 8 0v2" />
    </SvgBase>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </SvgBase>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M3 3 21 21" />
      <path d="M10.7 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a18 18 0 0 1-3.3 4.1" />
      <path d="M6.3 6.7C3.8 8.5 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.1 2.8-.4" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </SvgBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </SvgBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </SvgBase>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="m4 7 8 6 8-6" />
    </SvgBase>
  );
}

export function LinkArrowIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </SvgBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M12 3 5 6v5c0 4.6 2.8 7.9 7 10 4.2-2.1 7-5.4 7-10V6l-7-3Z" />
    </SvgBase>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h6" />
    </SvgBase>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </SvgBase>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect height="18" rx="2.5" width="14" x="5" y="3" />
      <path d="M8 7h8" />
      <path d="M9 12h.01" />
      <path d="M12 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9 16h.01" />
      <path d="M12 16h.01" />
      <path d="M15 16h.01" />
    </SvgBase>
  );
}

export function StackIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </SvgBase>
  );
}

export function FlagIndiaIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" className={props.className} viewBox="0 0 24 24">
      <path d="M5 4h1.5v16H5z" fill="currentColor" opacity="0.4" />
      <path d="M6.5 5h12v4h-12z" fill="#FF9933" />
      <path d="M6.5 9h12v4h-12z" fill="#FFFFFF" />
      <path d="M6.5 13h12v4h-12z" fill="#138808" />
      <circle cx="12.5" cy="11" fill="none" r="1.6" stroke="#1A3C8C" strokeWidth="0.9" />
      <path d="M12.5 9.4v3.2M10.9 11h3.2M11.35 9.85l2.3 2.3M13.65 9.85l-2.3 2.3" stroke="#1A3C8C" strokeWidth="0.7" />
    </svg>
  );
}
