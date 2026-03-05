
import { useEffect, useState } from "react";
import API from "../utils/api";
import { PieChart, Pie, Tooltip, ResponsiveContainer } from "recharts";

export default function CategoryChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get("/analytics/categories").then(res => setData(res.data));
  }, []);

  return (
    <div className="dashboard-card">
      <h2>Category Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="category" outerRadius={100} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
