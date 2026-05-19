#!/usr/bin/env node

import express from 'express';
import httpProxy from 'http-proxy';
import { spawn, exec } from 'child_process';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Парсим аргументы командной строки
const args = process.argv.slice(2);
let TARGET_PORT = 3000;
let PROXY_PORT = 4040;
let AUTH_CREDENTIALS = null;
let TUNNEL_TOKEN = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-p' || args[i] === '--port') {
    TARGET_PORT = parseInt(args[i + 1], 10) || 3000;
    i++;
  } else if (args[i] === '-i' || args[i] === '--inspect') {
    PROXY_PORT = parseInt(args[i + 1], 10) || 4040;
    i++;
  } else if (args[i] === '-a' || args[i] === '--auth') {
    const parts = args[i + 1] ? args[i + 1].split(':') : [];
    if (parts.length === 2) {
      AUTH_CREDENTIALS = { username: parts[0], password: parts[1] };
    }
    i++;
  } else if (args[i] === '-t' || args[i] === '--token') {
    TUNNEL_TOKEN = args[i + 1] || null;
    i++;
  } else if (args[i] === '-h' || args[i] === '--help') {
    console.log(`
  FlareGUI — утилита для локального туннелирования на базе Cloudflare Tunnels с веб-инспектором запросов.

  Использование:
    npx flaregui [опции]

  Опции:
    -p, --port <number>      Локальный порт вашего приложения (по умолчанию: 3000)
    -i, --inspect <number>   Порт для веб-инспектора и прокси (по умолчанию: 4040)
    -a, --auth <user:pass>   Защитить туннель паролем Basic Auth (пример: admin:1234)
    -t, --token <string>     Использовать собственный токен туннеля Cloudflare
    -h, --help               Показать справку
    `);
    process.exit(0);
  }
}

const requestsHistory = [];
const MAX_HISTORY = 100;
let ACTIVE_TUNNEL_URL = '';

const app = express();
const proxy = httpProxy.createProxyServer({
  target: `http://localhost:${TARGET_PORT}`,
  changeOrigin: true,
});

// Раздаем статику дашборда на /inspect
app.use('/inspect', express.static(path.join(__dirname, 'ui/dist')));

// Редирект с /inspect без слэша на /inspect/
app.get('/inspect', (req, res) => {
  res.redirect('/inspect/');
});

function isBinaryContentType(contentType) {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  if (ct.includes('text/') || ct.includes('json') || ct.includes('xml') || ct.includes('javascript') || ct.includes('urlencoded')) {
    return false;
  }
  if (ct.includes('image/') || ct.includes('video/') || ct.includes('audio/') || ct.includes('octet-stream') || ct.includes('zip') || ct.includes('pdf') || ct.includes('multipart/form-data')) {
    return true;
  }
  return false;
}

