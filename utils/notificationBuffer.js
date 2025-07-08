// utils/notificationBuffer.js

const { supabase } = require('./supabaseClient');

// In-memory таймеры и lastMessageMap
const timers = new Map(); // chatId → timeoutId
const lastMessageMap = new Map(); // chatId → messageId

// Добавить уведомление в Supabase
async function addNotification(chatId, notif) {
	// Дедупликация: не добавлять, если уже есть непрочитанное по этому issueId
	const { data: existing, error: err1 } = await supabase
		.from('notifications')
		.select('id')
		.eq('chat_id', chatId)
		.eq('issue_id', notif.issueId)
		.in('status', ['unread', 'sent']);
	if (err1) throw err1;
	if (existing && existing.length > 0) return;

	const { error } = await supabase.from('notifications').insert({
		chat_id: chatId,
		issue_id: notif.issueId,
		issue_key: notif.issueKey,
		title: notif.title,
		emoji: notif.emoji || null,
		status: 'unread',
	});
	if (error) throw error;
}

// Получить все уведомления для chatId с нужным статусом
async function getNotifications(chatId, statuses = ['unread', 'sent']) {
	const { data, error } = await supabase
		.from('notifications')
		.select('*')
		.eq('chat_id', chatId)
		.in('status', statuses)
		.order('created_at', { ascending: true });
	if (error) throw error;
	return data || [];
}

// Пометить уведомления как "sent" (после отправки)
async function markNotificationsAsSent(chatId, ids) {
	if (!ids.length) return;
	const { error } = await supabase
		.from('notifications')
		.update({ status: 'sent', sent_at: new Date().toISOString() })
		.in('id', ids)
		.eq('chat_id', chatId);
	if (error) throw error;
}

// Пометить уведомления как "read" (по кнопке или действию пользователя)
async function markNotificationsAsRead(chatId, ids) {
	if (!ids.length) return;
	const { error } = await supabase
		.from('notifications')
		.update({ status: 'read', read_at: new Date().toISOString() })
		.in('id', ids)
		.eq('chat_id', chatId);
	if (error) throw error;
}

// Очистить все уведомления для chatId (например, старые)
async function clearNotifications(chatId) {
	const { error } = await supabase
		.from('notifications')
		.delete()
		.eq('chat_id', chatId)
		.in('status', ['unread', 'sent']);
	if (error) throw error;
}

function setLastMessage(chatId, messageId) {
	lastMessageMap.set(chatId, messageId);
}

function getLastMessage(chatId) {
	return lastMessageMap.get(chatId);
}

function setTimer(chatId, timeoutId) {
	timers.set(chatId, timeoutId);
}

function getTimer(chatId) {
	return timers.get(chatId);
}

function clearTimer(chatId) {
	if (timers.has(chatId)) {
		clearTimeout(timers.get(chatId));
		timers.delete(chatId);
	}
}

// Периодическая очистка старых уведомлений (старше 7 дней)
async function periodicCleanup() {
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	try {
		const { error, count } = await supabase
			.from('notifications')
			.delete()
			.lt('created_at', cutoff);
		if (error) {
			console.error('❌ Ошибка при очистке старых уведомлений:', error.message);
		} else {
			console.log(`🧹 Очищено старых уведомлений: ${count ?? 'неизвестно'}`);
		}
	} catch (err) {
		console.error('❌ Ошибка при очистке старых уведомлений:', err.message);
	}
}

// Запускать очистку раз в сутки
setInterval(periodicCleanup, 24 * 60 * 60 * 1000);

module.exports = {
	addNotification,
	getNotifications,
	clearNotifications,
	setLastMessage,
	getLastMessage,
	markNotificationsAsSent,
	markNotificationsAsRead,
	setTimer,
	getTimer,
	clearTimer,
	periodicCleanup,
};
