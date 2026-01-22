"use client";

import type { HTMLAttributes } from "react";

type PanelProps = HTMLAttributes<HTMLDivElement>;

export function Panel({ className = "", ...props }: PanelProps) {
  return <div className={`panel ${className}`.trim()} {...props} />;
}
