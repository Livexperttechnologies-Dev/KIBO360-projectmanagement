import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { LoginPage } from "../pages/auth/LoginPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { MyTasksPage } from "../pages/MyTasksPage";
import { TeamTasksPage } from "../pages/TeamTasksPage";
import { CalendarPage } from "../pages/CalendarPage";
import { ReportsPage } from "../pages/ReportsPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { UserManagementPage } from "../pages/admin/UserManagementPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ProfilePage } from "../pages/ProfilePage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Authenticated Application Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="team-tasks" element={<TeamTasksPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Administrator Protected Route */}
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={["ADMINISTRATOR"]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
