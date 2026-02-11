interface EnrichmentBadgeProps {
  score: number; // 0-100
  size?: "sm" | "md"; // sm=32px, md=48px
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e"; // green
  if (score >= 40) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export function EnrichmentBadge({ score, size = "md" }: EnrichmentBadgeProps) {
  const dimension = size === "sm" ? 32 : 48;
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fontSize = size === "sm" ? 10 : 14;

  const isEmpty = !score || score === 0;
  const normalizedScore = Math.min(100, Math.max(0, score || 0));
  const dashOffset = circumference - (normalizedScore / 100) * circumference;
  const color = isEmpty ? "#9ca3af" : getScoreColor(normalizedScore);

  return (
    <div
      className="relative shrink-0"
      title={isEmpty ? "Not yet enriched" : `Enrichment Score: ${normalizedScore}/100`}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth={strokeWidth}
          strokeDasharray={isEmpty ? "4 4" : "none"}
        />
        {/* Score arc */}
        {!isEmpty && (
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        )}
      </svg>
      {/* Score number */}
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold"
        style={{ fontSize, color }}
      >
        {isEmpty ? "--" : normalizedScore}
      </span>
    </div>
  );
}
