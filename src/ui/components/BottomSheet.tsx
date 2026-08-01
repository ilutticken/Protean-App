import { useEffect, type ReactNode } from "react";

/** Slide-up sheet (doc 05 §4.3: node/detail views never navigate away). */
export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Lock body scroll while the sheet is open (mobile scroll-through, finding #25).
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 touch-none" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-surface-2 border-t border-line shadow-2xl">
        <div className="sticky top-0 flex justify-center bg-surface-2 pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-surface-3" />
        </div>
        <div className="px-5 pb-8 max-w-3xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
