// routes/webhook.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const TurndownService = require('turndown');
const turndownService = new TurndownService();

require('dotenv').config();

// 👇 Мапа пользователей
const userMap = {
	'119ff6a7-34cd-4c9e-bd3c-6713180db64c': 'Artem Mint',
	'adbe2bdc-1c23-4aed-8dd7-de7c0ebf9a9d': 'Dimasio Ovchinnickov',
	'eb65a721-30fb-4bdd-bcb4-7a392ba628ea': 'Kateryna Diachenko',
	'b3ecba52-6882-436c-969c-6c9ae1dd6dc0': 'Руслан Мельник',
	'f6b9dbc6-cd48-48de-96c8-dc7288f5356a': 'Роман Барабанов',
	'4f01ecb8-02da-40db-9b28-369e019b8c78': 'Dmitriy Shein',
	'ad8d0cda-9e6b-40c1-9067-ce421ab0e209': 'Alexei Kirienko',
};

function getUserNameById(id) {
	return userMap[id] || `Unknown (${id})`;
}

const config = {
	telegramToken: process.env.TELEGRAM_BOT_TOKEN,
	chatId: process.env.CHAT_ID,
	webhookSecret: process.env.PLANE_WEBHOOK_SECRET,
};

function verifySignature(req) {
	const signature = req.headers['x-plane-signature'];
	const payload = req.body;

	const expectedSignature = crypto
		.createHmac('sha256', config.webhookSecret)
		.update(payload)
		.digest('hex');

	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

function formatIssueMessage(action, data) {
	let description = 'N/A';
	if (typeof data.description_html === 'string' && data.description_html.trim()) {
		description = turndownService.turndown(data.description_html);
	} else if (typeof data.description_stripped === 'string') {
		description = data.description_stripped;
	}

	let title;
	switch (action) {
		case 'created': title = '🆕 Новая задача'; break;
		case 'updated': title = '✏️ Обновление задачи'; break;
		case 'deleted': title = '🗑️ Удалена задача'; break;
		default: title = `*ISSUE* — ${action}`;
	}

	return `${title}
*ID:* ${data.identifier}
*Название:* ${data.name || 'Без названия'}
*Описание:* ${description}
*Автор:* ${getUserNameById(data.updated_by)}`;
}

function formatCommentMessage(action, data) {
	const content = typeof data.comment_stripped === 'object'
		? JSON.stringify(data.comment_stripped, null, 2)
		: data.comment_stripped || 'Комментарий без текста';

	let title;
	switch (action) {
		case 'created': title = '💬 Новый комментарий'; break;
		case 'updated': title = '✏️ Обновлён комментарий'; break;
		case 'deleted': title = '🗑️ Удалён комментарий'; break;
		default: title = `*COMMENT* (${action})`;
	}

	return `${title}
*Автор:* ${getUserNameById(data.created_by)}
*Содержание:* ${content}`;
}

async function sendTelegramMessage(text) {
	const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
	await axios.post(url, {
		chat_id: config.chatId,
		text: text,
		parse_mode: 'Markdown'
	});
}

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
	console.log('📩 Получен вебхук:', req.headers, req.body);

	if (!verifySignature(req)) {
		return res.status(403).send('Неверная подпись');
	}

	try {
		const parsedBody = JSON.parse(req.body.toString());
		const { event, action, data } = parsedBody;

		let message;
		switch (event) {
			case 'issue':
				message = formatIssueMessage(action, data);
				break;
			case 'issue_comment':
				message = formatCommentMessage(action, data);
				break;
			default:
				message = `🚫 Необработанное событие: *${event}*`;
		}

		await sendTelegramMessage(message);
		res.status(200).send('Обработано');
	} catch (error) {
		console.error('Ошибка при обработке вебхука:', error);
		res.status(500).send('Ошибка при обработке вебхука');
	}
});

module.exports = router;
