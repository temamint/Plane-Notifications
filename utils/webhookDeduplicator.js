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

	const { error: insertError } = await supabase
		.from('deduplicated_events')
		.insert({ fingerprint });

	if (insertError) {
		console.error('❌ Ошибка вставки fingerprint:', insertError);
		return false; // fail-open: пропускаем защиту, но не падаем
	}

	console.log(`✅ Уникальное событие, записано: ${fingerprint}`);
	return false;
}

module.exports = {
	isDuplicateEvent,
	getEventFingerprint,
};
