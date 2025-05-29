const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
require('dotenv').config();

const config = {
	telegramToken: process.env.TELEGRAM_TOKEN,
	webhookPath: process.env.WEBHOOK_PATH,
	port: process.env.PORT,
	chatId: process.env.CHAT_ID,
	webhookSecret: process.env.WEBHOOK_SECRET
};

console.log('Loaded ENV:', {
	TELEGRAM_TOKEN: config.telegramToken,
	CHAT_ID: config.chatId,
	WEBHOOK_SECRET: config.webhookSecret,
	PORT: config.port,
	WEBHOOK_PATH: config.webhookPath
});

const app = express();
app.use(
	config.webhookPath,
	express.raw({ type: 'application/json' })
);

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
	const description =
		typeof data.description === 'object'
			? JSON.stringify(data.description, null, 2)
			: data.description || 'N/A';

	let title;
	switch (action) {
		case 'created':
			title = '🆕 Новая задача';
			break;
		case 'updated':
			title = '✏️ Обновление задачи';
			break;
		case 'deleted':
			title = '🗑️ Удалена задача';
			break;
		default:
			title = `*ISSUE* — (${action})`;
	}

	return `${title}
*ID:* ${data.identifier}
*Название:* ${data.name || 'Без названия'}

*Описание:* ${description}`;
}

function formatCommentMessage(action, data) {
	const content =
		typeof data.content === 'object'
			? JSON.stringify(data.content, null, 2)
			: data.content || 'Комментарий без текста';

	let title;
	switch (action) {
		case 'created':
			title = '💬 Новый комментарий';
			break;
		case 'updated':
			title = '✏️ Обновлён комментарий';
			break;
		case 'deleted':
			title = '🗑️ Удалён комментарий';
			break;
		default:
			title = `*COMMENT* (${action})`;
	}

	return `${title}
*Автор:* ${data.created_by?.name || 'N/A'}
*Содержание:* ${content}`;
}


// Функция отправки сообщения в Telegram
async function sendTelegramMessage(text) {
	const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;

	try {
		const response = await axios.post(url, {
			chat_id: config.chatId,
			text: text,
			parse_mode: 'Markdown'
		});

		console.log('Сообщение отправлено:', response.data);
	} catch (error) {
		console.error('Ошибка при отправке сообщения в Telegram:', error.response?.data || error.message);
		throw error;
	}
}

// Обработчик вебхука
app.post(config.webhookPath, async (req, res) => {
	console.log('Получен вебхук:', req.headers, req.body);

	// Проверка подписи
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

module.exports = app;

