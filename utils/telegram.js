const axios = require('axios');
require('dotenv').config();

async function sendTelegramMessage(text, chatId = null) {
	const targetId = chatId || process.env.CHAT_ID;

	if (!targetId) {
		console.error('❌ Не указан chat_id ни в параметре, ни в .env');
		return;
	}

	const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

	try {
		await axios.post(url, {
			chat_id: targetId,
			text,
			parse_mode: 'Markdown'
		});
	} catch (error) {
		console.error(`Ошибка при отправке в Telegram чат ${targetId}:`, error.response?.data || error.message);
	}
}

module.exports = { sendTelegramMessage };