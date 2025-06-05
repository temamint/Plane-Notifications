// utils/projectMembersService.js
const { planeApi } = require('./planeApi');
require('dotenv').config();

const memberCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function isCacheFresh(entry) {
	return entry && (Date.now() - entry.timestamp < CACHE_TTL);
}

async function fetchProjectMembers(projectId) {
	console.log('📦 Загрузка участников проекта из кэша...');
	const cached = memberCache.get(projectId);
	console.log(`📦 Загружены участники из кэша: ${cached?.userMap ? [...cached.userMap.values()].join(', ') : 'нет'}`);
	if (isCacheFresh(cached)) {
		console.log('📦 Кэш актуален');
		return cached.userMap;
	}

	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/members/`);
		const members = response.data || [];

		console.log(`📦 Загружены участники: ${members}`);

		const userMap = new Map();
		members.forEach(member => {
			if (member && member.id) {
				const fullName = `${member.first_name} ${member.last_name} (${member.display_name})`.trim();
				userMap.set(member.id, fullName || `Unknown (${member.id})`);
			}
		});

		memberCache.set(projectId, {
			timestamp: Date.now(),
			userMap
		});

		return userMap;
	} catch (err) {
		console.error(`❌ Не удалось загрузить участников проекта ${projectId}:`, err.message);
		return new Map();
	}
}

async function getUserName(projectId, userId) {
	const projectCache = await fetchProjectMembers(projectId);
	return projectCache.get(userId) || `Unknown (${userId})`;
}

module.exports = {
	getUserName,
};
