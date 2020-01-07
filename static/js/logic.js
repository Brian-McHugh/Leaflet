// create accessible variables for our API responses
var
  earthquakeRes,
  tectonicRes;

// Store our API endpoint inside queryUrl
function buildUrl(){
    const
        domain = "earthquake.usgs.gov",
        endpoint = "/earthquakes/feed/v1.0/summary/",
        format = "geojson",
        // Options are all_day, all_week, all_month
        timeframe = "all_day";
    
    // queryUrl = https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson
    return `https://${domain}${endpoint}${timeframe}.${format}`;
}

// Define a markerSize function that will give each earthquake a different radius based on its magnitude
function markerSize(magnitude) {
    // prevent negative-magnitude earthquakes from appearing
    if (magnitude >= 0) {
        return magnitude * 30000;
    } else {
        return 1;
    }
}

// Function that will determine the color of the circle for each earthquake
function getColor(mag) {
    if (mag >= 5){
        return "#bd0026";
    }
    if (mag >= 4){
        return "#f03b20";
    }
    if (mag >= 3){
        return "#fd8d3c";
    }
    if (mag >= 2){
        return "#feb24c";
    }
    if (mag >= 1){
        return "#fed976";
    }
    return "#ffffb2";
}

function createFeatures(earthquakeData) {
    // Check that the data is coming through
    //console.log("Incoming earthquake" + earthquakeData);

    var earthquakes = new L.LayerGroup();

    var quakes = earthquakeData.features;

    quakes.forEach(quake => {
        L.circle([quake.geometry.coordinates[1], quake.geometry.coordinates[0]], {
                    fillOpacity: 0.75,
                    color: "black",
                    fillColor: getColor(quake.properties.mag),
                    radius: markerSize(quake.properties.mag),
                    weight: 1
        }).bindPopup(`<h3>${quake.properties.place}</h3><hr><p>${new Date(quake.properties.time)}</p><hr><p>Magnitude: ${quake.properties.mag}</p>`).addTo(earthquakes);
    })
    
    // Alternative way to add elements to a layer
    // Define a function we want to run once for each feature in the features array
    // Give each feature a popup describing the place and time of the earthquake
    // function onEachFeature(feature, layer) {
    //     layer.bindPopup(`<h3>${feature.properties.place}</h3><hr><p>${new Date(feature.properties.time)}</p><hr><p>Magnitude: ${feature.properties.mag}</p>`);
    // }

    // // Create a GeoJSON layer containing the features array on the earthquakeData object
    // // Run the onEachFeature function once for each piece of data in the array
    // var earthquakes = L.geoJSON(earthquakeData, {
    //     onEachFeature: onEachFeature
    // });

    //console.log(earthquakes);

    // Sending our earthquakes layer to the createMap function
    createMap(earthquakes);
}


function createMap(earthquakes) {
    // Define mapping types
    const satellite = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
            attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
            maxZoom: 18,
            id: "mapbox.satellite",
            accessToken: API_KEY
    });

    const grayscale = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
            attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
            maxZoom: 18,
            id: "mapbox.light",
            accessToken: API_KEY
    });

    const colorMap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.outdoors",
        accessToken: API_KEY
    });

    //console.log(tectonicRes);
    
    // Create our fault lines layer
    var faultLines = new L.LayerGroup();

    L.geoJSON(tectonicRes.features, {
        style: function(feature) {
            return {
                color: "red",
                weight: 1.5
            }
        }
    }).addTo(faultLines);
    
    // Define a baseMaps object to hold our base layers
    const baseMaps = {
            Satellite: satellite,
            "Color Map": colorMap,
            Grayscale: grayscale
    };

    // Create overlay object to hold our overlay layer
    const overlayMaps = {
            Earthquakes: earthquakes,
            "Fault Lines": faultLines
    };

    // Create our map, giving it the satellite view, the earthquake markers and fault lines
    const myMap = L.map("map", {
            center: [52.128429, -122.130203],
            zoom: 4,
            layers: [satellite, earthquakes, faultLines]
    });

    // Create a layer control
    // Pass in our baseMaps and overlayMaps
    // Add the layer control to the map
    L.control.layers(baseMaps, overlayMaps, {
            collapsed: false
    }).addTo(myMap);

    // Create a legend to display information about our map
    var legend = L.control({position: 'bottomright'});

    // When the layer control is added, insert a div with the class of "legend"
    legend.onAdd = function(map) {
        var div = L.DomUtil.create("div", "info legend"),
            ranges = [0, 1, 2, 3, 4, 5];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i=0; i<ranges.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(ranges[i]+.1) + '"></i> ' +
                ranges[i] + (ranges[i + 1] ? '&ndash;' + ranges[i + 1] + '<br>' : '+');
        }
        return div;
    };
    // Add the info legend to the map
    legend.addTo(myMap);
}

(async function(){
    const 
        queryUrl = buildUrl();
        tectonicUrl = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";
    
    // Perform an API call to USGS for earthquake data
    earthquakeRes = await d3.json(queryUrl);
    // When the first API call is complete, perform another call to gather tectonic plate data
    tectonicRes = await d3.json(tectonicUrl);

    // Once we get a response, send the earthquakeRes.features object to the createEarthquakes function
    createFeatures(earthquakeRes);

    // console.log(earthquakeRes);
    // console.log(tectonicRes);

})()