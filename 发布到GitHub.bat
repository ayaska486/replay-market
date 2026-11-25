@echo off
chcp 65001 >nul
title 重演 · 同步到 GitHub
cd /d "D:\ds workplace\stock-sim"
echo 正在提交网站文件...
git add index.html style.css app.js data.js update_market.py build_standalone.py assets .github README-GitHub.md .gitignore
git commit -m "Update replay market site"
if errorlevel 1 (
  echo 没有需要提交的修改。
  pause
  exit /b 0
)
echo 正在同步远程行情提交...
git pull --rebase origin main
if errorlevel 1 (
  echo 同步远程失败，请检查网络/代理或手动处理冲突。
  pause
  exit /b 1
)
echo 正在推送到 GitHub...
git push
if errorlevel 1 (
  echo 推送失败，请检查网络/代理。
  pause
  exit /b 1
)
echo.
echo 已推送。GitHub Actions 会自动抓取行情并重新部署 Pages。
pause
