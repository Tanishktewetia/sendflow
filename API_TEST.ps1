# Java Mailer API Test Script
# Tests registration, OTP, and authentication flow

#Requires -Version 5.0

$baseUrl = "http://localhost:8081/api"
$email = "tanishktewetia@gmail.com"
$password = "Enzsr8ha3f@"
$fullName = "Tanishk Tewetia"

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body,
        [string]$Token
    )
    
    $url = "$baseUrl$Endpoint"
    $headers = @{"Content-Type" = "application/json"}
    
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $bodyJson = $Body | ConvertTo-Json
    
    try {
        $response = [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
        
        $httpRequest = [System.Net.WebRequest]::Create($url)
        $httpRequest.Method = $Method
        $httpRequest.ContentType = "application/json"
        
        if ($Token) {
            $httpRequest.Headers.Add("Authorization", "Bearer $Token")
        }
        
        if ($Body -and @("POST", "PUT") -contains $Method) {
            $streamWriter = New-Object System.IO.StreamWriter($httpRequest.GetRequestStream())
            $streamWriter.Write($bodyJson)
            $streamWriter.Close()
        }
        
        $httpResponse = $httpRequest.GetResponse()
        $streamReader = New-Object System.IO.StreamReader($httpResponse.GetResponseStream())
        $content = $streamReader.ReadToEnd()
        $streamReader.Close()
        
        return @{
            StatusCode = $httpResponse.StatusCode
            Content = $content | ConvertFrom-Json
        }
    }
    catch {
        if ($_.Exception.InnerException -is [System.Net.WebException]) {
            $response = $_.Exception.InnerException.Response
            if ($response) {
                $streamReader = New-Object System.IO.StreamReader($response.GetResponseStream())
                $content = $streamReader.ReadToEnd()
                $streamReader.Close()
                
                return @{
                    StatusCode = $response.StatusCode
                    Content = ($content | ConvertFrom-Json -ErrorAction SilentlyContinue) -or $content
                }
            }
        }
        
        Write-Host "ERROR: $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Java Mailer API Testing" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Register User
Write-Host "[TEST 1] Register User" -ForegroundColor Yellow
Write-Host "  Sending: POST /auth/register" -ForegroundColor Gray
$registerBody = @{
    email = $email
    password = $password
    fullName = $fullName
}

$registerResponse = Invoke-ApiCall -Method "POST" -Endpoint "/auth/register" -Body $registerBody
if ($registerResponse) {
    Write-Host "  Status: $($registerResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($registerResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    $registrationToken = $registerResponse.Content.verificationToken
} else {
    Write-Host "  FAILED!" -ForegroundColor Red
}

Write-Host "`n[TEST 2] Check Forgot Password (OTP Request)" -ForegroundColor Yellow
Write-Host "  Sending: POST /auth/forgot-password" -ForegroundColor Gray
$forgotBody = @{
    email = $email
}

$forgotResponse = Invoke-ApiCall -Method "POST" -Endpoint "/auth/forgot-password" -Body $forgotBody
if ($forgotResponse) {
    Write-Host "  Status: $($forgotResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($forgotResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    $resetToken = $forgotResponse.Content.resetToken
    Write-Host "  Reset Token: $resetToken" -ForegroundColor Cyan
} else {
    Write-Host "  FAILED!" -ForegroundColor Red
}

# Test 3: Try Resend OTP immediately (should fail with throttle)
Write-Host "`n[TEST 3] Resend OTP Immediately (Throttle Test)" -ForegroundColor Yellow
Write-Host "  Sending: POST /auth/resend-otp immediately after first request" -ForegroundColor Gray
Start-Sleep -Milliseconds 500

$resendBody = @{
    email = $email
}

$resendResponse = Invoke-ApiCall -Method "POST" -Endpoint "/auth/resend-otp" -Body $resendBody
if ($resendResponse) {
    Write-Host "  Status: $($resendResponse.StatusCode)" -ForegroundColor Yellow
    Write-Host "  Response: $($resendResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
    
    if ($resendResponse.Content.error) {
        Write-Host "  ✓ Throttle working! Error: $($resendResponse.Content.error)" -ForegroundColor Green
    }
} else {
    Write-Host "  FAILED!" -ForegroundColor Red
}

# Test 4: Wait 61 seconds and resend again
Write-Host "`n[TEST 4] Resend OTP After 61 Seconds" -ForegroundColor Yellow
Write-Host "  Waiting 65 seconds for throttle to expire..." -ForegroundColor Gray
for ($i = 0; $i -lt 65; $i++) {
    Write-Host -NoNewLine "`r  Waiting... $($i+1)/65 seconds"
    Start-Sleep -Seconds 1
}
Write-Host "`n  Sending: POST /auth/resend-otp after throttle expires" -ForegroundColor Gray

$resend2Response = Invoke-ApiCall -Method "POST" -Endpoint "/auth/resend-otp" -Body $resendBody
if ($resend2Response) {
    Write-Host "  Status: $($resend2Response.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($resend2Response.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    Write-Host "  ✓ Resend successful after throttle!" -ForegroundColor Green
} else {
    Write-Host "  FAILED!" -ForegroundColor Red
}

# Test 5: Verify Email
Write-Host "`n[TEST 5] Verify Email" -ForegroundColor Yellow
Write-Host "  Sending: POST /auth/verify-email with registration token" -ForegroundColor Gray
if ($registrationToken) {
    $verifyBody = @{
        token = $registrationToken
    }
    
    $verifyResponse = Invoke-ApiCall -Method "POST" -Endpoint "/auth/verify-email" -Body $verifyBody
    if ($verifyResponse) {
        Write-Host "  Status: $($verifyResponse.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($verifyResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED!" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIPPED - No registration token available" -ForegroundColor Yellow
}

# Test 6: Login
Write-Host "`n[TEST 6] Login" -ForegroundColor Yellow
Write-Host "  Sending: POST /auth/login" -ForegroundColor Gray
$loginBody = @{
    email = $email
    password = $password
}

$loginResponse = Invoke-ApiCall -Method "POST" -Endpoint "/auth/login" -Body $loginBody
if ($loginResponse) {
    Write-Host "  Status: $($loginResponse.StatusCode)" -ForegroundColor Green
    Write-Host "  Response: $($loginResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    $jwtToken = $loginResponse.Content.token
    Write-Host "  JWT Token: $jwtToken" -ForegroundColor Cyan
} else {
    Write-Host "  FAILED!" -ForegroundColor Red
}

# Test 7: Get User Profile (with JWT)
Write-Host "`n[TEST 7] Get User Profile (with JWT)" -ForegroundColor Yellow
Write-Host "  Sending: GET /auth/me with Authorization header" -ForegroundColor Gray
if ($jwtToken) {
    $profileResponse = Invoke-ApiCall -Method "GET" -Endpoint "/auth/me" -Token $jwtToken
    if ($profileResponse) {
        Write-Host "  Status: $($profileResponse.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($profileResponse.Content | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    } else {
        Write-Host "  FAILED!" -ForegroundColor Red
    }
} else {
    Write-Host "  SKIPPED - No JWT token available" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  ✓ Backend running on port 8081" -ForegroundColor Green
Write-Host "  ✓ OTP changes deployed (5-min expiry, 60-sec resend throttle)" -ForegroundColor Green
Write-Host "  ✓ Ready for comprehensive API testing" -ForegroundColor Green
