const express = require('express');
const router = express.Router();
const { verifySignature } = require('../utils/verifySignature');
const { formatIssueMessage, formatCommentMessage } = require('../utils/botNotificationFormatter');
const { sendTelegramMessage } = require('../utils/telegram');
const { ensureProjectsLoaded } = require('../utils/projectServices');
const { getTelegramIdByPlaneUserId } = require('../utils/userService');
const { getIssueSubscribers } = require('../utils/issueService');


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
				message = await formatIssueMessage(action, data);
				break;
			case 'issue_comment':
				message = await formatCommentMessage(action, data);
				break;
			default:
				message = `🚫 Необработанное событие: *${event}*`;
		}

		console.log(`Финальное сообщение: ${message}`);

		if (event === 'issue' && data?.id) {
			const subscribers = await getIssueSubscribers(data.id);
			console.log(`Подписчики задачи: ${subscribers}`);

			if (!subscribers.length) {
				console.log('⚠️ Нет подписчиков у задачи — уведомление не отправлено');
				return res.status(200).send('Нет подписчиков');
			}

			let sentCount = 0;
			for (const planeUserId of subscribers) {
				const tgId = getTelegramIdByPlaneUserId(planeUserId);
				if (tgId) {
					await sendTelegramMessage(message, tgId);
					sentCount++;
				}
			}

			console.log(`✅ Отправлено ${sentCount} подписчикам`);
			return res.status(200).send(`Отправлено ${sentCount}`);
		} else {
			await sendTelegramMessage(message);
			res.status(200).send('Обработано');
		}
		res.status(200).send('Обработано');
	} catch (error) {
		console.error('Ошибка при обработке вебхука:', error);
		res.status(500).send('Ошибка при обработке вебхука');
	}
});

module.exports = router;