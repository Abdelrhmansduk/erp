$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$res1 = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard" -WebSession $session
$tokenPattern = 'name="_token"\s+value="([^"]+)"'
if ($res1.Content -match $tokenPattern) {
    $token = $matches[1]
    Write-Host "CSRF Token: $token"
}

$body = @{
    login = $env:ERP_LOGIN
    password = $env:ERP_PASS
    _token = $token
}

$headers = @{
    'X-Requested-With' = 'XMLHttpRequest'
}

$loginRes = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard/login" -Method POST -Body $body -WebSession $session -Headers $headers
Write-Host "Login Result: $($loginRes.Content)"

$dashRes = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard" -WebSession $session
[System.IO.File]::WriteAllText("c:\Users\abdo1\Downloads\ERP\dashboard_res.html", $dashRes.Content)
Write-Host "Saved successfully"
