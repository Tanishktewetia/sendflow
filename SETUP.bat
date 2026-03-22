@echo off
REM ==========================================
REM Java Mailer - Setup Script
REM ==========================================
REM This script helps set up Maven and dependencies

REM Check Java version
echo Checking Java installation...
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java 17+ from https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b 1
)

echo ✓ Java is installed

REM Check Maven version
echo.
echo Checking Maven installation...
mvn -version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Maven is not installed or not in PATH
    echo.
    echo To install Maven:
    echo 1. Download from: https://maven.apache.org/download.cgi
    echo 2. Extract to a folder (e.g., C:\apache-maven-3.9.0)
    echo 3. Add to PATH:
    echo    - Right-click "This PC" ^> Properties
    echo    - Advanced system settings ^> Environment Variables
    echo    - Add MAVEN_HOME = C:\apache-maven-3.9.0
    echo    - Add to PATH: %%MAVEN_HOME%%\bin
    echo 4. Restart terminal and run this script again
    echo.
    pause
    exit /b 1
)

echo ✓ Maven is installed

REM Navigate to backend and compile
echo.
echo ==========================================
echo Building backend project...
echo ==========================================
cd /d "%~dp0backend"

mvn clean install -q

if errorlevel 1 (
    echo.
    echo ERROR: Build failed. Check output above.
    pause
    exit /b 1
)

echo.
echo ✓ Backend compiled successfully!
echo.

REM Display next steps
echo ==========================================
echo SETUP COMPLETE!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Configure SMTP Settings:
echo    Edit: backend\src\main\resources\application.properties
echo    Set your email credentials
echo.
echo 2. Start Backend Server:
echo    Run: mvn spring-boot:run
echo    (from java_mailer\backend directory)
echo.
echo 3. Start Frontend:
echo    Open: frontend\index.html in your browser
echo    OR run: python -m http.server 3000
echo.
echo Backend URL: http://localhost:8080/api
echo.

pause
