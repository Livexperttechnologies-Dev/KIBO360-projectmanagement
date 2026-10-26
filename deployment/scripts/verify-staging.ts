// ==============================================================================
// KIBO360 Project Hub — Staging Pre-Release Verification Script
// Livexpert Technologies Pvt. Ltd.
// Executes smoke tests against staging environment prior to production promotion.
// ==============================================================================

export interface StagingCheckResult {
  name: string;
  status: "PASS" | "FAIL";
  details: string;
  latencyMs: number;
}

export async function verifyStagingRelease(targetUrl = "http://localhost:5000/api/v1"): Promise<boolean> {
  console.log(`\n🚀 Starting Staging Pre-Release Verification against: ${targetUrl}\n`);
  const results: StagingCheckResult[] = [];
  let allPassed = true;

  // 1. Health Probe
  try {
    const t0 = Date.now();
    const res = await fetch(`${targetUrl}/health`);
    const data = (await res.json()) as any;
    const latency = Date.now() - t0;
    if (res.status === 200 && data.status === "healthy") {
      results.push({ name: "1. Diagnostic Health Check", status: "PASS", details: `Healthy, Uptime: ${data.uptime}s`, latencyMs: latency });
    } else {
      results.push({ name: "1. Diagnostic Health Check", status: "FAIL", details: `Status ${res.status}`, latencyMs: latency });
      allPassed = false;
    }
  } catch (err: any) {
    results.push({ name: "1. Diagnostic Health Check", status: "FAIL", details: err.message, latencyMs: 0 });
    allPassed = false;
  }

  // 2. Liveness & Readiness Probes
  try {
    const t0 = Date.now();
    const [liveRes, readyRes] = await Promise.all([
      fetch(`${targetUrl}/health/liveness`),
      fetch(`${targetUrl}/health/readiness`),
    ]);
    const latency = Date.now() - t0;
    if (liveRes.status === 200 && readyRes.status === 200) {
      results.push({ name: "2. Container Probes (Live & Ready)", status: "PASS", details: "Liveness and readiness probes 200 OK", latencyMs: latency });
    } else {
      results.push({ name: "2. Container Probes (Live & Ready)", status: "FAIL", details: `Liveness: ${liveRes.status}, Readiness: ${readyRes.status}`, latencyMs: latency });
      allPassed = false;
    }
  } catch (err: any) {
    results.push({ name: "2. Container Probes (Live & Ready)", status: "FAIL", details: err.message, latencyMs: 0 });
    allPassed = false;
  }

  // 3. Authentication & RBAC Check
  let token = "";
  try {
    const t0 = Date.now();
    const loginRes = await fetch(`${targetUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const loginData = (await loginRes.json()) as any;
    const latency = Date.now() - t0;
    if (loginRes.status === 200 && loginData.data?.accessToken) {
      token = loginData.data.accessToken;
      results.push({ name: "3. Admin Authentication", status: "PASS", details: `Role: ${loginData.data.user.role}`, latencyMs: latency });
    } else {
      results.push({ name: "3. Admin Authentication", status: "FAIL", details: "Invalid credentials", latencyMs: latency });
      allPassed = false;
    }
  } catch (err: any) {
    results.push({ name: "3. Admin Authentication", status: "FAIL", details: err.message, latencyMs: 0 });
    allPassed = false;
  }

  // 4. Database Persistence Check (Projects & Tasks)
  if (token) {
    try {
      const t0 = Date.now();
      const projRes = await fetch(`${targetUrl}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const projData = (await projRes.json()) as any;
      const latency = Date.now() - t0;
      const count = projData.data?.projects?.length || 0;
      if (projRes.status === 200 && count > 0) {
        results.push({ name: "4. Database Store Access", status: "PASS", details: `Retrieved ${count} active projects`, latencyMs: latency });
      } else {
        results.push({ name: "4. Database Store Access", status: "FAIL", details: `Status ${projRes.status}`, latencyMs: latency });
        allPassed = false;
      }
    } catch (err: any) {
      results.push({ name: "4. Database Store Access", status: "FAIL", details: err.message, latencyMs: 0 });
      allPassed = false;
    }
  }

  // 5. Executive KPIs & Reporting Check
  if (token) {
    try {
      const t0 = Date.now();
      const kpiRes = await fetch(`${targetUrl}/reports/kpis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const kpiData = (await kpiRes.json()) as any;
      const latency = Date.now() - t0;
      if (kpiRes.status === 200 && kpiData.data?.ownershipCoverage) {
        results.push({ name: "5. Management KPIs Engine", status: "PASS", details: `Coverage: ${kpiData.data.ownershipCoverage.rate}%, Tasks: ${kpiData.data.totalTasks}`, latencyMs: latency });
      } else {
        results.push({ name: "5. Management KPIs Engine", status: "FAIL", details: `Status ${kpiRes.status}`, latencyMs: latency });
        allPassed = false;
      }
    } catch (err: any) {
      results.push({ name: "5. Management KPIs Engine", status: "FAIL", details: err.message, latencyMs: 0 });
      allPassed = false;
    }
  }

  // Print Summary Table
  console.log("--------------------------------------------------------------------------------------------------");
  console.log("Staging Pre-Release Verification Item            | Status | Latency | Details");
  console.log("--------------------------------------------------------------------------------------------------");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${r.name.padEnd(48)} | ${icon} ${r.status}  | ${(r.latencyMs + "ms").padStart(7)} | ${r.details}`);
  }
  console.log("--------------------------------------------------------------------------------------------------\n");

  if (allPassed) {
    console.log("🎉 Staging verification PASSED! Build is certified for production promotion.\n");
  } else {
    console.error("❌ Staging verification FAILED. Correct issues before production release.\n");
  }

  return allPassed;
}

if (require.main === module || process.argv[1]?.includes("verify-staging")) {
  const target = process.argv[2] || "http://localhost:5000/api/v1";
  verifyStagingRelease(target).then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
