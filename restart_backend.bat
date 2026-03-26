@echo off
REM Kill any existing java processes
FOR /F %%A IN ('jps -l ^| findstr java-mailer') DO (
    echo Killing process %%A
    taskkill /PID %%A /F >nul 2>&1
)

REM Alternative - kill all java processes if jps doesn't work
taskkill /IM java.exe /F 2>nul

REM Wait for process to fully terminate
timeout /t 3 /nobreak

REM Clean and rebuild
echo.
echo Rebuilding backend with updated configuration...
cd /d C:\Users\tanis\Desktop\Java_mailer\backend
mvn clean package -DskipTests

REM Check if build was successful
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Build successful!
    echo ========================================
    echo.
    echo Starting backend server on port 8081...
    echo Configuration: Resend email provider
    echo Test mode: Can send emails to tanishktewetia@gmail.com
    echo.
    mvn exec:java -Dexec.mainClass=com.javamailer.JavaMailerApplication
) else (
    echo.
    echo ========================================
    echo ✗ Build failed! 
    echo ========================================
    echo Check the error messages above.
    pause
)
