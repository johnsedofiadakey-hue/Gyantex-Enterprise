"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Minus, Plus, X } from "lucide-react";
import {
  getDefaultVariantIndex,
  getGalleryImages,
  getPriceLabel,
  getVariantLabel,
  getVariantSwatchStyle,
  hasTextileOptions,
  isVariantInStock,
  type CatalogProduct,
  type TextileColorway,
  type TextileSku,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import ProductImage from "@/components/ProductImage";
import ProductGallery from "@/components/ProductGallery";
import TextileSelector from "@/components/TextileSelector";
import { getSuggestedProducts } from "@/lib/colorMatch";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ProductDrawerProps {
  product: CatalogProduct | null;
  /** The already-fetched catalog list, reused to compute "similar products"
   * with zero extra Firestore reads — the homepage already has this in
   * memory, no reason to query again per drawer open. */
  allProducts: CatalogProduct[];
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  /** Opens another product — with `colorwayId`, that colour pre-picked. */
  onSelectProduct: (product: CatalogProduct, colorwayId?: string) => void;
  /** Colour to pre-pick when the drawer opens, e.g. from a suggestion. */
  initialColorwayId?: string;
}

export default function ProductDrawer({ product, allProducts, onOpenChange, onAdded, onSelectProduct, initialColorwayId }: ProductDrawerProps) {
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [product]);

  // Esc closes it — expected of any full-screen view on desktop. Kept apart
  // from the scroll lock above: the parent passes an inline handler, and
  // re-subscribing a key listener is harmless where re-toggling overflow isn't.
  useEffect(() => {
    if (!product) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [product, onOpenChange]);

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
      initialColorwayId={initialColorwayId}
    />
  );
}

