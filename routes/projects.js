const express = require('express');
const router = express.Router();
const { planeApi } = require('../utils/planeApi');
require('dotenv').config();

router.get('/', async (req, res) => {
	try {
		// Загружаем все проекты
		const projectResponse = await planeApi.get(
			`/workspaces/${process.env.PLANE_WORKSPACE_SLUG}/projects/`
		);
		const projects = projectResponse.data.results || [];

		// Для каждого проекта подгружаем участников
		const projectsWithMembers = await Promise.all(
			projects.map(async (project) => {
				try {
					const memberRes = await planeApi.get(`/projects/${project.id}/members/`);
					const members = memberRes.data.results || [];
					return { ...project, members };
				} catch (err) {
					console.error(`❌ Не удалось получить участников проекта ${project.id}:`, err.response?.data || err.message);
					return { ...project, members: [] };
				}
			})
		);

		// Генерация HTML
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
					li { margin-bottom: 15px; }
					details { margin-top: 5px; padding-left: 15px; }
				</style>
			</head>
			<body>
				<h1>📦 Projects in Plane Workspace</h1>
				<ul>
					${projectsWithMembers.map(p => `
						<li>
							<strong>${p.name}</strong> (ID: ${p.id})
							<details>
								<summary>👥 Участники (${p.members.length})</summary>
								<ul>
									${p.members.map(m => `<li>${m.first_name || ''} ${m.last_name || ''} (${m.email || 'no email'})</li>`).join('')}
								</ul>
							</details>
						</li>
					`).join('')}
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
