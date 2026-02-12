"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

const BRAND = "#f17463";

/* ─── Signal card data ─── */
const signals = [
  {
    title: "New £2.4M IT Contract",
    source: "NHS England",
    color: BRAND,
    logo: "/logos/orgs/nhs-england.png",
    iconD:
      "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
    top: "12%",
    right: "4%",
    details: {
      value: "£2,400,000",
      sector: "Health & Social Care",
      region: "London",
      deadline: "14 Mar 2026",
      ref: "CF-2026-NHS-00847",
      score: 94,
      description:
        "Digital transformation of patient record systems across 12 NHS trusts. Includes cloud migration, API integration, and 3-year support contract.",
    },
  },
  {
    title: "Board Minutes Signal",
    source: "Transport for Greater Manchester",
    color: "#F59E0B",
    logo: "/logos/orgs/manchester.png",
    iconD:
      "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M8 2h8v4H8z",
    top: "48%",
    right: "38%",
    details: {
      value: "Est. £800K–£1.2M",
      sector: "Transport",
      region: "North West",
      deadline: "Pre-tender",
      ref: "Signal detected 2h ago",
      score: 78,
      description:
        'Board approved budget for "smart ticketing upgrade" across Metrolink. Procurement expected Q2 2026.',
    },
  },
  {
    title: "Contract Expiring",
    source: "Kent County Council",
    color: "#EF4444",
    logo: "/logos/orgs/kent.png",
    iconD: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 6v6l4 2",
    top: "6%",
    right: "22%",
    details: {
      value: "£3,100,000",
      sector: "IT & Digital",
      region: "South East",
      deadline: "Expires 30 Jun 2026",
      ref: "KCC-ICT-2022-0391",
      score: 87,
      description:
        "Current managed services contract with Capita expires in 4 months. Incumbent unlikely to renew. Re-tender expected imminently.",
    },
  },
  {
    title: "Budget +£1.8M",
    source: "West Midlands Combined Authority",
    color: "#22C55E",
    logo: "/logos/orgs/west-midlands-combined-authority.png",
    iconD:
      "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    top: "64%",
    right: "32%",
    details: {
      value: "+£1,800,000",
      sector: "Economic Development",
      region: "West Midlands",
      deadline: "Budget allocated",
      ref: "WMCA-2026-FIN-Q1",
      score: 71,
      description:
        "New funding allocated for regional skills and employment programmes. Likely to trigger 3–5 procurement rounds in H2 2026.",
    },
  },
  {
    title: "Buyer Intel",
    source: "Leeds City Council",
    color: "#3B82F6",
    logo: "/logos/orgs/leeds.png",
    iconD:
      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    top: "32%",
    right: "2%",
    details: {
      value: "Contact revealed",
      sector: "Environmental Services",
      region: "Yorkshire",
      deadline: "Active buyer",
      ref: "1 credit used",
      score: 82,
      description:
        "Sarah Chen, Head of Procurement — responsible for £4.2M waste management contract renewal. LinkedIn and direct email available.",
    },
  },
];

