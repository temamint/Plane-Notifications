const TurndownService = require('turndown');
const turndownService = new TurndownService();
const { getProjectIdentifierById } = require('./projectServices');
const { getUserName } = require('./projectMemberServices');
const { getIssueActivities, extractLatestFieldChanges } = require('./issueActivityService');
const { planeApi } = require('./planeApi');
const { getNotifications } = require('./notificationBuffer');

function getIssueTitle(action) {
	console.log(`[getIssueTitle] action: ${action}`);
	switch (action) {
		case 'created': return '🆕 Новая задача';
		case 'updated': return '✏️ Обновление задачи';
		case 'deleted': return '🗑️ Удалена задача';
		default: return `*ISSUE* — ${action}`;
	}
}

function getCommentTitle(action) {
	console.log(`[getCommentTitle] action: ${action}`);
	switch (action) {
		case 'created': return '💬 Новый комментарий';
		case 'updated': return '✏️ Обновлён комментарий';
		case 'deleted': return '🗑️ Удалён комментарий';
		default: return `*COMMENT* (${action})`;
	}
}

async function formatIssueMessage(action, data) {
	console.info(`[formatIssueMessage] called with action: ${action}, data.id: ${data?.id}`);
	try {
		if (typeof data.description_html === 'string' && data.description_html.trim()) {
			console.log('[formatIssueMessage] Using description_html');
			description = turndownService.turndown(data.description_html);
		} else if (typeof data.description_stripped === 'string') {
			console.log('[formatIssueMessage] Using description_stripped');
			description = data.description_stripped;
		} else {
			console.warn('[formatIssueMessage] No description found');
		}

		const MAX_DESCRIPTION_LENGTH = 500;
		if (description.length > MAX_DESCRIPTION_LENGTH) {
			console.log(`[formatIssueMessage] Truncating description from ${description.length} to ${MAX_DESCRIPTION_LENGTH}`);
			description = description.slice(0, MAX_DESCRIPTION_LENGTH) + '...';
		}

		const title = getIssueTitle(action);
		const projectIdentifier = await getProjectIdentifierById(data.project);
		console.log(`[formatIssueMessage] projectIdentifier: ${projectIdentifier}`);
		const issueKey = `${projectIdentifier}-${data.sequence_id}`;
		const issueUrl = `https://app.plane.so/${process.env.PLANE_WORKSPACE_SLUG}/browse/${issueKey}/`;

		const activities = await getIssueActivities(data.project, data.id);
		console.log(`[formatIssueMessage] activities count: ${activities?.length}`);
		const changes = extractLatestFieldChanges(activities);
		console.log(`[formatIssueMessage] changes: ${changes}`);
		const changesText = changes ? changes : 'Нет изменений';

		const author = await getUserName(data.project, data.updated_by);
		console.log(`[formatIssueMessage] author: ${author}`);

		const message = `${title}
*Название задачи:* ${data.name || 'Без названия'} ([${issueKey}](${issueUrl}))
*Описание:* ${description}
*Автор:* ${author}

*🛠 Изменения:* ${changesText}`;

		console.info(`[formatIssueMessage] message length: ${message.length}`);
		return message;
	} catch (err) {
		console.error(`[formatIssueMessage] Error:`, err);
		return '❌ Не удалось сформировать сообщение по задаче';
	}
}

async function formatCommentMessage(action, data) {
	console.info(`[formatCommentMessage] called with action: ${action}, data.id: ${data?.id}`);
	try {
		const content = typeof data.comment_stripped === 'object'
			? JSON.stringify(data.comment_stripped, null, 2)
			: data.comment_stripped || 'Комментарий без текста';

		const title = getCommentTitle(action);
		const author = await getUserName(data.project, data.created_by);
		console.log(`[formatCommentMessage] author: ${author}`);

		const result = `${title}
*Автор комментария:* ${author}
*Содержание:* ${content}`;
		console.info(`[formatCommentMessage] message length: ${result.length}`);
		return result;
	} catch (err) {
		console.error(`[formatCommentMessage] Error:`, err);
		return '❌ Не удалось сформировать сообщение по комментарию';
	}
}

async function getIssueDetailsMessage(projectId, issueId) {
	console.log(`[getIssueDetailsMessage] Getting details for projectId: ${projectId}, issueId: ${issueId}`);
	try {
		const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
		const url = `/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/`;
		console.log(`[getIssueDetailsMessage] Plane API URL: ${url}`);
		const res = await planeApi.get(url);
		console.log(`[getIssueDetailsMessage] Plane API response received for projectId: ${projectId}, issueId: ${issueId}`);
		const issue = res.data.results;
		console.debug(`[getIssueDetailsMessage] Issue data:`, issue);
		const result = await formatIssueMessage('updated', issue);
		console.log(`[getIssueDetailsMessage] Formatted message for projectId: ${projectId}, issueId: ${issueId}, length: ${result.length}`);
		return result;
	} catch (err) {
		console.error(`[getIssueDetailsMessage] ❌ Failed to get issue ${issueId} in project ${projectId}:`, err.message);
		return '❌ Не удалось загрузить задачу';
	}
}

async function getAllDetailsMessage(chatId) {
	console.log(`[getAllDetailsMessage] Getting all details for chatId: ${chatId}`);
	const notifications = getNotifications(chatId);
	console.log(`[getAllDetailsMessage] Found ${notifications?.length || 0} notifications for chatId: ${chatId}`);
	if (!notifications?.length) return 'Нет новых уведомлений.';

	let fullText = `🔔 Детали по ${notifications.length} задачам:\n\n`;

	for (const notif of notifications) {
		try {
			console.log(`[getAllDetailsMessage] Processing notification: ${notif.issueKey} (${notif.issueId})`);
			const res = await planeApi.get(`/issues/${notif.issueId}/`);
			console.debug(`[getAllDetailsMessage] Issue data:`, res.data);
			const msg = await formatIssueMessage('updated', res.data);
			fullText += msg + '\n\n';
			console.log(`[getAllDetailsMessage] Added details for ${notif.issueKey}`);
		} catch (err) {
			console.error(`[getAllDetailsMessage] ❌ Failed to load ${notif.issueKey}:`, err.message);
			fullText += `⚠️ Не удалось загрузить ${notif.issueKey}\n\n`;
		}
	}

	console.log(`[getAllDetailsMessage] Final message length: ${fullText.length}`);
	return fullText;
}

module.exports = {
	formatIssueMessage,
	formatCommentMessage,
	getIssueDetailsMessage,
	getAllDetailsMessage
};
