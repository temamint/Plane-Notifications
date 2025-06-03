const express = require('express');
require('dotenv').config();

const app = express();
const webhookRoute = require('./routes/webhook');
const projectRoutes = require('./routes/projects');
const adminRoute = require('./routes/admin');
require('./bot');

app.use('/webhook', webhookRoute);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoute);

app.listen(3000, () => {
	console.log('Сервер запущен на порту 3000');
});

// module.exports = app;

