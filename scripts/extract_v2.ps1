Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = 'C:\Users\Admin Abdelrhman\Downloads\Khalid_ERP_Musaned_Integration_Master_Plan_4_Companies_AR_v2.docx'
$extractDir = 'd:\OneDrive - University of the People\erp\scripts\extracted_v2_xml'
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractDir)
$xmlPath = Join-Path $extractDir 'word\document.xml'
Write-Host "Extracted document.xml successfully. Size: $((Get-Item $xmlPath).Length)"

$content = [System.IO.File]::ReadAllText($xmlPath, [System.Text.Encoding]::UTF8)
$paras = [regex]::Matches($content, '<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>')
$extractedParas = @()

foreach ($p in $paras) {
    $tMatches = [regex]::Matches($p.Value, '<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>')
    $pText = ""
    foreach ($t in $tMatches) {
        $pText += $t.Groups[1].Value
    }
    if ($pText.Trim().Length -gt 0) {
        $extractedParas += $pText.Trim()
    }
}

Write-Host "Total extracted paragraphs: $($extractedParas.Count)"
$outTxt = 'd:\OneDrive - University of the People\erp\scripts\extracted_v2_plan.txt'
[System.IO.File]::WriteAllLines($outTxt, $extractedParas, [System.Text.Encoding]::UTF8)
Write-Host "Saved to $outTxt"
