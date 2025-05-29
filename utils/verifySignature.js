const crypto = require('crypto');
require('dotenv').config();

function verifySignature(req) {
	const signature = req.headers['x-plane-signature'];
	const payload = req.body;

	const expectedSignature = crypto
		.createHmac('sha256', process.env.PLANE_WEBHOOK_SECRET)
		.update(payload)
		.digest('hex');

	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

module.exports = { verifySignature };