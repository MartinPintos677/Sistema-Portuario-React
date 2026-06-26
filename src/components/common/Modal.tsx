import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal base del sistema.
 * Maneja cierre por Escape, bloqueo de scroll y estructura común para títulos,
 * contenido y pie de acciones.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!shouldRender) return;
    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex overscroll-none items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-200 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[90dvh] w-full ${sizes[size]} flex-col overscroll-contain rounded-t-xl border border-border bg-card shadow-2xl transition-all duration-200 ease-out sm:rounded-xl ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 sm:translate-y-2"
        }`}
      >
        {(title || description) && (
          <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-5 py-3">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base leading-6 font-semibold text-foreground">{title}</h2>
              )}
              {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="overscroll-contain overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
