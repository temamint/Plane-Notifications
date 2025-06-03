// utils/projectMembersService.js
const { planeApi } = require('./planeApi');
require('dotenv').config();

const memberMap = new Map();

async function fetchProjectMembers(projectId) {
	if (memberMap.has(projectId)) return memberMap.get(projectId);

	console.log(`📦 Загружаем участников проекта ${projectId}`);

	try {
		const response = await planeApi.get(`/${process.env.PLANE_WORKSPACE_SLUG}/projects/${projectId}/members/`);
		const members = response.data || [];

		console.log(members);

		// Кэшируем мапу user_id → full_name
		const userMap = new Map();
		members.forEach(m => {
			if (m.member && m.member.id) {
				const fullName = `${m.member.first_name} ${m.member.last_name}`.trim();
				userMap.set(m.member.id, fullName || `Unknown (${m.member.id})`);
			}
		});

		memberMap.set(projectId, userMap);
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
