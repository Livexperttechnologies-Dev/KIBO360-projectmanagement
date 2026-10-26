import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { OverdueTask } from "../../api/dashboard";

interface OverdueAlertProps {
  tasks?: OverdueTask[];
}

export const OverdueAlert: React.FC<OverdueAlertProps> = ({ tasks = [] }) => {
  if (tasks.length === 0) return null;

  return (
    <Card className="border-[#F16A65]/40 bg-orange-50/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#F16A65] animate-pulse" />
            <CardTitle className="text-[#F16A65]">
              Overdue Tasks Requiring Attention
            </CardTitle>
          </div>
          <Badge variant="coral" size="sm">
            {tasks.length} Action Items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-xl border border-red-200/60 bg-white shadow-subtle"
            >
              <div className="space-y-1 truncate pr-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="text-[#690BA8]">[{task.projectKey}]</span>
                  <span>•</span>
                  <span>Assignee: {task.assigneeName}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{task.title}</h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="coral" size="sm">
                  {task.daysOverdue}d Late
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};