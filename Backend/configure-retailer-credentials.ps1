# Configure optional official affiliate API credentials for Quick-Own.
# Values are stored only in the current Windows user's environment variables.
# They are never printed to the console or written into the project files.

$ErrorActionPreference = "Stop"

function ConvertFrom-SecureInput {
    param([System.Security.SecureString]$SecureValue)

    if ($null -eq $SecureValue -or $SecureValue.Length -eq 0) {
        return ""
    }

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Set-UserValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowEmptyString()][string]$Value
    )

    if (-not [string]::IsNullOrWhiteSpace($Value)) {
        # Persist for future logins and expose to commands launched by this PowerShell session.
        [Environment]::SetEnvironmentVariable($Name, $Value, "User")
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
    }
}

Write-Host ""
Write-Host "Quick-Own retailer credential setup" -ForegroundColor Cyan
Write-Host "Leave a field blank to skip that provider."
Write-Host "Credentials are saved to your Windows user environment, not to source files."
Write-Host ""

Write-Host "Flipkart Affiliate API" -ForegroundColor Yellow
$flipkartId = Read-Host "Affiliate Tracking ID (not secret)"
$flipkartTokenSecure = Read-Host "Affiliate API Token (secure input)" -AsSecureString
$flipkartToken = ConvertFrom-SecureInput $flipkartTokenSecure

if (-not [string]::IsNullOrWhiteSpace($flipkartId) -and
    -not [string]::IsNullOrWhiteSpace($flipkartToken)) {
    Set-UserValue -Name "FLIPKART_AFFILIATE_ID" -Value $flipkartId.Trim()
    Set-UserValue -Name "FLIPKART_AFFILIATE_TOKEN" -Value $flipkartToken
    Write-Host "Flipkart credentials saved." -ForegroundColor Green
}
elseif (-not [string]::IsNullOrWhiteSpace($flipkartId) -or
        -not [string]::IsNullOrWhiteSpace($flipkartToken)) {
    Write-Warning "Flipkart requires both the Affiliate Tracking ID and API Token. Neither was changed."
}

# Clear short-lived strings as soon as they have been written to the user environment.
$flipkartToken = $null
$flipkartTokenSecure = $null

Write-Host ""
Write-Host "Amazon.in Creators API" -ForegroundColor Yellow
$amazonClientId = Read-Host "Creators API Client ID (not secret)"
$amazonSecretSecure = Read-Host "Creators API Client Secret (secure input)" -AsSecureString
$amazonSecret = ConvertFrom-SecureInput $amazonSecretSecure
$amazonPartnerTag = Read-Host "Amazon.in Associates Partner Tag"

if (-not [string]::IsNullOrWhiteSpace($amazonClientId) -and
    -not [string]::IsNullOrWhiteSpace($amazonSecret) -and
    -not [string]::IsNullOrWhiteSpace($amazonPartnerTag)) {
    Set-UserValue -Name "AMAZON_CREATORS_CLIENT_ID" -Value $amazonClientId.Trim()
    Set-UserValue -Name "AMAZON_CREATORS_CLIENT_SECRET" -Value $amazonSecret
    Set-UserValue -Name "AMAZON_ASSOCIATES_PARTNER_TAG" -Value $amazonPartnerTag.Trim()
    Set-UserValue -Name "AMAZON_MARKETPLACE" -Value "www.amazon.in"
    Set-UserValue -Name "AMAZON_TOKEN_URL" -Value "https://api.amazon.co.uk/auth/o2/token"
    Write-Host "Amazon.in credentials saved." -ForegroundColor Green
}
elseif (-not [string]::IsNullOrWhiteSpace($amazonClientId) -or
        -not [string]::IsNullOrWhiteSpace($amazonSecret) -or
        -not [string]::IsNullOrWhiteSpace($amazonPartnerTag)) {
    Write-Warning "Amazon requires Client ID, Client Secret and Partner Tag. No Amazon values were changed."
}

$amazonSecret = $null
$amazonSecretSecure = $null

Set-UserValue -Name "CATALOG_CURRENCY" -Value "INR"

Write-Host ""
Write-Host "Default catalogue currency set to INR." -ForegroundColor Green
Write-Host "The values are now available to this PowerShell session and saved for your Windows user."
Write-Host "To start the backend with these values, run this command in THIS PowerShell window:"
Write-Host "  .\\mvnw.cmd spring-boot:run"
Write-Host "Alternatively, close IntelliJ completely and reopen it after Windows has refreshed the user environment."
Write-Host "Then call GET http://localhost:8080/api/catalog/providers."
Write-Host "The response reports which providers are configured; it never reveals credentials."
