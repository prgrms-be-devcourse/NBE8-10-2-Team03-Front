"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PublicShell from "@/components/layout/PublicShell";
import { fetchMe } from "@/lib/auth";
import { Panel } from "@/components/ui/Panel";
import { SkeletonLine } from "@/components/ui/SkeletonLine";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const result = await fetchMe();
      if (!isMounted) return;
      if (result.ok) {
        router.replace("/");
        return;
      }
      setIsChecking(false);
    };
    check();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="page">
        <main className="container">
          <Panel>
            <SkeletonLine width="40%" />
            <SkeletonLine width="70%" style={{ marginTop: 12 }} />
          </Panel>
        </main>
      </div>
    );
  }

  return (
    <PublicShell me={null} isCheckingAuth={false}>
      {children}
    </PublicShell>
  );
}