/* ─── UK map SVG paths (correct format from Natural Earth 50m) ─── */
const ukPaths = [
  // Great Britain mainland
  "M266.6,547.0 L262.9,549.4 L251.1,551.9 L246.0,554.4 L237.1,560.1 L221.9,559.2 L211.9,551.8 L205.5,548.8 L202.8,548.5 L200.1,549.4 L194.2,550.3 L188.3,550.1 L191.3,546.7 L195.4,544.8 L186.2,543.5 L183.6,542.5 L180.7,540.1 L173.4,539.7 L170.0,540.3 L164.1,543.5 L154.9,546.8 L143.8,542.2 L141.6,540.1 L141.6,536.2 L140.0,533.1 L136.9,532.0 L140.8,527.9 L145.6,525.2 L156.1,522.6 L171.9,516.2 L180.8,513.5 L189.1,508.8 L192.5,506.0 L195.0,502.1 L197.5,497.3 L201.0,493.4 L197.6,492.5 L196.1,489.5 L196.5,486.6 L198.0,483.9 L196.6,480.6 L194.1,477.2 L194.3,474.5 L194.9,471.6 L188.5,471.8 L182.2,472.7 L176.4,474.7 L170.8,477.5 L165.8,478.0 L168.1,473.0 L173.7,469.1 L179.7,465.9 L181.9,463.4 L183.6,460.5 L186.6,458.2 L194.4,453.9 L209.5,449.0 L211.8,448.7 L217.7,449.3 L223.5,448.6 L228.6,446.8 L233.7,446.4 L245.1,451.5 L241.7,443.6 L246.8,441.8 L254.1,448.9 L256.8,449.6 L262.5,448.6 L260.3,447.4 L257.7,447.3 L254.3,446.2 L251.5,444.0 L246.8,436.8 L247.0,432.5 L250.2,428.0 L253.7,423.9 L250.8,423.1 L248.4,421.5 L247.7,417.4 L248.7,413.8 L255.0,410.6 L256.9,405.8 L257.7,400.4 L256.6,398.0 L250.3,398.4 L247.3,399.4 L244.5,401.0 L241.7,400.9 L233.9,395.0 L229.5,390.5 L221.5,381.1 L220.4,375.4 L226.8,363.2 L236.6,355.4 L248.2,352.7 L245.9,352.2 L228.3,352.1 L222.5,353.1 L217.1,356.2 L214.0,357.2 L210.8,357.6 L207.9,359.2 L205.1,361.4 L202.1,362.8 L196.2,362.4 L193.4,362.9 L191.3,361.6 L189.6,359.5 L187.3,358.9 L184.8,359.6 L179.5,362.4 L174.1,364.1 L167.6,362.3 L159.1,359.0 L155.5,363.3 L154.4,368.1 L148.4,363.9 L143.2,358.3 L141.5,354.8 L141.4,350.8 L144.2,349.3 L147.2,350.7 L151.7,341.3 L160.8,329.0 L163.9,325.4 L166.2,320.8 L165.8,317.7 L163.8,315.1 L155.4,309.2 L155.5,304.4 L156.4,299.0 L158.7,295.8 L170.8,295.2 L166.5,293.6 L157.8,288.7 L160.0,282.4 L157.2,285.0 L153.6,290.0 L151.5,291.2 L145.4,292.4 L144.3,294.9 L140.2,295.8 L139.3,298.1 L137.7,295.8 L137.6,291.6 L138.9,287.8 L141.2,284.8 L150.2,278.1 L145.8,280.1 L135.9,286.4 L130.8,290.5 L129.1,293.1 L131.4,301.7 L130.7,305.1 L122.2,327.3 L120.6,329.5 L117.7,330.9 L113.5,330.5 L111.6,328.8 L112.4,324.1 L115.9,313.6 L117.5,310.7 L119.7,308.0 L124.8,303.2 L121.3,303.8 L118.9,302.6 L119.5,288.4 L122.2,283.8 L123.3,277.0 L125.6,271.2 L128.3,267.0 L130.4,261.6 L133.5,259.2 L134.4,255.6 L137.9,251.6 L140.6,247.4 L121.8,258.7 L117.4,260.6 L111.4,260.1 L106.8,258.9 L103.2,256.3 L101.6,251.4 L97.1,251.3 L93.3,250.4 L98.3,247.1 L106.1,246.2 L113.5,241.9 L106.9,239.0 L113.2,235.6 L120.4,227.4 L121.9,219.8 L118.4,216.2 L117.2,213.8 L110.3,211.2 L109.1,207.9 L112.2,204.2 L115.6,202.8 L120.9,201.4 L116.1,200.0 L114.3,198.3 L112.9,195.8 L115.3,187.9 L116.7,185.3 L119.6,181.9 L132.5,182.1 L135.5,180.6 L142.1,181.9 L130.3,172.5 L132.4,166.6 L132.2,162.6 L136.5,160.3 L147.0,160.4 L149.6,159.7 L148.4,157.6 L146.0,154.9 L145.5,152.6 L146.2,146.5 L149.2,142.0 L151.2,141.1 L153.8,140.7 L159.5,141.6 L161.7,142.7 L164.2,145.2 L173.3,142.2 L175.4,141.8 L178.3,145.1 L190.6,142.5 L207.0,141.3 L216.9,139.6 L227.3,139.0 L237.0,137.1 L247.3,138.0 L247.2,140.7 L244.5,144.9 L244.9,149.7 L243.2,152.9 L239.4,156.3 L229.5,161.0 L211.3,172.0 L200.5,177.4 L199.0,180.0 L198.2,183.6 L204.7,184.4 L207.1,185.6 L205.6,187.4 L196.1,193.8 L193.3,199.6 L200.6,199.4 L206.6,198.3 L218.6,194.7 L229.9,192.0 L235.3,191.9 L245.8,194.0 L248.2,194.1 L252.7,193.1 L257.2,193.0 L287.8,193.6 L296.3,192.4 L301.9,193.9 L306.6,197.6 L311.1,204.5 L308.3,208.8 L303.3,212.8 L299.0,218.2 L297.7,221.2 L296.9,224.4 L295.5,227.4 L287.0,241.3 L278.7,249.0 L275.0,254.5 L270.4,258.9 L266.0,261.7 L261.2,263.5 L247.6,265.5 L243.8,266.9 L239.3,269.3 L234.5,270.5 L240.1,270.3 L245.6,269.0 L255.7,268.5 L267.4,273.1 L266.3,276.9 L261.6,279.9 L251.0,280.3 L241.1,287.0 L236.6,289.0 L231.9,290.1 L226.0,289.8 L215.2,288.0 L210.5,286.1 L214.8,289.1 L219.6,290.7 L247.6,294.5 L258.2,290.1 L270.0,290.1 L292.6,297.3 L299.2,302.9 L308.5,310.8 L313.6,313.9 L317.2,316.7 L319.5,320.9 L323.9,334.9 L328.9,348.5 L335.4,363.2 L338.4,367.3 L342.3,370.2 L362.0,376.8 L366.4,378.9 L374.1,385.3 L381.5,392.0 L388.4,397.2 L395.8,401.4 L392.2,403.6 L389.7,407.1 L391.6,411.7 L394.6,416.2 L400.5,423.3 L405.8,431.1 L403.8,429.9 L401.8,429.3 L399.0,429.5 L396.3,429.1 L391.3,426.7 L386.5,423.7 L376.9,424.9 L371.6,424.4 L367.0,424.4 L375.7,426.2 L385.3,426.3 L406.4,439.4 L413.5,447.1 L417.8,457.3 L414.9,461.9 L410.4,464.9 L406.2,468.3 L402.3,472.2 L414.0,477.8 L416.5,477.7 L419.1,476.9 L421.6,474.9 L425.8,470.3 L427.9,468.6 L435.2,468.0 L441.3,468.4 L447.4,469.4 L452.8,469.1 L463.6,471.1 L469.1,472.9 L482.8,481.0 L485.8,485.5 L487.2,491.3 L487.3,497.6 L485.0,503.5 L482.4,508.8 L480.7,515.6 L479.6,518.0 L477.9,519.9 L470.7,525.3 L465.8,527.5 L463.8,526.5 L461.6,526.7 L463.7,530.7 L463.7,534.0 L459.4,536.5 L455.1,537.5 L447.8,536.2 L437.6,540.8 L444.9,543.1 L446.4,545.6 L444.5,550.0 L440.0,552.0 L434.9,552.8 L429.7,553.0 L425.4,554.1 L421.2,556.2 L426.4,555.1 L430.0,556.0 L432.3,559.7 L434.3,560.8 L444.5,562.4 L450.7,562.3 L462.9,561.5 L468.7,561.5 L470.7,562.1 L470.8,565.2 L469.9,572.7 L468.3,574.3 L452.2,580.6 L448.9,585.0 L448.0,587.7 L438.6,587.2 L434.2,590.0 L426.6,591.9 L420.7,593.9 L415.0,596.4 L410.3,597.2 L389.8,594.2 L377.5,594.4 L360.7,597.0 L356.4,596.6 L350.0,594.1 L343.4,592.4 L335.7,591.7 L329.2,589.3 L333.3,593.8 L324.2,598.1 L320.0,598.9 L315.6,598.8 L306.7,599.9 L298.4,599.4 L299.7,602.4 L301.9,605.0 L300.1,606.2 L282.5,604.5 L280.3,604.9 L278.3,606.7 L272.6,605.7 L267.1,602.6 L261.2,600.5 L255.0,599.5 L250.0,599.9 L229.8,604.8 L225.7,609.7 L223.7,616.7 L220.8,622.9 L216.0,627.7 L210.3,628.3 L205.0,625.0 L194.8,621.3 L191.4,618.9 L189.1,619.6 L185.2,620.7 L181.0,620.8 L174.7,621.8 L163.6,624.7 L159.1,626.7 L149.5,632.3 L147.6,633.8 L144.1,639.4 L138.7,640.4 L133.9,636.8 L128.3,635.6 L122.4,636.8 L118.9,638.7 L117.2,637.2 L117.2,634.0 L121.5,630.2 L132.9,627.3 L142.9,619.9 L147.8,615.3 L149.8,612.8 L152.2,611.1 L155.3,610.5 L156.9,607.7 L170.9,596.4 L172.0,593.8 L172.7,589.1 L173.8,584.6 L185.2,581.7 L190.6,572.3 L207.9,569.9 L219.6,570.0 L231.2,571.8 L237.2,572.0 L243.2,571.4 L247.9,568.8 L255.9,559.7 L260.5,555.6 L265.6,552.0 L270.5,547.8 L278.3,540.1 L273.0,542.8 L266.6,547.0 Z",
  // Anglesey
  "M190.2,447.9 L192.3,449.0 L197.5,448.8 L195.8,451.2 L190.0,453.9 L186.1,456.6 L181.3,458.8 L179.1,456.3 L176.4,456.4 L172.3,451.5 L171.6,444.1 L176.9,442.2 L184.2,442.3 L190.2,447.9 Z",
  // Northern Ireland
  "M89.1,403.2 L84.8,402.8 L81.8,403.8 L79.9,404.8 L72.6,405.0 L67.5,404.9 L67.7,398.8 L61.7,396.9 L59.9,395.8 L57.1,392.7 L56.1,389.1 L53.2,386.5 L49.6,384.6 L47.5,384.5 L43.3,387.6 L39.9,390.7 L42.2,394.4 L40.3,395.8 L34.7,399.2 L32.2,401.3 L29.5,400.3 L22.8,400.5 L19.7,399.9 L16.1,397.4 L7.3,395.8 L5.8,391.8 L-5.9,384.2 L-7.2,381.9 L-2.2,378.4 L10.3,375.0 L12.3,373.6 L9.0,371.0 L5.7,369.5 L4.5,367.6 L6.4,366.5 L10.1,366.4 L13.1,366.9 L15.5,365.9 L19.7,364.8 L22.5,363.5 L24.9,360.2 L27.4,357.2 L29.9,349.8 L39.1,344.6 L41.1,346.7 L45.0,347.2 L48.5,345.3 L52.6,339.4 L55.6,339.0 L58.8,339.5 L65.1,338.7 L76.2,335.9 L81.2,335.9 L88.3,337.4 L93.5,337.3 L98.2,341.6 L100.7,348.3 L106.5,354.9 L114.2,360.6 L114.5,364.2 L111.7,366.1 L106.0,368.4 L106.1,370.9 L109.8,369.7 L113.1,369.1 L120.9,369.6 L123.6,372.2 L125.5,376.0 L126.5,379.2 L125.8,382.6 L123.7,381.5 L121.6,378.4 L119.2,377.0 L116.4,376.3 L117.7,380.5 L117.2,386.1 L122.1,386.7 L119.7,392.4 L114.6,394.0 L108.7,394.6 L107.3,396.6 L106.2,399.2 L103.1,403.1 L99.0,405.3 L94.0,404.9 L89.1,403.2 Z",
  // Isle of Wight
  "M346.7,601.4 L342.5,603.4 L341.2,605.8 L337.4,607.3 L334.7,607.3 L324.2,602.6 L321.8,602.8 L324.2,600.6 L330.7,598.9 L334.4,596.5 L342.8,598.8 L346.7,601.4 Z",
  // Isle of Man
  "M144.7,323.8 L138.4,323.9 L136.1,323.4 L133.4,321.9 L130.4,313.9 L131.5,311.1 L134.1,308.6 L137.4,308.2 L140.7,309.7 L144.8,316.5 L145.3,321.2 L144.7,323.8 Z",
];

