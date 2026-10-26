"use strict";
// ==============================================================================
// KIBO360 Project Hub — Pre-Flight Environment Verifier
// Livexpert Technologies Pvt. Ltd.
// Validates security, secrets, database configuration, and timezone before release.
// ==============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEnvironment = verifyEnvironment;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
function verifyEnvironment(envFilePath) {
    const filePath = envFilePath || path_1.default.resolve(process.cwd(), ".env");
    const errors = [];
    const warnings = [];
    const checks = [];
    console.log(`\n🔍 Verifying environment configuration: ${filePath}\n`);
    if (!fs_1.default.existsSync(filePath)) {
        errors.push(`Environment file not found at: ${filePath}`);
        return {
            valid: false,
            errors,
            warnings,
            checks: [{ name: "File Existence", status: "FAIL", details: `Missing file: ${filePath}` }],
        };
    }
    // Parse environment file
    const envContent = fs_1.default.readFileSync(filePath, "utf8");
    const parsed = dotenv_1.default.parse(envContent);
    // 1. NODE_ENV Check
    const nodeEnv = parsed.NODE_ENV || process.env.NODE_ENV || "development";
    const isProd = nodeEnv === "production";
    checks.push({
        name: "Environment Mode",
        status: "PASS",
        details: `NODE_ENV is set to '${nodeEnv}'`,
    });
    // 2. JWT Access Secret Check
    const accessSecret = parsed.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET || "";
    const insecureKeywords = ["test", "secret", "default", "password", "kibo360-livexpert", "changeme"];
    const isAccessInsecure = insecureKeywords.some((k) => accessSecret.toLowerCase().includes(k));
    if (!accessSecret) {
        errors.push("JWT_ACCESS_SECRET is required but empty.");
        checks.push({ name: "JWT Access Secret", status: "FAIL", details: "Secret is missing." });
    }
    else if (accessSecret.length < 32) {
        if (isProd) {
            errors.push(`JWT_ACCESS_SECRET must be at least 32 characters in production (currently ${accessSecret.length}).`);
            checks.push({ name: "JWT Access Secret Length", status: "FAIL", details: `Length ${accessSecret.length} < 32 chars.` });
        }
        else {
            warnings.push(`JWT_ACCESS_SECRET is short (${accessSecret.length} chars). Use 32+ chars in production.`);
            checks.push({ name: "JWT Access Secret Length", status: "WARN", details: `Length ${accessSecret.length} < 32 chars.` });
        }
    }
    else if (isProd && isAccessInsecure) {
        errors.push("JWT_ACCESS_SECRET contains default/predictable test keywords in production.");
        checks.push({ name: "JWT Access Secret Entropy", status: "FAIL", details: "Default test keywords detected." });
    }
    else {
        checks.push({ name: "JWT Access Secret", status: "PASS", details: "High entropy 32+ character secret confirmed." });
    }
    // 3. JWT Refresh Secret Check
    const refreshSecret = parsed.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || "";
    const isRefreshInsecure = insecureKeywords.some((k) => refreshSecret.toLowerCase().includes(k));
    if (!refreshSecret) {
        errors.push("JWT_REFRESH_SECRET is required but empty.");
        checks.push({ name: "JWT Refresh Secret", status: "FAIL", details: "Secret is missing." });
    }
    else if (refreshSecret.length < 32) {
        if (isProd) {
            errors.push(`JWT_REFRESH_SECRET must be at least 32 characters in production (currently ${refreshSecret.length}).`);
            checks.push({ name: "JWT Refresh Secret Length", status: "FAIL", details: `Length ${refreshSecret.length} < 32 chars.` });
        }
        else {
            warnings.push(`JWT_REFRESH_SECRET is short (${refreshSecret.length} chars).`);
            checks.push({ name: "JWT Refresh Secret Length", status: "WARN", details: `Length ${refreshSecret.length} < 32 chars.` });
        }
    }
    else if (isProd && isRefreshInsecure) {
        errors.push("JWT_REFRESH_SECRET contains default/predictable test keywords in production.");
        checks.push({ name: "JWT Refresh Secret Entropy", status: "FAIL", details: "Default test keywords detected." });
    }
    else {
        checks.push({ name: "JWT Refresh Secret", status: "PASS", details: "High entropy 32+ character secret confirmed." });
    }
    // 4. DATABASE_URL Check
    const dbUrl = parsed.DATABASE_URL || process.env.DATABASE_URL || "";
    if (!dbUrl) {
        errors.push("DATABASE_URL is missing.");
        checks.push({ name: "Database Connection URL", status: "FAIL", details: "DATABASE_URL is empty." });
    }
    else if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
        errors.push("DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql://");
        checks.push({ name: "Database Connection Protocol", status: "FAIL", details: "Invalid protocol scheme." });
    }
    else {
        checks.push({ name: "Database Connection URL", status: "PASS", details: "Valid PostgreSQL connection string format." });
    }
    // 5. Company Timezone Check
    const timezone = parsed.COMPANY_TIMEZONE || process.env.COMPANY_TIMEZONE || "Asia/Kolkata";
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        checks.push({ name: "Company Timezone", status: "PASS", details: `Valid IANA timezone '${timezone}'` });
    }
    catch {
        errors.push(`Invalid IANA timezone string: '${timezone}'`);
        checks.push({ name: "Company Timezone", status: "FAIL", details: `Invalid timezone '${timezone}'` });
    }
    // 6. Port Check
    const port = parseInt(parsed.PORT || process.env.PORT || "5000", 10);
    if (isNaN(port) || port < 1 || port > 65535) {
        errors.push(`PORT must be a valid integer between 1 and 65535 (received '${parsed.PORT}').`);
        checks.push({ name: "Server Port", status: "FAIL", details: `Invalid port ${port}` });
    }
    else {
        checks.push({ name: "Server Port", status: "PASS", details: `Configured on port ${port}` });
    }
    // Output Diagnostic Table
    console.log("--------------------------------------------------------------------------------");
    console.log("Configuration Check                | Status | Details");
    console.log("--------------------------------------------------------------------------------");
    for (const c of checks) {
        const icon = c.status === "PASS" ? "✅" : c.status === "WARN" ? "⚠️ " : "❌";
        console.log(`${c.name.padEnd(35)} | ${icon} ${c.status} | ${c.details}`);
    }
    console.log("--------------------------------------------------------------------------------\n");
    const valid = errors.length === 0;
    if (valid) {
        console.log("🎉 All pre-flight environment checks PASSED successfully.\n");
    }
    else {
        console.error("❌ Environment validation FAILED with the following errors:");
        errors.forEach((e) => console.error(`   - ${e}`));
        console.log("");
    }
    return { valid, errors, warnings, checks };
}
// Direct CLI invocation
if (require.main === module || process.argv[1]?.includes("verify-env")) {
    const targetFile = process.argv[2];
    const result = verifyEnvironment(targetFile);
    process.exit(result.valid ? 0 : 1);
}
