import { docControlRows, type DocControl } from "@/lib/doc-control";
import { cn } from "@/lib/utils";

// The controlled-form masthead: organisation, "Controlled Form", form title,
// zone/cadence line, the document-control table, the Date line and the intro
// paragraph -- laid out like the Word master. `dateText` is the record date on
// screen; leave it out on the paper form to print blank date fields.
export function ControlledFormHeader({ doc, dateText, variant = "screen" }: { doc: DocControl; dateText?: string | null; variant?: "screen" | "paper" }) {
  const paper = variant === "paper";
  const cell = paper ? "border border-black p-1.5" : "border border-border p-2";
  const labelCell = cn(cell, "font-semibold", paper ? "bg-neutral-100" : "bg-surface-sunken");

  return (
    <div className={cn("text-center", paper ? "text-black" : "text-foreground")}>
      <p className={cn("font-bold uppercase tracking-wide", paper ? "text-lg text-[#1f5c99]" : "text-xl text-[#1f5c99] dark:text-sky-400")}>{doc.organisation}</p>
      <p className={paper ? "text-sm" : "text-sm text-muted-strong"}>Controlled Form</p>
      <h2 className={cn("mt-0.5 font-bold", paper ? "text-base text-[#c55a11]" : "text-lg text-[#c55a11] dark:text-orange-400")}>{doc.formTitle}</h2>
      <p className={cn("italic", paper ? "text-xs" : "text-xs text-muted-strong")}>{doc.subtitle}</p>

      <table className={cn("mt-3 w-full border-collapse text-left", paper ? "text-[11px]" : "text-xs")}>
        <tbody>
          {docControlRows(doc).map(([[l1, v1], [l2, v2]], i) => (
            <tr key={i}>
              <th className={cn(labelCell, "w-[16%] align-top")}>{l1}</th>
              <td className={cn(cell, "w-[34%] align-top")}>{v1}</td>
              <th className={cn(labelCell, "w-[16%] align-top")}>{l2}</th>
              <td className={cn(cell, "w-[34%] align-top")}>{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={cn("mt-3 text-left font-bold", paper ? "text-sm" : "text-sm")}>
        Date:{" "}
        {dateText ? <span className="font-normal">{dateText}</span> : <span className="font-normal tracking-wider">____ / ____ / ________</span>}
      </p>
      {doc.intro && <p className={cn("mt-1 text-left italic", paper ? "text-[11px]" : "text-xs text-muted-strong")}>{doc.intro}</p>}
    </div>
  );
}

/** Note and controlled-document notice printed at the foot of the form. */
export function ControlledFormFooter({ doc, variant = "screen" }: { doc: DocControl; variant?: "screen" | "paper" }) {
  const paper = variant === "paper";
  return (
    <div className={cn("space-y-1 text-left", paper ? "text-[9px] text-black" : "text-xs text-muted")}>
      {doc.note && <p>{doc.note}</p>}
      {doc.footerNotice && <p className="italic">{doc.footerNotice}</p>}
    </div>
  );
}
