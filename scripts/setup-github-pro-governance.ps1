# ============================================================================
# One-Click GitHub Pro ($4/mo) Governance Setup Script for khalid-group-12/kas-erp
# Configures:
#  1. Main branch protection (no force-push, no delete, required CI status checks)
#  2. Squash-merge default + Auto-delete merged feature branches
#  3. Dependabot vulnerability alerts & automated security fixes
# Run AFTER signing into the khalid-group-12 GitHub account (or collaborator with Admin role):
#   powershell -ExecutionPolicy Bypass -File scripts/setup-github-pro-governance.ps1
# ============================================================================
param(
  [string]$Repo = "khalid-group-12/kas-erp",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Write-Host "Applying GitHub Pro Best Practices on $Repo ($Branch)..." -ForegroundColor Cyan

# 1. Repository settings: Squash merge clean history + auto-delete head branches
gh api --method PATCH "repos/$Repo" `
  -F allow_squash_merge=true `
  -F allow_merge_commit=false `
  -F allow_rebase_merge=true `
  -F delete_branch_on_merge=true | Out-Null
Write-Host "[OK] Enabled Squash Merge & Auto-Delete Merged Branches." -ForegroundColor Green

# 2. Enable Dependabot vulnerability alerts & automated security fixes
gh api --method PUT "repos/$Repo/vulnerability-alerts" | Out-Null
gh api --method PUT "repos/$Repo/automated-security-fixes" | Out-Null
Write-Host "[OK] Enabled Dependabot Vulnerability Alerts & Security Fixes." -ForegroundColor Green

# 2.5 Create GitHub Pro Environments (staging & production)
foreach ($envName in @("staging", "production")) {
  gh api --method PUT "repos/$Repo/environments/$envName" | Out-Null
  Write-Host "[OK] Provisioned GitHub Environment: $envName" -ForegroundColor Green
}

# 3. Protect `main` branch with required CI status checks (allows Admin emergency bypass if needed)
$protectionPayload = @{
  required_status_checks = @{
    strict   = $true
    contexts = @(
      "Typecheck & Secrets Guard",
      "Full Vitest Suite (RBAC + Accounting + WMS + HR)",
      "Production Build Verification"
    )
  }
  enforce_admins = $false
  required_pull_request_reviews = @{
    dismiss_stale_reviews           = $true
    require_code_owner_reviews      = $true
    required_approving_review_count = 1
  }
  restrictions            = $null
  allow_force_pushes      = $false
  allow_deletions         = $false
  required_linear_history = $true
} | ConvertTo-Json -Depth 6

$tmpJson = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($tmpJson, $protectionPayload, (New-Object System.Text.UTF8Encoding($false)))
  gh api --method PUT "repos/$Repo/branches/$Branch/protection" --input $tmpJson | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to apply branch protection on $Repo/$Branch" }
  Write-Host "[OK] Protected branch '$Branch' (No Force-Push, Linear History, Required CI Checks, CODEOWNERS)." -ForegroundColor Green
} finally {
  if (Test-Path $tmpJson) { Remove-Item $tmpJson -Force }
}

Write-Host "`nDone! Your GitHub Pro ($4/mo) repository '$Repo' is now enterprise-hardened." -ForegroundColor Cyan
