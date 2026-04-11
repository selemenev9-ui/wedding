/**
 * Minimal RSVP → Telegram relay. Deploy on any VPS (EU/US) reachable from your guests.
 * Browser never calls api.telegram.org; only this process does.
 *
 * Env:
 *   TG_BOT_TOKEN, TG_CHAT_ID — same values as your Telegram bot
 *   PORT — listen port (default 8787)
 *   RSVP_RELAY_SECRET — optional; client sends header X-Rsvp-Secret and JSON body.secret (see VITE_RSVP_RELAY_SECRET)
 */
import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const TG_TOKEN = process.env.TG_BOT_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;
const RELAY_SECRET = (process.env.RSVP_RELAY_SECRET || '').trim();

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Rsvp-Secret');
}

function sendJson(res, code, body) {
    setCors(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = code;
    res.end(JSON.stringify(body));
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

const server = http.createServer((req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const pathOnly = req.url?.split('?')[0] || '/';
    if (pathOnly !== '/rsvp') {
        sendJson(res, 404, { ok: false, description: 'Not found' });
        return;
    }
    if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, description: 'Method not allowed' });
        return;
    }

    if (!TG_TOKEN || !TG_CHAT_ID) {
        sendJson(res, 500, { ok: false, description: 'Server missing TG_BOT_TOKEN or TG_CHAT_ID' });
        return;
    }

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
        let body;
        try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        } catch {
            sendJson(res, 400, { ok: false, description: 'Invalid JSON' });
            return;
        }

        if (RELAY_SECRET) {
            const fromHeader = String(req.headers['x-rsvp-secret'] || '');
            const fromBody = String(body.secret || '');
            const sent = fromHeader || fromBody;
            if (sent !== RELAY_SECRET) {
                sendJson(res, 403, { ok: false, description: 'Forbidden' });
                return;
            }
        }

        const name = String(body.name || '').trim();
        const attendance = String(body.attendance || '');
        if (!name) {
            sendJson(res, 400, { ok: false, description: 'Name required' });
            return;
        }

        const safeName = escapeHtml(name);
        const statusLabel = attendance === 'Буду' ? '✅ С удовольствием буду' : '❌ К сожалению, не смогу';
        const safeStatus = escapeHtml(statusLabel);
        const sentAt = new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const safeSentAt = escapeHtml(sentAt);
        const source = escapeHtml(req.headers.host || 'rsvp-relay');
        const message =
            `<b>RSVP • Катя & Артём</b>\n` +
            `━━━━━━━━━━━━━━\n` +
            `🕊 <b>Новый ответ на приглашение</b>\n\n` +
            `👤 <b>Гость</b>\n` +
            `${safeName}\n\n` +
            `📌 <b>Статус</b>\n` +
            `${safeStatus}\n\n` +
            `🕒 <b>Время:</b> ${safeSentAt}\n` +
            `🌐 <b>Источник:</b> ${source}`;

        try {
            const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                }),
            });
            const data = await tgRes.json();
            const ok = tgRes.ok && data.ok;
            sendJson(res, ok ? 200 : 502, ok ? { ok: true, result: data.result } : data);
        } catch (err) {
            sendJson(res, 502, {
                ok: false,
                description: err instanceof Error ? err.message : 'Network error',
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`RSVP relay listening on http://0.0.0.0:${PORT} (POST /rsvp)`);
});
