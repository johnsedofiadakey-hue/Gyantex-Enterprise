"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { type PricingPreset } from "@/lib/catalog";
import { db } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";

interface RowDraft {
  size: string;
  price: string;
}

const EMPTY_ROW: RowDraft = { size: "", price: "" };

export default function AdminPricingPresetsPage() {
  const { role } = useAdminRole();
  const [presets, setPresets] = useState<PricingPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PricingPreset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<RowDraft[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const presetQuery = query(collection(db, "pricingPresets"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      presetQuery,
      (snapshot) => {
        setPresets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PricingPreset)));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load pricing presets", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  if (role === "staff") {
    return (
      <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
        This page is only available to the business owner.
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setName("");
    setRows([{ ...EMPTY_ROW }]);
    setShowForm(true);
  };

  const openEdit = (preset: PricingPreset) => {
    setEditing(preset);
    setName(preset.name);
    setRows(preset.rows.map((row) => ({ size: row.size, price: String(row.price) })));
    setShowForm(true);
  };

  const rowSummary = (preset: PricingPreset) =>
    preset.rows.map((row) => `${row.size} — GHS ${row.price.toFixed(2)}`).join(", ");

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Preset name is required.", "error");
      return;
    }
    const validRows = rows
      .map((row) => ({ size: row.size.trim(), price: Number(row.price) }))
      .filter((row) => row.size && !Number.isNaN(row.price) && row.price > 0);
    if (validRows.length === 0) {
      toast("Add at least one size with a price.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "pricingPresets", editing.id), { name: trimmed, rows: validRows });
        toast("Preset updated.", "success");
      } else {
        await addDoc(collection(db, "pricingPresets"), { name: trimmed, rows: validRows, order: Date.now() });
        toast("Preset created.", "success");
      }
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast("Couldn't save this preset. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (preset: PricingPreset) => {
    if (!confirm(`Delete "${preset.name}"? Products that already used it keep their rows — this only removes it from the dropdown. This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "pricingPresets", preset.id));
      toast("Preset deleted.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't delete this preset. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="max-w-xl text-sm text-charcoal/60">
          Define a size and price ladder once — e.g. Lace Yardage: 6 Yards, 12 Yards — then apply it to any product
          from a dropdown in its Variants table instead of retyping it every time.
        </p>
        <button
          onClick={openCreate}
          className="flex shrink-0 items-center gap-2 rounded-md bg-olive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-olive/90"
        >
          <Plus size={16} /> Add Preset
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading pricing presets...</div>
      ) : presets.length === 0 ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
          No pricing presets yet — add one for a size ladder you reuse across products, like lace yardage.
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-xs uppercase tracking-wider text-charcoal/50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Sizes &amp; Prices</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id} className="border-b border-soft-grey last:border-0">
                  <td className="flex items-center gap-2 px-6 py-3 font-medium">
                    <Layers size={14} className="text-charcoal/40" />
                    {preset.name}
                  </td>
                  <td className="px-6 py-3 text-charcoal/70">{rowSummary(preset)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(preset)} className="text-charcoal/50 hover:text-olive" aria-label={`Edit ${preset.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(preset)} className="text-charcoal/50 hover:text-terracotta" aria-label={`Delete ${preset.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-charcoal/40" onClick={() => setShowForm(false)} aria-label="Close" />
          <form onSubmit={handleSave} className="relative w-full max-w-md bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold">{editing ? "Edit Preset" : "Add Preset"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <label className="mb-1.5 block text-sm font-medium">Name *</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
              placeholder="Lace Yardage"
              className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
            />

            <div className="mt-5 mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium">Sizes &amp; Prices *</label>
              <button
                type="button"
                onClick={() => setRows([...rows, { ...EMPTY_ROW }])}
                className="flex items-center gap-1 text-xs font-semibold text-olive hover:underline"
              >
                <Plus size={14} /> Add size
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={row.size}
                    onChange={(event) => {
                      const next = [...rows];
                      next[index] = { ...next[index], size: event.target.value };
                      setRows(next);
                    }}
                    placeholder="e.g. 6 Yards"
                    className="min-w-0 flex-1 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-charcoal/45">GHS</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.price}
                      onChange={(event) => {
                        const next = [...rows];
                        next[index] = { ...next[index], price: event.target.value };
                        setRows(next);
                      }}
                      placeholder="Price"
                      className="w-24 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                    className="shrink-0 rounded-md border border-charcoal/15 p-2 text-charcoal/50 hover:border-terracotta hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Remove size"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Preset"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
