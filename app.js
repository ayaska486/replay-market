/* =========================================================
   重演 · REPLAY
   模拟投资决策训练 / 无限杠杆 / 强平特效
   数据：A股/美股/主要外汇为东方财富真实日线（每日更新）；其余为教学模拟
   ========================================================= */
(() => {
  'use strict';

  /* ---------------- 常量 ---------------- */
  const MARKET = window.REPLAY_MARKET;
  if (!MARKET || !Array.isArray(MARKET.stocks) || !MARKET.stocks.length) {
    document.body.innerHTML = '<div style="padding:48px;color:#fff;font:16px sans-serif">行情数据加载失败：data.js 没有正确载入。</div>';
    return;
  }
  const STOCKS = MARKET.stocks;
  const START_CAPITAL = 10000;
  const MARGIN_CALL = 1.30;
  const MAINTENANCE_LINE = MARGIN_CALL * 100;
  const FINANCING_RATE = 0.065;
  const TRADING_DAYS = 252;
  const COMMISSION_RATE = 0.00025;
  const MIN_COMMISSION = 5;
  const STAMP_DUTY = 0.0005;
  const MC_PATHS = 1000;
  const BLOCK_SIZE = 5;
  const PATH_SAMPLES = 58;
  const AUTO_BASE_MS = 1200;
  const DEFAULT_HW_QTY = 100;

  const COLORS = {
    bg: '#090d14',
    panel: '#0c111a',
    grid: 'rgba(255,255,255,0.055)',
    gridStrong: 'rgba(255,255,255,0.09)',
    text: '#e9eef7',
    soft: '#b7c1d2',
    muted: '#7f8ba0',
    dim: '#566176',
    amber: '#f7c873',
    amber2: '#ffb454',
    red: '#ff5b6e',
    red2: '#ff2e4d',
    green: '#2bd9a3',
    cyan: '#67e8f9',
    white: '#ffffff'
  };

  const LIQ_TITLES = [
    '你的保证金，刚刚完成了自由落体。',
    '系统帮你做了一个艰难的决定。',
    '这不是回调，这是结算。',
    '很遗憾，市场没有接你的电话。',
    '本次判断已被强制归档。',
    '你成功把一次判断，变成了一次事故。'
  ];
  const CHARACTERS = [
    { id: 'kurumi', icon: '久', name: '日本高中生久留美', short: '久留美', tag: '杠杆原教旨主义', tone: '#ff8fc7', line: '用奖学金加杠杆，认为止损是软弱。', quote: '“老实赚钱很枯燥吧”' },
    { id: 'amd', icon: 'A', name: 'AMD战略投资部', short: 'AMD战投', tag: '半导体基本面', tone: '#ff8e72', line: '看空英伟达，做多自己。', quote: '“算力不是只有一种答案。”' },
    { id: 'arasaka', icon: '荒', name: '荒坂三郎', short: '荒坂', tag: '企业帝国', tone: '#ff5b6e', line: '公司就是我的，市场也应该如此。', quote: '“股价？那只是权力的另一种写法。”' },
    { id: 'leather', icon: '皮', name: '皮衣侠', short: '皮衣侠', tag: '算力教主', tone: '#8ee36b', line: '发布会驱动型投资者，信仰来自显卡。', quote: '“买得越多，省得越多。”' },
    { id: 'sam', icon: 'S', name: '美国小伙山姆', short: '山姆', tag: '自由市场散户', tone: '#7aa2ff', line: '相信长期持有可以治愈一切回撤。', quote: '“Sam eats poopoo”' },
    { id: 'evergrande', icon: '恒', name: '恒大集团总裁', short: '恒大总裁', tag: '高杠杆扩张', tone: '#f7c873', line: '先借钱，再谈风险；先扩张，再谈现金流。', quote: '“朋友的韭最珍贵”' },
    { id: 'sansan', icon: '三', name: '印度小伙三三', short: '三三', tag: 'IT 外包 / 期权', tone: '#ffb86b', line: '用英语开会，用杠杆交易。', quote: '“这个需求，今天必须上线。”' },
    { id: 'xiaokang', icon: '康', name: '中国小伙小康', short: '小康', tag: '全仓生活家', tone: '#67e8f9', line: '全仓是一种生活态度，空仓是一种奢侈。', quote: '“关注异地鸡谢谢喵”' },
    { id: 'sensi', icon: '幼', name: '幼儿园讲解师sensi', short: 'sensi', tag: '温柔止损派', tone: '#c4a7ff', line: '用最温柔的声音，执行最狠的止损。', quote: '“李老师实名游玩蔚蓝档案”' },
    { id: 'zhuanzhuan', icon: '转', name: '转转眼镜女', short: '眼镜女', tag: '二手捡漏流', tone: '#9ba7ff', line: '别人恐惧我砍价，别人贪婪我挂链接。', quote: '“九五新，仅拆封，支持验货。”' },
    { id: 'laoliang', icon: '牢', name: '牢梁', short: '牢梁', tag: '情绪周期', tone: '#d9a066', line: '在每一个高点高喊牛回速归，在每一个低点装死。', quote: '“这次不一样。”' },
    { id: 'liangsheng', icon: '梁', name: '梁圣', short: '梁圣', tag: '圣杯交易员', tone: '#f7c873', line: '把每一根阳线都解释成神的旨意。', quote: '“圣杯已经给出了答案。”' },
    { id: 'xiaonanliang', icon: '难', name: '小难梁', short: '小难梁', tag: '反指小天才', tone: '#ff8e72', line: '买在山顶，卖在山脚，但从不缺席。', quote: '“我一买就跌，是市场的错。”' },
    { id: 'penguin', icon: '企', name: '企鹅人', short: '企鹅人', tag: '南极价值派', tone: '#7aa2ff', line: '在冰面上耐心等待，偶尔被海豹追。', quote: '“冷，但能拿住。”' },
    { id: 'hunter', icon: '猎', name: '猎企人', short: '猎企人', tag: '反向猎手', tone: '#ff5b6e', line: '专门猎杀企鹅人的止损。', quote: '“企鹅的止损，就是我的入场券。”' },
    { id: 'naiwa', icon: '蛙', name: '奶蛙', short: '奶蛙', tag: '奶量即仓位', tone: '#ffb6c9', line: '靠奶量扛过回撤，靠卖萌获得流动性。', quote: '“嘎嘎提拉赛”' }
  ];
  const SENSI_CHANT = '扎口'.repeat(10) + '！！';
  const SAM_LIQ_CHANT = '没钱买边边了，吃什么，';
  const NAIWA_LIQ_CHANT = '噶jio赛哦了刚把爹嘎嘎提拉赛丢一部';
  const CARNIVAL_CAPTIONS = [
    '晴天娃娃申请加班，空中飞人拒绝保险。',
    '天气预报：局部有保证金雨。',
    '空中飞人完成本局唯一的高难度动作。',
    '三只晴天娃娃集体祈祷失败，明天照旧。',
    '本次爆仓由马戏团友情赞助，观众免费入场。',
    '空中飞人：我只是路过，怎么就一起结算了？',
    '晴天娃娃：我负责晴天，你负责爆仓。'
  ];
  const LIQ_JOKES = [
    '你不是输给了市场，是输给了除法。',
    '本次爆仓由「再等等，会反弹的」独家赞助。',
    '保证金已经提出离职申请，并且获得了批准。',
    '强平通知比外卖到得还快。',
    '市场只是把你的杠杆，原样还给了你。',
    '系统提示：这不是演习，但你可以重来。',
    '别人贪婪时你恐惧，别人恐惧时你已经强平了。',
    '杠杆是放大镜，不是时光机。',
    '仓位管理的第一课：先确保自己还能上第二课。',
    '你买的是股票，市场收的是保证金。'
  ];

  /* ---------------- 小工具 ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function fmtPlain(value, digits = 0) {
    if (!Number.isFinite(Number(value))) return '—';
    return Number(value).toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function fmtMoney(value, digits = 0) {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return (n < 0 ? '-¥' : '¥') + fmtPlain(Math.abs(n), digits);
  }

  function digitsFor(stockIndex = state.stockIndex) {
    const digits = STOCKS[stockIndex] && STOCKS[stockIndex].digits;
    return Number.isFinite(digits) ? digits : 2;
  }

  function fmtPrice(value, stockIndex = state.stockIndex) {
    return fmtPlain(value, digitsFor(stockIndex));
  }

  function fmtPriceDigits(value, digits) {
    return fmtPlain(value, Number.isFinite(digits) ? digits : 2);
  }

  function unitFor(stock = currentStock()) {
    if (!stock) return '份';
    if (stock.unit) return stock.unit;
    if (stock.exchange === 'CRYPTO') return '枚';
    if (stock.exchange === 'FX') return '手';
    if (stock.exchange === 'COMEX') return '盎司';
    if (stock.exchange === 'AI-HW') return stock.sector && stock.sector.includes('内存') ? '条' : '台';
    return '股';
  }

  function fmtQty(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return fmtPlain(n, Math.abs(n - Math.round(n)) < 0.000001 ? 0 : 2);
  }

  function fmtSignedMoney(value, digits = 0) {
    if (!Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return (n >= 0 ? '+' : '') + fmtMoney(n, digits);
  }

  function fmtPct(value, digits = 2, signed = true) {
    if (!Number.isFinite(Number(value))) return '—';
    let n = Number(value);
    if (Math.abs(n) < 0.005) n = 0;
    return (signed && n > 0 ? '+' : '') + n.toFixed(digits) + '%';
  }

  function fmtLeverage(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (n >= 1000) return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    if (n >= 100) return n.toFixed(0);
    if (n >= 10) return n.toFixed(n % 1 ? 1 : 0);
    return n.toFixed(n % 1 ? 2 : 0);
  }

  function fmtVolume(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿手';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万手';
    return fmtPlain(n, 0) + '手';
  }

  function changeClass(value) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.00001) return 'flat';
    return value > 0 ? 'up' : 'down';
  }

  function safeStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (err) { return null; }
  }
  function safeStorageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (err) { /* file:// 下也可能被禁用 */ }
  }

  /* ---------------- 初始状态 ---------------- */
  let draft = makeDraft();
  let state = makeInitialState();
  const ui = { tab: 'desk', hoverIndex: null };
  let chartGeom = null;
  let chartFrame = 0;
  let toastTimer = 0;
  let pendingConfirm = null;
  let fxRaf = 0;
  let fxModalTimer = 0;
  let fxShakeTimer = 0;
  let audioCtx = null;
  let lastTickAt = 0;
  let autoTimer = 0;
  let moodTimer = 0;
  let pendingLiqInfo = null;
  let pendingLiqDemo = false;
  let pendingRole = null;
  let pendingStartCapital = START_CAPITAL;

  function makeDraft() {
    return {
      reason: '',
      expectation: '趋势延续',
      confidence: 65,
      holdingDays: 20,
      stopLoss: 12,
      marginPct: 100,
      leverage: 3,
      quantity: '',
      ack: false
    };
  }

  function chooseStart() {
    let stockIndex = Math.floor(Math.random() * STOCKS.length);
    let guard = 0;
    while (guard < 20 && STOCKS[stockIndex].bars.length < 500) {
      stockIndex = Math.floor(Math.random() * STOCKS.length);
      guard += 1;
    }
    const barCount = STOCKS[stockIndex].bars.length;
    const minStart = 48;
    const maxStart = Math.max(minStart, barCount - 76);
    const cursor = minStart + Math.floor(Math.random() * (maxStart - minStart + 1));
    return {
      stockIndex,
      cursor,
      anchorDate: STOCKS[stockIndex].bars[cursor][0]
    };
  }

  function makeInitialState(previous) {
    const start = chooseStart();
    const startingCapital = previous && Number.isFinite(previous.startingCapital) && previous.startingCapital >= 10000
      ? previous.startingCapital
      : START_CAPITAL;
    return {
      stockIndex: start.stockIndex,
      cursor: start.cursor,
      anchorDate: start.anchorDate,
      startingCapital,
      capital: startingCapital,
      cash: startingCapital,
      position: null,
      order: null,
      exitInfo: null,
      over: false,
      liquidated: false,
      closed: false,
      character: previous && previous.character ? previous.character : null,
      round: previous ? (previous.round || 1) + 1 : 1,
      maxLeverageUsed: 1,
      busy: false,
      autoRunning: false,
      autoSpeed: previous && previous.autoSpeed === 2 ? 2 : 1,
      fxPlaying: false,
      demoFx: false,
      muted: previous ? previous.muted : safeStorageGet('replay.muted') === '1',
      reducedMotion: window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
    };
  }

  /* ---------------- 数据访问 ---------------- */
  function currentStock() { return STOCKS[state.stockIndex]; }
  function currentBars() { return STOCKS[state.stockIndex].bars; }
  function currentBar() {
    const bars = currentBars();
    return bars[clamp(state.cursor, 0, bars.length - 1)];
  }
  function currentPrice() { return currentBar()[2]; }

  function alignIndex(stockIndex, dateText) {
    const bars = STOCKS[stockIndex].bars;
    if (!dateText) return 0;
    let lo = 0;
    let hi = bars.length - 1;
    let ans = bars.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bars[mid][0] >= dateText) {
        ans = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans;
  }

  function priceMoveAt(stockIndex, index) {
    const bars = STOCKS[stockIndex].bars;
    const i = clamp(index, 0, bars.length - 1);
    const close = bars[i][2];
    const prev = bars[Math.max(0, i - 1)][2];
    return {
      close,
      prev,
      diff: close - prev,
      pct: prev ? ((close - prev) / prev) * 100 : 0
    };
  }

  function displayIndexFor(stockIndex) {
    if (stockIndex === state.stockIndex) return state.cursor;
    return alignIndex(stockIndex, currentBar()[0]);
  }

  function currentDayNumber() {
    if (!state.order) return state.cursor + 1;
    return state.cursor - state.order.entryCursor + 1;
  }

  /* ---------------- 交易计划 / 实时账户 ---------------- */
  function planFromDraft(leverageRaw = draft.leverage, marginRaw = draft.marginPct) {
    const leverage = Number(leverageRaw);
    const marginPctInput = Number(marginRaw);
    const stopLoss = Number(draft.stopLoss);
    if (!Number.isFinite(leverage) || leverage < 1) return { error: '杠杆至少为 1×。' };
    const capital = state.cash;
    if (!Number.isFinite(capital) || capital <= 0) return { error: '账户里已经没有可用保证金。' };
    const price = currentPrice();
    if (!Number.isFinite(price) || price <= 0) return { error: '当前没有可用行情。' };

    const rawQty = String(draft.quantity == null ? '' : draft.quantity).trim();
    let requestedQty = null;
    let defaultQty = false;
    if (rawQty !== '') {
      requestedQty = Number(rawQty);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) return { error: '购入数量需要大于 0。' };
    } else if (currentStock().group === 'hardware') {
      requestedQty = DEFAULT_HW_QTY;
      defaultQty = true;
    }

    let margin;
    let notional;
    let shares;
    if (requestedQty !== null) {
      shares = requestedQty;
      notional = shares * price;
      if (!Number.isFinite(notional) || notional <= 0) return { error: '数量和价格超出了可计算范围。' };
      margin = notional / leverage;
    } else {
      if (!Number.isFinite(marginPctInput) || marginPctInput <= 0 || marginPctInput > 100) {
        return { error: '保证金比例需要在 1%–100% 之间，或手动填写数量。' };
      }
      margin = capital * marginPctInput / 100;
      notional = margin * leverage;
      shares = notional / price;
    }
    if (!Number.isFinite(notional) || !Number.isFinite(margin) || !Number.isFinite(shares) || notional <= 0) {
      return { error: '这个数字大得连 JavaScript 都装不下了。' };
    }
    if (margin > capital + 0.005) {
      return { error: `按这个数量需要保证金 ${fmtMoney(margin)}，超过可用资金 ${fmtMoney(capital)}。` };
    }
    if (shares <= 0) return { error: '仓位数量需要大于 0。' };

    const effectiveMarginPct = capital > 0 ? (margin / capital) * 100 : 0;
    const loan = Math.max(0, notional - margin);
    const entryFee = Math.max(MIN_COMMISSION, notional * COMMISSION_RATE);
    const cashAfter = Math.max(0, capital - margin);
    const ratio = loan > 0 ? ((cashAfter + notional) / loan) * 100 : Infinity;
    const liqPrice = loan > 0 ? Math.max(0, (MARGIN_CALL * loan - cashAfter) / shares) : 0;
    const stopPrice = Number.isFinite(stopLoss) && stopLoss > 0 ? price * (1 - stopLoss / 100) : 0;
    const immediate = loan > 0 && ratio < MAINTENANCE_LINE;
    return {
      leverage,
      marginPct: effectiveMarginPct,
      marginPctInput,
      manualQty: requestedQty !== null,
      defaultQty,
      quantity: shares,
      unit: unitFor(),
      capital,
      price,
      margin,
      notional,
      shares,
      loan,
      entryFee,
      cashAfter,
      ratio,
      liqPrice,
      stopPrice,
      immediate,
      digits: digitsFor(state.stockIndex),
      highRisk: Boolean(currentStock().highRisk),
      entryDate: currentBar()[0],
      entryCursor: state.cursor,
      stockIndex: state.stockIndex
    };
  }

  function liveMetrics() {
    if (!state.position) {
      return {
        equity: state.cash,
        pnl: state.over && state.exitInfo ? state.exitInfo.pnl : 0,
        pnlPct: state.over && state.exitInfo ? state.exitInfo.returnPct : 0,
        debt: 0,
        interest: 0,
        marketValue: 0,
        ratio: state.over && state.exitInfo ? state.exitInfo.ratio : Infinity,
        liqPrice: state.over && state.exitInfo ? state.exitInfo.liqPrice : 0,
        distance: 0
      };
    }
    const pos = state.position;
    const plan = pos.plan;
    const price = currentPrice();
    const debt = plan.loan * Math.pow(1 + FINANCING_RATE / TRADING_DAYS, pos.daysHeld);
    const marketValue = plan.shares * price;
    const assets = state.cash + marketValue;
    const equity = assets - debt - plan.entryFee;
    const ratio = debt > 0 ? (assets / debt) * 100 : Infinity;
    const liqPrice = debt > 0 ? Math.max(0, (MARGIN_CALL * debt - state.cash) / plan.shares) : 0;
    return {
      equity,
      pnl: equity - plan.capital,
      pnlPct: plan.capital ? ((equity / plan.capital) - 1) * 100 : 0,
      debt,
      interest: debt - plan.loan,
      marketValue,
      assets,
      ratio,
      liqPrice,
      distance: price > 0 ? ((liqPrice / price) - 1) * 100 : 0,
      price
    };
  }

  function validateDraft() {
    const errors = [];
    const journal = readJournal();
    if (journal.reason.length < 8) errors.push('决策理由至少写 8 个字。');
    if (!(journal.stopLoss > 0) || journal.stopLoss >= 100) errors.push('请填写 0–100% 之间的止损线。');
    if (!(journal.holdingDays >= 1 && journal.holdingDays <= 120)) errors.push('计划持有期需要在 1–120 个交易日之间。');
    if (!(journal.confidence >= 1 && journal.confidence <= 100)) errors.push('信心值需要在 1–100 之间。');
    const plan = planFromDraft();
    if (plan.error) errors.push(plan.error);
    if (!plan.error && plan.immediate && !draft.ack) errors.push('高杠杆会开仓即爆，请先勾选风险确认。');
    return { errors, plan, journal };
  }

  function readJournal() {
    return {
      reason: String(draft.reason || '').trim(),
      expectation: String(draft.expectation || ''),
      confidence: Number(draft.confidence) || 0,
      holdingDays: Number(draft.holdingDays) || 0,
      stopLoss: Number(draft.stopLoss) || 0
    };
  }

  /* ---------------- 1000 条平行时间线 ---------------- */
  function percentile(sorted, p) {
    if (!sorted.length) return 0;
    const idx = clamp(Math.floor((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
    return sorted[idx];
  }

  function runMonteCarlo(plan, stock, cursor, horizon) {
    const bars = stock.bars;
    const returnsPool = [];
    const first = Math.max(1, cursor - 500);
    for (let i = first; i <= cursor; i += 1) {
      const r = bars[i][2] / bars[i - 1][2] - 1;
      if (Number.isFinite(r)) returnsPool.push(clamp(r, -0.2, 0.2));
    }
    if (!returnsPool.length) {
      for (let i = 1; i < bars.length; i += 1) {
        const r = bars[i][2] / bars[i - 1][2] - 1;
        if (Number.isFinite(r)) returnsPool.push(clamp(r, -0.2, 0.2));
      }
    }
    const safeHorizon = clamp(Math.round(horizon), 1, 120);
    const blockCount = Math.ceil(safeHorizon / BLOCK_SIZE);
    const returns = [];
    const liqFlags = [];
    const liquidDays = [];
    const samples = [];
    const initialRatio = plan.ratio;
    const entryExitFee = Math.max(MIN_COMMISSION, plan.notional * (COMMISSION_RATE + STAMP_DUTY));

    if (plan.immediate) {
      // 真实的强平发生在开仓这一刻，所以 1000 条时间线全部是“已爆”。
      const immediateNet = plan.cashAfter + plan.notional - plan.loan - plan.entryFee - entryExitFee;
      const immediateReturn = ((Math.max(0, immediateNet) / plan.capital) - 1) * 100;
      for (let n = 0; n < MC_PATHS; n += 1) {
        returns.push(immediateReturn);
        liqFlags.push(true);
        liquidDays.push(0);
      }
      if (plan.loan > 0) samples.push({ ratios: [initialRatio], liq: true });
      const sorted = [...returns].sort((a, b) => a - b);
      return {
        horizon: safeHorizon,
        sampleDays: returnsPool.length,
        returns,
        liqFlags,
        liquidDays,
        samples,
        stats: buildMcStats(sorted, returns, liqFlags, initialRatio)
      };
    }

    for (let n = 0; n < MC_PATHS; n += 1) {
      let price = plan.price;
      let debt = plan.loan;
      let liquidated = false;
      let liqDay = 0;
      const ratioPath = plan.loan > 0 ? [initialRatio] : [];
      const pathReturns = [];
      if (returnsPool.length) {
        for (let b = 0; b < blockCount; b += 1) {
          const maxStart = Math.max(0, returnsPool.length - BLOCK_SIZE);
          const start = Math.floor(Math.random() * (maxStart + 1));
          for (let k = 0; k < BLOCK_SIZE && pathReturns.length < safeHorizon; k += 1) {
            pathReturns.push(returnsPool[Math.min(returnsPool.length - 1, start + k)]);
          }
        }
      } else {
        for (let d = 0; d < safeHorizon; d += 1) pathReturns.push(0);
      }

      for (let d = 0; d < safeHorizon; d += 1) {
        price *= 1 + pathReturns[d];
        debt *= 1 + FINANCING_RATE / TRADING_DAYS;
        const assets = plan.cashAfter + plan.shares * price;
        const ratio = debt > 0 ? (assets / debt) * 100 : Infinity;
        if (plan.loan > 0 && ratioPath.length) ratioPath.push(ratio);
        if (plan.loan > 0 && ratio < MAINTENANCE_LINE) {
          liquidated = true;
          liqDay = d + 1;
          break;
        }
      }

      const sellValue = plan.shares * price;
      const exitFee = Math.max(MIN_COMMISSION, sellValue * COMMISSION_RATE) + sellValue * STAMP_DUTY;
      const net = plan.cashAfter + sellValue - debt - plan.entryFee - exitFee;
      const finalReturn = ((Math.max(0, net) / plan.capital) - 1) * 100;
      returns.push(finalReturn);
      liqFlags.push(liquidated);
      liquidDays.push(liqDay);
      if (n < PATH_SAMPLES && plan.loan > 0) {
        samples.push({ ratios: ratioPath, liq: liquidated });
      }
    }

    const sorted = [...returns].sort((a, b) => a - b);
    return {
      horizon: safeHorizon,
      sampleDays: returnsPool.length,
      returns,
      liqFlags,
      liquidDays,
      samples,
      stats: buildMcStats(sorted, returns, liqFlags, initialRatio)
    };
  }

  function buildMcStats(sorted, returns, liqFlags, initialRatio) {
    const total = returns.length || 1;
    const liqCount = liqFlags.filter(Boolean).length;
    const lossCount = returns.filter((r) => r < 0).length;
    const winCount = returns.filter((r) => r > 0).length;
    const avg = returns.reduce((sum, r) => sum + r, 0) / total;
    const p5 = percentile(sorted, 5);
    const p10 = percentile(sorted, 10);
    const p50 = percentile(sorted, 50);
    const p90 = percentile(sorted, 90);
    const p95 = percentile(sorted, 95);
    return {
      liqCount,
      liqProb: (liqCount / total) * 100,
      lossProb: (lossCount / total) * 100,
      winProb: (winCount / total) * 100,
      median: p50,
      avg,
      p5,
      p10,
      p50,
      p90,
      p95,
      worst: sorted[0],
      best: sorted[sorted.length - 1],
      initialRatio
    };
  }

  /* ---------------- 下单 / 结算 ---------------- */
  function submitOrder() {
    if (state.position) { showToast('已经有一笔持仓，先处理它。', 'warn'); return; }
    if (state.over) { showToast('本局已结算，重新开一局吧。', 'warn'); return; }
    if (state.fxPlaying || state.busy) return;
    const check = validateDraft();
    if (check.errors.length) {
      showToast(check.errors[0], 'bad');
      playWarn();
      return;
    }
    const plan = check.plan;
    const journal = check.journal;
    const stock = currentStock();
    const cursor = state.cursor;
    const mc = runMonteCarlo(plan, stock, cursor, journal.holdingDays);
    const order = {
      stockIndex: state.stockIndex,
      stockName: stock.name,
      stockCode: stock.code,
      exchange: stock.exchange,
      digits: plan.digits,
      unit: plan.unit,
      quantity: plan.quantity,
      role: state.character,
      highRisk: plan.highRisk,
      entryDate: currentBar()[0],
      entryCursor: cursor,
      entryPrice: plan.price,
      journal,
      plan,
      mc
    };
    state.order = order;
    state.cash = plan.cashAfter;
    state.maxLeverageUsed = Math.max(state.maxLeverageUsed, plan.leverage);
    state.position = {
      plan,
      daysHeld: 0,
      maxRatio: plan.ratio,
      minRatio: plan.ratio,
      maxPrice: plan.price,
      minPrice: plan.price,
      stopAlerted: false,
      nearWarned: false,
      winStreak: 0,
      loseStreak: 0
    };
    ui.tab = 'sim';
    ensureAudio();
    playOrder();
    renderAll();
    if (plan.immediate) {
      showToast('开仓即触发强平线。系统正在准备结算……', 'bad');
      setTimeout(() => {
        if (state.position && !state.over) triggerLiquidation('开仓瞬间维持担保比例已低于 130%');
      }, 1300);
    } else {
      startAuto(900);
      showToast('决策已封存。时间自动开始流动，可切换 2× 流速。', 'good');
    }
  }

  function triggerLiquidation(reason) {
    if (!state.position || state.over) return;
    const info = settlePosition('liq', reason || '维持担保比例跌破 130%');
    if (!info) return;
    ui.tab = 'review';
    renderAll();
    playLiquidationFx(info, false);
  }

  function settlePosition(kind, reason) {
    if (!state.position) return null;
    stopAuto(false);
    hideMood();
    const pos = state.position;
    const plan = pos.plan;
    const stock = STOCKS[state.stockIndex];
    const bars = stock.bars;
    const price = currentPrice();
    const debt = plan.loan * Math.pow(1 + FINANCING_RATE / TRADING_DAYS, pos.daysHeld);
    const gross = state.cash + plan.shares * price;
    const sellValue = plan.shares * price;
    const exitFee = Math.max(MIN_COMMISSION, sellValue * COMMISSION_RATE) + sellValue * STAMP_DUTY;
    const net = gross - debt - plan.entryFee - exitFee;
    const owed = net < 0 ? -net : 0;
    const cashAfter = Math.max(0, net);
    const metrics = liveMetrics();
    const horizonIdx = Math.min(bars.length - 1, state.order.entryCursor + state.order.journal.holdingDays);
    const horizonPrice = bars[horizonIdx][2];
    const horizonDays = horizonIdx - state.order.entryCursor;
    const exitDate = bars[clamp(state.cursor, 0, bars.length - 1)][0];

    const info = {
      demo: false,
      kind,
      reason,
      stockName: stock.name,
      stockCode: stock.code,
      stockIndex: state.stockIndex,
      digits: plan.digits,
      unit: plan.unit,
      quantity: plan.shares,
      highRisk: plan.highRisk,
      leverage: plan.leverage,
      marginPct: plan.marginPct,
      capital: plan.capital,
      entryDate: state.order.entryDate,
      exitDate,
      entryPrice: plan.price,
      exitPrice: price,
      shares: plan.shares,
      notional: plan.notional,
      debt,
      interest: debt - plan.loan,
      entryFee: plan.entryFee,
      exitFee,
      fees: plan.entryFee + exitFee,
      ratio: metrics.ratio,
      liqPrice: metrics.liqPrice,
      daysHeld: pos.daysHeld,
      pnl: net - plan.capital,
      returnPct: ((net / plan.capital) - 1) * 100,
      cashAfter,
      owed,
      minRatio: pos.minRatio,
      maxRatio: pos.maxRatio,
      maxPrice: pos.maxPrice,
      minPrice: pos.minPrice,
      stopLoss: state.order.journal.stopLoss,
      stopHit: pos.stopAlerted,
      unleveredReturnPct: ((price / plan.price) - 1) * 100,
      horizonReturnPct: ((horizonPrice / plan.price) - 1) * 100,
      horizonPrice,
      horizonDays,
      horizonDate: bars[horizonIdx][0]
    };

    state.cash = cashAfter;
    state.exitInfo = info;
    state.over = true;
    state.closed = true;
    state.liquidated = kind === 'liq';
    state.position = null;
    state.maxLeverageUsed = Math.max(state.maxLeverageUsed, plan.leverage);
    return info;
  }

  function advance(days) {
    if (state.busy || state.fxPlaying) return;
    if (!state.position) {
      if (state.over) switchTab('review');
      else showToast('先写完决策日志，提交一笔交易。', 'warn');
      return;
    }
    if (state.over) return;
    const count = clamp(Number(days) || 1, 1, 60);
    state.busy = true;
    renderAll();
    ensureAudio();
    (async () => {
      for (let i = 0; i < count; i += 1) {
        const alive = stepOneDay();
        if (!alive || state.over) break;
        renderLive();
        if ($('.modal-backdrop')) break;
        if (i < count - 1) await sleep(58);
      }
      state.busy = false;
      if (!state.fxPlaying) {
        renderAll();
        playTick();
      }
    })();
  }

  function renderLive() {
    renderTopbar();
    renderLeft();
    renderChartHead();
    renderTimeBar();
    renderRight();
    if (ui.tab === 'desk') {
      renderTabs();
      renderTab();
    }
    scheduleChart();
  }

  function autoInterval() {
    return Math.round(AUTO_BASE_MS / (state.autoSpeed === 2 ? 2 : 1));
  }

  function stopAuto(render = true) {
    state.autoRunning = false;
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = 0;
    }
    if (render) {
      renderChartHead();
      renderTimeBar();
      renderRight();
    }
  }

  function startAuto(delay = AUTO_BASE_MS) {
    if (!state.position || state.over || state.fxPlaying) return;
    state.autoRunning = true;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(autoTick, delay);
    renderChartHead();
    renderTimeBar();
    renderRight();
  }

  function autoTick() {
    autoTimer = 0;
    if (!state.autoRunning) return;
    if (!state.position || state.over || state.fxPlaying) {
      stopAuto(false);
      return;
    }
    if (state.busy || $('.modal-backdrop') || $('.liq-modal-backdrop')) {
      autoTimer = setTimeout(autoTick, 220);
      return;
    }
    state.busy = true;
    const alive = stepOneDay();
    state.busy = false;
    if (state.fxPlaying) {
      stopAuto(false);
      return;
    }
    if (!alive || state.over) {
      stopAuto(false);
      renderAll();
      return;
    }
    renderLive();
    playTick();
    autoTimer = setTimeout(autoTick, autoInterval());
  }

  function setAutoSpeed(speed) {
    state.autoSpeed = Number(speed) === 2 ? 2 : 1;
    if (state.autoRunning) {
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = setTimeout(autoTick, autoInterval());
    }
    renderAll();
    showToast(state.autoSpeed === 2 ? '时间流速已切换为 2×。' : '时间流速已恢复 1×。', state.autoSpeed === 2 ? 'warn' : 'good');
  }

  function toggleAuto() {
    if (!state.position || state.over || state.fxPlaying) return;
    if (state.autoRunning) {
      stopAuto(false);
      renderAll();
      showToast('时间已暂停。可以手动推进，或点继续。', 'warn');
    } else {
      startAuto(350);
      renderAll();
      showToast('时间继续流动。', 'good');
    }
  }

  function stepOneDay() {
    if (!state.position || state.over) return false;
    const bars = currentBars();
    if (state.cursor >= bars.length - 1) {
      finishAtDataEnd();
      return false;
    }
    state.cursor += 1;
    const pos = state.position;
    pos.daysHeld += 1;
    const price = currentPrice();
    pos.maxPrice = Math.max(pos.maxPrice, price);
    pos.minPrice = Math.min(pos.minPrice, price);
    const m = liveMetrics();
    pos.maxRatio = Math.max(pos.maxRatio, m.ratio);
    pos.minRatio = Math.min(pos.minRatio, m.ratio);

    if (pos.plan.stopPrice > 0 && price <= pos.plan.stopPrice && !pos.stopAlerted) {
      pos.stopAlerted = true;
      showToast(`价格已跌破你的止损线 ${fmtPrice(pos.plan.stopPrice, pos.plan.stockIndex)}。计划写下了，执行了吗？`, 'warn');
      playWarn();
    }

    if (pos.plan.loan > 0 && m.ratio < MAINTENANCE_LINE) {
      triggerLiquidation('维持担保比例跌破 130%，强制平仓');
      return false;
    }
    if (m.ratio < 145 && !pos.nearWarned) {
      pos.nearWarned = true;
      playWarn();
    }
    const prevClose = bars[state.cursor - 1][2];
    const dayPct = prevClose ? ((price / prevClose) - 1) * 100 : 0;
    if (dayPct > 0.000001) showMood('up', dayPct);
    else if (dayPct < -0.000001) showMood('down', dayPct);

    const roleId = state.character && state.character.id;
    if (roleId === 'kurumi' || roleId === 'sam' || roleId === 'sensi' || roleId === 'xiaokang' || roleId === 'naiwa' || roleId === 'evergrande') {
      if (dayPct > 0.000001) {
        pos.winStreak += 1;
        pos.loseStreak = 0;
        if (pos.winStreak >= 3) {
          pos.winStreak = 0;
          if (roleId === 'kurumi') showKurumiWin();
          else if (roleId === 'sensi') showSensiWin();
          else if (roleId === 'xiaokang') showXiaokangWin();
          else if (roleId === 'naiwa') showNaiwaWin();
          else if (roleId === 'evergrande') showEvergrandeWin();
          else showSamWin();
        }
      } else if (dayPct < -0.000001) {
        pos.loseStreak += 1;
        pos.winStreak = 0;
        if (pos.loseStreak >= 3) {
          pos.loseStreak = 0;
          if (roleId === 'kurumi') showKurumiLose();
          else if (roleId === 'sensi') showSensiLose();
          else if (roleId === 'xiaokang') showXiaokangLose();
          else if (roleId === 'naiwa') showNaiwaLose();
          else if (roleId === 'evergrande') showEvergrandeLose();
          else showSamLose();
        }
      } else {
        pos.winStreak = 0;
        pos.loseStreak = 0;
      }
    }
    return true;
  }

  function finishAtDataEnd() {
    if (!state.position) return;
    const info = settlePosition('close', '行情样本结束');
    if (!info) return;
    ui.tab = 'review';
    renderAll();
    setTimeout(scrollToReview, 80);
    showToast('已经走到历史样本末端，系统按收盘价结束本局。', 'warn');
  }

  function requestClosePosition() {
    if (!state.position || state.over || state.busy || state.fxPlaying) return;
    const m = liveMetrics();
    const sellFee = Math.max(MIN_COMMISSION, m.marketValue * COMMISSION_RATE) + m.marketValue * STAMP_DUTY;
    const estimated = state.cash + m.marketValue - m.debt - state.position.plan.entryFee - sellFee;
    openConfirm(
      '确认按市价平仓？',
      `当前持仓市值 ${fmtMoney(m.marketValue)}，融资负债 ${fmtMoney(m.debt)}，预计结算后余额 <b>${fmtMoney(estimated)}</b>。平仓后本局结束，不能反悔。`,
      '确认平仓',
      () => {
        const info = settlePosition('close', '主动平仓');
        if (!info) return;
        ui.tab = 'review';
        renderAll();
        setTimeout(scrollToReview, 80);
        playClose();
        showToast(info.pnl >= 0 ? '平仓完成。这次你活下来了。' : '平仓完成。至少你没有把选择权交给强平。', info.pnl >= 0 ? 'good' : 'warn');
      }
    );
  }

  function requestRestart() {
    if (state.fxPlaying) return;
    if (state.position) {
      openConfirm(
        '重新开局？',
        `当前持仓和本局记录会被丢弃，资金重置为 ${fmtMoney(state.startingCapital)}，并随机抽取一段新的历史起点。`,
        '重新开局',
        () => newGame()
      );
      return;
    }
    newGame();
  }

  function newGame() {
    stopAuto(false);
    hideMood();
    cleanupFx();
    closeModal();
    const previous = state;
    state = makeInitialState(previous);
    draft = makeDraft();
    ui.tab = 'desk';
    ui.hoverIndex = null;
    const onboard = $('#onboard');
    if (onboard) onboard.classList.add('hide');
    renderAll();
    const leftRail = $('#left');
    if (leftRail) leftRail.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: state.reducedMotion ? 'auto' : 'smooth' });
    showToast(`第 ${state.round} 局 · 起点 ${currentBar()[0]} · ${currentStock().name}`, 'good');
    playTick();
  }

  function selectStock(index) {
    if (state.position) { showToast('持仓中不能切换标的。先平仓或走完这段路。', 'warn'); return; }
    if (state.over) { showToast('本局已经结算，重新开局后可切换标的。', 'warn'); return; }
    if (!Number.isInteger(index) || index < 0 || index >= STOCKS.length || index === state.stockIndex) return;
    const targetDate = currentBar()[0];
    state.stockIndex = index;
    state.cursor = alignIndex(index, targetDate);
    draft.quantity = '';
    renderAll();
    playTick();
  }

  /* ---------------- 渲染：顶层 ---------------- */
  function renderAll() {
    renderTopbar();
    renderLeft();
    renderChartHead();
    renderTimeBar();
    renderTabs();
    renderTab();
    renderRight();
    updatePlanPreview();
    scheduleChart();
  }

  function renderTopbar() {
    const bar = currentBar();
    const top = $('#topbar');
    if (!top) return;
    const statusText = state.over ? '已结算' : state.position ? '持仓中' : '等待决策';
    const role = state.character;
    top.innerHTML = `
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div class="brand-text"><b>重演</b><span>REPLAY / DECISION LAB</span></div>
      </div>
      <div class="top-meta">
        <span class="dot-live"></span>
        <span>行情日 <b class="t-date">${bar[0]}</b></span>
        <span class="sep hide-md"></span>
        <span class="hide-md">第 ${state.round} 局 · ${statusText}</span>
        ${role ? `<span class="role-chip hide-md" style="--role-color:${role.tone}" title="${esc(role.name)}"><i>${role.icon}</i>${esc(role.short)}</span>` : ''}
      </div>
      <div class="top-actions">
        <span class="data-pill"><i></i>真实 + 模拟 · 每日更新</span>
        <button class="icon-btn" type="button" data-action="sound" title="${state.muted ? '打开音效' : '静音'}" aria-label="${state.muted ? '打开音效' : '静音'}">${soundIcon()}</button>
        <button class="ghost-btn" type="button" data-action="capital">资金</button>
        <button class="ghost-btn" type="button" data-action="rules">规则</button>
        <button class="ghost-btn" type="button" data-action="restart">重开</button>
      </div>
    `;
  }

  function soundIcon() {
    if (state.muted) {
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';
    }
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  }

  function renderLeft() {
    const left = $('#left');
    if (!left) return;
    const leftScroll = left.scrollTop;
    const locked = Boolean(state.position || state.over);
    const cardHTML = (i) => {
      const stock = STOCKS[i];
      const index = displayIndexFor(i);
      const move = priceMoveAt(i, index);
      const active = i === state.stockIndex;
      const cls = ['stock-card', active ? 'active' : '', locked ? 'locked' : '', stock.highRisk ? 'high-risk' : '', stock.group === 'jpycad' ? 'jpycad' : '', stock.group === 'ai' ? 'ai-stock' : '', stock.group === 'hardware' ? 'hardware-stock' : ''].filter(Boolean).join(' ');
      return `
        <button class="${cls}" type="button" data-action="stock" data-stock="${i}" ${locked ? 'disabled' : ''} title="${esc(stock.name)} ${stock.code}${stock.highRisk ? ' · 高风险' : ''}">
          <div class="sc-name"><b>${esc(stock.name)}</b><span>${stock.code}</span>${stock.highRisk ? '<i class="sc-risk-dot" aria-label="高风险"></i>' : stock.group === 'ai' ? '<i class="sc-ai-dot" aria-label="AI"></i>' : stock.group === 'hardware' ? '<i class="sc-hw-dot" aria-label="硬件"></i>' : ''}</div>
          <div class="sc-price ${changeClass(move.diff)}">${fmtPrice(move.close, i)}</div>
          <div class="sc-sector">${esc(stock.sector)}${stock.highRisk ? ' · 高波动' : stock.group === 'hardware' ? ` · 可买入 / ${stock.unit || '份'}` : ''}</div>
          <div class="sc-chg ${changeClass(move.diff)}">${fmtPct(move.pct, 2)}</div>
          <div class="sc-spark">${sparkline(i, index)}</div>
        </button>
      `;
    };
    const normalIndices = STOCKS.map((s, i) => (!s.highRisk && s.group !== 'ai' && s.group !== 'hardware' ? i : -1)).filter((i) => i >= 0);
    const aiIndices = STOCKS.map((s, i) => (s.group === 'ai' ? i : -1)).filter((i) => i >= 0);
    const hardwareIndices = STOCKS.map((s, i) => (s.group === 'hardware' ? i : -1)).filter((i) => i >= 0);
    const riskIndices = STOCKS.map((s, i) => (s.highRisk && s.group !== 'jpycad' ? i : -1)).filter((i) => i >= 0);
    const jpyCadIndices = STOCKS.map((s, i) => (s.group === 'jpycad' ? i : -1)).filter((i) => i >= 0);
    const maxLev = state.maxLeverageUsed > 1 ? `${fmtLeverage(state.maxLeverageUsed)}×` : '—';
    left.innerHTML = `
      <div class="zone-nav" aria-label="市场分区快速跳转">
        <button class="zone-chip" type="button" data-action="jump" data-target="zone-a">A股</button>
        <button class="zone-chip" type="button" data-action="jump" data-target="zone-ai">AI巨头</button>
        <button class="zone-chip hot" type="button" data-action="jump" data-target="zone-hardware">AI硬件 33</button>
        <button class="zone-chip" type="button" data-action="jump" data-target="zone-risk">高风险</button>
        <button class="zone-chip" type="button" data-action="jump" data-target="zone-jpy">日元/加元</button>
      </div>
      <div class="side-block" id="zone-a">
        <div class="side-head"><span>A股训练标的</span><span class="side-count">${normalIndices.length} STOCKS</span></div>
        <div class="stock-list">${normalIndices.map(cardHTML).join('')}</div>
      </div>
      <div class="side-block ai-zone-block" id="zone-ai">
        <div class="side-head ai-zone-head"><span>AI 巨头</span><span class="ai-zone-badge">AI GIANTS</span></div>
        <div class="ai-zone-note">英伟达 · 英特尔 · AMD · 谷歌 · 微软 · 台积电 · 博通 · 腾讯 · 阿里 · 三星 · SK<br>以上为每日更新真实行情 · OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方 / 字节 / SpaceX 为教学模拟</div>
        <div class="stock-list">${aiIndices.map(cardHTML).join('')}</div>
      </div>
      <div class="side-block hardware-zone-block" id="zone-hardware">
        <div class="side-head hardware-zone-head"><span>AI 产业硬件</span><span class="hardware-zone-badge">33 ASSETS</span></div>
        <div class="hardware-zone-note">RTX 50 / 40 全系 · 工业级全系 · 内存 4 项<br>可自定义数量买入 · 不填默认 100 台/条</div>
        <div class="stock-list">${hardwareIndices.map(cardHTML).join('')}</div>
      </div>
      <div class="side-block risk-zone-block" id="zone-risk">
        <div class="side-head risk-zone-head"><span>高风险专区</span><span class="risk-zone-badge">HIGH RISK</span></div>
        <div class="risk-zone-note">外汇 · 加密货币 · 贵金属<br>无涨跌停 / 高波动 / 杠杆照旧无上限</div>
        <div class="stock-list">${riskIndices.map(cardHTML).join('')}</div>
      </div>
      <div class="side-block fx-zone-block" id="zone-jpy">
        <div class="side-head fx-zone-head"><span>日元 / 加拿大币区</span><span class="fx-zone-badge">JPY · CAD</span></div>
        <div class="fx-zone-note">美元 / 日元 · 美元 / 加元 · 加元 / 日元<br>典型高波动货币对 · 日线回放</div>
        <div class="stock-list">${jpyCadIndices.map(cardHTML).join('')}</div>
      </div>
      <div class="side-block">
        <div class="side-head"><span>本局档案</span><span class="side-count">#${String(state.round).padStart(2, '0')}</span></div>
        <div class="panel archive-card">
          <div class="panel-body">
            <div class="archive-row"><span>起点</span><b>${state.order ? state.order.entryDate : (state.anchorDate || currentBar()[0])}</b></div>
            <div class="archive-row"><span>角色</span><b>${state.character ? esc(state.character.short) : '—'}</b></div>
            <div class="archive-row"><span>资金</span><b>${fmtMoney(state.capital)}</b></div>
            <div class="archive-row"><span>行情</span><b>2021–2026</b></div>
            <div class="archive-row"><span>更新</span><b>${MARKET.meta.lastUpdated ? esc(MARKET.meta.lastUpdated) : '—'}</b></div>
            <div class="archive-row"><span>最高杠杆</span><b class="${state.maxLeverageUsed > 5 ? 'hot' : ''}">${maxLev}</b></div>
            <div class="archive-row"><span>状态</span><b>${state.over ? (state.liquidated ? '强平' : '已结算') : state.position ? '持仓中' : '待决策'}</b></div>
          </div>
        </div>
      </div>
      <div class="side-block">
        <div class="quote-card">
          <span class="quote-mark">“</span>
          <p>杠杆不改变你的判断，<br>只改变你<b>能不能活到判断兑现那天</b>。</p>
        </div>
      </div>
    `;
    left.scrollTop = leftScroll;
  }

  function sparkline(stockIndex, index) {
    const stock = STOCKS[stockIndex];
    const bars = stock.bars;
    const start = Math.max(0, index - 26);
    const closes = bars.slice(start, index + 1).map((b) => b[2]);
    if (closes.length < 2) return '';
    let min = Math.min(...closes);
    let max = Math.max(...closes);
    if (max === min) { max += 1; min -= 1; }
    const width = 100;
    const height = 22;
    const points = closes.map((v, i) => {
      const x = (i / (closes.length - 1)) * width;
      const y = 2 + ((max - v) / (max - min)) * (height - 4);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const area = `M0,${height} L${points.join(' L')} L${width},${height} Z`;
    const line = points.join(' ');
    const gradId = `sg-${stockIndex}`;
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stock.tone}" stop-opacity=".32"/><stop offset="1" stop-color="${stock.tone}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#${gradId})"/>
      <polyline points="${line}" fill="none" stroke="${stock.tone}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>
    </svg>`;
  }

  function renderChartHead() {
    const head = $('#chartHead');
    if (!head) return;
    const stock = currentStock();
    const bars = currentBars();
    const index = clamp(state.cursor, 0, bars.length - 1);
    const move = priceMoveAt(state.stockIndex, index);
    const ratio = state.position ? liveMetrics().ratio : (state.over && state.exitInfo ? state.exitInfo.ratio : null);
    const sourceTag = stock.simulated ? '教学模拟' : (stock.simulatedFrom ? '历史 + 延伸模拟' : '真实历史');
    const sourceClass = stock.simulated ? 'danger' : 'hot';
    let statusChip = '';
    if (state.position && Number.isFinite(ratio)) {
      const cls = ratio < 145 ? 'danger' : ratio < 180 ? 'hot' : 'ok';
      statusChip = `<span class="mini-tag ${cls}"><span class="badge-dot"></span>维持担保 ${ratio.toFixed(1)}%</span>`;
    } else if (state.position) {
      statusChip = `<span class="mini-tag ok"><span class="badge-dot"></span>持仓中 · 无融资</span>`;
    } else if (state.over) {
      statusChip = `<span class="mini-tag ${state.liquidated ? 'danger' : 'ok'}">${state.liquidated ? '已强制平仓' : '本局已结算'}</span>`;
    } else {
      statusChip = `<span class="mini-tag">等待决策</span>`;
    }
    head.innerHTML = `
      <div class="ch-stock">
        <div class="ch-stock-line">
          <span class="sector-dot" style="color:${stock.tone};background:${stock.tone}"></span>
          <h2>${esc(stock.name)}</h2>
          <span class="ch-code">${stock.code} · ${stock.exchange} · ${esc(stock.sector)}</span>
          <span class="mini-tag ${sourceClass}">${sourceTag}</span>
          ${stock.highRisk ? '<span class="mini-tag danger"><i class="sc-risk-dot"></i>高风险专区</span>' : ''}
        </div>
        <div class="ch-price-line">
          <span class="ch-price">${fmtPrice(move.close)}</span>
          <span class="ch-chg ${changeClass(move.diff)}">${move.diff >= 0 ? '+' : ''}${fmtPrice(move.diff)} <span>${fmtPct(move.pct)}</span></span>
        </div>
      </div>
      <div class="ch-right">
        <span class="session-pill"><span class="badge-dot" style="color:var(--amber)"></span>${state.position ? `持仓第 ${currentDayNumber()} 日` : `已揭示 ${index + 1} / ${bars.length} 根`}</span>
        <span class="session-pill hide-md">${bars[0][0]} → ${bars[bars.length - 1][0]}</span>
        ${statusChip}
      </div>
    `;
  }

  function renderTimeBar() {
    const bar = $('#timeBar');
    if (!bar) return;
    const bars = currentBars();
    const total = bars.length;
    const progress = clamp((state.cursor / Math.max(1, total - 1)) * 100, 0, 100);
    const rangePct = bars[0][2] ? ((bars[state.cursor][2] / bars[0][2]) - 1) * 100 : 0;
    const scrubDisabled = Boolean(state.position || state.over || state.fxPlaying);
    let hint = '<i style="background:var(--amber)"></i>拖动时间条查看任意历史 · 下单后自动走时';
    if (state.over) hint = '<i style="background:var(--dim)"></i>时间已冻结 · 本局结束';
    else if (state.position && state.autoRunning) hint = `<i></i>自动播放 · ${state.autoSpeed}× 流速`;
    else if (state.position) hint = `<i style="background:var(--amber)"></i>已暂停 · ${state.autoSpeed}× 流速`;
    const autoControls = state.position ? `
      <span class="time-auto">
        <button class="speed-chip ${state.autoSpeed === 2 ? 'active' : ''}" type="button" data-action="auto-speed" data-speed="2" title="时间流速加倍">2×</button>
        <button class="speed-chip" type="button" data-action="toggle-auto" title="${state.autoRunning ? '暂停时间' : '继续时间'}">${state.autoRunning ? '暂停' : '继续'}</button>
      </span>` : '';
    bar.innerHTML = `
      <div class="timeline-wrap">
        <span class="timeline-label">${bars[0][0]}</span>
        <div class="timeline-track">
          <div class="timeline-fill" id="timeProgressFill" style="width:${progress}%"></div>
          <div class="timeline-knob" id="timeProgressKnob" style="left:${progress}%"></div>
          <input id="timeScrubber" class="timeline-scrubber" type="range" min="0" max="${total - 1}" step="1" value="${state.cursor}" ${scrubDisabled ? 'disabled' : ''} aria-label="拖动时间条查看历史行情">
        </div>
        <span class="timeline-label">${bars[total - 1][0]}</span>
      </div>
      <div class="timeline-meta"><span class="t-hide" id="timeRevealed">已揭示 ${state.cursor + 1} / ${total}</span><span class="range-change ${changeClass(rangePct)}" id="timeRangeChange">区间 ${fmtPct(rangePct)}</span>${autoControls}<span class="time-hint">${hint}</span></div>
    `;
  }

  function scrubTimeline(rawValue) {
    if (state.position || state.over || state.fxPlaying) return;
    const bars = currentBars();
    const total = bars.length;
    const cursor = clamp(Math.round(Number(rawValue) || 0), 0, total - 1);
    if (cursor === state.cursor) return;
    state.cursor = cursor;
    ui.hoverIndex = null;
    const progress = clamp((cursor / Math.max(1, total - 1)) * 100, 0, 100);
    const fill = $('#timeProgressFill');
    const knob = $('#timeProgressKnob');
    const revealed = $('#timeRevealed');
    const range = $('#timeRangeChange');
    if (fill) fill.style.width = `${progress}%`;
    if (knob) knob.style.left = `${progress}%`;
    if (revealed) revealed.textContent = `已揭示 ${cursor + 1} / ${total}`;
    if (range) {
      const pct = bars[0][2] ? ((bars[cursor][2] / bars[0][2]) - 1) * 100 : 0;
      range.textContent = `区间 ${fmtPct(pct)}`;
      range.classList.remove('up', 'down', 'flat');
      range.classList.add(changeClass(pct));
    }
    renderTopbar();
    renderChartHead();
    renderRight();
    scheduleChart();
  }

  function renderTabs() {
    const tabs = $('#tabs');
    if (!tabs) return;
    const hasOrder = Boolean(state.order);
    const reviewLocked = !state.over;
    tabs.innerHTML = `
      <button class="tab-btn ${ui.tab === 'desk' ? 'active' : ''}" type="button" data-action="tab" data-tab="desk">决策台</button>
      <button class="tab-btn ${ui.tab === 'sim' ? 'active' : ''}" type="button" data-action="tab" data-tab="sim">千条时间线 <span class="tab-badge">${hasOrder ? '1000' : '推演'}</span></button>
      <button class="tab-btn ${ui.tab === 'chain' ? 'active' : ''}" type="button" data-action="tab" data-tab="chain">AI 产业链 <span class="tab-badge">2026</span></button>
      <button class="tab-btn ${ui.tab === 'review' ? 'active' : ''} ${reviewLocked ? 'disabled' : ''}" type="button" data-action="tab" data-tab="review">复盘 ${reviewLocked ? '<span class="lock">LOCK</span>' : ''}</button>
    `;
  }

  function switchTab(tab) {
    if (!['desk', 'sim', 'chain', 'review'].includes(tab)) return;
    if (tab === 'review' && !state.over) {
      showToast('先完成一笔交易，复盘室才会开门。', 'warn');
      return;
    }
    if (tab === ui.tab) return;
    ui.tab = tab;
    renderTabs();
    renderTab();
    playTick();
  }

  function renderTab() {
    const body = $('#tabBody');
    if (!body) return;
    if (ui.tab === 'desk') body.innerHTML = deskHTML();
    else if (ui.tab === 'sim') body.innerHTML = simHTML();
    else if (ui.tab === 'chain') body.innerHTML = chainHTML();
    else body.innerHTML = reviewHTML();
    if (ui.tab === 'desk') {
      updatePlanPreview();
      updateSubmitState();
    }
    if (ui.tab === 'sim') {
      requestAnimationFrame(() => requestAnimationFrame(drawMcCharts));
    }
  }

  function deskHTML() {
    if (state.position) return deskActiveHTML();
    if (state.over) return deskOverHTML();
    const stock = currentStock();
    const plan = planFromDraft();
    const planHint = plan.error ? '<span class="form-alert">参数无效</span>' : `<span class="hint">名义仓位 <b class="mono">${fmtMoney(plan.notional)}</b> · 借款 <b class="mono">${plan.loan > 0 ? fmtMoney(plan.loan) : '无'}</b></span>`;
    return `
      <div class="desk-hero">
        <div>
          <div class="eyebrow">DECISION JOURNAL / ${stock.code}${stock.highRisk ? ' / HIGH RISK' : ''}</div>
          <h2>${esc(stock.name)} · 先把判断写下来，再交给市场。${stock.highRisk ? '<span class="mini-tag danger" style="vertical-align:middle;margin-left:7px">高风险专区</span>' : ''}</h2>
          <p>在你的账户里，唯一不会被强平的东西是这段文字。<b>写清理由、预期、持有期和止损线</b>，系统才会允许下单。</p>
          ${stock.highRisk ? `<div class="high-risk-banner"><b>HIGH RISK</b><span>${esc(stock.sector)} · 无涨跌停，高波动。它不会因为你写了止损就变得温柔，杠杆也不会。</span></div>` : ''}
        </div>
        <div class="hero-stat">
          <span>可用资金</span>
          <b>${fmtMoney(state.cash)}</b>
          <em>杠杆 <span id="heroLeverage">${fmtLeverage(draft.leverage)}</span>× · 无上限</em>
        </div>
      </div>
      <form class="journal-form" id="journalForm" autocomplete="off" onsubmit="return false">
        <div class="field">
          <label for="reasonInput">为什么看好它？ <span><span class="req">*</span> 至少 8 个字 · 会被封存进复盘</span></label>
          <textarea id="reasonInput" data-draft="reason" maxlength="320" placeholder="例如：新能源渗透率仍在提升，回调到季度均线附近，估值回到我能接受的位置。若逻辑被证伪则止损。">${esc(draft.reason)}</textarea>
          <div class="field-foot"><span>写下你愿意为这个判断付多少钱。</span><span id="reasonCount">${String(draft.reason || '').length} / 320</span></div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="expectationInput">预期类型</label>
            <select id="expectationInput" data-draft="expectation">
              ${option('趋势延续', '趋势延续', draft.expectation)}
              ${option('超跌反弹', '超跌反弹', draft.expectation)}
              ${option('业绩 / 事件驱动', '业绩 / 事件驱动', draft.expectation)}
              ${option('估值修复', '估值修复', draft.expectation)}
            </select>
          </div>
          <div class="field">
            <label for="holdingInput">计划持有 <span>交易日</span></label>
            <select id="holdingInput" data-draft="holdingDays">
              ${option(5, '5 天 · 短打', draft.holdingDays)}
              ${option(10, '10 天', draft.holdingDays)}
              ${option(20, '20 天 · 一个月', draft.holdingDays)}
              ${option(40, '40 天 · 中线', draft.holdingDays)}
            </select>
          </div>
          <div class="field">
            <label for="stopInput">止损线 <span>%</span></label>
            <input id="stopInput" type="number" inputmode="decimal" min="0.1" max="99" step="0.5" data-draft="stopLoss" value="${esc(draft.stopLoss)}" aria-label="止损百分比">
          </div>
        </div>
        <div class="field">
          <div class="field-label"><label for="confidenceInput">信心值</label><span>这个数字会和 1000 条时间线对照</span></div>
          <div class="confidence-input">
            <input id="confidenceInput" type="range" min="1" max="100" step="1" data-draft="confidence" value="${esc(draft.confidence)}">
            <span class="confidence-val"><span id="confVal">${esc(draft.confidence)}</span><small>%</small></span>
          </div>
        </div>
        <div id="ackWrap" class="ack-row hide">
          <input id="ackRisk" type="checkbox" data-draft="ack" ${draft.ack ? 'checked' : ''}>
          <label for="ackRisk"><b>我知道这不是演习。</b> 在这个杠杆下，开仓瞬间就会低于 130% 的强平线，系统会立刻执行强制平仓。我仍然要提交。</label>
        </div>
        <div class="submit-row">
          <button id="submitOrder" class="btn primary" type="button" data-action="submit" disabled>提交决策 · 推演 1000 条时间线</button>
          <div class="submit-note" id="submitHint">${planHint}<br>下单后决策会被锁定，时间机器才会启动。</div>
        </div>
      </form>
    `;
  }

  function option(value, label, current) {
    return `<option value="${esc(value)}" ${String(value) === String(current) ? 'selected' : ''}>${esc(label)}</option>`;
  }

  function deskActiveHTML() {
    const order = state.order;
    const plan = order.plan;
    const m = liveMetrics();
    return `
      <div class="locked-banner">
        <div class="lock-icon">▣</div>
        <div><b>决策已封存</b><span>${esc(order.stockName)} · ${order.entryDate} · 第 ${currentDayNumber()} 个交易日</span></div>
        <span class="mini-tag ${m.ratio < 145 ? 'danger' : 'hot'}">维持担保 ${Number.isFinite(m.ratio) ? m.ratio.toFixed(1) + '%' : '无负债'}</span>
      </div>
      ${journalReadHTML(order.journal, plan)}
      <div class="plan-stats">
        <div class="plan-stat"><span>名义仓位</span><b>${fmtMoney(plan.notional)}</b></div>
        <div class="plan-stat"><span>融资负债</span><b>${plan.loan > 0 ? fmtMoney(plan.loan) : '无'}</b></div>
        <div class="plan-stat"><span>强平线</span><b class="${m.ratio < 145 ? 'bad' : ''}">${plan.loan > 0 ? (m.liqPrice > 0 ? fmtPrice(m.liqPrice, plan.stockIndex) : '不会强平') : '—'}</b></div>
        <div class="plan-stat"><span>当前浮动</span><b class="${m.pnl >= 0 ? 'good' : 'bad'}">${fmtSignedMoney(m.pnl)}</b></div>
      </div>
      <div class="submit-row">
        <button class="btn primary" type="button" data-action="tab" data-tab="sim">查看这 1000 条时间线</button>
        <span class="submit-note">推演结果不会改变已经发生的行情。<br>你只能决定下一步。</span>
      </div>
    `;
  }

  function deskOverHTML() {
    const info = state.exitInfo;
    if (!info) return '<div class="mc-empty"><h3>本局已结束</h3><p>没有可展示的决策记录。</p></div>';
    return `
      <div class="locked-banner">
        <div class="lock-icon">${state.liquidated ? '×' : '✓'}</div>
        <div><b>${state.liquidated ? '本局已被强制平仓' : '本局已结束'}</b><span>${info.entryDate} → ${info.exitDate} · 结算价 ${fmtPriceDigits(info.exitPrice, info.digits)}</span></div>
        <span class="mini-tag ${state.liquidated ? 'danger' : 'ok'}">${fmtPct(info.returnPct)}</span>
      </div>
      <div class="desk-hero">
        <div>
          <div class="eyebrow">TRADE CLOSED</div>
          <h2>${state.liquidated ? '这次不是回调，是结算。' : '这一笔走完了。'}</h2>
          <p>决策已经归档，行情无法重来。能复盘的只有你的过程：<b>判断、赔率、杠杆、运气</b>。</p>
        </div>
        <div class="hero-stat">
          <span>最终结算</span>
          <b class="${info.pnl >= 0 ? 'up' : 'down'}">${fmtSignedMoney(info.pnl)}</b>
          <em>${fmtPct(info.returnPct)}</em>
        </div>
      </div>
      <div class="submit-row">
        <button class="btn primary" type="button" data-action="tab" data-tab="review">查看复盘</button>
        <button class="btn" type="button" data-action="restart">重新开局</button>
        <span class="submit-note">复盘分数只评价决策过程，不评价你这次赚了还是亏了。</span>
      </div>
    `;
  }

  function journalReadHTML(journal, plan) {
    return `
      <div class="journal-read">
        <div class="jread-block">
          <div class="jlabel">DECISION REASON / 买入理由</div>
          <p>${esc(journal.reason)}</p>
        </div>
        <div class="plan-chips">
          <span class="plan-chip">预期 <b>${esc(journal.expectation)}</b></span>
          <span class="plan-chip">信心 <b>${journal.confidence}%</b></span>
          <span class="plan-chip">持有 <b>${journal.holdingDays} 日</b></span>
          <span class="plan-chip">止损 <b>-${fmtPlain(journal.stopLoss, 1)}%</b></span>
          <span class="plan-chip">数量 <b>${fmtQty(plan.quantity)} ${plan.unit}</b></span>
          <span class="plan-chip">杠杆 <b>${fmtLeverage(plan.leverage)}×</b></span>
          <span class="plan-chip">保证金 <b>${fmtPlain(plan.marginPct, 0)}%</b></span>
        </div>
      </div>
    `;
  }

  /* ---------------- 推演 Tab ---------------- */
  function simHTML() {
    if (!state.order) {
      return `
        <div class="mc-empty">
          <svg class="mc-empty-art" viewBox="0 0 180 80" fill="none" aria-hidden="true">
            <path d="M6 60 C 30 60, 34 20, 58 20 C 82 20, 84 58, 110 58 C 136 58, 138 28, 174 28" stroke="rgba(247,200,115,.8)" stroke-width="1.2"/>
            <path d="M58 20 C 70 20, 72 8, 84 8" stroke="rgba(255,91,110,.55)" stroke-width="1"/>
            <path d="M58 20 C 70 20, 76 72, 92 72" stroke="rgba(43,217,163,.55)" stroke-width="1"/>
            <path d="M84 8 C 96 8, 102 26, 112 26 M92 72 C 108 72, 104 46, 122 46" stroke="rgba(138,169,255,.4)" stroke-width="1"/>
            <circle cx="58" cy="20" r="2.5" fill="#f7c873"/>
            <circle cx="84" cy="8" r="1.8" fill="#ff5b6e"/>
            <circle cx="92" cy="72" r="1.8" fill="#2bd9a3"/>
            <circle cx="174" cy="28" r="2.2" fill="#8aa9ff"/>
          </svg>
          <div class="eyebrow">1 DECISION → 1000 FUTURES</div>
          <h3>这里还没有分叉的时间线。</h3>
          <p>提交一笔决策后，系统会用这段历史里的日收益做块状重采样，推演 1000 种可能的未来，并告诉你其中有多少种会亏、多少种会爆仓。</p>
          <span class="mini-tag">先写日志 · 再谈收益</span>
        </div>
      `;
    }
    const order = state.order;
    const mc = order.mc;
    const st = mc.stats;
    const plan = order.plan;
    const journal = order.journal;
    const confidenceGap = journal.confidence - st.winProb;
    const insights = [];
    insights.push(`你的信心是 <b>${journal.confidence}%</b>，历史重采样给出的盈利概率是 <b>${st.winProb.toFixed(1)}%</b>。${confidenceGap > 15 ? '这中间的差距，叫过度自信。' : confidenceGap < -15 ? '你比数据更悲观。' : '两者还算接近，至少你没有被自己骗得太狠。'}`);
    insights.push(`1000 条时间线里，有 <b>${st.liqCount} 条</b>触发强平。杠杆 ${fmtLeverage(plan.leverage)}× 不会让你更容易看对，只会让错误来得更快。`);
    if (plan.loan <= 0) insights.push('这次没有融资负债。数学不会来敲门，最坏结果就是亏掉本金。');
    if (st.liqProb >= 50) insights.push('<b>超过一半的未来以强平结束。</b> 这不是投资，这是给市场送保证金。');
    else if (st.liqProb > 0) insights.push(`把爆仓概率压到 0 不现实，但 <b>${st.liqProb.toFixed(1)}%</b> 意味着平均每 1000 次有 ${st.liqCount} 次直接出局。先问自己能不能承受。`);
    if (plan.immediate) insights.push('杠杆已经越过临界值：<b>强平不是概率问题，而是开仓流程的一部分。</b>');
    insights.push(`中位结局 <b>${fmtPct(st.median)}</b>，90% 的结局落在 <b>${fmtPct(st.p5)} ~ ${fmtPct(st.p95)}</b>。中位数不代表你会抽到哪一条。`);
    if (order.exitInfo) insights.push('本局已经结束，以上仍是事前推演。别用结果倒推决策质量。');

    return `
      <div class="mc-top">
        <div>
          <div class="eyebrow">MONTE CARLO / ${mc.sampleDays} DAYS SAMPLE</div>
          <h2>你的决策，正在 1000 条时间线里分叉。</h2>
          <p>${esc(order.stockName)} · ${order.entryDate} 开仓 · 持有 ${journal.holdingDays} 日 · 杠杆 <b class="mono">${fmtLeverage(plan.leverage)}×</b> · 本金 ${fmtMoney(plan.capital)}</p>
        </div>
        <span class="mini-tag ${st.liqProb > 30 ? 'danger' : st.liqProb > 0 ? 'hot' : 'ok'}">${st.liqProb > 30 ? '高危结构' : st.liqProb > 0 ? '存在强平风险' : '无融资风险'}</span>
      </div>
      <div class="mc-summary">
        <div class="metric-card danger">
          <div class="m-label">爆仓概率 <span class="badge-dot" style="color:var(--red)"></span></div>
          <div class="m-value">${st.liqProb.toFixed(1)}<small style="font-size:12px;color:var(--dim)">%</small></div>
          <div class="m-foot">${st.liqCount} / 1000 条时间线被强平</div>
        </div>
        <div class="metric-card ${st.lossProb > 50 ? 'danger' : ''}">
          <div class="m-label">亏损概率</div>
          <div class="m-value">${st.lossProb.toFixed(1)}<small style="font-size:12px;color:var(--dim)">%</small></div>
          <div class="m-foot">1000 条里有 ${Math.round(st.lossProb * 10)} 条亏钱</div>
        </div>
        <div class="metric-card ${st.median >= 0 ? 'good' : 'warn'}">
          <div class="m-label">中位结局</div>
          <div class="m-value">${fmtPct(st.median, 1)}</div>
          <div class="m-foot">平均值 ${fmtPct(st.avg, 1)} · 别把均值当预期</div>
        </div>
        <div class="metric-card">
          <div class="m-label">最坏 5%</div>
          <div class="m-value">${fmtPct(st.p5, 1)}</div>
          <div class="m-foot">最惨的一条：${fmtPct(st.worst, 1)}</div>
        </div>
      </div>
      <div class="mc-grid">
        <div class="chart-card">
          <div class="chart-card-head">
            <h3>收益分布 / 1000 条</h3>
            <div class="legend"><span><i></i>盈利</span><span><i class="red"></i>亏损 / 强平</span></div>
          </div>
          <div class="mc-canvas-wrap"><canvas id="mcHist" aria-label="1000 条时间线的收益分布"></canvas></div>
          <div class="mc-note">横轴为期末账户收益率，纵轴为时间线数量；深红色部分代表被强平的结局。超出 ±100% 的极端值归入两端。</div>
        </div>
        <div class="chart-card">
          <div class="chart-card-head">
            <h3>维持担保比例 / 58 条样本</h3>
            <div class="legend"><span><i style="background:var(--amber)"></i>130% 红线</span></div>
          </div>
          <div class="mc-canvas-wrap"><canvas id="mcFan" aria-label="维持担保比例路径"></canvas></div>
          <div class="mc-note">${plan.loan > 0 ? '每条细线是一条时间线。走到 130% 以下，游戏结束；红色路径代表被强平。' : '无融资负债，因此不存在维持担保比例路径。'}</div>
        </div>
      </div>
      <ul class="insight-list">
        ${insights.map((text, i) => `<li class="${i === 1 && st.liqProb > 30 ? 'bad' : ''}">${text}</li>`).join('')}
      </ul>
    `;
  }

  /* ---------------- AI 产业链 Tab ---------------- */
  function chainSparkline(values, color, width = 88, height = 26) {
    if (!values || values.length < 2) return '';
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max === min) { max += 1; min -= 1; }
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = 2 + ((max - v) / (max - min)) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></svg>`;
  }

  function chainHTML() {
    const hw = MARKET.hardware;
    if (!hw) {
      return '<div class="mc-empty"><h3>AI 产业链数据未加载</h3><p>请检查 data.js。</p></div>';
    }
    const aiStocks = STOCKS.filter((s) => s.group === 'ai');
    const gold = STOCKS.find((s) => s.code === 'XAUUSD');
    const goldBars = gold ? gold.bars : [];
    const goldStart = goldBars.length ? goldBars[0][2] : 0;
    const goldNow = goldBars.length ? goldBars[goldBars.length - 1][2] : 0;
    const goldPct = goldStart ? ((goldNow / goldStart) - 1) * 100 : 0;
    const goldStep = Math.max(1, Math.floor(goldBars.length / 70));
    const goldSpark = goldBars.filter((_, i) => i % goldStep === 0).map((b) => b[2]);
    const fmtUsd = (v) => '$' + fmtPlain(v, v >= 1000 ? 0 : 2);

    const aiTickers = aiStocks.map((s) => {
      const first = s.bars[0][2];
      const last = s.bars[s.bars.length - 1][2];
      const pct = first ? ((last / first) - 1) * 100 : 0;
      return `
        <div class="chain-ticker" title="${esc(s.name)} · ${s.code}">
          <div class="ct-code">${s.code}${s.private ? ' <i>PRIVATE</i>' : ''}</div>
          <div class="ct-name">${esc(s.name)}</div>
          <div class="ct-bottom"><b>${fmtPlain(last, 2)}</b><span class="${changeClass(pct)}">${fmtPct(pct, 0)}</span></div>
        </div>
      `;
    }).join('');

    const groups = hw.groups.map((group) => {
      const rows = group.items.map((item) => {
        const color = item.changePct >= 0 ? COLORS.red : COLORS.green;
        return `
          <div class="hw-row">
            <div class="hw-info">
              <b>${esc(item.name)}</b>
              <span>${item.startDate} → ${item.currentDate}</span>
            </div>
            <div class="hw-spark">${chainSparkline(item.history.map((h) => h[1]), color)}</div>
            <div class="hw-price">
              <b>${fmtUsd(item.currentPrice)}</b>
              <span class="${changeClass(item.changePct)}">${fmtPct(item.changePct, 1)}</span>
            </div>
          </div>
        `;
      }).join('');
      return `
        <div class="hw-card">
          <div class="hw-card-head">
            <div><b>${esc(group.title)}</b><span>${esc(group.subtitle)}</span></div>
            <em>${group.items.length} 项</em>
          </div>
          ${rows}
        </div>
      `;
    }).join('');

    return `
      <div class="chain-head">
        <div>
          <div class="eyebrow">AI SUPPLY CHAIN / 2021-01 → ${hw.asOf}</div>
          <h2>算力、显卡与内存：一条正在涨价的产业链。</h2>
          <p>AI 巨头的股价只是冰山一角。这里把英伟达游戏显卡、工业显卡、内存 / 显存的价格涨幅，和黄金参考放在同一张桌子上。所有记录延长至 <b>${hw.asOf}</b>。</p>
        </div>
        <div class="gold-ref">
          <div class="gold-ref-head"><span>金价辅助参考</span><b>XAUUSD</b></div>
          <div class="gold-ref-price">${fmtUsd(goldNow)}<span class="${changeClass(goldPct)}">${fmtPct(goldPct, 0)}</span></div>
          <div class="gold-spark">${chainSparkline(goldSpark, COLORS.amber)}</div>
          <div class="gold-ref-foot">2021-01 → ${hw.asOf} · 黄金 / 美元</div>
        </div>
      </div>
      <div class="chain-ticker-strip">${aiTickers}</div>
      <div class="chain-grid">${groups}</div>
      <div class="chain-note"><b>数据说明</b>${esc(hw.note)} 显卡与内存为教学模拟；左侧 AI 硬件 33 项均可按自定义数量买入。AI 美股、腾讯 / 阿里、三星与 SK 为每日更新的真实行情；OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方 / 字节为教学估值模拟。</div>
    `;
  }

  /* ---------------- 复盘 Tab ---------------- */
  function reviewHTML() {
    if (!state.over || !state.exitInfo) {
      return `
        <div class="review-locked">
          <div class="lock-big">⌁</div>
          <h3>复盘室还没开门</h3>
          <p>${state.position ? '先走完这段持仓，或者主动平仓。强平也算一种结局，只是不太体面。' : '先完成一次完整的决策：写日志、下单、推进时间，然后回来。'}</p>
          <button class="btn" type="button" data-action="tab" data-tab="desk">回到决策台</button>
        </div>
      `;
    }
    const review = buildReview();
    if (!review) return '';
    const { info, score, grade, comps, verdict, desc, luck, processTag, attribution } = review;
    const profit = info.pnl >= 0;
    return `
      <div class="review-hero ${profit ? 'profit' : ''}">
        <div>
          <div class="rh-kicker">POST-TRADE REVIEW · ${state.liquidated ? 'FORCED LIQUIDATION' : 'CLOSED POSITION'} · ${info.exitDate}</div>
          <h2>${verdict}</h2>
          <p>${desc}</p>
          <div class="plan-chips" style="margin-top:9px">
            <span class="mini-tag ${profit ? 'ok' : 'danger'}">${fmtSignedMoney(info.pnl)} · ${fmtPct(info.returnPct)}</span>
            <span class="mini-tag">${luck}</span>
            <span class="mini-tag">${processTag}</span>
          </div>
        </div>
        <div class="grade-orb"><b>${grade}</b><span>PROCESS ${score}</span></div>
      </div>
      <div class="review-stats">
        <div class="review-stat"><span>开仓 / 结算</span><b>${fmtPriceDigits(info.entryPrice, info.digits)} → ${fmtPriceDigits(info.exitPrice, info.digits)}</b></div>
        <div class="review-stat"><span>持有</span><b>${info.daysHeld} 个交易日</b></div>
        <div class="review-stat"><span>最低维持担保</span><b class="${info.minRatio < 145 ? 'down' : ''}">${Number.isFinite(info.minRatio) ? info.minRatio.toFixed(1) + '%' : '无负债'}</b></div>
        <div class="review-stat"><span>使用杠杆</span><b>${fmtLeverage(info.leverage)}×</b></div>
      </div>
      <div class="review-grid">
        <div class="review-box">
          <h3>收益归因 / 不只看结果</h3>
          <div class="attribution">
            ${attribution.map((item) => `
              <div class="attr-row">
                <span>${item.label}<b class="${item.value >= 0 ? 'up' : 'down'}">${fmtPct(item.value)}</b></span>
                <div class="attr-track"><i class="${item.tone}" style="width:${item.width}%"></i></div>
                <div class="attr-note">${item.note}</div>
              </div>
            `).join('')}
          </div>
          <div class="risk-inline" style="margin-top:11px">
            <span>${info.kind === 'liq' ? '强平原因' : '结算原因'}：</span>
            <span>${esc(info.reason)}。${info.owed > 0 ? `穿仓金额 ${fmtMoney(info.owed)}。` : ''}</span>
          </div>
        </div>
        <div class="review-box">
          <h3>决策质量分 / 与盈亏无关</h3>
          <div class="score-lines">
            ${comps.map((c) => `
              <div class="score-line">
                <span>${c.label}</span>
                <div class="sl-track"><i style="width:${(c.value / c.max) * 100}%"></i></div>
                <b>${c.value}/${c.max}</b>
              </div>
            `).join('')}
          </div>
          <div class="review-box" style="margin-top:12px;padding:10px;background:rgba(0,0,0,.12)">
            <div class="hint" style="font-size:9.5px">${processTag}：${score >= 72 ? '过程比这次结果更值得保留。' : score >= 50 ? '有框架，但还有明显的漏洞。' : '先别急着找下一只股票，先把仓位和杠杆管好。'}</div>
          </div>
        </div>
      </div>
      <div class="review-box review-journal">
        <h3>决策原文 / 已归档</h3>
        <div class="jread-block"><div class="jlabel">DECISION REASON / 买入理由</div><p>${esc(info ? state.order.journal.reason : '')}</p></div>
        <div class="plan-chips">
          <span class="plan-chip">预期 <b>${esc(state.order.journal.expectation)}</b></span>
          <span class="plan-chip">信心 <b>${state.order.journal.confidence}%</b></span>
          <span class="plan-chip">计划持有 <b>${state.order.journal.holdingDays} 日</b></span>
          <span class="plan-chip">止损 <b>-${fmtPlain(state.order.journal.stopLoss, 1)}%</b></span>
          <span class="plan-chip">数量 <b>${fmtQty(info.quantity)} ${info.unit}</b></span>
          <span class="plan-chip">实际持有 <b>${info.daysHeld} 日</b></span>
          <span class="plan-chip">最低维持担保 <b>${Number.isFinite(info.minRatio) ? info.minRatio.toFixed(1) + '%' : '无负债'}</b></span>
        </div>
        <div class="hint" style="margin-top:9px">${info.horizonReturnPct >= 0 ? '事后视角：' : '事后视角：'}如果当时不加杠杆，并坚持到原计划第 ${info.horizonDays} 个交易日（${info.horizonDate}），标的收益为 <b class="${info.horizonReturnPct >= 0 ? 'up' : 'down'}">${fmtPct(info.horizonReturnPct)}</b>。这只是事后视角，不用来做事前判断。</div>
      </div>
      <div class="review-actions">
        <button class="btn primary" type="button" data-action="restart">再来一局</button>
        <button class="btn" type="button" data-action="tab" data-tab="sim">回看那 1000 条时间线</button>
        <span class="submit-note">复盘分数：${score} / 100 · 等级 ${grade}。它不奖励运气，也不惩罚坏运气。</span>
      </div>
    `;
  }

  function buildReview() {
    const info = state.exitInfo;
    const order = state.order;
    if (!info || !order) return null;
    const mc = order.mc.stats;
    const journal = order.journal;
    const plan = order.plan;

    const reasonLength = journal.reason.length;
    const record = reasonLength >= 30 ? 20 : reasonLength >= 18 ? 16 : reasonLength >= 8 ? 12 : 4;
    const stopScore = journal.stopLoss >= 3 && journal.stopLoss <= 15 ? 20 : journal.stopLoss > 0 ? 12 : 0;
    const riskScore = mc.liqProb < 2 ? 35 : mc.liqProb < 10 ? 28 : mc.liqProb < 30 ? 18 : mc.liqProb < 60 ? 8 : 0;
    const levScore = plan.leverage <= 2 ? 25 : plan.leverage <= 3 ? 20 : plan.leverage <= 5 ? 14 : plan.leverage <= 10 ? 7 : plan.leverage <= 20 ? 3 : 0;
    const comps = [
      { label: '记录完整', value: record, max: 20 },
      { label: '止损纪律', value: stopScore, max: 20 },
      { label: '风险预算', value: riskScore, max: 35 },
      { label: '杠杆克制', value: levScore, max: 25 }
    ];
    const score = comps.reduce((sum, c) => sum + c.value, 0);
    const grade = score >= 85 ? 'S' : score >= 72 ? 'A' : score >= 58 ? 'B' : score >= 42 ? 'C' : 'D';
    const profit = info.pnl >= 0;

    let verdict = '';
    let desc = '';
    if (info.kind === 'liq') {
      if (info.daysHeld === 0) {
        verdict = '开仓即爆。你输给了除法，不是行情。';
        desc = '维持担保比例在开仓那一刻就低于 130%，系统只是照章办事。这个杠杆没有留给你任何判断兑现的时间。';
      } else if (info.horizonReturnPct > 0) {
        verdict = '方向可能看对了，但杠杆没让你活到兑现那天。';
        desc = `如果只用 1 倍杠杆并坚持到计划持有期末，标的本来可能上涨 ${fmtPct(info.horizonReturnPct)}。市场给了你答案，却没给你时间。`;
      } else {
        verdict = '判断错了，杠杆把错误放大成了事故。';
        desc = '强平不是意外，是概率在收账。先看看开仓时那 1000 条时间线里，有多少条本来会以爆仓结束。';
      }
    } else if (profit) {
      verdict = '这次活下来了，而且赚了。';
      desc = '盈利不等于能力，尤其当你事前推演里的爆仓概率并不低。把过程分和收益率分开看，才是下一次还能坐在牌桌上的原因。';
    } else {
      verdict = '判断没有兑现，但你还坐在牌桌上。';
      desc = '没有爆仓，意味着你还有下一次决策权。亏损是成本，不是判决；但如果仓位再大一点，这次可能会是另一种结局。';
    }

    let luck = '落在正常波动区间';
    if (mc.liqProb >= 99.95) luck = '确定性结局 · 100% 强平';
    else if (info.returnPct >= mc.p90) luck = '运气不错 · 好于 90% 的推演';
    else if (info.returnPct <= mc.p10) luck = '运气不佳 · 差于 90% 的推演';

    let processTag = '';
    if (score >= 72 && profit) processTag = '好流程 + 好结果';
    else if (score >= 72 && !profit) processTag = '好流程 + 坏结果';
    else if (score < 50 && profit) processTag = '坏流程 + 好结果 · 最危险';
    else if (score < 50 && !profit) processTag = '坏流程 + 坏结果';
    else processTag = '过程与结果混合';

    const costPct = (((info.interest || 0) + (info.fees || 0)) / info.capital) * 100;
    const leverageEffect = info.returnPct - info.unleveredReturnPct + costPct;
    const maxAbs = Math.max(1, Math.abs(info.unleveredReturnPct), Math.abs(leverageEffect), Math.abs(costPct));
    const attribution = [
      {
        label: '标的本身涨跌',
        value: info.unleveredReturnPct,
        width: clamp((Math.abs(info.unleveredReturnPct) / maxAbs) * 100, 2, 100),
        tone: info.unleveredReturnPct >= 0 ? 'red' : 'amber',
        note: '如果不加杠杆，方向本身带来的账户变化。'
      },
      {
        label: '杠杆放大效应',
        value: leverageEffect,
        width: clamp((Math.abs(leverageEffect) / maxAbs) * 100, 2, 100),
        tone: 'amber',
        note: `使用 ${fmtLeverage(plan.leverage)}× 杠杆后，判断被放大或反噬的部分。`
      },
      {
        label: '利息与手续费',
        value: -costPct,
        width: clamp((Math.abs(costPct) / maxAbs) * 100, 1, 100),
        tone: 'green',
        note: `融资利息 ${fmtMoney(info.interest)} · 手续费 ${fmtMoney(info.fees)}。`
      }
    ];
    return { info, score, grade, comps, verdict, desc, luck, processTag, attribution };
  }

  /* ---------------- 右栏 ---------------- */
  function renderRight() {
    const right = $('#right');
    if (!right) return;
    const rightScroll = right.scrollTop;
    let html = accountPanelHTML();
    if (state.position) {
      html += positionPanelHTML();
      html += timePanelHTML();
    } else if (state.over) {
      html += overPanelHTML();
    } else {
      html += riskPanelHTML();
    }
    right.innerHTML = html;
    right.scrollTop = rightScroll;
    updatePlanPreview();
  }

  function accountPanelHTML() {
    const m = liveMetrics();
    let equity = m.equity;
    let pnl = m.pnl;
    let pnlPct = m.pnlPct;
    let ratio = m.ratio;
    let cash = state.cash;
    let debt = m.debt;
    if (state.over && state.exitInfo) {
      equity = state.exitInfo.cashAfter;
      pnl = state.exitInfo.pnl;
      pnlPct = state.exitInfo.returnPct;
      ratio = state.exitInfo.ratio;
      cash = state.cash;
      debt = 0;
    }
    const ratioFinite = Number.isFinite(ratio);
    const ratioText = ratioFinite ? ratio.toFixed(1) + '%' : '无负债';
    const ratioClass = ratioFinite && ratio < MAINTENANCE_LINE ? 'danger' : '';
    const marker = ratioFinite ? clamp((ratio / 500) * 100, 0, 100) : 0;
    const pnlClass = pnl >= 0 ? 'up' : 'down';
    let ratioNote = '当前没有融资负债。';
    let ratioNoteClass = 'risk-inline';
    if (state.over && state.exitInfo) {
      ratioNote = state.liquidated ? `本局已强平，结算维持担保比例 ${Number.isFinite(ratio) ? ratio.toFixed(1) + '%' : '—'}。` : `本局已结算。最终维持担保比例 ${Number.isFinite(ratio) ? ratio.toFixed(1) + '%' : '无负债'}。`;
      ratioNoteClass = state.liquidated ? 'risk-inline bad' : 'risk-inline';
    } else if (state.position && ratioFinite) {
      if (ratio < MAINTENANCE_LINE) {
        ratioNote = '已经低于 130% 强平线，系统正在结算。';
        ratioNoteClass = 'risk-inline bad';
      } else if (ratio < 150) {
        ratioNote = `距强平线只剩 ${(ratio - MAINTENANCE_LINE).toFixed(1)} 个百分点。一个跌停可能就够了。`;
        ratioNoteClass = 'risk-inline warn';
      } else {
        ratioNote = `安全垫 ${(ratio - MAINTENANCE_LINE).toFixed(0)} 个百分点。利息会每天把强平线往上抬一点。`;
        ratioNoteClass = 'risk-inline';
      }
    }
    return `
      <section class="panel acct-panel">
        <div class="panel-head"><h3>账户净值</h3><span class="live"><i></i>MARK TO MARKET</span></div>
        <div class="panel-body">
          <div class="acct-label"><span>${state.over ? '结算后余额' : '账户权益'} · 本金 ${fmtMoney(state.capital)}</span></div>
          <div class="acct-value"><span class="cur">¥</span>${fmtPlain(Math.max(0, equity), 2)}</div>
          <div class="acct-sub"><span class="pnl-label">本局浮动</span><b class="${pnlClass}">${fmtSignedMoney(pnl)}</b><span class="${pnlClass}">${fmtPct(pnlPct)}</span></div>
          <div class="acct-grid">
            <div class="acct-cell"><span>可用现金</span><b>${fmtMoney(cash)}</b></div>
            <div class="acct-cell"><span>融资负债</span><b class="${debt > 0 ? 'down' : ''}">${debt > 0 ? fmtMoney(debt) : '—'}</b></div>
          </div>
          <div class="ratio-block">
            <div class="ratio-head"><span>维持担保比例</span><b class="${ratioClass}">${ratioText}</b></div>
            <div class="ratio-meter">
              <div class="ratio-track"></div>
              <div class="ratio-threshold"></div>
              ${ratioFinite ? `<div class="ratio-marker" style="left:${marker}%"></div>` : ''}
            </div>
            <div class="ratio-scale"><span>0%</span><span>130%</span><span>250%</span><span>500%+</span></div>
            <div class="${ratioNoteClass}"><span>${ratioNote}</span></div>
          </div>
        </div>
      </section>
    `;
  }

  function riskPanelHTML() {
    const presets = [1, 2, 3, 5, 10, 100];
    const hardware = currentStock().group === 'hardware';
    const qtyPlaceholder = hardware ? `不填默认 100 ${unitFor()}` : '自动计算';
    const qtyDefaultHint = hardware
      ? `不填默认买入 100 ${unitFor()}；可输入任意数量。`
      : '留空时按保证金比例自动计算；填写数量后优先使用数量。';
    return `
      <section class="panel risk-panel">
        <div class="panel-head"><h3>杠杆 / 仓位</h3><span class="unlimited-pill">NO CAP</span></div>
        <div class="panel-body">
          <div class="lev-input-row">
            <div class="lev-input-wrap">
              <input id="levInput" type="number" inputmode="decimal" min="1" step="1" data-draft="leverage" value="${esc(draft.leverage)}" aria-label="杠杆倍数，无上限">
              <span class="lev-x">×</span>
            </div>
            <div class="lev-side"><span>无上限</span><b>数学不设限</b></div>
          </div>
          <div class="lev-presets">
            ${presets.map((p) => `<button class="lev-preset ${Number(draft.leverage) === p ? 'active' : ''}" type="button" data-action="preset" data-preset="${p}">${p}×</button>`).join('')}
          </div>
          <div class="lev-slider-row">
            <span>1×</span>
            <input id="levSlider" type="range" min="1" max="20" step="0.5" data-draft="leverage" value="${clamp(Number(draft.leverage) || 1, 1, 20)}" aria-label="精确调整杠杆 1 到 20 倍">
            <span>20×</span>
          </div>
          <div class="hint" style="margin-top:3px">滑块只负责 1–20× 微调；上面的输入框没有上限。</div>
          <div class="field-line"><span>保证金占现金 <em class="field-line-hint">留空数量时生效</em></span><output id="marginPctLabel">${fmtPlain(draft.marginPct, 0)}%</output></div>
          <input class="margin-range" id="marginRange" type="range" min="10" max="100" step="5" value="${clamp(Number(draft.marginPct) || 100, 10, 100)}" data-draft="marginPct" aria-label="保证金占现金比例">
          <div class="field-line" style="margin-top:10px"><span>自定义购入数量 <em class="field-line-hint" data-qty-unit>${unitFor()}</em></span><span class="mini-tag">留空自动</span></div>
          <div class="qty-row">
            <input id="qtyInput" type="number" inputmode="decimal" min="0" step="any" data-draft="quantity" value="${esc(draft.quantity)}" placeholder="${qtyPlaceholder}" aria-label="自定义购入数量">
            <button class="text-btn" type="button" data-action="auto-qty">${hardware ? '默认 100' : '自动'}</button>
          </div>
          <div id="qtyHint" class="qty-hint">${qtyDefaultHint}</div>
          <div class="preview-grid">
            <div class="preview-cell"><span>名义仓位</span><b data-plan="notional">—</b></div>
            <div class="preview-cell"><span>融资负债</span><b data-plan="loan">—</b></div>
            <div class="preview-cell"><span>开仓维持担保</span><b data-plan="ratio">—</b></div>
            <div class="preview-cell"><span>预估强平价</span><b data-plan="liq">—</b></div>
            <div class="preview-cell"><span>保证金占用</span><b data-plan="margin">—</b></div>
            <div class="preview-cell"><span>购入数量</span><b data-plan="qty">—</b></div>
          </div>
          <div id="levWarning" class="lev-warning"></div>
          <div class="risk-foot">
            <span class="hint">维持担保 &lt; 130% 强平</span>
            <button class="text-btn danger" type="button" data-action="demo-liq">试爆一次 →</button>
          </div>
          <div class="section-note">杠杆越高，预估强平价越靠近现价。输入 4.4× 以上，你可能会在开仓当天看到烟花。</div>
        </div>
      </section>
    `;
  }

  function positionPanelHTML() {
    if (!state.position) return '';
    const pos = state.position;
    const plan = pos.plan;
    const m = liveMetrics();
    const pnlClass = m.pnl >= 0 ? 'up' : 'down';
    const distance = m.liqPrice ? ((m.liqPrice / currentPrice()) - 1) * 100 : 0;
    return `
      <section class="panel position-panel">
        <div class="panel-head"><h3>当前持仓</h3><span class="mini-tag hot">持仓中</span></div>
        <div class="panel-body">
          <div class="pos-head">
            <div class="pos-name"><b>${esc(state.order.stockName)}</b><span>${state.order.stockCode} · 成本 ${fmtPrice(plan.price, plan.stockIndex)} · ${fmtQty(plan.quantity)} ${plan.unit}</span></div>
            <div class="pos-leverage">${fmtLeverage(plan.leverage)}×</div>
          </div>
          <div class="pos-pnl"><b class="${pnlClass}">${fmtSignedMoney(m.pnl)}</b><span class="${pnlClass}">${fmtPct(m.pnlPct)}</span><span class="dim">市值 ${fmtMoney(m.marketValue)}</span></div>
          <div class="pos-grid">
            <div class="pos-cell"><span>融资负债</span><b>${m.debt > 0 ? fmtMoney(m.debt) : '无'}</b></div>
            <div class="pos-cell"><span>利息成本</span><b>${m.interest > 0 ? fmtMoney(m.interest) : '—'}</b></div>
            <div class="pos-cell"><span>强平价</span><b class="${plan.loan > 0 && m.liqPrice > 0 ? 'danger' : ''}">${plan.loan > 0 ? (m.liqPrice > 0 ? fmtPrice(m.liqPrice, plan.stockIndex) : '不会强平') : '—'}</b></div>
            <div class="pos-cell"><span>距强平</span><b class="${plan.loan > 0 && m.liqPrice > 0 && distance > -10 ? 'danger' : ''}">${plan.loan > 0 ? (m.liqPrice > 0 ? fmtPct(distance) : '安全垫充足') : '无负债'}</b></div>
          </div>
        </div>
      </section>
    `;
  }

  function timePanelHTML() {
    if (!state.position) return '';
    const disabled = state.busy ? 'disabled' : '';
    return `
      <section class="panel time-machine">
        <div class="panel-head"><h3>时间机器</h3><span class="mini-tag">${currentBar()[0]}</span></div>
        <div class="panel-body">
          <div class="tm-date"><b>第 ${currentDayNumber()} 个交易日</b><span>${state.order.journal.holdingDays} 日计划</span></div>
          <div class="auto-play ${state.autoRunning ? 'on' : ''}">
            <div class="auto-info"><span class="auto-pulse"></span>${state.autoRunning ? '自动播放中' : '已暂停'} <b>${state.autoSpeed}×</b></div>
            <div class="auto-controls">
              <div class="speed-group" role="group" aria-label="时间流速">
                <button class="speed-btn ${state.autoSpeed === 1 ? 'active' : ''}" type="button" data-action="auto-speed" data-speed="1">1×</button>
                <button class="speed-btn ${state.autoSpeed === 2 ? 'active' : ''}" type="button" data-action="auto-speed" data-speed="2">2×</button>
              </div>
              <button class="btn small" type="button" data-action="toggle-auto">${state.autoRunning ? '暂停' : '继续'}</button>
            </div>
          </div>
          <div class="auto-hint">买入后自动开始 · 点 <b>2×</b> 加倍流速</div>
          <div class="advance-grid">
            <button class="btn primary" type="button" data-action="advance" data-days="1" ${disabled}>推进 1 个交易日</button>
            <button class="btn" type="button" data-action="advance" data-days="5" ${disabled}>+5 日</button>
            <button class="btn" type="button" data-action="advance" data-days="20" ${disabled}>+20 日</button>
            <button class="btn danger" type="button" data-action="close-position" ${disabled}>平仓</button>
          </div>
          <div class="advance-note"><span>每次推进都会计息</span><b>${state.position.plan.loan > 0 ? (liveMetrics().liqPrice > 0 ? `强平线 ${fmtPrice(liveMetrics().liqPrice, state.position.plan.stockIndex)}` : '不会强平') : '无融资负债'}</b></div>
          <div class="section-note">时间机器不会倒带。触发强平后，本局立即结算。</div>
        </div>
      </section>
    `;
  }

  function overPanelHTML() {
    const info = state.exitInfo;
    return `
      <section class="panel over-panel">
        <h3>${state.liquidated ? '本局已被强制平仓' : '本局已经结束'}</h3>
        <p>${state.liquidated ? '系统替你做了最后一次卖出。好消息是，你不需要再盯盘了。' : '你把选择权留给了自己，而不是强平线。'}去看看过程分，它不随盈亏变化。</p>
        <div class="over-actions">
          <button class="btn primary" type="button" data-action="tab" data-tab="review">查看复盘</button>
          <button class="btn" type="button" data-action="restart">重新开局</button>
        </div>
        <div class="section-note">结算于 ${info ? info.exitDate : '—'} · ${info ? fmtPct(info.returnPct) : '—'}</div>
      </section>
    `;
  }

  /* ---------------- 预览值 / 表单状态 ---------------- */
  function updatePlanPreview() {
    const plan = planFromDraft();
    const error = Boolean(plan.error);
    $$('[data-plan]').forEach((el) => {
      const key = el.dataset.plan;
      if (error) {
        el.textContent = '—';
        el.classList.remove('danger', 'ok');
        return;
      }
      if (key === 'notional') el.textContent = fmtMoney(plan.notional);
      if (key === 'loan') el.textContent = plan.loan > 0 ? fmtMoney(plan.loan) : '无';
      if (key === 'ratio') {
        el.textContent = Number.isFinite(plan.ratio) ? plan.ratio.toFixed(1) + '%' : '无负债';
        el.classList.toggle('danger', Number.isFinite(plan.ratio) && plan.ratio < MAINTENANCE_LINE);
        el.classList.toggle('ok', !Number.isFinite(plan.ratio) || plan.ratio > 300);
      }
      if (key === 'liq') {
        el.textContent = plan.loan > 0
          ? (plan.liqPrice > 0 ? fmtPrice(plan.liqPrice, plan.stockIndex) : '不会强平')
          : '—';
        el.classList.toggle('danger', plan.immediate || plan.liqPrice > 0 && plan.loan > 0 && plan.liqPrice / plan.price < 1.08);
      }
      if (key === 'margin') el.textContent = fmtMoney(plan.margin);
      if (key === 'qty') el.textContent = `${fmtQty(plan.quantity)} ${plan.unit}`;
    });

    const warning = $('#levWarning');
    if (warning) {
      warning.classList.remove('show');
      if (error) {
        warning.innerHTML = `<b>参数无效。</b>${esc(plan.error)}`;
        warning.classList.add('show');
      } else if (plan.immediate) {
        warning.innerHTML = `<b>开仓即爆。</b>维持担保比例约为 ${plan.ratio.toFixed(1)}%，已经低于 130%。系统不会拦你，只会立刻执行强制平仓。`;
        warning.classList.add('show');
      }
    }

    const ackWrap = $('#ackWrap');
    if (ackWrap) {
      const needed = !error && plan.immediate;
      ackWrap.classList.toggle('hide', !needed);
      if (needed && !draft.ack) {
        // 保持未勾选，让用户自己确认。
      }
    }

    const slider = $('#levSlider');
    if (slider && document.activeElement !== slider) {
      slider.value = String(clamp(Number(draft.leverage) || 1, 1, 20));
    }
    const input = $('#levInput');
    if (input && document.activeElement !== input) {
      input.value = String(draft.leverage);
    }
    $$('.lev-preset').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.preset) === Number(draft.leverage));
    });
    const marginLabel = $('#marginPctLabel');
    if (marginLabel) marginLabel.textContent = `${fmtPlain(draft.marginPct, 0)}%`;
    const qtyUnit = $('[data-qty-unit]');
    if (qtyUnit) qtyUnit.textContent = unitFor();
    const qtyInput = $('#qtyInput');
    if (qtyInput && document.activeElement !== qtyInput) qtyInput.value = draft.quantity == null ? '' : String(draft.quantity);
    const marginRange = $('#marginRange');
    if (marginRange) {
      const typedQty = Boolean(String(draft.quantity == null ? '' : draft.quantity).trim());
      marginRange.disabled = typedQty || currentStock().group === 'hardware';
    }
    const qtyHint = $('#qtyHint');
    if (qtyHint) {
      qtyHint.classList.toggle('bad', error);
      if (error) qtyHint.textContent = plan.error;
      else if (plan.manualQty) qtyHint.textContent = `${plan.defaultQty ? '默认数量' : '手动数量'} ${fmtQty(plan.quantity)} ${plan.unit} · 占用保证金 ${fmtMoney(plan.margin)}（${plan.marginPct.toFixed(1)}%）`;
      else qtyHint.textContent = `自动约 ${fmtQty(plan.shares)} ${plan.unit} · 留空按保证金比例计算`;
    }
    const heroLeverage = $('#heroLeverage');
    if (heroLeverage) heroLeverage.textContent = error ? '—' : fmtLeverage(draft.leverage);
    updateSubmitState();
  }

  function updateSubmitState() {
    const btn = $('#submitOrder');
    if (!btn) return;
    const plan = planFromDraft();
    const journal = readJournal();
    const ackNeeded = !plan.error && plan.immediate;
    const reasonOk = journal.reason.length >= 8;
    const stopOk = journal.stopLoss > 0 && journal.stopLoss < 100;
    let hint = '';
    let disabled = false;
    if (plan.error) {
      hint = plan.error;
      disabled = true;
    } else if (!reasonOk) {
      hint = `再写 ${Math.max(0, 8 - journal.reason.length)} 个字，把买入理由说清楚。`;
      disabled = true;
    } else if (!stopOk) {
      hint = '止损线不能为空，也别写 100%。';
      disabled = true;
    } else if (ackNeeded && !draft.ack) {
      hint = '勾选风险确认后，才能提交这场必输的实验。';
      disabled = true;
    } else {
      hint = '提交后决策会被锁定，时间自动开始流动，并推演 1000 条平行时间线。';
    }
    btn.disabled = disabled;
    const hintEl = $('#submitHint');
    if (hintEl) {
      hintEl.innerHTML = `${esc(hint)}<br>${plan.error ? '杠杆可以无上限，但数学有。' : '买入后自动播放，可随时暂停或切 2× 流速。'}`;
    }
  }

  function updateReasonCount() {
    const count = $('#reasonCount');
    if (count) count.textContent = `${String(draft.reason || '').length} / 320`;
  }

  /* ---------------- 指标图 ---------------- */
  function scheduleChart() {
    if (chartFrame) return;
    chartFrame = requestAnimationFrame(() => {
      chartFrame = 0;
      drawChart();
    });
  }

  function drawChart() {
    const canvas = $('#chart');
    const box = $('#chartBox');
    if (!canvas || !box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const bars = currentBars();
    if (!bars.length) return;
    const end = clamp(state.cursor, 0, bars.length - 1);
    const start = Math.max(0, end - 108);
    const slice = bars.slice(start, end + 1);
    if (!slice.length) return;

    const pad = { l: 12, r: 68, t: 19, b: 30 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    if (plotW < 10 || plotH < 10) return;

    let min = Math.min(...slice.map((b) => b[4]));
    let max = Math.max(...slice.map((b) => b[3]));
    const plan = state.order ? state.order.plan : null;
    const digits = plan && Number.isFinite(plan.digits) ? plan.digits : digitsFor(state.stockIndex);
    const activeMetrics = state.position ? liveMetrics() : null;
    const entryPrice = plan ? plan.price : null;
    const liqPrice = activeMetrics ? activeMetrics.liqPrice : (state.exitInfo ? state.exitInfo.liqPrice : null);
    const stopPrice = plan && plan.stopPrice > 0 ? plan.stopPrice : null;
    const range = Math.max(0.0001, max - min);
    const includeLine = (value) => {
      if (!Number.isFinite(value) || value <= 0) return;
      if (value >= min - range * 0.12 && value <= max + range * 0.12) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    };
    includeLine(entryPrice);
    includeLine(liqPrice);
    includeLine(stopPrice);
    const padPrice = Math.max((max - min) * 0.1, max * 0.0025);
    min -= padPrice;
    max += padPrice;
    if (max <= min) { max += 1; min -= 1; }

    const xAt = (i) => pad.l + (i / Math.max(1, slice.length - 1)) * plotW;
    const yAt = (v) => pad.t + ((max - v) / (max - min)) * plotH;
    const step = plotW / Math.max(1, slice.length - 1);
    const candleW = clamp(step * 0.62, 1.8, 9);

    // 背景网格
    ctx.lineWidth = 1;
    ctx.font = '9px "SFMono-Regular", Consolas, monospace';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i += 1) {
      const y = pad.t + (i / 4) * plotH;
      ctx.strokeStyle = i === 4 ? COLORS.gridStrong : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, y + 0.5);
      ctx.lineTo(pad.l + plotW, y + 0.5);
      ctx.stroke();
      const value = max - ((max - min) * i) / 4;
      ctx.fillStyle = COLORS.dim;
      ctx.textAlign = 'left';
      ctx.fillText(fmtPlain(value, digits), pad.l + plotW + 9, y);
    }
    for (let i = 0; i <= 3; i += 1) {
      const x = pad.l + (i / 3) * plotW;
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, pad.t);
      ctx.lineTo(x + 0.5, pad.t + plotH);
      ctx.stroke();
    }

    // K 线
    slice.forEach((bar, i) => {
      const x = xAt(i);
      const open = bar[1];
      const close = bar[2];
      const high = bar[3];
      const low = bar[4];
      const up = close >= open;
      const color = up ? COLORS.red : COLORS.green;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, yAt(high));
      ctx.lineTo(x + 0.5, yAt(low));
      ctx.stroke();
      const bodyTop = yAt(Math.max(open, close));
      const bodyBottom = yAt(Math.min(open, close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);
      if (up) {
        ctx.strokeStyle = color;
        ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
      } else {
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }
      ctx.globalAlpha = 1;
    });

    // 横向价格线
    const last = slice[slice.length - 1];
    const lastClose = last[2];
    const overlapsLast = (value) => Number.isFinite(value) && Math.abs(value - lastClose) / lastClose < 0.007;
    const drawHLine = (value, color, dash, label, labelBg, showTag = true) => {
      if (!Number.isFinite(value) || value <= 0) return;
      const y = yAt(value);
      if (y < pad.t - 1 || y > pad.t + plotH + 1) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(pad.l, y + 0.5);
      ctx.lineTo(pad.l + plotW, y + 0.5);
      ctx.stroke();
      ctx.restore();
      if (!showTag) return;
      const tagY = clamp(y, pad.t + 8, pad.t + plotH - 8);
      ctx.font = '9px "SFMono-Regular", Consolas, monospace';
      const textW = ctx.measureText(label).width;
      const tagW = textW + 12;
      const tagX = width - 4 - tagW;
      ctx.fillStyle = labelBg;
      roundRect(ctx, tagX, tagY - 8, tagW, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, tagX + tagW / 2, tagY + 0.5);
    };

    drawHLine(entryPrice, 'rgba(247,200,115,.8)', [5, 4], `成本 ${fmtPlain(entryPrice, digits)}`, 'rgba(137,103,42,.92)', !overlapsLast(entryPrice));
    drawHLine(stopPrice, 'rgba(255,157,92,.6)', [2, 4], `止损 ${fmtPlain(stopPrice, digits)}`, 'rgba(121,73,38,.9)', !overlapsLast(stopPrice));
    drawHLine(liqPrice, 'rgba(255,46,77,.9)', [4, 3], `强平 ${fmtPlain(liqPrice, digits)}`, 'rgba(145,24,41,.94)', !overlapsLast(liqPrice));

    // 当前价 / 最新价
    const lastY = yAt(last[2]);
    const lastUp = last[2] >= last[1];
    const lastColor = lastUp ? COLORS.red : COLORS.green;
    ctx.save();
    ctx.strokeStyle = lastColor;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, lastY + 0.5);
    ctx.lineTo(pad.l + plotW, lastY + 0.5);
    ctx.stroke();
    ctx.restore();
    const lastLabel = fmtPlain(last[2], digits);
    ctx.font = '10px "SFMono-Regular", Consolas, monospace';
    const labelW = ctx.measureText(lastLabel).width + 14;
    const labelX = width - 4 - labelW;
    ctx.fillStyle = lastColor;
    roundRect(ctx, labelX, lastY - 9, labelW, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.textAlign = 'center';
    ctx.fillText(lastLabel, labelX + labelW / 2, lastY + 0.5);

    // 入场 / 离场标记
    const entryDate = state.order ? state.order.entryDate : null;
    const exitDate = state.exitInfo ? state.exitInfo.exitDate : null;
    const findSliceIndex = (dateText) => {
      if (!dateText) return -1;
      for (let i = 0; i < slice.length; i += 1) {
        if (slice[i][0] === dateText) return i;
      }
      return -1;
    };
    const entryIndex = findSliceIndex(entryDate);
    if (entryIndex >= 0) {
      const x = xAt(entryIndex);
      ctx.strokeStyle = 'rgba(247,200,115,.24)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, pad.t);
      ctx.lineTo(x + 0.5, pad.t + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.amber;
      ctx.beginPath();
      ctx.moveTo(x, pad.t + 3);
      ctx.lineTo(x + 6, pad.t + 9);
      ctx.lineTo(x - 6, pad.t + 9);
      ctx.closePath();
      ctx.fill();
    }
    const exitIndex = findSliceIndex(exitDate);
    if (exitIndex >= 0) {
      const x = xAt(exitIndex);
      const color = state.liquidated ? COLORS.red2 : COLORS.amber;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, pad.t);
      ctx.lineTo(x + 0.5, pad.t + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, yAt(slice[exitIndex][2]), 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.font = '8px "SFMono-Regular", Consolas, monospace';
      ctx.textAlign = x > width - pad.r - 40 ? 'right' : 'left';
      ctx.fillText(state.liquidated ? '强平' : '平仓', x + (x > width - pad.r - 40 ? -6 : 6), yAt(slice[exitIndex][2]) - 9);
    }

    // 日期标签
    const xLabelIndices = [0, Math.floor((slice.length - 1) / 3), Math.floor(((slice.length - 1) * 2) / 3), slice.length - 1];
    xLabelIndices.forEach((i, idx) => {
      if (i < 0 || i >= slice.length) return;
      ctx.font = '8.5px "SFMono-Regular", Consolas, monospace';
      ctx.fillStyle = COLORS.dim;
      ctx.textAlign = idx === 0 ? 'left' : idx === xLabelIndices.length - 1 ? 'right' : 'center';
      ctx.fillText(slice[i][0].slice(2), xAt(i), height - 12);
    });

    // 悬停十字线
    if (ui.hoverIndex != null) {
      const hi = ui.hoverIndex - start;
      if (hi >= 0 && hi < slice.length) {
        const x = xAt(hi);
        const y = yAt(slice[hi][2]);
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, pad.t);
        ctx.lineTo(x + 0.5, pad.t + plotH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad.l, y + 0.5);
        ctx.lineTo(pad.l + plotW, y + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 水印
    ctx.save();
    ctx.font = '600 10px "SFMono-Regular", Consolas, monospace';
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.textAlign = 'left';
    ctx.fillText('HISTORY DOES NOT REPEAT, BUT HUMAN NATURE DOES.', pad.l, pad.t + 3);
    ctx.restore();

    chartGeom = {
      start,
      end,
      slice,
      pad,
      plotW,
      plotH,
      step,
      min,
      max,
      xAt,
      yAt
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function onChartMove(event) {
    if (!chartGeom) return;
    const canvas = $('#chart');
    const box = $('#chartBox');
    const tip = $('#chartTip');
    if (!canvas || !box || !tip) return;
    const rect = box.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const g = chartGeom;
    if (x < g.pad.l - 10 || x > g.pad.l + g.plotW + 8 || y < 0 || y > rect.height) {
      hideChartTip();
      return;
    }
    const rel = Math.round((x - g.pad.l) / Math.max(1, g.step));
    const idx = clamp(rel, 0, g.slice.length - 1);
    const abs = g.start + idx;
    if (abs > state.cursor) { hideChartTip(); return; }
    ui.hoverIndex = abs;
    const bar = g.slice[idx];
    const prev = currentBars()[Math.max(0, abs - 1)][2];
    const pct = prev ? ((bar[2] - prev) / prev) * 100 : 0;
    tip.innerHTML = `
      <div class="tt-date">${bar[0]}</div>
      <div class="tt-row"><span>开</span><b>${fmtPlain(bar[1], digitsFor(state.stockIndex))}</b></div>
      <div class="tt-row"><span>高</span><b class="up">${fmtPlain(bar[3], digitsFor(state.stockIndex))}</b></div>
      <div class="tt-row"><span>低</span><b class="down">${fmtPlain(bar[4], digitsFor(state.stockIndex))}</b></div>
      <div class="tt-row"><span>收</span><b class="${changeClass(pct)}">${fmtPlain(bar[2], digitsFor(state.stockIndex))} · ${fmtPct(pct)}</b></div>
      <div class="tt-row"><span>量</span><b>${fmtVolume(bar[5])}</b></div>
    `;
    const tipW = 154;
    const left = clamp(x + 16, 8, rect.width - tipW - 8);
    const top = clamp(y - 58, 8, rect.height - 128);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.classList.add('on');
    drawChart();
  }

  function hideChartTip() {
    const tip = $('#chartTip');
    if (tip) tip.classList.remove('on');
    if (ui.hoverIndex != null) {
      ui.hoverIndex = null;
      drawChart();
    }
  }

  function drawMcCharts() {
    if (ui.tab !== 'sim' || !state.order) return;
    drawMcHistogram();
    drawMcFan();
  }

  function setupCanvas(canvas) {
    if (!canvas) return null;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width < 20) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawMcHistogram() {
    const canvas = $('#mcHist');
    if (!canvas || !state.order) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const mc = state.order.mc;
    const pad = { l: 8, r: 8, t: 13, b: 22 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    const bins = 24;
    const counts = new Array(bins).fill(0);
    const liqCounts = new Array(bins).fill(0);
    mc.returns.forEach((r, i) => {
      const rr = clamp(r, -100, 100);
      const idx = clamp(Math.floor(((rr + 100) / 200) * bins), 0, bins - 1);
      counts[idx] += 1;
      if (mc.liqFlags[i]) liqCounts[idx] += 1;
    });
    const maxCount = Math.max(1, ...counts);
    const barW = plotW / bins;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i += 1) {
      const y = pad.t + (i / 2) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.l, y + 0.5);
      ctx.lineTo(pad.l + plotW, y + 0.5);
      ctx.stroke();
    }
    counts.forEach((count, i) => {
      const x = pad.l + i * barW;
      const h = (count / maxCount) * plotH;
      const y = pad.t + plotH - h;
      const mid = -100 + ((i + 0.5) / bins) * 200;
      ctx.fillStyle = mid < 0 ? 'rgba(255,91,110,.34)' : 'rgba(43,217,163,.34)';
      ctx.fillRect(x + 1, y, Math.max(1, barW - 2), h);
      if (liqCounts[i] > 0) {
        const lh = (liqCounts[i] / maxCount) * plotH;
        ctx.fillStyle = 'rgba(255,46,77,.82)';
        ctx.fillRect(x + 1, pad.t + plotH - lh, Math.max(1, barW - 2), lh);
      }
    });
    const zeroX = pad.l + (0.5 * plotW);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(zeroX + 0.5, pad.t);
    ctx.lineTo(zeroX + 0.5, pad.t + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '8px "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${sliderLabel(state.order.mc.stats.worst)}`, pad.l, 8);
    ctx.textAlign = 'right';
    ctx.fillText(`+${fmtPlain(state.order.mc.stats.best, 0)}%`, width - pad.r, 8);
    ctx.textAlign = 'center';
    [-100, -50, 0, 50, 100].forEach((v) => {
      const x = pad.l + ((v + 100) / 200) * plotW;
      ctx.fillText((v > 0 ? '+' : '') + v + '%', x, height - 7);
    });
  }

  function sliderLabel(v) {
    return `${fmtPlain(v, 0)}%`;
  }

  function drawMcFan() {
    const canvas = $('#mcFan');
    if (!canvas || !state.order) return;
    const setup = setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const mc = state.order.mc;
    const samples = mc.samples || [];
    const pad = { l: 24, r: 10, t: 12, b: 20 };
    const plotW = width - pad.l - pad.r;
    const plotH = height - pad.t - pad.b;
    ctx.clearRect(0, 0, width, height);
    if (!samples.length) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '10px "SFMono-Regular", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('无融资负债，不存在强平路径', width / 2, height / 2);
      return;
    }
    let maxRatio = 180;
    samples.forEach((s) => {
      s.ratios.forEach((r) => {
        if (Number.isFinite(r)) maxRatio = Math.max(maxRatio, r);
      });
    });
    maxRatio = Math.min(maxRatio, 360);
    const horizon = Math.max(1, mc.horizon);
    const xAt = (d) => pad.l + (d / horizon) * plotW;
    const yAt = (r) => pad.t + ((maxRatio - clamp(r, 0, maxRatio)) / maxRatio) * plotH;

    [0, 100, 130, 200, 300].forEach((tick) => {
      if (tick > maxRatio + 20) return;
      const y = yAt(tick);
      ctx.strokeStyle = tick === 130 ? 'rgba(255,46,77,.55)' : COLORS.grid;
      ctx.setLineDash(tick === 130 ? [3, 3] : []);
      ctx.beginPath();
      ctx.moveTo(pad.l, y + 0.5);
      ctx.lineTo(pad.l + plotW, y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tick === 130 ? 'rgba(255,145,159,.8)' : COLORS.dim;
      ctx.font = '7.5px "SFMono-Regular", Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${tick}%`, pad.l - 4, y + 0.5);
    });

    samples.forEach((sample) => {
      const ratios = sample.ratios;
      if (ratios.length < 2) return;
      ctx.strokeStyle = sample.liq ? 'rgba(255,70,95,.22)' : 'rgba(120,200,180,.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ratios.forEach((r, d) => {
        const x = xAt(d);
        const y = yAt(r);
        if (d === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      if (sample.liq) {
        const last = ratios[ratios.length - 1];
        ctx.fillStyle = 'rgba(255,70,95,.55)';
        ctx.beginPath();
        ctx.arc(xAt(ratios.length - 1), yAt(last), 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 样本中位路径
    const medians = [];
    for (let d = 0; d <= horizon; d += 1) {
      const values = samples.map((s) => s.ratios[d]).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
      if (!values.length) continue;
      medians.push(values[Math.floor((values.length - 1) / 2)]);
    }
    if (medians.length > 1) {
      ctx.strokeStyle = 'rgba(247,200,115,.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      medians.forEach((r, d) => {
        if (d === 0) ctx.moveTo(xAt(d), yAt(r));
        else ctx.lineTo(xAt(d), yAt(r));
      });
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,145,159,.9)';
    ctx.font = '7.5px "SFMono-Regular", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('强平线 130%', pad.l + 4, yAt(130) - 3);
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`T+${horizon}`, pad.l + plotW - 20, height - 3);
  }

  /* ---------------- 特效 / 音效 ---------------- */
  function playLiquidationFx(info, demo = false) {
    if (state.fxPlaying) cleanupFx();
    state.fxPlaying = true;
    state.demoFx = demo;
    pendingLiqInfo = info;
    pendingLiqDemo = demo;
    hideMood();
    hideLiqManual();
    closeModal();
    const layer = $('#fxLayer');
    const app = $('#app');
    if (!layer || !app) return;
    const memeBg = $('#liqMemeBg');
    const memeSrc = MARKET.meta && MARKET.meta.memes && MARKET.meta.memes.liquidation;
    if (memeBg) memeBg.style.backgroundImage = memeSrc ? `url("${memeSrc}")` : 'none';
    const flash = $('.liq-flash', layer);
    const stamp = $('.liq-stamp', layer);
    const ticker = $('.liq-ticker-track span', layer);
    if (ticker) {
      ticker.textContent = `《重演财经》紧急快讯：${esc(info.stockName)} 的一笔 ${fmtLeverage(info.leverage)}× 融资盘触及维持担保比例红线，已被强制平仓。本台记者 复利 现场报道。市场有风险，杠杆会放大风险，也会放大人性。`;
      ticker.style.animation = 'none';
      void ticker.offsetWidth;
      ticker.style.animation = '';
    }
    layer.classList.add('on');
    document.body.style.overflow = 'hidden';
    const carnival = $('.liq-carnival', layer);
    if (carnival) {
      carnival.style.display = 'none';
      void carnival.offsetWidth;
      carnival.style.display = '';
    }
    const caption = $('#fxCarnivalCaption');
    if (caption) {
      const roleId = state.character && state.character.id;
      caption.textContent = roleId === 'sensi'
        ? SENSI_CHANT
        : roleId === 'sam'
          ? SAM_LIQ_CHANT
          : roleId === 'naiwa'
            ? NAIWA_LIQ_CHANT
            : info.highRisk
              ? pick([...CARNIVAL_CAPTIONS, '高风险专区：马戏团 24 小时营业，没有涨跌停。'])
              : pick(CARNIVAL_CAPTIONS);
    }
    if (flash) {
      flash.classList.remove('bang');
      void flash.offsetWidth;
      flash.classList.add('bang');
    }
    if (stamp) {
      stamp.classList.remove('slam');
      void stamp.offsetWidth;
      stamp.classList.add('slam');
    }
    clearTimeout(fxShakeTimer);
    fxShakeTimer = setTimeout(() => app.classList.add('fx-shake'), 30);
    playLiquidationSound();
    if (!state.reducedMotion) startFxParticles();
    clearTimeout(fxModalTimer);
    const delay = state.reducedMotion ? 300 : 1450;
    fxModalTimer = setTimeout(() => {
      if (state.fxPlaying) revealLiqManual(demo);
    }, delay);
  }

  function revealLiqManual(demo) {
    const wrap = $('#liqManual');
    const btn = $('#liqManualBtn');
    if (!wrap || !btn) return;
    btn.textContent = demo ? '查看演示报告 · 手动退出' : '查看结算报告 · 手动退出';
    wrap.classList.add('show');
    btn.focus({ preventScroll: true });
  }

  function hideLiqManual() {
    const wrap = $('#liqManual');
    if (wrap) wrap.classList.remove('show');
  }

  function makeDemoInfo() {
    const stock = currentStock();
    const price = currentPrice();
    const lev = pick([12, 18, 37, 64, 88, 128]);
    const entry = price * (1 + 0.02 + Math.random() * 0.08);
    const exit = entry * (1 - (0.08 + Math.random() * 0.16));
    const capital = state.startingCapital || START_CAPITAL;
    const lossPct = 0.35 + Math.random() * 0.48;
    const pnl = -capital * lossPct;
    return {
      demo: true,
      kind: 'liq',
      reason: '演示模式：维持担保比例跌破 130%',
      stockName: stock.name,
      stockCode: stock.code,
      stockIndex: state.stockIndex,
      digits: digitsFor(state.stockIndex),
      highRisk: Boolean(stock.highRisk),
      leverage: lev,
      capital,
      entryDate: currentBar()[0],
      exitDate: currentBar()[0],
      entryPrice: entry,
      exitPrice: exit,
      debt: capital * (lev - 1) * 0.7,
      interest: capital * 0.004 * Math.random(),
      fees: capital * 0.0012,
      ratio: 127.1 + Math.random() * 2.7,
      liqPrice: exit,
      daysHeld: 1 + Math.floor(Math.random() * 11),
      pnl,
      returnPct: (pnl / capital) * 100,
      cashAfter: Math.max(0, capital + pnl),
      owed: 0,
      minRatio: 120 + Math.random() * 8,
      maxRatio: 180 + Math.random() * 70,
      stopLoss: 12,
      stopHit: false,
      unleveredReturnPct: ((exit / entry) - 1) * 100,
      horizonReturnPct: (Math.random() * 0.3 - 0.08) * 100,
      horizonDays: 20,
      horizonDate: currentBar()[0],
      horizonPrice: exit
    };
  }

  function startDemoLiquidation() {
    if (state.fxPlaying) return;
    closeModal();
    const info = makeDemoInfo();
    showToast('特效演示 · 不会影响你的账户', 'warn');
    setTimeout(() => playLiquidationFx(info, true), 160);
  }

  function showLiqModal(info, demo) {
    hideLiqManual();
    const app = $('#app');
    if (app) app.classList.remove('fx-shake');
    const lossText = info.pnl < 0 ? fmtMoney(info.pnl) : fmtSignedMoney(info.pnl);
    const pctText = fmtPct(info.returnPct);
    const sensi = state.character && state.character.id === 'sensi';
    const sam = state.character && state.character.id === 'sam';
    const naiwa = state.character && state.character.id === 'naiwa';
    const instant = !demo && info.daysHeld === 0;
    const title = demo
      ? '这是一场预演。真正的爆仓，账户会疼。'
      : instant
        ? '开仓即爆。你甚至没来得及输给行情。'
        : pick(LIQ_TITLES);
    const joke = demo
      ? '演示模式：烟花免费，真实市场里这些数字会从你的账户里扣。'
      : instant
        ? '你付了一笔手续费，买了一张「强制平仓体验券」。仓位没了，保证金还在。'
        : pick(LIQ_JOKES);
    const cf = Number.isFinite(info.unleveredReturnPct)
      ? `同样的标的，如果只用了 1× 杠杆，这段行情本身带来的账户变化约为 ${fmtPct(info.unleveredReturnPct)}。`
      : '';
    const horizon = Number.isFinite(info.horizonReturnPct) && info.horizonDays > 0
      ? `如果没加杠杆，并按原计划持有到第 ${info.horizonDays} 个交易日，收益是 ${fmtPct(info.horizonReturnPct)}。`
      : '';
    const ratioText = Number.isFinite(info.ratio) ? `${info.ratio.toFixed(1)}%` : '无负债';
    const owedLine = info.owed > 0 ? `<div><span>穿仓金额</span><b>${fmtMoney(info.owed)}</b></div>` : '';
    const modal = `
      <div class="liq-modal-backdrop">
        <div class="liq-report" role="dialog" aria-modal="true" aria-labelledby="liqTitle">
          <div class="liq-report-top">
            <span class="lr-kicker">${demo ? 'DEMO / FIREWORKS PREVIEW' : info.highRisk ? 'HIGH RISK / MARGIN CALL' : 'MARGIN CALL / FORCED LIQUIDATION'}</span>
            <span class="lr-no">${demo ? '<span class="liq-demo-tag">特效演示</span>' : `NO. ${esc(info.exitDate)} / ${esc(info.stockCode)}`}</span>
          </div>
          <div class="liq-report-body">
            <h2 class="lr-title" id="liqTitle">${esc(title)}</h2>
            <p class="lr-sub">${esc(info.stockName)}${info.highRisk ? ' · 高风险专区' : ''} · ${esc(info.entryDate)} 开仓 → ${esc(info.exitDate)} 结算 · 杠杆 ${fmtLeverage(info.leverage)}×</p>
            ${sensi ? `<div class="sensi-liq-chant">${SENSI_CHANT}</div>` : ''}
            ${sam ? `<div class="sam-liq-chant">${SAM_LIQ_CHANT}</div>` : ''}
            ${naiwa ? `<div class="naiwa-liq-chant">${NAIWA_LIQ_CHANT}</div>` : ''}
            <div class="lr-loss">
              <b>${lossText}</b>
              <span>账户收益率</span>
              <em>${pctText}</em>
            </div>
            <div class="lr-grid">
              <div><span>使用杠杆</span><b>${fmtLeverage(info.leverage)}×</b></div>
              <div><span>持仓天数</span><b>${info.daysHeld} 日</b></div>
              <div><span>结算维持担保</span><b>${ratioText}</b></div>
              <div><span>结算价</span><b>${fmtPriceDigits(info.exitPrice, info.digits)}</b></div>
              <div><span>融资利息</span><b>${fmtMoney(info.interest)}</b></div>
              <div><span>交易费用</span><b>${fmtMoney(info.fees)}</b></div>
              <div><span>结算后余额</span><b>${fmtMoney(info.cashAfter)}</b></div>
              ${owedLine || '<div><span>账户状态</span><b>已强制结算</b></div>'}
            </div>
            <div class="lr-quote"><b>${esc(joke)}</b><br>${esc(cf)}</div>
            ${horizon ? `<div class="lr-cf">${esc(horizon)}这也是为什么：方向对，不等于你能赚到。</div>` : ''}
            <div class="lr-cf">场外花絮：三只晴天娃娃集体祈祷失败，一位空中飞人完成了本局唯一的高难度动作。${info.highRisk ? '高风险专区的观众表示：下次还敢。' : ''}</div>
            ${demo ? '<div class="lr-cf">这是一次特效演示，没有动用你的真实模拟账户。真正的爆仓会在你点击“提交决策”之后发生。</div>' : '<div class="lr-cf">结算已经完成。你可以去复盘看看：这一次是判断错了，还是杠杆太高了。</div>'}
            <div class="lr-manual-note">结算已暂停 · 这个界面不会自动关闭，需要你手动选择下一步</div>
          </div>
          <div class="lr-actions">
            ${demo
              ? '<button class="btn danger" type="button" data-action="demo-again">再炸一次</button><button class="btn primary" type="button" data-action="demo-close">手动退出 · 回到市场</button>'
              : '<button class="btn danger" type="button" data-action="liq-review">手动退出 · 看复盘</button><button class="btn primary" type="button" data-action="liq-restart">手动退出 · 重新开局</button>'}
          </div>
        </div>
      </div>
    `;
    const root = $('#modalRoot');
    root.innerHTML = modal;
    document.body.style.overflow = 'hidden';
    playStamp();
    setTimeout(() => {
      const btn = root.querySelector('.lr-actions .btn');
      if (btn) btn.focus({ preventScroll: true });
    }, 50);
  }

  function cleanupFx() {
    const layer = $('#fxLayer');
    if (layer) layer.classList.remove('on');
    const app = $('#app');
    if (app) app.classList.remove('fx-shake');
    if (fxRaf) {
      cancelAnimationFrame(fxRaf);
      fxRaf = 0;
    }
    clearTimeout(fxModalTimer);
    clearTimeout(fxShakeTimer);
    const canvas = $('#fxCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const liqBackdrop = $('.liq-modal-backdrop');
    if (liqBackdrop) liqBackdrop.remove();
    hideLiqManual();
    pendingLiqInfo = null;
    pendingLiqDemo = false;
    if (state.fxPlaying) document.body.style.overflow = '';
    state.fxPlaying = false;
    state.demoFx = false;
  }

  function startFxParticles() {
    const canvas = $('#fxCanvas');
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = W * 0.5;
    const cy = H * 0.36;
    const shards = [];
    const bills = [];
    const embers = [];
    const rings = [];
    const crackCount = 7;
    const cracks = [];
    const shardColors = ['#ff3b55', '#ff5b6e', '#f7c873', '#d4d9e4', '#7e8797', '#ffb454'];
    for (let i = 0; i < 118; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 15;
      shards.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.4,
        size: 3 + Math.random() * 13,
        color: pick(shardColors),
        alpha: 0.5 + Math.random() * 0.5,
        w: 1 + Math.random() * 2
      });
    }
    for (let i = 0; i < 32; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 12;
      bills.push({
        x: cx + (Math.random() - 0.5) * 90,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        w: 11 + Math.random() * 14,
        h: 5 + Math.random() * 6,
        alpha: 0.7 + Math.random() * 0.3,
        color: pick(['#7d2030', '#a93845', '#5f5140', '#8d7348'])
      });
    }
    for (let i = 0; i < 70; i += 1) {
      embers.push({
        x: Math.random() * W,
        y: H + Math.random() * 90,
        vx: (Math.random() - 0.5) * 1.6,
        vy: -(0.7 + Math.random() * 2.4),
        size: 0.6 + Math.random() * 2.2,
        alpha: Math.random() * 0.7 + 0.2,
        color: pick(['#ff6e4a', '#ffb454', '#ff3b55', '#fff0d0'])
      });
    }
    rings.push({ r: 20, speed: 34, alpha: 0.9, width: 2 });
    rings.push({ r: 6, speed: 22, alpha: 0.55, width: 1 });
    for (let i = 0; i < crackCount; i += 1) {
      const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.5;
      const points = [{ x: cx, y: cy }];
      let px = cx;
      let py = cy;
      const segments = 5 + Math.floor(Math.random() * 4);
      for (let j = 0; j < segments; j += 1) {
        const len = 30 + Math.random() * 120;
        px += Math.cos(angle + (Math.random() - 0.5) * 0.6) * len;
        py += Math.sin(angle + (Math.random() - 0.5) * 0.6) * len;
        points.push({ x: px, y: py });
      }
      cracks.push(points);
    }

    const start = performance.now();
    function drawBill(bill) {
      ctx.save();
      ctx.translate(bill.x, bill.y);
      ctx.rotate(bill.rot);
      ctx.globalAlpha = bill.alpha;
      ctx.fillStyle = bill.color;
      ctx.fillRect(-bill.w / 2, -bill.h / 2, bill.w, bill.h);
      ctx.strokeStyle = 'rgba(255,240,210,.35)';
      ctx.lineWidth = 0.6;
      ctx.strokeRect(-bill.w / 2, -bill.h / 2, bill.w, bill.h);
      if (bill.w > 17) {
        ctx.fillStyle = 'rgba(255,240,210,.65)';
        ctx.font = '7px "SFMono-Regular", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', 0, 0.5);
      }
      ctx.restore();
    }

    function frame(now) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      // 红色冲击波
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      rings.forEach((ring) => {
        ring.r += ring.speed;
        ring.alpha *= 0.975;
        if (ring.alpha > 0.01) {
          ctx.strokeStyle = `rgba(255,55,80,${ring.alpha})`;
          ctx.lineWidth = ring.width;
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      // 地面裂缝
      if (t < 0.9) {
        const alpha = clamp(1 - t / 0.9, 0, 1);
        ctx.strokeStyle = `rgba(255,210,215,${alpha * 0.9})`;
        ctx.shadowColor = 'rgba(255,40,65,.9)';
        ctx.shadowBlur = 12;
        cracks.forEach((points) => {
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
      }
      // 碎片
      shards.forEach((p) => {
        p.vy += 0.34;
        p.vx *= 0.997;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > H + 60) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha * (p.y > H * 0.8 ? 0.5 : 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(-s * 0.7, -s * 0.25);
        ctx.lineTo(s * 0.8, -s * 0.1);
        ctx.lineTo(s * 0.2, s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
      // 钞票
      bills.forEach((b) => {
        b.vy += 0.15;
        b.vx *= 0.995;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y < H + 50) drawBill(b);
      });
      // 余烬
      ctx.globalCompositeOperation = 'lighter';
      embers.forEach((e) => {
        e.x += e.vx;
        e.y += e.vy;
        e.vy *= 0.998;
        if (e.y < -20) {
          e.y = H + 20;
          e.x = Math.random() * W;
        }
        ctx.globalAlpha = e.alpha * clamp(1 - t / 5, 0, 1);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      if (t < 4.8) fxRaf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    fxRaf = requestAnimationFrame(frame);
  }

  /* ---------------- 音效 ---------------- */
  function ensureAudio() {
    if (state.muted) return null;
    try {
      if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return null;
        audioCtx = new AudioCtor();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch (err) {
      return null;
    }
  }

  function tone(freq, duration, type = 'sine', volume = 0.04, slideTo = null, delay = 0) {
    if (state.muted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.04);
    } catch (err) { /* 音频不可用时保持静默 */ }
  }

  function noiseBurst(duration = 0.7, volume = 0.12) {
    if (state.muted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    } catch (err) { /* 静默失败 */ }
  }

  function playTick() {
    const now = performance.now();
    if (now - lastTickAt < 40) return;
    lastTickAt = now;
    tone(980, 0.035, 'sine', 0.014, 780);
  }
  function playWarn() {
    tone(220, 0.25, 'sawtooth', 0.018, 170);
  }
  function playOrder() {
    tone(440, 0.09, 'triangle', 0.03, 620);
    tone(660, 0.12, 'triangle', 0.025, 880, 0.08);
  }
  function playClose() {
    tone(520, 0.12, 'sine', 0.025, 380);
  }
  function playLiquidationSound() {
    if (state.muted) return;
    // 警报
    for (let i = 0; i < 7; i += 1) {
      tone(i % 2 === 0 ? 620 : 930, 0.16, 'sawtooth', 0.035, null, i * 0.18);
    }
    // 爆炸 + 低音冲击
    noiseBurst(1.15, 0.15);
    tone(90, 1.0, 'sine', 0.16, 32, 0.18);
    tone(48, 0.8, 'sine', 0.11, 26, 0.24);
    // 晴天娃娃 / 空中飞人：八音盒 + 钢丝呼啸
    tone(1046, 0.18, 'sine', 0.014, null, 0.62);
    tone(1318, 0.2, 'sine', 0.012, null, 0.82);
    tone(1568, 0.26, 'sine', 0.011, 2093, 1.02);
    tone(220, 0.55, 'triangle', 0.009, 620, 0.7);
  }
  function playStamp() {
    tone(110, 0.22, 'square', 0.035, 54);
  }
  function toggleSound() {
    state.muted = !state.muted;
    safeStorageSet('replay.muted', state.muted ? '1' : '0');
    if (!state.muted) {
      ensureAudio();
      tone(740, 0.07, 'sine', 0.025);
    }
    renderTopbar();
    showToast(state.muted ? '音效已关闭。' : '音效已打开。', 'warn');
  }

  /* ---------------- 弹窗 / 提示 ---------------- */
  function showMood(direction, pct) {
    const pop = $('#moodPop');
    const img = $('#moodImg');
    if (!pop || !img) return;
    const memes = (MARKET.meta && MARKET.meta.memes) || {};
    const src = direction === 'up' ? memes.up : memes.down;
    if (!src) return;
    pop.classList.remove('show', 'up', 'down');
    void pop.offsetWidth;
    img.src = src;
    img.alt = direction === 'up' ? '上涨表情' : '下跌表情';
    const title = $('#moodTitle');
    const pctEl = $('#moodPct');
    if (title) title.textContent = direction === 'up' ? '涨了' : '跌了';
    if (pctEl) pctEl.textContent = fmtPct(pct);
    pop.classList.add(direction, 'show');
    clearTimeout(moodTimer);
    moodTimer = setTimeout(() => pop.classList.remove('show'), 2050);
  }

  function hideMood() {
    const pop = $('#moodPop');
    if (pop) pop.classList.remove('show', 'up', 'down');
    clearTimeout(moodTimer);
  }

  function scrollToReview() {
    const tabs = $('#tabs');
    if (!tabs) return;
    const top = Math.max(0, tabs.getBoundingClientRect().top + window.scrollY - 78);
    window.scrollTo({ top, behavior: state.reducedMotion ? 'auto' : 'smooth' });
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.className = '';
    if (type) toast.classList.add(type);
    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.classList.add('on');
    });
    toastTimer = setTimeout(() => {
      toast.classList.remove('on');
    }, 3200);
  }

  function openModal(html) {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-backdrop">${html}</div>`;
    document.body.style.overflow = 'hidden';
    const backdrop = root.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) closeModal();
      });
    }
  }

  function closeModal() {
    const root = $('#modalRoot');
    if (!root) return;
    root.innerHTML = '';
    if (!state.fxPlaying) document.body.style.overflow = '';
    pendingConfirm = null;
  }

  function openConfirm(title, body, confirmLabel, onConfirm) {
    pendingConfirm = onConfirm;
    openModal(`
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>${esc(title)}</h2><p>这一步不能撤销。</p></div>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <p>${body}</p>
        <div class="modal-actions">
          <button class="btn" type="button" data-action="close-modal">再想想</button>
          <button class="btn danger" type="button" data-action="confirm-ok">${esc(confirmLabel)}</button>
        </div>
      </div>
    `);
  }

  function showKurumiWin() {
    const img = MARKET.meta && MARKET.meta.memes && MARKET.meta.memes.kurumi;
    openModal(`
      <div class="modal-card kurumi-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i></i>KURUMI EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        ${img ? `<img class="kurumi-image" src="${img}" alt="久留美觉得赚钱很枯燥">` : ''}
        <h2 class="kurumi-caption">老实赚钱很枯燥吧</h2>
        <p class="kurumi-sub">连续三天上涨。久留美看着账户，觉得这种赚钱方式一点剧情都没有。</p>
        <div class="kurumi-event-actions">
          <span>KURUMI / 日本高中生</span>
          <button class="btn primary" type="button" data-action="close-modal">继续枯燥地赚钱</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showKurumiLose() {
    openModal(`
      <div class="modal-card kurumi-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i></i>KURUMI ALERT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="bplan-glyph">B</div>
        <h2 class="bplan-title">快启动b计划</h2>
        <p class="kurumi-sub">连续三天亏损。久留美已经把「B计划」写在一张餐巾纸上，但字迹被咖啡浸开了。</p>
        <div class="bplan-actions">
          <button class="btn" type="button" data-action="close-modal">再等等，会反弹的</button>
          <button class="btn danger" type="button" data-action="close-modal">启动B计划</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function showSensiWin() {
    openModal(`
      <div class="modal-card sensi-event-card sensi-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#c4a7ff;box-shadow:0 0 9px #c4a7ff"></i>SENSI EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="sensi-poster">
          <svg viewBox="0 0 480 270" role="img" aria-label="sensi 在黑板前上课">
            <defs>
              <linearGradient id="sensiBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#1b2a44"/><stop offset="0.6" stop-color="#26335d"/><stop offset="1" stop-color="#17192a"/>
              </linearGradient>
              <linearGradient id="boardGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#244a55"/><stop offset="1" stop-color="#172b38"/>
              </linearGradient>
            </defs>
            <rect width="480" height="270" rx="14" fill="url(#sensiBg)"/>
            <path d="M0 210 Q120 175 250 208 T480 190 V270 H0Z" fill="#131523" opacity=".8"/>
            <rect x="25" y="32" width="300" height="190" rx="9" fill="url(#boardGlow)" stroke="#b68b5d" stroke-width="7"/>
            <rect x="34" y="41" width="282" height="172" rx="5" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>
            <text x="56" y="97" fill="#d8f3ff" font-family="monospace" font-size="28" font-weight="700">sensi</text>
            <text x="56" y="134" fill="#9edfd0" font-family="monospace" font-size="19">4 ki 得 4</text>
            <path d="M58 153 Q82 143 106 153 T154 153" fill="none" stroke="#ffd4e6" stroke-width="2" opacity=".65"/>
            <text x="56" y="190" fill="#ffd48e" font-family="monospace" font-size="16">A+  !</text>
            <path d="M263 59 l7 14 15 2 -11 11 3 15 -14 -7 -13 7 3 -15 -11 -11 15 -2Z" fill="#ffd48e" opacity=".8"/>
            <circle cx="392" cy="86" r="43" fill="#f3cbbd"/>
            <path d="M349 83 Q351 33 394 31 Q438 34 438 88 Q427 57 409 48 Q383 45 364 58 Q354 66 349 83Z" fill="#9bb8e6"/>
            <path d="M350 80 Q332 109 347 124 Q360 104 362 83Z" fill="#9bb8e6"/>
            <path d="M436 78 Q457 104 440 123 Q430 104 426 80Z" fill="#9bb8e6"/>
            <ellipse cx="393" cy="30" rx="29" ry="8" fill="none" stroke="#8fe6ff" stroke-width="3" opacity=".85"/>
            <ellipse cx="378" cy="88" rx="5" ry="7" fill="#33233e"/>
            <ellipse cx="407" cy="88" rx="5" ry="7" fill="#33233e"/>
            <circle cx="380" cy="86" r="1.6" fill="#fff"/>
            <circle cx="409" cy="86" r="1.6" fill="#fff"/>
            <path d="M386 104 Q394 110 402 104" fill="none" stroke="#a45868" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="363" cy="99" r="5" fill="#eaa6a6" opacity=".5"/>
            <circle cx="424" cy="99" r="5" fill="#eaa6a6" opacity=".5"/>
            <path d="M356 157 Q392 128 431 157 L450 236 Q393 255 335 236Z" fill="#e8eef7"/>
            <path d="M392 138 L392 236 M356 160 Q375 177 393 178 Q412 175 431 160" fill="none" stroke="#b6c5d8" stroke-width="2"/>
            <path d="M431 158 Q460 143 470 165" fill="none" stroke="#f3cbbd" stroke-width="11" stroke-linecap="round"/>
            <path d="M470 165 L445 132" stroke="#d8b079" stroke-width="5" stroke-linecap="round"/>
            <path d="M439 135 l14 -4 -6 14Z" fill="#ffd48e"/>
            <circle cx="341" cy="59" r="3" fill="#fff" opacity=".8"/>
            <circle cx="450" cy="48" r="2.5" fill="#ffd4e6" opacity=".8"/>
            <circle cx="458" cy="128" r="2" fill="#8fe6ff" opacity=".8"/>
            <text x="240" y="255" text-anchor="middle" fill="#f7e9ff" font-family="monospace" font-size="9" opacity=".65">BLUE ARCHIVE / SENSEI CLASSROOM</text>
          </svg>
          <div class="sensi-poster-caption">sensi带四ki得四</div>
        </div>
        <h2 class="sensi-title">sensi带四ki得四</h2>
        <p class="sensi-sub">连续三天上涨。李老师当场在黑板上写下这四个字，并宣布今天不考试。</p>
        <div class="kurumi-event-actions">
          <span>SENSI / 幼儿园讲解师</span>
          <button class="btn primary" type="button" data-action="close-modal">继续上课</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showSensiLose() {
    openModal(`
      <div class="modal-card sensi-event-card sensi-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ff5b6e;box-shadow:0 0 9px #ff5b6e"></i>SENSI EVENT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="sensi-big-mark">扎</div>
        <h2 class="sensi-title sensi-danger">老师你是扎口</h2>
        <p class="sensi-sub">连续三天亏损。李老师把《蔚蓝档案》合上，沉默了很久，最后说：先别告诉家长。</p>
        <div class="kurumi-event-actions">
          <span>SENSI / 幼儿园讲解师</span>
          <button class="btn danger" type="button" data-action="close-modal">再讲一遍</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function showXiaokangWin() {
    openModal(`
      <div class="modal-card xiaokang-event-card xiaokang-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#67e8f9;box-shadow:0 0 9px #67e8f9"></i>XIAOKANG EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="xk-glyph xk-glyph-win">没胖</div>
        <h2 class="xk-title">我没胖</h2>
        <p class="xk-sub">连续三天上涨。小康站上体重秤，宣布：这是浮盈，不是浮肿。</p>
        <div class="kurumi-event-actions">
          <span>XIAOKANG / 中国小伙</span>
          <button class="btn primary" type="button" data-action="close-modal">再称一次</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showXiaokangLose() {
    openModal(`
      <div class="modal-card xiaokang-event-card xiaokang-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ffb86b;box-shadow:0 0 9px #ffb86b"></i>XIAOKANG EVENT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="xk-glyph xk-glyph-lose">购</div>
        <h2 class="xk-title">来此购oooo</h2>
        <p class="xk-sub">连续三天亏损。小康深吸一口气，决定把这叫做「消费降级」，然后再加一笔。</p>
        <div class="kurumi-event-actions">
          <span>XIAOKANG / 中国小伙</span>
          <button class="btn danger" type="button" data-action="close-modal">再来一单</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function showEvergrandeWin() {
    openModal(`
      <div class="modal-card evergrande-event-card evergrande-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#f7c873;box-shadow:0 0 9px #f7c873"></i>EVERGRANDE EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="eg-glyph">空</div>
        <h2 class="eg-title">空城计？？！！</h2>
        <p class="eg-sub">连续三天上涨。总裁站在城楼上，下面一个人都没有，但股价还是涨了。</p>
        <div class="kurumi-event-actions">
          <span>EVERGRANDE / 恒大集团总裁</span>
          <button class="btn primary" type="button" data-action="close-modal">继续奏乐</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showEvergrandeLose() {
    openModal(`
      <div class="modal-card evergrande-event-card evergrande-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ff7c8b;box-shadow:0 0 9px #ff7c8b"></i>EVERGRANDE EVENT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="eg-glyph eg-glyph-lose">债</div>
        <h2 class="eg-title">昨日一去不复回</h2>
        <p class="eg-sub">连续三天亏损。总裁看着负债表，轻轻唱起了歌，并让财务再借一笔。</p>
        <div class="kurumi-event-actions">
          <span>EVERGRANDE / 恒大集团总裁</span>
          <button class="btn danger" type="button" data-action="close-modal">再借一笔</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function showNaiwaWin() {
    openModal(`
      <div class="modal-card naiwa-event-card naiwa-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ffb6c9;box-shadow:0 0 9px #ffb6c9"></i>NAIWA EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="na-glyph na-glyph-win">？！</div>
        <h2 class="na-title">安迪？！</h2>
        <p class="na-sub">连续三天上涨。奶蛙盯着屏幕，发出了不可名状的声音。</p>
        <div class="kurumi-event-actions">
          <span>NAIWA / 奶蛙</span>
          <button class="btn primary" type="button" data-action="close-modal">嘎嘎提拉赛</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showNaiwaLose() {
    openModal(`
      <div class="modal-card naiwa-event-card naiwa-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ffb6c9;box-shadow:0 0 9px #ffb6c9"></i>NAIWA EVENT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="na-glyph na-glyph-lose">哦啦</div>
        <h2 class="na-title">哦啦</h2>
        <p class="na-sub">连续三天亏损。奶蛙深吸一口气，决定把这声“哦啦”当作止损提示音。</p>
        <div class="kurumi-event-actions">
          <span>NAIWA / 奶蛙</span>
          <button class="btn danger" type="button" data-action="close-modal">再嘎一次</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function showSamWin() {
    openModal(`
      <div class="modal-card sam-event-card sam-win-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#7aa2ff;box-shadow:0 0 9px #7aa2ff"></i>SAM EVENT / 03 DAYS UP</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="sam-glyph-row">
          <span class="sam-avatar">S</span><i class="sam-arrow">→</i><span class="sam-bite">边</span>
        </div>
        <h2 class="sam-title">山姆吃边边</h2>
        <p class="sam-sub">连续三天上涨。山姆决定庆祝一下，边边遭殃了。</p>
        <div class="kurumi-event-actions">
          <span>SAM / 美国小伙</span>
          <button class="btn primary" type="button" data-action="close-modal">继续拿住</button>
        </div>
      </div>
    `);
    playCarnivalChime();
  }

  function showSamLose() {
    openModal(`
      <div class="modal-card sam-event-card sam-lose-card" role="dialog" aria-modal="true">
        <div class="kurumi-event-top">
          <span><i style="background:#ff5b6e;box-shadow:0 0 9px #ff5b6e"></i>SAM EVENT / 03 DAYS DOWN</span>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="sam-glyph-row">
          <span class="sam-bite">边</span><i class="sam-arrow">→</i><span class="sam-avatar">S</span>
        </div>
        <h2 class="sam-title">边边吃山姆</h2>
        <p class="sam-sub">连续三天亏损。局势反转，这次轮到山姆被端上桌了。</p>
        <div class="kurumi-event-actions">
          <span>SAM / 美国小伙</span>
          <button class="btn danger" type="button" data-action="close-modal">再等等，会反弹的</button>
        </div>
      </div>
    `);
    playWarn();
  }

  function playCarnivalChime() {
    if (state.muted) return;
    tone(1046, 0.12, 'sine', 0.018, null, 0.02);
    tone(1318, 0.13, 'sine', 0.016, null, 0.12);
    tone(1568, 0.18, 'sine', 0.014, 2093, 0.24);
  }

  function openCapitalModal() {
    if (state.fxPlaying) return;
    if (state.position || state.order || state.over) {
      showToast('本局已经开始交易，重新开局后才能修改起始资金。', 'warn');
      return;
    }
    const current = state.startingCapital || START_CAPITAL;
    openModal(`
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>设置起始资金</h2><p>还没下单，可以直接修改。最低 ¥10,000，不填默认 ¥10,000。</p></div>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <div class="field">
          <label for="capitalModalInput">起始资金 <span>元</span></label>
          <input id="capitalModalInput" type="number" inputmode="numeric" min="10000" step="10000" value="${current}" placeholder="不填默认 10,000">
        </div>
        <div class="modal-actions">
          <button class="btn" type="button" data-action="close-modal">取消</button>
          <button class="btn primary" type="button" data-action="apply-capital">保存起始资金</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      const input = $('#capitalModalInput');
      if (input) input.focus({ preventScroll: true });
    }, 30);
  }

  function openRules() {
    if (state.fxPlaying) return;
    openModal(`
      <div class="modal-card wide" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div><h2>规则 / 没有排名，只有后果</h2><p>重演是一个决策训练器，不是荐股软件。</p></div>
          <button class="modal-close" type="button" data-action="close-modal" aria-label="关闭">×</button>
        </div>
        <ul class="rules-list">
          <li><span class="rn">01</span><div><b>起始资金可自定义，不填默认 ¥10,000，一次只持有一个标的。</b>A 股、AI 巨头、AI 硬件、外汇、比特币、黄金都在清单里。先写决策日志，理由、预期、信心、持有期、止损线都要有，写不全不能下单。</div></li>
          <li><span class="rn">02</span><div><b>高风险专区：外汇 / 加密 / 贵金属，另设日元 / 加拿大币区。</b>没有涨跌停，日线波动可能远超 A 股。这里不负责温柔，只负责把结果算清楚。</div></li>
          <li><span class="rn">03</span><div><b>杠杆 1× 起，没有上限。</b>输入框能输入多少，系统就敢借多少。没有“最大杠杆”这个变量。高风险标的也一样。</div></li>
          <li class="hot"><span class="rn">04</span><div><b>维持担保比例 =（现金 + 持仓市值）÷ 融资负债。</b>低于 <span class="mono">130%</span> 强制平仓。开仓满仓时，约 <span class="mono">4.33×</span> 就是临界点；再高，开仓即爆。爆仓时会安排晴天娃娃和空中飞人。</div></li>
          <li><span class="rn">05</span><div><b>提交前可拖动时间条查看历史涨幅；买入后自动开始。</b>默认按 1× 流速推进，可随时暂停或点 <span class="mono">2×</span> 加倍。AI 硬件数量不填默认 100 件，其他标的留空按保证金比例自动计算。</div></li>
          <li><span class="rn">06</span><div><b>复盘分数不奖励盈利。</b>它只评价记录、止损、风险预算和杠杆克制。好结果可能是坏流程，坏结果也可能是好流程。</div></li>
          <li><span class="rn">07</span><div><b>行情：真实日线 + 教学模拟。</b>A 股、美股 AI 巨头、腾讯 / 阿里、主要外汇、黄金、BTC、三星 / SK 为真实日线，每天 08:10 / 17:10 自动更新；OpenAI / Anthropic / DeepSeek / 月之暗面 / 幻方 / 字节 / ETH / SpaceX、显卡与内存价格为教学模拟。不是实时报价，仅用于教学演练，不构成投资建议。每局随机抽取起点。</div></li>
        </ul>
        <div class="modal-actions">
          <button class="btn danger" type="button" data-action="demo-liq">先看一次爆仓长什么样</button>
          <button class="btn primary" type="button" data-action="close-modal">知道了</button>
        </div>
      </div>
    `);
  }

  /* ---------------- 角色 / 开局 ---------------- */
  function syncCapitalPresets() {
    const capInput = $('#startCapitalInput');
    const value = Number(capInput && capInput.value);
    $$('.ob-capital-preset').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.amount) === value);
    });
  }

  function resolveStartingCapital() {
    const capInput = $('#startCapitalInput');
    let starting = Number(capInput && capInput.value);
    if (!Number.isFinite(starting) || starting < 10000) {
      starting = START_CAPITAL;
      if (capInput) capInput.value = '';
      showToast('未填写或低于 1 万，按默认起始资金 ¥10,000 计算。', 'warn');
    }
    return starting;
  }

  function roleById(id) {
    return CHARACTERS.find((role) => role.id === id) || null;
  }

  function renderRoleOptions() {
    const grid = $('#roleGrid');
    if (!grid) return;
    grid.innerHTML = CHARACTERS.map((role) => `
      <button class="role-card ${pendingRole === role.id ? 'active' : ''}" type="button" data-action="select-role" data-role="${role.id}" style="--role-color:${role.tone}">
        <div class="role-mark">${role.icon}</div>
        <div class="role-tag">${esc(role.tag)}</div>
        <div class="role-name">${esc(role.name)}</div>
        <div class="role-line">${esc(role.line)}</div>
        <div class="role-quote">${esc(role.quote)}</div>
      </button>
    `).join('');
    updateRolePicked();
  }

  function updateRolePicked() {
    const picked = roleById(pendingRole);
    const box = $('#rolePicked');
    const go = $('#roleGo');
    if (!box || !go) return;
    if (!picked) {
      box.innerHTML = '<span class="role-empty">还没有选择角色</span>';
      go.disabled = true;
      go.textContent = '选择角色后进入';
      return;
    }
    box.innerHTML = `
      <div class="role-mark" style="--role-color:${picked.tone}">${picked.icon}</div>
      <div><b>${esc(picked.name)}</b><span>${esc(picked.tag)} · 起始资金 <i class="role-capital-chip">${fmtMoney(pendingStartCapital)}</i></span></div>
    `;
    go.disabled = false;
    go.textContent = `以 ${picked.short} 进入市场`;
  }

  function openRoleSelect() {
    if (state.position || state.order) return;
    pendingStartCapital = resolveStartingCapital();
    pendingRole = null;
    renderRoleOptions();
    const overlay = $('#roleSelect');
    if (overlay) overlay.classList.remove('hide');
    document.body.style.overflow = 'hidden';
    playTick();
  }

  function closeRoleSelect() {
    const overlay = $('#roleSelect');
    if (overlay) overlay.classList.add('hide');
    document.body.style.overflow = '';
    pendingRole = null;
  }

  function selectRole(id) {
    if (!roleById(id)) return;
    pendingRole = id;
    $$('.role-card').forEach((card) => card.classList.toggle('active', card.dataset.role === id));
    updateRolePicked();
    playTick();
  }

  function beginGameWithRole() {
    if (!pendingRole) return;
    const role = roleById(pendingRole);
    if (!role) return;
    state.character = role;
    state.startingCapital = pendingStartCapital;
    state.capital = pendingStartCapital;
    state.cash = pendingStartCapital;
    const overlay = $('#roleSelect');
    if (overlay) overlay.classList.add('hide');
    const onboard = $('#onboard');
    if (onboard) onboard.classList.add('hide');
    document.body.style.overflow = '';
    pendingRole = null;
    const leftRail = $('#left');
    if (leftRail) leftRail.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
    renderAll();
    ensureAudio();
    playOrder();
    showToast(`${role.short} 入场 · 起始资金 ${fmtMoney(state.startingCapital)}`, 'good');
  }

  /* ---------------- 事件 ---------------- */
  function handleAction(action, element) {
    switch (action) {
      case 'start':
        openRoleSelect();
        break;
      case 'capital-preset': {
        const amount = Number(element.dataset.amount);
        const capInput = $('#startCapitalInput');
        if (capInput && Number.isFinite(amount)) {
          capInput.value = String(amount);
          syncCapitalPresets();
          playTick();
        }
        break;
      }
      case 'select-role':
        selectRole(element.dataset.role);
        break;
      case 'confirm-role':
        beginGameWithRole();
        break;
      case 'back-role':
        closeRoleSelect();
        break;
      case 'tab':
        switchTab(element.dataset.tab);
        break;
      case 'stock':
        selectStock(Number(element.dataset.stock));
        break;
      case 'jump': {
        const targetId = element.dataset.target;
        const target = targetId ? $('#' + targetId) : null;
        const rail = $('#left');
        if (!target) break;
        if (rail && rail.scrollHeight > rail.clientHeight + 4) {
          const top = target.getBoundingClientRect().top - rail.getBoundingClientRect().top + rail.scrollTop - 6;
          rail.scrollTo({ top, behavior: 'smooth' });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        playTick();
        break;
      }
      case 'auto-qty': {
        draft.quantity = '';
        const qtyInput = $('#qtyInput');
        if (qtyInput) qtyInput.value = '';
        updatePlanPreview();
        playTick();
        break;
      }
      case 'capital':
        openCapitalModal();
        break;
      case 'apply-capital': {
        const input = $('#capitalModalInput');
        const value = Number(input && input.value);
        if (!Number.isFinite(value) || value < 10000) {
          showToast('起始资金最低 1 万。', 'bad');
          break;
        }
        state.startingCapital = value;
        state.capital = value;
        state.cash = value;
        closeModal();
        renderAll();
        showToast(`起始资金已设为 ${fmtMoney(value)}。`, 'good');
        break;
      }
      case 'preset': {
        const preset = Number(element.dataset.preset);
        if (Number.isFinite(preset) && preset >= 1) {
          draft.leverage = preset;
          const input = $('#levInput');
          if (input) input.value = String(preset);
          updatePlanPreview();
          playTick();
        }
        break;
      }
      case 'submit':
        submitOrder();
        break;
      case 'advance':
        advance(Number(element.dataset.days) || 1);
        break;
      case 'auto-speed':
        setAutoSpeed(Number(element.dataset.speed));
        break;
      case 'toggle-auto':
        toggleAuto();
        break;
      case 'close-position':
        requestClosePosition();
        break;
      case 'restart':
        requestRestart();
        break;
      case 'sound':
        toggleSound();
        break;
      case 'rules':
        openRules();
        break;
      case 'demo-liq':
        startDemoLiquidation();
        break;
      case 'liq-report':
        if (!pendingLiqInfo) break;
        hideLiqManual();
        showLiqModal(pendingLiqInfo, pendingLiqDemo);
        break;
      case 'demo-again':
        cleanupFx();
        renderAll();
        setTimeout(() => playLiquidationFx(makeDemoInfo(), true), 120);
        break;
      case 'demo-close':
        cleanupFx();
        renderAll();
        break;
      case 'liq-review':
        cleanupFx();
        ui.tab = 'review';
        renderAll();
        setTimeout(scrollToReview, 90);
        break;
      case 'liq-restart':
        cleanupFx();
        newGame();
        break;
      case 'close-modal':
        closeModal();
        break;
      case 'confirm-ok': {
        const cb = pendingConfirm;
        closeModal();
        if (cb) cb();
        break;
      }
      default:
        break;
    }
  }

  function onDocumentClick(event) {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    if (actionEl.disabled) return;
    event.preventDefault();
    handleAction(actionEl.dataset.action, actionEl);
  }

  function applyDraftInput(target) {
    if (!target || !target.matches('[data-draft]')) return;
    const key = target.dataset.draft;
    draft[key] = target.type === 'checkbox' ? target.checked : target.value;
    if (key === 'reason') {
      updateReasonCount();
      updateSubmitState();
      return;
    }
    if (key === 'confidence') {
      const val = $('#confVal');
      if (val) val.textContent = String(draft.confidence);
    }
    updatePlanPreview();
  }

  function bindEvents() {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('input', (event) => {
      if (event.target && event.target.id === 'startCapitalInput') {
        syncCapitalPresets();
        return;
      }
      if (event.target && event.target.id === 'timeScrubber') {
        scrubTimeline(event.target.value);
        return;
      }
      applyDraftInput(event.target);
    });
    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'timeScrubber') {
        scrubTimeline(event.target.value);
        renderAll();
        return;
      }
      applyDraftInput(event.target);
    });
    document.addEventListener('focusout', (event) => {
      if (!event.target || event.target.id !== 'levInput') return;
      const value = Number(event.target.value);
      if (!Number.isFinite(value) || value < 1) {
        draft.leverage = 1;
        event.target.value = '1';
        updatePlanPreview();
      } else {
        draft.leverage = event.target.value;
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (state.fxPlaying) return;
      if ($('.modal-backdrop')) closeModal();
      else if (ui.hoverIndex != null) hideChartTip();
    });
    const chart = $('#chart');
    if (chart) {
      chart.addEventListener('mousemove', onChartMove);
      chart.addEventListener('mouseleave', hideChartTip);
    }
    const chartBox = $('#chartBox');
    if (chartBox && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => scheduleChart());
      ro.observe(chartBox);
    }
    window.addEventListener('resize', () => {
      scheduleChart();
      if (ui.tab === 'sim') requestAnimationFrame(drawMcCharts);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleChart).catch(() => {});
    }
  }

  /* ---------------- 启动 ---------------- */
  try {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  } catch (err) { /* 某些 file:// 环境不允许 */ }
  renderAll();
  bindEvents();
  window.scrollTo(0, 0);
})();
