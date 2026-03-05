
import { useEffect, useState } from "react";
import API from "../utils/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    API.get("/analytics/weekly").then(res => setData(res.data));
  }, []);

  return (
    <div className="dashboard-card">
      <h2>Weekly Spending</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
