import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F5EFFB] text-[#690BA8] font-black text-2xl shadow-inner mb-6">
        404
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
        Page Not Found
      </h2>
      <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
        The requested resource is not available in the KIBO360 Project Hub. Please return to the dashboard.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" size="sm" leftIcon={<Home className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Go to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};