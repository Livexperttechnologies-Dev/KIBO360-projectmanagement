import React, { useState } from "react";
import { Eye, Check, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ReviewTask } from "../../api/dashboard";

interface ReviewQueueProps {
  tasks?: ReviewTask[];
  onApprove: (taskId: string) => Promise<void>;
}

export const ReviewQueue: React.FC<ReviewQueueProps> = ({ tasks = [], onApprove }) => {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await onApprove(id);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-500" />
            <CardTitle>Tasks Awaiting Review</CardTitle>
          </div>
          <Badge variant="warning" size="sm">
            {tasks.length} In Review
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No tasks currently awaiting review in this scope.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/20 hover:bg-amber-50/40 transition-colors"
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
                <Badge variant="warning" size="sm">
                  {task.priority}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApprove(task.id)}
                  isLoading={approvingId === task.id}
                  leftIcon={<Check className="h-3 w-3 text-emerald-600" />}
                >
                  Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};