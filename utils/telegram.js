const bot = require('../bot');
const {
	getNotifications,
	getLastMessage,
	setLastMessage,
	markNotificationsAsSent
} = require('./notificationBuffer');
const { escapeMarkdown } = require('./markdownFormatter');

const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Отправляет сводное уведомление с кнопками
 * @param {number} chatId — кому отправить
 */
async function sendSummaryNotification(chatId) {
	let notifs;
	try {
		notifs = await getNotifications(chatId, ['unread', 'sent']);
	} catch (err) {
		console.error(`❌ Ошибка Supabase при получении уведомлений для ${chatId}:`, err.message);
		return;
	}
	if (!notifs || !notifs.length) {
		console.log(`ℹ️ Нет уведомлений для отправки в чат ${chatId}`);
		return;
	}

	// Дедупликация по issueId (оставляем самое свежее)
	const unique = {};
	notifs.forEach(n => {
		unique[n.issue_id] = n;
	});
	notifs = Object.values(unique);

	// Удаляем предыдущее сообщение, если есть
	const lastMessageId = getLastMessage(chatId);
	if (lastMessageId) {
		try {
			await bot.deleteMessage(chatId, lastMessageId);
			console.log(`✅ Удалено сообщение ${lastMessageId}`);
		} catch (err) {
			console.warn(`⚠️ Не удалось удалить сообщение ${lastMessageId} в чате ${chatId}:`, err.message);
		}
	}

	const textBlocks = [];
	let current = `🔔 *${notifs.length} новых обновлений:*\n\n`;
	for (const n of notifs) {
		const line = `• ${n.emoji || '📝'} *${escapeMarkdown(n.issue_key)}* — ${escapeMarkdown(n.title)}\n`;
		if ((current + line).length > TELEGRAM_MESSAGE_LIMIT) {
			textBlocks.push(current);
			current = '';
		}
		current += line;
	}
	if (current) textBlocks.push(current);

	const buttons = [
		...notifs.map(n => [{ text: `📄 ${n.issue_key}`, callback_data: `detail_${n.issue_id}` }]),
		[{ text: '👀 Посмотреть всё', callback_data: `view_all` }],
		[{ text: '❌ Закрыть', callback_data: 'close_summary' }]
	];

	let messageId = null;
	try {
		for (let i = 0; i < textBlocks.length; i++) {
			const opts = {
				parse_mode: 'Markdown',
			};
			if (i === textBlocks.length - 1) {
				opts.reply_markup = { inline_keyboard: buttons };
			}
			const message = await bot.sendMessage(chatId, textBlocks[i], opts);
			if (i === textBlocks.length - 1) {
				messageId = message.message_id;
			}
		}
		if (messageId) setLastMessage(chatId, messageId);
		console.log(`✅ Новое сообщение отправлено (ID: ${messageId}) в чат ${chatId}`);
	} catch (err) {
		console.error(`❌ Ошибка при отправке уведомления в чат ${chatId}:`, err.message);
		// TODO: реализовать повторную попытку отправки при rate limit или ошибках Telegram
		return;
	}

	try {
		await markNotificationsAsSent(chatId, notifs.map(n => n.id));
	} catch (err) {
		console.error(`❌ Ошибка Supabase при пометке уведомлений как отправленных для ${chatId}:`, err.message);
	}
}

module.exports = {
	sendSummaryNotification
};
