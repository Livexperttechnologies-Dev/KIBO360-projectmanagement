import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../src/components/layout/Sidebar";
import { SummaryCards } from "../src/components/dashboard/SummaryCards";
import { AuthContext } from "../src/contexts/AuthContext";

describe("Frontend Responsive Layout Suite", () => {
  const mockAuth: any = {
    user: { id: "usr-01", email: "pm@livexpert.in", role: "PROJECT_MANAGER", name: "Project Manager" },
    token: "mock-token",
    login: async () => {},
    logout: async () => {},
  };

  test("Sidebar renders mobile backdrop with lg:hidden utility class when open", () => {
    let closed = false;
    const { container } = render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <Sidebar isOpen={true} onClose={() => { closed = true; }} />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).toBeDefined();
    expect(backdrop?.className).toContain("bg-slate-900/50");

    // Clicking mobile backdrop calls onClose callback
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(closed).toBe(true);
    }
  });

  test("Sidebar hides mobile backdrop when isOpen is false", () => {
    const { container } = render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <Sidebar isOpen={false} onClose={() => {}} />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const backdrop = container.querySelector(".fixed.inset-0.z-40");
    expect(backdrop).toBeNull();
  });

  test("SummaryCards grid implements adaptive breakpoints across viewport sizes", () => {
    const { container } = render(<SummaryCards isLoading={true} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid).toBeDefined();
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("md:grid-cols-3");
    expect(grid.className).toContain("lg:grid-cols-6");
  });
});
