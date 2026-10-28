import React from "react";
import { PieChart, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { StatusDistributionItem } from "../../api/dashboard";

interface StatusDistributionChartProps {
  distribution?: StatusDistributionItem[];
  totalTasks: number;
}

const statusColorMap: Record<string, { bg: string; fill: string; text: string }> = {
  BACKLOG: { bg: "bg-slate-100", fill: "bg-slate-400", text: "text-slate-600" },
  TODO: { bg: "bg-purple-50", fill: "bg-[#690BA8]", text: "text-[#690BA8]" },
  IN_PROGRESS: { bg: "bg-pink-50", fill: "bg-[#E81778]", text: "text-[#E81778]" },
  IN_REVIEW: { bg: "bg-amber-50", fill: "bg-amber-500", text: "text-amber-700" },
  COMPLETED: { bg: "bg-emerald-50", fill: "bg-emerald-500", text: "text-emerald-700" },
  CANCELLED: { bg: "bg-rose-50", fill: "bg-rose-400", text: "text-rose-600" },
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  distribution = [],
  totalTasks,
}) => {
  return (
    <Card className="h-full border-violet-100 shadow-sm hover:shadow-md">
      <CardHeader className="border-violet-100/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-[#690BA8]" />
            <CardTitle>Task Status Distribution</CardTitle>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {totalTasks} Total Tasks
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Multi-segment stacked progress bar */}
        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          {distribution.map((item) => {
            const colors = statusColorMap[item.status] || { fill: "bg-slate-400" };
            if (item.percentage === 0) return null;
            return (
              <div
                key={item.status}
                style={{ width: `${item.percentage}%` }}
                className={`h-full ${colors.fill} transition-all duration-300`}
                title={`${item.label}: ${item.count} (${item.percentage}%)`}
              />
            );
          })}
        </div>

        {/* Detailed status rows */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
          {distribution.map((item) => {
            const colors = statusColorMap[item.status] || {
              bg: "bg-slate-100",
              fill: "bg-slate-400",
              text: "text-slate-600",
            };
            return (
              <div
                key={item.status}
                className={`rounded-xl p-2.5 border border-slate-100 ${colors.bg} space-y-1`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${colors.fill}`} />
                  <span className="text-[11px] font-bold text-slate-700 truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-base font-black ${colors.text}`}>
                    {item.count}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
