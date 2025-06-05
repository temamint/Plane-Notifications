const crypto = require('crypto');
const { supabase } = require('./supabaseClient');

function getEventFingerprint({ event, action, data }) {
	if (!data?.id) return null;
	const raw = [event, action, data.id, data.status].join('::');
	return crypto.createHash('md5').update(raw).digest('hex');
}

async function isDuplicateEvent(payload) {
	const fingerprint = getEventFingerprint(payload);
	if (!fingerprint) return false;

	const { data, error } = await supabase
		.from('deduplicated_events')
		.select('fingerprint')
		.eq('fingerprint', fingerprint)
		.maybeSingle();

	if (data) {
		console.log(`⚠️ Повтор события: ${fingerprint}`);
		return true;
	}

	// Пишем fingerprint
	const { error: insertError } = await supabase
		.from('deduplicated_events')
		.insert({ fingerprint });

	if (insertError) {
		console.error('❌ Ошибка вставки fingerprint:', insertError);
		return false; // fail-open
	}

	console.log(`✅ Уникальное событие, записано: ${fingerprint}`);
	return false;
}

module.exports = {
	isDuplicateEvent,
	getEventFingerprint,
};
