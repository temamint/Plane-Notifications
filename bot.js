const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { saveTelegramUserInfo } = require('./utils/userService');
const { getIssueDetailsMessage, getAllDetailsMessage } = require('./utils/botNotificationFormatter');
const { sendTelegramMessage } = require('./utils/telegram');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

console.log('Бот стартует...');

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

	console.log(`[callback_query] Received callback: chatId=${chatId}, messageId=${messageId}, data="${data}"`);

	try {
		if (data.startsWith('detail_')) {
			const issueId = data.split('_')[1];
			console.log(`[callback_query] Processing detail_ for issueId: ${issueId}`);

			const msg = await getIssueDetailsMessage(issueId);
			console.log(`[callback_query] getIssueDetailsMessage result: ${msg.substring(0, 100)}...`);

			await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
			console.log(`[callback_query] Detail message sent to chatId: ${chatId}`);
		}

		if (data === 'view_all') {
			console.log(`[callback_query] Processing view_all for chatId: ${chatId}`);

			const msg = await getAllDetailsMessage(chatId);
			console.log(`[callback_query] getAllDetailsMessage result: ${msg.substring(0, 100)}...`);

			await bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
			console.log(`[callback_query] View all message sent to chatId: ${chatId}`);
		}

		if (data === 'close_summary') {
			console.log(`[callback_query] Processing close_summary for chatId: ${chatId}, messageId: ${messageId}`);

			await bot.deleteMessage(chatId, messageId);
			console.log(`[callback_query] Summary message deleted for chatId: ${chatId}`);
		}

		// Удаляем уведомление о нажатии кнопки (опционально)
		await bot.answerCallbackQuery(query.id);
		console.log(`[callback_query] Callback query answered for chatId: ${chatId}`);
	} catch (err) {
		console.error(`[callback_query] ❌ Error processing callback for chatId: ${chatId}, data: "${data}":`, err.message);
		await bot.answerCallbackQuery(query.id, { text: 'Ошибка 😢' });
	}
});

module.exports = bot;
