import type { MetadataRoute } from "next";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PRODUCTS } from "@/lib/catalog";

const SITE_URL = "https://gyantex.com";

const STATIC_ROUTES = ["", "/contact", "/terms", "/privacy", "/returns"];

async function getProductIds(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) return snap.docs.map((doc) => doc.id);
  } catch (error) {
    console.error("Failed to fetch products for sitemap", error);
  }
  return DEFAULT_PRODUCTS.map((product) => product.id);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productIds = await getProductIds();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${SITE_URL}/product/${id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...productEntries];
}
