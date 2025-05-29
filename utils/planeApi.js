const axios = require('axios');
require('dotenv').config();

const planeApi = axios.create({
	baseURL: process.env.PLANE_API_BASE_URL || 'https://api.plane.so/api/v1',
	headers: {
		'X-API-Key': process.env.PLANE_API_KEY,
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
});

module.exports = { planeApi };