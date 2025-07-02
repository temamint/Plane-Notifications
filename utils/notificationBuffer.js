// utils/notificationBuffer.js

const notificationMap = new Map(); // chatId → [{ issueId, issueKey, title, action }]
const lastMessageMap = new Map();  // chatId → messageId

function addNotification(chatId, notif) {
	if (!notificationMap.has(chatId)) {
		notificationMap.set(chatId, []);
	}

	const existing = notificationMap.get(chatId);
	const alreadyExists = existing.some(n => n.issueId === notif.issueId);

	if (!alreadyExists) {
		existing.push(notif);
	}
}


function getNotifications(chatId) {
	return notificationMap.get(chatId) || [];
}

function clearNotifications(chatId) {
	notificationMap.delete(chatId);
}

function setLastMessage(chatId, messageId) {
	lastMessageMap.set(chatId, messageId);
}

function getLastMessage(chatId) {
	return lastMessageMap.get(chatId);
}

module.exports = {
	addNotification,
	getNotifications,
	clearNotifications,
	setLastMessage,
	getLastMessage
};
