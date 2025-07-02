// utils/telegram.js
const bot = require('../bot');
const {
	getNotifications,
	clearNotifications,
	getLastMessage,
	setLastMessage
} = require('./notificationBuffer');

/**
 * Отправляет сводное уведомление с кнопками
 * @param {number} chatId — кому отправить
 */
async function sendSummaryNotification(chatId) {
	const notifs = getNotifications(chatId);
	if (!notifs.length) return;

	// Удаляем предыдущее сообщение
	const lastMessageId = getLastMessage(chatId);
	if (lastMessageId) {
		try {
			await bot.deleteMessage(chatId, lastMessageId);
		} catch (err) {
			console.warn('❌ Не удалось удалить старое сообщение:', err.message);
		}
	}

	// Формируем текст
	const text = `🔔 *${notifs.length} новых обновлений:*\n\n` +
		notifs.map(n => `• ${n.emoji || '📝'} *${n.issueKey}* — ${n.title}`).join('\n');

	// Кнопки
	const buttons = [
		...notifs.map(n => [{ text: `📄 ${n.issueKey}`, callback_data: `detail_${n.issueId}` }]),
		[{ text: '👀 Посмотреть всё', callback_data: `view_all` }],
		[{ text: '❌ Закрыть', callback_data: 'close_summary' }]
	];

	// Отправляем новое
	const message = await bot.sendMessage(chatId, text, {
		parse_mode: 'Markdown',
		reply_markup: {
			inline_keyboard: buttons
		}
	});

	setLastMessage(chatId, message.message_id);
	clearNotifications(chatId);
}

module.exports = {
	sendSummaryNotification
};
