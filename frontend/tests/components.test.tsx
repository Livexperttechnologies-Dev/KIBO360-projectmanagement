import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Badge } from "../src/components/ui/Badge";
import { Button } from "../src/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../src/components/ui/Card";
import { Sidebar } from "../src/components/layout/Sidebar";
import { AuthContext } from "../src/contexts/AuthContext";

describe("Frontend Component Suite", () => {
  // 1. Badge Component Tests
  describe("Badge Component", () => {
    test("renders children correctly", () => {
      render(<Badge>Active Milestone</Badge>);
      expect(screen.getByText("Active Milestone")).toBeDefined();
    });

    test("applies success and warning variant styles", () => {
      const { container: successContainer } = render(<Badge variant="success">Completed</Badge>);
      const { container: warningContainer } = render(<Badge variant="warning">At Risk</Badge>);

      expect(successContainer.firstChild).toBeDefined();
      expect((successContainer.firstChild as HTMLElement).className).toContain("emerald");
      expect((warningContainer.firstChild as HTMLElement).className).toContain("amber");
    });
  });

  // 2. Button Component Tests
  describe("Button Component", () => {
    test("renders button with correct text and handles disabled state", () => {
      render(<Button disabled>Save Deliverable</Button>);
      const btn = screen.getByRole("button", { name: "Save Deliverable" });
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    test("shows loading state when isLoading is true", () => {
      const { container } = render(<Button isLoading>Submitting</Button>);
      expect(container.querySelector("svg")).toBeDefined();
    });
  });

  // 3. Card Component Tests
  describe("Card Component", () => {
    test("renders card with header and content", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Management KPI Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>94.5% On-Time Completion</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText("Management KPI Overview")).toBeDefined();
      expect(screen.getByText("94.5% On-Time Completion")).toBeDefined();
    });
  });

  // 4. Sidebar Role-Based Visibility
  describe("Sidebar Navigation & Role-Based Control", () => {
    test("renders standard navigation items for all authenticated users", () => {
      const mockAuthValue: any = {
        user: { id: "usr-dev-04", email: "dev@livexpert.in", role: "EMPLOYEE", name: "Dev Employee" },
        token: "mock-token",
        login: async () => {},
        logout: async () => {},
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthValue}>
            <Sidebar isOpen={true} onClose={() => {}} />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Projects")).toBeDefined();
      expect(screen.getByText("My Tasks")).toBeDefined();
      expect(screen.getByText("Reports")).toBeDefined();
      expect(screen.getByText("Notifications")).toBeDefined();

      // Employee must NOT see Admin Users & Access navigation item
      expect(screen.queryByText("Users & Access")).toBeNull();
    });

    test("renders Users & Access administration item when role is ADMINISTRATOR", () => {
      const mockAuthAdmin: any = {
        user: { id: "usr-admin-01", email: "admin@livexpert.in", role: "ADMINISTRATOR", name: "Admin User" },
        token: "mock-admin-token",
        login: async () => {},
        logout: async () => {},
      };

      render(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthAdmin}>
            <Sidebar isOpen={true} onClose={() => {}} />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      // Administrator MUST see Users & Access navigation item
      expect(screen.getByText("Users & Access")).toBeDefined();
    });
  });
});
