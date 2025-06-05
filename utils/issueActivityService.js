const { planeApi } = require('./planeApi');

async function getIssueActivities(projectId, issueId) {
	try {
		const response = await planeApi.get(
			`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/issues/${issueId}/activities/`
		);
		return response.data || [];
	} catch (error) {
		console.error('❌ Не удалось получить активность по задаче:', error.message);
		return [];
	}
}

function extractLatestFieldChanges(activities) {
	return activities
		.filter(a => a.action_type === 'updated' && a.field_name)
		.slice(-5) // только последние 5 изменений
		.map(a => `— *${a.field_name}*: ${a.from_value || '—'} → ${a.to_value || '—'}`);
}


module.exports = { getIssueActivities, extractLatestFieldChanges };
