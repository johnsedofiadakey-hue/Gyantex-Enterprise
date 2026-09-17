import { getStorefrontProducts } from "@/lib/storefrontProducts";
import HomeClient from "./HomeClient";

// A cached/ISR page (even a short one) means: on low traffic, the CDN can
// serve an arbitrarily old copy to whoever visits next and only refresh it
// in the background for the visitor *after* that — so the owner adding a
// product and immediately checking the live site is exactly the case that
// sees stale content almost every time. This catalog is small and traffic
// is light, so a Firestore read on every request is cheap; always-fresh
// beats a caching optimization that actively undermines trust in the tool.
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getStorefrontProducts();
  return <HomeClient initialProducts={products} />;
}
