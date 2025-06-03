// utils/projectMembersService.js
const { planeApi } = require('./planeApi');
require('dotenv').config();

const memberCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function isCacheFresh(entry) {
	return entry && (Date.now() - entry.timestamp < CACHE_TTL);
}

async function fetchProjectMembers(projectId) {
	const cached = memberCache.get(projectId);
	if (isCacheFresh(cached)) return cached.userMap;

	if (memberCache.has(projectId)) return memberCache.get(projectId);

	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/members/`);
		const members = response.data?.results || [];

		const userMap = new Map();
		members.forEach(member => {
			if (member && member.id) {
				const fullName = `${member.first_name} ${member.last_name} (${member.display_name})`.trim();
				userMap.set(member.id, fullName || `Unknown (${member.id})`);
			}
		});

		memberCache.set(projectId, userMap);

		return userMap;
	} catch (err) {
		console.error(`❌ Не удалось загрузить участников проекта ${projectId}:`, err.message);
		return new Map();
	}
}

async function getUserName(projectId, userId) {
	const membersMap = await fetchProjectMembers(projectId);
	return membersMap.get(userId) || `Unknown (${userId})`;
}

module.exports = {
	getUserName,
};
