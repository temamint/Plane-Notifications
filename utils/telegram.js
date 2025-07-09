const bot = require('../bot');
const {
	getNotifications,
	getLastMessage,
	setLastMessage,
	markNotificationsAsSent
} = require('./notificationBuffer');
const { escapeMarkdown } = require('./markdownFormatter');

const TELEGRAM_MESSAGE_LIMIT = 4096;

async function buildSummaryNotification(chatId) {
	let notifs;
	try {
		notifs = await getNotifications(chatId, ['unread', 'sent']);
		console.log(`[buildSummaryNotification] got ${notifs?.length || 0} notifications from DB for chatId: ${chatId}`);
	} catch (err) {
		console.error(`[buildSummaryNotification] ❌ Supabase error while fetching notifications for ${chatId}:`, err.message);
		return { text: 'Нет новых уведомлений.', buttons: [[{ text: '❌ Закрыть', callback_data: 'close_summary' }]] };
	}
	if (!notifs || !notifs.length) {
		return { text: 'Нет новых уведомлений.', buttons: [[{ text: '❌ Закрыть', callback_data: 'close_summary' }]] };
	}

	const unique = {};
	notifs.forEach(n => {
		unique[n.issue_id] = n;
	});
	notifs = Object.values(unique);

	let text = `🔔 *${notifs.length} новых обновлений:*\n\n`;
	for (const n of notifs) {
		const line = `• ${n.emoji || '📝'} *${escapeMarkdown(n.issue_key)}* — ${escapeMarkdown(n.title)}\n`;
		text += line;
	}

	function chunkArray(arr, size) {
		const res = [];
		for (let i = 0; i < arr.length; i += size) {
			res.push(arr.slice(i, i + size));
		}
		return res;
	}

	const taskButtons = chunkArray(
		notifs.map(n => ({ text: `📄 ${n.issue_key}`, callback_data: `detail_${n.issue_id}_${n.issue_key}` })),
		3
	).map(row => row);

	const buttons = [
		...taskButtons,
		[{ text: '👀 Посмотреть всё', callback_data: `view_all` }],
		[{ text: '✅ Отметить прочитанным всё', callback_data: 'mark_all_read_confirm' }],
		[{ text: '❌ Закрыть', callback_data: 'close_summary' }]
	];

	return { text, buttons };
}

async function sendSummaryNotification(chatId) {
	console.log(`[sendSummaryNotification] called for chatId: ${chatId}`);
	const { text, buttons } = await buildSummaryNotification(chatId);
	if (!text) return;

	const lastMessageId = getLastMessage(chatId);
	if (lastMessageId) {
		try {
			await bot.deleteMessage(chatId, lastMessageId);
			console.log(`[sendSummaryNotification] ✅ Deleted previous message ${lastMessageId} in chat ${chatId}`);
		} catch (err) {
			console.warn(`[sendSummaryNotification] ⚠️ Failed to delete previous message ${lastMessageId} in chat ${chatId}:`, err.message);
		}
	}

	let messageId = null;
	try {
		const opts = {
			parse_mode: 'Markdown',
			reply_markup: { inline_keyboard: buttons }
		};
		const message = await bot.sendMessage(chatId, text, opts);
		messageId = message.message_id;
		if (messageId) setLastMessage(chatId, messageId);
		console.log(`[sendSummaryNotification] ✅ New summary message sent (ID: ${messageId}) to chatId: ${chatId}`);
	} catch (err) {
		console.error(`[sendSummaryNotification] ❌ Error sending notification to chat ${chatId}:`, err.message);
		return;
	}

	try {
		await markNotificationsAsSent(chatId, buttons.flat().filter(b => b.callback_data && b.callback_data.startsWith('detail_')).map(b => b.callback_data.split('_')[1]));
		console.log(`[sendSummaryNotification] Marked notifications as sent for chatId: ${chatId}`);
	} catch (err) {
		console.error(`[sendSummaryNotification] ❌ Supabase error marking notifications as sent for ${chatId}:`, err.message);
	}
}

module.exports = {
	sendSummaryNotification,
	buildSummaryNotification
};