function ProductDrawerContent({ product, allProducts, onOpenChange, onAdded, onSelectProduct, initialColorwayId }: { product: CatalogProduct } & Omit<ProductDrawerProps, "product">) {
  const cart = useCartStore();
  const toast = useToastStore((state) => state.show);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(() =>
    getDefaultVariantIndex((product.variants || []).filter(isVariantInStock))
  );
  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [textileSku, setTextileSku] = useState<TextileSku | null>(null);
  const [textileColorway, setTextileColorway] = useState<TextileColorway | null>(null);

  const variants = (product.variants || []).filter(isVariantInStock);
  const isTextile = hasTextileOptions(product);
  const soldOut = !isTextile && (product.variants?.length ?? 0) > 0 && variants.length === 0;
  const selectedVariant = variants[selectedVariantIndex];
  // A variant with its own size (e.g. "12 Yards") already lets the owner
  // price each length independently — showing the generic full/half toggle
  // on top of that just duplicates it with a forced 50% split, so it only
  // applies when no variant on this product uses size that way. A
  // color-only variant is different: it's WHICH item, not HOW MUCH of it, so
  // full/half stays meaningful and isn't disabled by it.
  const canSplit = !variants.some((v) => v.size);
  // Mirrors functions/src/lib/pricing.ts's computeItemUnitPrice exactly.
  const fullPiecePrice = selectedVariant?.price ?? product.price;
  const unitPrice = isTextile ? (textileSku?.piece.price || 0) : purchaseType === "half" ? fullPiecePrice / 2 : fullPiecePrice;

  // Picking a colourway swaps the gallery to all of that colour's photos;
  // the cart line uses its cover.
  const gallery = getGalleryImages(product, isTextile ? { colorway: textileColorway } : { variant: selectedVariant });
  const image = gallery[0];

  // Once a colour is picked, suggestions switch to other products in a
  // matching colour (see colorMatch.ts); before that, the same category.
  const suggestions = getSuggestedProducts(allProducts, product, isTextile ? { colorway: textileColorway } : { variant: selectedVariant });
  const selectedColourName = isTextile ? textileColorway?.name : selectedVariant?.color;

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
      color: selectedVariant?.color,
      size: selectedVariant?.size,
      skuId: textileSku?.id,
      fabric: textileSku?.fabric.name,
      colorway: textileSku?.colorway.name,
      pieceLabel: textileSku?.piece.label,
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
        {/* Mobile: bottom sheet (unchanged). Tablet: right-hand panel.
            Desktop (lg+): a large centred view — photo filling the left
            half, choices and Add to Cart on the right — so the cloth is
            shown at a size that actually sells it. The scroll wrapper below
            becomes `display: contents` on desktop, letting the photo,
            details and footer sit directly in this grid. */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          initial={isDesktop ? { opacity: 0, y: 24, scale: 0.98 } : { y: "100%" }}
          animate={isDesktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
          exit={isDesktop ? { opacity: 0, y: 24, scale: 0.98 } : { y: "100%" }}
          transition={isDesktop ? { duration: 0.24, ease: "easeOut" } : { type: "spring", damping: 32, stiffness: 320 }}
          className="absolute inset-x-0 bottom-0 flex max-h-[92%] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-6 sm:max-h-none sm:w-[440px] sm:rounded-2xl md:w-[520px] lg:inset-0 lg:m-auto lg:grid lg:h-[90vh] lg:w-[min(92vw,1320px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:rounded-3xl"
        >
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm hover:bg-white lg:right-5 lg:top-5 lg:h-11 lg:w-11 lg:bg-soft-grey lg:hover:bg-charcoal/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex-1 overflow-y-auto lg:contents">
            <div className="relative aspect-square bg-soft-grey lg:row-span-2 lg:aspect-auto lg:h-full">
              <ProductGallery
                key={gallery.join("|")}
                images={gallery}
                alt={product.name}
                sizes="(min-width: 1024px) 50vw, (min-width: 640px) 520px, 100vw"
                priority
                thumbnails="overlay"
                keyboard={isDesktop}
                className="absolute inset-0"
                mainClassName="h-full w-full"
              >
                {product.featured && (
                  <span className="badge-pulse absolute left-3 top-3 z-[1] rounded-full bg-gold px-3 py-1 text-xs font-semibold text-charcoal">
                    Best Seller
                  </span>
                )}
              </ProductGallery>
            </div>

            <div className="px-5 py-4 lg:col-start-2 lg:row-start-1 lg:overflow-y-auto lg:px-10 lg:pb-8 lg:pt-10">
              <div className="font-serif text-xl font-semibold leading-tight lg:pr-12 lg:text-4xl">{product.name}</div>
              <div className="mt-1.5 text-lg font-semibold lg:mt-3 lg:text-2xl">GHS {(unitPrice * quantity).toFixed(2)}</div>
              {product.description && (
                <p className="mt-3 text-sm leading-6 text-charcoal/62 lg:text-base lg:leading-7">{product.description}</p>
              )}

              {isTextile ? (
                <TextileSelector product={product} initialColorwayId={initialColorwayId} onSkuChange={setTextileSku} onColorwayChange={setTextileColorway} />
              ) : variants.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Choose an option</span>
                    {selectedVariant && (
                      <span className="text-sm text-charcoal/50">
                        {getVariantLabel(selectedVariant)}
                        {selectedVariant.price !== undefined && ` — GHS ${selectedVariant.price.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant, index) => {
                      const swatch = getVariantSwatchStyle(variant);
                      const label = getVariantLabel(variant);
                      const active = selectedVariantIndex === index;
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedVariantIndex(index)}
                          aria-pressed={active}
                          title={variant.price !== undefined ? `${label} — GHS ${variant.price.toFixed(2)}` : label}
                          className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            active ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                          }`}
                        >
                          {swatch && (
                            <span
                              className={`h-3.5 w-3.5 shrink-0 rounded-full border ${active ? "border-white/50" : "border-charcoal/15"}`}
                              style={swatch}
                            />
                          )}
                          {label}
                          {variant.price !== undefined && (
                            <span className={active ? "text-white/75" : "text-charcoal/45"}>GHS {variant.price.toFixed(0)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isTextile && canSplit && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Piece</span>
                    <span className="text-sm text-charcoal/50">{purchaseType === "full" ? "Full Piece" : "Half Piece"}</span>
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

              {suggestions.items.length > 0 && (
                <div className="mt-6">
                  <span className="mb-2 block text-sm font-medium">
                    {suggestions.mode === "colour" && selectedColourName ? `More in ${selectedColourName}` : "You might also like"}
                  </span>
                  <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 lg:-mx-10 lg:px-10">
                    {suggestions.items.map((suggestion) => (
                      <button
                        key={suggestion.product.id}
                        onClick={() => onSelectProduct(suggestion.product, suggestion.colorway?.id)}
                        className="w-28 shrink-0 text-left lg:w-32"
                      >
                        <div className="relative aspect-square overflow-hidden rounded-lg bg-soft-grey">
                          <ProductImage src={suggestion.image} alt={suggestion.product.name} sizes="128px" className="object-cover" />
                        </div>
                        <div className="mt-1.5 truncate text-xs font-medium leading-tight">{suggestion.product.name}</div>
                        <div className="truncate text-xs text-charcoal/50">
                          {suggestion.colorway ? suggestion.colorway.name : getPriceLabel(suggestion.product)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* A textile collection keeps the footer out of sight until a full
              fabric/colour/piece is picked — a disabled prompt button reads as
              clutter, so the Add to Cart bar only appears once it can be used. */}
          <AnimatePresence initial={false}>
            {(soldOut || !isTextile || textileSku) && (
              <motion.div
                key="drawer-cta"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="border-t border-soft-grey p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] lg:col-start-2 lg:row-start-2 lg:px-10 lg:py-6"
              >
                {soldOut ? (
                  <div className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-soft-grey text-sm font-medium text-charcoal/50">
                    Out of stock
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 text-sm font-semibold text-white transition hover:bg-olive/90"
                  >
                    <Check size={18} />
                    {`Add to Cart — GHS ${(unitPrice * quantity).toFixed(2)}`}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
