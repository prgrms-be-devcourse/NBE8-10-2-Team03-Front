export const formatScore = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "-";
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(1);
};
