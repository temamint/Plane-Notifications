const axios = require('axios');
require('dotenv').config();

async function sendTelegramMessage(text) {
	const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
	try {
		await axios.post(url, {
			chat_id: process.env.CHAT_ID,
			text,
			parse_mode: 'Markdown'
		});
	} catch (error) {
		console.error('Ошибка отправки в Telegram:', error.response?.data || error.message);
		throw error;
	}
}

module.exports = { sendTelegramMessage };