const express = require('express');
const axios = require('axios');
const app = express();

app.disable("x-powered-by");
app.use(express.static('public'));

const GEOAPIFY_KEY = process.env.GEOAPIFY_KEY;

app.get('/api/toilets', async (req, res) => {
    const { lat, lon, radius, wheelchair, free } = req.query;

    if (!lat || !lon || !radius) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon, radius' });
    }

    try {
        let allFeatures = [];
        let offset = 0;
        const limit = 500;
        let fetchMore = true;

        while (fetchMore) {
            const params = {
                categories: 'amenity.toilet',
                filter: `circle:${lon},${lat},${radius}`,
                bias: `proximity:${lon},${lat}`,
                limit: limit,
                offset: offset,
                apiKey: GEOAPIFY_KEY
            };

            // Geoapify uses conditions parameter for wheelchair accessibility
            if (wheelchair === 'true') {
                params.conditions = 'wheelchair';
            }

            const response = await axios.get('https://api.geoapify.com/v2/places', { params });

            const features = response.data.features || [];
            allFeatures = allFeatures.concat(features);

            if (features.length < limit) {
                fetchMore = false;
            } else {
                offset += limit;
            }
        }

        // Map & filter results
        const elements = allFeatures
            .filter((feature) => {
                const props = feature.properties;
                
                // Comprehensive fee check: inspect categories, raw OSM data, and facilities
                const categories = props.categories || [];
                const rawFee = props.datasource?.raw?.fee;
                
                const hasFeeCategory = categories.includes('fee') || categories.includes('fee.yes');
                const isRawFeeYes = typeof rawFee === 'string' && rawFee.toLowerCase() !== 'no';
                const isFacilityFee = props.facilities?.fee === true;

                const isFeeRequired = hasFeeCategory || isRawFeeYes || isFacilityFee;

                // Exclude fee-charging toilets if 'free=true'
                return !(free === 'true' && isFeeRequired);
            })
            .map((feature) => {
                const props = feature.properties;
                const categories = props.categories || [];
                const rawFee = props.datasource?.raw?.fee;
                
                const hasFeeCategory = categories.includes('fee') || categories.includes('fee.yes');
                const isRawFeeYes = typeof rawFee === 'string' && rawFee.toLowerCase() !== 'no';
                const isFacilityFee = props.facilities?.fee === true;

                const isFeeRequired = hasFeeCategory || isRawFeeYes || isFacilityFee;
                const wheelchairStatus = props.wheelchair || props.facilities?.wheelchair;

                return {
                    id: props.place_id,
                    lat: feature.geometry.coordinates[1],
                    lon: feature.geometry.coordinates[0],
                    tags: {
                        amenity: 'toilets',
                        wheelchair: wheelchairStatus ? 'yes' : 'no',
                        fee: isFeeRequired ? 'yes' : 'no',
                        name: props.name || undefined
                    }
                };
            });

        res.json({ elements });
    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch toilet data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
