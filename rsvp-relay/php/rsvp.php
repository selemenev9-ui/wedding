<?php
/**
 * RSVP → Telegram relay for shared hosting (Beget и др. с PHP + curl).
 * Залейте в корень сайта (например public_html/rsvp.php), заполните константы ниже.
 * В сборке сайта: VITE_RSVP_RELAY_URL=https://ваш-домен.ru/rsvp.php
 * Опционально: VITE_RSVP_RELAY_SECRET — тот же текст, что RSVP_RELAY_SECRET ниже.
 *
 * Не публикуйте этот файл с реальными токенами в открытый git.
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Rsvp-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(405, ['ok' => false, 'description' => 'Method not allowed']);
}

// ─── Заполните на сервере ─────────────────────────────────────────
const TG_BOT_TOKEN   = 'PASTE_BOT_TOKEN_HERE';
const TG_CHAT_ID     = 'PASTE_CHAT_ID_HERE';
const RELAY_SECRET   = ''; // например случайная строка; пусто = без проверки

function json_response(int $code, array $data): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function h(string $s): string
{
    return htmlspecialchars($s, ENT_HTML5 | ENT_QUOTES, 'UTF-8');
}

if (TG_BOT_TOKEN === 'PASTE_BOT_TOKEN_HERE' || TG_CHAT_ID === 'PASTE_CHAT_ID_HERE') {
    json_response(500, ['ok' => false, 'description' => 'Configure TG_BOT_TOKEN and TG_CHAT_ID in rsvp.php']);
}

$raw = file_get_contents('php://input') ?: '';
$ct = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
if (strpos($ct, 'application/x-www-form-urlencoded') !== false) {
    parse_str($raw, $parsed);
    $body = [
        'name' => (string) ($parsed['name'] ?? ''),
        'attendance' => (string) ($parsed['attendance'] ?? ''),
        'secret' => (string) ($parsed['secret'] ?? ''),
    ];
} else {
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        json_response(400, ['ok' => false, 'description' => 'Invalid JSON']);
    }
    $body = $decoded;
}

if (RELAY_SECRET !== '') {
    $hdr = $_SERVER['HTTP_X_RSVP_SECRET'] ?? '';
    $fromBody = isset($body['secret']) ? (string) $body['secret'] : '';
    $sent = $hdr !== '' ? $hdr : $fromBody;
    if (!hash_equals(RELAY_SECRET, $sent)) {
        json_response(403, ['ok' => false, 'description' => 'Forbidden']);
    }
}

$name = trim((string) ($body['name'] ?? ''));
$attendance = (string) ($body['attendance'] ?? '');
if ($name === '') {
    json_response(400, ['ok' => false, 'description' => 'Name required']);
}

$statusLabel = $attendance === 'Буду' ? '✅ С удовольствием буду' : '❌ К сожалению, не смогу';
$sentAt = (new DateTimeImmutable('now', new DateTimeZone('Europe/Moscow')))->format('d.m.Y, H:i');
$source = h($_SERVER['HTTP_HOST'] ?? 'rsvp-php');

$message =
    '<b>RSVP • Катя & Артём</b>' . "\n" .
    "━━━━━━━━━━━━━━\n" .
    "🕊 <b>Новый ответ на приглашение</b>\n\n" .
    '👤 <b>Гость</b>' . "\n" .
    h($name) . "\n\n" .
    '📌 <b>Статус</b>' . "\n" .
    h($statusLabel) . "\n\n" .
    '🕒 <b>Время:</b> ' . h($sentAt) . "\n" .
    '🌐 <b>Источник:</b> ' . $source;

$payload = json_encode([
    'chat_id' => TG_CHAT_ID,
    'text' => $message,
    'parse_mode' => 'HTML',
], JSON_UNESCAPED_UNICODE);

$url = 'https://api.telegram.org/bot' . TG_BOT_TOKEN . '/sendMessage';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json; charset=utf-8'],
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
]);
$response = curl_exec($ch);
$errno = curl_errno($ch);
curl_close($ch);

if ($errno !== 0 || !is_string($response)) {
    json_response(502, ['ok' => false, 'description' => 'Telegram request failed']);
}

$data = json_decode($response, true);
if (!is_array($data)) {
    json_response(502, ['ok' => false, 'description' => 'Bad Telegram response']);
}

if (!empty($data['ok'])) {
    json_response(200, ['ok' => true]);
}

json_response(502, ['ok' => false, 'description' => (string) ($data['description'] ?? 'Telegram error')]);
