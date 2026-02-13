// detector.js ✅ Detector de rakeback definitivo para Render y Local
const puppeteer = require("puppeteer");

const BASE_URL = process.env.BANDIT_BASE_URL || "https://bandit.camp";
const USER_AGENT = process.env.BANDIT_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 20000);
const DUPLICATE_RESET_MS = Number(process.env.DUPLICATE_RESET_MS || 3 * 60 * 1000);

const recentKeys = new Map();

function normalizeKey(text) {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

function rememberKey(key) {
  recentKeys.set(key, Date.now());
  setTimeout(() => recentKeys.delete(key), DUPLICATE_RESET_MS);
}

function isDuplicate(key) {
  const t = recentKeys.get(key);
  if (!t) return false;
  return Date.now() - t < DUPLICATE_RESET_MS;
}

function parseAmountFromText(text) {
  if (!text) return null;
  const m = text.match(/share\s+(\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  let raw = m[1].replace(",", ".");
  const v = parseFloat(raw);
  return Number.isFinite(v) ? v : null;
}

// NUEVA FUNCIÓN DE LANZAMIENTO PARA RENDER
async function launchBrowser() {
  console.log("🛠️ Intentando lanzar Chromium...");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // Render necesita esto
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
    ],
  });

  const proc = browser.process && browser.process();
  if (proc?.pid) console.log("🧩 Chromium PID:", proc.pid);
  return browser;
}

async function iniciarDetector(callback) {
  console.log("🧭 Starting Puppeteer detector for:", BASE_URL);
  
  let browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    console.error("❌ Fallo crítico al lanzar el navegador:", err.message);
    process.exit(1);
  }

  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1024, height: 768 });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 90000 });
    await page.waitForSelector("body", { timeout: 10000 });
    console.log("🌍 Página cargada con éxito.");
  } catch (err) {
    console.warn("⚠️ page.goto failed (posible Cloudflare o red lenta):", err?.message);
  }

  try {
    await page.exposeFunction("onRakebackDetectedInPage", (data) => {
      try {
        const text = String(data?.text || "").trim();
        const key = normalizeKey(text || data?.url || "");
        if (!key || key.length < 6 || isDuplicate(key)) return;
        rememberKey(key);

        const amount = parseAmountFromText(text);
        console.log("💧 RAIN detected (DOM) with amount:", amount);

        callback({
          source: "DOM",
          text,
          amount,
          timestamp: new Date().toISOString(),
          url: data?.url || BASE_URL,
        });
      } catch (err) {
        console.warn("⚠️ Error in exposed callback:", err?.message);
      }
    });
  } catch (err) {
    console.warn("⚠️ exposeFunction failed:", err?.message);
  }

  await page.evaluate(() => {
    const targetPhrase = "join now to get free scrap based on your play amount";
    const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
    const isJoinInstruction = (el) => {
      try { return normalize(el.innerText || el.textContent || "").includes(targetPhrase); }
      catch { return false; }
    };

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes || []) {
          if (node?.nodeType === 1 && isJoinInstruction(node)) {
            window.onRakebackDetectedInPage({ text: node.innerText || node.textContent || "", url: location.href });
          }
        }
      }
    });

    const body = document.querySelector("body");
    if (body) mo.observe(body, { childList: true, subtree: true });
  });

  const pollHandle = setInterval(async () => {
    try {
      const found = await page.evaluate(() => {
        const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
        const bodyText = normalize(document?.body?.innerText || "");
        const targetPhrase = "join now to get free scrap based on your play amount";

        if (bodyText.includes(targetPhrase))
          return { text: document.body.innerText.slice(0, 1000), url: location.href };
        return null;
      });
      if (found) await page.evaluate((f) => window.onRakebackDetectedInPage(f), found);
    } catch {}
  }, POLL_INTERVAL_MS);

  browser.on("disconnected", () => {
    console.error("❌ Puppeteer disconnected — restarting...");
    clearInterval(pollHandle);
    process.exit(1);
  });

  return {
    stop: async () => {
      clearInterval(pollHandle);
      await browser.close();
    },
  };
}

module.exports = { iniciarDetector };
