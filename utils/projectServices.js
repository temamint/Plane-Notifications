// utils/projectService.js
const { planeApi } = require('./planeApi');

if (!global.projectMap) {
	global.projectMap = new Map();
}

async function loadProjects() {
	try {
		console.log('📦 Загрузка проектов...');
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`);
		const results = response.data?.results || [];

		for (const p of results) {
			global.projectMap.set(p.id, {
				name: p.name,
				identifier: p.identifier,
			});
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

async function getProjectNameById(id) {
	const project = global.projectMap.get(id);
	return project?.name || `Unknown (${id})`;
}

async function getProjectIdentifierById(id) {
	const project = global.projectMap.get(id);
	return project?.identifier || `unknown`;
}


module.exports = {
	loadProjects,
	ensureProjectsLoaded,
	getProjectNameById,
	getProjectIdentifierById
};
