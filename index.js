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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log('Server started on port', PORT);
});

