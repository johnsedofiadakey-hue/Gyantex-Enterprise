"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import {
  getOptionValueLabel,
  getOptionValuePrice,
  getPriceLabel,
  getProductColorOptions,
  getSelectedOptionsPrice,
  getSwatchStyle,
  isQuoteProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import ProductImage from "@/components/ProductImage";

interface ProductDrawerProps {
  product: CatalogProduct | null;
  /** The already-fetched catalog list, reused to compute "similar products"
   * with zero extra Firestore reads — the homepage already has this in
   * memory, no reason to query again per drawer open. */
  allProducts: CatalogProduct[];
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  onSelectProduct: (product: CatalogProduct) => void;
}

export default function ProductDrawer({ product, allProducts, onOpenChange, onAdded, onSelectProduct }: ProductDrawerProps) {
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [product]);

  if (!product) return null;

  // Keyed by product id so switching products remounts this with fresh
  // selection state instead of needing an effect to reset it.
  return (
    <ProductDrawerContent
      key={product.id}
      product={product}
      allProducts={allProducts}
      onOpenChange={onOpenChange}
      onAdded={onAdded}
      onSelectProduct={onSelectProduct}
    />
  );
}

function ProductDrawerContent({ product, allProducts, onOpenChange, onAdded, onSelectProduct }: { product: CatalogProduct } & Omit<ProductDrawerProps, "product">) {
  const cart = useCartStore();
  const toast = useToastStore((state) => state.show);

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((product.optionGroups || []).map((group) => [group.label, getOptionValueLabel(group.values[0])]))
  );

  const quoteProduct = isQuoteProduct(product);
  const colorOptions = getProductColorOptions(product);
  const selectedOptionsPrice = getSelectedOptionsPrice(product.optionGroups, selectedOptions);
  const fullPiecePrice = selectedOptionsPrice ?? product.price;
  const unitPrice = purchaseType === "half" ? fullPiecePrice / 2 : fullPiecePrice;
  const selectedColorLabel = colorOptions[selectedColor]?.name || "Custom print";

  const gallery = useMemo(() => {
    const colorImage = colorOptions[selectedColor]?.image;
    return [colorImage, product.imageUrl, ...(product.gallery || [])].filter(
      (src, index, list): src is string => Boolean(src) && list.indexOf(src) === index
    );
  }, [colorOptions, selectedColor, product.imageUrl, product.gallery]);
  const image = gallery[selectedImage] || gallery[0];

  const similarProducts = useMemo(
    () => allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 6),
    [allProducts, product.category, product.id]
  );

  const handleAdd = () => {
    cart.addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: unitPrice,
      priceMode: product.priceMode,
      minimumOrder: product.minimumOrder,
      category: product.category,
      image,
      color: selectedColorLabel,
      selections: selectedOptions,
      purchaseType,
      quantity,
    });
    trackEvent("quick_add_to_cart", { productId: product.id, category: product.category });
    toast(`${product.name} added to your cart.`, "success");
    onOpenChange(false);
    onAdded();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75]">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-charcoal/45"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          className="absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-6 sm:max-h-none sm:w-[440px] sm:rounded-2xl"
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm hover:bg-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex-1 overflow-y-auto">
            <div className="relative aspect-square bg-soft-grey">
              <AnimatePresence mode="wait">
                <motion.div
                  key={image}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0"
                >
                  <ProductImage src={image} alt={product.name} sizes="440px" priority className="object-cover" />
                </motion.div>
              </AnimatePresence>
              {product.featured && (
                <span className="badge-pulse absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-charcoal">
                  Best Seller
                </span>
              )}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((selectedImage - 1 + gallery.length) % gallery.length)}
                    className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm hover:bg-white"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedImage((selectedImage + 1) % gallery.length)}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm hover:bg-white"
                    aria-label="Next photo"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {gallery.map((src, index) => (
                      <button
                        key={src}
                        onClick={() => setSelectedImage(index)}
                        aria-label={`Photo ${index + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          index === selectedImage ? "w-5 bg-white" : "w-1.5 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4">
              <div className="font-serif text-xl font-semibold leading-tight">{product.name}</div>
              {!quoteProduct && (
                <div className="mt-1.5 text-lg font-semibold">GHS {(unitPrice * quantity).toFixed(2)}</div>
              )}
              {product.description && (
                <p className="mt-3 text-sm leading-6 text-charcoal/62">{product.description}</p>
              )}

              {colorOptions.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Color</span>
                    <span className="text-sm text-charcoal/50">{selectedColorLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {colorOptions.map((color, index) => (
                      <button
                        key={`${color.hex}-${index}`}
                        onClick={() => {
                          setSelectedColor(index);
                          setSelectedImage(0);
                        }}
                        aria-label={`Select ${color.name}`}
                        className={`h-10 w-10 rounded-full border-2 p-0.5 transition ${
                          selectedColor === index ? "border-olive" : "border-transparent hover:border-charcoal/20"
                        }`}
                      >
                        <span className="block h-full w-full rounded-full border border-charcoal/10" style={getSwatchStyle(color)} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!quoteProduct && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Piece</span>
                    <span className="text-sm text-charcoal/50">{purchaseType === "full" ? "Full Piece (12 Yards)" : "Half Piece (6 Yards)"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["full", "half"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPurchaseType(type)}
                        aria-pressed={purchaseType === type}
                        className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          purchaseType === type ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                        }`}
                      >
                        {type === "full" ? "Full Piece" : "Half Piece"}
                        <span className={purchaseType === type ? "ml-1.5 text-white/75" : "ml-1.5 text-charcoal/45"}>
                          GHS {(type === "half" ? fullPiecePrice / 2 : fullPiecePrice).toFixed(0)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.optionGroups?.map((group) => (
                <div key={group.label} className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{group.label}</span>
                    <span className="text-sm text-charcoal/50">{selectedOptions[group.label]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const label = getOptionValueLabel(value);
                      const price = getOptionValuePrice(value);
                      const active = selectedOptions[group.label] === label;
                      return (
                        <button
                          key={label}
                          onClick={() => setSelectedOptions((prev) => ({ ...prev, [group.label]: label }))}
                          aria-pressed={active}
                          className={`min-h-[40px] rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            active ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                          }`}
                        >
                          {label}
                          {price !== undefined && (
                            <span className={active ? "ml-1.5 text-white/75" : "ml-1.5 text-charcoal/45"}>GHS {price.toFixed(0)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-5">
                <span className="mb-2 block text-sm font-medium">Quantity</span>
                <div className="flex items-center rounded-lg border border-charcoal/15">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              {similarProducts.length > 0 && (
                <div className="mt-6">
                  <span className="mb-2 block text-sm font-medium">You might also like</span>
                  <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
                    {similarProducts.map((similar) => (
                      <button
                        key={similar.id}
                        onClick={() => onSelectProduct(similar)}
                        className="w-28 shrink-0 text-left"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-soft-grey">
                          <ProductImage src={similar.imageUrl} alt={similar.name} sizes="112px" className="object-cover" />
                        </div>
                        <div className="mt-1.5 truncate text-xs font-medium leading-tight">{similar.name}</div>
                        <div className="text-xs text-charcoal/50">{getPriceLabel(similar)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-soft-grey p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
            {quoteProduct ? (
              <div className="rounded-xl border border-dashed border-charcoal/20 bg-soft-grey px-5 py-4 text-center text-sm text-charcoal/50">
                Price coming soon
              </div>
            ) : (
              <button
                onClick={handleAdd}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 text-sm font-semibold text-white transition hover:bg-olive/90"
              >
                <Check size={18} />
                Add to Cart — GHS {(unitPrice * quantity).toFixed(2)}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
