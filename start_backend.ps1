# Start Backend Python
cd "C:\Users\tanis\Desktop\Java_mailer\backend"
Write-Host "Starting Java Mailer Backend..."
Write-Host "Directory: $(Get-Location)"

# Compile first
Write-Host "Compiling..."
mvn compile -q

# Run with exec
Write-Host "Starting application..."
mvn exec:java -Dexec.mainClass="com.javamailer.JavaMailerApplication"
