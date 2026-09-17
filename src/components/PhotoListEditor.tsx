"use client";

import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import LocalImagePreview from "@/components/LocalImagePreview";
import ProductImage from "@/components/ProductImage";

/**
 * One photo in an editable list: either already uploaded (`url`) or just
 * picked and waiting for Save (`file`). Keeping both kinds in one ordered
 * list lets the owner reorder and pick the cover before anything uploads.
 */
export interface PhotoItem {
  id: string;
  url?: string;
  file?: File;
}

export function photoItemsFromUrls(urls: string[]): PhotoItem[] {
  return urls.map((url) => ({ id: url, url }));
}

interface PhotoListEditorProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  max: number;
  /** Alt text stem for the thumbnails, e.g. the colourway name. */
  label: string;
  size?: "sm" | "md";
}

let nextPhotoId = 0;

/**
 * Thumbnail grid for a list of photos: add several at once, move left/right
 * (the first is the cover), remove. Every change is local until the product
 * is saved — uploading happens then, in this order.
 */
export default function PhotoListEditor({ photos, onChange, max, label, size = "md" }: PhotoListEditorProps) {
  const tile = size === "sm" ? "h-16 w-16" : "h-20 w-20";
  const remaining = max - photos.length;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining)
      .map((file) => ({ id: `new-${Date.now()}-${nextPhotoId++}`, file }));
    onChange([...photos, ...added]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className={`group relative ${tile} shrink-0 overflow-hidden rounded-md border border-charcoal/15 bg-soft-grey`}>
            {photo.file ? (
              <LocalImagePreview file={photo.file} alt={`${label} photo ${index + 1}`} />
            ) : (
              <ProductImage src={photo.url} alt={`${label} photo ${index + 1}`} sizes="80px" className="object-cover" />
            )}
            {index === 0 && (
              <span className="absolute left-1 top-1 rounded bg-olive px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
                Cover
              </span>
            )}
            {photo.file && (
              <span className="absolute bottom-6 left-1 rounded bg-charcoal/70 px-1 py-px text-[9px] font-medium text-white">New</span>
            )}
            <button
              type="button"
              onClick={() => onChange(photos.filter((item) => item.id !== photo.id))}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-charcoal shadow-sm hover:bg-terracotta hover:text-white"
              aria-label={`Remove ${label} photo ${index + 1}`}
            >
              <X size={11} />
            </button>
            {photos.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-charcoal/55">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  className="grid h-5 flex-1 place-items-center text-white hover:bg-charcoal/40 disabled:opacity-30"
                  aria-label={`Move ${label} photo ${index + 1} earlier`}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === photos.length - 1}
                  className="grid h-5 flex-1 place-items-center text-white hover:bg-charcoal/40 disabled:opacity-30"
                  aria-label={`Move ${label} photo ${index + 1} later`}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        ))}

        {remaining > 0 && (
          <label
            className={`${tile} flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-charcoal/30 text-charcoal/55 transition hover:border-olive hover:text-olive`}
          >
            <ImagePlus size={size === "sm" ? 16 : 18} />
            <span className="text-[10px] font-medium leading-none">{photos.length ? "Add more" : "Add photos"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-charcoal/45">
        {photos.length}/{max} photos · first is the cover · pick several at once
      </p>
    </div>
  );
}
