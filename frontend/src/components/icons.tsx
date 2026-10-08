import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export const BagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const SendIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
  </svg>
);

export const ChatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 5h14v10H9l-4 4V5Z" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c1-3.2 3.5-5 6.5-5s5.5 1.8 6.5 5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.3 3.6 5" />
  </svg>
);

export const BuildingIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 21V5l8-2v18M12 8l8 2v11M2 21h20" />
    <path d="M7.5 8h1M7.5 12h1M7.5 16h1M15.5 13h1M15.5 17h1" />
  </svg>
);

export const HeadsetIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="13" width="4" height="6" rx="1.5" />
    <rect x="17" y="13" width="4" height="6" rx="1.5" />
    <path d="M19 19c0 1.5-2 2.5-5 2.5" />
  </svg>
);

export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
    <path d="M3 7.5 12 12l9-4.5M12 12v9" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
);

export const ReceiptIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
);

export const StoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9h16l-1.5-5h-13L4 9Z" />
    <path d="M5 9v11h14V9M10 20v-5h4v5" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="2" />
    <path d="m21 16-5-5-9 9" />
  </svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const ArrowDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const UserPlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="4" />
    <path d="M2 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5M19 8v6M16 11h6" />
  </svg>
);
