import NotificationBell from "./NotificationBell";

export default function MobileWorkspace({
  language,
  authUser,
  activeTab,
  setActiveTab,
  tabs,
  tabLabel,
  headerDate,
  profileImageUrl,
  profileInitial,
  onProfileOpen,
  profileNeedsSetup = false,
  scopeUsers,
  selectedScopeUser,
  setSelectedScopeUser,
  loginAsUser,
  exitImpersonation,
  filters,
  children,
  NavIcon,
  mobileTabIcons,
  showNotifications = false,
  notifications = [],
  unreadNotificationCount = 0,
  notificationsOpen = false,
  onToggleNotifications,
  onCloseNotifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearAllNotifications
}) {
  const metaLabel =
    authUser?.role === "admin"
      ? selectedScopeUser || (language === "te" ? "యూజర్ ఎంచుకోండి" : "Select user")
      : headerDate;

  return (
    <div className="mobile-app-shell">
      <header className="m-header-wrap m-header-sticky">
        <div className="m-header-bar">
          <div className="m-header-copy">
            <p className="m-header-kicker">{metaLabel}</p>
            <h1 className="m-header-title">{tabLabel(activeTab)}</h1>
          </div>

          <div className="m-header-actions">
            {showNotifications ? (
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationCount}
                open={notificationsOpen}
                onToggle={onToggleNotifications}
                onClose={onCloseNotifications}
                onMarkRead={onMarkNotificationRead}
                onMarkAllRead={onMarkAllNotificationsRead}
                onClearAll={onClearAllNotifications}
                language={language}
              />
            ) : null}
            <button
              type="button"
              className={`m-avatar-btn ${profileNeedsSetup ? "profile-incomplete" : ""}`}
              onClick={onProfileOpen}
              aria-label={language === "te" ? "ప్రొఫైల్" : "Profile"}
            >
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" className="m-avatar-img" />
              ) : (
                <span className="m-avatar-fallback">{profileInitial}</span>
              )}
              {profileNeedsSetup ? <span className="profile-incomplete-dot" aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
      </header>

      {authUser?.role === "admin" ? (
        <div className="m-scope-wrap">
          <div className="m-filter-scroll">
            {scopeUsers.map((user) => {
              const active = selectedScopeUser === user.identifier;
              return (
                <button
                  key={user.identifier}
                  type="button"
                  className={`m-filter-chip ${active ? "active soft" : ""}`}
                  onClick={() => setSelectedScopeUser(user.identifier)}
                >
                  {user.full_name || user.identifier}
                </button>
              );
            })}
          </div>
          {selectedScopeUser ? (
            <button type="button" className="m-login-as-btn" onClick={() => loginAsUser(selectedScopeUser)}>
              {language === "te" ? "యూజర్‌గా లాగిన్" : "Login as user"}
            </button>
          ) : null}
        </div>
      ) : null}

      {authUser?.acting_as_admin ? (
        <button type="button" className="m-login-as-btn m-back-admin-btn" onClick={exitImpersonation}>
          {language === "te" ? "అడ్మిన్‌కు తిరిగి" : "Back to admin"}
        </button>
      ) : null}

      <div className="m-content">
        {filters}
        <div className="m-content-stack">{children}</div>
      </div>

      <nav className="m-bottom-nav" aria-label={language === "te" ? "మొబైల్ నావిగేషన్" : "Mobile navigation"}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className={`m-bottom-nav-btn ${active ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-current={active ? "page" : undefined}
            >
              <span className="m-bottom-nav-icon">
                <NavIcon name={mobileTabIcons[tab] || "reports"} />
              </span>
              <span className="m-bottom-nav-label">{tabLabel(tab)}</span>
              {active ? <span className="m-bottom-nav-indicator" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
