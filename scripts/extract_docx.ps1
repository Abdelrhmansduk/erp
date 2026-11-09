Add-Type -AssemblyName System.IO.Compression.FileSystem

$docxPath = "C:\Users\Admin Abdelrhman\Downloads\Khalid_ERP_Access_Control_Plan_AR.docx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry("word/document.xml")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

# Parse XML and extract paragraphs
$xml = [xml]$content
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$paragraphs = $xml.SelectNodes("//w:p", $ns)
$output = foreach ($p in $paragraphs) {
    $texts = $p.SelectNodes(".//w:t", $ns)
    if ($texts) {
        ($texts | ForEach-Object { $_.InnerText }) -join ""
    }
}

$output -join "`r`n" | Out-File -FilePath "scripts/docx_extracted_text.txt" -Encoding utf8
Write-Host "DOCX text extracted successfully."
