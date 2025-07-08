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
	console.log(`[sendSummaryNotification] called for chatId: ${chatId}`);
	let notifs;
	try {
		notifs = await getNotifications(chatId, ['unread', 'sent']);
		console.log(`[sendSummaryNotification] got ${notifs?.length || 0} notifications from DB for chatId: ${chatId}`);
	} catch (err) {
		console.error(`[sendSummaryNotification] ❌ Supabase error while fetching notifications for ${chatId}:`, err.message);
		return;
	}
	if (!notifs || !notifs.length) {
		console.log(`[sendSummaryNotification] ℹ️ No notifications to send for chatId: ${chatId}`);
		return;
	}

	// Дедупликация по issueId (оставляем самое свежее)
	const unique = {};
	notifs.forEach(n => {
		unique[n.issue_id] = n;
	});
	notifs = Object.values(unique);
	console.log(`[sendSummaryNotification] After deduplication: ${notifs.length} notifications for chatId: ${chatId}`);

	// Удаляем предыдущее сообщение, если есть
	const lastMessageId = getLastMessage(chatId);
	if (lastMessageId) {
		try {
			await bot.deleteMessage(chatId, lastMessageId);
			console.log(`[sendSummaryNotification] ✅ Deleted previous message ${lastMessageId} in chat ${chatId}`);
		} catch (err) {
			console.warn(`[sendSummaryNotification] ⚠️ Failed to delete previous message ${lastMessageId} in chat ${chatId}:`, err.message);
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

	console.log(`[sendSummaryNotification] Prepared ${textBlocks.length} message block(s) for chatId: ${chatId}`);
	if (textBlocks.length > 1) {
		textBlocks.forEach((block, i) => {
			console.log(`[sendSummaryNotification] Block ${i + 1}:\n${block}`);
		});
	} else {
		console.log(`[sendSummaryNotification] Message text:\n${textBlocks[0]}`);
	}

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
			console.log(`[sendSummaryNotification] Sending message block ${i + 1}/${textBlocks.length} to chatId: ${chatId}`);
			const message = await bot.sendMessage(chatId, textBlocks[i], opts);
			console.log(`[sendSummaryNotification] Sent message block ${i + 1}/${textBlocks.length} (message_id: ${message.message_id}) to chatId: ${chatId}`);
			if (i === textBlocks.length - 1) {
				messageId = message.message_id;
			}
		}
		if (messageId) setLastMessage(chatId, messageId);
		console.log(`[sendSummaryNotification] ✅ New summary message sent (ID: ${messageId}) to chatId: ${chatId}`);
	} catch (err) {
		console.error(`[sendSummaryNotification] ❌ Error sending notification to chat ${chatId}:`, err.message);
		// TODO: реализовать повторную попытку отправки при rate limit или ошибках Telegram
		return;
	}

	try {
		await markNotificationsAsSent(chatId, notifs.map(n => n.id));
		console.log(`[sendSummaryNotification] Marked ${notifs.length} notifications as sent for chatId: ${chatId}`);
	} catch (err) {
		console.error(`[sendSummaryNotification] ❌ Supabase error marking notifications as sent for ${chatId}:`, err.message);
	}
}

module.exports = {
	sendSummaryNotification
};
