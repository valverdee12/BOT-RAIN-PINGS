# Bandit Camp Rakeback Notifier (esqueleto)

Bot mínimo que notifica en un canal de Discord cuando detecta 'rakeback rains'.

Archivos principales:
- `index.js`: arranca el bot y envía notificaciones.
- `src/detector.js`: módulo que detecta eventos (hoy simula; reemplace con API real).

Cómo usar:
1. Copia `.env.example` a `.env` y completa `DISCORD_TOKEN` y `DISCORD_CHANNEL_ID`.
2. Instala dependencias: `npm install`.
3. Inicia el bot: `npm start`.

Detector modes:
- `BANDIT_MODE=SIMULATE` (por defecto): genera eventos de prueba.
- `BANDIT_MODE=HTTP_POLL`: haz que `BANDIT_API_URL` apunte a una API que devuelva un array JSON de eventos.
- `BANDIT_MODE=WEBSOCKET`: placeholder – implementar luego.
 - `BANDIT_MODE=HTML_POLL`: comprueba la página (por ejemplo la principal o la sección de chat) en busca de enlaces `bandit.camp/hand/{id}` y emite eventos cuando encuentra links nuevos.
 - `BANDIT_MODE=PUPPETEER`: usa un navegador headless (puppeteer) para renderizar la página y extraer enlaces incluso si la web está protegida por JS/Cloudflare.

URLs de Bandit Camp (detección interna):
- El bot puede usar `event.url` o `BANDIT_URL_TEMPLATE` para identificar la jugada en Bandit Camp.
- Importante: la URL se usa solo internamente para detección/identificación y NO se mostrará en los mensajes públicos de Discord.
  Usa placeholders como `{id}`, `{hand}` o `{player}`. Ejemplo:
  `BANDIT_URL_TEMPLATE=https://bandit.camp/hand/{id}`

  Si solo quieres aportar la base del sitio, también puedes usar `BANDIT_BASE_URL=https://bandit.camp/`.

Prueba rápida en local:
1. Deja `BANDIT_MODE=SIMULATE` en el `.env`.
2. Arranca el bot y verifica que en el canal configurado llegan embeds de prueba.

Ejecutar el bot en background (Windows PowerShell)
- `run-bot.ps1`: inicia el bot en segundo plano, guarda el PID en `run-bot.pid` y redirige logs a la carpeta `logs/`.
- `stop-bot.ps1`: detiene el bot usando el PID guardado.

Uso:
1. Desde PowerShell, en la carpeta del proyecto ejecuta:
  - `./run-bot.ps1`
2. Para detenerlo:
  - `./stop-bot.ps1`

Polling interval:
- Puedes ajustar la frecuencia de comprobación del detector con `POLL_INTERVAL_MS` en tu `.env` (milisegundos). Por defecto 20000 (20s).

Dónde cambiar la lógica:
- Reemplace la simulación en `src/detector.js` por llamadas a la API de Bandit Camp o por un listener websocket.

Mensaje en Discord:
- Por defecto el texto enviado es: `@everyone ATENCION HAY UNA RAKEBACK RAIN!` (puedes cambiarlo con `BANDIT_MESSAGE_TEMPLATE`, pero el bot eliminará cualquier `{url}` que pongas para no mostrar links).

Notas:
- Este proyecto usa `discord.js` v14. Asegúrate de tener Node.js >=16.
