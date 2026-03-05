
import { useEffect, useState } from "react";
import API from "../utils/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function MonthlyChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get("/analytics/monthly").then(res => setData(res.data));
  }, []);

  return (
    <div className="dashboard-card">
      <h2>Monthly Spending Trend</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
