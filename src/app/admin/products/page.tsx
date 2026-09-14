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
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Pencil, Plus, Star, Trash2, Upload, X } from "lucide-react";
import {
  DEFAULT_CATEGORIES,
  deriveVariants,
  getPriceLabel,
  getSwatchStyle,
  isMarketplaceProduct,
  normalizeCategory,
  type Category,
  type ProductColorOption,
  type ProductOptionGroup,
  type ProductVariant,
} from "@/lib/catalog";
import { db, storage } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";
import ProductImage from "@/components/ProductImage";
import { compressImageForUpload } from "@/lib/imageCompression";

interface Product {
  id: string;
  name: string;
  price: number;
  priceMode?: "fixed" | "quote";
  startingPriceLabel?: string;
  unit?: string;
  category?: string;
  imageUrl?: string;
  variants?: ProductVariant[];
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

/** Editable form shape for one row in the Variants table — one row per thing
 * actually sold: an optional color (`hex`/`hex2` — two-tone works exactly as
 * it always has), an optional size/length label, an optional price (blank =
 * the product's base price), and an optional photo. `image` holds an
 * already-uploaded URL; `pendingFile` holds a newly-chosen photo not yet
 * uploaded, kept directly on the row (not a separate index-keyed map) so it
 * always travels with the right row through adding/removing/reordering.
 * `inStock` (default true) pulls just this one row from sale when it's sold
 * out, without touching the rest of the product. */
interface VariantDraft {
  color: string;
  hex: string;
  hex2?: string;
  size: string;
  price: string;
  image?: string;
  pendingFile?: File;
  inStock: boolean;
}

const DEFAULT_VARIANT_DRAFTS: VariantDraft[] = [
  { color: "Black", hex: "#111111", size: "", price: "", inStock: true },
  { color: "White", hex: "#ffffff", size: "", price: "", inStock: true },
  { color: "Burgundy", hex: "#7b1e2b", size: "", price: "", inStock: true },
  { color: "Gold", hex: "#c8b27a", size: "", price: "", inStock: true },
];

const EMPTY_FORM = {
  name: "",
  price: "",
  category: "Funeral Cloth",
  description: "",
  tags: "",
  variants: DEFAULT_VARIANT_DRAFTS,
  trackInventory: false,
  stockUnits: "",
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
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name || "",
      price: product.price ? String(product.price) : "",
      category: normalizeCategory(product.category || "Funeral Cloth"),
      description: product.description || "",
      tags: (product.tags || []).join(", "),
      // deriveVariants returns product.variants as-is when set, or flattens
      // this product's legacy Colors/Customer-choices data into rows if it
      // hasn't been re-saved through this table yet — either way nothing
      // already configured is lost.
      variants: deriveVariants(product).map((variant) => ({
        color: variant.color || "",
        hex: variant.hex || "#111111",
        hex2: variant.hex2,
        size: variant.size || "",
        image: variant.image,
        price: variant.price !== undefined ? String(variant.price) : "",
        inStock: variant.inStock !== false,
      })),
      trackInventory: product.trackInventory !== false && (product.price || 0) > 0,
      stockUnits: String(product.stockUnits ?? ""),
      featured: product.featured || false,
    });
    setImageFile(null);
    setShowForm(true);
  };

  // Best-effort cleanup for a photo that's no longer referenced by anything
  // (replaced, or its product/color was deleted) — every upload path
  // includes Date.now(), so a given URL is never shared between two
  // different uploads and is always safe to remove once nothing points to
  // it. Only touches real Storage URLs — the built-in catalog's local
  // /images/... placeholders aren't Storage objects and are silently
  // no-ops here (deleteObject just fails "not found," which we swallow).
  // A failure never blocks the save/delete it's cleaning up after.
  const deleteStorageImage = async (url?: string) => {
    if (!url || !/^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(url)) return;
    try {
      await deleteObject(ref(storage, url));
    } catch (error) {
      console.warn("Couldn't clean up old product photo (non-fatal)", error);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name) {
      toast("Name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      // Compressed + uploaded in parallel — each variant's photo is
      // independent, so there's no reason to make one wait on another.
      const variantUploads = await Promise.all(
        form.variants.map(async (draft) => {
          if (!draft.color.trim() && !draft.size.trim()) return null;
          let image = draft.image || "";
          if (draft.pendingFile) {
            const compressed = await compressImageForUpload(draft.pendingFile);
            const variantStorageRef = ref(storage, `products/variants/${Date.now()}_${compressed.name}`);
            await uploadBytes(variantStorageRef, compressed);
            image = await getDownloadURL(variantStorageRef);
          }
          const variantPrice = Number(draft.price);
          const variant: ProductVariant = {
            ...(draft.color.trim() ? { color: draft.color.trim(), hex: draft.hex.trim() || "#111111" } : {}),
            ...(draft.color.trim() && draft.hex2?.trim() ? { hex2: draft.hex2.trim() } : {}),
            ...(draft.size.trim() ? { size: draft.size.trim() } : {}),
            ...(image ? { image } : {}),
            ...(draft.price.trim() && !Number.isNaN(variantPrice) ? { price: variantPrice } : {}),
            // Only stored when explicitly off — absent means in stock.
            ...(draft.inStock === false ? { inStock: false } : {}),
          };
          return variant;
        })
      );
      const variants: ProductVariant[] = variantUploads.filter((v): v is ProductVariant => v !== null);

      // The main/listing photo: a manually chosen file wins, otherwise fall
      // back to the first variant's photo (so products with variant photos
      // don't need a separate, redundant top-level upload), then whatever
      // was already saved.
      let imageUrl = variants[0]?.image || editing?.imageUrl || "";
      if (imageFile) {
        const compressed = await compressImageForUpload(imageFile);
        const storageRef = ref(storage, `products/${Date.now()}_${compressed.name}`);
        await uploadBytes(storageRef, compressed);
        imageUrl = await getDownloadURL(storageRef);
      }

      // A product with no price (and no priced variant) is hidden from the
      // public site entirely — the storefront is a straight marketplace now,
      // not a quote-request flow, so an unpriced item has nothing to show.
      // Treat this as a draft: set a real price (here or per-variant below)
      // to make it visible and purchasable.
      const price = Number(form.price) || 0;
      const isQuote = price <= 0;
      const trackInventory = !isQuote && form.trackInventory;
      const payload = {
        name: form.name,
        priceMode: isQuote ? "quote" : "fixed",
        price,
        startingPriceLabel: isQuote ? "Price not set yet" : "",
        category: form.category,
        description: form.description,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        variants,
        // Cleared going forward — `variants` is the single source of truth
        // now; this form always writes it, never the old split shape.
        colorOptions: [],
        colors: [],
        colorNames: [],
        optionGroups: [],
        trackInventory,
        stockUnits: trackInventory ? Math.max(0, Number(form.stockUnits) || 0) : null,
        featured: form.featured,
        imageUrl,
      };

      if (editing) {
        await updateDoc(doc(db, "products", editing.id), payload);
        toast("Product updated.", "success");

        // Clean up any photo that was on this product before but isn't
        // referenced by the version we just saved — a replaced main photo, a
        // replaced variant photo, a variant that got removed entirely, or
        // (the first time a legacy product is edited here) an old color
        // photo now folded into variants above.
        const oldUrls = [
          editing.imageUrl,
          ...(editing.variants || []).map((v) => v.image),
          ...(editing.colorOptions || []).map((c) => c.image),
        ].filter(Boolean) as string[];
        const newUrls = new Set([imageUrl, ...variants.map((v) => v.image)].filter(Boolean) as string[]);
        const orphaned = oldUrls.filter((url) => !newUrls.has(url));
        await Promise.all(orphaned.map(deleteStorageImage));
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
      const urls = [
        product.imageUrl,
        ...(product.variants || []).map((v) => v.image),
        ...(product.colorOptions || []).map((c) => c.image),
      ].filter(Boolean) as string[];
      await Promise.all(urls.map(deleteStorageImage));
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
                  <td className="px-6 py-3 font-medium">
                    {getPriceLabel(product)}
                    {!isMarketplaceProduct(product) && (
                      <span
                        className="ml-2 rounded-full bg-terracotta/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta"
                        title="No price set — this draft isn't visible on the public site yet"
                      >
                        Hidden
                      </span>
                    )}
                  </td>
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
                <label className="mb-1.5 block text-sm font-medium">Price (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  placeholder="Leave blank to save as a draft"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
                <p className="mt-1 text-xs text-charcoal/45">
                  Blank hides this product from the public site entirely — it stays a draft until it has a price. If any
                  Variant below has its own price, the one the customer picks is charged instead of this base price (and
                  the product is already visible).
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive">
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center">
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

              <div className="md:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium">Variants</label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        variants: [...form.variants, { color: "", hex: "#111111", size: "", price: "", inStock: true }],
                      })
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-olive hover:underline"
                  >
                    <Plus size={14} /> Add variant
                  </button>
                </div>
                <p className="mb-2 text-xs text-charcoal/50">
                  One row per thing you actually sell — a color, a size (e.g. &quot;12 Yards&quot;), or both together as
                  one row (e.g. &quot;Gold — Lace, 12 Yards&quot;) at its own price and photo. Leave price blank to use the
                  product&apos;s base price above. Turn on Two-tone for a combo cloth (e.g. &quot;Red &amp; Black&quot;).
                  Uncheck In stock to pull just that one row from sale when it sells out.
                </p>
                {form.variants.length === 0 ? (
                  <p className="text-xs text-charcoal/50">
                    None yet — add one if customers should pick a color, size, or variant before ordering.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.variants.map((variant, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border border-charcoal/15 p-2.5">
                        <span
                          className="h-9 w-9 shrink-0 rounded-full border border-charcoal/10"
                          style={getSwatchStyle(variant)}
                          aria-hidden="true"
                          title="Preview"
                        />
                        <input
                          type="color"
                          value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(variant.hex) ? variant.hex : "#111111"}
                          onChange={(event) => {
                            const next = [...form.variants];
                            next[index] = { ...next[index], hex: event.target.value };
                            setForm({ ...form, variants: next });
                          }}
                          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-charcoal/20 p-0.5"
                          aria-label="Pick color"
                        />
                        <input
                          value={variant.color}
                          onChange={(event) => {
                            const next = [...form.variants];
                            next[index] = { ...next[index], color: event.target.value };
                            setForm({ ...form, variants: next });
                          }}
                          placeholder="Color (optional)"
                          className="min-w-[100px] flex-1 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                        />
                        <input
                          value={variant.size}
                          onChange={(event) => {
                            const next = [...form.variants];
                            next[index] = { ...next[index], size: event.target.value };
                            setForm({ ...form, variants: next });
                          }}
                          placeholder="Size (optional)"
                          className="min-w-[100px] flex-1 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                        />
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-xs text-charcoal/45">GHS</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={variant.price}
                            onChange={(event) => {
                              const next = [...form.variants];
                              next[index] = { ...next[index], price: event.target.value };
                              setForm({ ...form, variants: next });
                            }}
                            placeholder="Base price"
                            className="w-24 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                          />
                        </div>
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-charcoal/60">
                          <input
                            type="checkbox"
                            checked={variant.hex2 !== undefined}
                            onChange={(event) => {
                              const next = [...form.variants];
                              next[index] = { ...next[index], hex2: event.target.checked ? "#ffffff" : undefined };
                              setForm({ ...form, variants: next });
                            }}
                            className="accent-olive"
                          />
                          Two-tone
                        </label>
                        {variant.hex2 !== undefined && (
                          <input
                            type="color"
                            value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(variant.hex2) ? variant.hex2 : "#ffffff"}
                            onChange={(event) => {
                              const next = [...form.variants];
                              next[index] = { ...next[index], hex2: event.target.value };
                              setForm({ ...form, variants: next });
                            }}
                            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-charcoal/20 p-0.5"
                            aria-label="Pick second color"
                            title="Second color"
                          />
                        )}
                        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-dashed border-charcoal/30 px-2.5 py-2 text-xs hover:border-olive/50">
                          {variant.pendingFile ? (
                            <span className="max-w-[90px] truncate">{variant.pendingFile.name}</span>
                          ) : variant.image ? (
                            <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded">
                              <ProductImage src={variant.image} alt={variant.color || variant.size || "Variant photo"} sizes="28px" className="object-cover" />
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
                              if (!file) return;
                              const next = [...form.variants];
                              next[index] = { ...next[index], pendingFile: file };
                              setForm({ ...form, variants: next });
                            }}
                          />
                        </label>
                        <label
                          className="flex shrink-0 items-center gap-1.5 text-xs text-charcoal/60"
                          title="Uncheck to pull just this row from sale, e.g. it's sold out"
                        >
                          <input
                            type="checkbox"
                            checked={variant.inStock}
                            onChange={(event) => {
                              const next = [...form.variants];
                              next[index] = { ...next[index], inStock: event.target.checked };
                              setForm({ ...form, variants: next });
                            }}
                            className="accent-olive"
                          />
                          In stock
                        </label>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) })}
                          className="shrink-0 rounded-md border border-charcoal/15 px-2 py-2 text-charcoal/50 hover:border-terracotta hover:text-terracotta"
                          aria-label="Remove variant"
                        >
                          <X size={14} />
                        </button>
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
                    disabled={!(Number(form.price) > 0)}
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
                {form.trackInventory && Number(form.price) > 0 && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-sm font-medium">Stock units</label>
                    <input type="number" min="0" value={form.stockUnits} onChange={(event) => setForm({ ...form, stockUnits: event.target.value })} className="w-full rounded-md border border-charcoal/20 bg-white p-2.5 outline-none focus:border-olive" />
                  </div>
                )}
              </div>

              {form.variants.length === 0 ? (
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
                  This product&apos;s listing photo is its first variant&apos;s photo above — no separate upload needed.
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
