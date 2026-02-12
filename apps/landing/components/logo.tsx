import Link from "next/link";

export const LogoSVG = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="13" cy="13" r="9" stroke="currentColor" strokeWidth="2.5" />
      <line
        x1="19.5"
        y1="19.5"
        x2="28"
        y2="28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="13" cy="13" r="3" fill="currentColor" opacity="0.35" />
    </svg>
  );
};

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-2">
      <LogoSVG className="text-brand" />
      <span className="text-2xl font-medium">
        Tend<span className="text-brand">Hunt</span>
      </span>
    </Link>
  );
};
