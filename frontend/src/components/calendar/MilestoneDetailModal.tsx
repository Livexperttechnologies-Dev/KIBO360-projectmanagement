import React, { useState } from "react";
import { Flag, Calendar, FolderKanban, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { CalendarEvent } from "../../api/calendar";
import { updateMilestone } from "../../api/project";
import { useAuth } from "../../contexts/AuthContext";

interface MilestoneDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onUpdated?: () => void;
}

export const MilestoneDetailModal: React.FC<MilestoneDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onUpdated,
}) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event || event.type !== "MILESTONE") return null;

  const isReached = event.status === "REACHED";
  const canManage =
    user?.role === "ADMINISTRATOR" ||
    user?.role === "MANAGER" ||
    user?.role === "TEAM_LEAD";

  const handleToggleReached = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);

    try {
      await updateMilestone(
        event.projectId,
        event.entityId,
        { status: isReached ? "PENDING" : "REACHED" },
        token
      );
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update milestone status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project Milestone Details" size="md">
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-[#690BA8] shrink-0">
            <Flag className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#690BA8] uppercase tracking-wider">
                [{event.projectKey}] {event.projectName}
              </span>
              <Badge
                variant={isReached ? "success" : event.isOverdue ? "coral" : "primary"}
                size="sm"
              >
                {event.status}
              </Badge>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{event.title}</h3>
          </div>
        </div>

        {event.description && (
          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
            {event.description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-100 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Due Date</span>
            </div>
            <p className="font-bold text-slate-800">
              {new Date(event.dueDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-100 bg-white space-y-1">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">Urgency</span>
            </div>
            <p className="font-bold text-slate-800">
              {event.isOverdue ? (
                <span className="text-red-600 font-extrabold">
                  Overdue by {event.daysOverdue} day{event.daysOverdue > 1 ? "s" : ""}
                </span>
              ) : event.isApproaching ? (
                <span className="text-[#E81778] font-extrabold">Due Tomorrow</span>
              ) : event.isUpcoming ? (
                <span className="text-[#690BA8] font-bold">Due in {event.daysRemaining} days</span>
              ) : isReached ? (
                <span className="text-emerald-600 font-bold">Milestone Reached</span>
              ) : (
                <span className="text-slate-600">On Track</span>
              )}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Close
            </Button>
            <Button
              variant={isReached ? "outline" : "primary"}
              size="sm"
              isLoading={loading}
              onClick={handleToggleReached}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isReached ? "Reopen Milestone" : "Mark as Reached"}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