/* City dot positions within the SVG viewBox (500x700) */
const cityDots = [
  { x: 394, y: 554, r: 5, delay: 0 }, // London
  { x: 288, y: 439, r: 3.5, delay: 0.4 }, // Manchester
  { x: 305, y: 497, r: 3.5, delay: 0.8 }, // Birmingham
  { x: 241, y: 294, r: 3, delay: 1.2 }, // Edinburgh
  { x: 323, y: 420, r: 2.5, delay: 0.6 }, // Leeds
  { x: 319, y: 351, r: 2.5, delay: 1.0 }, // Newcastle
  { x: 241, y: 555, r: 2.5, delay: 1.6 }, // Cardiff
  { x: 271, y: 557, r: 2.5, delay: 1.8 }, // Bristol
  { x: 187, y: 300, r: 2.5, delay: 1.4 }, // Glasgow
  { x: 103, y: 373, r: 2.5, delay: 2.0 }, // Belfast
];

/* Network connection lines */
const networkLines = [
  [394, 554, 305, 497],
  [394, 554, 271, 557],
  [305, 497, 288, 439],
  [305, 497, 323, 420],
  [288, 439, 323, 420],
  [288, 439, 319, 351],
  [319, 351, 241, 294],
  [241, 294, 187, 300],
  [187, 300, 103, 373],
  [394, 554, 323, 420],
  [305, 497, 241, 555],
];

