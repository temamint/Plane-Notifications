// utils/notificationBuffer.js

const { supabase } = require('./supabaseClient');

const timers = new Map();
const lastMessageMap = new Map();

async function addNotification(chatId, notif) {
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
		project_id: notif.projectId, // сохраняем projectId
		issue_key: notif.issueKey,
		title: notif.title,
		emoji: notif.emoji || null,
		status: 'unread',
	});
	if (error) throw error;
}

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

async function markNotificationsAsSent(chatId, ids) {
	if (!ids.length) return;
	const { error } = await supabase
		.from('notifications')
		.update({ status: 'sent', sent_at: new Date().toISOString() })
		.in('id', ids)
		.eq('chat_id', chatId);
	if (error) throw error;
}

async function markNotificationsAsRead(chatId, ids) {
	if (!ids.length) return;
	const { error } = await supabase
		.from('notifications')
		.update({ status: 'read', read_at: new Date().toISOString() })
		.in('id', ids)
		.eq('chat_id', chatId);
	if (error) throw error;
}

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
