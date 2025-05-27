const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');

// Конфигурация
const config = {
	telegramToken: "8176734640:AAEvt3IwIIzdgyFXijUT61gHw_gZWVBBLxA", // Замените на ваш токен
	webhookPath: '/webhook', // Путь для вебхука
	port: process.env.PORT || 3000, // Порт сервера
	chatId: "-4858887399", // ID чата для отправки уведомлений
	webhookSecret: "plane_wh_43fd67084e754bc4b5862b0dcda7f957" // Секретный ключ вебхука
};

// Инициализация Express приложения
const app = express();
app.use(
	config.webhookPath,
	express.raw({ type: 'application/json' }) // важно: только для webhookPath
);

// Функция проверки подписи
function verifySignature(req) {
	const signature = req.headers['x-plane-signature'];
	const payload = req.body; // это Buffer

	const expectedSignature = crypto
		.createHmac('sha256', config.webhookSecret)
		.update(payload)
		.digest('hex');

	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}


// Функция форматирования сообщения об issue
function formatIssueMessage(event, action, data) {
	return `*${event.toUpperCase()}* (${action})
*ID:* ${data.id}
*Название:* ${data.name || 'N/A'}
*Описание:* ${data.description || 'N/A'}`;
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
		if (event === 'issue') {
			message = formatIssueMessage(event, action, data);
		} else {
			message = `Необработанное событие: ${event}`;
		}

		await sendTelegramMessage(message);
		res.status(200).send('Обработано');
	} catch (error) {
		console.error('Ошибка при обработке вебхука:', error);
		res.status(500).send('Ошибка при обработке вебхука');
	}
});

module.exports = app;
