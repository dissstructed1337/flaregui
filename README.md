# FlareGUI

A lightweight CLI tool to tunnel localhost to the public web using Cloudflare Tunnels (trycloudflare) and inspect HTTP traffic in real-time. A free, zero-config ngrok alternative.

---

## Features

- **Zero Config**: Instantly exposes localhost with a public URL. No signup or account required.
- **Web Inspector**: Built-in React UI (`localhost:4040/inspect`) to view headers, query params, and body payloads.
- **Replay & cURL**: Resend captured requests to your local server or copy them as cURL commands with one click.
- **Telemetry**: View request counts, average latency (ms), response status distribution (2xx/4xx/5xx), and error logs.
- **Basic Auth Protection**: Secure your public tunnel with `--auth user:password` while keeping the local inspector public.
- **Custom Domains**: Use your own persistent Cloudflare Tunnel via `--token <token>`.
- **Large Payload Safety**: Automatically caps logged payload previews at 2MB and handles binary formats (images, files) gracefully to prevent memory leaks.
- **macOS Integration**: Auto-copies the tunnel URL to your clipboard and shows macOS system notifications upon success.

## Quick Start

Run the tunnel pointing to your local server (e.g., port 3000):

```bash
npx flaregui --port 3000
```

- The public tunnel URL will be automatically copied to your clipboard.
- Open **[http://localhost:4040/inspect](http://localhost:4040/inspect)** to view the dashboard and QR code for mobile testing.

## CLI Options

```text
  Usage:
    npx flaregui [options]

  Options:
    -p, --port <number>      Local port of your application (default: 3000)
    -i, --inspect <number>   Port for the web inspector and proxy (default: 4040)
    -a, --auth <user:pass>   Protect the tunnel with Basic Auth (e.g. admin:1234)
    -t, --token <string>     Use your own Cloudflare Tunnel token
    -h, --help               Show help
```

## Local Development & Installation

For local development and running from source:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/flaregui.git
   cd flaregui
   ```
2. Install root dependencies:
   ```bash
   npm install
   ```
3. Install UI dependencies and build UI static assets:
   ```bash
   npm run build
   ```
4. Link the executable globally:
   ```bash
   npm link
   ```
5. Run the CLI:
   ```bash
   flaregui -p 3000
   ```

---

# FlareGUI (На русском)

Легковесная CLI-утилита для туннелирования localhost в публичную сеть на базе Cloudflare Tunnels (trycloudflare) со встроенным инспектором HTTP-трафика. Бесплатная альтернатива ngrok, работающая без регистрации.

---

## Возможности

- **Без настроек**: Мгновенно создает публичный адрес для локального порта. Аккаунт не требуется.
- **Инспектор запросов**: Веб-панель (`localhost:4040/inspect`) для детального анализа заголовков, query-параметров и тела запросов.
- **Replay и cURL**: Повторная отправка запросов на локальный сервер или копирование запроса в формате cURL в один клик.
- **Телеметрия**: Общая статистика запросов, среднее время ответа (мс), распределение по HTTP-методам/статусам и журнал ошибок.
- **Защита паролем**: Ограничение внешнего доступа к туннелю с помощью Basic Auth (`--auth user:pass`).
- **Собственные домены**: Использование постоянных приватных туннелей Cloudflare с помощью флага `--token <token>`.
- **Ограничение размера**: Лимит на логирование тела запроса/ответа до 2 МБ и определение бинарных данных (изображения, файлы) для защиты от перегрузки оперативной памяти.
- **Интеграция с macOS**: Автоматическое копирование ссылки в буфер обмена и показ нативных системных уведомлений при запуске.

## Быстрый старт

Запустите туннель для локального порта (например, 3000):

```bash
npx flaregui --port 3000
```

- Публичный адрес автоматически скопируется в буфер обмена.
- Панель инспектора и QR-код для тестов с телефона будут доступны по адресу: **[http://localhost:4040/inspect](http://localhost:4040/inspect)**.

## Параметры командной строки (CLI Options)

```text
  Использование:
    npx flaregui [опции]

  Опции:
    -p, --port <number>      Локальный порт вашего приложения (по умолчанию: 3000)
    -i, --inspect <number>   Порт для веб-инспектора и прокси (по умолчанию: 4040)
    -a, --auth <user:pass>   Защитить туннель паролем Basic Auth (пример: admin:1234)
    -t, --token <string>     Использовать собственный токен туннеля Cloudflare
    -h, --help               Показать справку
```

## Установка и локальная разработка

Для локального запуска и разработки:

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/your-username/flaregui.git
   cd flaregui
   ```
2. Установите зависимости корневого проекта:
   ```bash
   npm install
   ```
3. Соберите проект (установит зависимости фронтенда и скомпилирует бандл):
   ```bash
   npm run build
   ```
4. Создайте глобальную ссылку на исполняемый файл в системе:
   ```bash
   npm link
   ```
5. Запустите утилиту:
   ```bash
   flaregui -p 3000
   ```

---

## License / Лицензия

MIT License.
