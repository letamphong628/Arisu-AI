@echo off
chcp 65001 >nul
title Tendou Arisu AI - Kali Linux Terminal [Offline Engine]
cd /d "%~dp0"

:: Dọn dẹp tiến trình cũ nếu còn sót lại trên cổng 7860 / 7861
taskkill /F /IM llama-server.exe /T >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7860" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

echo ==============================================================
echo    TENDOU ARISU AI
echo    Dang khoi dong Web ^& Loi AI (gemma-2-2b-it-Q4_K_M.gguf)...
echo    Go lenh "exit" trong Terminal Web de tat AI va dong cua so nay.
echo ==============================================================

:: Mo trinh duyet o che do App doc lap sau 1.5 giay
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 1400; $url='http://127.0.0.1:7860'; $edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'; $edge64='C:\Program Files\Microsoft\Edge\Application\msedge.exe'; $chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'; if (Test-Path $edge) { Start-Process $edge -ArgumentList \"--app=$url --window-size=1180,780\" } elseif (Test-Path $edge64) { Start-Process $edge64 -ArgumentList \"--app=$url --window-size=1180,780\" } elseif (Test-Path $chrome) { Start-Process $chrome -ArgumentList \"--app=$url --window-size=1180,780\" } else { Start-Process $url }"

:: Chay Server AI (Khi go exit tren Web, tien trinh nay se tu dong ket thuc va dong luon .bat)
node "%~dp0server.js"

:: Dam bao tat sach llama-server neu con chay ngam va thoat .bat
taskkill /F /IM llama-server.exe /T >nul 2>&1
exit
