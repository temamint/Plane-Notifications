const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { saveTelegramUserInfo } = require('./utils/userService');
const { getIssueDetailsMessage, getAllDetailsMessage } = require('./utils/botNotificationFormatter');
const { getNotificationByIssueId } = require('./utils/notificationBuffer');
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
			// detail_{issueId}_{issueKey}
			const detailParts = data.split('_');
			const issueId = detailParts[1];
			const issueKey = detailParts.slice(2).join('_') || 'unknown';
			console.log(`[callback_query] Processing detail_ for issueId: ${issueId}, issueKey: ${issueKey}`);
			const notif = await getNotificationByIssueId(issueId);
			if (!notif || !notif.project_id) {
				await bot.editMessageText('❌ Не удалось найти задачу в базе уведомлений', {
					chat_id: chatId,
					message_id: messageId,
					parse_mode: 'Markdown'
				});
				return;
			}
			const msg = await getIssueDetailsMessage(notif.project_id, issueId);
			console.log(`[callback_query] getIssueDetailsMessage result: ${msg.substring(0, 100)}...`);

			// Формируем inline-кнопки
			const issueUrl = `https://app.plane.so/${process.env.PLANE_WORKSPACE_SLUG}/browse/${issueKey}/`;
			const replyMarkup = {
				inline_keyboard: [
					[
						{ text: 'Открыть в Plane', url: issueUrl },
						{ text: 'Назад', callback_data: 'back_to_notifications' }
					]
				]
			};

			await bot.editMessageText(
				`Детальное описание изменений задачи [${issueKey}]:\n\n${msg}`,
				{
					chat_id: chatId,
					message_id: messageId,
					parse_mode: 'Markdown',
					reply_markup: replyMarkup
				}
			);
			console.log(`[callback_query] Detail message edited for chatId: ${chatId}`);
		}

		if (data === 'back_to_notifications' || data === 'view_all') {
			console.log(`[callback_query] Processing view_all/back_to_notifications for chatId: ${chatId}`);

			const msg = await getAllDetailsMessage(chatId);
			console.log(`[callback_query] getAllDetailsMessage result: ${msg.substring(0, 100)}...`);

			await bot.editMessageText(msg, {
				chat_id: chatId,
				message_id: messageId,
				parse_mode: 'Markdown'
			});
			console.log(`[callback_query] View all message edited for chatId: ${chatId}`);
		}

		if (data === 'close_summary') {
			console.log(`[callback_query] Processing close_summary for chatId: ${chatId}, messageId: ${messageId}`);

			await bot.deleteMessage(chatId, messageId);
			console.log(`[callback_query] Summary message deleted for chatId: ${chatId}`);
		}

		// Удаляем уведомление о нажатии кнопки (опционально)
		try {
			await bot.answerCallbackQuery(query.id);
			console.log(`[callback_query] Callback query answered for chatId: ${chatId}`);
		} catch (err) {
			if (err.message.includes('query is too old') || err.message.includes('query ID is invalid')) {
				console.warn(`[callback_query] ⚠️ Callback query expired for chatId: ${chatId}, data: "${data}"`);
			} else {
				console.error(`[callback_query] ❌ Error answering callback query for chatId: ${chatId}:`, err.message);
			}
		}
	} catch (err) {
		console.error(`[callback_query] ❌ Error processing callback for chatId: ${chatId}, data: "${data}":`, err.message);
		try {
			await bot.answerCallbackQuery(query.id, { text: 'Ошибка 😢' });
		} catch (answerErr) {
			if (!answerErr.message.includes('query is too old') && !answerErr.message.includes('query ID is invalid')) {
				console.error(`[callback_query] ❌ Error answering callback query on error for chatId: ${chatId}:`, answerErr.message);
			}
		}
	}
});

module.exports = bot;
