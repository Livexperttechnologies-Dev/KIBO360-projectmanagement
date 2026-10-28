import React from "react";
import {
  FolderKanban,
  Activity,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { DashboardSummary } from "../../api/dashboard";

interface SummaryCardsProps {
  summary?: DashboardSummary;
  isLoading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, isLoading }) => {
  const cards = [
    {
      title: "Total Projects",
      value: summary?.totalProjects ?? 0,
      subtext: "Enterprise initiatives",
      icon: FolderKanban,
      color: "text-[#690BA8]",
      bg: "bg-[#F5EFFB]",
      borderColor: "border-[#690BA8]/20",
    },
    {
      title: "Active Projects",
      value: summary?.activeProjects ?? 0,
      subtext: "In progress / execution",
      icon: Activity,
      color: "text-[#E81778]",
      bg: "bg-pink-50",
      borderColor: "border-[#E81778]/20",
    },
    {
      title: "Completed Projects",
      value: summary?.completedProjects ?? 0,
      subtext: "Delivered benchmarks",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Total Open Tasks",
      value: summary?.totalOpenTasks ?? 0,
      subtext: "Active backlog & todo",
      icon: CheckSquare,
      color: "text-[#340771]",
      bg: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      title: "Overdue Tasks",
      value: summary?.overdueTasks ?? 0,
      subtext: "Requires immediate action",
      icon: AlertTriangle,
      color: "text-[#F16A65]",
      bg: "bg-orange-50",
      borderColor: summary?.overdueTasks ? "border-[#F16A65]/40" : "border-slate-200",
      isAlert: !!summary?.overdueTasks,
    },
    {
      title: "Tasks Due In 7 Days",
      value: summary?.tasksDueWithin7Days ?? 0,
      subtext: "Upcoming deadlines",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 space-y-3">
              <div className="h-8 w-8 rounded-xl bg-slate-200" />
              <div className="h-6 w-12 rounded bg-slate-200" />
              <div className="h-3 w-20 rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`relative overflow-hidden border border-violet-100 bg-gradient-to-br from-white to-[#FBF7FF] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              card.isAlert ? "!border-rose-200 !from-rose-50/70 !to-white" : ""
            }`}
          >
            <CardContent className="relative p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 truncate">
                    {card.title}
                  </div>
                  <div className={`mt-2 text-3xl font-extrabold tracking-tight ${card.isAlert ? "text-[#F16A65]" : "text-slate-950"}`}>
                    {card.value}
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-2 truncate text-[10px] font-medium text-slate-500">
                {card.subtext}
              </div>
            </CardContent>
            <div className={`absolute inset-x-0 bottom-0 h-0.5 ${card.isAlert ? "bg-rose-400" : "bg-gradient-to-r from-[#690BA8]/70 via-[#B52BC2]/35 to-transparent"}`} />
          </Card>
        );
      })}
    </div>
  );
};
