"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Package, Search, ShoppingBag, Star } from "lucide-react";
import { type CatalogProduct, getGalleryImages, getPriceLabel, normalizeSearchText } from "@/lib/catalog";
import BrandMark from "@/components/BrandMark";
import CartBadge from "@/components/CartBadge";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/ProductGallery";
import CartDrawer from "@/components/CartDrawer";
import ProductDrawer from "@/components/ProductDrawer";
import KenteStripe from "@/components/KenteStripe";

export default function HomeClient({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products] = useState<CatalogProduct[]>(initialProducts);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  // A stack, not a single product: picking a suggestion inside the drawer
  // pushes onto it instead of replacing what's there, so closing that peek
  // reveals the product you were already looking at instead of losing it.
  // Opening fresh from the grid resets the stack to one entry.
  const [drawerStack, setDrawerStack] = useState<Array<{ product: CatalogProduct; colorwayId?: string }>>([]);
  const topDrawerEntry = drawerStack[drawerStack.length - 1];

  const visibleProducts = useMemo(() => {
    const queryText = normalizeSearchText(searchQuery.trim());
    const list = !queryText
      ? products
      : products.filter((product) => {
          const haystack = normalizeSearchText(
            [product.name, product.category, product.description, ...(product.tags || [])].filter(Boolean).join(" ")
          );
          return haystack.includes(queryText);
        });

    // Best Sellers float to the top.
    return [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [products, searchQuery]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-soft-grey bg-white/95 px-4 py-3 backdrop-blur md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <BrandMark compact />

          <div className="flex items-center gap-1.5 md:gap-4">
            <button
              onClick={() => setSearchOpen((value) => !value)}
              aria-label="Search catalog"
              aria-pressed={searchOpen}
              className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${
                searchOpen ? "bg-olive text-white" : "text-charcoal hover:bg-soft-grey hover:text-olive"
              }`}
            >
              <Search size={19} />
            </button>
            <Link
              href="/track-order"
              className="flex h-11 items-center gap-1.5 rounded-full px-2.5 text-charcoal transition-colors hover:bg-soft-grey hover:text-olive"
              aria-label="Track your order"
            >
              <Package size={18} />
              <span className="text-xs font-semibold">Track</span>
            </Link>
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="relative grid h-11 w-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-soft-grey hover:text-olive"
              aria-label="Open cart"
            >
              <ShoppingBag size={19} />
              <CartBadge />
            </button>
          </div>
        </div>
      </header>
      <KenteStripe />

      {searchOpen && (
        <div className="sticky top-[65px] z-40 border-b border-soft-grey bg-white px-4 py-3 md:px-6">
          <div className="relative mx-auto max-w-7xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search cloth..."
              className="w-full rounded-md border border-charcoal/15 py-3 pl-9 pr-4 text-sm outline-none transition focus:border-olive focus:ring-1 focus:ring-olive"
            />
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="sr-only">Shop Gyantex textile cloth</h1>
            {visibleProducts.length === 0 ? (
              <div className="rounded-md border border-soft-grey bg-soft-grey p-10 text-center text-charcoal/58">
                No matching cloth yet. Try another search term.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {visibleProducts.map((product, index) => (
                  <motion.article
                    key={product.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.24), ease: "easeOut" }}
                    whileHover={{ y: -4 }}
                    className="group flex h-full flex-col"
                  >
                    {/* Swipe (or hover arrows on desktop) through every photo —
                        the product's own and each colour's — right on the card;
                        tapping the photo opens the product as before. */}
                    <ProductGallery
                      images={getGalleryImages(product)}
                      alt={product.name}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={index < 4}
                      thumbnails="card"
                      onImageClick={() => setDrawerStack([{ product }])}
                      imageClassName="transition duration-700 group-hover:scale-105"
                      mainClassName="aspect-square rounded-2xl bg-soft-grey"
                    >
                      {product.featured && (
                        <span className="badge-pulse pointer-events-none absolute left-2.5 top-2.5 z-[1] flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-charcoal sm:left-3 sm:top-3 sm:px-3">
                          <Star size={10} className="fill-charcoal" /> Best Seller
                        </span>
                      )}
                    </ProductGallery>

                    <div className="flex flex-1 flex-col pt-3">
                      <button onClick={() => setDrawerStack([{ product }])} className="text-left font-serif text-base font-semibold leading-tight hover:text-olive sm:text-lg">
                        {product.name}
                      </button>

                      <div className="mt-auto pt-2.5">
                        <div className="mb-2.5 text-sm font-semibold sm:text-base">{getPriceLabel(product)}</div>
                        <button
                          onClick={() => setDrawerStack([{ product }])}
                          className="min-h-[44px] w-full rounded-xl bg-olive px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-olive/90 sm:text-sm"
                        >
                          Choose Options
                        </button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <KenteStripe />
      <Footer />
      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
      <ProductDrawer
        product={topDrawerEntry?.product ?? null}
        initialColorwayId={topDrawerEntry?.colorwayId}
        allProducts={products}
        onOpenChange={(open) => {
          // Closing pops one layer — if that was the only one, the stack is
          // now empty and the drawer disappears; otherwise the product
          // underneath reappears (fresh state, same product).
          if (!open) setDrawerStack((stack) => stack.slice(0, -1));
        }}
        onAdded={() => setCartDrawerOpen(true)}
        onSelectProduct={(product, colorwayId) => {
          setDrawerStack((stack) => [...stack, { product, colorwayId }]);
        }}
      />
    </div>
  );
}
