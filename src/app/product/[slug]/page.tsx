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
  normalizeCatalogProduct,
  type CatalogProduct,
} from "@/lib/catalog";
import ProductDetailClient from "./ProductDetailClient";

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

  return {
    title: `${product.name} | ${BUSINESS_NAME}`,
    description: `${product.description} Pricing: ${getPriceLabel(product)}.`,
    openGraph: {
      title: `${product.name} | ${BUSINESS_NAME}`,
      description: product.description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
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

  return <ProductDetailClient initialProduct={product} />;
}
