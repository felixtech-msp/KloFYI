const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/api/toilets', async (req, res) => {
    const { lat, lon, radius, wheelchair, free } = req.query;

    if (!lat || !lon || !radius) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon, radius' });
    }

    try {
        // Construct the Overpass API query
        let query = `
            [out:json][timeout:5];
            node["amenity"="toilets"](around:${radius},${lat},${lon})
        `;

        // Add wheelchair filter to the Overpass query
        if (wheelchair === 'true') {
            query += '["wheelchair"="yes"]';
        }

        query += ';out body;';

        const response = await axios.get('https://overpass-api.de/api/interpreter', {
            params: {
                data: query,
            },
        });

        // Filter results based on fee status
        const filteredToilets = response.data.elements.filter((element) => {
            const tags = element.tags || {};
            if (free === 'true' && tags.fee === 'yes') {
                return false; // Exclude toilets that have a fee
            }
            return true;
        });

        res.json({ elements: filteredToilets });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch toilet data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
