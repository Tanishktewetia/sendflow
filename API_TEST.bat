@echo off
REM Java Mailer API Test Script
REM Tests registration, OTP, and authentication flow

setlocal enabledelayedexpansion

set baseUrl=http://localhost:8081/api
set email=tanishktewetia@gmail.com
set password=Enzsr8ha3f@
set fullName=Tanishk Tewetia

echo.
echo ========================================
echo Java Mailer API Testing
echo ========================================
echo.

REM Test 1: Register User
echo [TEST 1] Register User
echo   Sending: POST /auth/register
powershell -NoProfile -Command "^
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12; ^
  \$body = @{ email='tanishktewetia@gmail.com'; password='Enzsr8ha3f@'; fullName='Tanishk Tewetia' } | ConvertTo-Json; ^
  \$response = Invoke-WebRequest -Uri 'http://localhost:8081/api/auth/register' -Method POST -ContentType 'application/json' -Body \$body -ErrorAction SilentlyContinue; ^
  \$response.Content
"

echo.
echo [TEST 2] Forgot Password (OTP Request)
echo   Sending: POST /auth/forgot-password
powershell -NoProfile -Command "^
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12; ^
  \$body = @{ email='tanishktewetia@gmail.com' } | ConvertTo-Json; ^
  \$response = Invoke-WebRequest -Uri 'http://localhost:8081/api/auth/forgot-password' -Method POST -ContentType 'application/json' -Body \$body -ErrorAction SilentlyContinue; ^
  \$response.Content
"

echo.
echo [TEST 3] Resend OTP (should be throttled)
echo   Waiting 1 second...
timeout /t 1 /nobreak

powershell -NoProfile -Command "^
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12; ^
  \$body = @{ email='tanishktewetia@gmail.com' } | ConvertTo-Json; ^
  \$response = Invoke-WebRequest -Uri 'http://localhost:8081/api/auth/resend-otp' -Method POST -ContentType 'application/json' -Body \$body -ErrorAction SilentlyContinue; ^
  \$response.Content
"

echo.
echo ========================================
echo Testing Complete!
echo ========================================
echo.
