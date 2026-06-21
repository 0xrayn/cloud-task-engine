# Get the absolute path of key.json relative to the script directory
$KeyPath = Join-Path $PSScriptRoot "key.json"
$ProjectID = "neon-polymer-499909-a3"

Write-Host "Starting Cloud Task Engine with real GCP Firestore using key.json..." -ForegroundColor Green

# 1. Start API Gateway (Port 3000)
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$env:GOOGLE_APPLICATION_CREDENTIALS='$KeyPath'; `$env:FIRESTORE_EMULATOR_HOST=''; `$env:PORT=3000; cd '$PSScriptRoot/services/api-gateway'; npm.cmd start" -WindowStyle Normal

# 2. Start Worker (Port 3001)
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$env:GOOGLE_APPLICATION_CREDENTIALS='$KeyPath'; `$env:FIRESTORE_EMULATOR_HOST=''; `$env:PORT=3001; cd '$PSScriptRoot/services/worker'; npm.cmd start" -WindowStyle Normal

# 3. Start Scheduler (Port 3002)
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "`$env:GOOGLE_APPLICATION_CREDENTIALS='$KeyPath'; `$env:FIRESTORE_EMULATOR_HOST=''; `$env:GCP_PROJECT='$ProjectID'; `$env:PORT=3002; `$env:WORKER_URL='http://localhost:3001'; cd '$PSScriptRoot/services/scheduler'; go run main.go" -WindowStyle Normal

Write-Host "All services are launching in separate windows!" -ForegroundColor Cyan
