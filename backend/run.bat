@echo off
REM Start SendFlow Backend Server

echo Building backend...
call mvn compile -q -DskipTests

echo.
echo ========================================
echo Starting SendFlow Backend Server
echo ========================================
echo Server will start on: http://localhost:8080/api
echo Health check: http://localhost:8080/api/health
echo.

REM Run using Java with classpath
setlocal enabledelayedexpansion

REM Try to find Java
for /f "tokens=*" %%A in ('where java 2^>nul') do (
    if exist "%%A" (
        set JAVA_CMD=%%A
        goto found_java
    )
)

echo Java not found. Please make sure Java 17+ is installed.
pause
exit /b 1

:found_java
echo Using Java at: %JAVA_CMD%
echo.

REM Build classpath from libraries
set CLASSPATH=target\classes
for /r "..\mvn_dependency_path" %%F in (*.jar) do (
    set CLASSPATH=!CLASSPATH!;%%F
)

REM Run the application
%JAVA_CMD% -cp target\classes com.javamailer.JavaMailerApplication

pause
