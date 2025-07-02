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
		data.state?.id || '',
		data.assignees?.length || 0,
		data.updated_at ? new Date(data.updated_at).toISOString().slice(0, 16) : '',
		JSON.stringify((data.assignees || []).map(a => a.id).sort())
	].join('::');

	return crypto.createHash('md5').update(raw).digest('hex');
}

async function isDuplicateEvent(payload) {
	const fingerprint = getEventFingerprint(payload);
	if (!fingerprint) return false;

	// Пытаемся вставить (если уже есть — ничего не меняем)
	const { error } = await supabase
		.from('deduplicated_events')
		.upsert({ fingerprint }, { onConflict: ['fingerprint'] });

	if (error) {
		console.error('❌ Supabase error при upsert fingerprint:', error.message);
		// на всякий случай считаем дубликатом
		return true;
	}

	console.log(`✅ Fingerprint обработан (новый или уже существующий): ${fingerprint}`);
	return false;
}

module.exports = {
	isDuplicateEvent,
	getEventFingerprint,
};
