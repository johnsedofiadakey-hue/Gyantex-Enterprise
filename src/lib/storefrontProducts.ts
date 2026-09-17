import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PRODUCTS, isMarketplaceProduct, normalizeCatalogProduct, type CatalogProduct } from "@/lib/catalog";

/**
 * Every product the public storefront may show, newest first — read fresh
 * per request (see the caching note in src/app/page.tsx). Shared by the
 * homepage and the product page, which needs the full list for its
 * colour-matched suggestions.
 */
export async function getStorefrontProducts(): Promise<CatalogProduct[]> {
  try {
    const productQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(productQuery);
    const fetchedProducts = snapshot.docs.map((doc) =>
      normalizeCatalogProduct(doc.id, doc.data() as Partial<CatalogProduct>)
    );
    const marketplaceProducts = fetchedProducts.filter(isMarketplaceProduct);
    return marketplaceProducts.length > 0 ? marketplaceProducts : DEFAULT_PRODUCTS.filter(isMarketplaceProduct);
  } catch (error) {
    console.error("Error fetching Gyantex catalog", error);
    return DEFAULT_PRODUCTS.filter(isMarketplaceProduct);
  }
}
