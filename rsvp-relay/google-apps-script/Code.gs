/**
 * Бесплатный релей без VPS: Google Apps Script → Telegram.
 *
 * 1) script.google.com → Новый проект → вставить этот код.
 * 2) Слева «Триггеры» не нужны. Справа «Проект» → «Свойства скрипта»:
 *    TG_BOT_TOKEN, TG_CHAT_ID (обязательно)
 *    RSVP_RELAY_SECRET — опционально; тогда в .env сайта тот же VITE_RSVP_RELAY_SECRET
 * 3) Развернуть → Новое развертывание → Тип «Веб-приложение»
 *    Выполнять от имени: Я
 *    У кого есть доступ: Все
 * 4) Скопировать URL вида https://script.google.com/macros/s/.../exec
 *    → VITE_RSVP_RELAY_URL="этот URL"
 *
 * Сайт шлёт JSON в теле с Content-Type: text/plain (без preflight CORS). Секрет в поле "secret".
 */

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TG_BOT_TOKEN');
  var chatId = props.getProperty('TG_CHAT_ID');
  var relaySecret = props.getProperty('RSVP_RELAY_SECRET') || '';

  if (!token || !chatId) {
    return jsonOut({ ok: false, description: 'Server not configured' });
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return jsonOut({ ok: false, description: 'Invalid JSON' });
  }

  if (relaySecret) {
    var sent = String(body.secret || '');
    if (sent !== relaySecret) {
      return jsonOut({ ok: false, description: 'Forbidden' });
    }
  }

  var name = String(body.name || '').trim();
  var attendance = String(body.attendance || '');
  if (!name) {
    return jsonOut({ ok: false, description: 'Name required' });
  }

  var statusLabel = attendance === 'Буду' ? '✅ С удовольствием буду' : '❌ К сожалению, не смогу';
  var sentAt = Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy, HH:mm');
  var source = 'google-apps-script';

  var message =
    '<b>RSVP • Катя & Артём</b>\n' +
    '━━━━━━━━━━━━━━\n' +
    '🕊 <b>Новый ответ на приглашение</b>\n\n' +
    '👤 <b>Гость</b>\n' +
    escapeHtml(name) +
    '\n\n' +
    '📌 <b>Статус</b>\n' +
    escapeHtml(statusLabel) +
    '\n\n' +
    '🕒 <b>Время:</b> ' +
    escapeHtml(sentAt) +
    '\n' +
    '🌐 <b>Источник:</b> ' +
    escapeHtml(source);

  var tgUrl = 'https://api.telegram.org/bot' + token + '/sendMessage';
  var payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
  };

  try {
    var res = UrlFetchApp.fetch(tgUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var data = JSON.parse(res.getContentText());
    if (code >= 200 && code < 300 && data.ok) {
      return jsonOut({ ok: true });
    }
    return jsonOut({ ok: false, description: String(data.description || 'Telegram error') });
  } catch (err) {
    return jsonOut({ ok: false, description: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
