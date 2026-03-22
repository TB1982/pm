#!/bin/bash

# Mac Screenshot Tool - Development Environment Setup
# Run this once on a fresh Mac to get everything ready.

set -e

echo ""
echo "======================================"
echo "  Screenshot Tool - 環境建置"
echo "======================================"
echo ""

# Step 1: Homebrew
echo "[1/3] 檢查 Homebrew..."
if ! command -v brew &> /dev/null; then
  echo "      -> 安裝 Homebrew（需要輸入 Mac 密碼）"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Apple Silicon Mac needs to add brew to PATH
  if [[ $(uname -m) == 'arm64' ]]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
else
  echo "      -> 已安裝 ($(brew --version | head -1))"
fi

# Step 2: Node.js
echo ""
echo "[2/3] 檢查 Node.js..."
if ! command -v node &> /dev/null; then
  echo "      -> 安裝 Node.js..."
  brew install node
else
  echo "      -> 已安裝 ($(node -v))"
fi

# Step 3: npm install
echo ""
echo "[3/3] 安裝專案套件..."
npm install

echo ""
echo "======================================"
echo "  完成！"
echo "======================================"
echo ""
echo "  執行以下指令啟動 App："
echo ""
echo "    npm start"
echo ""
