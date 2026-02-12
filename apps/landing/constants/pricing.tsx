import { CheckIcon } from "@/icons/card-icons";
import { CloseIcon } from "@/icons/general";

export enum TierName {
  TIER_1 = "Scout",
  TIER_2 = "Hunter",
  TIER_3 = "Enterprise",
}

export const tiers = [
  {
    title: TierName.TIER_1,
    subtitle: "For individual business developers",
    monthly: 0,
    yearly: 0,
    ctaText: "Join Waitlist",
    ctaLink: "#waitlist",
    features: [
      "10 credits/month",
      "Search 200K+ contracts",
      "Basic filters",
      "Email alerts",
      "1 user seat",
    ],
  },
  {
    title: TierName.TIER_2,
    subtitle: "For growing sales teams",
    monthly: 0,
    yearly: 0,
    ctaText: "Join Waitlist",
    ctaLink: "#waitlist",
    features: [
      "50 credits/month",
      "Everything in Scout",
      "Advanced filters & AI scoring",
      "Buyer intelligence",
      "Priority support",
      "5 user seats",
    ],
    featured: true,
  },
  {
    title: TierName.TIER_3,
    subtitle: "For large organizations",
    monthly: 0,
    yearly: 0,
    ctaText: "Join Waitlist",
    ctaLink: "#waitlist",
    features: [
      "Custom credits",
      "Everything in Hunter",
      "API access",
      "Dedicated account manager",
      "SSO & team management",
      "Unlimited seats",
    ],
  },
];

export const pricingTable = [
  {
    title: "Credits per Month",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "10",
      },
      {
        title: TierName.TIER_2,
        value: "50",
      },
      {
        title: TierName.TIER_3,
        value: "Custom",
      },
    ],
  },
  {
    title: "Contract Search",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "200K+",
      },
      {
        title: TierName.TIER_2,
        value: "200K+",
      },
      {
        title: TierName.TIER_3,
        value: "200K+",
      },
    ],
  },
  {
    title: "Basic Filters",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Advanced Filters",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "AI Vibe Scanner Scoring",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Buyer Intelligence",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Email Alerts",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "User Seats",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "1",
      },
      {
        title: TierName.TIER_2,
        value: "5",
      },
      {
        title: TierName.TIER_3,
        value: "Unlimited",
      },
    ],
  },
  {
    title: "API Access",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "SSO & Team Management",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Dedicated Account Manager",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Priority Support",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Credit Rollover",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Buying Signal Alerts",
    tiers: [
      {
        title: TierName.TIER_1,
        value: <CloseIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_2,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
      {
        title: TierName.TIER_3,
        value: <CheckIcon className="mx-auto size-5 text-gray-600" />,
      },
    ],
  },
  {
    title: "Export & Reporting",
    tiers: [
      {
        title: TierName.TIER_1,
        value: "Basic",
      },
      {
        title: TierName.TIER_2,
        value: "Advanced",
      },
      {
        title: TierName.TIER_3,
        value: "Custom",
      },
    ],
  },
];
