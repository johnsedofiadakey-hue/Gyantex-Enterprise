import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PRODUCTS, normalizeCatalogProduct, type CatalogProduct } from "@/lib/catalog";
import HomeClient from "./HomeClient";

// Without this, Next prerenders "/" once at build time and serves that same
// static HTML forever — any product the owner adds or edits in Admin would
// never show up on the live storefront until the next deploy. Revalidating
// every 60s keeps it near-instant (served from cache) while still picking up
// admin edits within a minute, with no redeploy needed.
export const revalidate = 60;

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
