"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Minus,
  Palette,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  PAYMENT_METHODS,
  PICKUP_ADDRESS,
} from "@/lib/config";
import {
  getCategoryAccent,
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
import BrandMark from "@/components/BrandMark";
import CartBadge from "@/components/CartBadge";
import Footer from "@/components/Footer";
import KenteStripe from "@/components/KenteStripe";
import ProductGallery from "@/components/ProductGallery";
import ProductImage from "@/components/ProductImage";
import CartDrawer from "@/components/CartDrawer";
import TextileSelector from "@/components/TextileSelector";
import { getSuggestedProducts } from "@/lib/colorMatch";

export type Product = CatalogProduct;

export default function ProductDetailClient({
  initialProduct,
  allProducts = [],
  initialColorwayId,
}: {
  initialProduct: Product | null;
  /** The storefront's products, for colour-matched suggestions. */
  allProducts?: Product[];
  /** Colour to pre-pick, from a suggestion link (?colour=…). */
  initialColorwayId?: string;
}) {
  const cart = useCartStore();
  const toast = useToastStore((state) => state.show);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(() =>
    getDefaultVariantIndex((initialProduct?.variants || []).filter(isVariantInStock))
  );
  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [textileSku, setTextileSku] = useState<TextileSku | null>(null);
  const [textileColorway, setTextileColorway] = useState<TextileColorway | null>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const product = initialProduct;

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-soft-grey">
        <header className="bg-white px-6 py-4">
          <BrandMark compact />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-serif text-3xl font-semibold">Catalog path not found</h1>
          <p className="max-w-sm text-sm text-charcoal/60">Choose another product from the Gyantex catalog.</p>
          <Link href="/" className="rounded-xl bg-olive px-6 py-3 text-sm font-semibold text-white hover:bg-olive/90">
            Back to catalog
          </Link>
        </main>
      </div>
    );
  }

  const variants = (product.variants || []).filter(isVariantInStock);
  const isTextile = hasTextileOptions(product);
  // The product defines variants, but every one is currently out of stock —
  // distinct from a plain product with no variants at all, which is always buyable.
  const soldOut = !isTextile && (product.variants?.length ?? 0) > 0 && variants.length === 0;
  const selectedVariant = variants[selectedVariantIndex];
  // A variant with its own size (e.g. "12 Yards") already lets the owner
  // price each length independently — showing the generic full/half toggle
  // on top of that just duplicates it with a forced 50% split, so it only
  // applies when no variant on this product uses size that way. A
  // color-only variant is different: it's WHICH item, not HOW MUCH of it, so
  // full/half stays meaningful and isn't disabled by it.
  const canSplit = !variants.some((v) => v.size);
  const effectivePurchaseType = canSplit ? purchaseType : "full";
  // Mirrors functions/src/lib/pricing.ts's computeItemUnitPrice exactly,
  // since the server re-derives this price independently.
  const basePrice = selectedVariant?.price ?? product.price;
  const unitPrice = isTextile ? (textileSku?.piece.price || 0) : effectivePurchaseType === "half" ? basePrice / 2 : basePrice;
  // Picking a colourway swaps the gallery to all of that colour's photos;
  // the cart line uses its cover.
  const gallery = getGalleryImages(product, isTextile ? { colorway: textileColorway } : { variant: selectedVariant });
  const currentImage = gallery[0];
  // Once a colour is picked, suggestions switch to other products in a
  // matching colour (see colorMatch.ts); before that, the same category.
  const suggestions = getSuggestedProducts(allProducts, product, isTextile ? { colorway: textileColorway } : { variant: selectedVariant });
  const selectedColourName = isTextile ? textileColorway?.name : selectedVariant?.color;

  const buildCartItem = () => ({
    id: product.id,
    productId: product.id,
    name: product.name,
    price: unitPrice,
    priceMode: product.priceMode,
    minimumOrder: product.minimumOrder,
    category: product.category,
    image: currentImage,
    color: selectedVariant?.color,
    size: selectedVariant?.size,
    skuId: textileSku?.id,
    fabric: textileSku?.fabric.name,
    colorway: textileSku?.colorway.name,
    pieceLabel: textileSku?.piece.label,
    purchaseType: effectivePurchaseType,
    quantity,
  });

  const addToCart = () => {
    cart.addItem(buildCartItem());
    trackEvent("product_add_to_cart", {
      productId: product.id,
      category: product.category,
    });
    toast(`${product.name} added to your cart.`, "success");
    setCartDrawerOpen(true);
  };


  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-soft-grey bg-white/95 px-4 py-3 backdrop-blur md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-charcoal transition-colors hover:text-olive">
            <ArrowLeft size={20} />
            <span className="hidden text-sm font-medium md:inline">Back to catalog</span>
          </Link>
          <BrandMark compact className="items-center" />
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="relative grid h-10 w-10 place-items-center rounded-full text-charcoal transition-colors hover:bg-soft-grey hover:text-olive"
            aria-label="Open cart"
          >
            <ShoppingBag size={20} />
            <CartBadge />
          </button>
        </div>
      </header>
      <KenteStripe />

      <main className="flex-1 pb-24 md:pb-0">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-12 lg:gap-14">
          <ProductGallery
            key={gallery.join("|")}
            images={gallery}
            alt={product.name}
            sizes="(max-width: 768px) 100vw, 54vw"
            priority
            thumbnails="below"
            mainClassName="aspect-[4/5] rounded-xl bg-soft-grey md:aspect-square"
          >
            {product.featured ? (
              <span className="badge-pulse absolute left-4 top-4 z-[1] flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-charcoal">
                Best Seller
              </span>
            ) : (
              product.badge && (
                <span className="absolute left-4 top-4 z-[1] rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white">
                  {product.badge}
                </span>
              )
            )}
          </ProductGallery>

          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getCategoryAccent(product.category).chip}`}>
                {product.category}
              </span>
            </div>

            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{product.name}</h1>
            {product.description && <p className="mt-4 text-base leading-7 text-charcoal/66">{product.description}</p>}

            <div className="mt-6 flex flex-col gap-2 border-y border-soft-grey py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-charcoal/45">Pricing</div>
                <div className="mt-1 text-2xl font-bold">
                  GHS {(unitPrice * quantity).toFixed(2)}
                </div>
              </div>
              <div className="text-sm leading-6 text-charcoal/58 sm:max-w-xs sm:text-right">
                {product.minimumOrder || "Choose your options, then add this item to cart."}
              </div>
            </div>

            {product.highlights?.length > 0 && (
              <div className="mt-6 grid gap-3">
                {product.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-3 text-sm text-charcoal/72">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-olive" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}

            {isTextile ? (
              <TextileSelector product={product} initialColorwayId={initialColorwayId} onSkuChange={setTextileSku} onColorwayChange={setTextileColorway} />
            ) : variants.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Palette size={18} className="text-olive" />
                    Choose an option
                  </span>
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
                        className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
                          active ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                        }`}
                      >
                        {swatch && (
                          <span
                            className={`h-4 w-4 shrink-0 rounded-full border ${active ? "border-white/50" : "border-charcoal/15"}`}
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
              <div className="mt-8">
                <span className="mb-3 block font-medium">Purchase type</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["full", "half"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setPurchaseType(option)}
                      className={`min-h-[44px] rounded-xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                        purchaseType === option ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                      }`}
                    >
                      {option === "full" ? `Full ${product.unit || "Piece"}` : `Half ${product.unit || "Piece"}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8">
              <span className="mb-3 block font-medium">
                {product.unit
                  ? `How many ${product.unit}${product.unit.endsWith("s") ? "" : "s"}?`
                  : "Quantity"}
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-xl border border-charcoal/15">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <span className="text-sm text-charcoal/52">{product.turnaround || "Timeline confirmed by Gyantex"}</span>
              </div>
            </div>

            {/* Textile collections hide the Add to Cart button until a full
                fabric/colour/piece is picked, rather than showing a disabled
                prompt button the customer can't use yet. */}
            <AnimatePresence initial={false}>
              {(soldOut || !isTextile || textileSku) && (
                <motion.div
                  key="product-cta"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="mt-8"
                >
                  {soldOut ? (
                    <div className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-soft-grey px-5 text-sm font-medium text-charcoal/50">
                      Out of stock
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={addToCart}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 py-4 text-sm font-semibold text-white transition hover:bg-olive/90"
                    >
                      <ShoppingBag size={18} />
                      Add to Cart
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 grid gap-3 border-t border-soft-grey pt-6 text-sm text-charcoal/72">
              <div className="flex items-center gap-3">
                <Truck size={19} className="text-olive" />
                <span>Pickup at {PICKUP_ADDRESS}; delivery can be arranged after confirmation.</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={19} className="text-olive" />
                <span>Pay securely by {PAYMENT_METHODS.join(", ")} at checkout.</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock3 size={19} className="text-olive" />
                <span>Design and print timeline depends on artwork readiness, fabric choice, and quantity.</span>
              </div>
            </div>
          </div>
        </section>

        {suggestions.items.length > 0 && (
          <section className="border-t border-soft-grey px-4 py-12 md:px-6">
            <div className="mx-auto max-w-7xl">
              <h2 className="mb-6 font-serif text-2xl font-semibold md:text-3xl">
                {suggestions.mode === "colour" && selectedColourName ? `More in ${selectedColourName}` : "You might also like"}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {suggestions.items.map((suggestion) => (
                  <Link
                    key={suggestion.product.id}
                    href={`/product/${suggestion.product.id}${suggestion.colorway ? `?colour=${encodeURIComponent(suggestion.colorway.id)}` : ""}`}
                    className="group block"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-soft-grey">
                      <ProductImage
                        src={suggestion.image}
                        alt={suggestion.product.name}
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-3 line-clamp-2 font-serif text-base font-semibold leading-tight group-hover:text-olive">
                      {suggestion.product.name}
                    </div>
                    <div className="mt-1 text-sm text-charcoal/55">
                      {suggestion.colorway ? suggestion.colorway.name : getPriceLabel(suggestion.product)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {product.details?.length > 0 && (
          <section className="bg-white px-4 py-12 md:px-6">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-6 font-serif text-3xl font-semibold">Product details</h2>
              <div className="divide-y divide-soft-grey rounded-xl border border-soft-grey">
                {product.details.map((detail) => (
                  <div key={detail.label} className="grid gap-2 p-5 text-sm md:grid-cols-[180px_1fr]">
                    <div className="font-semibold text-charcoal">{detail.label}</div>
                    <div className="leading-6 text-charcoal/64">{detail.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Mobile sticky bar — like the main button, it only appears once a
          textile collection has a full fabric/colour/piece picked, rather
          than sitting on screen as a disabled prompt. */}
      <AnimatePresence initial={false}>
        {(soldOut || !isTextile || textileSku) && (
          <motion.div
            key="mobile-cta"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-grey bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl md:hidden"
          >
            {soldOut ? (
              <div className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-soft-grey text-sm font-medium text-charcoal/50">
                Out of stock
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addToCart}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-4 text-sm font-semibold text-white"
              >
                <ShoppingBag size={17} />
                Add to Cart
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
    </div>
  );
}
