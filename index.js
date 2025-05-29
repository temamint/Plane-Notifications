const express = require('express');
require('dotenv').config();

const projectRoutes = require('./routes/projects');
const webhookRoute = require('./routes/webhook');

const app = express();

app.use('/webhook', webhookRoute);

// Роут для вывода HTML-страницы со списком проектов
app.use('/projects', projectRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`🚀 Server running on port ${port}`);
});
