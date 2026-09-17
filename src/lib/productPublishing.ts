import { doc, serverTimestamp, writeBatch, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Where a product document lives: drafts are owner-only, published products are public. */
export const PUBLISHED_COLLECTION = "products";
export const DRAFTS_COLLECTION = "productDrafts";

export type ProductStatus = "draft" | "published";

/**
 * Publishes a draft or unpublishes a live product by moving its document
 * between the two collections under the same id, in one atomic batch — it is
 * never in both places, and never in neither. `data` is the document as
 * stored (any UI-only fields must already be stripped).
 */
export async function moveProduct(productId: string, data: DocumentData, to: ProductStatus) {
  const batch = writeBatch(db);
  const target = to === "published" ? PUBLISHED_COLLECTION : DRAFTS_COLLECTION;
  const source = to === "published" ? DRAFTS_COLLECTION : PUBLISHED_COLLECTION;
  batch.set(doc(db, target, productId), {
    ...data,
    updatedAt: serverTimestamp(),
    ...(to === "published" ? { publishedAt: serverTimestamp() } : { unpublishedAt: serverTimestamp() }),
  });
  batch.delete(doc(db, source, productId));
  await batch.commit();
}
