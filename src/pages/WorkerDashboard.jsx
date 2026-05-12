import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.js';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Icons
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const orangeIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// HQ Icons - Neutral vs Selected
const hqIconNeutral = new L.Icon({
    iconUrl: 'https://img.icons8.com/ios-filled/50/737373/building.png', // Grey Building
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
});

const startIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/color/48/building.png', // Building icon (Color)
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
});

const endIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/isometric/50/building.png', // Blue Building
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
});

// OSRM Routing Component
function RoutingMachine({ source, destination }) {
    const map = useMap();

    useEffect(() => {
        if (!source || !destination) return;

        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(source.lat, source.lng),
                L.latLng(destination.lat, destination.lng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: 'blue', opacity: 0.6, weight: 4 }]
            },
            show: false, // Hide the itinerary panel
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            createMarker: () => null // We use our own markers
        }).addTo(map);

        return () => map.removeControl(routingControl);
    }, [map, source, destination]);

    return null;
}

export default function WorkerDashboard() {
    const { currentUser } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [headquarters, setHeadquarters] = useState([]); // List of all HQs

    // Route State (Stores IDs)
    const [routeIds, setRouteIds] = useState({ fromHQ: "", toHQ: "" });
    // Derived Route State (Stores Lat/Lng for visualization)
    const [routeCoords, setRouteCoords] = useState({ source: null, destination: null });

    const [savingRoute, setSavingRoute] = useState(false);
    const [isConfiguring, setIsConfiguring] = useState(false);

    useEffect(() => {
        if (currentUser) {
            fetchAssignments();
            fetchHeadquarters();
        }
    }, [currentUser]);

    // Re-calculate coordinates whenever HQs or Selection changes
    useEffect(() => {
        if (headquarters.length > 0 && routeIds.fromHQ && routeIds.toHQ) {
            const startHQ = headquarters.find(hq => hq.id === routeIds.fromHQ);
            const endHQ = headquarters.find(hq => hq.id === routeIds.toHQ);

            if (startHQ && endHQ) {
                setRouteCoords({
                    source: startHQ.location,
                    destination: endHQ.location
                });
            }
        }
    }, [headquarters, routeIds]);

    // Initial Route Fetch
    useEffect(() => {
        if (currentUser) {
            const fetchSavedRoute = async () => {
                try {
                    const docRef = doc(db, "users", currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists() && docSnap.data().route) {
                        const savedRoute = docSnap.data().route;
                        // Support both old (lat/lng) and new (id) formats gracefully during migration
                        if (savedRoute.fromHQ && savedRoute.toHQ) {
                            setRouteIds(savedRoute);
                        } else if (savedRoute.source && savedRoute.destination) {
                            // Old format: do nothing or warn? Let's just ignore old coordinate defaults to force HQ selection
                            console.log("Legacy route detected, prompting for HQ setup.");
                        }
                    }
                } catch (error) {
                    console.error("Error fetching route:", error);
                }
            };
            fetchSavedRoute();
        }
    }, [currentUser]);


    async function fetchHeadquarters() {
        try {
            const q = query(collection(db, "headquarters"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort alphabetically
                data.sort((a, b) => a.name.localeCompare(b.name));
                setHeadquarters(data);
            });
            return unsubscribe; // Cleanup handled by react if we stored it
        } catch (error) {
            console.error("Error fetching HQs:", error);
        }
    }

    async function saveRoute() {
        if (!routeIds.fromHQ || !routeIds.toHQ) {
            alert("Please select both a Start and End Headquarters.");
            return;
        }
        if (routeIds.fromHQ === routeIds.toHQ) {
            alert("Start and End Headquarters cannot be the same.");
            return;
        }

        setSavingRoute(true);
        try {
            const docRef = doc(db, "users", currentUser.uid);
            // Updating with the IDs, not raw coordinates
            await updateDoc(docRef, {
                route: { fromHQ: routeIds.fromHQ, toHQ: routeIds.toHQ }
            });
            alert("Headquarters route saved successfully!");
            setIsConfiguring(false);
        } catch (error) {
            console.error("Error saving route:", error);
            // Fallback for new user document creation
            try {
                const docRef = doc(db, "users", currentUser.uid);
                await setDoc(docRef, { route: { fromHQ: routeIds.fromHQ, toHQ: routeIds.toHQ } }, { merge: true });
                alert("Headquarters route saved successfully!");
                setIsConfiguring(false);
            } catch (err) {
                alert("Failed to save route.");
            }
        }
        setSavingRoute(false);
    }

    async function fetchAssignments() {
        setLoading(true);
        try {
            const q = query(collection(db, "complaints"), where("assignedTo", "==", currentUser.uid));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort: Pending > In Progress > Resolved
            const statusOrder = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3 };
            data.sort((a, b) => {
                const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                if (statusDiff !== 0) return statusDiff;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setAssignments(data);
        } catch (error) {
            console.error("Error fetching assignments:", error);
        }
        setLoading(false);
    }

    async function handleStatusChange(complaintId, newStatus) {
        setUpdating(complaintId);
        try {
            const complaintRef = doc(db, "complaints", complaintId);
            const updateData = { status: newStatus };

            if (newStatus === 'Resolved') {
                updateData.resolvedAt = serverTimestamp();
                updateData.resolutionNote = "Issue resolved by field worker.";
            }

            await updateDoc(complaintRef, updateData);

            // Optimistic update
            setAssignments(prev => prev.map(item =>
                item.id === complaintId ? { ...item, ...updateData, status: newStatus } : item
            ));

        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
        setUpdating(null);
    }

    // Helper to get lat/lng from complaint location
    const getComplaintLatLng = (c) => {
        if (typeof c.location === 'object' && c.location.lat) {
            return [c.location.lat, c.location.lng];
        }
        if (typeof c.location === 'string') {
            const parts = c.location.split(',');
            if (parts.length === 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
            }
        }
        return null;
    };

    // Helper to select icon based on severity
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'High': return redIcon;
            case 'Medium': return orangeIcon;
            case 'Low': return greenIcon;
            default: return greenIcon;
        }
    };

    const menuItems = [
        <button className="dropdown-item" onClick={() => setIsConfiguring(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Configure Route
        </button>
    ];

    return (
        <>
            <Navbar customMenuItems={!isConfiguring ? menuItems : []} />
            <div className="container">
                <div className="dashboard-header page-enter" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2>Worker Portal</h2>
                            <p>My Route & Tasks</p>
                        </div>
                        {/* Configuration is now Modal-like or inline */}
                    </div>
                    {isConfiguring && (
                        <div className="config-panel-enter" style={{ width: '100%', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ marginTop: 0 }}>Configure Route</h3>
                            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Select your Start and End Headquarters.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Start Point (Depot)</label>
                                    <select
                                        className="form-control"
                                        value={routeIds.fromHQ}
                                        onChange={(e) => setRouteIds({ ...routeIds, fromHQ: e.target.value })}
                                        style={{ width: '100%', padding: '8px' }}
                                    >
                                        <option value="">-- Select Start HQ --</option>
                                        {headquarters.map(hq => (
                                            <option key={hq.id} value={hq.id}>{hq.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>End Point (Destination)</label>
                                    <select
                                        className="form-control"
                                        value={routeIds.toHQ}
                                        onChange={(e) => setRouteIds({ ...routeIds, toHQ: e.target.value })}
                                        style={{ width: '100%', padding: '8px' }}
                                    >
                                        <option value="">-- Select End HQ --</option>
                                        {headquarters.map(hq => (
                                            <option key={hq.id} value={hq.id}>{hq.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" onClick={saveRoute} disabled={savingRoute}>
                                    {savingRoute ? "Saving..." : "Save Route Config"}
                                </button>
                                <button className="btn btn-secondary" onClick={() => setIsConfiguring(false)}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Unified Map Section */}
                <div className="card map-border page-enter-delay-1" style={{ marginBottom: '30px', padding: '0', overflow: 'hidden' }}>

                    <div style={{ height: '500px' }}>
                        <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />

                            {/* Render All HQs */}
                            {headquarters.map(hq => {
                                // Determine icon based on if this HQ is start or end of the CURRENT route
                                let icon = hqIconNeutral;
                                let typeLabel = "Headquarters";

                                if (hq.id === routeIds.fromHQ) {
                                    icon = startIcon;
                                    typeLabel = "Start Point";
                                } else if (hq.id === routeIds.toHQ) {
                                    icon = endIcon;
                                    typeLabel = "End Point";
                                }

                                return (
                                    <Marker key={hq.id} position={[hq.location.lat, hq.location.lng]} icon={icon}>
                                        <Popup>
                                            <strong>{hq.name}</strong><br />
                                            {typeLabel}
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* OSRM Route */}
                            <RoutingMachine source={routeCoords.source} destination={routeCoords.destination} />

                            {/* Assignment Markers */}
                            {assignments.map(item => {
                                const pos = getComplaintLatLng(item);
                                if (!pos) return null;
                                if (item.status === 'Resolved') return null;

                                return (
                                    <Marker key={item.id} position={pos} icon={getSeverityIcon(item.severity)}>
                                        <Popup>
                                            <div style={{ minWidth: '200px' }}>
                                                <h4>{item.wasteType}</h4>
                                                <p>{item.description}</p>
                                                <div style={{ marginBottom: '10px' }}>
                                                    Priority: <strong>{item.severity}</strong><br />
                                                    Status: <strong>{item.status}</strong>
                                                </div>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ width: '100%', backgroundColor: '#15803d', color: 'white', padding: '5px' }}
                                                    onClick={() => handleStatusChange(item.id, 'Resolved')}
                                                    disabled={updating === item.id}
                                                >
                                                    {updating === item.id ? 'Resolving...' : '✅ Mark as Resolved'}
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    </div>
                </div>

                {/* Assignments List */}
                <h3 className="page-enter-delay-2" style={{ marginBottom: '20px' }}>Task List</h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading assignments...</div>
                ) : (
                    <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {assignments.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                <h3>No Assignments Yet 🎉</h3>
                                <p>You have no pending complaints assigned to you.</p>
                            </div>
                        ) : (
                            assignments.map(item => (
                                <div key={item.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <span className={`badge badge-${item.severity?.toLowerCase()}`}>
                                            {item.severity} Priority
                                        </span>
                                        <span className="badge" style={{
                                            background: item.status === 'Resolved' ? '#dcfce7' : '#f1f5f9',
                                            color: item.status === 'Resolved' ? '#166534' : '#475569'
                                        }}>
                                            {item.status}
                                        </span>
                                    </div>

                                    <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem' }}>{item.wasteType}</h4>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px', flex: 1 }}>
                                        {item.description}
                                    </p>

                                    {/* Action Button */}
                                    {item.status !== 'Resolved' ? (
                                        <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                                            <button
                                                className="btn btn-block"
                                                style={{ backgroundColor: '#15803d', color: 'white' }}
                                                onClick={() => handleStatusChange(item.id, 'Resolved')}
                                                disabled={updating === item.id}
                                            >
                                                {updating === item.id ? 'Updating...' : 'Mark as Resolved'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: 'auto', paddingTop: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                            <em>Complaint resolved</em>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            <Footer />
        </>
    );
}
