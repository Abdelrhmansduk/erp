Add-Type -AssemblyName System.IO.Compression.FileSystem

$docxPath = "C:\Users\Admin Abdelrhman\Downloads\Khalid_ERP_Data_User_Isolation_Plan_AR.docx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry("word/document.xml")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
$xmlContent = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$xml = [xml]$xmlContent
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$paragraphs = $xml.SelectNodes("//w:p", $ns)
$lines = @()

foreach ($p in $paragraphs) {
    $text = $p.InnerText
    if (-not [string]::IsNullOrWhiteSpace($text)) {
        $lines += $text.Trim()
    }
}

$outputPath = "d:\OneDrive - University of the People\erp\scripts\docx_data_isolation_plan.txt"
$lines | Out-File -FilePath $outputPath -Encoding utf8
Write-Host "Extracted $($lines.Count) lines to $outputPath"
