const express = require('express');
require('dotenv').config();

const projectRoutes = require('./routes/projects');
const webhookRoute = require('./routes/webhook');

const app = express();

app.use('/webhook', webhookRoute);
app.use('/projects', projectRoutes);

module.exports = app;
