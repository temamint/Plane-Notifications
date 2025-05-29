// services/projectService.js
const { planeApi } = require('../utils/planeApi');

let projectMap = new Map();

async function loadProjects() {
	try {
		const res = await planeApi.get(
			`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`
		);
		const projects = res.data.results || [];

		projectMap = new Map(
			projects.map(project => [project.id, project.name])
		);

		console.log(`📦 Загружено проектов: ${projectMap.size}`);
	} catch (err) {
		console.error('❌ Не удалось загрузить проекты:', err.message);
	}
}

function getProjectNameById(id) {
	return projectMap.get(id) || `Unknown (${id})`;
}

module.exports = {
	loadProjects,
	getProjectNameById,
};
