"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { DEFAULT_DELIVERY_ZONES, type DeliveryZone } from "@/lib/catalog";
import { db, auth } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";

const EMPTY_FORM = { label: "", description: "", fee: "0", active: true };

export default function AdminDeliveryPage() {
  const { role } = useAdminRole();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const zoneQuery = query(collection(db, "deliveryZones"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      zoneQuery,
      (snapshot) => {
        const live = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryZone));
        setZones(live.length ? live : DEFAULT_DELIVERY_ZONES);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load delivery zones", error);
        setZones(DEFAULT_DELIVERY_ZONES);
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
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditing(zone);
    setForm({ label: zone.label, description: zone.description, fee: String(zone.fee), active: zone.active !== false });
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.label.trim()) {
      toast("A name is required.", "error");
      return;
    }
    const fee = Number(form.fee);
    if (Number.isNaN(fee) || fee < 0) {
      toast("Fee must be a valid amount — use 0 for free delivery.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "deliveryZones", editing.id), {
          label: form.label.trim(),
          description: form.description.trim(),
          fee,
          active: form.active,
        });
        toast("Delivery option updated.", "success");
      } else {
        await addDoc(collection(db, "deliveryZones"), {
          label: form.label.trim(),
          description: form.description.trim(),
          fee,
          active: form.active,
          order: Date.now(),
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || null,
        });
        toast("Delivery option created.", "success");
      }
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast("Couldn't save this delivery option. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`Delete "${zone.label}"? Customers won't be able to select it at checkout anymore. This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "deliveryZones", zone.id));
      toast("Delivery option deleted.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't delete this delivery option. Please try again.", "error");
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      await updateDoc(doc(db, "deliveryZones", zone.id), { active: !(zone.active !== false) });
    } catch (error) {
      console.error(error);
      toast("Couldn't update this delivery option. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/60">
          {zones.length} delivery option{zones.length === 1 ? "" : "s"} — shown to customers at checkout in this order
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-olive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-olive/90"
        >
          <Plus size={16} /> Add Delivery Option
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading delivery options...</div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-xs uppercase tracking-wider text-charcoal/50">
                <th className="px-6 py-3 font-medium">Option</th>
                <th className="px-6 py-3 font-medium">Fee</th>
                <th className="px-6 py-3 font-medium">Shown at checkout</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-soft-grey last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Truck size={14} className="text-charcoal/40" />
                      {zone.label}
                    </div>
                    <div className="mt-0.5 max-w-md text-xs text-charcoal/50">{zone.description}</div>
                  </td>
                  <td className="px-6 py-3 font-medium">{zone.fee === 0 ? "Free" : `GHS ${zone.fee.toFixed(2)}`}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => toggleActive(zone)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        zone.active !== false ? "bg-olive/10 text-olive" : "bg-charcoal/10 text-charcoal/50"
                      }`}
                    >
                      {zone.active !== false ? "Yes" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(zone)} className="text-charcoal/50 hover:text-olive" aria-label={`Edit ${zone.label}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(zone)} className="text-charcoal/50 hover:text-terracotta" aria-label={`Delete ${zone.label}`}>
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
              <h3 className="font-serif text-xl font-semibold">{editing ? "Edit Delivery Option" : "Add Delivery Option"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  required
                  autoFocus
                  placeholder="Kumasi delivery"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <input
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Shown to customers under the option name"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Fee (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fee}
                  onChange={(event) => setForm({ ...form, fee: event.target.value })}
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
                <p className="mt-1 text-xs text-charcoal/50">Use 0 for free delivery or pickup.</p>
              </div>
              <label className="flex items-center gap-3 rounded-md bg-soft-grey p-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  className="h-4 w-4 accent-olive"
                />
                Show at checkout
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Delivery Option"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
