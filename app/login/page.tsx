import Image from "next/image";
import { LoginForm } from "./login-form";
import { Target, ShieldCheck, Search, Users, type LucideIcon } from "lucide-react";

const PILLARS: { label: string; icon: LucideIcon }[] = [
  { label: "Precision", icon: Target },
  { label: "Control", icon: ShieldCheck },
  { label: "Traceability", icon: Search },
  { label: "Accountability", icon: Users },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b0d12] p-12 text-white lg:flex">
        <div
          className="absolute inset-y-0 right-0 w-[52%]"
          style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0% 100%)" }}
        >
          <Image src="/login-facility.jpg" alt="" fill priority sizes="30vw" className="object-cover" />
          <div className="absolute inset-0 bg-[#0b0d12]/35" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(100deg,#0b0d12_44%,rgba(11,13,18,0.55)_60%,rgba(11,13,18,0)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10">
          <div className="w-fit rounded-md bg-white px-2.5 py-1.5 shadow-[var(--shadow-sm)]">
            <Image
              src="/eagle-labs-logo.jpg"
              alt="Eagle Labs Inc"
              width={200}
              height={94}
              className="h-8 w-auto"
              priority
            />
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <h1 className="text-[2.35rem] font-semibold leading-[1.15] tracking-tight">
            Every area. Every check.
            <br />
            Every finding.
            <br />
            <span className="text-[var(--sidebar-accent)]">Fully traceable.</span>
          </h1>
          <div className="h-px w-14 bg-[var(--sidebar-accent)]" />
          <p className="text-[15px] leading-relaxed text-white/60">
            The digital facility operations and compliance platform for
            cleaning, 5S, inspections, corrective actions and audit-ready
            evidence — replacing paper checklists with a controlled, verifiable
            record.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap gap-6">
            {PILLARS.map((p) => (
              <div key={p.label} className="flex w-16 flex-col items-center gap-2 text-center">
                <div
                  className="flex size-11 items-center justify-center bg-white/10 text-white/80 ring-1 ring-inset ring-white/15"
                  style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                >
                  <p.icon className="size-[18px]" strokeWidth={1.75} />
                </div>
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white/55">
                  {p.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-white/10" />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--sidebar-accent)]">
            Quality &nbsp;•&nbsp; Compliance &nbsp;•&nbsp; Trust &nbsp;•&nbsp; Excellence
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden bg-background p-6 sm:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ background: "radial-gradient(55% 45% at 50% 0%, var(--accent-soft), transparent)" }}
        />
        <div className="relative z-10 w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="w-fit rounded-md border border-border bg-white px-2.5 py-1.5 shadow-[var(--shadow-xs)]">
              <Image
                src="/eagle-labs-logo.jpg"
                alt="Eagle Labs Inc"
                width={200}
                height={94}
                className="h-7 w-auto"
              />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8 shadow-[var(--shadow-md)]">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Sign in
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Access your facility operations workspace.
            </p>
            <LoginForm callbackUrl={callbackUrl} />
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
            <p className="text-xs leading-relaxed text-muted-strong">
              Demo environment — credentials documented in HANDOVER.md
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
