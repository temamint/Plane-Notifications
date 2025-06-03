const { planeApi } = require('./planeApi');

async function getIssueSubscribers(issueId) {
	try {
		const res = await planeApi.get(`/issues/${issueId}/`);
		return res.data.subscribers || [];
	} catch (error) {
		console.error('Ошибка при получении подписчиков задачи:', error.message);
		return [];
	}
}

module.exports = { getIssueSubscribers };
