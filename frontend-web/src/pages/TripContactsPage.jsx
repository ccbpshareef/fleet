import { useMemo, useState } from "react";
import { tripStatusLabel } from "../utils/fleetLabels";
import { getPeriodLabel } from "../utils/periodFilter";

export default function TripContactsPage({ trips, drivers, language = "en", periodFilter = "complete" }) {
  const t = (en, te) => (language === "te" ? te : en);
  const periodLabel = getPeriodLabel(periodFilter, language);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);

  const groupedContacts = useMemo(() => {
    const map = new Map();
    trips.forEach((trip) => {
      const name = (trip.contact_person_name || "").trim() || "Unknown Contact";
      const phone = (trip.contact_person_phone || "").trim() || "-";
      const normalizedKey = `${name.toLowerCase()}::${phone}`;
      const current = map.get(normalizedKey);
      const tripDetails = {
        id: trip.id,
        driver: drivers.find((d) => d.id === trip.driver_id)?.name || "-",
        phone,
        status: trip.status,
        route: `${trip.load_location} -> ${trip.unload_location}`,
        loading_date: trip.loading_date || "-",
        unloading_date: trip.unloading_date || "-",
        completed_at: trip.completed_at || "-"
      };
      if (!current) {
        map.set(normalizedKey, {
          key: normalizedKey,
          contact_name: name,
          phone,
          trip_count: 1,
          latest_status: trip.status,
          latest_route: tripDetails.route,
          trips: [tripDetails]
        });
      } else {
        current.trip_count += 1;
        current.latest_status = trip.status;
        current.latest_route = tripDetails.route;
        current.trips.push(tripDetails);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.trip_count - a.trip_count);
  }, [trips, drivers]);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groupedContacts;
    return groupedContacts.filter((item) => {
      const haystack = [
        item.contact_name,
        item.phone,
        item.latest_route,
        item.latest_status,
        item.trips.map((trip) => `${trip.driver} ${trip.route} ${trip.status}`).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, groupedContacts]);

  const selectedContact =
    filteredContacts.find((item) => item.key === selectedKey) ||
    filteredContacts[0] ||
    null;

  return (
    <section className="panel trip-contacts-shell ff-page">
      <div className="trip-contacts-head ff-page-header">
        <div>
          <h2>{t("Trip Contacts Directory", "ట్రిప్ కాంటాక్ట్స్ డైరెక్టరీ")}</h2>
          <p className="muted">
            {periodLabel} · {trips.length} {t("trips", "ట్రిప్స్")}
          </p>
          <p className="muted">
            {t(
              "A focused contact view for fast lookup even with thousands of entries.",
              "వేలాది కాంటాక్ట్స్ ఉన్నా త్వరగా వెతికేందుకు ప్రత్యేక సంప్రదింపు వీక్షణ."
            )}
          </p>
        </div>
        <div className="trip-contacts-metrics">
          <div className="trip-contacts-metric">
            <span>{t("Unique Contacts", "ప్రత్యేక కాంటాక్ట్స్")}</span>
            <strong>{groupedContacts.length}</strong>
          </div>
          <div className="trip-contacts-metric">
            <span>{t("Showing", "చూపిస్తున్నవి")}</span>
            <strong>{filteredContacts.length}</strong>
          </div>
        </div>
      </div>

      <div className="trip-contacts-toolbar">
        <input
          placeholder={t("Search by driver, contact, phone, route, status", "డ్రైవర్, కాంటాక్ట్, ఫోన్, రూట్, స్థితి ద్వారా వెతకండి")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="trip-contacts-grid">
        {filteredContacts.map((item) => (
          <article
            className={`trip-contact-card ${selectedContact?.key === item.key ? "selected" : ""}`}
            key={item.key}
            role="button"
            tabIndex={0}
            aria-pressed={selectedContact?.key === item.key}
            onClick={() => setSelectedKey(item.key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setSelectedKey(item.key);
            }}
          >
            <div className="trip-contact-top">
              <h4>{item.contact_name}</h4>
              <span className="status-pill status-neutral">{item.trip_count} {t("Trips", "ట్రిప్స్")}</span>
            </div>
            <p><strong>{t("Phone", "ఫోన్")}:</strong> {item.phone}</p>
            <p><strong>{t("Latest Route", "చివరి రూట్")}:</strong> {item.latest_route}</p>
            <p><strong>{t("Status", "స్థితి")}:</strong> {tripStatusLabel(item.latest_status, language)}</p>
          </article>
        ))}
      </div>
      {!filteredContacts.length ? <p className="muted">{t("No contacts found.", "కాంటాక్ట్స్ కనబడలేదు.")}</p> : null}

      {selectedContact ? (
        <section className="trip-contact-detail panel">
          <div className="section-head">
            <div>
              <h3>{selectedContact.contact_name}</h3>
              <p className="muted">{t("Phone", "ఫోన్")}: {selectedContact.phone}</p>
            </div>
            <span className="status-pill status-neutral">{selectedContact.trip_count} {t("Trips", "ట్రిప్స్")}</span>
          </div>
          <div className="trip-contact-history">
            {selectedContact.trips.map((trip) => (
              <div className="mini-card" key={trip.id}>
                <p><strong>{t("Trip", "ట్రిప్")}:</strong> #{trip.id}</p>
                <p><strong>{t("Driver", "డ్రైవర్")}:</strong> {trip.driver}</p>
                <p><strong>{t("Route", "రూట్")}:</strong> {trip.route}</p>
                <p><strong>{t("Loading Date", "లోడింగ్ తేదీ")}:</strong> {trip.loading_date}</p>
                <p><strong>{t("Unloading Date", "అన్‌లోడింగ్ తేదీ")}:</strong> {trip.unloading_date}</p>
                <p><strong>{t("Completed At", "పూర్తి సమయం")}:</strong> {trip.completed_at}</p>
                <p><strong>{t("Status", "స్థితి")}:</strong> {tripStatusLabel(trip.status, language)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
