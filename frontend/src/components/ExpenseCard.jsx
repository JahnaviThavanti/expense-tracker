export default function ExpenseCard({ data, onDelete }) {
  return (
    <div className="expense-card">
      <div>
        <h3>{data.title}</h3>
        <p>{data.date}</p>
      </div>

      <div className="expense-right">
        <h2>$ {data.amount}</h2>
        <button onClick={() => onDelete(data.id)}>Delete</button>
      </div>
    </div>
  );
}
