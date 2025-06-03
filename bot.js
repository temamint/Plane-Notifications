const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { saveTelegramUserInfo } = require('./utils/userService');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Сохраняем данные пользователя при любом сообщении
bot.on('message', (msg) => {
	const user = msg.from;
	saveTelegramUserInfo(user);

	console.log(`📥 Написал пользователь: ${user.username || user.first_name} (${user.id})`);

	bot.sendMessage(user.id, '✅ Я тебя запомнил. Теперь ты можешь получать уведомления, если админ сопоставит твой аккаунт Plane.');
});

module.exports = bot;
