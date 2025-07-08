const express = require('express');
const router = express.Router();
const { verifySignature } = require('../utils/verifySignature');
const { formatIssueMessage, formatCommentMessage } = require('../utils/botNotificationFormatter');
const { ensureProjectsLoaded, getProjectIdentifierById } = require('../utils/projectServices');
const { getTelegramIdByPlaneUserId } = require('../utils/userService');
const { isDuplicateEvent } = require('../utils/webhookDeduplicator');
const { addNotification, setTimer, getTimer, clearTimer } = require('../utils/notificationBuffer');
const { sendSummaryNotification } = require('../utils/telegram');

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
	console.log('📩 Получен вебхук:', req.headers, req.body);

	if (!verifySignature(req)) {
		return res.status(403).send('Неверная подпись');
	}

	try {
		await ensureProjectsLoaded();

		const parsedBody = JSON.parse(req.body.toString());
		const { event, action, data } = parsedBody;

		console.log(`ВОТ ДАТА: ${JSON.stringify(data)}`);

		if (await isDuplicateEvent({ event, action, data })) {
			return res.status(200).send('Duplicate event ignored');
		}

		let issueKey = '???';
		if (event === 'issue' && data?.sequence_id && data?.project) {
			const pid = await getProjectIdentifierById(data.project);
			issueKey = `${pid}-${data.sequence_id}`;
		}

		if (event === 'issue' && data?.id) {
			const userIds = new Set();

			(data.assignees || []).forEach(assignee => {
				if (assignee?.id) userIds.add(assignee.id);
			});
			if (data.created_by) {
				userIds.add(data.created_by);
			}

			console.log('🧑‍💻 Получатели уведомления:', [...userIds]);

			let sentCount = 0;
			for (const planeUserId of userIds) {
				const tgId = getTelegramIdByPlaneUserId(planeUserId);
				if (tgId) {
					try {
						await addNotification(tgId, {
							issueId: data.id,
							issueKey,
							title: data.name,
							emoji: action === 'created' ? '🆕' : '✏️'
						});
					} catch (err) {
						console.error(`❌ Ошибка Supabase при добавлении уведомления для ${tgId}:`, err.message);
						continue;
					}

					// Таймерная отправка: если таймера нет — ставим на 5 секунд
					if (!getTimer(tgId)) {
						const timeoutId = setTimeout(async () => {
							try {
								await sendSummaryNotification(tgId);
							} catch (e) {
								console.error('Ошибка при отправке сводного уведомления:', e);
							}
							clearTimer(tgId);
						}, 5000);
						setTimer(tgId, timeoutId);
					}

					sentCount++;
				}
			}
			console.log(`✅ Уведомление добавлено в буфер ${sentCount} пользователям`);
			return res.status(200).send(`Отправлено ${sentCount}`);
		} else if (event === 'issue_comment') {
			// пока можно также отправить в общий чат (если хочешь)
			const message = await formatCommentMessage(action, data);
			// TODO: тоже можно буферизовать или отправлять в DEFAULT_CHAT_ID
			console.log('📝 Комментарий:', message);
		} else {
			console.log('⚠️ Необработанное событие:', event);
		}

		res.status(200).send('Обработано');
	} catch (error) {
		console.error('Ошибка при обработке вебхука:', error);
		res.status(500).send('Ошибка при обработке вебхука');
	}
});

module.exports = router;
