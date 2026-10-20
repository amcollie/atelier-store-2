import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </Icon>
);

export const BagIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 8h15l-1 12.5h-13z" />
    <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
  </Icon>
);

export const UserIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
  </Icon>
);

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 8h17M3.5 16h17" />
  </Icon>
);

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
  </Icon>
);

export const ArrowIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />
  </Icon>
);
