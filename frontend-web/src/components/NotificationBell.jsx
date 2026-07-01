import { useEffect, useRef } from "react";

export default function NotificationBell({
  notifications = [],
  unreadCount = 0,
  open = false,
  onToggle,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  language = "en"
}) {
  const t = (en, te) => (language === "te" ? te : en);
  const panelRef = useRef(null);
  const typeLabel = (type) => {
    if (!type) return t("Update", "అప్డేట్");
    const key = String(type).toLowerCase();
    if (key === "trip") return t("Trip", "ట్రిప్");
    if (key === "driver") return t("Driver", "డ్రైవర్");
    if (key === "assignment") return t("Assignment", "అసైన్‌మెంట్");
    if (key === "lorry") return t("Lorry", "లారీ");
    return t("Update", "అప్డేట్");
  };

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event) {
      if (!panelRef.current?.contains(event.target)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, onClose]);

  return (
    <div className="notification-bell-wrap" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={onToggle}
        aria-label={t("Notifications", "నోటిఫికేషన్లు")}
      >
        🔔
        {unreadCount > 0 ? <span className="notification-bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <div>
              <strong>{t("Notifications", "నోటిఫికేషన్లు")}</strong>
              <p className="notification-head-sub">
                {unreadCount > 0
                  ? t(`${unreadCount} unread alerts`, `${unreadCount} చదవని అలర్ట్‌లు`)
                  : t("All caught up", "అన్నీ చదివారు")}
              </p>
            </div>
            <div className="notification-panel-actions">
              {unreadCount > 0 ? (
                <button type="button" className="ghost compact-submit" onClick={onMarkAllRead}>
                  {t("Mark all read", "అన్నీ చదివినవి")}
                </button>
              ) : null}
              {notifications.length > 0 ? (
                <button type="button" className="ghost compact-submit notification-clear-btn" onClick={onClearAll}>
                  {t("Clear all", "అన్నీ తొలగించు")}
                </button>
              ) : null}
            </div>
          </div>
          <div className="notification-list">
            {notifications.length ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-item ${item.is_read ? "" : "unread"}`}
                  onClick={() => onMarkRead?.(item)}
                >
                  <div className="notification-item-meta">
                    <span className={`notification-type-pill ${item.is_read ? "read" : ""}`}>
                      {typeLabel(item.related_type)}
                    </span>
                    {!item.is_read ? <span className="notification-new-dot" aria-hidden="true" /> : null}
                  </div>
                  <div className="notification-item-top">
                    <strong>{item.title}</strong>
                    <span className="notification-time">
                      {new Date(item.created_at).toLocaleString(language === "te" ? "te-IN" : "en-IN")}
                    </span>
                  </div>
                  <p>{item.message}</p>
                  {item.driver_name ? (
                    <span className="notification-driver-tag">
                      {t("Driver", "డ్రైవర్")}: {item.driver_name}
                    </span>
                  ) : null}
                  <span className="notification-action-hint">
                    {t("Tap to open", "తెరవడానికి ట్యాప్ చేయండి")} →
                  </span>
                </button>
              ))
            ) : (
              <p className="muted notification-empty">{t("No notifications yet", "ఇంకా నోటిఫికేషన్లు లేవు")}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
