// services/projectService.js
const { planeApi } = require('../utils/planeApi');

let projectMap = new Map();

async function loadProjects() {
	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`);
		const projects = response.data?.results || [];

		projectMap.clear(); // очистить старые данные
		projects.forEach(p => {
			projectMap.set(p.id, p.name);
		});

		console.log(`📦 Загружено проектов: ${projects.length}`);
		console.log(projects);
	} catch (error) {
		console.error('❌ Не удалось загрузить проекты:', error.message);
		projectMap.clear(); // если ошибка — обнуляем, чтобы не остались старые
	}
}

function getProjectNameById(id) {
	return projectMap.get(id) || `Unknown (${id})`;
}

module.exports = {
	loadProjects,
	getProjectNameById,
};
