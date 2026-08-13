"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DailyData = {
  date: string;
  result: number;
};

type BalanceData = {
  date: string;
  balance: number;
};

type Props = {
  dailyData: DailyData[];
  balanceData: BalanceData[];
};

function formatRupees(value: number) {
  if (value > 0) {
    return `+₹${value}`;
  }

  if (value < 0) {
    return `-₹${Math.abs(value)}`;
  }

  return "₹0";
}

const tooltipContentStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  color: "#111827",
  padding: "10px 12px",
};

const tooltipLabelStyle = {
  color: "#111827",
  fontWeight: 600,
  marginBottom: "4px",
};

const tooltipItemStyle = {
  color: "#111827",
};

export default function AnalyticsCharts({
  dailyData,
  balanceData,
}: Props) {
  return (
    <div className="mt-6 space-y-6">

      {/* DAILY PERFORMANCE */}
      <section className="rounded-xl border bg-background p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">
            Daily Performance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Savings and overspending for each recorded day.
          </p>
        </div>

        {dailyData.length === 0 ? (
          <div className="mt-6 flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No recorded days yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={dailyData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                  }}
                  tickFormatter={(value) =>
                    `₹${value}`
                  }
                />

                <Tooltip
                  contentStyle={
                    tooltipContentStyle
                  }
                  labelStyle={
                    tooltipLabelStyle
                  }
                  itemStyle={
                    tooltipItemStyle
                  }
                  formatter={(value) => [
                    formatRupees(
                      Number(value)
                    ),
                    "Result",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="result"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* RUNNING BALANCE */}
      <section className="rounded-xl border bg-background p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold">
            Running Balance
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            How your savings or overspending accumulated throughout the month.
          </p>
        </div>

        {balanceData.length === 0 ? (
          <div className="mt-6 flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              No recorded days yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={balanceData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                  }}
                  tickFormatter={(value) =>
                    `₹${value}`
                  }
                />

                <Tooltip
                  contentStyle={
                    tooltipContentStyle
                  }
                  labelStyle={
                    tooltipLabelStyle
                  }
                  itemStyle={
                    tooltipItemStyle
                  }
                  formatter={(value) => [
                    formatRupees(
                      Number(value)
                    ),
                    "Balance",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}