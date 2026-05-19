# FlareGUI

<p align="left">
  <a href="https://github.com/dissstructed1337/flaregui/releases"><img src="https://img.shields.io/github/v/release/dissstructed1337/flaregui?style=flat-square&color=blue" alt="Release"></a>
  <a href="https://github.com/dissstructed1337/flaregui/blob/main/LICENSE"><img src="https://img.shields.io/github/license/dissstructed1337/flaregui?style=flat-square&color=yellow" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-blue?style=flat-square" alt="Node version"></a>
</p>

A lightweight CLI tool to tunnel localhost to the public web using Cloudflare Tunnels (trycloudflare) and inspect HTTP traffic in real-time. A free, zero-config alternative to Ngrok.

---

## Features

- **Zero Configuration**: Instantly exposes local ports to a public URL. No signup, registration, or accounts required.
- **Web Inspector**: Interactive React dashboard (`http://localhost:4040/inspect`) to view detailed headers, query parameters, and body payloads.
- **Replay & cURL Integration**: Re-send captured requests directly from the dashboard or copy them as ready-to-run cURL commands in one click.
- **Live Telemetry & Dashboard**: Real-time stats including total requests, average response latency, status distributions (2xx/4xx/5xx), and a dedicated error logger.
- **Basic Authentication**: Lock public tunnel access with `--auth user:password` while keeping local inspector access completely open.
- **Custom Persistent Domains**: Support for running persistent named tunnels using your own Cloudflare Tunnel credentials via `--token <token>`.
- **Large Payload & Binary Protection**: Caps logs at 2MB to keep memory consumption low, and flags binary requests (images, uploads) gracefully to prevent terminal and browser stalls.
- **Desktop Integrations**: Automatically copies the active tunnel URL to your clipboard and issues native macOS desktop notifications upon successful connection.

---

## Quick Start

Instantly expose a local server (e.g., running on port 3000) to the public web:

```bash
npx flaregui --port 3000
```

1. The public URL will be copied to your clipboard automatically.
2. Open **[http://localhost:4040/inspect](http://localhost:4040/inspect)** to monitor traffic or view the generated QR code for mobile testing.

---

## CLI Options

| Option | Description | Default |
| --- | --- | --- |
| `-p, --port <number>` | Local port of the application you want to expose | `3000` |
| `-i, --inspect <number>`| Port for the Web Inspector and proxy server | `4040` |
| `-a, --auth <user:pass>` | Enable Basic Authentication to protect the public tunnel | — |
| `-t, --token <string>` | Use your own custom Cloudflare Tunnel token | — |
| `-h, --help` | Display CLI options and usage | — |

---

## Local Development & Source Installation

If you want to contribute, modify the UI, or run directly from the source code:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dissstructed1337/flaregui.git
   cd flaregui
   ```
2. **Install core dependencies:**
   ```bash
   npm install
   ```
3. **Build the dashboard UI assets:**
   ```bash
   npm run build
   ```
4. **Link the CLI binary globally:**
   ```bash
   npm link
   ```
5. **Run the utility:**
   ```bash
   flaregui -p 3000
   ```

---

# FlareGUI (На русском)

Легковесная CLI-утилита для туннелирования localhost в публичную сеть на базе Cloudflare Tunnels (trycloudflare) со встроенным инспектором HTTP-трафика. Бесплатная альтернатива Ngrok, работающая без регистрации.

---

## Возможности

- **Быстрый старт**: Публичный адрес генерируется мгновенно одной командой. Не требует создания аккаунта.
- **Инспектор запросов**: Веб-панель (`http://localhost:4040/inspect`) для глубокого анализа заголовков, query-параметров и тела входящих запросов.
- **Replay и экспорт в cURL**: Возможность повторной отправки любого перехваченного запроса на локальный сервер или его быстрого экспорта в виде cURL-команды в буфер обмена.
- **Панель телеметрии (Dashboard)**: Наглядная статистика в реальном времени: общее число запросов, среднее время ответа (мс), графики распределения HTTP-методов и журнал ошибок.
- **Basic Auth защита**: Ограничение внешнего публичного доступа к туннелю с помощью авторизации через флаг `--auth user:pass`.
- **Собственные домены**: Поддержка постоянных приватных туннелей Cloudflare с использованием вашего токена через параметр `--token <token>`.
- **Контроль памяти (Capping)**: Лимит логирования тела запросов/ответов до 2 МБ и автоопределение бинарных файлов (картинки, архивы) предотвращают перегрузку RAM.
- **macOS интеграция**: Автокопирование сгенерированного адреса в буфер обмена и показ нативных системных уведомлений при успешном старте.

---

## Быстрый старт

Откройте доступ к локальному серверу (например, на порту 3000):

```bash
npx flaregui --port 3000
```

1. Сгенерированный публичный адрес автоматически скопируется в буфер обмена.
2. Откройте инспектор по адресу **[http://localhost:4040/inspect](http://localhost:4040/inspect)** для анализа трафика и получения QR-кода для мобильных тестов.

---

## Параметры командной строки

| Опция | Описание | По умолчанию |
| --- | --- | --- |
| `-p, --port <number>` | Локальный порт вашего приложения | `3000` |
| `-i, --inspect <number>`| Порт для веб-инспектора и прокси | `4040` |
| `-a, --auth <user:pass>` | Защитить публичный туннель паролем Basic Auth | — |
| `-t, --token <string>` | Использовать токен вашего собственного туннеля | — |
| `-h, --help` | Показать справку по доступным командам | — |

---

## Разработка и сборка из исходников

Для локального запуска и изменения проекта:

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/dissstructed1337/flaregui.git
   cd flaregui
   ```
2. **Установите основные зависимости:**
   ```bash
   npm install
   ```
3. **Соберите фронтенд-панель (React):**
   ```bash
   npm run build
   ```
4. **Создайте глобальную символическую ссылку:**
   ```bash
   npm link
   ```
5. **Запустите утилиту:**
   ```bash
   flaregui -p 3000
   ```

---

## License / Лицензия

MIT License.