/* ─── Score badge color helper ─── */
const scoreColor = (score: number) => {
  if (score >= 90) return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
  if (score >= 75) return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
  return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800";
};

/* ─── Signal card sub-component with hover expand ─── */
const SignalCard = ({
  title,
  source,
  iconD,
  color,
  logo,
  style,
  delay,
  details,
  autoExpanded,
  onUserHover,
}: {
  title: string;
  source: string;
  iconD: string;
  color: string;
  logo?: string;
  style: React.CSSProperties;
  delay: number;
  details: {
    value: string;
    sector: string;
    region: string;
    deadline: string;
    ref: string;
    score: number;
    description: string;
  };
  autoExpanded: boolean;
  onUserHover: (active: boolean) => void;
}) => {
  const [manualHover, setManualHover] = useState(false);
  const expanded = manualHover || autoExpanded;

  return (
    <motion.div
      className="absolute hidden md:block"
      style={{ ...style, zIndex: expanded ? 50 : 20 }}
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.9 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      <motion.div
        animate={expanded ? { y: 0 } : { y: [0, -4, 0] }}
        transition={
          expanded
            ? { duration: 0.15, ease: "easeOut" }
            : { duration: 5 + delay * 0.4, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div
          className="pointer-events-auto relative cursor-pointer"
          onMouseEnter={() => { setManualHover(true); onUserHover(true); }}
          onMouseLeave={() => { setManualHover(false); onUserHover(false); }}
        >
          {/* Collapsed card — always visible */}
          <motion.div
            animate={{
              scale: expanded ? 1.03 : 1,
              boxShadow: expanded
                ? "0 8px 30px rgba(0,0,0,0.12)"
                : "0 4px 12px rgba(0,0,0,0.06)",
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.07]"
          >
            <div className="mb-0.5 flex items-center gap-1.5">
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  className="size-4 shrink-0 rounded-sm object-contain"
                />
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={iconD} />
                </svg>
              )}
              <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap text-gray-900 dark:text-white">
                {title}
              </span>
            </div>
            <span className="block max-w-[180px] truncate pl-5 text-[9px] text-gray-500 dark:text-white/50">
              {source}
            </span>
          </motion.div>

          {/* Expanded detail panel — absolutely positioned below */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -2 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full left-0 z-50 pt-1.5"
              >
                <div className="w-[260px] rounded-lg border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/95">
                  {/* Value + Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {details.value}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${scoreColor(details.score)}`}
                    >
                      {details.score}% match
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mt-1.5 text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
                    {details.description}
                  </p>

                  {/* Meta grid */}
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    <MetaRow label="Sector" value={details.sector} />
                    <MetaRow label="Region" value={details.region} />
                    <MetaRow label="Deadline" value={details.deadline} />
                    <MetaRow label="Ref" value={details.ref} />
                  </div>

                  {/* CTA hint */}
                  <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2 dark:border-white/5">
                    <div
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[9px] text-gray-400 dark:text-gray-500">
                      Click to view full details
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-[9px] font-medium tracking-wide text-gray-400 uppercase dark:text-gray-500">
      {label}
    </span>
    <p className="truncate text-[10px] font-medium text-gray-700 dark:text-gray-300">
      {value}
    </p>
  </div>
);

/* ─── Main exported component — background map illustration for hero ─── */
export const HeroImage = () => {
  const [autoIndex, setAutoIndex] = useState(-1);
  const [userHovering, setUserHovering] = useState(false);
  // Which signal indices are currently visible (appear one by one)
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());
  // Track whether initial stagger is done
  const [staggerDone, setStaggerDone] = useState(false);

  // Phase 1: Stagger signals in one by one (shuffled order each mount)
  useEffect(() => {
    // Fisher-Yates shuffle for random entrance order
    const order = signals.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    order.forEach((signalIdx, step) => {
      timers.push(
        setTimeout(() => {
          setVisibleSet((prev) => new Set([...prev, signalIdx]));
          if (step === order.length - 1) {
            setTimeout(() => setStaggerDone(true), 1500);
          }
        }, 800 + step * 1800),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Phase 2: After stagger, cycle signals (remove one, wait, add another)
  useEffect(() => {
    if (!staggerDone || userHovering) return;

    const cycleDuration = 3000 + Math.random() * 2000; // 3–5s between swaps
    const timer = setTimeout(() => {
      setVisibleSet((prev) => {
        const arr = [...prev];
        if (arr.length === 0) return prev;
        // Remove a random visible signal
        const removeIdx = arr[Math.floor(Math.random() * arr.length)];
        const next = new Set(arr.filter((x) => x !== removeIdx));
        // After a brief gap, add a hidden signal back
        setTimeout(() => {
          setVisibleSet((current) => {
            const hidden = signals
              .map((_, i) => i)
              .filter((i) => !current.has(i));
            if (hidden.length === 0) return current;
            const addIdx = hidden[Math.floor(Math.random() * hidden.length)];
            return new Set([...current, addIdx]);
          });
        }, 1200 + Math.random() * 800);
        return next;
      });
    }, cycleDuration);

    return () => clearTimeout(timer);
  }, [staggerDone, userHovering, visibleSet]);

  // Auto-expand: rotate expanded state among VISIBLE signals
  useEffect(() => {
    if (!staggerDone || userHovering) return;

    const showDuration = 3500 + Math.random() * 1500;
    const timer = setTimeout(() => {
      setAutoIndex((prev) => {
        const visible = [...visibleSet];
        if (visible.length === 0) return -1;
        const candidates = visible.filter((i) => i !== prev);
        if (candidates.length === 0) return visible[0];
        return candidates[Math.floor(Math.random() * candidates.length)];
      });
    }, showDuration);

    return () => clearTimeout(timer);
  }, [autoIndex, staggerDone, userHovering, visibleSet]);

  const handleUserHover = useCallback((active: boolean) => {
    setUserHovering(active);
    if (active) setAutoIndex(-1);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {/* Clipped layer for map + gradient (prevents SVG from bleeding out) */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Soft gradient fade on left edge so map doesn't compete with text */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-white via-white/80 to-transparent md:via-white/60 dark:from-neutral-950 dark:via-neutral-950/80 md:dark:via-neutral-950/60" />

        {/* The SVG map — positioned to the right */}
        <div className="absolute -top-[5%] right-[-8%] h-[110%] w-[80%] md:right-[-2%] md:w-[58%]">
        <svg
          viewBox="0 0 500 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
        >
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={BRAND} stopOpacity="0.12" />
              <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
            </radialGradient>
            {/* Subtle fill gradient for the map shape */}
            <linearGradient
              id="mapFill"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={BRAND} stopOpacity="0.04" />
              <stop offset="100%" stopColor={BRAND} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Glow behind the map */}
          <circle cx="250" cy="400" r="280" fill="url(#heroGlow)" />

          {/* Map outline with subtle fill */}
          <g>
            {ukPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                strokeWidth="1.8"
                className="fill-brand/[0.06] stroke-brand/30 dark:fill-white/[0.03] dark:stroke-white/[0.15]"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Network lines */}
          <g strokeWidth="0.8" fill="none">
            {networkLines.map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-brand/20 dark:stroke-white/[0.08]"
                strokeDasharray="4 4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-8"
                  dur={`${3 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
              </line>
            ))}
          </g>

          {/* Animated city dots */}
          {cityDots.map((dot, i) => (
            <g key={i}>
              {/* Pulse ring */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill={BRAND}
                opacity="0"
              >
                <animate
                  attributeName="r"
                  values={`${dot.r};${dot.r * 5}`}
                  dur="3s"
                  begin={`${dot.delay}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0"
                  dur="3s"
                  begin={`${dot.delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Second pulse, offset */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill={BRAND}
                opacity="0"
              >
                <animate
                  attributeName="r"
                  values={`${dot.r};${dot.r * 5}`}
                  dur="3s"
                  begin={`${dot.delay + 1.5}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.25;0"
                  dur="3s"
                  begin={`${dot.delay + 1.5}s`}
                  repeatCount="indefinite"
                />
              </circle>
              {/* Core dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill={BRAND}
                opacity="0.9"
              />
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.r * 0.4}
                fill="white"
                opacity="0.8"
              />
            </g>
          ))}
        </svg>
      </div>
      </div>

      {/* Signal cards — appear one by one, cycle in/out */}
      <AnimatePresence>
        {signals.map((s, i) =>
          visibleSet.has(i) ? (
            <SignalCard
              key={`signal-${i}`}
              title={s.title}
              source={s.source}
              iconD={s.iconD}
              color={s.color}
              logo={s.logo}
              delay={0}
              details={s.details}
              autoExpanded={autoIndex === i && !userHovering}
              onUserHover={handleUserHover}
              style={{
                ...(s.top ? { top: s.top } : {}),
                ...(s.right ? { right: s.right } : {}),
              }}
            />
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
};
