// services/projectService.js
const { planeApi } = require('../utils/planeApi');

let projectMap = new Map();

async function loadProjects() {
	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`);
		projectCache.projects = response.data?.results || [];
		console.log(`📦 Загружено проектов: ${projectCache.projects.length}`);
	} catch (error) {
		console.error('❌ Не удалось загрузить проекты:', error.message);
		projectCache.projects = []; // чтобы не остались старые
	}
}

function getProjectNameById(id) {
	return projectMap.get(id) || `Unknown (${id})`;
}

module.exports = {
	loadProjects,
	getProjectNameById,
};
