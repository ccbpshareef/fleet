export default function FleetSearchBar({
  value = "",
  onChange = () => {},
  placeholder = "Search trips, drivers, lorries…",
  className = ""
}) {
  return (
    <label className={`ff-search ${className}`.trim()}>
      <span className="ff-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        className="ff-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}
