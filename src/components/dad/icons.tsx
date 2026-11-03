import type { ReactNode, SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export const IconOk = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01" />
  </Icon>
);
export const IconSoSo = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 15h7M9 9.5h.01M15 9.5h.01" />
  </Icon>
);
export const IconNotGood = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 16.5s1.5-2.5 4-2.5 4 2.5 4 2.5M9 9.5h.01M15 9.5h.01" />
  </Icon>
);
export const IconMic = () => (
  <Icon>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Icon>
);
export const IconPill = () => (
  <Icon>
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" />
    <path d="m9.2 7.9 5.6 8.2" />
  </Icon>
);
export const IconHelp = () => (
  <Icon>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 10v4M12 17.5h.01" />
  </Icon>
);
export const IconWalk = () => (
  <Icon>
    <circle cx="13" cy="4" r="2" />
    <path d="m9 21 3-6 3 3v3M7 12l3-4 4 2 3 3M10 8l-1 6" />
  </Icon>
);
export const IconCheck = () => (
  <Icon>
    <path d="m5 12 5 5 9-10" />
  </Icon>
);
export const IconClose = () => (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);
export const IconBack = () => (
  <Icon>
    <path d="M15 5 8 12l7 7" />
  </Icon>
);
export const IconPhone = () => (
  <Icon>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);
export const IconSpeaker = () => (
  <Icon width={20} height={20}>
    <path d="M11 5 6 9H2v6h4l5 4z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </Icon>
);
