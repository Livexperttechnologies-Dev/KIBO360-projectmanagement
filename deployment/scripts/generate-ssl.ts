// ==============================================================================
// KIBO360 Project Hub — TLS/SSL Certificate Generator
// Livexpert Technologies Pvt. Ltd.
// Generates X.509 certificate and RSA private key for HTTPS termination.
// ==============================================================================

import fs from "fs";
import path from "path";
import selfsigned from "selfsigned";

export async function generateSslCertificates(outputDir?: string): Promise<{ certPath: string; keyPath: string }> {
  const targetDir = outputDir || path.join(__dirname, "..", "ssl");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const certPath = path.join(targetDir, "kibo360.crt");
  const keyPath = path.join(targetDir, "kibo360.key");

  console.log("🔐 Generating 2048-bit RSA TLS/SSL certificate for kibo360.livexpert.in...");

  const attrs = [
    { name: "commonName", value: "kibo360.livexpert.in" },
  ];

  const pems: any = await (selfsigned as any).generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: "sha256",
  });

  fs.writeFileSync(certPath, pems.cert, "utf8");
  fs.writeFileSync(keyPath, pems.private, "utf8");

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
