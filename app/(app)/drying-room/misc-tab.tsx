"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMiscStorageItem } from "@/lib/actions/drying-room-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import MiscItemModal from "./misc-item-modal";
import type { MiscItem } from "./drying-room-client";

export default function MiscTab({ items, canUpdate, canManage }: { items: MiscItem[]; canUpdate: boolean; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MiscItem | "new" | null>(null);

  function remove(id: string) {
    if (!confirm("Remove this storage item? This cannot be undone.")) return;
    deleteMiscStorageItem(id).then(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Miscellaneous Storage</h2>
        {canUpdate && (
          <Button size="sm" onClick={() => setEditing("new")}>
            + Add Item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No items in miscellaneous storage.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[900px]">
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell>Batch</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Storage Type</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Required Action</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Updated</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-transparent">
                    <TableCell className="font-medium text-foreground">{item.product}</TableCell>
                    <TableCell className="text-muted">{item.batchNumber ?? "—"}</TableCell>
                    <TableCell className="text-foreground">{item.quantityLabel}</TableCell>
                    <TableCell className="text-muted">{item.storageType ?? "—"}</TableCell>
                    <TableCell className="text-muted">{item.status ?? "—"}</TableCell>
                    <TableCell className="text-muted">{item.requiredAction ?? "—"}</TableCell>
                    <TableCell className="text-muted">{item.location ?? "—"}</TableCell>
                    <TableCell className="text-muted">{new Date(item.updatedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {canUpdate && (
                        <button onClick={() => setEditing(item)} className="mr-2 font-medium text-accent hover:underline">
                          Edit
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => remove(item.id)} className="font-medium text-muted hover:text-status-critical">
                          Delete
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editing && (
        <MiscItemModal
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
