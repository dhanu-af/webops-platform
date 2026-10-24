import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { APP_VERSION_STAMP } from "@/lib/app-version";
import { needsProductChangeover } from "@/lib/inspection-rules";
import { PrintButton } from "../print-button";
import { parseDocControl } from "@/lib/doc-control";
import { ControlledFormHeader, ControlledFormFooter } from "@/components/inspection/controlled-form-header";

// Blank paper version of a checklist (URS-20). Standalone page (no app chrome)
// so it prints cleanly on A4. Every electronic field has a paper equivalent:
// area/line, equipment, product/batch (previous and next for changeovers),
// date/time, operator, each answer, remarks, corrective action, and the
// verification signatures.
const BOX = "inline-block size-3.5 border border-black align-[-2px]";
const LINE = "inline-block min-w-24 border-b border-black align-baseline";

export default async function PaperForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const checklist = await db.checklist.findUnique({
    where: { id },
    include: {
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
      versions: { where: { isCurrent: true }, take: 1, include: { items: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  const version = checklist?.versions[0];
  if (!checklist || !version) notFound();

  const groups = new Map<string, typeof version.items>();
  for (const it of version.items) groups.set(it.groupLabel, [...(groups.get(it.groupLabel) ?? []), it]);
  const changeover = needsProductChangeover(checklist.category);
  const organization = (await db.systemSettings.findFirst({ select: { organizationName: true } }))?.organizationName;
  const steps = (checklist.workflow?.steps ?? []).filter((s) => s.role !== "OPERATOR");
  const docControl = parseDocControl(version.docControl);

  const answerCell = (it: (typeof version.items)[number]) => {
    switch (it.type) {
      case "PASS_FAIL":
        return (
          <span className="whitespace-nowrap">
            <i className={BOX} /> Pass &nbsp;<i className={BOX} /> Fail &nbsp;<i className={BOX} /> N/A
          </span>
        );
      case "YES_NO":
        return (
          <span className="whitespace-nowrap">
            <i className={BOX} /> Yes &nbsp;<i className={BOX} /> No &nbsp;<i className={BOX} /> N/A
          </span>
        );
      case "NUMERIC":
        return (
          <span>
            <span className={LINE} />
            {it.minValue !== null && it.maxValue !== null ? <span className="ml-1 text-[11px]">(acceptable {it.minValue}–{it.maxValue})</span> : null}
          </span>
        );
      case "ACKNOWLEDGEMENT":
        return (
          <span className="whitespace-nowrap">
            <i className={BOX} /> Done &nbsp;<i className={BOX} /> N/A
          </span>
        );
      case "MULTIPLE_CHOICE":
        return (
          <span>
            {(Array.isArray(it.choices) ? (it.choices as string[]) : []).map((c) => (
              <span key={c} className="mr-2 inline-block whitespace-nowrap">
                <i className={BOX} /> {c}
              </span>
            ))}
            <span className="whitespace-nowrap">
              <i className={BOX} /> N/A
            </span>
          </span>
        );
      default:
        return <span className="block h-8 border-b border-black" />;
    }
  };

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-6 text-[11px] leading-snug text-black print:max-w-none print:p-0">
      <style>{"@page { size: A4; margin: 10mm; } @media print { body { background: white !important; } }"}</style>

      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/forms" className="text-sm text-muted hover:text-foreground">
          ← All paper forms
        </Link>
        <PrintButton />
      </div>

      {docControl ? (
        <header className="mb-3">
          <ControlledFormHeader doc={docControl} variant="paper" />
          <p className="mt-1 text-[9px]">System release {APP_VERSION_STAMP} · Template v{version.versionNumber} · PAPER FALLBACK FORM — enter into the system when it is available</p>
        </header>
      ) : (
      <header className="mb-3 border-b-2 border-black pb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest">{organization ?? "GMP record"}</p>
        <h1 className="text-lg font-bold">{checklist.name}</h1>
        <p className="text-[11px]">
          {checklist.category.replace(/_/g, " ")} · Template v{version.versionNumber} · System release {APP_VERSION_STAMP} · PAPER FALLBACK FORM — enter into the system when it is available
        </p>
      </header>
      )}

      <table className="mb-3 w-full border-collapse text-[11px]">
        <tbody>
          <tr>
            <td className="w-1/2 border border-black p-1.5">Area / line: <span className={LINE} /></td>
            <td className="border border-black p-1.5">Equipment: <span className={LINE} /></td>
          </tr>
          {changeover ? (
            <>
              <tr>
                <td className="border border-black p-1.5">Previous product: <span className={LINE} /></td>
                <td className="border border-black p-1.5">Previous batch: <span className={LINE} /></td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Next product: <span className={LINE} /></td>
                <td className="border border-black p-1.5">Next batch: <span className={LINE} /></td>
              </tr>
            </>
          ) : (
            <tr>
              <td className="border border-black p-1.5">Product (if applicable): <span className={LINE} /></td>
              <td className="border border-black p-1.5">Batch (if applicable): <span className={LINE} /></td>
            </tr>
          )}
          <tr>
            <td className="border border-black p-1.5">Date: <span className={LINE} /> &nbsp; Time: <span className={LINE} /></td>
            <td className="border border-black p-1.5">Operator (print name): <span className={LINE} /></td>
          </tr>
        </tbody>
      </table>

      {Array.from(groups.entries()).map(([group, items]) => (
        <section key={group} className="mb-3 break-inside-avoid-page">
          <h2 className="bg-neutral-200 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">{group}</h2>
          <table className="w-full border-collapse">
            <tbody>
              {items.map((it, n) => (
                <tr key={it.id} className="break-inside-avoid">
                  <td className="w-6 border border-black p-1 text-center align-top">{n + 1}</td>
                  <td className="border border-black p-1 align-top">
                    {it.prompt}
                    {it.required && <b> *</b>}
                    {it.helpText && <span className="block text-[9px] italic">{it.helpText}</span>}
                  </td>
                  <td className="w-[34%] border border-black p-1 align-top">{answerCell(it)}</td>
                  <td className="w-[22%] border border-black p-1 align-top text-[9px] text-neutral-500">Remarks</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="mb-3 text-[11px]">* required — the record cannot be signed off with a blank required item.</p>

      <section className="mb-3 break-inside-avoid">
        <h2 className="bg-neutral-200 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">Corrective action (required for every FAIL / NO / out-of-range answer)</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Item no.", "What was done / will be done", "By whom", "Date", "Signed off (Supervisor/QA)"].map((h) => (
                <th key={h} className="border border-black p-1 text-left text-[11px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r}>
                {[0, 1, 2, 3, 4].map((c) => (
                  <td key={c} className="h-8 border border-black" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 text-[11px]">Line is NOT released until every corrective action above is signed off.</p>
      </section>

      {docControl ? (
        <section className="break-inside-avoid">
          <h2 className="px-1.5 py-0.5 text-sm font-bold">C. VERIFICATION &amp; SIGN-OFF</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Role", "Name", "Signature", "Date"].map((h) => (
                  <th key={h} className="border border-black bg-neutral-100 p-1 text-left text-[11px]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(docControl.signOffRoles.length ? docControl.signOffRoles : ["Operator", "Supervisor"]).map((role) => (
                <tr key={role}>
                  <td className="w-[34%] border border-black p-1.5">{role}</td>
                  <td className="h-9 border border-black" />
                  <td className="border border-black" />
                  <td className="border border-black" />
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2">
            <ControlledFormFooter doc={docControl} variant="paper" />
          </div>
          <p className="mt-1 text-[9px]">Form: {checklist.name} · v{version.versionNumber} · {id}</p>
        </section>
      ) : (
      <section className="break-inside-avoid">
        <h2 className="bg-neutral-200 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">Sign-off</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Role / meaning", "Print name", "Signature", "Date / time"].map((h) => (
                <th key={h} className="border border-black p-1 text-left text-[11px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5">Operator — completed by</td>
              <td className="h-9 border border-black" />
              <td className="border border-black" />
              <td className="border border-black" />
            </tr>
            {steps.map((s, i) => (
              <tr key={s.id}>
                <td className="border border-black p-1.5">
                  {s.role.replace(/_/g, " ")} — {i === steps.length - 1 ? "Approved" : "Verified"}
                </td>
                <td className="h-9 border border-black" />
                <td className="border border-black" />
                <td className="border border-black" />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[9px]">
          Verifier must not be the person who completed the checklist. Corrections: single line through the entry, initial and date — never obscure the original. Form: {checklist.name} · v{version.versionNumber} · {id}
        </p>
      </section>
      )}
    </div>
  );
}
