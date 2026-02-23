export const formatScore = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}°C`;
};

export const getScoreBadge = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { label: "온도 미측정", tone: "none" as const };
  }
  if (value >= 80) return { label: "군고구마 HOT", tone: "top" as const };
  if (value >= 60) return { label: "노릇노릇", tone: "high" as const };
  if (value >= 40) return { label: "따뜻한 온도", tone: "mid" as const };
  if (value >= 20) return { label: "식은 온도", tone: "low" as const };
  return { label: "냉고구마 주의", tone: "risk" as const };
};
