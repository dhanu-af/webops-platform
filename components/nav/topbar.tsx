import Link from "next/link";
import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function Topbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-sm text-muted">
        <span className="font-mono-tabular text-xs text-muted">
          {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/account" className="text-right hover:opacity-80" title="My Account">
          <div className="text-sm font-medium text-foreground">{name}</div>
          <div className="text-xs text-muted">{role.replace(/_/g, " ")}</div>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex size-9 items-center justify-center rounded-full border border-border-strong text-muted-strong hover:bg-surface-sunken hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
