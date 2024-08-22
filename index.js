const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/api/toilets', async (req, res) => {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon || !radius) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon, radius' });
    }

    try {
        const response = await axios.get('https://overpass-api.de/api/interpreter', {
            params: {
                data: `
                [out:json][timeout:25];
                node["amenity"="toilets"](around:${radius},${lat},${lon});
                out body;
                `
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch toilet data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
