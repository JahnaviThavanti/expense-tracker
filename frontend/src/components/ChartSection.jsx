import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function ChartSection({ expenses }) {

  const categoryMap = {};

  expenses.forEach((e) => {
    const cat = e.category || "Other";
    const amt = Number(e.amount || 0);

    if (!categoryMap[cat]) {
      categoryMap[cat] = 0;
    }
    categoryMap[cat] += amt;
  });

  const pieData = Object.keys(categoryMap).map((key) => ({
    name: key,
    value: categoryMap[key]
  }));

  const COLORS = ["#4f46e5","#22c55e","#f59e0b","#ef4444","#06b6d4","#a855f7"];

  return (
    <div style={{marginTop:"40px"}}>
      <h2>Expense Distribution</h2>

      <PieChart width={500} height={350}>
        <Pie
          data={pieData}
          dataKey="value"
          outerRadius={100}
          label={({name,percent}) =>
            `${name} ${(percent*100).toFixed(0)}%`
          }
        >
          {pieData.map((entry,index)=>(
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>

        <Tooltip formatter={(value)=>`$ ${value}`} />
        <Legend />
      </PieChart>
    </div>
  );
}
