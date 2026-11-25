# -*- coding: utf-8 -*-
"""Daily local market updater for 重演.

Supported with real daily bars (Eastmoney):
  A-shares, US AI stocks, EURUSD / USDJPY / USDCAD / CADJPY.

Everything else (crypto, gold, Samsung/SK Hynix, SpaceX, hardware price indices)
stays as clearly-labelled teaching simulation.

The script rewrites data.js, rebuilds the standalone page, then copies it to the
installed WeChat path and the workspace copy. It is safe to run repeatedly.
"""
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import ssl

BASE = os.path.dirname(os.path.abspath(__file__))
CI = os.environ.get("REPLAY_CI") == "1" or os.environ.get("GITHUB_ACTIONS") == "true"
DATA = os.path.join(BASE, "data.js")
BUILD = os.path.join(BASE, "build_standalone.py")
STANDALONE = os.path.join(BASE, "index.standalone.html")
LOG = os.path.join(BASE, "update_log.txt")
TARGET = r"C:\Users\昴\Documents\xwechat_files\wxid_a96518o2kgzj22_daf4\msg\file\2026-11\index.html"
COPY = r"D:\ds workplace\重演-无限杠杆版.html"

SECIDS = {
    # A shares
    "600519": "1.600519", "300750": "0.300750", "002594": "0.002594",
    "601318": "1.601318", "600036": "1.600036", "300059": "0.300059",
    "688981": "1.688981",
    # US AI leaders (real Eastmoney data)
    "NVDA": "105.NVDA", "INTC": "105.INTC", "AMD": "105.AMD",
    "GOOGL": "105.GOOGL", "MSFT": "105.MSFT", "TSM": "106.TSM", "AVGO": "105.AVGO",
    # FX
    "EURUSD": "119.EURUSD", "USDJPY": "119.USDJPY",
    "USDCAD": "119.USDCAD", "CADJPY": "119.CADJPY",
}

# Korean AI names: Naver Finance daily OHLCV.
NAVER = {"005930": "005930", "000660": "000660"}
# Global futures / crypto daily OHLCV from Sina.
SINA = {"BTCUSD": "BTC", "XAUUSD": "XAU"}
# Hong Kong-listed AI / internet names: Tencent daily K-line.
TENCENT_HK = {"00700": "hk00700", "09988": "hk09988"}
# Eastmoney fallbacks for A-shares and US stocks (Tencent daily K-line).
TENCENT_STOCK = {
    "600519": "sh600519", "300750": "sz300750", "002594": "sz002594",
    "601318": "sh601318", "600036": "sh600036", "300059": "sz300059",
    "688981": "sh688981",
    "NVDA": "usNVDA", "INTC": "usINTC", "AMD": "usAMD",
    "GOOGL": "usGOOGL", "MSFT": "usMSFT", "TSM": "usTSM", "AVGO": "usAVGO",
}
FX_CODES = ("EURUSD", "USDJPY", "USDCAD", "CADJPY")
US_CODES = ("NVDA", "INTC", "AMD", "GOOGL", "MSFT", "TSM", "AVGO")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def log(message):
    line = f"[{dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}"
    print(line, flush=True)
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def fetch_klines(secid, digits, retries=3):
    end = (dt.date.today() + dt.timedelta(days=1)).strftime("%Y%m%d")
    url = (
        "https://push2his.eastmoney.com/api/qt/stock/kline/get"
        f"?secid={secid}&fields1=f1,f2,f3&fields2=f51,f52,f53,f54,f55,f56"
        f"&klt=101&fqt=1&beg=20210101&end={end}&lmt=1000000"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Referer": "https://quote.eastmoney.com/",
        "Accept": "application/json,text/plain,*/*",
    }
    last_error = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            data = payload.get("data") or {}
            raw = data.get("klines") or []
            if len(raw) < 100:
                raise RuntimeError(f"only {len(raw)} bars")
            bars = []
            for line in raw:
                parts = line.split(",")
                if len(parts) < 6:
                    continue
                bars.append([
                    parts[0],
                    round(float(parts[1]), digits),
                    round(float(parts[2]), digits),
                    round(float(parts[3]), digits),
                    round(float(parts[4]), digits),
                    int(float(parts[5] or 0)),
                ])
            if bars and bars[-1][0] < "2026-11-14":
                log(f"WARN {secid}: latest bar is {bars[-1][0]}")
            return bars
        except Exception as exc:  # noqa: BLE001 - network errors are expected
            last_error = exc
            if attempt < retries - 1:
                time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(str(last_error))


