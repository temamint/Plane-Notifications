const crypto = require('crypto');

const processedEvents = new Set();
const TTL = 5 * 60 * 1000; // 5 минут

function getEventFingerprint({ event, action, data }) {
	if (!data?.id) return null;
	const updatedAt = data.updated_at || data.created_at || '';
	const raw = `${event}-${action}-${data.id}-${updatedAt}`;
	return crypto.createHash('md5').update(raw).digest('hex');
}

function isDuplicateEvent(eventPayload) {
	const fingerprint = getEventFingerprint(eventPayload);
	if (!fingerprint) return false;
	if (processedEvents.has(fingerprint)) return true;

	processedEvents.add(fingerprint);
	setTimeout(() => processedEvents.delete(fingerprint), TTL);
	return false;
}

module.exports = {
	isDuplicateEvent,
	getEventFingerprint
};
