const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { saveTelegramUserInfo } = require('./utils/userService');

const {
	getIssueDetailsMessage, // ты потом напишешь эту функцию
	getAllDetailsMessage    // тоже напишешь
} = require('./utils/messageFormatter');
const {
	sendTelegramMessage // пока не используется, на будущее
} = require('./utils/telegram');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Сохраняем данные пользователя при любом сообщении
bot.on('message', (msg) => {
	const user = msg.from;
	saveTelegramUserInfo(user);

	console.log(`📥 Написал пользователь: ${user.username || user.first_name} (${user.id})`);

	bot.sendMessage(user.id, '✅ Я тебя запомнил. Теперь ты можешь получать уведомления, если админ сопоставит твой аккаунт Plane.');
});

bot.on('callback_query', async (query) => {
	const chatId = query.message.chat.id;
	const messageId = query.message.message_id;
	const data = query.data;

	try {
		if (data.startsWith('detail_')) {
			const issueId = data.split('_')[1];
			const msg = await getIssueDetailsMessage(issueId);
			await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
		}

		if (data === 'view_all') {
			const msg = await getAllDetailsMessage(chatId);
			await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
		}

		if (data === 'close_summary') {
			await bot.deleteMessage(chatId, messageId);
		}

		// Удаляем уведомление о нажатии кнопки (опционально)
		await bot.answerCallbackQuery(query.id);
	} catch (err) {
		console.error('❌ Ошибка в обработке callback:', err.message);
		await bot.answerCallbackQuery(query.id, { text: 'Ошибка 😢' });
	}
});

module.exports = bot;
