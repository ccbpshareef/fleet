export default function MobileTripSheet({ open, onClose, children, language = "en" }) {
  if (!open) return null;

  const closeLabel = language === "te" ? "మూసివేయి" : "Close";

  return (
    <div
      className="mu-sheet-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        className="mu-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mu-sheet-grabber" aria-hidden="true" />
        <button type="button" className="mu-sheet-close" onClick={onClose} aria-label={closeLabel}>
          ×
        </button>
        <div className="mu-sheet-body">{children}</div>
      </section>
    </div>
  );
}
