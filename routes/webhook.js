const express = require('express');
const router = express.Router();
const { verifySignature } = require('../utils/verifySignature');
const { formatIssueMessage, formatCommentMessage } = require('../utils/botNotificationFormatter');
const { sendTelegramMessage } = require('../utils/telegram');
const { ensureProjectsLoaded } = require('../utils/projectServices');


router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
	console.log('📩 Получен вебхук:', req.headers, req.body);

	if (!verifySignature(req)) {
		return res.status(403).send('Неверная подпись');
	}

	try {
		await ensureProjectsLoaded();

		const parsedBody = JSON.parse(req.body.toString());
		const { event, action, data } = parsedBody;

		let message;
		switch (event) {
			case 'issue':
				message = formatIssueMessage(action, data);
				break;
			case 'issue_comment':
				message = formatCommentMessage(action, data);
				break;
			default:
				message = `🚫 Необработанное событие: *${event}*`;
		}

		console.log(`Финальное сообщение: ${message}`);

		await sendTelegramMessage(message);
		res.status(200).send('Обработано');
	} catch (error) {
		console.error('Ошибка при обработке вебхука:', error);
		res.status(500).send('Ошибка при обработке вебхука');
	}
});

module.exports = router;