import React from "react";
import { Users2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { EmployeeWorkloadItem } from "../../api/dashboard";

interface WorkloadByEmployeeProps {
  workload?: EmployeeWorkloadItem[];
}

export const WorkloadByEmployee: React.FC<WorkloadByEmployeeProps> = ({ workload = [] }) => {
  return (
    <Card className="h-full border-violet-100 shadow-sm hover:shadow-md">
      <CardHeader className="border-violet-100/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-[#690BA8]" />
            <CardTitle>Workload by Employee</CardTitle>
          </div>
          <span className="text-xs font-semibold text-slate-400">Active Allocations</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workload.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">No active workload data.</div>
        ) : (
          workload.map((emp) => {
            const initials = emp.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            const capacityPercentage = Math.min(100, Math.round((emp.openTasks / 8) * 100));

            return (
              <div key={emp.userId} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#690BA8] to-[#E81778] text-white text-[11px] font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-800">{emp.name}</span>
                      <span className="ml-2 text-[10px] text-slate-400 font-medium hidden sm:inline">
                        {emp.department}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {emp.overdueTasks > 0 && (
                      <Badge variant="coral" size="sm">
                        <AlertCircle className="h-3 w-3" />
                        <span>{emp.overdueTasks} late</span>
                      </Badge>
                    )}
                    <span className="font-black text-slate-800">{emp.openTasks} open</span>
                    <span className="text-[10px] text-slate-400">/ {emp.totalTasks} total</span>
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7200A5] transition-all duration-300"
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
