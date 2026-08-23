"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFolder, deleteFolder } from "@/lib/actions/formulation-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { MFG_INPUT_CLASS } from "@/components/mfg/field";
import { Folder, FolderOpen } from "lucide-react";

type FolderRow = { id: string; name: string; count: number };
type FormulationRow = {
  id: string;
  productName: string;
  baseBatchSize: number;
  baseUnit: string;
  ingredientCount: number;
  updatedAt: string;
};

export default function FormulationsClient({
  canManage,
  folders,
  activeFolderId,
  searchQuery,
  formulations,
}: {
  canManage: boolean;
  folders: FolderRow[];
  activeFolderId: string | null;
  searchQuery: string;
  formulations: FormulationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState(searchQuery);

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  function addFolder() {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      setShowNewFolder(false);
      router.refresh();
    });
  }

  function removeFolder(id: string) {
    if (!confirm("Delete this folder? It must be empty.")) return;
    startTransition(async () => {
      try {
        await deleteFolder(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Couldn't delete this folder.");
      }
    });
  }

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFolder) return;
    router.push(`/formulations?folder=${activeFolder.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Formulation Manager</h1>
          <p className="mt-0.5 text-sm text-muted">Master formulations, batch calculator, and PDF export — organized by folder.</p>
        </div>
        {canManage && !activeFolder && (
          <Button variant="secondary" size="sm" onClick={() => setShowNewFolder(true)}>
            + New Folder
          </Button>
        )}
        {canManage && activeFolder && (
          <Button size="sm" href={`/formulations/new?folder=${activeFolder.id}`}>
            + New Formulation
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Link href="/formulations" className="font-medium text-accent hover:underline">
          All Folders
        </Link>
        {activeFolder && (
          <>
            <span className="text-muted">/</span>
            <span className="font-medium text-foreground">{activeFolder.name}</span>
          </>
        )}
      </div>

      {!activeFolder ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((f) => (
            <div key={f.id} className="group relative">
              <Link
                href={`/formulations?folder=${f.id}`}
                className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-5 text-center shadow-[var(--shadow-xs)] transition-shadow duration-150 hover:shadow-[var(--shadow-sm)]"
              >
                <Folder className="size-8 text-accent" strokeWidth={1.5} />
                <p className="text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted">
                  {f.count} formulation{f.count === 1 ? "" : "s"}
                </p>
              </Link>
              {canManage && f.count === 0 && (
                <button
                  onClick={() => removeFolder(f.id)}
                  disabled={pending}
                  className="absolute right-2 top-2 hidden rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-status-critical group-hover:block"
                  aria-label="Delete folder"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {folders.length === 0 && (
            <div className="col-span-full rounded-[var(--radius)] border border-dashed border-border bg-surface py-10 text-center">
              <p className="text-sm text-muted">No folders yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <form onSubmit={runSearch} className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search formulations in this folder..."
              className={`${MFG_INPUT_CLASS} max-w-sm`}
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          {formulations.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No formulations in this folder yet.</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHead>
                      <TableRow className="hover:bg-transparent">
                        <TableHeaderCell>Product Name</TableHeaderCell>
                        <TableHeaderCell>Base Batch Size</TableHeaderCell>
                        <TableHeaderCell>Ingredients</TableHeaderCell>
                        <TableHeaderCell>Last Updated</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formulations.map((f) => (
                        <TableRow key={f.id} onClick={() => router.push(`/formulations/${f.id}`)} className="cursor-pointer">
                          <TableCell className="font-medium text-foreground">{f.productName}</TableCell>
                          <TableCell className="text-muted">
                            {f.baseBatchSize.toFixed(2)} {f.baseUnit}
                          </TableCell>
                          <TableCell className="text-muted">{f.ingredientCount}</TableCell>
                          <TableCell className="text-muted">{new Date(f.updatedAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
            <div className="mb-3 flex items-center gap-2">
              <FolderOpen className="size-5 text-accent" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-foreground">New Folder</h2>
            </div>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. NZ Products"
              className={MFG_INPUT_CLASS}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addFolder} disabled={pending || !newFolderName.trim()}>
                {pending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
