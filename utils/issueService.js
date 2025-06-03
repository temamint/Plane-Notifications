const { planeApi } = require('./planeApi');

async function getIssueSubscribers(projectId, issueId) {
	console.log(`Получение подписчиков задачи: ${issueId}`);
	try {
		const res = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/`);
		console.log(`Заходит задача в бар, а там... её дата: ${JSON.stringify(res.data, null, 2)}`);
		return res.data.subscribers || [];
	} catch (error) {
		console.error('Ошибка при получении подписчиков задачи:', error.message);
		return [];
	}
}

module.exports = { getIssueSubscribers };
