// utils/projectMembersService.js
const { planeApi } = require('./planeApi');
require('dotenv').config();

const memberMap = new Map();

async function fetchProjectMembers(projectId) {
	if (memberMap.has(projectId)) return memberMap.get(projectId);

	console.log(`📦 Загружаем участников проекта ${projectId}`);

	try {
		const response = await planeApi.get(`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/members/`);
		const members = response.data || [];

		console.log(members);

		const userMap = new Map();
		members.forEach(member => {
			if (member && member.id) {
				const fullName = `${member.first_name} ${member.last_name} (${member.display_name})`.trim();
				userMap.set(member.id, fullName || `Unknown (${member.id})`);
			}
		});

		memberMap.set(projectId, userMap);

		console.log(`Карта участников: ${userMap}`);
		return userMap;
	} catch (err) {
		console.error(`❌ Не удалось загрузить участников проекта ${projectId}:`, err.message);
		return new Map();
	}
}

async function getUserName(projectId, userId) {
	const membersMap = await fetchProjectMembers(projectId);
	console.log(`projectId: ${projectId}, userId: ${userId}`);
	return membersMap.get(userId) || `Unknown (${userId})`;
}

module.exports = {
	getUserName,
};
