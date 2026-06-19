import "./admin.css";

const menu = ["Dashboard", "Lorries", "Drivers", "Trips", "Expenses", "Reports"];

export default function AdminDashboard({ trips = [], dashboard = {} }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Fleet Admin</h2>
        {menu.map((item) => (
          <button key={item} className="menu-btn">{item}</button>
        ))}
      </aside>
      <main className="admin-main">
        <section className="admin-cards">
          <Card title="Total Lorries" value={dashboard.total_lorries ?? 0} />
          <Card title="Active Trips" value={dashboard.running_trips ?? 0} />
          <Card title="Total Expenses" value={`Rs ${(dashboard.total_expenses ?? 0).toFixed?.(0) || 0}`} />
          <Card title="Total Profit" value={`Rs ${(dashboard.total_profit ?? 0).toFixed?.(0) || 0}`} />
        </section>

        <section className="admin-table-wrap">
          <h3>All Trips</h3>
          <div className="filters">
            <input placeholder="Filter by lorry or route" />
            <select><option>All Status</option><option>Loading</option><option>On Route</option><option>Delivered</option></select>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th><th>Lorry</th><th>Route</th><th>Status</th><th>Income</th><th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td>{trip.id}</td>
                  <td>{trip.lorry_id}</td>
                  <td>{trip.load_location} -> {trip.unload_location}</td>
                  <td>{trip.status}</td>
                  <td>{trip.load_price}</td>
                  <td>{trip.net_profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="admin-card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}
