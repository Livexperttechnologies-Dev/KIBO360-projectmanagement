import React from "react";
import { Settings, Building, Shield, BellRing, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Organization & Workspace Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure hub preferences, enterprise parameters, and security policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#690BA8]" />
              <CardTitle>Company Details</CardTitle>
            </div>
            <CardDescription>Primary organization configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Organization Legal Name" defaultValue="Livexpert Technologies Pvt. Ltd." readOnly />
            <Input label="Application Identity" defaultValue="KIBO360 Project Hub" readOnly />
            <Input label="Support & Admin Email" defaultValue="admin@livexpert.in" readOnly />
            <Badge variant="primary">Enterprise Tier</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#E81778]" />
              <CardTitle>API & Database Configuration</CardTitle>
            </div>
            <CardDescription>Backend endpoints and persistence layer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="REST API Base URL" defaultValue="http://localhost:5000/api/v1" readOnly />
            <Input label="Database Target" defaultValue="PostgreSQL (Prisma ORM)" readOnly />
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-500">Security Rule Mode:</span>
              <Badge variant="success">Strict Phase 1 Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};