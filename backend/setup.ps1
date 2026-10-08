# One-time local setup for Windows (PowerShell).
# Run from the backend folder:   .\setup.ps1
# If scripts are blocked, run once: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment in .venv ..." -ForegroundColor Cyan
    python -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $secret = & .\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(50))"
    (Get-Content ".env") -replace "^DJANGO_SECRET_KEY=.*", "DJANGO_SECRET_KEY=$secret" | Set-Content ".env"
    Write-Host "Created .env with a fresh secret key." -ForegroundColor Green
}

& .\.venv\Scripts\python.exe manage.py migrate
& .\.venv\Scripts\python.exe manage.py seed_platform

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  .venv\Scripts\activate"
Write-Host "  python manage.py createsuperuser"
Write-Host "  python manage.py runserver"
