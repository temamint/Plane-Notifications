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
	console.log('[webhook] --- Incoming webhook ---');
	console.log('[webhook] Headers:', req.headers);
	console.log('[webhook] Raw body:', req.body);

	if (!verifySignature(req)) {
		console.warn('[webhook] ❌ Invalid signature');
		return res.status(403).send('Неверная подпись');
	}

	try {
		await ensureProjectsLoaded();

		let parsedBody;
		try {
			parsedBody = JSON.parse(req.body.toString());
			console.log('[webhook] Parsed body:', parsedBody);
		} catch (err) {
			console.error('[webhook] ❌ Error parsing body:', err.message);
			return res.status(400).send('Invalid JSON');
		}

		const { event, action, data } = parsedBody;
		console.log(`[webhook] Event: ${event}, Action: ${action}`);
		console.log('[webhook] Data:', data);

		if (await isDuplicateEvent({ event, action, data })) {
			console.log('[webhook] Duplicate event detected, ignoring');
			return res.status(200).send('Duplicate event ignored');
		}

		let issueKey = '???';
		if (event === 'issue' && data?.sequence_id && data?.project) {
			const pid = await getProjectIdentifierById(data.project);
			issueKey = `${pid}-${data.sequence_id}`;
			console.log(`[webhook] Computed issueKey: ${issueKey}`);
		}

		if (event === 'issue' && data?.id) {
			const userIds = new Set();

			(data.assignees || []).forEach(assignee => {
				if (assignee?.id) userIds.add(assignee.id);
			});
			if (data.created_by) {
				userIds.add(data.created_by);
			}

			console.log('[webhook] Notification recipients (Plane userIds):', [...userIds]);

			let sentCount = 0;
			for (const planeUserId of userIds) {
				const tgId = getTelegramIdByPlaneUserId(planeUserId);
				console.log(`[webhook] Plane userId: ${planeUserId}, Telegram chatId: ${tgId}`);
				if (tgId) {
					try {
						await addNotification(tgId, {
							issueId: data.id,
							issueKey,
							title: data.name,
							emoji: action === 'created' ? '🆕' : '✏️'
						});
						console.log(`[webhook] Notification added for chatId: ${tgId}, issueId: ${data.id}, issueKey: ${issueKey}`);
					} catch (err) {
						console.error(`[webhook] ❌ Supabase error adding notification for chatId: ${tgId}:`, err.message);
						continue;
					}

					if (!getTimer(tgId)) {
						const timeoutId = setTimeout(async () => {
							console.log(`[webhook] setTimeout fired for chatId: ${tgId}`);
							try {
								console.log(`[webhook] Timer triggered for chatId: ${tgId}, calling sendSummaryNotification`);
								await sendSummaryNotification(tgId);
							} catch (e) {
								console.error('[webhook] ❌ Error in sendSummaryNotification:', e);
							}
							clearTimer(tgId);
						}, 5000);
						setTimer(tgId, timeoutId);
						console.log(`[webhook] Timer set for chatId: ${tgId}`);
					}

					sentCount++;
				}
			}
			console.log(`[webhook] Notifications added to buffer for ${sentCount} users`);
			return res.status(200).send(`Sent to ${sentCount}`);
		} else if (event === 'issue_comment') {
			console.log('[webhook] Issue comment event received');
			// пока можно также отправить в общий чат (если хочешь)
			const message = await formatCommentMessage(action, data);
			// TODO: тоже можно буферизовать или отправлять в DEFAULT_CHAT_ID
			console.log('📝 Комментарий:', message);
		} else {
			console.log('[webhook] ⚠️ Unhandled event:', event);
		}

		res.status(200).send('Processed');
	} catch (error) {
		console.error('[webhook] ❌ Error processing webhook:', error);
		res.status(500).send('Webhook processing error');
	}
});

module.exports = router;