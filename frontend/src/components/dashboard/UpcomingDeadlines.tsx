import React from "react";
import { Clock, Calendar, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { UpcomingDeadline } from "../../api/dashboard";

interface UpcomingDeadlinesProps {
  deadlines?: UpcomingDeadline[];
}

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines = [] }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle>Upcoming Deadlines (Next 14 Days)</CardTitle>
          </div>
          <Badge variant="warning" size="sm">
            {deadlines.length} Milestones
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No milestones due within the next 14 days.
          </div>
        ) : (
          deadlines.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="space-y-1 truncate pr-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="text-[#690BA8] font-bold">[{item.key}]</span>
                  <span>•</span>
                  <span>{item.type}</span>
                  {item.projectName && (
                    <>
                      <span>•</span>
                      <span className="truncate">{item.projectName}</span>
                    </>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-800 truncate">{item.title}</h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    item.daysLeft <= 2
                      ? "coral"
                      : item.daysLeft <= 5
                      ? "warning"
                      : "primary"
                  }
                  size="sm"
                >
                  <Calendar className="h-3 w-3" />
                  <span>
                    {item.daysLeft === 0
                      ? "Due Today"
                      : item.daysLeft === 1
                      ? "Tomorrow"
                      : `In ${item.daysLeft}d`}
                  </span>
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};