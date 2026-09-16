"use client";

import { useEffect, useMemo, useState } from "react";
import ProductImage from "@/components/ProductImage";
import {
  getSwatchStyle,
  getTextileSkus,
  isTextileSkuInStock,
  type CatalogProduct,
  type TextileColorway,
  type TextileSku,
} from "@/lib/catalog";

interface TextileSelectorProps {
  product: CatalogProduct;
  onSkuChange: (sku: TextileSku | null) => void;
  /** Fires as soon as a colourway is picked, ahead of a piece — lets the
   * caller swap the main photo to the actual cloth right away instead of
   * waiting on the full SKU, which only resolves once a piece is chosen too. */
  onColorwayChange?: (colorway: TextileColorway | null) => void;
}

/** A deliberately short, visual purchase sequence for textile collections. */
export default function TextileSelector({ product, onSkuChange, onColorwayChange }: TextileSelectorProps) {
  const [fabricId, setFabricId] = useState("");
  const [colorwayId, setColorwayId] = useState("");
  const [pieceId, setPieceId] = useState("");
  const fabrics = (product.textileFabrics || []).filter((fabric) => fabric.active !== false);
  const fabric = fabrics.find((item) => item.id === fabricId);
  const colorways = (fabric?.colorways || []).filter((colorway) => colorway.active !== false);
  const colorway = colorways.find((item) => item.id === colorwayId);
  const pieces = (colorway?.pieces || []).filter((piece) => piece.active !== false && piece.price > 0);
  const sku = useMemo(
    () => getTextileSkus(product).find((item) => item.fabric.id === fabricId && item.colorway.id === colorwayId && item.piece.id === pieceId) || null,
    [product, fabricId, colorwayId, pieceId]
  );

  useEffect(() => {
    onSkuChange(sku);
  }, [onSkuChange, sku]);

  useEffect(() => {
    onColorwayChange?.(colorway || null);
  }, [onColorwayChange, colorway]);

  return (
    <div className="mt-7 space-y-6 rounded-2xl bg-[#FBF8F1] p-4 sm:p-5">
      <section>
        <div className="mb-2 text-sm font-semibold"><span className="mr-2 text-olive">1.</span>Choose fabric</div>
        <div className="grid grid-cols-2 gap-2">
          {fabrics.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setFabricId(item.id); setColorwayId(""); setPieceId(""); }}
              aria-pressed={fabricId === item.id}
              className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${fabricId === item.id ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      {fabric && (
        <section>
          <div className="mb-2 text-sm font-semibold"><span className="mr-2 text-olive">2.</span>Choose colour</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {colorways.map((item) => {
              const active = colorwayId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setColorwayId(item.id); setPieceId(""); }}
                  aria-pressed={active}
                  className={`overflow-hidden rounded-xl border text-left transition ${active ? "border-olive ring-1 ring-olive" : "border-charcoal/15 bg-white hover:border-olive"}`}
                >
                  {item.image && <div className="relative aspect-[4/3] bg-soft-grey"><ProductImage src={item.image} alt={item.name} sizes="180px" className="object-cover" /></div>}
                  <div className="flex items-center gap-2 p-3 text-sm font-semibold">
                    <span className="h-4 w-4 shrink-0 rounded-full border border-charcoal/15" style={getSwatchStyle(item)} />
                    <span className="line-clamp-2">{item.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {colorway && (
        <section>
          <div className="mb-2 text-sm font-semibold"><span className="mr-2 text-olive">3.</span>Choose piece</div>
          <div className="grid grid-cols-2 gap-2">
            {pieces.map((item) => {
              const option = getTextileSkus(product).find((entry) => entry.fabric.id === fabricId && entry.colorway.id === colorwayId && entry.piece.id === item.id);
              const inStock = option ? isTextileSkuInStock(option) : false;
              const active = pieceId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!inStock}
                  onClick={() => setPieceId(item.id)}
                  aria-pressed={active}
                  className={`min-h-16 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-olive bg-olive text-white" : "border-charcoal/15 bg-white hover:border-olive"}`}
                >
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={active ? "text-xs text-white/75" : "text-xs text-charcoal/55"}>{item.yards} yards · GHS {item.price.toFixed(2)}{!inStock ? " · Sold out" : ""}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
