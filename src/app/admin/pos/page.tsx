"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Check, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { db, functions } from "@/lib/firebase";
import {
  type CatalogProduct,
  getOptionValueLabel,
  getOptionValuePrice,
  getPriceLabel,
  getProductColorOptions,
  getSelectedOptionsPrice,
  getSwatchStyle,
  isQuoteProduct,
  normalizeCatalogProduct,
} from "@/lib/catalog";
import ProductImage from "@/components/ProductImage";
import { useToastStore } from "@/store/useToastStore";
import { getCallableErrorMessage } from "@/lib/errors";

/** CatalogProduct plus the stock fields the storefront never needs but the
 * register does — pulled straight off the Firestore doc, not part of the
 * public CatalogProduct shape. */
type PosProduct = CatalogProduct & { stockUnits?: number; reservedUnits?: number };

interface PosCartLine {
  lineId: string;
  productId: string;
  name: string;
  image?: string;
  unitPrice: number;
  color?: string;
  selections?: Record<string, string>;
  purchaseType: "full" | "half";
  quantity: number;
}

interface SaleReceipt {
  orderNumber: string;
  totalAmount: number;
  changeDue: number | null;
  itemCount: number;
}

function lineKey(productId: string, color: string | undefined, selections: Record<string, string> | undefined, purchaseType: string) {
  return [productId, color || "", JSON.stringify(selections || {}), purchaseType].join("|");
}

