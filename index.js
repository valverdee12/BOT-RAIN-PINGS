require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { iniciarDetector } = require('./src/detector');

// --- CONFIGURACIÓN ---
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error('❌ ERROR: Faltan las variables DISCORD_TOKEN o DISCORD_CHANNEL_ID en el .env');
    process.exit(1);
}

// Cliente de Discord con ajustes de estabilidad para servidores (Render/Railway)
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    rest: { 
        timeout: 60000, 
        retries: 5 
    }
});

let detectorActivo = false;
let ultimoAvisoTime = 0;
const COOLDOWN_MINUTOS = 25; // Tiempo de espera entre mensajes @everyone

client.once('ready', async () => {
    console.log(`✅ BOT ONLINE: Conectado como ${client.user.tag}`);

    if (detectorActivo) return;
    detectorActivo = true;

    try {
        console.log("📡 Iniciando el detector de eventos...");
        
        iniciarDetector(async (evento) => {
            // 1. Validar que el evento tenga datos reales
            if (!evento || !evento.amount || isNaN(evento.amount) || evento.amount <= 0) {
                return; // Ignorar si es basura o cantidad 0
            }

            // 2. Control de Cooldown (Anti-spam)
            const ahora = Date.now();
            const tiempoEsperaMs = COOLDOWN_MINUTOS * 60 * 1000;
            
            if ((ahora - ultimoAvisoTime) < tiempoEsperaMs) {
                console.log(`⏳ Evento detectado (${evento.amount} SCRAP), pero en cooldown.`);
                return;
            }

            // 3. Envío del mensaje a Discord
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

// --- GESTIÓN DE ERRORES Y REINICIO ---

client.on('error', (error) => {
    console.error('❌ Error de conexión en Discord:', error.message);
});

// Si algo falla fuera de un try/catch, evitamos que el bot muera silenciosamente
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rechazo no manejado en:', promise, 'razón:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Excepción no capturada:', err.message);
    // En servidores como Render, es mejor salir con error para que el sistema lo reinicie
    process.exit(1);
});

// Login
client.login(TOKEN).catch(e => {
    console.error('❌ Fallo el login de Discord:', e.message);
    process.exit(1);
});
