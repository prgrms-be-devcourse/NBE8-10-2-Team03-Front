"use client";

import type { CSSProperties } from "react";

type SkeletonLineProps = {
  width?: string | number;
  style?: CSSProperties;
  className?: string;
};

export function SkeletonLine({
  width,
  style,
  className = "",
}: SkeletonLineProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ width, ...style }}
    />
  );
}
