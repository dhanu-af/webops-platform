"use client";

import { createContext, useContext, useState } from "react";

// The sidebar is completely hidden below the md breakpoint (no room for a
// permanent 256px rail on a phone) -- this context is the only way the
// Topbar's hamburger button and the Sidebar's mobile drawer can coordinate,
// since they're siblings under the server-rendered app layout, not parent/child.
type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx)
    throw new Error("useMobileNav must be used within a MobileNavProvider");
  return ctx;
}
