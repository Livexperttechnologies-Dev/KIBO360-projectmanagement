import React, { useState } from "react";
import { CheckSquare, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { AssignedTask } from "../../api/dashboard";

interface MyAssignedTasksProps {
  tasks?: AssignedTask[];
  onToggleStatus: (taskId: string, newStatus: string) => Promise<void>;
}

export const MyAssignedTasks: React.FC<MyAssignedTasksProps> = ({ tasks = [], onToggleStatus }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggle = async (task: AssignedTask) => {
    setUpdatingId(task.id);
    const nextStatus = task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    try {
      await onToggleStatus(task.id, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-[#690BA8]" />
            <CardTitle>My Assigned Tasks</CardTitle>
          </div>
          <Badge variant="primary" size="sm">
            {tasks.filter((t) => t.status !== "COMPLETED").length} Open
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            You have no assigned tasks matching current filters.
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 truncate pr-3">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    disabled={updatingId === task.id}
                    onChange={() => handleToggle(task)}
                    className="h-4 w-4 rounded border-slate-300 text-[#690BA8] focus:ring-[#690BA8]/20 cursor-pointer shrink-0"
                  />
                  <div className="truncate">
                    <h5
                      className={`text-xs font-bold truncate ${
                        isCompleted ? "text-slate-400 line-through" : "text-slate-800"
                      }`}
                    >
                      {task.title}
                    </h5>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-bold text-[#690BA8]">[{task.projectKey}]</span>
                      <span>•</span>
                      <span className="truncate">{task.projectName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={
                      task.priority === "URGENT"
                        ? "coral"
                        : task.priority === "HIGH"
                        ? "magenta"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};