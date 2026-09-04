$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$packagePath = Join-Path $root 'package.json'
$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
$chain = $package.scripts.'check:ci'

if (-not $chain) {
    Write-Error 'package.json does not contain check:ci.'
    exit 1
}

$steps = $chain -split '\s+&&\s+'

foreach ($step in $steps) {
    $trimmed = $step.Trim()
    if ($trimmed -notmatch '^npm run ([A-Za-z0-9:_-]+)$') {
        Write-Error "Unsupported check:ci step: $trimmed"
        exit 1
    }

    $scriptName = $Matches[1]
    Write-Host ""
    Write-Host "=== npm run $scriptName ==="
    & npm run $scriptName
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Write-Host ""
Write-Host 'Frontend guarded CI checks completed successfully.'
exit 0
