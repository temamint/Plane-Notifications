const bot = require('../bot');
const {
	getNotifications,
	clearNotifications,
	getLastMessage,
	setLastMessage
} = require('./notificationBuffer');
const { escapeMarkdown } = require('./markdownFormatter');

/**
 * Отправляет сводное уведомление с кнопками
 * @param {number} chatId — кому отправить
 */
async function sendSummaryNotification(chatId) {
	const notifs = getNotifications(chatId);
	if (!notifs.length) {
		console.log(`ℹ️ Нет уведомлений для отправки в чат ${chatId}`);
		return;
	}

	// Удаляем предыдущее сообщение, если есть
	const lastMessageId = getLastMessage(chatId);
	if (lastMessageId) {
		try {
			console.log(`🗑 Пытаемся удалить сообщение ${lastMessageId} из чата ${chatId}`);
			await bot.deleteMessage(chatId, lastMessageId);
			console.log(`✅ Удалено сообщение ${lastMessageId}`);

			console.log(`🗑 Удалено предыдущее сообщение ${lastMessageId} в чате ${chatId}`);
		} catch (err) {
			console.warn(`⚠️ Не удалось удалить сообщение ${lastMessageId} в чате ${chatId}:`, err.message);
		}
	}

	const text = `🔔 *${notifs.length} новых обновлений:*\n\n` +
		notifs.map(n =>
			`• ${n.emoji || '📝'} *${escapeMarkdown(n.issueKey)}* — ${escapeMarkdown(n.title)}`
		).join('\n');

	const buttons = [
		...notifs.map(n => [{ text: `📄 ${n.issueKey}`, callback_data: `detail_${n.issueId}` }]),
		[{ text: '👀 Посмотреть всё', callback_data: `view_all` }],
		[{ text: '❌ Закрыть', callback_data: 'close_summary' }]
	];

	try {
		const message = await bot.sendMessage(chatId, text, {
			parse_mode: 'Markdown',
			reply_markup: {
				inline_keyboard: buttons
			}
		});

		setLastMessage(chatId, message.message_id);
		console.log(`✅ Новое сообщение отправлено (ID: ${message.message_id}) в чат ${chatId}`);
		clearNotifications(chatId);
	} catch (err) {
		console.error(`❌ Ошибка при отправке уведомления в чат ${chatId}:`, err.message);
	}
}

module.exports = {
	sendSummaryNotification
};
