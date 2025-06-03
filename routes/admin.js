const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const axios = require('axios');
const WORKSPACE_SLUG = process.env.PLANE_WORKSPACE_SLUG;
const PLANE_API_KEY = process.env.PLANE_API_KEY;

const userService = require('../utils/userService');

const filePath = path.join(__dirname, '../data/userMap.json');
const htmlPath = path.join(__dirname, '../admin/index.html');

async function fetchPlaneUsers() {
	try {
		const res = await axios.get(`https://api.plane.so/api/v1/workspaces/${WORKSPACE_SLUG}/members/`, {
			headers: { 'X-API-Key': PLANE_API_KEY }
		});
		return res.data;
	} catch (e) {
		console.error('❌ Ошибка загрузки пользователей Plane:', e.message);
		return [];
	}
}


router.get('/', async (req, res) => {
	console.log(`Начало работы с админкой`);
	const map = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	const planeUsers = await fetchPlaneUsers();
	console.log(`Получили пользователей Plane`);

	const html = ejs.render(fs.readFileSync(htmlPath, 'utf-8'), {
		users: map.telegram_users || {},
		currentLinks: map.telegram_to_plane || {},
		planeUsers
	});

	res.send(html);
});


router.post('/link', express.urlencoded({ extended: true }), (req, res) => {
	const planeMap = req.body.planeMap || {};
	const map = userService.loadMap();

	for (const [tgId, planeId] of Object.entries(planeMap)) {
		if (planeId && planeId.length > 5) {
			map.telegram_to_plane[tgId] = planeId;
			map.plane_to_telegram[planeId] = parseInt(tgId);
		}
	}

	fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
	res.redirect('/admin');
});

module.exports = router;
