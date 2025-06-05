const crypto = require('crypto');

const processedEvents = new Set();
const TTL = 5 * 60 * 1000; // 5 минут

function getEventFingerprint({ event, action, data }) {
	if (!data?.id) {
		console.log('❗ Невозможно сгенерировать fingerprint — отсутствует data.id');
		return null;
	}
	const updatedAt = data.updated_at || data.created_at || '';
	const raw = `${event}-${action}-${data.id}-${updatedAt}`;
	const hash = crypto.createHash('md5').update(raw).digest('hex');
	console.log(`🔑 Сгенерирован fingerprint: ${hash} ← (${raw})`);
	return hash;
}

function isDuplicateEvent(eventPayload) {
	const fingerprint = getEventFingerprint(eventPayload);
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

	ret
