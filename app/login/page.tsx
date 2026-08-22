import Image from "next/image";
import { LoginForm } from "./login-form";

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
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 15% 0%, rgba(109,125,255,0.16), transparent)" }}
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
            Every area. Every check. Every finding.
            <br />
            Fully traceable.
          </h1>
          <p className="text-[15px] leading-relaxed text-white/55">
            The digital facility operations and compliance platform for
            cleaning, 5S, inspections, corrective actions and audit-ready
            evidence — replacing paper checklists with a controlled, verifiable
            record.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
          <span>Precision</span>
          <span className="text-white/15">•</span>
          <span>Control</span>
          <span className="text-white/15">•</span>
          <span>Traceability</span>
          <span className="text-white/15">•</span>
          <span>Accountability</span>
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

          <p className="mt-5 text-center text-xs text-muted">
            Demo environment — credentials documented in HANDOVER.md
          </p>
        </div>
      </div>
    </div>
  );
}
