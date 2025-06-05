const crypto = require('crypto');

// ✅ Глобальный shared Set (для Vercel и dev-сред)
if (!global.__processedEvents) {
	global.__processedEvents = new Set();
}
const processedEvents = global.__processedEvents;

const TTL = 5 * 60 * 1000;

function getEventFingerprint({ event, action, data }) {
	if (!data?.id) {
		console.log('❗ Невозможно сгенерировать fingerprint — отсутствует data.id');
		return null;
	}

	const raw = [
		event,
		action,
		data.id,
		data.status,
		JSON.stringify((data.assignees || []).map(a => a.id).sort()), // только ID
	].join('::');

	const hash = crypto.createHash('md5').update(raw).digest('hex');
	console.log(`🔑 Сгенерирован fingerprint: ${hash} ← (${raw})`);
	return hash;
}

function isDuplicateEvent(payload) {
	const fingerprint = getEventFingerprint(payload);
	if (!fingerprint) return false;

	if (processedEvents.has(fingerprint)) {
		console.log(`⚠️ Дубликат события. Уже обрабатывали: ${fingerprint}`);
		return true;
	}

	console.log(`🆕 Новое событие. Сохраняем fingerprint: ${fingerprint}`);
	processedEvents.add(fingerprint);

	setTimeout(() => {
		console.log(`🧹 Удаляем fingerprint из памяти: ${fingerprint}`);
		processedEvents.delete(fingerprint);
	}, TTL);

	return false;
}

module.exports = {
	isDuplicateEvent,
	getEventFingerprint,
};
