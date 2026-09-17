"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDoc, getDocs, doc, orderBy, query, type DocumentData } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, Eye, LayoutPanelLeft, Monitor } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/useAdminRole";
import { isMarketplaceProduct, normalizeCatalogProduct, type CatalogProduct } from "@/lib/catalog";
import { DRAFTS_COLLECTION, moveProduct, PUBLISHED_COLLECTION } from "@/lib/productPublishing";
import ProductDetailClient from "@/app/product/[slug]/ProductDetailClient";
import ProductDrawer from "@/components/ProductDrawer";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; product: CatalogProduct; raw: DocumentData; isDraft: boolean; allProducts: CatalogProduct[] };

/**
 * Owner-only preview of a product exactly as the shop renders it — both the
 * quick view customers open from the homepage and the full product page —
 * before it's published. Drafts are only readable by the owner (Firestore
 * rules), so this reads in the owner's own signed-in session in the browser;
 * the public server never can.
 */
export default function ProductPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: authLoading, user, role } = useAdminRole();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<"quick" | "page">("quick");
  const [publishing, setPublishing] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => {
    if (role !== "owner" || !id) return;
    let cancelled = false;
    async function load() {
      try {
        const draftSnap = await getDoc(doc(db, DRAFTS_COLLECTION, id));
        const snap = draftSnap.exists() ? draftSnap : await getDoc(doc(db, PUBLISHED_COLLECTION, id));
        const liveSnapshot = await getDocs(query(collection(db, PUBLISHED_COLLECTION), orderBy("createdAt", "desc")));
        if (cancelled) return;
        if (!snap.exists()) {
          setState({ status: "missing" });
          return;
        }
        const allProducts = liveSnapshot.docs
          .map((liveDoc) => normalizeCatalogProduct(liveDoc.id, liveDoc.data() as Partial<CatalogProduct>))
          .filter(isMarketplaceProduct);
        setState({
          status: "ready",
          product: normalizeCatalogProduct(snap.id, snap.data() as Partial<CatalogProduct>),
          raw: snap.data(),
          isDraft: draftSnap.exists(),
          allProducts,
        });
      } catch (error) {
        console.error("Failed to load product preview", error);
        if (!cancelled) setState({ status: "missing" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, role]);

  if (authLoading || (role === "owner" && state.status === "loading")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-grey">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-olive" />
      </div>
    );
  }

  if (!user || role !== "owner") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-soft-grey px-4 text-center">
        <p className="font-medium">Product previews are only available to the shop owner.</p>
        <Link href="/admin/login" className="font-medium text-olive hover:underline">
          Sign in to the admin panel
        </Link>
      </div>
    );
  }

  if (state.status !== "ready") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-soft-grey px-4 text-center">
        <p className="font-medium">This product doesn&apos;t exist any more.</p>
        <Link href="/admin/products" className="font-medium text-olive hover:underline">
          Back to Products
        </Link>
      </div>
    );
  }

  const { product, raw, isDraft, allProducts } = state;
  const isPriced = isMarketplaceProduct(product);

  const publish = async () => {
    setPublishing(true);
    try {
      await moveProduct(product.id, raw, "published");
      setState({ ...state, isDraft: false });
      setJustPublished(true);
    } catch (error) {
      console.error("Failed to publish from preview", error);
      alert("Couldn't publish this product. Please try again from Admin → Products.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Above everything the shop renders, including the quick view (z-75). */}
      <div className="fixed inset-x-0 top-0 z-[95] border-b border-white/10 bg-charcoal text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 md:px-6">
          <Link href="/admin/products" className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
            <ArrowLeft size={16} /> Products
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Eye size={16} className="shrink-0 text-white/60" />
            {justPublished ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-300">
                <CheckCircle2 size={16} /> Published{isPriced ? " — live on the shop now" : ", but hidden until it has a price"}
              </span>
            ) : isDraft ? (
              <span>
                <span className="font-semibold">Draft preview</span>
                <span className="hidden text-white/60 sm:inline"> — customers can&apos;t see this yet</span>
              </span>
            ) : (
              <span>
                <span className="font-semibold">Live product</span>
                <span className="hidden text-white/60 sm:inline"> — this is on the shop</span>
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div role="tablist" aria-label="Preview view" className="flex rounded-md bg-white/10 p-0.5">
              <button
                role="tab"
                aria-selected={view === "quick"}
                onClick={() => setView("quick")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${view === "quick" ? "bg-white text-charcoal" : "text-white/70 hover:text-white"}`}
              >
                <LayoutPanelLeft size={14} /> Quick view
              </button>
              <button
                role="tab"
                aria-selected={view === "page"}
                onClick={() => setView("page")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${view === "page" ? "bg-white text-charcoal" : "text-white/70 hover:text-white"}`}
              >
                <Monitor size={14} /> Product page
              </button>
            </div>
            {isDraft ? (
              <button
                onClick={publish}
                disabled={publishing}
                className="rounded-md bg-olive px-3 py-1.5 text-xs font-semibold text-white hover:bg-olive/90 disabled:opacity-70"
              >
                {publishing ? "Publishing..." : "Publish now"}
              </button>
            ) : (
              <Link href={`/product/${product.id}`} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-white/90">
                View on shop
              </Link>
            )}
          </div>
        </div>
        {isDraft && !isPriced && (
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-charcoal">
            No price set yet — even after publishing, this stays hidden on the shop until it has one.
          </div>
        )}
      </div>

      <div className="pt-24 sm:pt-14">
        {view === "page" ? (
          <ProductDetailClient initialProduct={product} allProducts={allProducts} />
        ) : (
          <>
            <div className="flex min-h-[70vh] items-center justify-center bg-soft-grey px-4 text-center text-sm text-charcoal/50">
              Showing the quick view customers open from the shop&apos;s homepage.
            </div>
            <ProductDrawer
              product={product}
              allProducts={allProducts}
              onOpenChange={(open) => {
                if (!open) setView("page");
              }}
              onAdded={() => undefined}
              onSelectProduct={() => undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}
