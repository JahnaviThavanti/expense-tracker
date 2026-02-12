export default function ActivityList({ expenses = [] }) {
  const sorted = [...expenses].reverse().slice(0,5);

  return (
    <div className="activity-section">
      <h3>Recent Activities</h3>

      {sorted.length === 0 && <p>No expenses yet</p>}

      {sorted.map((item, index) => (
        <div key={index} className="activity-item">
          <p>
            {item.title || item.category} - ${item.amount}
          </p>
        </div>
      ))}
    </div>
  );
}
