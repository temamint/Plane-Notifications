const TurndownService = require('turndown');
const turndownService = new TurndownService();
const { getProjectNameById, getProjectIdentifierById } = require('./projectServices');
const { getUserName } = require('./projectMemberServices');
const { getIssueActivities, extractLatestFieldChanges } = require('./utils/issueActivityService');

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

	let changesText = '';
	if (changes.length > 0) {
		changesText = `🛠 Изменения:\n${changes.join('\n')}`;
	}

	const message = `${title}
*Проект:* ${await getProjectNameById(data.project)}
*Название задачи:* ${data.name || 'Без названия'} ([${issueKey}](${issueUrl}))
*Описание:* ${description}
*Автор:* ${await getUserName(data.project, data.updated_by)}

*Последние изменения:*
${changesText}`;

	console.log(`Сформированное сообщение: ${message}`);

	return message;
}

async function formatCommentMessage(action, data) {
	const content = typeof data.comment_stripped === 'object'
		? JSON.stringify(data.comment_stripped, null, 2)
		: data.comment_stripped || 'Комментарий без текста';

	const title = getCommentTitle(action);

	return `${title}
*Проект:* ${await getProjectNameById(data.project)}
*Автор комментария:* ${await getUserName(data.project, data.created_by)}
*Содержание:* ${content}`;
}

module.exports = {
	formatIssueMessage,
	formatCommentMessage
};