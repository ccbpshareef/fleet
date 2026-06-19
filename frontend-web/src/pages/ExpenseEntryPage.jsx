export default function ExpenseEntryPage({ form, setForm, trips, onSubmit }) {
  const total =
    Number(form.diesel || 0) +
    Number(form.toll || 0) +
    Number(form.driver_bata || 0) +
    Number(form.maintenance || 0) +
    Number(form.other || 0);

  return (
    <section className="panel">
      <h2>Expense Entry</h2>
      <form className="form-grid single" onSubmit={onSubmit}>
        <select value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} required>
          <option value="">Select Trip</option>
          {trips.map((trip) => <option key={trip.id} value={trip.id}>Trip #{trip.id}</option>)}
        </select>
        <input type="number" placeholder="Diesel Cost" value={form.diesel} onChange={(e) => setForm({ ...form, diesel: e.target.value })} />
        <input type="number" placeholder="Toll Charges" value={form.toll} onChange={(e) => setForm({ ...form, toll: e.target.value })} />
        <input type="number" placeholder="Driver Bata" value={form.driver_bata} onChange={(e) => setForm({ ...form, driver_bata: e.target.value })} />
        <input type="number" placeholder="Maintenance" value={form.maintenance} onChange={(e) => setForm({ ...form, maintenance: e.target.value })} />
        <input type="number" placeholder="Other Expenses" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} />
        <div className="total-box">Total Expenses: Rs {total.toFixed(2)}</div>
        <button type="submit">Save Expense</button>
      </form>
    </section>
  );
}
