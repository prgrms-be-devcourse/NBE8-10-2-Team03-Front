"use client";

import type { HTMLAttributes } from "react";

type ErrorMessageProps = HTMLAttributes<HTMLDivElement> & {
  message?: string | null;
};

export function ErrorMessage({ message, children, ...props }: ErrorMessageProps) {
  if (!message && !children) return null;
  return (
    <div className="error" {...props}>
      {message ?? children}
    </div>
  );
}
