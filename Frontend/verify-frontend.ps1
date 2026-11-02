$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
npm run lint *> (Join-Path $PSScriptRoot "npm-lint.log")
$lintExit = $LASTEXITCODE
npm run build *> (Join-Path $PSScriptRoot "npm-build.log")
$buildExit = $LASTEXITCODE
@("LINT_EXIT=$lintExit", "BUILD_EXIT=$buildExit") | Set-Content (Join-Path $PSScriptRoot "frontend-checks.txt")
Write-Output "LINT_EXIT=$lintExit"
Write-Output "BUILD_EXIT=$buildExit"
if ($lintExit -ne 0 -or $buildExit -ne 0) { exit 1 } else { exit 0 }
