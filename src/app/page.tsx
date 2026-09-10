import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PRODUCTS, normalizeCatalogProduct, type CatalogProduct } from "@/lib/catalog";
import HomeClient from "./HomeClient";

// A cached/ISR page (even a short one) means: on low traffic, the CDN can
// serve an arbitrarily old copy to whoever visits next and only refresh it
// in the background for the visitor *after* that — so the owner adding a
// product and immediately checking the live site is exactly the case that
// sees stale content almost every time. This catalog is small and traffic
// is light, so a Firestore read on every request is cheap; always-fresh
// beats a caching optimization that actively undermines trust in the tool.
export const dynamic = "force-dynamic";

async function getProducts(): Promise<CatalogProduct[]> {
  try {
    const productQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(productQuery);
    const fetchedProducts = snapshot.docs.map((doc) =>
      normalizeCatalogProduct(doc.id, doc.data() as Partial<CatalogProduct>)
    );
    return fetchedProducts.length > 0 ? fetchedProducts : DEFAULT_PRODUCTS;
  } catch (error) {
    console.error("Error fetching Gyantex catalog", error);
    return DEFAULT_PRODUCTS;
  }
}

export default async function Home() {
  const products = await getProducts();
  return <HomeClient initialProducts={products} />;
}
