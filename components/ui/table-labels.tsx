"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Copies each column heading onto its cells (data-label) so that, on a phone,
// a stacked table row can say "STATUS  Submitted" instead of showing a bare value.
// Runs after every navigation and whenever a table's rows change.
function label(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").trim());
  if (!heads.length) return;
  for (const row of table.querySelectorAll("tbody tr")) {
    [...row.children].forEach((cell, i) => {
      if (!(cell instanceof HTMLElement) || cell.tagName !== "TD") return;
      const text = (cell as HTMLTableCellElement).colSpan > 1 ? "" : heads[i] ?? "";
      if (cell.dataset.label !== text) cell.dataset.label = text;
    });
  }
}

export function TableLabels() {
  const pathname = usePathname();

  useEffect(() => {
    const run = () => document.querySelectorAll<HTMLTableElement>("table[data-stack]").forEach(label);
    run();
    let frame = 0;
    const touchesTable = (n: Node) => n instanceof HTMLElement && (n.matches("table, thead, tbody, tr, td, th") || !!n.querySelector("table[data-stack]"));
    const observer = new MutationObserver((mutations) => {
      // Re-label only when table content was added; ignore every other DOM change.
      if (!mutations.some((m) => [...m.addedNodes].some(touchesTable))) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
