const crypto = require('crypto');
const { supabase } = require('./supabaseClient');

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
		JSON.stringify((data.assignees || []).map(a => a.id).sort())
	].join('::');

	const hash = crypto.createHash('md5').update(raw).digest('hex');
	console.log(`🔑 Сгенерирован fingerprint: ${hash} ← (${raw})`);
	return hash;
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

	// Пытаемся вставить
	const { error: insertError } = await supabase
		.from('deduplicated_events')
		.insert({ fingerprint }, { upsert: false });

	if (insertError) {
		console.error('❌ Ошибка при вставке fingerprint:', insertError.message);
		return true;
	}

	console.log(`✅ Уникальное событие, записано: ${fingerprint}`);
	return false;
}


module.exports = {
	isDuplicateEvent,
	getEventFingerprint,
};
