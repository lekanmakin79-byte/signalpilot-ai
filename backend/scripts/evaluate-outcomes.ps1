$ErrorActionPreference = "Stop"

$apiUrl = "http://127.0.0.1:8000/outcomes/evaluate"

try {
    $response = Invoke-RestMethod `
        -Uri $apiUrl `
        -Method Post `
        -TimeoutSec 30

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Output "[$timestamp] Outcome evaluation completed."

    Write-Output "Evaluated: $($response.evaluated)"
    Write-Output "Pending: $($response.pending)"
    Write-Output "Skipped: $($response.skipped)"

    exit 0
}
catch {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Output "[$timestamp] Outcome evaluation failed."
    Write-Output $_.Exception.Message

    exit 1
}