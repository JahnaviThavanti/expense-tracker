export default function CategorySelector({ value, onChange }) {
  const categories = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Health",
    "Entertainment",
    "Education"
  ];

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {categories.map((cat, index) => (
        <option key={index} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}
