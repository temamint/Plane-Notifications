const { planeApi } = require('./planeApi');

async function getIssueActivities(projectId, issueId) {
	console.log(`📦 Загружаем активность по задаче ${issueId}, проект ${projectId}`);
	try {
		const response = await planeApi.get(
			`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/activities/`
		);
		return response.data.results || [];
	} catch (error) {
		console.error('❌ Не удалось получить активность по задаче:', error.message);
		return [];
	}
}

function extractLatestFieldChanges(activities) {
	return activities
		.filter(a => a.verb === 'updated' && a.field)
		.slice(-5)
		.map(a => `— *${a.field}*: ${a.old_value || '—'} → ${a.new_value || '—'}`);
}


module.exports = { getIssueActivities, extractLatestFieldChanges };
