import { APP_BUILD, APP_VERSION } from "@/lib/app-version";

// Release identity on every screen (URS-19): the same version is stamped on
// each record and signature, so an auditor can tie a record to this release.
export function AppFooter({ retentionYears }: { retentionYears: number }) {
  return (
    <footer className="border-t border-border bg-surface px-4 py-2 text-[11px] text-muted print:hidden sm:px-6">
      WEB OPS v{APP_VERSION}
      {APP_BUILD ? <span className="font-mono-tabular"> ({APP_BUILD})</span> : null} · GMP records retained for at least {retentionYears} years
    </footer>
  );
}
