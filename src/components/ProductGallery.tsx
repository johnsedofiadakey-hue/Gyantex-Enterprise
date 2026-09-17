"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductImage from "@/components/ProductImage";

interface ProductGalleryProps {
  /** Photos in display order. Give the component a `key` built from this
   * list (e.g. `images.join("|")`) so picking another colour starts back at
   * its first photo instead of an index carried over from the last one. */
  images: string[];
  alt: string;
  sizes: string;
  priority?: boolean;
  /**
   * "overlay": thumbnails float along the bottom of the photo on desktop,
   * dots on smaller screens (the product view). "below": a thumbnail strip
   * under the photo at every size (the full product page). "card": dots
   * only, with arrows that appear on hover — a shop grid card.
   */
  thumbnails: "overlay" | "below" | "card";
  /** Tapping the photo (not swiping it) — e.g. a grid card opens the product. */
  onImageClick?: () => void;
  /** Extra classes on each photo, e.g. a hover zoom. */
  imageClassName?: string;
  /** Left/right arrow keys page through photos — for a view that owns the
   * whole screen, like the desktop product view. */
  keyboard?: boolean;
  className?: string;
  mainClassName?: string;
  /** Rendered on top of the photo, e.g. a Best Seller badge. */
  children?: ReactNode;
}

const SWIPE_DISTANCE = 50;
const SWIPE_VELOCITY = 300;

export default function ProductGallery({
  images,
  alt,
  sizes,
  priority = false,
  thumbnails,
  keyboard = false,
  className = "",
  mainClassName = "",
  onImageClick,
  imageClassName = "",
  children,
}: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  // A swipe ends with a click event too; this keeps it from also opening the product.
  const draggedRef = useRef(false);
  const isCard = thumbnails === "card";
  // +1 when moving forward, -1 back — the photo slides in from that side.
  const [direction, setDirection] = useState(1);
  const count = images.length;
  const current = images[Math.min(index, count - 1)] || images[0];

  const goTo = (next: number) => {
    if (count < 2) return;
    const wrapped = (next + count) % count;
    setDirection(next > index ? 1 : -1);
    setIndex(wrapped);
  };

  useEffect(() => {
    if (!keyboard || count < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") {
        setDirection(1);
        setIndex((value) => (value + 1) % count);
      } else if (event.key === "ArrowLeft") {
        setDirection(-1);
        setIndex((value) => (value - 1 + count) % count);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboard, count]);

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) goTo(index + 1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) goTo(index - 1);
  };

  const thumbnailStrip = (compact: boolean) => (
    <div className={`hide-scrollbar flex gap-2 overflow-x-auto ${compact ? "justify-center" : ""}`}>
      {images.map((src, thumbIndex) => (
        <button
          key={src}
          type="button"
          onClick={() => goTo(thumbIndex)}
          aria-label={`View photo ${thumbIndex + 1} of ${count}`}
          aria-current={thumbIndex === index}
          className={`relative shrink-0 overflow-hidden bg-soft-grey transition ${
            compact ? "h-14 w-14 rounded-lg border-2" : "aspect-square w-20 rounded-xl border-2 sm:w-24"
          } ${
            thumbIndex === index
              ? "border-olive"
              : compact
                ? "border-white/70 opacity-80 hover:opacity-100"
                : "border-transparent hover:border-charcoal/20"
          }`}
        >
          <ProductImage src={src} alt={`${alt} photo ${thumbIndex + 1}`} sizes="96px" className="object-cover" />
        </button>
      ))}
    </div>
  );

  return (
    <div className={className}>
      <div className={`relative overflow-hidden ${mainClassName}`}>
        {/* The next photo, loaded invisibly ahead of time (still lazily, so
            only for galleries near the screen) — swiping to it is then
            instant instead of waiting on the download. */}
        {count > 1 && (
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0">
            <ProductImage src={images[(index + 1) % count]} alt="" sizes={sizes} className="object-cover" />
          </div>
        )}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -48 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onPointerDown={() => {
              draggedRef.current = false;
            }}
            onDragStart={() => {
              draggedRef.current = true;
            }}
            onDragEnd={onDragEnd}
            onClick={() => {
              if (!draggedRef.current) onImageClick?.();
            }}
            className={`absolute inset-0 ${onImageClick ? "cursor-pointer" : count > 1 ? "cursor-grab active:cursor-grabbing" : ""} ${count > 1 ? "touch-pan-y" : ""}`}
          >
            {/* The photo ignores the pointer so a desktop drag moves the
                gallery instead of starting the browser's image drag. */}
            <div className="pointer-events-none absolute inset-0">
              <ProductImage src={current} alt={count > 1 ? `${alt} — photo ${index + 1} of ${count}` : alt} sizes={sizes} priority={priority} className={`object-cover ${imageClassName}`} />
            </div>
          </motion.div>
        </AnimatePresence>

        {children}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className={
                isCard
                  ? "absolute left-2 top-1/2 z-[1] hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:grid"
                  : "absolute left-2 top-1/2 z-[1] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-white lg:left-4 lg:h-11 lg:w-11"
              }
              aria-label="Previous photo"
            >
              <ChevronLeft size={isCard ? 16 : 18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className={
                isCard
                  ? "absolute right-2 top-1/2 z-[1] hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:grid"
                  : "absolute right-2 top-1/2 z-[1] grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-charcoal shadow-sm transition hover:bg-white lg:right-4 lg:h-11 lg:w-11"
              }
              aria-label="Next photo"
            >
              <ChevronRight size={isCard ? 16 : 18} />
            </button>

            {isCard && (
              <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-[1] flex -translate-x-1/2 gap-1.5 rounded-full bg-charcoal/25 px-2 py-1 backdrop-blur-sm">
                {images.map((src, dotIndex) => (
                  <span
                    key={src}
                    className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
                  />
                ))}
              </div>
            )}

            {thumbnails === "overlay" && (
              <>
                <div className="absolute bottom-3 left-1/2 z-[1] flex -translate-x-1/2 gap-1.5 lg:hidden">
                  {images.map((src, dotIndex) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => goTo(dotIndex)}
                      aria-label={`Photo ${dotIndex + 1} of ${count}`}
                      className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
                    />
                  ))}
                </div>
                <div className="absolute inset-x-0 bottom-0 z-[1] hidden bg-gradient-to-t from-charcoal/35 to-transparent px-4 pb-4 pt-10 lg:block">
                  {thumbnailStrip(true)}
                </div>
              </>
            )}

            {!isCard && (
              <div className="absolute bottom-2 right-3 z-[1] rounded-full bg-charcoal/55 px-2 py-0.5 text-[11px] font-medium text-white lg:hidden">
                {index + 1} / {count}
              </div>
            )}
          </>
        )}
      </div>

      {thumbnails === "below" && count > 1 && <div className="mt-3">{thumbnailStrip(false)}</div>}
    </div>
  );
}
