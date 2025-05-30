// utils/projectMembersService.js
const { planeApi } = require('./planeApi');

const memberMap = new Map();

async function fetchProjectMembers(projectId) {
	if (memberMap.has(projectId)) return memberMap.get(projectId);

	try {
		const res = await planeApi.get(`/projects/${projectId}/members`);
		const members = res.data?.results || [];

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
