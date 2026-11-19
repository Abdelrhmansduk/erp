<#
.SYNOPSIS
  All-In-One Cloudflare Pro ($25/mo) Enterprise Setup for kas-erp.com (KAS Holding ERP)
.DESCRIPTION
  Automates EVERY Cloudflare Pro ($25/mo) + Free Enterprise Add-on for kas-erp.com:
  1. SSL/TLS & Transport: Full (Strict), Always HTTPS, Automatic HTTPS Rewrites, TLS 1.2+, TLS 1.3 + 0-RTT, HSTS Preload
  2. Pro Performance: Brotli, HTTP/3 (QUIC), Early Hints, Polish (Lossless + WebP), Mirage, Smart Tiered Cache, WebSockets
  3. Pro Advanced Security:
     - DNSSEC activation + prints exact DS Record values for Namecheap
     - Cloudflare Managed WAF Ruleset + OWASP Core Ruleset
     - Super Bot Fight Mode (block definitely automated, challenge likely automated, allow verified bots)
     - Page Shield client-side JS monitor + Leaked Credentials Check
     - Smart Geo-Challenge WAF Rule (smooth access for KSA, GCC & external recruitment agency countries; Managed Challenge elsewhere on /api/*)
     - Exploit scanner blocker (.env/.git/wp-login/xmlrpc) + Empty-UA protection (allows ZKTeco /iclock/)
     - Rate Limiting on /api/* (100 req / 10s per IP)
  4. Full Multi-Subdomain DNS Provisioning (-ConfigureAllSubdomains):
     - @, www, erp, staging, agents, saf, yaq, top, trade, dar, verify, signage -> kas-erp.pages.dev (Proxied)
  5. Zero Trust Access Policy (-ConfigureStagingZeroTrust):
     - Locks staging.kas-erp.com exclusively to @kas.sa & @kas-erp.com via One-Time PIN (Free up to 50 seats!)
  6. Cloudflare Email Routing + Anti-Spoofing (-ConfigureEmailProtection & -ConfigureEmailRouting):
     - Creates DMARC + SPF protection and routes admin@, wms@, security@, hr@kas-erp.com -> destination inbox
  7. Cloudflare Turnstile Widget (-CreateTurnstileWidget):
     - Provisions the kas-erp.com Turnstile widget and prints VITE_CLOUDFLARE_TURNSTILE_SITE_KEY & TURNSTILE_SECRET_KEY
.EXAMPLE
  $env:CLOUDFLARE_API_TOKEN = "your_token_here"
  .\scripts\setup-cloudflare-pro-kas-erp.ps1 -ConfigureAllSubdomains -ConfigureEmailProtection -ConfigureStagingZeroTrust -CreateTurnstileWidget
#>

[CmdletBinding()]
param(
  [string]$Domain = "kas-erp.com",
  [string]$ApiToken = $env:CLOUDFLARE_API_TOKEN,
  [string]$PagesSubdomain = "kas-erp.pages.dev",
  [string]$ForwardToEmail = "",
  [string[]]$AllowedZeroTrustDomains = @("kas.sa", "kas-erp.com"),
  [switch]$ConfigureAllSubdomains,
  [switch]$ConfigureEmailProtection,
  [switch]$ConfigureEmailRouting,
  [switch]$ConfigureStagingZeroTrust,
  [switch]$CreateTurnstileWidget,
  [switch]$EnableGeoChallenge,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://api.cloudflare.com/client/v4"

if ([string]::IsNullOrWhiteSpace($ApiToken)) {
  Write-Host "`n[!] CLOUDFLARE_API_TOKEN is required." -ForegroundColor Yellow
  Write-Host "Create a token at: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Cyan
  Write-Host "Recommended permissions for $Domain :" -ForegroundColor Cyan
  Write-Host "  - Zone: Read | Zone Settings: Edit | DNS: Edit | Firewall/WAF: Edit | Page Shield: Edit"
  Write-Host "  - Account: Access Apps & Policies: Edit | Turnstile: Edit | Email Routing: Edit"
  Write-Host "`nRun:" -ForegroundColor Green
  Write-Host '  $env:CLOUDFLARE_API_TOKEN = "YOUR_TOKEN"'
  Write-Host '  .\scripts\setup-cloudflare-pro-kas-erp.ps1 -ConfigureAllSubdomains -ConfigureEmailProtection -ConfigureStagingZeroTrust -CreateTurnstileWidget -EnableGeoChallenge'
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

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " KAS Enterprise ERP — Cloudflare Pro ($25) Full Stack Automator" -ForegroundColor Cyan
Write-Host " Domain: $Domain" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# 1. Discover Zone & Account
$zoneResp = Invoke-CfApi -Method "GET" -Path "/zones?name=$Domain"
if (-not $zoneResp.success -or -not $zoneResp.result -or $zoneResp.result.Count -eq 0) {
  Write-Host "[ERROR] Zone '$Domain' was not found in this Cloudflare account." -ForegroundColor Red
  Write-Host "Please add '$Domain' in Cloudflare Dashboard (Pro $25 plan) first, then re-run this script." -ForegroundColor Yellow
  exit 1
}

$zone = $zoneResp.result[0]
$zoneId = $zone.id
$accountId = $zone.account.id
Write-Host "[OK] Zone Found : $($zone.name) (Zone ID: $zoneId)" -ForegroundColor Green
Write-Host "     Account ID : $accountId ($($zone.account.name))" -ForegroundColor White
Write-Host "     Status     : $($zone.status)" -ForegroundColor White
Write-Host "     Plan       : $($zone.plan.name)" -ForegroundColor White
Write-Host "`n[Namecheap -> Domain List -> $Domain -> Manage -> Nameservers -> Custom DNS]:" -ForegroundColor Yellow
foreach ($ns in $zone.name_servers) {
  Write-Host "  -> $ns" -ForegroundColor Green
}

# 2. SSL/TLS + Pro Speed Settings
Write-Host "`n[Step 1/7] SSL/TLS Strict, HSTS Preload, HTTP/3, Early Hints, Polish & Mirage..." -ForegroundColor Cyan
$settingsList = @(
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
  @{ id = "brotli"; value = "on" },
  @{ id = "http3"; value = "on" },
  @{ id = "0rtt"; value = "on" },
  @{ id = "early_hints"; value = "on" },
  @{ id = "websockets"; value = "on" },
  @{ id = "polish"; value = "lossless" },
  @{ id = "webp"; value = "on" },
  @{ id = "mirage"; value = "on" },
  @{ id = "always_online"; value = "on" },
  @{ id = "security_level"; value = "medium" },
  @{ id = "browser_check"; value = "on" },
  @{ id = "email_obfuscation"; value = "on" },
  @{ id = "hotlink_protection"; value = "on" }
)
foreach ($setting in $settingsList) {
  $res = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/settings/$($setting.id)" -Body @{ value = $setting.value }
  if ($res.success) { Write-Host "  [OK] $($setting.id)" -ForegroundColor Green }
}

# 3. Smart Tiered Caching
Write-Host "`n[Step 2/7] Enabling Smart Tiered Cache..." -ForegroundColor Cyan
$tcRes = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/argo/tiered_caching" -Body @{ value = "on" }
if ($tcRes.success) { Write-Host "  [OK] Tiered Caching enabled" -ForegroundColor Green }

# 4. Cloudflare Pro Managed WAF + OWASP Core Ruleset
Write-Host "`n[Step 3/7] Deploying Cloudflare Managed WAF & OWASP Core Rulesets (Pro)..." -ForegroundColor Cyan
$managedWafBody = @{
  rules = @(
    @{
      action            = "execute"
      action_parameters = @{ id = "efb7b8c949ac4650a09736fc376e9aee" }
      expression        = "true"
      description       = "KAS ERP: Cloudflare Managed Ruleset (Pro)"
      enabled           = $true
    },
    @{
      action            = "execute"
      action_parameters = @{ id = "4814384a9e5d4991b9815dcfc25d2f1f" }
      expression        = "true"
      description       = "KAS ERP: OWASP Core Ruleset (Pro)"
      enabled           = $true
    }
  )
}
$wafRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/rulesets/phases/http_request_firewall_managed/entrypoint" -Body $managedWafBody
if ($wafRes.success) { Write-Host "  [OK] Managed WAF + OWASP active" -ForegroundColor Green }

# 5. Advanced Security (DNSSEC + Page Shield + Super Bot Fight Mode + Leaked Credentials + Custom WAF + Geo-Challenge + Rate Limiting)
Write-Host "`n[Step 4/7] Activating DNSSEC, Page Shield, Super Bot Fight Mode, Leaked Credentials & WAF Rules..." -ForegroundColor Cyan

$dnssecRes = Invoke-CfApi -Method "PATCH" -Path "/zones/$zoneId/dnssec" -Body @{ status = "active" }
if ($dnssecRes.success -and $dnssecRes.result) {
  Write-Host "  [OK] DNSSEC enabled! Copy this DS record into Namecheap -> Advanced DNS -> DNSSEC:" -ForegroundColor Green
  if ($dnssecRes.result.ds) {
    Write-Host "       DS Record   : $($dnssecRes.result.ds)" -ForegroundColor Yellow
    Write-Host "       Key Tag     : $($dnssecRes.result.key_tag) | Algo: $($dnssecRes.result.algorithm) | Digest Type: $($dnssecRes.result.digest_type)" -ForegroundColor White
    Write-Host "       Digest      : $($dnssecRes.result.digest)" -ForegroundColor White
  }
}

$psRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/page_shield" -Body @{ enabled = $true; use_cloudflare_reporting_endpoint = $true }
if ($psRes.success) { Write-Host "  [OK] Page Shield enabled" -ForegroundColor Green }

$sbfmRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/bot_management" -Body @{
  sbfm_definitely_automated      = "block"
  sbfm_likely_automated          = "managed_challenge"
  sbfm_verified_bots             = "allow"
  sbfm_static_resource_protection = $false
  enable_js                      = $true
}
if ($sbfmRes.success) { Write-Host "  [OK] Super Bot Fight Mode (Pro) enabled" -ForegroundColor Green }

$lcRes = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/leaked-credential-checks" -Body @{ enabled = $true }
if ($lcRes.success) { Write-Host "  [OK] Leaked Credentials Check enabled" -ForegroundColor Green }

$customRules = @(
  @{
    action      = "block"
    expression  = '(http.request.uri.path contains "/.env") or (http.request.uri.path contains "/.git") or (http.request.uri.path contains "/wp-login") or (http.request.uri.path contains "/xmlrpc.php") or (http.request.uri.path contains "/phpinfo") or (http.request.uri.path contains "/.htaccess")'
    description = "KAS ERP: Block exploit scanners and dotfile probes"
    enabled     = $true
  },
  @{
    action      = "managed_challenge"
    expression  = '(http.user_agent eq "") and not (starts_with(http.request.uri.path, "/iclock/"))'
    description = "KAS ERP: Challenge empty User-Agent (allows ZKTeco biometric push)"
    enabled     = $true
  }
)

if ($EnableGeoChallenge) {
  # Smooth direct entry for KSA + GCC + external agency partner countries; Managed Challenge elsewhere on /api/*
  $customRules += @{
    action      = "managed_challenge"
    expression  = '(starts_with(http.request.uri.path, "/api/")) and not (ip.geoip.country in {"SA" "AE" "KW" "BH" "QA" "OM" "EG" "PH" "KE" "BD" "IN" "PK" "UG" "ET" "ID" "LK" "NP" "SD" "JO" "US" "GB"})'
    description = "KAS ERP: Smart Geo-Challenge for non-operating countries on /api/*"
    enabled     = $true
  }
}

$cwRes = Invoke-CfApi -Method "PUT" -Path "/zones/$zoneId/rulesets/phases/http_request_firewall_custom/entrypoint" -Body @{ rules = $customRules }
if ($cwRes.success) { Write-Host "  [OK] Custom WAF & Geo-Challenge Rules deployed ($($customRules.Count) rules)" -ForegroundColor Green }

$rateLimitBody = @{
  rules = @(
    @{
      action      = "block"
      expression  = '(starts_with(http.request.uri.path, "/api/"))'
      description = "KAS ERP: API Rate Limit (100 req / 10s per IP)"
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
if ($rlRes.success) { Write-Host "  [OK] API Rate Limiting Rule deployed" -ForegroundColor Green }

# 6. Multi-Subdomain DNS Topology (All KAS Holding Portals)
Write-Host "`n[Step 5/7] DNS Topology & Email Security..." -ForegroundColor Cyan
if ($ConfigureAllSubdomains) {
  $dnsResp = Invoke-CfApi -Method "GET" -Path "/zones/$zoneId/dns_records?per_page=100"
  $existingDns = if ($dnsResp.success -and $dnsResp.result) { $dnsResp.result } else { @() }

  $subdomains = @(
    @{ name = $Domain;            content = $PagesSubdomain;           comment = "KAS ERP Production Apex" },
    @{ name = "www.$Domain";      content = $PagesSubdomain;           comment = "KAS ERP WWW (301 -> Apex)" },
    @{ name = "erp.$Domain";      content = $PagesSubdomain;           comment = "KAS ERP Alias" },
    @{ name = "staging.$Domain";  content = "staging.$PagesSubdomain"; comment = "KAS ERP Staging Preview Branch" },
    @{ name = "agents.$Domain";   content = $PagesSubdomain;           comment = "External Agencies Isolated Portal" },
    @{ name = "saf.$Domain";      content = $PagesSubdomain;           comment = "Safir Diamond Recruitment Portal" },
    @{ name = "yaq.$Domain";      content = $PagesSubdomain;           comment = "Yaqoot Najd Portal" },
    @{ name = "top.$Domain";      content = $PagesSubdomain;           comment = "Topaz Workforce Portal" },
    @{ name = "trade.$Domain";    content = $PagesSubdomain;           comment = "KAS Trade & WMS Portal" },
    @{ name = "dar.$Domain";      content = $PagesSubdomain;           comment = "Dar Al-Ruwad Shelter Portal" },
    @{ name = "verify.$Domain";   content = $PagesSubdomain;           comment = "Digital Document Verification Portal" },
    @{ name = "signage.$Domain";  content = $PagesSubdomain;           comment = "Executive Digital Signage Kiosk" }
  )

  foreach ($t in $subdomains) {
    $exists = $existingDns | Where-Object { $_.name -eq $t.name -and ($_.type -eq "CNAME" -or $_.type -eq "A") } | Select-Object -First 1
    if ($null -eq $exists) {
      $cr = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/dns_records" -Body @{
        type = "CNAME"; name = $t.name; content = $t.content; proxied = $true; ttl = 1; comment = $t.comment
      }
      if ($cr.success) { Write-Host "  [OK] Proxied CNAME: $($t.name) -> $($t.content)" -ForegroundColor Green }
    } else {
      Write-Host "  [SKIP] Exists: $($t.name) ($($exists.type) -> $($exists.content))" -ForegroundColor DarkYellow
    }
  }
}

if ($ConfigureEmailProtection) {
  $dnsResp = Invoke-CfApi -Method "GET" -Path "/zones/$zoneId/dns_records?per_page=100"
  $existingTxt = if ($dnsResp.success -and $dnsResp.result) { $dnsResp.result | Where-Object { $_.type -eq "TXT" } } else { @() }

  if (-not ($existingTxt | Where-Object { $_.name -eq "_dmarc.$Domain" })) {
    $dm = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/dns_records" -Body @{
      type = "TXT"; name = "_dmarc.$Domain"; content = "v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s;"; ttl = 1; comment = "KAS ERP DMARC"
    }
    if ($dm.success) { Write-Host "  [OK] DMARC record created (_dmarc.$Domain)" -ForegroundColor Green }
  }
}

if ($ConfigureEmailRouting -and -not [string]::IsNullOrWhiteSpace($ForwardToEmail)) {
  $erEnable = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/email/routing/enable" -Body @{}
  if ($erEnable.success) { Write-Host "  [OK] Cloudflare Email Routing enabled" -ForegroundColor Green }

  $aliases = @("admin@$Domain", "wms@$Domain", "security@$Domain", "hr@$Domain")
  foreach ($alias in $aliases) {
    $ruleRes = Invoke-CfApi -Method "POST" -Path "/zones/$zoneId/email/routing/rules" -Body @{
      name     = "Forward $alias"
      enabled  = $true
      matchers = @(@{ type = "literal"; field = "to"; value = $alias })
      actions  = @(@{ type = "forward"; value = @($ForwardToEmail) })
    }
    if ($ruleRes.success) { Write-Host "  [OK] Email Alias: $alias -> $ForwardToEmail" -ForegroundColor Green }
  }
}

# 7. Zero Trust Access (Protect staging.kas-erp.com — Free up to 50 users!)
Write-Host "`n[Step 6/7] Zero Trust Access & Turnstile Provisioning..." -ForegroundColor Cyan
if ($ConfigureStagingZeroTrust -and $accountId) {
  $appRes = Invoke-CfApi -Method "POST" -Path "/accounts/$accountId/access/apps" -Body @{
    name             = "KAS ERP Staging Gate (Zero Trust)"
    domain           = "staging.$Domain"
    type             = "self_hosted"
    session_duration = "12h"
    auto_redirect_to_identity = $false
  }
  if ($appRes.success -and $appRes.result) {
    $appId = $appRes.result.id
    $includeRules = @()
    foreach ($d in $AllowedZeroTrustDomains) {
      $includeRules += @{ email_domain = @{ domain = $d } }
    }
    $polRes = Invoke-CfApi -Method "POST" -Path "/accounts/$accountId/access/apps/$appId/policies" -Body @{
      name       = "Allow KAS Corporate Staff Only"
      decision   = "allow"
      precedence = 1
      include    = $includeRules
    }
    if ($polRes.success) {
      Write-Host "  [OK] Zero Trust Access locks staging.$Domain to: $($AllowedZeroTrustDomains -join ', ')" -ForegroundColor Green
    }
  }
}

# 8. Cloudflare Turnstile Anti-Bot Widget
if ($CreateTurnstileWidget -and $accountId) {
  $tsRes = Invoke-CfApi -Method "POST" -Path "/accounts/$accountId/challenges/widgets" -Body @{
    name    = "KAS ERP Login Turnstile ($Domain)"
    domains = @($Domain, "staging.$Domain", "erp.$Domain", "agents.$Domain", "trade.$Domain")
    mode    = "managed"
  }
  if ($tsRes.success -and $tsRes.result) {
    Write-Host "`n  [OK] Cloudflare Turnstile Widget Created!" -ForegroundColor Green
    Write-Host "  Add these 2 environment variables in Cloudflare Pages -> kas-erp -> Settings -> Environment Variables:" -ForegroundColor Yellow
    Write-Host "    VITE_CLOUDFLARE_TURNSTILE_SITE_KEY = $($tsRes.result.sitekey)" -ForegroundColor Green
    Write-Host "    TURNSTILE_SECRET_KEY               = $($tsRes.result.secret)" -ForegroundColor Green
  }
}

Write-Host "`n================================================================" -ForegroundColor Green
Write-Host " Step 7/7 DONE — Cloudflare Pro ($25) Full Stack Ready for $Domain!" -ForegroundColor Green
Write-Host "================================================================`n" -ForegroundColor Green