def fetch_naver(symbol, start="20210101"):
    end = dt.date.today().strftime("%Y%m%d")
    url = (
        "https://api.finance.naver.com/siseJson.naver"
        f"?symbol={symbol}&requestType=1&startTime={start}&endTime={end}&timeframe=day"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Referer": f"https://finance.naver.com/item/main.naver?code={symbol}",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    rows = re.findall(
        r'\["(\d{8})",\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)',
        text,
    )
    bars = []
    for day, op, hi, lo, close, volume in rows:
        date = f"{day[:4]}-{day[4:6]}-{day[6:]}"
        if date < "2021-01-01":
            continue
        bars.append([date, round(float(op), 0), round(float(close), 0),
                     round(float(hi), 0), round(float(lo), 0), int(float(volume))])
    if len(bars) < 100:
        raise RuntimeError(f"Naver only returned {len(bars)} bars")
    return bars


def fetch_sina(symbol, digits=2):
    url = (
        "https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20x=/"
        f"GlobalFuturesService.getGlobalFuturesDailyKLine?symbol={symbol}"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Referer": "https://finance.sina.com.cn/",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    left = text.find("[")
    right = text.rfind("]")
    if left < 0 or right <= left:
        raise RuntimeError("Sina returned no dataset")
    raw = json.loads(text[left:right + 1])
    bars = []
    for item in raw:
        date = item.get("date", "")
        if not date or date < "2021-01-01":
            continue
        bars.append([
            date,
            round(float(item["open"]), digits),
            round(float(item["close"]), digits),
            round(float(item["high"]), digits),
            round(float(item["low"]), digits),
            int(float(item.get("volume") or 0)),
        ])
    if len(bars) < 100:
        raise RuntimeError(f"Sina only returned {len(bars)} bars")
    return bars


def fetch_tencent_hk(symbol):
    url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={symbol},day,,,1500,qfq"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Referer": "https://gu.qq.com/",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    node = (payload.get("data") or {}).get(symbol) or {}
    rows = node.get("day") or node.get("qfqday") or []
    bars = []
    for row in rows:
        if len(row) < 6:
            continue
        date = row[0]
        if date < "2021-01-01":
            continue
        bars.append([
            date,
            round(float(row[1]), 2),
            round(float(row[2]), 2),
            round(float(row[3]), 2),
            round(float(row[4]), 2),
            int(float(row[5] or 0)),
        ])
    if len(bars) < 100:
        raise RuntimeError(f"Tencent HK only returned {len(bars)} bars")
    return bars


def fetch_tencent_stock(symbol):
    if symbol.startswith("us"):
        url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={symbol},day,,,1500,qfq"
    else:
        url = f"https://web.ifzq.gtimg.cn/appstock/app/kline/kline?param={symbol},day,,,1500"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "Referer": "https://gu.qq.com/",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    node = (payload.get("data") or {}).get(symbol) or {}
    rows = node.get("day") or node.get("qfqday") or []
    bars = []
    for row in rows:
        if len(row) < 6 or row[0] < "2021-01-01":
            continue
        bars.append([
            row[0],
            round(float(row[1]), 2), round(float(row[2]), 2),
            round(float(row[3]), 2), round(float(row[4]), 2),
            int(float(row[5] or 0)),
        ])
    # Tencent's US endpoint often only exposes the latest daily bar; that is
    # enough to append today's close to an already populated history.
    if len(bars) < 100 and not symbol.startswith("us"):
        raise RuntimeError(f"Tencent fallback only returned {len(bars)} bars")
    if not bars:
        raise RuntimeError("Tencent fallback returned no bars")
    return bars


def fetch_frankfurter():
    url = (
        "https://api.frankfurter.app/2021-01-01.."
        f"{dt.date.today().isoformat()}?from=EUR&to=USD,JPY,CAD"
    )
    req = urllib.request.Request(url, headers={"User-Agent": "replay-market/1.0"})
    with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    rates = payload.get("rates") or {}
    if len(rates) < 100:
        raise RuntimeError(f"Frankfurter only returned {len(rates)} days")
    return rates


def fx_bars_from_rates(rates, code, digits):
    bars = []
    for date in sorted(rates):
        rate = rates[date]
        usd, jpy, cad = rate.get("USD"), rate.get("JPY"), rate.get("CAD")
        if not usd or not jpy or not cad:
            continue
        value = {
            "EURUSD": usd,
            "USDJPY": jpy / usd,
            "USDCAD": cad / usd,
            "CADJPY": jpy / cad,
        }[code]
        px = round(float(value), int(digits))
        bars.append([date, px, px, px, px, 0])
    if len(bars) < 100:
        raise RuntimeError(f"Frankfurter {code} only returned {len(bars)} bars")
    return bars


def load_payload():
    with open(DATA, encoding="utf-8") as f:
        text = f.read()
    prefix = "window.REPLAY_MARKET = "
    start = text.index(prefix) + len(prefix)
    end = text.rindex(";")
    return json.loads(text[start:end])


def atomic_copy(src, dst):
    """Replace the page atomically so a browser never reads a half-written file."""
    folder = os.path.dirname(dst)
    os.makedirs(folder, exist_ok=True)
    tmp = dst + ".updating"
    shutil.copy2(src, tmp)
    os.replace(tmp, dst)


def save_payload(payload):
    with open(DATA, "w", encoding="utf-8") as f:
        f.write("/* 2021-2023 真实历史 + 每日更新真实行情 + 教学模拟数据。 */\n")
        f.write("window.REPLAY_MARKET = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")


def main():
    log("=== daily market update start ===")
    payload = load_payload()
    stocks = {s["code"]: s for s in payload["stocks"]}
    ok = 0
    failed = []
    for code, secid in SECIDS.items():
        stock = stocks.get(code)
        if not stock:
            failed.append(code)
            log(f"SKIP {code}: not in data")
            continue
        try:
            bars = fetch_klines(secid, int(stock.get("digits", 2)))
            if not bars:
                raise RuntimeError("empty result")
            old_last = stock["bars"][-1][0] if stock.get("bars") else "-"
            stock["bars"] = bars
            stock["real"] = True
            stock["source"] = "东方财富"
            for key in ("simulated", "simulatedFrom", "dataNote"):
                stock.pop(key, None)
            ok += 1
            log(f"OK {code}: {old_last} -> {bars[-1][0]} ({len(bars)} bars)")
            time.sleep(0.18)
        except Exception as exc:  # noqa: BLE001
            failed.append(code)
            log(f"FAIL {code}: {exc}")

    # Eastmoney can be rate-limited. Use Tencent for A/US and Frankfurter for FX.
    fallback_failed = list(failed)
    fx_rates = None
    for code in fallback_failed:
        stock = stocks.get(code)
        if not stock:
            continue
        try:
            if code in TENCENT_STOCK:
                bars = fetch_tencent_stock(TENCENT_STOCK[code])
                if code in US_CODES and len(bars) < 100:
                    latest = bars[-1]
                    last = stock["bars"][-1]
                    if latest[0] > last[0]:
                        stock["bars"].append(latest)
                    elif latest[0] == last[0]:
                        stock["bars"][-1] = latest
                    else:
                        raise RuntimeError(f"Tencent US latest is older: {latest[0]}")
                else:
                    stock["bars"] = bars
                stock["real"] = True
                stock["source"] = "腾讯行情（备用）"
                for key in ("simulated", "simulatedFrom", "dataNote"):
                    stock.pop(key, None)
                if code in failed:
                    failed.remove(code)
                ok += 1
                log(f"OK {code}: fallback Tencent {bars[-1][0]} ({len(bars)} bars)")
                time.sleep(0.2)
            elif code in FX_CODES:
                if fx_rates is None:
                    fx_rates = fetch_frankfurter()
                bars = fx_bars_from_rates(fx_rates, code, int(stock.get("digits", 4)))
                stock["bars"] = bars
                stock["real"] = True
                stock["source"] = "Frankfurter（备用）"
                for key in ("simulated", "simulatedFrom", "dataNote"):
                    stock.pop(key, None)
                if code in failed:
                    failed.remove(code)
                ok += 1
                log(f"OK {code}: fallback Frankfurter {bars[-1][0]} ({len(bars)} bars)")
        except Exception as exc:  # noqa: BLE001
            log(f"FAIL {code} fallback: {exc}")

    for code, symbol in NAVER.items():
        stock = stocks.get(code)
        if not stock:
            failed.append(code)
            log(f"SKIP {code}: not in data")
            continue
        try:
            bars = fetch_naver(symbol)
            old_last = stock["bars"][-1][0] if stock.get("bars") else "-"
            stock["bars"] = bars
            stock["real"] = True
            stock["source"] = "Naver Finance"
            for key in ("simulated", "simulatedFrom", "dataNote"):
                stock.pop(key, None)
            ok += 1
            log(f"OK {code}: {old_last} -> {bars[-1][0]} ({len(bars)} bars, Naver)")
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            failed.append(code)
            log(f"FAIL {code}: {exc}")

    for code, symbol in SINA.items():
        stock = stocks.get(code)
        if not stock:
            failed.append(code)
            log(f"SKIP {code}: not in data")
            continue
        try:
            bars = fetch_sina(symbol, int(stock.get("digits", 2)))
            old_last = stock["bars"][-1][0] if stock.get("bars") else "-"
            stock["bars"] = bars
            stock["real"] = True
            stock["source"] = "新浪财经"
            for key in ("simulated", "simulatedFrom", "dataNote"):
                stock.pop(key, None)
            ok += 1
            log(f"OK {code}: {old_last} -> {bars[-1][0]} ({len(bars)} bars, Sina)")
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            failed.append(code)
            log(f"FAIL {code}: {exc}")

    for code, symbol in TENCENT_HK.items():
        stock = stocks.get(code)
        if not stock:
            failed.append(code)
            log(f"SKIP {code}: not in data")
            continue
        try:
            bars = fetch_tencent_hk(symbol)
            old_last = stock["bars"][-1][0] if stock.get("bars") else "-"
            stock["bars"] = bars
            stock["real"] = True
            stock["source"] = "腾讯行情"
            for key in ("simulated", "simulatedFrom", "dataNote"):
                stock.pop(key, None)
            ok += 1
            log(f"OK {code}: {old_last} -> {bars[-1][0]} ({len(bars)} bars, Tencent HK)")
            time.sleep(0.2)
        except Exception as exc:  # noqa: BLE001
            failed.append(code)
            log(f"FAIL {code}: {exc}")

    if not ok:
        log("No market data updated. Keeping existing data.")
        return 1

    last_dates = [s["bars"][-1][0] for s in payload["stocks"] if s.get("bars")]
    latest = max(last_dates) if last_dates else "2026-11-13"
    payload["meta"]["range"] = f"2021-01 至 {latest}"
    payload["meta"]["lastUpdated"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    payload["meta"]["source"] = (
        "A股 / 美股 / 港股 / 主要外汇 / 三星 / SK / 黄金 / BTC：真实日线（每日自动更新）；"
        "OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方 / 字节 / ETH / SpaceX / 显卡内存：教学模拟"
    )
    payload["meta"]["dataNotice"] = (
        "A股、美股 AI 巨头、腾讯 / 阿里、主要外汇、三星电子、SK 海力士、黄金与 BTC 为真实日线，"
        "每天 08:10 与 17:10 自动更新；OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方量化 / 字节跳动 / "
        "ETH / SpaceX 与显卡内存价格指数为教学模拟。"
    )
    save_payload(payload)
    log(f"saved {DATA}, updated={ok}, failed={','.join(failed) if failed else '-'}")

    try:
        subprocess.run([sys.executable, BUILD], cwd=BASE, check=True, timeout=180)
        if CI:
            log(f"CI mode: built {STANDALONE}; skip local Windows copies")
        else:
            if os.path.exists(TARGET):
                atomic_copy(STANDALONE, TARGET)
                log(f"installed {TARGET}")
            else:
                log(f"target missing: {TARGET}")
            atomic_copy(STANDALONE, COPY)
            log(f"installed {COPY}")
    except Exception as exc:  # noqa: BLE001
        log(f"BUILD/COPY FAILED: {exc}")
        return 1
    log("=== daily market update complete ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
