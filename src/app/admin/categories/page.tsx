"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { DEFAULT_CATEGORIES, type Category } from "@/lib/catalog";
import { db, auth } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";

export default function AdminCategoriesPage() {
  const { role } = useAdminRole();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const categoryQuery = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      categoryQuery,
      (snapshot) => {
        const live = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
        setCategories(live.length ? live : DEFAULT_CATEGORIES);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load categories", error);
        setCategories(DEFAULT_CATEGORIES);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Count products per category so a delete confirm can warn accurately.
    // One read of the whole (small) products collection, counted client-side
    // — cheaper than firing a separate filtered query per category, and the
    // cost doesn't grow with how many categories exist.
    async function loadCounts() {
      const snapshot = await getDocs(collection(db, "products"));
      const counts: Record<string, number> = {};
      snapshot.forEach((docSnap) => {
        const category = docSnap.data().category as string | undefined;
        if (!category) return;
        counts[category] = (counts[category] || 0) + 1;
      });
      setProductCounts(counts);
    }
    loadCounts();
  }, [categories]);

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
    setShowForm(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setName(category.name);
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast("Category name is required.", "error");
      return;
    }
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editing?.id
    );
    if (duplicate) {
      toast("A category with that name already exists.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "categories", editing.id), { name: trimmed });
        toast("Category renamed.", "success");
      } else {
        await addDoc(collection(db, "categories"), {
          name: trimmed,
          order: Date.now(),
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || null,
        });
        toast("Category created.", "success");
      }
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast("Couldn't save this category. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const count = productCounts[category.name] ?? 0;
    const warning = count > 0
      ? `Delete "${category.name}"? ${count} product${count === 1 ? "" : "s"} currently use this category and will keep that label until you edit them individually. This cannot be undone.`
      : `Delete "${category.name}"? This cannot be undone.`;
    if (!confirm(warning)) return;
    try {
      await deleteDoc(doc(db, "categories", category.id));
      toast("Category deleted.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't delete this category. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/60">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-olive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-olive/90"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading categories...</div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-xs uppercase tracking-wider text-charcoal/50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Products</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-soft-grey last:border-0">
                  <td className="flex items-center gap-2 px-6 py-3 font-medium">
                    <Tag size={14} className="text-charcoal/40" />
                    {category.name}
                  </td>
                  <td className="px-6 py-3 text-charcoal/70">{productCounts[category.name] ?? 0}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(category)} className="text-charcoal/50 hover:text-olive" aria-label={`Edit ${category.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(category)} className="text-charcoal/50 hover:text-terracotta" aria-label={`Delete ${category.name}`}>
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
              <h3 className="font-serif text-xl font-semibold">{editing ? "Rename Category" : "Add Category"}</h3>
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
              placeholder="Funeral Cloth"
              className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
            />

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Category"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
