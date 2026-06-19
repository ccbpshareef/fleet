export default function MobileWorkspace({
  language,
  authUser,
  activeTab,
  setActiveTab,
  tabs,
  tabLabel,
  tabHints,
  headerDate,
  headerStats,
  profileImageUrl,
  profileInitial,
  onProfileOpen,
  profileNeedsSetup = false,
  isNavOpen,
  setIsNavOpen,
  scopeUsers,
  selectedScopeUser,
  setSelectedScopeUser,
  loginAsUser,
  exitImpersonation,
  filters,
  children,
  NavIcon,
  mobileTabIcons
}) {
  const hint = tabHints[activeTab];
  const metaLabel =
    authUser?.role === "admin"
      ? selectedScopeUser || (language === "te" ? "యూజర్ ఎంచుకోండి" : "Select user")
      : headerDate;

  return (
    <div className="mobile-app-shell">
      <header className="m-header-wrap">
        <div className="m-header-bar">
          <button
            type="button"
            className="m-header-menu-btn"
            onClick={() => setIsNavOpen((prev) => !prev)}
            aria-label={
              language === "te"
                ? isNavOpen
                  ? "నావిగేషన్ మూసివేయి"
                  : "నావిగేషన్ తెరవు"
                : isNavOpen
                  ? "Hide navigation"
                  : "Show navigation"
            }
            aria-expanded={isNavOpen}
          >
            <span className={`m-menu-icon ${isNavOpen ? "open" : ""}`} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <div className="m-header-copy">
            <h1 className="m-header-title">{activeTab === "Dashboard" ? tabLabel("Dashboard") : tabLabel(activeTab)}</h1>
            <p className="m-header-meta">{metaLabel}</p>
            {hint ? (
              <p className="m-header-hint">{language === "te" ? hint.te : hint.en}</p>
            ) : null}
          </div>

          <button type="button" className={`m-avatar-btn ${profileNeedsSetup ? "profile-incomplete" : ""}`} onClick={onProfileOpen} aria-label={language === "te" ? "ప్రొఫైల్" : "Profile"}>
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="" className="m-avatar-img" />
            ) : (
              <span className="m-avatar-fallback">{profileInitial}</span>
            )}
            {profileNeedsSetup ? <span className="profile-incomplete-dot" aria-hidden="true" /> : null}
          </button>
        </div>

        {activeTab === "Dashboard" ? (
          <div className="m-quick-stats">
            {headerStats.map((item) => (
              <div key={item.label} className="m-quick-stat">
                <span className="m-quick-stat-label">{item.label}</span>
                <strong className="m-quick-stat-value">{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
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
