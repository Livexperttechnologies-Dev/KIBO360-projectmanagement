"use strict";
// ==============================================================================
// KIBO360 Project Hub — TLS/SSL Certificate Generator
// Livexpert Technologies Pvt. Ltd.
// Generates X.509 certificate and RSA private key for HTTPS termination.
// ==============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSslCertificates = generateSslCertificates;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const selfsigned_1 = __importDefault(require("selfsigned"));
async function generateSslCertificates(outputDir) {
    const targetDir = outputDir || path_1.default.join(__dirname, "..", "ssl");
    if (!fs_1.default.existsSync(targetDir)) {
        fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    const certPath = path_1.default.join(targetDir, "kibo360.crt");
    const keyPath = path_1.default.join(targetDir, "kibo360.key");
    console.log("🔐 Generating 2048-bit RSA TLS/SSL certificate for kibo360.livexpert.in...");
    const attrs = [
        { name: "commonName", value: "kibo360.livexpert.in" },
    ];
    const pems = await selfsigned_1.default.generate(attrs, {
        days: 365,
        keySize: 2048,
        algorithm: "sha256",
    });
    fs_1.default.writeFileSync(certPath, pems.cert, "utf8");
    fs_1.default.writeFileSync(keyPath, pems.private, "utf8");
    console.log("✅ SSL Certificate generated successfully:");
    console.log(`   Certificate: ${certPath}`);
    console.log(`   Private Key: ${keyPath}`);
    return { certPath, keyPath };
}
// Execute directly if invoked from CLI
if (require.main === module || process.argv[1]?.includes("generate-ssl")) {
    generateSslCertificates().catch((err) => {
        console.error("Failed to generate SSL certificates:", err);
        process.exit(1);
    });
}
