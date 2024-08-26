function openInfoDialog() {
    $("#infoDialog").dialog();
}

const map = L.map('map').setView([48.21, 16.38], 14); // Default Location Vienna

// Set up tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    minZoom: 11
}).addTo(map);

// Fetch and display toilets based on filters
function fetchToilets(lat, lon) {
    const radius = map.getBounds().getNorthEast().distanceTo(map.getBounds().getSouthWest()) / 2;
    const wheelchair = document.getElementById('wheelchairFilter').checked;
    const free = document.getElementById('freeFilter').checked;

    const url = `/api/toilets?lat=${lat}&lon=${lon}&radius=${radius}&wheelchair=${wheelchair}&free=${free}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Clear existing toilet markers, but keep the user location marker
            map.eachLayer(layer => {
                if (layer instanceof L.Marker && !layer._userMarker) {
                    map.removeLayer(layer);
                }
            });

            data.elements.forEach(element => {
                if (element.lat && element.lon) {
                    const toiletIcon = L.divIcon({
                        className: 'toilet-marker',
                    });

                    const popupContent = `
                        <div>
                            <strong>Public Toilet</strong><br />
                            ${element.tags.access ? `<strong>Opened:</strong> ${element.tags.access}<br />` : ''}
                            ${element.tags.centralkey ? `<strong>Central Key:</strong> ${element.tags.centralkey}<br />` : ''}
                            ${element.tags.fee ? `<strong>Fee:</strong> ${element.tags.fee}<br />` : ''}
                            ${element.tags.wheelchair ? `<strong>Wheelchair accessible:</strong> ${element.tags.wheelchair}<br />` : ''}
                            <strong>ID:</strong> #${element.id}
                        </div>
                    `;

                    L.marker([element.lat, element.lon], { icon: toiletIcon })
                        .addTo(map)
                        .bindPopup(popupContent);
                }
            });
        })
        .catch(error => console.error('Fetch error:', error));
}

let userLocation; // Store user location for later centering

// Wrapper function to get the center and fetch toilets
function fetchAndUpdateToilets() {
    const center = map.getCenter();
    fetchToilets(center.lat, center.lng);
}

// Center the map on the user's location when the button is clicked
function centerOnUserLocation() {
    if (userLocation) {
        map.setView(userLocation, 15);
    } else {
        alert("User location not available yet.");
    }
}

let userMarker; // identifies the user location marker on the map
let mapCentered = false; // Flag to ensure the map is centered only once

function onLocationFound(e) {
    const radius = e.accuracy / 2;

    if (!userMarker) {
        // Create a custom marker if it doesn't exist
        const userIcon = L.divIcon({
            className: 'user-location-marker',
        });

        userMarker = L.marker(e.latlng, { icon: userIcon })
            .addTo(map)
            .bindPopup("You are within " + Math.trunc(radius) + " meters from this point.");

        // Mark this marker as the user location marker
        userMarker._userMarker = true;
    } else {
        // Update the existing marker position
        userMarker.setLatLng(e.latlng).update();
    }

    userLocation = e.latlng;

    // Center the map only on the first location update
    if (!mapCentered) {
        map.setView(e.latlng, 15);
        mapCentered = true; // Ensure map is not centered again
    }

    // Fetch toilets around the new location
    fetchToilets(e.latlng.lat, e.latlng.lng);
}

function onLocationError(e) {
    alert(e.message);
}

let isTracking = true; // Status if the GPS tracker is enabled at the moment

function onVisibilityChange() {
    if (document.hidden) {
        map.stopLocate(); // Stop tracking when the window is in the background
        isTracking = false;
    } else if (!isTracking) {
        map.locate({ watch: true, maxZoom: 16 }); // Resume tracking when the window is in focus
        isTracking = true;
    }
}

// Enable real-time tracking of user's location
map.locate({ watch: true, maxZoom: 16 });

// When a new location is found, update the marker and fetch data
map.on('locationfound', onLocationFound);

// Handle location errors
map.on('locationerror', onLocationError);

// Handles browser window visibility changes
document.addEventListener('visibilitychange', onVisibilityChange);

// Also fetch toilets on map move (for cases when user moves map manually)
map.on('moveend', function() {
    fetchAndUpdateToilets();
});

// Initial fetch
fetchAndUpdateToilets();
