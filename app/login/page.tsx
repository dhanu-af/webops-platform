import Image from "next/image";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0b0d12] p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-[0.07]"
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
        <div className="relative z-10 max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Every area. Every check. Every finding. Fully traceable.
          </h1>
          <p className="text-sm leading-relaxed text-white/60">
            The digital facility operations and compliance platform for
            cleaning, 5S, inspections, corrective actions and audit-ready
            evidence — replacing paper checklists with a controlled, verifiable
            record.
          </p>
        </div>
        <div className="relative z-10 flex gap-8 text-xs text-white/40">
          <span>PRECISION</span>
          <span>CONTROL</span>
          <span>TRACEABILITY</span>
          <span>ACCOUNTABILITY</span>
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 w-fit rounded-md border border-border bg-white px-2.5 py-1.5 shadow-[var(--shadow-xs)] lg:hidden">
            <Image
              src="/eagle-labs-logo.jpg"
              alt="Eagle Labs Inc"
              width={200}
              height={94}
              className="h-7 w-auto"
            />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Access your facility operations workspace.
          </p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
