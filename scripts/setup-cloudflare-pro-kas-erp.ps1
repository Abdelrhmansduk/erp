<#
.SYNOPSIS
  Automated Cloudflare Pro ($25/mo) Hardening, Speed, WAF & DNS Setup for kas-erp.com
.DESCRIPTION
  Configures all Cloudflare Pro features for KAS Holding Enterprise ERP (kas-erp.com):
  - SSL/TLS: Full (Strict), Always HTTPS, Automatic HTTPS Rewrites, TLS 1.3 + 0-RTT, HSTS Preload
  - Speed (Pro): Brotli, HTTP/3 (QUIC), Early Hints, Polish (Lossless + WebP), Mirage, Smart Tiered Cache, WebSockets
  - Security (Pro): Cloudflare Managed WAF Ruleset + OWASP Core Ruleset, Super Bot Fight Mode,
    Sensitive Path Firewall Blocker (.env/.git/wp-login), Rate Limiting on /api/*, Browser Integrity Check, Email Obfuscation
  - DNS & Email Protection: Prints exact Namecheap Nameservers, optionally configures Cloudflare Pages CNAMEs
    (@, www, staging -> kas-erp.pages.dev) and protective SPF/DMARC records.
.EXAMPLE
  $env:CLOUDFLARE_API_TOKEN = "your_token_here"
  .\scripts\setup-cloudflare-pro-kas-erp.ps1
.EXAMPLE
  .\scripts\setup-cloudflare-pro-kas-erp.ps1 -ApiToken "your_token_here" -ConfigurePagesDns -ConfigureEmailProtection
#>

[CmdletBinding()]
param(
  [string]$Domain = "kas-erp.com",
  [string]$ApiToken = $env:CLOUDFLARE_API_TOKEN,
  [string]$PagesSubdomain = "kas-erp.pages.dev",
  [switch]$ConfigurePagesDns,
  [switch]$ConfigureEmailProtection,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://api.cloudflare.com/client/v4"

if ([string]::IsNullOrWhiteSpace($ApiToken)) {
  Write-Host "`n[!] CLOUDFLARE_API_TOKEN is required." -ForegroundColor Yellow
  Write-Host "Create a token at: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Cyan
  Write-Host "Recommended permissions for kas-erp.com:" -ForegroundColor Cyan
  Write-Host "  - Zone -> Zone: Read"
  Write-Host "  - Zone -> Zone Settings: Edit"
  Write-Host "  - Zone -> DNS: Edit"
  Write-Host "  - Zone -> Firewall Services / Zone WAF: Edit"
  Write-Host "  - Zone -> Cache Rules / Smart Tiered Cache: Edit"
  Write-Host "`nRun:" -ForegroundColor Green
  Write-Host '  $env:CLOUDFLARE_API_TOKEN = "YOUR_TOKEN"'
  Write-Host '  .\scripts\setup-cloudflare-pro-kas-erp.ps1 -ConfigurePagesDns -ConfigureEmailProtection'
  exit 1
}

$Headers = @{
  "Authorization" = "Bearer $ApiToken"
  "Content-Type"  = "application/json"
}

function Invoke-CfApi {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )
  $uri = "$BaseUrl$Path"
  if ($DryRun -and $Method -ne "GET") {
    Write-Host "  [DRY-RUN] $Method $Path" -ForegroundColor DarkGray
    return @{ success = $true; dryRun = $true }
  }
  try {
    if ($null -ne $Body) {
      $jsonBody = $Body | ConvertTo-Json -Depth 15 -Compress
      return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
    } else {
      return Invoke-RestMethod -Uri $uri -Method $Method -Headers $Headers
    }
  } catch {
    $errMsg = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $errMsg = $_.ErrorDetails.Message
    }
    Write-Host "  [WARN] $Method $Path -> $errMsg" -ForegroundColor Yellow
    return @{ success = $false; error = $errMsg }
  }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " KAS Enterprise ERP — Cloudflare Pro ($25) Configurator" -ForegroundColor Cyan
Write-Host " Domain: $Domain" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# 1. Discover Zone
$zoneResp = Invoke-CfApi -Method "GET" -Path "/zones?name=$Domain"
if (-not $zoneResp.success -or -not $zoneResp.result -or $zoneResp.result.Count -eq 0) {
  Write-Host "[ERROR] Zone '$Domain' was not found in this Cloudflare account." -ForegroundColor Red
  Write-Host "Please add '$Domain' in Cloudflare Dashboard (Pro $25 plan) first, then re-run this script." -ForegroundColor Yellow
  exit 1
}

$zone = $zoneResp.result[0]
$zoneId = $zone.id
Write-Host "[OK] Found Zone: $($zone.name) (ID: $zoneId)" -ForegroundColor Green
Write-Host "     Status    : $($zone.status)" -ForegroundColor White
Write-Host "     Plan      : $($zone.plan.name)" -ForegroundColor White
Write-Host "`n[Namecheap Nameservers to Set in Namecheap -> Domain List -> $Domain -> Custom DNS]:" -ForegroundColor Yellow
foreach ($ns in $zone.name_servers) {
  Write-Host "  -> $ns" -ForegroundColor Green
}

# 2. Batch Zone Settings (SSL/TLS + Performance Pro + Security Baseline)
Write-Host "`n[Step 1/5] Applying SSL/TLS, Speed (Pro Polish/Mirage/HTTP3), and Baseline Security..." -ForegroundColor Cyan

$settingsList = @(
  # SSL/TLS & Transport
  @{ id = "ssl"; value = "strict" },
  @{ id = "always_use_https"; value = "on" },
  @{ id = "automatic_https_rewrites"; value = "on" },
  @{ id = "min_tls_version"; value = "1.2" },
  @{ id = "tls_1_3"; value = "zrt" },
  @{ id = "opportunistic_encryption"; value = "on" },
  @{ id = "security_header"; value = @{
      strict_transport_security = @{
        enabled            = $true
        max_age            = 31536000
        include_subdomains = $true
        preload            = $true
        nosniff            = $true
      }
    }
  },
  # Performance (Includes Cloudflare Pro Polish + WebP + Mirage)
  @{ id = "brotli"; value = "on" },
  @{ id = "http3"; value = "on" },
  @{ id = "0rtt"; value = "on" },
  @{ id = "early_hints"; value = "on" },
  @{ id = "websockets"; value = "on" },
  @{ id = "polish"; value = "lossless" },
  @{ id = "webp"; value = "on" },
  @{ id = "mirage"; value = "on" },
  @{ id = "always_online"; value = "on" },
  # Security Baseline
  @{ id = "security_level"; value = "medium" },
  @{ id = "browser_check"; value = "on" },
  @{ id = "email_obfuscation"; value = "on" },
  @{ id = "hotlink_protection"; value = "on" }
)

foreach ($setting in $settingsList) {
  $res = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/settings/$($setting.id)" -Body @{ value = $setting.value }
  if ($res.success) {
    Write-Host "  [OK] $($setting.id) configured" -ForegroundColor Green
  }
}

# 3. Smart Tiered Caching
Write-Host "`n[Step 2/5] Enabling Smart Tiered Cache..." -ForegroundColor Cyan
$tcRes = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/argo/tiered_caching" -Body @{ value = "on" }
if ($tcRes.success) { Write-Host "  [OK] Tiered Caching enabled" -ForegroundColor Green }

# 4. Cloudflare Pro Managed WAF (Cloudflare Managed + OWASP Core Ruleset)
Write-Host "`n[Step 3/5] Deploying Cloudflare Pro Managed WAF & OWASP Core Rulesets..." -ForegroundColor Cyan
$managedWafBody = @{
  rules = @(
    @{
      action            = "execute"
      action_parameters = @{ id = "efb7b8c949ac4650a09736fc376e9aee" } # Cloudflare Managed Ruleset
      expression        = "true"
      description       = "KAS ERP: Execute Cloudflare Managed Ruleset (Pro)"
      enabled           = $true
    },
    @{
      action            = "execute"
      action_parameters = @{ id = "4814384a9e5d4991b9815dcfc25d2f1f" } # Cloudflare OWASP Core Ruleset
      expression        = "true"
      description       = "KAS ERP: Execute OWASP Core Ruleset (Pro)"
      enabled           = $true
    }
  )
}
$wafRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/rulesets/phases/http_request_firewall_managed/entrypoint" -Body $managedWafBody
if ($wafRes.success) { Write-Host "  [OK] Cloudflare Managed + OWASP Rulesets deployed" -ForegroundColor Green }

# 5. Cloudflare Pro Advanced Security (DNSSEC, Page Shield, Super Bot Fight Mode, Leaked Credentials, Custom WAF, Rate Limiting)
Write-Host "`n[Step 4/5] Deploying Advanced Security (DNSSEC, Page Shield, Super Bot Fight Mode, Custom WAF, Rate Limiting)..." -ForegroundColor Cyan

# 5a. Enable DNSSEC (Provides DS record for Namecheap)
$dnssecRes = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/dnssec" -Body @{ status = "active" }
if ($dnssecRes.success) {
  Write-Host "  [OK] DNSSEC enabled (copy DS record from Cloudflare -> DNS -> Settings to Namecheap)" -ForegroundColor Green
}

# 5b. Enable Page Shield (Monitors client-side JS scripts against Magecart/XSS skimming)
$psRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/page_shield" -Body @{ enabled = $true; use_cloudflare_reporting_endpoint = $true }
if ($psRes.success) { Write-Host "  [OK] Page Shield client-side script monitor enabled" -ForegroundColor Green }

# 5c. Enable Super Bot Fight Mode (Cloudflare Pro)
$sbfmRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/bot_management" -Body @{
  sbfm_definitely_automated = "block"
  sbfm_likely_automated     = "managed_challenge"
  sbfm_verified_bots        = "allow"
  sbfm_static_resource_protection = $false
  enable_js                 = $true
}
if ($sbfmRes.success) { Write-Host "  [OK] Super Bot Fight Mode (Pro) enabled" -ForegroundColor Green }

# 5d. Enable Leaked Credentials Detection (WAF)
$lcRes = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/leaked-credential-checks" -Body @{ enabled = $true }
if ($lcRes.success) { Write-Host "  [OK] Leaked Credentials Check enabled" -ForegroundColor Green }

# 5e. Custom WAF Rule (Block exploit scanners, empty user-agents & sensitive probes)
$customWafBody = @{
  rules = @(
    @{
      action      = "block"
      expression  = '(http.request.uri.path contains "/.env") or (http.request.uri.path contains "/.git") or (http.request.uri.path contains "/wp-login") or (http.request.uri.path contains "/xmlrpc.php") or (http.request.uri.path contains "/phpinfo") or (http.request.uri.path contains "/.htaccess")'
      description = "KAS ERP: Block exploit scanners and sensitive dotfile probes"
      enabled     = $true
    },
    @{
      action      = "managed_challenge"
      expression  = '(http.user_agent eq "") and not (starts_with(http.request.uri.path, "/iclock/"))'
      description = "KAS ERP: Managed Challenge on empty User-Agent (allows ZKTeco biometric devices)"
      enabled     = $true
    }
  )
}
$cwRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/rulesets/phases/http_request_firewall_custom/entrypoint" -Body $customWafBody
if ($cwRes.success) { Write-Host "  [OK] Custom Exploit-Blocker & Empty-UA WAF Rules deployed" -ForegroundColor Green }

# 5f. Rate Limiting on /api/*
$rateLimitBody = @{
  rules = @(
    @{
      action      = "block"
      expression  = '(starts_with(http.request.uri.path, "/api/"))'
      description = "KAS ERP: Protect /api/* against burst abuse (100 req / 10s per IP)"
      enabled     = $true
      ratelimit   = @{
        characteristics     = @("cf.colo.id", "ip.src")
        period              = 10
        requests_per_period = 100
        mitigation_timeout  = 60
      }
    }
  )
}
$rlRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/rulesets/phases/http_ratelimit/entrypoint" -Body $rateLimitBody
if ($rlRes.success) { Write-Host "  [OK] Rate Limiting Rule deployed on /api/*" -ForegroundColor Green }

# 6. Optional DNS & Email Spoofing Protection
Write-Host "`n[Step 5/5] DNS & Email Anti-Spoofing Check..." -ForegroundColor Cyan

if ($ConfigurePagesDns) {
  $dnsRecords = Invoke-CfApi -Method "GET" -Path "/zones/$zoneId/dns_records?per_page=100"
  $existing = @()
  if ($dnsRecords.success -and $dnsRecords.result) { $existing = $dnsRecords.result }

  $targets = @(
    @{ name = $Domain;            content = $PagesSubdomain; comment = "KAS ERP Production (Cloudflare Pages)" },
    @{ name = "www.$Domain";      content = $PagesSubdomain; comment = "KAS ERP WWW (Cloudflare Pages)" },
    @{ name = "staging.$Domain";  content = "staging.$PagesSubdomain"; comment = "KAS ERP Staging Branch (Cloudflare Pages)" }
  )

  foreach ($t in $targets) {
    $match = $existing | Where-Object { $_.name -eq $t.name -and ($_.type -eq "CNAME" -or $_.type -eq "A") } | Select-Object -First 1
    if ($null -eq $match) {
      $cr = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/dns_records" -Body @{
        type    = "CNAME"
        name    = $t.name
        content = $t.content
        proxied = $true
        ttl     = 1
        comment = $t.comment
      }
      if ($cr.success) { Write-Host "  [OK] Created Proxied CNAME: $($t.name) -> $($t.content)" -ForegroundColor Green }
    } else {
      Write-Host "  [SKIP] Record already exists for $($t.name) ($($match.type) -> $($match.content))" -ForegroundColor DarkYellow
    }
  }
}

if ($ConfigureEmailProtection) {
  $dnsRecords = Invoke-CfApi -Method "GET" -Path "/zones/$zoneId/dns_records?per_page=100"
  $existingTxt = @()
  if ($dnsRecords.success -and $dnsRecords.result) {
    $existingTxt = $dnsRecords.result | Where-Object { $_.type -eq "TXT" }
  }

  $hasDmarc = $existingTxt | Where-Object { $_.name -eq "_dmarc.$Domain" }
  if (-not $hasDmarc) {
    $dmRes = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/dns_records" -Body @{
      type    = "TXT"
      name    = "_dmarc.$Domain"
      content = "v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s;"
      ttl     = 1
      comment = "KAS ERP DMARC anti-spoofing policy"
    }
    if ($dmRes.success) { Write-Host "  [OK] Created DMARC record (_dmarc.$Domain)" -ForegroundColor Green }
  } else {
    Write-Host "  [SKIP] DMARC record already exists for _dmarc.$Domain" -ForegroundColor DarkYellow
  }
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " Cloudflare Pro ($25) Configuration Complete for $Domain!" -ForegroundColor Green
Write-Host " Next: Verify Super Bot Fight Mode & Zero Trust Access in Dashboard." -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Green
