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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import {
  DEFAULT_CATEGORIES,
  getOptionValueLabel,
  getOptionValuePrice,
  getPriceLabel,
  getProductColorOptions,
  getSwatchStyle,
  normalizeCategory,
  type Category,
  type ProductColorOption,
  type ProductOptionGroup,
} from "@/lib/catalog";
import { db, storage } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";
import ProductImage from "@/components/ProductImage";

interface Product {
  id: string;
  name: string;
  price: number;
  priceMode?: "fixed" | "quote";
  startingPriceLabel?: string;
  unit?: string;
  category?: string;
  imageUrl?: string;
  colors: string[];
  colorNames?: string[];
  colorOptions?: ProductColorOption[];
  optionGroups?: ProductOptionGroup[];
  description?: string;
  tags?: string[];
  minimumOrder?: string;
  turnaround?: string;
  trackInventory?: boolean;
  stockUnits?: number;
  badge?: string;
  featured?: boolean;
}

/** Editable form shape for one value within an option group — `price` is a
 * plain string while typing; blank means "use the product's base price". */
interface OptionValueDraft {
  label: string;
  price: string;
}

/** Editable form shape for an option group (e.g. "Cloth Length"). */
interface OptionGroupDraft {
  label: string;
  values: OptionValueDraft[];
}

/** Editable form shape for a color — `image` holds an already-uploaded URL;
 * a newly-chosen photo lives separately in `colorImageFiles` until save.
 * `hex2` is optional — set it for a combo cloth (e.g. "Red & Black") to show
 * a split swatch instead of one solid color. */
interface ColorDraft {
  name: string;
  hex: string;
  hex2?: string;
  image?: string;
}

const DEFAULT_COLOR_DRAFTS: ColorDraft[] = [
  { name: "Black", hex: "#111111" },
  { name: "White", hex: "#ffffff" },
  { name: "Burgundy", hex: "#7b1e2b" },
  { name: "Gold", hex: "#c8b27a" },
];

const EMPTY_FORM = {
  name: "",
  priceMode: "fixed" as "fixed" | "quote",
  price: "",
  startingPriceLabel: "Price not set yet",
  unit: "project",
  category: "Funeral Cloth",
  description: "",
  tags: "",
  minimumOrder: "",
  turnaround: "",
  colorOptions: DEFAULT_COLOR_DRAFTS,
  optionGroups: [] as OptionGroupDraft[],
  trackInventory: false,
  stockUnits: "",
  badge: "",
  featured: false,
};

