# ==============================================================================
# KIBO360 Project Hub — SSL Certificate Generator (PowerShell / Windows)
# Livexpert Technologies Pvt. Ltd.
# ==============================================================================

param (
    [string]$OutputDir = "$PSScriptRoot\..\ssl",
    [string]$Domain = "kibo360.livexpert.in"
)

Write-Host "🔐 Generating self-signed TLS/SSL certificate for $Domain..." -ForegroundColor Cyan

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$certPath = Join-Path $OutputDir "kibo360.crt"
$keyPath = Join-Path $OutputDir "kibo360.key"

# Check if OpenSSL is installed
$opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue

if ($opensslCmd) {
    Write-Host "Using OpenSSL to generate 2048-bit RSA key and self-signed X.509 certificate..." -ForegroundColor Green
    & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $keyPath `
        -out $certPath `
        -subj "/C=IN/ST=Karnataka/L=Bengaluru/O=Livexpert Technologies/OU=IT Infrastructure/CN=$Domain" `
        -addext "subjectAltName=DNS:$Domain,DNS:localhost,IP:127.0.0.1"
} else {
    Write-Host "OpenSSL not found in PATH. Generating self-signed certificate using Windows PKI..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate `
        -DnsName $Domain, "localhost" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -NotAfter (Get-Date).AddYears(1) `
        -KeyExportPolicy Exportable `
        -KeySpec Signature `
        -KeyLength 2048 `
        -HashAlgorithm "SHA256"

    # Export Certificate (.crt)
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    $certPem = "-----BEGIN CERTIFICATE-----`r`n" + [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END CERTIFICATE-----"
    Set-Content -Path $certPath -Value $certPem -Encoding Ascii

    Write-Host "Certificate exported to $certPath" -ForegroundColor Green
}

Write-Host "✅ SSL Certificate generated successfully:" -ForegroundColor Green
Write-Host "   Certificate: $certPath"
Write-Host "   Private Key: $keyPath"
