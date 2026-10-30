import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F6FB]">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-7">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
