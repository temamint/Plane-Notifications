const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/userMap.json');

function loadMap() {
	if (!fs.existsSync(filePath)) return { telegram_to_plane: {}, plane_to_telegram: {}, telegram_users: {} };

	try {
		const raw = fs.readFileSync(filePath, 'utf-8');
		const parsed = JSON.parse(raw);
		return parsed;
	} catch (err) {
		console.error('❌ Ошибка при чтении userMap.json:', err.message);
		return { telegram_to_plane: {}, plane_to_telegram: {}, telegram_users: {} };
	}
}


function saveMap(map) {
	fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
}

function linkUser(telegramId, planeUserId) {
	const map = loadMap();
	map.telegram_to_plane[telegramId] = planeUserId;
	map.plane_to_telegram[planeUserId] = telegramId;
	saveMap(map);
}

function getTelegramIdByPlaneUserId(planeUserId) {
	const map = loadMap();
	return map.plane_to_telegram[planeUserId] || null;
}

function saveTelegramUserInfo(user) {
	const map = loadMap();
	map.telegram_users[user.id] = {
		username: user.username,
		first_name: user.first_name,
		last_name: user.last_name
	};
	saveMap(map);
}

module.exports = {
	linkUser,
	getTelegramIdByPlaneUserId,
	saveTelegramUserInfo,
	loadMap
};
