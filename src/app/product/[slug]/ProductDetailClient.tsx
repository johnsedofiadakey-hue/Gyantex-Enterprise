"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  getOptionValueLabel,
  getOptionValuePrice,
  getPriceLabel,
  getProductColorOptions,
  getSwatchStyle,
  getSelectedOptionsPrice,
  hasPricedOptionValue,
  isQuoteProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import { trackEvent } from "@/lib/analytics";
import { useCartStore } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import BrandMark from "@/components/BrandMark";
import CartBadge from "@/components/CartBadge";
import Footer from "@/components/Footer";
import KenteStripe from "@/components/KenteStripe";
import ProductImage from "@/components/ProductImage";
import CartDrawer from "@/components/CartDrawer";

export type Product = CatalogProduct;

const PROCESS = [
  "Tell us the event, quantity, colors, wording, and deadline.",
  "Send logos, portraits, crests, or sample references on WhatsApp.",
  "Review the quote and design direction before payment and printing.",
];

export default function ProductDetailClient({ initialProduct }: { initialProduct: Product | null }) {
  const cart = useCartStore();
  const toast = useToastStore((state) => state.show);

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseType, setPurchaseType] = useState<"full" | "half">("full");
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((initialProduct?.optionGroups || []).map((group) => [group.label, getOptionValueLabel(group.values[0])]))
  );

  const product = initialProduct;
  const gallery = useMemo(() => {
    if (!product) return [];
    return [product.imageUrl, ...(product.gallery || [])].filter((src, index, list) => src && list.indexOf(src) === index);
  }, [product]);

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-soft-grey">
        <header className="bg-white px-6 py-4">
          <BrandMark compact />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="font-serif text-3xl font-semibold">Catalog path not found</h1>
          <p className="max-w-sm text-sm text-charcoal/60">Choose another Gyantex textile service or message us on WhatsApp for help.</p>
          <Link href="/" className="rounded-xl bg-olive px-6 py-3 text-sm font-semibold text-white hover:bg-olive/90">
            Back to catalog
          </Link>
        </main>
      </div>
    );
  }

  const quoteProduct = isQuoteProduct(product);
  // A product with its own Customer-choices (e.g. Cloth Length) already lets
  // the owner price each option independently — showing the generic
  // full/half toggle on top of that just duplicates it with a forced 50%
  // split, so it only applies to products that don't define their own.
  const canSplit = !quoteProduct && !hasPricedOptionValue(product.optionGroups);
  const effectivePurchaseType = canSplit ? purchaseType : "full";
  const selectedOptionsPrice = getSelectedOptionsPrice(product.optionGroups, selectedOptions);
  const basePrice = selectedOptionsPrice ?? product.price;
  const unitPrice = effectivePurchaseType === "half" ? basePrice / 2 : basePrice;
  const colorOptions = getProductColorOptions(product);
  const selectedColorLabel = colorOptions[selectedColor]?.name || "Custom print";
  // A color with its own photo always shows that photo — it's the more specific choice.
  const currentImage = colorOptions[selectedColor]?.image || gallery[selectedImage] || product.imageUrl;

  const buildCartItem = () => ({
    id: product.id,
    productId: product.id,
    name: product.name,
    price: unitPrice,
    priceMode: product.priceMode,
    minimumOrder: product.minimumOrder,
    category: product.category,
    image: currentImage,
    color: selectedColorLabel,
    selections: selectedOptions,
    purchaseType: effectivePurchaseType,
    quantity,
  });

  const addToRequest = () => {
    cart.addItem(buildCartItem());
    trackEvent("product_add_to_cart", {
      productId: product.id,
      category: product.category,
      quoteProduct,
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
            aria-label="Open request cart"
          >
            <ShoppingBag size={20} />
            <CartBadge />
          </button>
        </div>
      </header>
      <KenteStripe />

      <main className="flex-1 pb-24 md:pb-0">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:py-12 lg:gap-14">
          <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-soft-grey md:aspect-square">
              <AnimatePresence>
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="absolute inset-0"
                >
                  <ProductImage src={currentImage} alt={product.name} sizes="(max-width: 768px) 100vw, 54vw" priority className="object-cover" />
                </motion.div>
              </AnimatePresence>
              {product.featured ? (
                <span className="badge-pulse absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-charcoal">
                  Best Seller
                </span>
              ) : (
                product.badge && (
                  <span className="absolute left-4 top-4 rounded-full bg-charcoal px-3 py-1.5 text-xs font-semibold text-white">
                    {product.badge}
                  </span>
                )
              )}
            </div>

            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((image, index) => (
                  <button
                    key={image}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square overflow-hidden rounded-xl border bg-soft-grey transition ${
                      selectedImage === index ? "border-olive" : "border-transparent hover:border-charcoal/20"
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <ProductImage
                      src={image}
                      alt={`${product.name} image ${index + 1}`}
                      sizes="110px"
                      priority={index === selectedImage}
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getCategoryAccent(product.category).chip}`}>
                {product.category}
              </span>
              {quoteProduct && (
                <span className="rounded-full bg-sand/60 px-3 py-1 text-xs font-semibold text-charcoal">
                  Quote-first
                </span>
              )}
            </div>

            <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{product.name}</h1>
            <p className="mt-4 text-base leading-7 text-charcoal/66">{product.description}</p>

            <div className="mt-6 flex flex-col gap-2 border-y border-soft-grey py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-charcoal/45">Pricing</div>
                <div className="mt-1 text-2xl font-bold">
                  {quoteProduct ? getPriceLabel(product) : `GHS ${(unitPrice * quantity).toFixed(2)}`}
                </div>
              </div>
              <div className="text-sm leading-6 text-charcoal/58 sm:max-w-xs sm:text-right">
                {product.minimumOrder || "Final cost depends on quantity, fabric, and artwork requirements."}
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

            {colorOptions.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Palette size={18} className="text-olive" />
                    Color
                  </span>
                  <span className="text-sm text-charcoal/50">{selectedColorLabel}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colorOptions.map((color, index) => (
                    <button
                      key={`${color.hex}-${index}`}
                      onClick={() => setSelectedColor(index)}
                      aria-label={`Select ${color.name}`}
                      className={`h-11 w-11 rounded-full border-2 p-1 transition ${
                        selectedColor === index ? "border-olive" : "border-transparent hover:border-charcoal/20"
                      }`}
                    >
                      <span className="block h-full w-full rounded-full border border-charcoal/10" style={getSwatchStyle(color)} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.optionGroups?.map((group) => (
              <div key={group.label} className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-medium">{group.label}</span>
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
                        className={`min-h-[44px] rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          active ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"
                        }`}
                      >
                        {label}
                        {price !== undefined && (
                          <span className={active ? "ml-1.5 text-white/75" : "ml-1.5 text-charcoal/45"}>
                            GHS {price.toFixed(0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {canSplit && (
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
                {quoteProduct
                  ? "Estimated quantity or request count"
                  : product.unit
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

            <div className="mt-8">
              {quoteProduct ? (
                <div className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-soft-grey px-5 text-sm font-medium text-charcoal/50">
                  Price coming soon
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addToRequest()}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 py-4 text-sm font-semibold text-white transition hover:bg-olive/90"
                >
                  <ShoppingBag size={18} />
                  Add to Cart
                </motion.button>
              )}
            </div>

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

        <section className="bg-soft-grey px-4 py-12 md:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-olive">What Gyantex needs</p>
              <h2 className="font-serif text-3xl font-semibold md:text-4xl">A stronger brief gives a faster quote.</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {PROCESS.map((step, index) => (
                <div key={step} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-charcoal text-sm font-bold text-white">{index + 1}</div>
                  <p className="text-sm leading-6 text-charcoal/68">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-soft-grey bg-white p-3 shadow-2xl md:hidden">
        {quoteProduct ? (
          <div className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-dashed border-charcoal/20 bg-soft-grey text-sm font-medium text-charcoal/50">
            Price coming soon
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => addToRequest()}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-olive px-4 text-sm font-semibold text-white"
          >
            <ShoppingBag size={17} />
            Add to Cart
          </motion.button>
        )}
      </div>

      <Footer />
      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
    </div>
  );
}
