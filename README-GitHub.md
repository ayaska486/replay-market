# GitHub 每日行情自动更新

这个目录已经准备好 GitHub Actions + GitHub Pages 的工作流。

## 一次性设置

1. 新建一个 GitHub 仓库（免费公开仓库即可）。
2. 把 `stock-sim` 目录里的这些内容上传到仓库根目录：
   - `index.html`
   - `style.css`
   - `app.js`
   - `data.js`
   - `update_market.py`
   - `build_standalone.py`
   - `assets/`
   - `.github/`
3. 打开仓库 **Settings → Pages**，把 **Build and deployment → Source** 设为 **GitHub Actions**。
4. 打开仓库 **Actions → Update market data → Run workflow** 手动跑一次。
5. 部署完成后，页面地址是：

   `https://<你的GitHub用户名>.github.io/<仓库名>/`

## 自动更新时间

工作流使用 UTC cron：

```yaml
- cron: "10 0,9 * * *"
```

对应北京时间每天约 **08:10 / 17:10**。GitHub 的 cron 不是精确的，可能会延迟几分钟到几十分钟。

## 重要限制

- 这不是“实时行情”，而是**定时重建静态页面**；GitHub Pages 不能跑 WebSocket 或常驻后端。
- GitHub Actions 的定时任务不能保证秒级/分钟级准确。
- 每次运行都会重新抓取数据并部署；GitHub 公共仓库免费，但会有运行时间限制。
- 数据源：东方财富、Naver、Sina、腾讯行情。
- 私有公司和没有公开日线的数据仍是教学模拟：
  - OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方量化 / 字节跳动
  - ETH / SpaceX
  - 33 项显卡内存
- GitHub Actions 服务器的网络出口可能和本机不同；如果某个源被限制，工作流会失败，页面保持上一次成功版本。

## 本地运行（Windows）

`update_market.py` 在本机运行时还会写回原来的微信文件夹 `index.html`；在 GitHub Actions 中通过 `REPLAY_CI=1` 自动跳过 Windows 路径。

## 定时任务保活

工作流每次会更新 `last_run.txt` 并提交一次，避免 GitHub 在仓库 60 天无活动后停掉定时任务。若不需要该行为，可以删除 `Keep scheduled workflow active` 步骤。
