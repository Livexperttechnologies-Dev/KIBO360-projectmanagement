import React, { useState, useEffect } from "react";
import { X, Bell, Mail, Clock, AlertTriangle, ShieldCheck, CheckCircle2, UserCheck, Check } from "lucide-react";
import { notificationApi, NotificationPreferences } from "../../api/notification";
import { useAuth } from "../../contexts/AuthContext";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadPreferences();
    }
  }, [isOpen, token]);

  const loadPreferences = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await notificationApi.getPreferences(token);
      setPreferences(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const handleSave = async () => {
    if (!token || !preferences) return;
    try {
      setSaving(true);
      setErrorMessage(null);
      await notificationApi.updatePreferences(
        {
          emailNotifications: preferences.emailNotifications,
          inAppNotifications: preferences.inAppNotifications,
          notifyOnAssignment: preferences.notifyOnAssignment,
          notifyOnDeadlineApproaching: preferences.notifyOnDeadlineApproaching,
          notifyOnOverdue: preferences.notifyOnOverdue,
          notifyOnBlockedWork: preferences.notifyOnBlockedWork,
          notifyOnReviewRequested: preferences.notifyOnReviewRequested,
          notifyOnChangesRequested: preferences.notifyOnChangesRequested,
          notifyOnMilestoneApproaching: preferences.notifyOnMilestoneApproaching,
        },
        token
      );
      setSuccessMessage("Notification preferences updated successfully");
      setTimeout(() => {
        setSuccessMessage(null);
        onSaved?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#690BA8]/10 text-[#690BA8]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notification Preferences</h2>
              <p className="text-xs text-slate-500">Customize how and when you receive project alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#690BA8] border-t-transparent mb-3" />
              Loading preferences...
            </div>
          ) : preferences ? (
            <>
              {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  {errorMessage}
                </div>
              )}

              {/* Delivery Channels */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Notification Channels
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-[#690BA8]" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">In-App Notifications</div>
                        <div className="text-[11px] text-slate-500">Show notification bell badges and inbox entries</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.inAppNotifications}
                      onChange={() => handleToggle("inAppNotifications")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#00A896]" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Email Notifications</div>
                        <div className="text-[11px] text-slate-500">Send email digests for task events & critical alerts</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={() => handleToggle("emailNotifications")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>
                </div>
              </div>

              {/* Event Triggers */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Event Subscriptions
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-4 w-4 text-[#690BA8]" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Task Assignment & Reassignment</div>
                        <div className="text-[11px] text-slate-500">When tasks are delegated to or reassigned from you</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnAssignment}
                      onChange={() => handleToggle("notifyOnAssignment")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Approaching Deadlines</div>
                        <div className="text-[11px] text-slate-500">Reminders for deliverables due within 7 days</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnDeadlineApproaching}
                      onChange={() => handleToggle("notifyOnDeadlineApproaching")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-[#F16A65]" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Overdue Task Alerts</div>
                        <div className="text-[11px] text-slate-500">Immediate warnings when deadlines are breached</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnOverdue}
                      onChange={() => handleToggle("notifyOnOverdue")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Blocked Work Notifications</div>
                        <div className="text-[11px] text-slate-500">When tasks are flagged as blocked by dependencies</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnBlockedWork}
                      onChange={() => handleToggle("notifyOnBlockedWork")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Review Requests & Changes</div>
                        <div className="text-[11px] text-slate-500">When submissions require QA review or adjustments</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnReviewRequested && preferences.notifyOnChangesRequested}
                      onChange={() => {
                        const nextVal = !(preferences.notifyOnReviewRequested && preferences.notifyOnChangesRequested);
                        setPreferences({
                          ...preferences,
                          notifyOnReviewRequested: nextVal,
                          notifyOnChangesRequested: nextVal,
                        });
                      }}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                      <div>
                        <div className="text-xs font-semibold text-slate-800">Milestone Approaching</div>
                        <div className="text-[11px] text-slate-500">Project milestone target dates within 7 days</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.notifyOnMilestoneApproaching}
                      onChange={() => handleToggle("notifyOnMilestoneApproaching")}
                      className="h-4 w-4 rounded text-[#690BA8] focus:ring-[#690BA8]"
                    />
                  </label>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-[#7200A5] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#62008F] disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
};
