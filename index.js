require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { iniciarDetector } = require('./src/detector');
const express = require('express');

// --- SERVIDOR WEB PARA RENDER (TRUCO PORT BINDING) ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is Alive!'));
app.listen(port, () => console.log(`🌍 Puerto ${port} abierto para Render.`));

// --- CONFIGURACIÓN ---
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error('❌ ERROR: Faltan las variables DISCORD_TOKEN o DISCORD_CHANNEL_ID en el .env');
    process.exit(1);
}

// Cliente de Discord
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    rest: { 
        timeout: 60000, 
        retries: 5 
    }
});

let detectorActivo = false;
let ultimoAvisoTime = 0;
const COOLDOWN_MINUTOS = 25; 

client.once('ready', async () => {
    console.log(`✅ BOT ONLINE: Conectado como ${client.user.tag}`);

    if (detectorActivo) return;
    detectorActivo = true;

    try {
        console.log("📡 Iniciando el detector de eventos...");
        
        iniciarDetector(async (evento) => {
            if (!evento || !evento.amount || isNaN(evento.amount) || evento.amount <= 0) {
                return;
            }

            const ahora = Date.now();
            const tiempoEsperaMs = COOLDOWN_MINUTOS * 60 * 1000;
            
            if ((ahora - ultimoAvisoTime) < tiempoEsperaMs) {
                console.log(`⏳ Evento detectado (${evento.amount} SCRAP), pero en cooldown.`);
                return;
            }

            try {
                const canal = await client.channels.fetch(CHANNEL_ID);
                if (!canal) {
                    console.error('⚠️ Error: No se pudo encontrar el canal de Discord.');
                    return;
                }

                ultimoAvisoTime = ahora; 

                const mensaje = [
                    `⚠️ **RAIN ON BANDIT CAMP!** @everyone`,
                    `💰 Cantidad: **${evento.amount.toFixed(2)} SCRAP**`,
                    `🔗 [IR AL SITIO](${evento.url || 'https://bandit.camp'})`,
                    `⏰ Próxima alerta disponible en: ${COOLDOWN_MINUTOS} min.`
                ].join('\n');

                await canal.send(mensaje);
                console.log(`🚀 ALERTA ENVIADA: ${evento.amount} SCRAP detectados.`);
                
            } catch (err) {
                console.error('❌ Error al enviar el mensaje al canal:', err.message);
            }
        });

    } catch (err) {
        console.error('❌ Error crítico al arrancar el detector:', err.message);
    }
});

// Gestión de errores
client.on('error', (error) => console.error('❌ Error de conexión en Discord:', error.message));
process.on('unhandledRejection', (reason, promise) => console.error('❌ Rechazo no manejado:', reason));
process.on('uncaughtException', (err) => {
    console.error('❌ Excepción no capturada:', err.message);
    process.exit(1);
});

client.login(TOKEN).catch(e => {
    console.error('❌ Fallo el login de Discord:', e.message);
    process.exit(1);
});
