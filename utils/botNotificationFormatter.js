const TurndownService = require('turndown');
const turndownService = new TurndownService();
const { getProjectNameById } = require('./projectServices');
const { getUserName } = require('./projectMemberServices');

async function formatIssueMessage(action, data) {
	let description = 'N/A';
	if (typeof data.description_html === 'string' && data.description_html.trim()) {
		description = turndownService.turndown(data.description_html);
	} else if (typeof data.description_stripped === 'string') {
		description = data.description_stripped;
	}

	let title;
	switch (action) {
		case 'created': title = '🆕 Новая задача'; break;
		case 'updated': title = '✏️ Обновление задачи'; break;
		case 'deleted': title = '🗑️ Удалена задача'; break;
		default: title = `*ISSUE* — ${action}`;
	}

	console.log('data:', data);

	return `${title}
*Проект:* ${getProjectNameById(data.project)}
*Название:* ${data.name || 'Без названия'}
*Описание:* ${description}
*Автор:* ${await getUserName(data.project, data.updated_by)}`;
}

async function formatCommentMessage(action, data) {
	const content = typeof data.comment_stripped === 'object'
		? JSON.stringify(data.comment_stripped, null, 2)
		: data.comment_stripped || 'Комментарий без текста';

	let title;
	switch (action) {
		case 'created': title = '💬 Новый комментарий'; break;
		case 'updated': title = '✏️ Обновлён комментарий'; break;
		case 'deleted': title = '🗑️ Удалён комментарий'; break;
		default: title = `*COMMENT* (${action})`;
	}

	return `${title}
*Автор:* ${await getUserName(data.project, data.created_by)}
*Содержание:* ${content}`;
}

module.exports = {
	formatIssueMessage,
	formatCommentMessage
};