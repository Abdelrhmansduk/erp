$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Step 1: Initial GET to obtain session cookies and _token
$res1 = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard" -WebSession $session
if ($res1.Content -match 'name="_token"\s+value="([^"]+)"') {
    $token = $matches[1]
    Write-Host "CSRF Token extracted: $token"
} else {
    Write-Host "CSRF Token not found!"
}

# Step 2: Perform POST login request
$body = @{
    login = $env:ERP_LOGIN
    password = $env:ERP_PASS
    _token = $token
}

$headers = @{
    'X-Requested-With' = 'XMLHttpRequest'
}

try {
    $loginRes = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard/login" -Method POST -Body $body -WebSession $session -Headers $headers
    Write-Host "Login Result:"
    Write-Host $loginRes.Content

    # Step 3: Fetch dashboard page
    $dashRes = Invoke-WebRequest -Uri "https://clickerp.com.sa/public/index.php/dashboard" -WebSession $session
    $dashRes.Content | Out-File -FilePath "c:\Users\abdo1\Downloads\ERP\dashboard_logged_in.html" -Encoding utf8
    Write-Host "Saved logged in HTML to c:\Users\abdo1\Downloads\ERP\dashboard_logged_in.html"
} catch {
    Write-Host "Error during login request: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response details: " $reader.ReadToEnd()
    }
}
