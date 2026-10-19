"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";

export function RunningTimer({ startedAt }: { startedAt: string }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(start);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-2xl tabular-nums">{fmt((now - start) / 1000)}</span>;
}
