export const GOOGLE_MAPS_LIBRARIES = ['visualization', 'places'];

export const mapOptions = {
    disableDefaultUI: true,
    backgroundColor: '#010409',
    styles: [
        { elementType: "geometry", stylers: [{ color: "#1d2026" }] },
        { elementType: "labels.text.stroke", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0a0c10" }] // Deep black/blue ocean
        },
        {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#16191e" }] // Dark grey land
        },
        {
            featureType: "administrative.country",
            elementType: "geometry.stroke",
            stylers: [{ color: "#4b5563", weight: 1 }] // Faint borders
        }
    ]
};

// Heatmap gradient representing the "Glow"
export const HEATMAP_GRADIENT = [
    "rgba(0, 255, 255, 0)",
    "rgba(0, 255, 163, 0.5)", // Safe Green-Blue
    "rgba(255, 255, 0, 0.8)",  // Warning Yellow
    "rgba(255, 0, 68, 1)"      // Danger Red
];