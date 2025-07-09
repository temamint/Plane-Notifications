const TurndownService = require('turndown');
const turndownService = new TurndownService();
const { getProjectIdentifierById } = require('./projectServices');
const { getUserName } = require('./projectMemberServices');
const { getIssueActivities, extractLatestFieldChanges } = require('./issueActivityService');
const { planeApi } = require('./planeApi');
const { getNotifications } = require('./notificationBuffer');

function getIssueTitle(action) {
	switch (action) {
		case 'created': return '🆕 Новая задача';
		case 'updated': return '✏️ Обновление задачи';
		case 'deleted': return '🗑️ Удалена задача';
		default: return `*ISSUE* — ${action}`;
	}
}

function getCommentTitle(action) {
	switch (action) {
		case 'created': return '💬 Новый комментарий';
		case 'updated': return '✏️ Обновлён комментарий';
		case 'deleted': return '🗑️ Удалён комментарий';
		default: return `*COMMENT* (${action})`;
	}
}

async function formatIssueMessage(action, data) {
	let description = 'N/A';
	if (typeof data.description_html === 'string' && data.description_html.trim()) {
		description = turndownService.turndown(data.description_html);
	} else if (typeof data.description_stripped === 'string') {
		description = data.description_stripped;
	}

	const MAX_DESCRIPTION_LENGTH = 500;
	if (description.length > MAX_DESCRIPTION_LENGTH) {
		description = description.slice(0, MAX_DESCRIPTION_LENGTH) + '...';
	}

	const title = getIssueTitle(action);
	const projectIdentifier = await getProjectIdentifierById(data.project);
	const issueKey = `${projectIdentifier}-${data.sequence_id}`;
	const issueUrl = `https://app.plane.so/${process.env.PLANE_WORKSPACE_SLUG}/browse/${issueKey}/`;

	const activities = await getIssueActivities(data.project, data.id);
	const changes = extractLatestFieldChanges(activities);
	const changesText = changes ? changes : 'Нет изменений';

	const message = `${title}
*Название задачи:* ${data.name || 'Без названия'} ([${issueKey}](${issueUrl}))
*Описание:* ${description}
*Автор:* ${await getUserName(data.project, data.updated_by)}

*🛠 Изменения:* ${changesText}`;

	return message;
}

async function formatCommentMessage(action, data) {
	const content = typeof data.comment_stripped === 'object'
		? JSON.stringify(data.comment_stripped, null, 2)
		: data.comment_stripped || 'Комментарий без текста';

	const title = getCommentTitle(action);

	return `${title}
*Автор комментария:* ${await getUserName(data.project, data.created_by)}
*Содержание:* ${content}`;
}

async function getIssueDetailsMessage(projectId, issueId) {
	console.log(`[getIssueDetailsMessage] Getting details for projectId: ${projectId}, issueId: ${issueId}`);
	try {
		const workspaceSlug = process.env.PLANE_WORKSPACE_SLUG;
		const url = `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/`;
		console.log(`[getIssueDetailsMessage] Plane API URL: ${url}`);
		const res = await planeApi.get(url);
		console.log(`[getIssueDetailsMessage] Plane API response received for projectId: ${projectId}, issueId: ${issueId}`);
		const issue = res.data;
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
