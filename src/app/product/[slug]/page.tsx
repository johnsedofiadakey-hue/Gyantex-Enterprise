import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
} from "@/lib/config";
import {
  getDefaultProduct,
  getPriceLabel,
  isQuoteProduct,
  normalizeCatalogProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import ProductDetailClient from "./ProductDetailClient";

const SITE_URL = "https://gyantexenterpr1se.web.app";

// Same reasoning as the homepage (src/app/page.tsx): without this, every
// single product-page view is a fresh SSR invocation + Firestore read —
// real cost and latency for a page whose content (price, photos, colors)
// changes rarely. Stock/availability isn't rendered here at all (checkout
// re-validates it server-side regardless), so a 60s-stale price/photo is
// the only trade-off, same as the homepage.
export const revalidate = 60;

async function getProduct(slug: string): Promise<CatalogProduct | null> {
  try {
    const snap = await getDoc(doc(db, "products", slug));
    if (snap.exists()) {
      return normalizeCatalogProduct(snap.id, snap.data() as Partial<CatalogProduct>);
    }
    return getDefaultProduct(slug);
  } catch (error) {
    console.error("Failed to fetch product for metadata/SSR", error);
    return getDefaultProduct(slug);
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: `Catalog Path Not Found | ${BUSINESS_NAME}`,
      description: BUSINESS_TAGLINE,
    };
  }

  const title = `${product.name} | ${BUSINESS_NAME}`;

  return {
    title,
    description: `${product.description} Pricing: ${getPriceLabel(product)}.`,
    alternates: {
      canonical: `/product/${product.id}`,
    },
    openGraph: {
      title,
      description: product.description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return <ProductDetailClient initialProduct={product} />;
  }

  const absoluteImageUrl = product.imageUrl
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `${SITE_URL}${product.imageUrl}`
    : undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: absoluteImageUrl ? [absoluteImageUrl] : undefined,
    category: product.category,
    url: `${SITE_URL}/product/${product.id}`,
    ...(isQuoteProduct(product)
      ? {}
      : {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/product/${product.id}`,
            priceCurrency: "GHS",
            price: product.price,
            availability: "https://schema.org/InStock",
          },
        }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductDetailClient initialProduct={product} />
    </>
  );
}
