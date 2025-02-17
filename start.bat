@echo off
echo 正在启动 OKX 提现工具...

:: 检查是否安装了 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未安装 Node.js
    echo 请访问 https://nodejs.org/ 下载并安装 Node.js
    pause
    exit /b
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 首次运行，正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 安装依赖失败，请检查网络连接
        pause
        exit /b
    )
)

:: 启动应用
echo 正在启动应用...
npm start

pause 