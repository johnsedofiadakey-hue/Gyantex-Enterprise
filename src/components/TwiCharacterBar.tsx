"use client";

import { useEffect, useState } from "react";

const TWI_LETTERS = ["ɛ", "ɔ", "Ɛ", "Ɔ"];

type TextField = HTMLInputElement | HTMLTextAreaElement;

function isTextField(element: Element | null): element is TextField {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
  if (element instanceof HTMLInputElement) {
    return ["text", "search", ""].includes(element.type) && !element.readOnly && !element.disabled;
  }
  return false;
}

/**
 * Types a letter at the cursor as if it came from the keyboard, so React's
 * onChange fires exactly as it does for normal typing (and Ctrl+Z still
 * undoes it). `insertText` is supported by every current browser for form
 * fields; the fallback sets the value through the native setter React
 * listens to, then dispatches the same input event.
 */
function insertAtCursor(field: TextField, text: string) {
  field.focus();
  if (document.execCommand("insertText", false, text)) return;

  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  const valueSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
  valueSetter?.call(field, field.value.slice(0, start) + text + field.value.slice(end));
  field.setSelectionRange(start + text.length, start + text.length);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Most keyboards have no key for the Twi letters Ɛ ɛ Ɔ ɔ. While any text
 * field in the admin panel is focused, this floating bar offers them as
 * one-tap buttons that insert at the cursor — product names, descriptions,
 * fabric and colourway names, categories, anywhere. Pasting Twi text works
 * too; this is just for typing it.
 */
export default function TwiCharacterBar() {
  const [field, setField] = useState<TextField | null>(null);

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      setField(isTextField(target) ? target : null);
    };
    // Defer: focus moving between two fields fires focusout before focusin,
    // and the bar shouldn't flicker away in between.
    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!isTextField(document.activeElement)) setField(null);
      }, 0);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  if (!field) return null;

  return (
    <div
      role="toolbar"
      aria-label="Insert Twi letters"
      className="fixed bottom-6 right-6 z-[90] flex items-center gap-1 rounded-full bg-charcoal p-1.5 pl-4 text-white shadow-2xl"
    >
      <span className="mr-1 text-xs font-medium text-white/60">Twi</span>
      {TWI_LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          // preventDefault keeps focus (and the cursor position) in the field.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insertAtCursor(field, letter)}
          className="grid h-10 w-10 place-items-center rounded-full text-lg font-semibold transition hover:bg-white/15 active:bg-olive"
          aria-label={`Insert ${letter}`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
