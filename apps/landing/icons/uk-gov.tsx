import React from "react";

/** NHS — Blue cross/plus symbol (healthcare) */
export const NHSIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
      <path
        d="M4.5 4.5H6.5L8 8.5L8 4.5H10L10 11.5H8L6.5 7.5V11.5H4.5V4.5Z"
        fill="white"
      />
    </svg>
  );
};

/** MOD — Shield shape (defence) */
export const MODIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 1L2 3.5V8C2 11.5 4.5 14.5 8 16C11.5 14.5 14 11.5 14 8V3.5L8 1Z"
        fill="currentColor"
      />
      <path
        d="M8 3L4 5V8.5C4 10.8 5.8 13 8 14C10.2 13 12 10.8 12 8.5V5L8 3Z"
        fill="white"
        fillOpacity="0.25"
      />
      <path
        d="M6 7.5L7.5 9L10.5 6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** HMRC — Crown symbol (tax/revenue) */
export const HMRCIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3 12H13V14H3V12Z"
        fill="currentColor"
      />
      <path
        d="M2 11L4 4L6 7L8 3L10 7L12 4L14 11H2Z"
        fill="currentColor"
      />
      <circle cx="8" cy="2.5" r="1.5" fill="currentColor" />
    </svg>
  );
};

/** HomeOffice — Building/house shape (government) */
export const HomeOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2 7L8 2L14 7V14H2V7Z"
        fill="currentColor"
      />
      <rect x="6" y="9" width="4" height="5" rx="0.5" fill="white" />
      <rect x="4" y="7.5" width="2" height="2" rx="0.3" fill="white" fillOpacity="0.5" />
      <rect x="10" y="7.5" width="2" height="2" rx="0.3" fill="white" fillOpacity="0.5" />
    </svg>
  );
};

/** CrownCommercial — Crown with circle (procurement) */
export const CrownCommercialIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M4.5 10.5L5.5 6L7 8L8 5L9 8L10.5 6L11.5 10.5H4.5Z"
        fill="currentColor"
      />
      <circle cx="8" cy="4" r="1" fill="currentColor" />
    </svg>
  );
};

/** CabinetOffice — Portcullis-style icon (parliament/government) */
export const CabinetOfficeIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3 6C3 3.24 5.24 1 8 1C10.76 1 13 3.24 13 6V7H3V6Z"
        fill="currentColor"
      />
      {/* Vertical bars */}
      <rect x="5" y="7" width="1.2" height="7" fill="currentColor" />
      <rect x="7.4" y="7" width="1.2" height="7" fill="currentColor" />
      <rect x="9.8" y="7" width="1.2" height="7" fill="currentColor" />
      {/* Horizontal bars */}
      <rect x="4" y="9" width="8" height="1" fill="currentColor" />
      <rect x="4" y="11.5" width="8" height="1" fill="currentColor" />
    </svg>
  );
};

/** FindATender — Magnifying glass with document (search) */
export const FindATenderIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line
        x1="10.5"
        y1="10.5"
        x2="14"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="5" y1="5.5" x2="9" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="5" y1="7.5" x2="8" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};

/** ContractsFinder — Document with checkmark (contracts) */
export const ContractsFinderIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 1.5H10L12.5 4V13.5C12.5 14.05 12.05 14.5 11.5 14.5H4C3.45 14.5 3 14.05 3 13.5V2.5C3 1.95 3.45 1.5 4 1.5Z"
        fill="currentColor"
      />
      <path d="M10 1.5V4H12.5" fill="white" fillOpacity="0.3" />
      <path
        d="M6 9L7.5 10.5L10.5 7"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** DfE — Book/education symbol */
export const DfEIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 3C6 2 3.5 1.5 1.5 2V12.5C3.5 12 6 12.5 8 13.5C10 12.5 12.5 12 14.5 12.5V2C12.5 1.5 10 2 8 3Z"
        fill="currentColor"
      />
      <line x1="8" y1="3.5" x2="8" y2="13" stroke="white" strokeWidth="0.8" />
      <line x1="4" y1="5" x2="7" y2="5.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="4" y1="7" x2="7" y2="7.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="4" y1="9" x2="7" y2="9.5" stroke="white" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
};

/** DfT — Road/transport symbol */
export const DfTIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1 14L5 2H11L15 14H1Z"
        fill="currentColor"
      />
      <line x1="8" y1="5" x2="8" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="9" x2="8" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="13" x2="10.5" y2="13" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
};

/** Cloudflare — Shield with cloud (security/infra) */
export const CloudflareIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 1L2 3.5V7.5C2 11 4.5 14 8 15.5C11.5 14 14 11 14 7.5V3.5L8 1Z"
        fill="currentColor"
      />
      <path
        d="M5.5 9.5C5.5 9.5 5.5 7.5 7.5 7.5C7.5 6 9 5.5 10 6.5C11 6 12 7 11.5 8C12.5 8 12.5 9.5 11.5 9.5H5.5Z"
        fill="white"
      />
    </svg>
  );
};

/** Google Sheets icon */
export const GoogleSheetsIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 1H10L13 4V13.5C13 14.33 12.33 15 11.5 15H4C3.17 15 2.5 14.33 2.5 13.5V2.5C2.5 1.67 3.17 1 4 1Z"
        fill="#0F9D58"
      />
      <path d="M10 1V4H13" fill="#87CEAC" />
      <rect x="4.5" y="7" width="6.5" height="5.5" rx="0.5" fill="white" />
      <line x1="4.5" y1="9" x2="11" y2="9" stroke="#0F9D58" strokeWidth="0.5" />
      <line x1="4.5" y1="11" x2="11" y2="11" stroke="#0F9D58" strokeWidth="0.5" />
      <line x1="7.5" y1="7" x2="7.5" y2="12.5" stroke="#0F9D58" strokeWidth="0.5" />
    </svg>
  );
};

/** GDPR — Lock with EU stars (compliance) */
export const GDPRIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* Lock body */}
      <rect x="5.5" y="7.5" width="5" height="4" rx="0.8" fill="currentColor" />
      {/* Lock shackle */}
      <path
        d="M6.5 7.5V6C6.5 5.17 7.17 4.5 8 4.5C8.83 4.5 9.5 5.17 9.5 6V7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Stars at 12, 3, 6, 9 o'clock positions */}
      <circle cx="8" cy="1.8" r="0.6" fill="currentColor" />
      <circle cx="14.2" cy="8" r="0.6" fill="currentColor" />
      <circle cx="8" cy="14.2" r="0.6" fill="currentColor" />
      <circle cx="1.8" cy="8" r="0.6" fill="currentColor" />
    </svg>
  );
};