export default function AdminPosPage() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile_money">("cash");
  const [amountTendered, setAmountTendered] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const productQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        const live = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              ...normalizeCatalogProduct(d.id, data),
              stockUnits: data.stockUnits,
              reservedUnits: data.reservedUnits,
            } as PosProduct;
          })
          .filter((product) => !isQuoteProduct(product));
        setProducts(live);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load products", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const visibleProducts = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return products;
    return products.filter((product) =>
      [product.name, product.category, ...(product.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(text)
    );
  }, [products, search]);

  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), [cart]);
  const tendered = Number(amountTendered) || 0;
  const changeDue = paymentMethod === "cash" && amountTendered ? tendered - subtotal : null;

  const addLine = (line: Omit<PosCartLine, "lineId">) => {
    const key = lineKey(line.productId, line.color, line.selections, line.purchaseType);
    setCart((prev) => {
      const existing = prev.find((l) => lineKey(l.productId, l.color, l.selections, l.purchaseType) === key);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + line.quantity } : l));
      }
      return [...prev, { ...line, lineId: key }];
    });
    toast(`${line.name} added to sale.`, "success");
  };

  const addSimpleProduct = (product: CatalogProduct) => {
    addLine({
      productId: product.id,
      name: product.name,
      image: product.imageUrl,
      unitPrice: product.price,
      purchaseType: "full",
      quantity: 1,
    });
  };

  const updateLineQty = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l))
        .filter(Boolean)
    );
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.lineId !== lineId));
  };

  const resetSale = () => {
    setCart([]);
    setAmountTendered("");
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setReceipt(null);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const recordPosSale = httpsCallable(functions, "recordPosSale");
      const result = await recordPosSale({
        items: cart.map((line) => ({
          productId: line.productId,
          name: line.name,
          image: line.image,
          color: line.color,
          selections: line.selections,
          purchaseType: line.purchaseType,
          quantity: line.quantity,
        })),
        customer: customerName.trim() || customerPhone.trim() ? { name: customerName.trim(), phone: customerPhone.trim() } : undefined,
        paymentMethod,
        amountTendered: paymentMethod === "cash" && amountTendered ? tendered : undefined,
      });
      const data = result.data as { orderNumber: string; totalAmount: number; changeDue: number | null };
      setReceipt({
        orderNumber: data.orderNumber,
        totalAmount: data.totalAmount,
        changeDue: data.changeDue,
        itemCount: cart.reduce((sum, l) => sum + l.quantity, 0),
      });
      setCart([]);
    } catch (error) {
      console.error(error);
      toast(getCallableErrorMessage(error, "Couldn't complete this sale. Please try again."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 bg-white p-10 text-center shadow-sm">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-olive/10 text-olive">
          <Check size={28} />
        </div>
        <div>
          <div className="font-serif text-2xl font-semibold">Sale Complete</div>
          <div className="mt-1 text-sm text-charcoal/50">Order {receipt.orderNumber}</div>
        </div>
        <div className="w-full space-y-2 rounded-md bg-soft-grey p-4 text-sm">
          <div className="flex justify-between"><span className="text-charcoal/60">Items</span><span className="font-medium">{receipt.itemCount}</span></div>
          <div className="flex justify-between"><span className="text-charcoal/60">Total</span><span className="font-medium">GHS {receipt.totalAmount.toFixed(2)}</span></div>
          {typeof receipt.changeDue === "number" && receipt.changeDue > 0 && (
            <div className="flex justify-between"><span className="text-charcoal/60">Change due</span><span className="font-semibold text-olive">GHS {receipt.changeDue.toFixed(2)}</span></div>
          )}
        </div>
        <button
          onClick={resetSale}
          className="w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90"
        >
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Product picker */}
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products..."
            className="w-full rounded-md border border-charcoal/20 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-olive"
          />
        </div>

        {loading ? (
          <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading products...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
            {products.length === 0
              ? "No fixed-price products yet. Add some in Admin → Products before using the register."
              : "No products match that search."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleProducts.map((product) => (
              <PosProductCard
                key={product.id}
                product={product}
                expanded={expandedProductId === product.id}
                onToggleExpand={() => setExpandedProductId((current) => (current === product.id ? null : product.id))}
                onQuickAdd={() => addSimpleProduct(product)}
                onAddVariant={(line) => {
                  addLine(line);
                  setExpandedProductId(null);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Running sale */}
      <div className="flex flex-col gap-4 bg-white p-5 shadow-sm lg:sticky lg:top-8 lg:self-start">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag size={18} /> Current Sale
        </div>

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-charcoal/40">Add products to start a sale.</p>
        ) : (
          <div className="max-h-[40vh] space-y-3 overflow-y-auto">
            {cart.map((line) => (
              <div key={line.lineId} className="flex items-start gap-2 border-b border-soft-grey pb-3 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium">{line.name}</div>
                  <div className="text-xs text-charcoal/50">
                    {[line.color, line.purchaseType === "half" ? "Half Piece" : null, ...Object.entries(line.selections || {}).map(([k, v]) => `${k}: ${v}`)]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button onClick={() => updateLineQty(line.lineId, -1)} className="grid h-6 w-6 place-items-center rounded border border-charcoal/20 text-charcoal/60 hover:bg-soft-grey">
                      <Minus size={12} />
                    </button>
                    <span className="w-5 text-center text-sm">{line.quantity}</span>
                    <button onClick={() => updateLineQty(line.lineId, 1)} className="grid h-6 w-6 place-items-center rounded border border-charcoal/20 text-charcoal/60 hover:bg-soft-grey">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">GHS {(line.unitPrice * line.quantity).toFixed(2)}</div>
                  <button onClick={() => removeLine(line.lineId)} className="mt-1 text-charcoal/40 hover:text-terracotta" aria-label={`Remove ${line.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-soft-grey pt-3 text-base font-semibold">
          <span>Total</span>
          <span>GHS {subtotal.toFixed(2)}</span>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Payment method</label>
          <div className="grid grid-cols-2 gap-2">
            {(["cash", "mobile_money"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  paymentMethod === method ? "border-olive bg-olive text-white" : "border-charcoal/20 hover:border-olive"
                }`}
              >
                {method === "cash" ? "Cash" : "Mobile Money"}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "cash" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Amount tendered</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountTendered}
              onChange={(event) => setAmountTendered(event.target.value)}
              placeholder={subtotal.toFixed(2)}
              className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
            />
            {changeDue !== null && (
              <p className={`mt-1 text-xs font-medium ${changeDue < 0 ? "text-terracotta" : "text-olive"}`}>
                {changeDue < 0 ? `Short by GHS ${Math.abs(changeDue).toFixed(2)}` : `Change due: GHS ${changeDue.toFixed(2)}`}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Customer name (optional)"
            className="rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
          />
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="Phone (for receipt)"
            className="rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
          />
        </div>

        <button
          onClick={handleCompleteSale}
          disabled={cart.length === 0 || submitting}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-olive text-sm font-semibold text-white transition hover:bg-olive/90 disabled:opacity-50"
        >
          {submitting ? "Completing..." : `Complete Sale — GHS ${subtotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

function PosProductCard({
  product,
  expanded,
  onToggleExpand,
  onQuickAdd,
  onAddVariant,
}: {
  product: PosProduct;
  expanded: boolean;
  onToggleExpand: () => void;
  onQuickAdd: () => void;
  onAddVariant: (line: Omit<PosCartLine, "lineId">) => void;
}) {
  const colorOptions = getProductColorOptions(product);
  const hasVariants = colorOptions.length > 0 || (product.optionGroups?.length ?? 0) > 0;
  const stock = product.trackInventory === false ? null : (product.stockUnits ?? 0) - (product.reservedUnits ?? 0);
  const outOfStock = stock !== null && stock <= 0;

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((product.optionGroups || []).map((group) => [group.label, getOptionValueLabel(group.values[0])]))
  );
  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [quantity, setQuantity] = useState(1);

  const unitPrice = getSelectedOptionsPrice(product.optionGroups, selectedOptions) ?? product.price;
  const finalUnitPrice = purchaseType === "half" ? unitPrice / 2 : unitPrice;

  const handleClick = () => {
    if (outOfStock) return;
    if (!hasVariants) {
      onQuickAdd();
      return;
    }
    onToggleExpand();
  };

  const handleAdd = () => {
    onAddVariant({
      productId: product.id,
      name: product.name,
      image: colorOptions[selectedColor]?.image || product.imageUrl,
      unitPrice: finalUnitPrice,
      color: colorOptions[selectedColor]?.name,
      selections: Object.keys(selectedOptions).length ? selectedOptions : undefined,
      purchaseType,
      quantity,
    });
    setQuantity(1);
    setPurchaseType("full");
  };

  return (
    <div className={`bg-white shadow-sm transition ${expanded ? "col-span-2 sm:col-span-3" : ""}`}>
      <button
        onClick={handleClick}
        disabled={outOfStock}
        className="relative block aspect-square w-full overflow-hidden bg-soft-grey text-left disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ProductImage src={product.imageUrl} alt={product.name} sizes="200px" className="object-cover" />
        {stock !== null && (
          <span className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${outOfStock ? "bg-terracotta text-white" : "bg-white/90 text-charcoal"}`}>
            {outOfStock ? "Out of stock" : `${stock} left`}
          </span>
        )}
      </button>
      <div className="p-2.5">
        <div className="truncate text-xs font-medium">{product.name}</div>
        <div className="text-xs text-charcoal/50">{getPriceLabel(product)}</div>
      </div>

      {expanded && hasVariants && (
        <div className="border-t border-soft-grey p-4">
          {colorOptions.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-xs font-medium text-charcoal/60">Color</div>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color, index) => (
                  <button
                    key={`${color.hex}-${index}`}
                    onClick={() => setSelectedColor(index)}
                    className={`h-8 w-8 rounded-full border-2 p-0.5 transition ${
                      selectedColor === index ? "border-olive" : "border-transparent hover:border-charcoal/20"
                    }`}
                    aria-label={`Select ${color.name}`}
                  >
                    <span className="block h-full w-full rounded-full border border-charcoal/10" style={getSwatchStyle(color)} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.optionGroups?.map((group) => (
            <div key={group.label} className="mb-3">
              <div className="mb-1.5 text-xs font-medium text-charcoal/60">{group.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {group.values.map((value) => {
                  const label = getOptionValueLabel(value);
                  const price = getOptionValuePrice(value);
                  const active = selectedOptions[group.label] === label;
                  return (
                    <button
                      key={label}
                      onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.label]: label }))}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                        active ? "border-olive bg-olive text-white" : "border-charcoal/15 hover:border-olive"
                      }`}
                    >
                      {label}
                      {price !== undefined && <span className={active ? "ml-1 text-white/75" : "ml-1 text-charcoal/45"}>GHS {price.toFixed(0)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mb-3 flex items-center gap-4">
            <div className="flex rounded-md border border-charcoal/15">
              {(["full", "half"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setPurchaseType(type)}
                  className={`px-3 py-1.5 text-xs font-medium ${purchaseType === type ? "bg-olive text-white" : "text-charcoal/60"}`}
                >
                  {type === "full" ? "Full Piece" : "Half Piece"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid h-7 w-7 place-items-center rounded border border-charcoal/20 text-charcoal/60 hover:bg-soft-grey">
                <Minus size={12} />
              </button>
              <span className="w-5 text-center text-sm">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="grid h-7 w-7 place-items-center rounded border border-charcoal/20 text-charcoal/60 hover:bg-soft-grey">
                <Plus size={12} />
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-olive py-2.5 text-sm font-semibold text-white transition hover:bg-olive/90"
          >
            Add to Sale — GHS {(finalUnitPrice * quantity).toFixed(2)}
          </button>
        </div>
      )}
    </div>
  );
}