export default function AdminProductsPage() {
  const { role } = useAdminRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [colorImageFiles, setColorImageFiles] = useState<Record<number, File>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const productQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load products", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const categoryQuery = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      categoryQuery,
      (snapshot) => {
        const live = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
        setCategories(live.length ? live : DEFAULT_CATEGORIES);
      },
      (error) => {
        console.error("Failed to load categories", error);
        setCategories(DEFAULT_CATEGORIES);
      }
    );
    return unsubscribe;
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setColorImageFiles({});
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name || "",
      priceMode: product.priceMode || (product.price > 0 ? "fixed" : "quote"),
      price: String(product.price ?? ""),
      startingPriceLabel: product.startingPriceLabel || "Price not set yet",
      unit: product.unit || "project",
      category: normalizeCategory(product.category || "Funeral Cloth"),
      description: product.description || "",
      tags: (product.tags || []).join(", "),
      minimumOrder: product.minimumOrder || "",
      turnaround: product.turnaround || "",
      colorOptions: getProductColorOptions(product).map((color) => ({ name: color.name, hex: color.hex, hex2: color.hex2, image: color.image })),
      optionGroups: (product.optionGroups || []).map((group) => ({
        label: group.label,
        values: group.values.map((value) => ({
          label: getOptionValueLabel(value),
          price: getOptionValuePrice(value) !== undefined ? String(getOptionValuePrice(value)) : "",
        })),
      })),
      trackInventory: product.trackInventory !== false && product.priceMode !== "quote",
      stockUnits: String(product.stockUnits ?? ""),
      badge: product.badge || "",
      featured: product.featured || false,
    });
    setImageFile(null);
    setColorImageFiles({});
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name) {
      toast("Name is required.", "error");
      return;
    }
    if (form.priceMode === "fixed" && !form.price) {
      toast("Fixed-price products need a price.", "error");
      return;
    }

    setSaving(true);
    try {
      const colorOptions: ProductColorOption[] = [];
      for (let i = 0; i < form.colorOptions.length; i++) {
        const draft = form.colorOptions[i];
        if (!draft.name.trim() && !draft.hex.trim()) continue;
        let image = draft.image || "";
        const pendingFile = colorImageFiles[i];
        if (pendingFile) {
          const colorStorageRef = ref(storage, `products/colors/${Date.now()}_${pendingFile.name}`);
          await uploadBytes(colorStorageRef, pendingFile);
          image = await getDownloadURL(colorStorageRef);
        }
        colorOptions.push({
          name: draft.name.trim() || draft.hex.trim(),
          hex: draft.hex.trim() || "#111111",
          ...(draft.hex2?.trim() ? { hex2: draft.hex2.trim() } : {}),
          ...(image ? { image } : {}),
        });
      }

      // The main/listing photo: a manually chosen file wins, otherwise fall
      // back to the first color's photo (so products with color photos don't
      // need a separate, redundant top-level upload), then whatever was
      // already saved.
      let imageUrl = colorOptions[0]?.image || editing?.imageUrl || "";
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const trackInventory = form.priceMode === "fixed" && form.trackInventory;
      const payload = {
        name: form.name,
        priceMode: form.priceMode,
        price: form.priceMode === "quote" ? Number(form.price) || 0 : Number(form.price) || 0,
        startingPriceLabel: form.priceMode === "quote" ? form.startingPriceLabel || "Price not set yet" : "",
        unit: form.unit,
        category: form.category,
        description: form.description,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        minimumOrder: form.minimumOrder,
        turnaround: form.turnaround,
        colorOptions,
        colors: colorOptions.map((c) => c.hex),
        colorNames: colorOptions.map((c) => c.name),
        optionGroups: form.optionGroups
          .map((group) => ({
            label: group.label.trim(),
            values: group.values
              .filter((value) => value.label.trim())
              .map((value) => {
                const label = value.label.trim();
                const price = Number(value.price);
                return value.price.trim() && !Number.isNaN(price) ? { label, price } : label;
              }),
          }))
          .filter((group) => group.label && group.values.length > 0),
        trackInventory,
        stockUnits: trackInventory ? Number(form.stockUnits) || 0 : null,
        badge: form.badge || null,
        featured: form.featured,
        imageUrl,
      };

      if (editing) {
        await updateDoc(doc(db, "products", editing.id), payload);
        toast("Product updated.", "success");
      } else {
        await addDoc(collection(db, "products"), {
          ...payload,
          reservedUnits: 0,
          createdAt: serverTimestamp(),
        });
        toast("Product created.", "success");
      }
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast("Couldn't save this product. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      toast("Product deleted.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't delete this product. Please try again.", "error");
    }
  };

  const stockLabel = (product: Product) => {
    if (product.priceMode === "quote" || product.trackInventory === false) return "Not tracked";
    return `${product.stockUnits ?? 0} unit${product.stockUnits === 1 ? "" : "s"}`;
  };

  if (role === "staff") {
    return (
      <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
        This page is only available to the business owner.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/60">{products.length} product or service path{products.length === 1 ? "" : "s"}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-md bg-olive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-olive/90"
        >
          <Plus size={16} /> Add Path
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
          No live products yet. The storefront is currently using the built-in Gyantex service catalog.
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-xs uppercase tracking-wider text-charcoal/50">
                <th className="px-6 py-3 font-medium">Path</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Pricing</th>
                <th className="px-6 py-3 font-medium">Stock</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-soft-grey last:border-0">
                  <td className="flex items-center gap-3 px-6 py-3">
                    <div className="relative h-12 w-10 overflow-hidden rounded bg-soft-grey">
                      <ProductImage src={product.imageUrl} alt={product.name} sizes="40px" className="object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-medium">
                        {product.featured && <Star size={13} className="shrink-0 fill-olive text-olive" aria-label="Best Seller" />}
                        {product.name}
                      </div>
                      {product.description && <div className="line-clamp-1 max-w-xs text-xs text-charcoal/50">{product.description}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-charcoal/70">{product.category || "-"}</td>
                  <td className="px-6 py-3 font-medium">{getPriceLabel(product)}</td>
                  <td className="px-6 py-3">
                    <span className={(product.stockUnits ?? 0) <= 0 && product.trackInventory ? "font-semibold text-terracotta" : "text-charcoal/70"}>
                      {stockLabel(product)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openEdit(product)} className="text-charcoal/50 hover:text-olive" aria-label={`Edit ${product.name}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(product)} className="text-charcoal/50 hover:text-terracotta" aria-label={`Delete ${product.name}`}>
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
          <form onSubmit={handleSave} className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold">{editing ? "Edit Path" : "Add Path"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Pricing mode</label>
                <select
                  value={form.priceMode}
                  onChange={(event) => setForm({ ...form, priceMode: event.target.value as "fixed" | "quote" })}
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                >
                  <option value="fixed">Fixed price</option>
                  <option value="quote">No price yet (not payable online)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Price (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  required={form.priceMode === "fixed"}
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Starting label</label>
                <input value={form.startingPriceLabel} onChange={(event) => setForm({ ...form, startingPriceLabel: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="Price not set yet" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Unit</label>
                <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="project, yard, piece..." />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Badge</label>
                <input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="Most requested" />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 rounded-md bg-soft-grey p-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                    className="h-4 w-4 accent-olive"
                  />
                  Feature as Best Seller
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-24 w-full resize-none rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Minimum order note</label>
                <input value={form.minimumOrder} onChange={(event) => setForm({ ...form, minimumOrder: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="Depends on quantity and fabric choice" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Turnaround</label>
                <input value={form.turnaround} onChange={(event) => setForm({ ...form, turnaround: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="Confirmed during quote" />
              </div>

              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium">Colors</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, colorOptions: [...form.colorOptions, { name: "", hex: "#111111" }] })}
                    className="flex items-center gap-1 text-xs font-semibold text-olive hover:underline"
                  >
                    <Plus size={14} /> Add color
                  </button>
                </div>
                <p className="mb-2 text-xs text-charcoal/50">
                  Add a photo per color so picking it on the product page shows the cloth in that color, not just a swatch.
                  For a combo cloth (e.g. "Red &amp; Black"), turn on Two-tone to show a split swatch instead of one solid color.
                </p>
                <div className="space-y-2">
                  {form.colorOptions.map((color, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border border-charcoal/15 p-2.5">
                      <span
                        className="h-9 w-9 shrink-0 rounded-full border border-charcoal/10"
                        style={getSwatchStyle(color)}
                        aria-hidden="true"
                        title="Preview"
                      />
                      <input
                        type="color"
                        value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.hex) ? color.hex : "#111111"}
                        onChange={(event) => {
                          const next = [...form.colorOptions];
                          next[index] = { ...next[index], hex: event.target.value };
                          setForm({ ...form, colorOptions: next });
                        }}
                        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-charcoal/20 p-0.5"
                        aria-label="Pick color"
                      />
                      <input
                        value={color.hex}
                        onChange={(event) => {
                          const next = [...form.colorOptions];
                          next[index] = { ...next[index], hex: event.target.value };
                          setForm({ ...form, colorOptions: next });
                        }}
                        placeholder="#7b1e2b"
                        className="w-24 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                      />
                      <input
                        value={color.name}
                        onChange={(event) => {
                          const next = [...form.colorOptions];
                          next[index] = { ...next[index], name: event.target.value };
                          setForm({ ...form, colorOptions: next });
                        }}
                        placeholder="Burgundy"
                        className="min-w-[110px] flex-1 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                      />
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-charcoal/60">
                        <input
                          type="checkbox"
                          checked={color.hex2 !== undefined}
                          onChange={(event) => {
                            const next = [...form.colorOptions];
                            next[index] = { ...next[index], hex2: event.target.checked ? "#ffffff" : undefined };
                            setForm({ ...form, colorOptions: next });
                          }}
                          className="accent-olive"
                        />
                        Two-tone
                      </label>
                      {color.hex2 !== undefined && (
                        <input
                          type="color"
                          value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.hex2) ? color.hex2 : "#ffffff"}
                          onChange={(event) => {
                            const next = [...form.colorOptions];
                            next[index] = { ...next[index], hex2: event.target.value };
                            setForm({ ...form, colorOptions: next });
                          }}
                          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-charcoal/20 p-0.5"
                          aria-label="Pick second color"
                          title="Second color"
                        />
                      )}
                      <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-dashed border-charcoal/30 px-2.5 py-2 text-xs hover:border-olive/50">
                        {colorImageFiles[index] ? (
                          <span className="max-w-[90px] truncate">{colorImageFiles[index].name}</span>
                        ) : color.image ? (
                          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded">
                            <ProductImage src={color.image} alt={color.name || "Color photo"} sizes="28px" className="object-cover" />
                          </div>
                        ) : (
                          <>
                            <Upload size={13} className="text-charcoal/50" />
                            <span className="text-charcoal/60">Photo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) setColorImageFiles((prev) => ({ ...prev, [index]: file }));
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, colorOptions: form.colorOptions.filter((_, i) => i !== index) });
                          setColorImageFiles((prev) => {
                            const next = { ...prev };
                            delete next[index];
                            return next;
                          });
                        }}
                        className="shrink-0 rounded-md border border-charcoal/15 px-2 py-2 text-charcoal/50 hover:border-terracotta hover:text-terracotta"
                        aria-label="Remove color"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium">Customer choices (size, cut, etc.)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        optionGroups: [...form.optionGroups, { label: "", values: [{ label: "", price: "" }] }],
                      })
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-olive hover:underline"
                  >
                    <Plus size={14} /> Add choice group
                  </button>
                </div>
                <p className="mb-2 text-xs text-charcoal/50">
                  E.g. a &quot;Cloth Length&quot; group with 6 Yards, 12 Yards, and Full Piece — each can have its own price.
                  Leave a value&apos;s price blank to keep it at the product&apos;s base price above.
                </p>
                {form.optionGroups.length === 0 ? (
                  <p className="text-xs text-charcoal/50">
                    None yet — add one if customers should pick a size, cloth length, or garment type before ordering.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {form.optionGroups.map((group, groupIndex) => (
                      <div key={groupIndex} className="rounded-md border border-charcoal/15 p-3">
                        <div className="flex gap-2">
                          <input
                            value={group.label}
                            onChange={(event) => {
                              const next = [...form.optionGroups];
                              next[groupIndex] = { ...next[groupIndex], label: event.target.value };
                              setForm({ ...form, optionGroups: next });
                            }}
                            placeholder="Cloth Length"
                            className="flex-1 rounded-md border border-charcoal/20 p-2.5 text-sm font-medium outline-none focus:border-olive"
                          />
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, optionGroups: form.optionGroups.filter((_, i) => i !== groupIndex) })}
                            className="shrink-0 rounded-md border border-charcoal/15 px-2.5 text-charcoal/50 hover:border-terracotta hover:text-terracotta"
                            aria-label="Remove choice group"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="mt-2 space-y-2">
                          {group.values.map((value, valueIndex) => (
                            <div key={valueIndex} className="flex items-center gap-2">
                              <input
                                value={value.label}
                                onChange={(event) => {
                                  const next = [...form.optionGroups];
                                  const values = [...next[groupIndex].values];
                                  values[valueIndex] = { ...values[valueIndex], label: event.target.value };
                                  next[groupIndex] = { ...next[groupIndex], values };
                                  setForm({ ...form, optionGroups: next });
                                }}
                                placeholder="12 Yards"
                                className="flex-1 rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
                              />
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-charcoal/45">GHS</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={value.price}
                                  onChange={(event) => {
                                    const next = [...form.optionGroups];
                                    const values = [...next[groupIndex].values];
                                    values[valueIndex] = { ...values[valueIndex], price: event.target.value };
                                    next[groupIndex] = { ...next[groupIndex], values };
                                    setForm({ ...form, optionGroups: next });
                                  }}
                                  placeholder="Base price"
                                  className="w-28 rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...form.optionGroups];
                                  next[groupIndex] = {
                                    ...next[groupIndex],
                                    values: next[groupIndex].values.filter((_, i) => i !== valueIndex),
                                  };
                                  setForm({ ...form, optionGroups: next });
                                }}
                                className="shrink-0 rounded-md border border-charcoal/15 px-2 py-2 text-charcoal/50 hover:border-terracotta hover:text-terracotta"
                                aria-label="Remove value"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...form.optionGroups];
                              next[groupIndex] = {
                                ...next[groupIndex],
                                values: [...next[groupIndex].values, { label: "", price: "" }],
                              };
                              setForm({ ...form, optionGroups: next });
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-olive hover:underline"
                          >
                            <Plus size={13} /> Add value
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Search tags</label>
                <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive" placeholder="funeral, church, school, custom cloth" />
              </div>

              <div className="md:col-span-2 rounded-md bg-soft-grey p-4">
                <label className="flex items-start gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.trackInventory}
                    disabled={form.priceMode === "quote"}
                    onChange={(event) => setForm({ ...form, trackInventory: event.target.checked })}
                    className="mt-1 h-4 w-4 accent-olive"
                  />
                  <span>
                    Track stock for this fixed-price item
                    <span className="mt-1 block text-xs font-normal leading-5 text-charcoal/55">
                      Leave off for custom Gyantex services that are quoted and produced after artwork and quantity are confirmed.
                    </span>
                  </span>
                </label>
                {form.trackInventory && form.priceMode === "fixed" && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-sm font-medium">Stock units</label>
                    <input type="number" min="0" value={form.stockUnits} onChange={(event) => setForm({ ...form, stockUnits: event.target.value })} className="w-full rounded-md border border-charcoal/20 bg-white p-2.5 outline-none focus:border-olive" />
                  </div>
                )}
              </div>

              {form.colorOptions.length === 0 ? (
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Photo</label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-charcoal/30 p-3 transition-colors hover:border-olive/50">
                    <Upload size={18} className="shrink-0 text-charcoal/50" />
                    <span className="truncate text-sm text-charcoal/70">
                      {imageFile ? imageFile.name : editing?.imageUrl ? "Replace current photo" : "Choose a photo"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                  </label>
                </div>
              ) : (
                <p className="md:col-span-2 text-xs text-charcoal/50">
                  This product&apos;s listing photo is its first color&apos;s photo above — no separate upload needed.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Path"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
