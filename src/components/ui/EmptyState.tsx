"use client";

import type { HTMLAttributes } from "react";

type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  message?: string;
};

export function EmptyState({ message, children, ...props }: EmptyStateProps) {
  return (
    <div className="empty" {...props}>
      {message ?? children}
    </div>
  );
}
