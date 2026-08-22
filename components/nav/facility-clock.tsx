"use client";

import { useEffect, useState } from "react";
import { facilityClockParts } from "@/lib/format-clock";

export function FacilityClock({
  timeZone,
  initialDate,
  initialTime,
}: {
  timeZone: string;
  initialDate: string;
  initialTime: string;
}) {
  const [{ date, time }, setParts] = useState({ date: initialDate, time: initialTime });

  useEffect(() => {
    const id = setInterval(() => setParts(facilityClockParts(timeZone)), 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  return (
    <div className="hidden shrink-0 flex-col leading-tight md:flex">
      <span className="text-sm font-medium text-foreground">{date}</span>
      <span className="font-mono-tabular text-[11px] text-muted">
        {time} · Facility time
      </span>
    </div>
  );
}
