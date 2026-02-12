require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { iniciarDetector } = require('./src/detector');

// Token y Canal
const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : "";
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Configuración del cliente (Timeout aumentado para Railway)
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  rest: { timeout: 30000 }
});

// Variables globales del Bot
let detectorActivo = false;
let ultimoAvisoTime = 0;
const COOLDOWN_MINUTOS = 25; // 25 min de espera entre avisos

client.once('ready', async () => {
  console.log(`🤖 CONECTADO como ${client.user.tag}`);

  if (detectorActivo) return;
  detectorActivo = true;

  // Iniciamos el detector (el mensaje de Puppeteer saldrá desde detector.js)
  iniciarDetector(async (evento) => {
    
    // --- ZONA DE FILTROS SILENCIOSOS ---
    
    // 1. Si no hay dinero o es 0 (basura del chat), lo ignoramos sin decir nada.
    if (!evento.amount || isNaN(evento.amount) || evento.amount <= 0) return;

    // 2. Si hace menos de 25 min del último aviso, lo ignoramos sin decir nada.
    const ahora = Date.now();
    const tiempoEsperaMs = COOLDOWN_MINUTOS * 60 * 1000;
    if ((ahora - ultimoAvisoTime) < tiempoEsperaMs) return;

    // --- ENVIAR ALERTA REAL ---

    try {
      const canal = await client.channels.fetch(CHANNEL_ID);
      if (!canal) return console.error('⚠️ Error: Canal Discord no encontrado');

      // Actualizamos el contador de tiempo
      ultimoAvisoTime = ahora; 

      const mensaje = [
        `@everyone RAIN ON BANDIT CAMP JOIN NOW!`,
        `💰 **${evento.amount.toFixed(2)} SCRAP!**`,
        `🔗 ${evento.url || 'https://bandit.camp'}`
      ].filter(Boolean).join('\n');

      await canal.send(mensaje);
      
      // Único log que verás cuando funcione
      console.log(`✅ Alerta enviada: ${evento.amount} SCRAP. (Silencio activado: ${COOLDOWN_MINUTOS} min)`);
      
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err.message);
    }
  });
});

// Gestión de errores básica para que no se apague
client.on('error', (error) => console.error('❌ Error Discord:', error));

client.login(TOKEN).catch(e => console.error('❌ Error Login:', e));