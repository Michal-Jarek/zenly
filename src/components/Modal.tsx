"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Accessible modal dialog. When `onClose` is omitted the dialog is non-dismissable
 * (no close button, Escape and backdrop clicks are ignored) — used to enforce the
 * mandatory first survey (RB-06).
 *
 * The panel is a flex column that clips overflow to its rounded corners; it adds no
 * padding of its own. Children own their padding and scrolling — e.g. a fixed header +
 * an `overflow-y-auto flex-1` body + a fixed footer keeps long content from scrolling
 * the title/actions out of view.
 */
export function Modal({
  labelledBy,
  describedBy,
  onClose,
  children,
  panelClassName = "",
}: {
  labelledBy: string;
  describedBy?: string;
  onClose?: () => void;
  children: ReactNode;
  panelClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move focus into the dialog on open.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Escape closes (only when dismissable); Tab is trapped within the dialog.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 p-4"
      onMouseDown={(e) => {
        // Backdrop click closes only when dismissable.
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Small "×" close button for dismissable modals. */
export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Zamknij"
      className="absolute right-5 top-5 rounded-full p-1 text-2xl leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      ×
    </button>
  );
}
