// utils/projectService.js
const { planeApi } = require('./planeApi');

if (!global.projectMap) {
	global.projectMap = new Map();
}

async function loadProjects() {
	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`);
		const results = response.data?.results || [];

		for (const p of results) {
			global.projectMap.set(p.id, p.name);
		}

		console.log(`📦 Загружено проектов: ${global.projectMap.size}`);
	} catch (error) {
		console.error('❌ Не удалось загрузить проекты:', error.message);
	}
}

async function ensureProjectsLoaded() {
	if (global.projectMap?.size > 0) return;

	await loadProjects();
}

function getProjectNameById(id) {
	console.log('ID from webhook:', id);
	console.log('projectMap:', global.projectMap);
	return global.projectMap.get(id) || `Unknown (${id})`;
}

module.exports = {
	loadProjects,
	ensureProjectsLoaded,
	getProjectNameById,
};
