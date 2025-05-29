const express = require('express');
const router = express.Router();
const { planeApi } = require('../utils/planeApi');
require('dotenv').config();

router.get('/', async (req, res) => {
	try {
		const response = await planeApi.get(
			`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`
		);
		const projects = response.data.results || [];

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Plane Projects</title>
				<meta charset="UTF-8">
				<style>
					body { font-family: Arial, sans-serif; padding: 20px; }
					h1 { color: #333; }
					ul { list-style: none; padding: 0; }
					li { margin-bottom: 10px; }
				</style>
			</head>
			<body>
				<h1>📦 Projects in Plane Workspace</h1>
				<ul>
				${projects.map(p => `<li><strong>${p.name}</strong> (ID: ${p.id})</li>`).join('')}
				</ul>
			</body>
			</html>
		`;

		res.send(html);
	} catch (error) {
		console.error('❌ Error fetching projects:', error.response?.data || error.message);
		res.status(500).send('Failed to load projects');
	}
});

module.exports = router;