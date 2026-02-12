// detector.js ✅ Modo Optimizado para Alpine Linux (Railway)
const puppeteer = require("puppeteer");

const BASE_URL = process.env.BANDIT_BASE_URL || "https://bandit.camp";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000); 
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

// 🛡️ Lanzamiento de Chromium (Compatible con tu Dockerfile Alpine)
async function launchBrowser() {
  console.log("🚀 Lanzando navegador (Modo Alpine/Docker)...");
  
  const browser = await puppeteer.launch({
    headless: "new",
    // ✅ CAMBIO CLAVE: Usamos la variable de entorno del Dockerfile o la ruta de Alpine
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    
    // ⚠️ pipe: true ELIMINADO: Causa congelamientos en Alpine. Usamos WebSocket por defecto.
    
    protocolTimeout: 180000,
    defaultViewport: { width: 1280, height: 720 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Crítico para Docker
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // Mantenemos esto para ahorrar RAM
      "--disable-accelerated-2d-canvas",
      "--mute-audio",
      "--disable-extensions"
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
      console.error("❌ Error FATAL al lanzar navegador:", err);
      process.exit(1);
  }

  const page = await browser.newPage();

  // 🛡️ Intercepción INTELIGENTE
  await page.setRequestInterception(true);
  page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'font', 'media', 'imageset'].includes(resourceType)) {
          req.abort();
      } else {
          req.continue();
      }
  });

  await page.setUserAgent(USER_AGENT);

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 60000 });
    console.log("🌍 Página cargada correctamente (HD)...");
  } catch (err) {
    console.warn("⚠️ page.goto warning (continuando):", err?.message || err);
  }

  // --- ExposeFunction ---
  try {
    await page.exposeFunction("onRakebackDetectedInPage", (data) => {
      try {
        const text = String(data?.text || "").trim();
        const key = normalizeKey(text || data?.url || "");
        if (!key || key.length < 6 || isDuplicate(key)) return;
        rememberKey(key);
        const amount = parseAmountFromText(text);
        console.log("💧 RAIN detected (DOM) with amount:", amount);
        callback({ source: "DOM", text, amount, timestamp: new Date().toISOString(), url: data?.url || BASE_URL });
      } catch (err) { console.warn("⚠️ Error callback:", err?.message); }
    });
  } catch (err) { console.warn("⚠️ exposeFunction failed:", err?.message); }

  // --- MutationObserver ---
  try {
    await page.evaluate(() => {
      const targetPhrase = "join now to get free scrap based on your play amount";
      const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
      const isJoinInstruction = (el) => {
        try { return normalize(el.innerText || el.textContent || "").includes(targetPhrase); } catch { return false; }
      };
      
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes || []) {
            if (node?.nodeType === 1 && isJoinInstruction(node)) {
              window.onRakebackDetectedInPage({ text: node.innerText || "", url: location.href });
            }
          }
        }
      });
      if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    });
  } catch (err) { console.warn("⚠️ Observer failed:", err?.message); }

  // --- Polling ---
  const pollHandle = setInterval(async () => {
    try {
      if (browser && !browser.isConnected()) throw new Error("Disconnected");
      
      const found = await page.evaluate(() => {
        const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").replace(/\u00A0/g, " ").trim();
        const bodyText = normalize(document?.body?.innerText || "");
        const targetPhrase = "join now to get free scrap based on your play amount";
        
        if (bodyText.includes(targetPhrase)) return { text: document.body.innerText.slice(0, 500), url: location.href };
        
        const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
        for (const b of buttons) {
          if (normalize(b.innerText).includes(targetPhrase)) return { text: b.innerText.slice(0, 500), url: location.href };
        }
        return null;
      });

      if (found) await page.evaluate((f) => window.onRakebackDetectedInPage(f), found);

    } catch (err) {
        // Ignoramos errores puntuales
    }
  }, POLL_INTERVAL_MS);

  browser.on("disconnected", () => {
    console.error("❌ Puppeteer disconnected — exiting for restart");
    clearInterval(pollHandle);
    process.exit(1); 
  });

  console.log("✅ Puppeteer detector is running (Alpine Optimized)...");

  return {
    stop: async () => {
      clearInterval(pollHandle);
      await browser.close();
    },
  };
}

module.exports = { iniciarDetector };