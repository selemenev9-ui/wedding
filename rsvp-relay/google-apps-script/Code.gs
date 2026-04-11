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
 * Сайт шлёт application/x-www-form-urlencoded (name, attendance, secret?) — простой POST для браузера.
 * Старый вариант JSON в postData.contents тоже поддерживается.
 */

function parseRelayPayload(e) {
  var raw = (e.postData && e.postData.contents) ? String(e.postData.contents) : '';
  if (raw && raw.charAt(0) === '{') {
    try {
      var jo = JSON.parse(raw);
      return {
        name: String(jo.name || '').trim(),
        attendance: String(jo.attendance || ''),
        secret: String(jo.secret || ''),
      };
    } catch (ignore) {
      return null;
    }
  }
  var p = e.parameter || {};
  return {
    name: String(p.name || '').trim(),
    attendance: String(p.attendance || ''),
    secret: String(p.secret || ''),
  };
}

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TG_BOT_TOKEN');
  var chatId = props.getProperty('TG_CHAT_ID');
  var relaySecret = props.getProperty('RSVP_RELAY_SECRET') || '';

  if (!token || !chatId) {
    return jsonOut({ ok: false, description: 'Server not configured' });
  }

  var body = parseRelayPayload(e);
  if (!body) {
    return jsonOut({ ok: false, description: 'Invalid body' });
  }

  if (relaySecret) {
    var sent = String(body.secret || '');
    if (sent !== relaySecret) {
      return jsonOut({ ok: false, description: 'Forbidden' });
    }
  }

  var name = body.name;
  var attendance = body.attendance;
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