// Middleware для перехвата запросов
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = performance.now();
  
  let body = [];
  let totalLength = 0;
  let bodyOmitted = false;
  const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2 MB
  
  // Перехватываем тело запроса
  req.on('data', chunk => {
    if (totalLength + chunk.length <= MAX_LOG_SIZE) {
      body.push(chunk);
      totalLength += chunk.length;
    } else {
      bodyOmitted = true;
    }
  });

  req.on('end', () => {
    let rawBody = '';
    const contentType = req.headers['content-type'] || '';
    
    if (bodyOmitted) {
      rawBody = `[Payload omitted: exceeds 2MB limit]`;
    } else if (isBinaryContentType(contentType)) {
      rawBody = `[Binary Payload: ${contentType} (${totalLength} bytes)]`;
    } else {
      rawBody = Buffer.concat(body).toString();
    }
    
    const requestLog = {
      id: requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: rawBody,
      timestamp: new Date().toISOString(),
      response: null // Будет заполнено при получении ответа
    };

    // Сохраняем в историю
    requestsHistory.unshift(requestLog);
    if (requestsHistory.length > MAX_HISTORY) {
      requestsHistory.pop();
    }

    console.log(`\n[-->] ${requestLog.method} ${requestLog.url}`);
    if (rawBody) {
      try {
        console.log('Payload:', JSON.stringify(JSON.parse(rawBody), null, 2));
      } catch (e) {
        console.log('Payload:', rawBody);
      }
    }

    // Рассылаем перехваченный запрос всем подключенным клиентам UI
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'request', data: requestLog }));
      }
    });
  });

  // Перехватываем ответ от локального сервера
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];
  let responseLength = 0;
  let responseOmitted = false;
  const MAX_RESP_LOG_SIZE = 2 * 1024 * 1024; // 2 MB

  res.write = function (chunk, ...args) {
    if (chunk) {
      if (responseLength + chunk.length <= MAX_RESP_LOG_SIZE) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        responseLength += chunk.length;
      } else {
        responseOmitted = true;
      }
    }
    return oldWrite.apply(res, [chunk, ...args]);
  };

  res.end = function (chunk, ...args) {
    if (chunk) {
      if (responseLength + chunk.length <= MAX_RESP_LOG_SIZE) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        responseLength += chunk.length;
      } else {
        responseOmitted = true;
      }
    }

    let responseBody = '';
    const respContentType = res.getHeader('content-type') || '';
    
    if (responseOmitted) {
      responseBody = `[Response omitted: exceeds 2MB limit]`;
    } else if (isBinaryContentType(respContentType)) {
      responseBody = `[Binary Response: ${respContentType} (${responseLength} bytes)]`;
    } else {
      responseBody = Buffer.concat(chunks).toString('utf8');
    }

    const duration = Math.round(performance.now() - startTime);

    const responseLog = {
      requestId: requestId,
      statusCode: res.statusCode,
      headers: res.getHeaders(),
      body: responseBody,
      duration: duration
    };

    // Обновляем лог запроса в истории
    const hist = requestsHistory.find(r => r.id === requestId);
    if (hist) {
      hist.response = responseLog;
    }

    console.log(`[<--] Response Status: ${res.statusCode} for ${req.method} ${req.url} (${duration}ms)`);

    // Отправляем лог ответа клиентам
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ type: 'response', data: responseLog }));
      }
    });

    return oldEnd.apply(res, [chunk, ...args]);
  };

  // Проверяем Basic Auth перед проксированием
  if (AUTH_CREDENTIALS && !req.path.startsWith('/inspect')) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).send('Unauthorized: Access denied');
    }

    try {
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const user = auth[0];
      const pass = auth[1];

      if (user !== AUTH_CREDENTIALS.username || pass !== AUTH_CREDENTIALS.password) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).send('Unauthorized: Invalid credentials');
      }
    } catch (e) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      return res.status(401).send('Unauthorized: Invalid credentials');
    }
  }

  // Проксируем запрос дальше на оригинальный порт
  proxy.web(req, res, { buffer: req }, (err) => {
    if (err) {
      console.log(`[❌] Error forwarding to port ${TARGET_PORT}. Is your local server running?`);
      res.status(502).send('Bad Gateway: Local server not running');
    }
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[WS] Dashboard UI connected!');
  
  // Отправляем историю запросов и URL туннеля сразу при подключении
  ws.send(JSON.stringify({ type: 'config', data: { tunnelUrl: ACTIVE_TUNNEL_URL } }));
  ws.send(JSON.stringify({ type: 'history', data: requestsHistory }));

  // Обрабатываем запросы от UI (например, Replay)
  ws.on('message', async (message) => {
    try {
      const { type, id } = JSON.parse(message);
      
      if (type === 'replay') {
        const reqToReplay = requestsHistory.find(r => r.id === id);
        if (reqToReplay) {
          console.log(`[WS] Replaying request ${reqToReplay.method} ${reqToReplay.url}`);
          
          try {
            const headers = { ...reqToReplay.headers };
            // Удаляем заголовки, которые могут мешать повторной отправке
            delete headers.host;
            delete headers.connection;
            delete headers['content-length'];

            // Делаем повторный запрос через наш собственный прокси (чтобы он отобразился в UI)
            await fetch(`http://localhost:${PROXY_PORT}${reqToReplay.url}`, {
              method: reqToReplay.method,
              headers: headers,
              body: reqToReplay.method !== 'GET' && reqToReplay.method !== 'HEAD' ? reqToReplay.body : undefined
            });
            console.log(`[WS] Replay sent successfully through proxy`);
          } catch (fetchErr) {
            console.error('[WS] Replay failed:', fetchErr.message);
          }
        }
      }
    } catch (parseErr) {
      console.error('[WS] Failed to process message:', parseErr);
    }
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`\n🔌 FlareGUI Proxy is listening on internal port ${PROXY_PORT}`);
  console.log(`🎯 Forwarding all traffic to localhost:${TARGET_PORT}`);
  console.log(`\n🚀 Starting Cloudflare Tunnel...`);

  // Запускаем cloudflared через npx
  const tunnelArgs = TUNNEL_TOKEN 
    ? ['cloudflared', 'tunnel', 'run', '--token', TUNNEL_TOKEN] 
    : ['cloudflared', 'tunnel', '--url', `http://localhost:${PROXY_PORT}`];

  const tunnel = spawn('npx', tunnelArgs, {
    shell: process.platform === 'win32'
  });
  
  tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    
    // Фильтруем технические логи cloudflared при запуске
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      if (
        trimmed.includes('INF Version') ||
        trimmed.includes('INF GOOS') ||
        trimmed.includes('INF Settings') ||
        trimmed.includes('INF Autoupdate') ||
        trimmed.includes('INF Generated Connector ID') ||
        trimmed.includes('INF Initial protocol') ||
        trimmed.includes('INF ICMP proxy') ||
        trimmed.includes('INF Starting metrics server') ||
        trimmed.includes('INF Tunnel connection curve preferences') ||
        trimmed.includes('Cannot determine default configuration path')
      ) {
        continue;
      }
      console.error(trimmed);
    }
    
    // Ищем публичный URL в логах Cloudflare
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      ACTIVE_TUNNEL_URL = url;
      console.log(`\n========================================================`);
      console.log(`🌍 PUBLIC URL: ${url}`);
      console.log(`========================================================\n`);
      console.log(`Ждем входящие запросы...\n`);

      // Автоматически копируем в буфер обмена macOS
      exec(`echo "${url}" | pbcopy`);
      
      // Показываем нативное уведомление macOS
      exec(`osascript -e 'display notification "${url}" with title "FlareGUI" subtitle "Туннель запущен (ссылка скопирована)"'`);

      // Рассылаем новый URL всем подключенным UI клиентам
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'config', data: { tunnelUrl: ACTIVE_TUNNEL_URL } }));
        }
      });
    }

    // Если используется собственный токен, ловим успешное подключение
    if (TUNNEL_TOKEN && output.includes('Registered tunnel connection') && !ACTIVE_TUNNEL_URL) {
      ACTIVE_TUNNEL_URL = 'Используется собственный домен (через токен)';
      console.log(`\n========================================================`);
      console.log(`🌍 CUSTOM CLOUDFLARE TUNNEL CONNECTED`);
      console.log(`========================================================\n`);
      console.log(`Туннель запущен по вашей конфигурации Cloudflare.\n`);
      
      exec(`osascript -e 'display notification "Успешно подключено к Cloudflare" with title "FlareGUI" subtitle "Собственный туннель запущен"'`);

      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'config', data: { tunnelUrl: ACTIVE_TUNNEL_URL } }));
        }
      });
    }
  });

  tunnel.on('close', (code) => {
    console.log(`[Cloudflared] exited with code ${code}`);
  });
});
