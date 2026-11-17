#!/usr/bin/env bash
# ==============================================================================
# TENDOU ARISU AI - KALI LINUX TERMINAL (LINUX & MACOS LAUNCHER)
# Hỗ trợ: Kali Linux, Ubuntu, Debian, Arch, Fedora, macOS (Intel & Apple Silicon)
# ==============================================================================

cd "$(dirname "$0")" || exit 1
mkdir -p ./bin ./notes

# Dọn dẹp tiến trình cũ nếu còn chạy trên cổng 7860 / 7861
pkill -f "llama-server.*7861" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k 7860/tcp 2>/dev/null || true
elif command -v lsof >/dev/null 2>&1; then
  PID_OLD=$(lsof -ti:7860 2>/dev/null)
  [ -n "$PID_OLD" ] && kill -9 $PID_OLD 2>/dev/null || true
fi

OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"

echo "=============================================================="
echo "   ㉿ TENDOU ARISU AI - KALI LINUX TERMINAL (v4.0 AGENT OS)   "
echo "   Hệ điều hành: $OS_NAME ($ARCH_NAME)                        "
echo "   Gõ lệnh 'exit' trong Terminal Web để tắt AI và thoát.      "
echo "=============================================================="

# Kiểm tra Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "[LỖI] Chưa cài đặt Node.js! Vui lòng cài đặt nodejs (ví dụ: sudo apt install nodejs) rồi chạy lại."
  exit 1
fi

# Tự động tải lõi llama-server cho Linux / macOS nếu chưa có trong ./bin/
if [ ! -f "./bin/llama-server" ] && ! command -v llama-server >/dev/null 2>&1; then
  echo "[ARISU-AI] Đang kiểm tra lõi GGUF bản địa cho $OS_NAME ($ARCH_NAME)..."
  DL_URL=""
  if [ "$OS_NAME" = "Linux" ] && [ "$ARCH_NAME" = "x86_64" ]; then
    DL_URL="https://github.com/ggml-org/llama.cpp/releases/download/b12383/llama-b12383-bin-ubuntu-x64.zip"
  elif [ "$OS_NAME" = "Darwin" ] && [ "$ARCH_NAME" = "arm64" ]; then
    DL_URL="https://github.com/ggml-org/llama.cpp/releases/download/b12383/llama-b12383-bin-macos-arm64.zip"
  elif [ "$OS_NAME" = "Darwin" ]; then
    DL_URL="https://github.com/ggml-org/llama.cpp/releases/download/b12383/llama-b12383-bin-macos-x64.zip"
  fi

  if [ -n "$DL_URL" ] && command -v curl >/dev/null 2>&1 && command -v unzip >/dev/null 2>&1; then
    echo "[ARISU-AI] Đang tải llama-server cho $OS_NAME..."
    if curl -L -f -s -o ./bin/llama-os.zip "$DL_URL"; then
      unzip -q -o ./bin/llama-os.zip -d ./bin/
      # Nếu giải nén ra thư mục con build/bin thì đưa ra ngoài ./bin/
      find ./bin -name "llama-server" -type f -exec cp {} ./bin/llama-server \; 2>/dev/null || true
      find ./bin -name "*.so*" -type f -exec cp {} ./bin/ \; 2>/dev/null || true
      find ./bin -name "*.dylib*" -type f -exec cp {} ./bin/ \; 2>/dev/null || true
      rm -f ./bin/llama-os.zip
    fi
  fi
fi

if [ -f "./bin/llama-server" ]; then
  chmod +x ./bin/llama-server 2>/dev/null || true
  export LD_LIBRARY_PATH="$(pwd)/bin:${LD_LIBRARY_PATH:-}"
  export DYLD_LIBRARY_PATH="$(pwd)/bin:${DYLD_LIBRARY_PATH:-}"
fi

# Mở trình duyệt ở chế độ App độc lập sau 1.4 giây
(
  sleep 1.4
  URL="http://127.0.0.1:7860"
  if [ "$OS_NAME" = "Darwin" ]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
      open -n -a "Google Chrome" --args --app="$URL" --window-size=1240,820
    elif [ -d "/Applications/Brave Browser.app" ]; then
      open -n -a "Brave Browser" --args --app="$URL" --window-size=1240,820
    else
      open "$URL"
    fi
  else
    if command -v chromium >/dev/null 2>&1; then
      chromium --app="$URL" --window-size=1240,820 >/dev/null 2>&1 &
    elif command -v chromium-browser >/dev/null 2>&1; then
      chromium-browser --app="$URL" --window-size=1240,820 >/dev/null 2>&1 &
    elif command -v google-chrome >/dev/null 2>&1; then
      google-chrome --app="$URL" --window-size=1240,820 >/dev/null 2>&1 &
    elif command -v brave-browser >/dev/null 2>&1; then
      brave-browser --app="$URL" --window-size=1240,820 >/dev/null 2>&1 &
    elif command -v microsoft-edge >/dev/null 2>&1; then
      microsoft-edge --app="$URL" --window-size=1240,820 >/dev/null 2>&1 &
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$URL" >/dev/null 2>&1 &
    fi
  fi
) &

# Chạy Server AI (Khi gõ exit trên Web, tiến trình này sẽ tự động kết thúc và đóng luôn script .sh)
node "./server.js"

# Đảm bảo tắt sạch llama-server khi thoát
pkill -f "llama-server.*7861" 2>/dev/null || true
exit 0
