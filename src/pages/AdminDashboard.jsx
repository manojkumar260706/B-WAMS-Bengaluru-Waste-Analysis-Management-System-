import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to center map bounds
function MapBounds({ markers }) {
    const map = useMap();
    useEffect(() => {
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [markers, map]);
    return null;
}

// Helper: Calculate distance from Point P(pLat, pLng) to Segment AB(aLat, aLng, bLat, bLng)
// Returns distance in meters (approx using planar projection, sufficient for local cities)
function distancePointToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
    const R = 6371e3; // Earth radius in meters
    const x = (pLng - aLng) * Math.cos((aLat + pLat) / 2 * Math.PI / 180);
    const y = pLat - aLat;

    // Project P onto line AB to find closest point
    const dx = bLng - aLng;
    const dy = bLat - aLat;
    const lenSq = dx * dx + dy * dy;

    let t = lenSq === 0 ? -1 : ((pLng - aLng) * dx + (pLat - aLat) * dy) / lenSq;

    // Clamp t to segment [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Closest point coordinates (approx)
    const closestLng = aLng + t * dx;
    const closestLat = aLat + t * dy;

    // Euclidean distance from P to Closest Point
    const dLat = (pLat - closestLat) * Math.PI / 180;
    const dLng = (pLng - closestLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(closestLat * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// HQ Icon
const hqIcon = new L.Icon({
    iconUrl: 'https://img.icons8.com/isometric/50/building.png', // distinct building icon
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
});

// Component to handle map clicks for adding HQ
function MapClickHandler({ isAddingHQ, onLocationSelect }) {
    useMapEvents({
        click(e) {
            if (isAddingHQ) {
                onLocationSelect(e.latlng);
            }
        },
    });
    return null;
}

// Worker List Modal
function WorkerListModal({ workers, headquarters, onClose }) {
    const hqMap = {};
    headquarters.forEach(hq => hqMap[hq.id] = hq.name);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>Worker Routes</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Email</th>
                                <th style={{ padding: '10px' }}>Route Start</th>
                                <th style={{ padding: '10px' }}>Route End</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workers.length === 0 ? (
                                <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No workers found.</td></tr>
                            ) : (
                                workers.map(w => (
                                    <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '10px' }}>{w.name || 'N/A'}</td>
                                        <td style={{ padding: '10px' }}>{w.email}</td>
                                        <td style={{ padding: '10px' }}>
                                            {w.route?.fromHQ ? (hqMap[w.route.fromHQ] || w.route.fromHQ) : <span style={{ color: '#94a3b8' }}>Not Configured</span>}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {w.route?.toHQ ? (hqMap[w.route.toHQ] || w.route.toHQ) : <span style={{ color: '#94a3b8' }}>Not Configured</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const { logout } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc');

    // HQ State
    const [headquarters, setHeadquarters] = useState([]);
    const [isAddingHQ, setIsAddingHQ] = useState(false);
    const [showWorkerList, setShowWorkerList] = useState(false); // New state for modal

    const severityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };

    // Custom Icons based on severity
    const icons = {
        High: new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        Medium: new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        Low: new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        }),
        Default: new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    };


    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        const unsubscribeComplaints = fetchComplaints();
        const unsubscribeHQs = fetchHeadquarters();
        fetchWorkers();

        return () => {
            if (unsubscribeComplaints) unsubscribeComplaints();
            if (unsubscribeHQs) unsubscribeHQs();
        }
    }, []);

    // Fetch HQs (Real-time)
    function fetchHeadquarters() {
        const q = query(collection(db, "headquarters"), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHeadquarters(data);
        });
    }

    // Add HQ Logic
    const handleAddHQ = async (latlng) => {
        const name = prompt("Enter Headquarters Name (e.g., North Depot):");
        if (!name) return;

        try {
            await addDoc(collection(db, "headquarters"), {
                name: name,
                location: { lat: latlng.lat, lng: latlng.lng },
                createdAt: serverTimestamp()
            });
            alert("Headquarters added successfully!");
            setIsAddingHQ(false); // Exit mode
        } catch (error) {
            console.error("Error adding HQ:", error);
            alert("Failed to add HQ.");
        }
    };

    // Delete HQ Logic
    const handleDeleteHQ = async (id) => {
        if (window.confirm("Are you sure you want to delete this Headquarters?")) {
            try {
                await deleteDoc(doc(db, "headquarters", id));
            } catch (error) {
                console.error("Error deleting HQ:", error);
                alert("Failed to delete.");
            }
        }
    }


    async function fetchWorkers() {
        try {
            const q = query(collection(db, "users"), where("role", "==", "worker"));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setWorkers(data);
        } catch (error) {
            console.error("Error fetching workers:", error);
        }
    }

    async function handleAssign(complaintId, workerId) {
        if (!workerId) return;
        try {
            const worker = workers.find(w => w.id === workerId);
            const complaintRef = doc(db, "complaints", complaintId);
            await updateDoc(complaintRef, {
                assignedTo: workerId,
                assignedName: worker.name || worker.email, // Denormalize name for display
                status: 'In Progress',
                assignedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Assignment failed:", error);
            alert("Failed to assign worker.");
        }
    }

    function fetchComplaints() {
        setLoading(true);
        const q = query(collection(db, "complaints"), orderBy("createdAt", "desc"));
        // Switch to onSnapshot for live complaints
        return onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setComplaints(data);
            setLoading(false);
        });
    }

    // Auto-Assignment Logic
    const autoAssignTasks = async () => {
        if (!confirm("This will automatically assign PENDING tasks to the closest worker based on their planned route. Proceed?")) return;

        // 1. Get Workers with Routes
        const validWorkers = workers.filter(w => w.route && w.route.fromHQ && w.route.toHQ);
        if (validWorkers.length === 0) {
            alert("No workers have valid routes configured.");
            return;
        }

        // 2. Resolve HQs
        const hqMap = {};
        headquarters.forEach(hq => hqMap[hq.id] = hq.location);

        let assignedCount = 0;

        // 3. Iterate Pending Complaints
        const pendingComplaints = complaints.filter(c => c.status === 'Pending');

        for (let task of pendingComplaints) {
            let taskLat, taskLng;

            // Normalize location
            if (typeof task.location === 'object' && task.location.lat) {
                taskLat = task.location.lat;
                taskLng = task.location.lng;
            } else if (typeof task.location === 'string') {
                const parts = task.location.split(',');
                if (parts.length === 2) {
                    taskLat = parseFloat(parts[0]);
                    taskLng = parseFloat(parts[1]);
                }
            }

            if (!taskLat || !taskLng) continue;

            let closestWorker = null;
            let minDistance = Infinity;

            for (let worker of validWorkers) {
                const startLoc = hqMap[worker.route.fromHQ];
                const endLoc = hqMap[worker.route.toHQ];

                if (!startLoc || !endLoc) continue;

                const dist = distancePointToSegment(
                    taskLat, taskLng,
                    startLoc.lat, startLoc.lng,
                    endLoc.lat, endLoc.lng
                );

                if (dist < minDistance) {
                    minDistance = dist;
                    closestWorker = worker;
                }
            }

            if (closestWorker) {
                try {
                    // Update Firestore
                    await updateDoc(doc(db, "complaints", task.id), {
                        assignedTo: closestWorker.id,
                        assignedName: closestWorker.name || closestWorker.email,
                        status: 'Assigned', // Or 'In Progress' if you prefer immediate active status
                        assignmentType: 'Auto-Proximity',
                        assignedAt: serverTimestamp()
                    });
                    assignedCount++;
                } catch (e) { console.error("Auto assign error", e); }
            }
        }

        alert(`Auto-assigned ${assignedCount} tasks.`);
    };

    const sortedComplaints = [...complaints].sort((a, b) => {
        const weightA = severityWeight[a.severity] || 0;
        const weightB = severityWeight[b.severity] || 0;

        if (sortOrder === 'desc') {
            return weightB - weightA;
        } else {
            return weightA - weightB;
        }
    });

    const menuItems = [
        <button
            className="dropdown-item"
            onClick={() => setIsAddingHQ(!isAddingHQ)}
            style={{ color: isAddingHQ ? '#ef4444' : 'var(--text-primary)' }}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            {isAddingHQ ? "Cancel Adding HQ" : "Add Headquarters"}
        </button>,
        <button
            className="dropdown-item"
            onClick={() => setShowWorkerList(true)}
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            View Worker Routes
        </button>
    ];

    return (
        <>
            <Navbar customMenuItems={menuItems} />
            <div className="container">
                <div className="dashboard-header page-enter">
                    <div>
                        <h2>Admin Portal</h2>
                        <p>Manage and track waste complaints</p>
                    </div>
                    <div>
                        <button
                            className="btn"
                            onClick={autoAssignTasks}
                            style={{ backgroundColor: 'black', color: 'white' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Auto-Assign Tasks
                        </button>
                    </div>
                </div>


                {/* Map View */}
                <div className="card map-border page-enter-delay-1" style={{ padding: '0', overflow: 'hidden', marginBottom: '30px', height: '400px', position: 'relative' }}>
                    {isAddingHQ && (
                        <div style={{
                            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
                            background: 'rgba(255,255,255,0.95)', padding: '10px 20px', textAlign: 'center',
                            borderRadius: '30px', border: '2px solid #2563eb', color: '#2563eb', fontWeight: 'bold',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            📍 Click on the map to place a new Headquarters
                        </div>
                    )}

                    {!loading && (
                        <MapContainer center={[12.9716, 77.5946]} zoom={11} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />

                            <MapClickHandler isAddingHQ={isAddingHQ} onLocationSelect={handleAddHQ} />

                            {/* Filter valid locations and map */}
                            {(() => {
                                const validMarkers = complaints.reduce((acc, c) => {
                                    let lat, lng;
                                    if (typeof c.location === 'object' && c.location.lat) {
                                        lat = c.location.lat;
                                        lng = c.location.lng;
                                    } else if (typeof c.location === 'string') {
                                        const parts = c.location.split(',');
                                        if (parts.length === 2) {
                                            lat = parseFloat(parts[0]);
                                            lng = parseFloat(parts[1]);
                                        }
                                    }

                                    if (lat && lng && !isNaN(lat) && !isNaN(lng) && c.status !== 'Resolved') {
                                        acc.push({ ...c, lat, lng });
                                    }
                                    return acc;
                                }, []);

                                return (
                                    <>
                                        {/* Only auto-fit bounds if we have markers and NOT adding HQ (to prevent jumping while clicking) */}
                                        {!isAddingHQ && <MapBounds markers={validMarkers} />}

                                        {validMarkers.map(c => (
                                            <Marker
                                                key={c.id}
                                                position={[c.lat, c.lng]}
                                                icon={icons[c.severity] || icons.Default}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: '150px' }}>
                                                        <strong style={{ color: 'var(--primary-color)' }}>{c.wasteType} ({c.severity})</strong>
                                                        <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>{c.description}</p>
                                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                            Status: <b>{c.status}</b><br />
                                                            Worker: {c.assignedName || 'Unassigned'}
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </>
                                );
                            })()}

                            {/* HQ Markers */}
                            {headquarters.map(hq => (
                                <Marker key={hq.id} position={[hq.location.lat, hq.location.lng]} icon={hqIcon}>
                                    <Popup>
                                        <strong>{hq.name}</strong><br />
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>Headquarters</span><br />
                                        <button
                                            style={{ color: 'white', background: '#ef4444', padding: '4px 8px', borderRadius: '4px', border: 'none', marginTop: '5px', cursor: 'pointer', fontSize: '0.8rem' }}
                                            onClick={() => handleDeleteHQ(hq.id)}
                                        >
                                            Delete HQ
                                        </button>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    )}
                </div>

                <div className="card page-enter-delay-2" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent Complaints</h3>
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        >
                            Sort: {sortOrder === 'desc' ? 'High Priority' : 'Low Priority'}
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading data...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Location</th>
                                        <th>Waste</th>
                                        <th>Qty</th>
                                        <th>Severity</th>
                                        <th>Description</th>
                                        <th>Status</th>
                                        <th>Assigned To</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedComplaints.length === 0 ? (
                                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>No complaints found.</td></tr>
                                    ) : (
                                        sortedComplaints.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {typeof item.location === 'object'
                                                        ? `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`
                                                        : item.location}
                                                </td>
                                                <td>{item.wasteType}</td>
                                                <td>{item.quantity}</td>
                                                <td>
                                                    <span className={`badge badge-${item.severity?.toLowerCase()}`}>
                                                        {item.severity}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: '250px' }}>{item.description}</td>
                                                <td>
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.status}</span>
                                                    {item.assignmentType === 'Auto-Proximity' && <span style={{ display: 'block', fontSize: '0.7em', color: '#2563eb' }}>Auto-Assigned</span>}
                                                </td>
                                                <td>
                                                    {item.status === 'Resolved' ? (
                                                        <span className="badge badge-low">Resolved by {item.assignedName || 'Worker'}</span>
                                                    ) : (
                                                        <select
                                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '130px' }}
                                                            value={item.assignedTo || ""}
                                                            onChange={(e) => handleAssign(item.id, e.target.value)}
                                                            disabled={item.status === 'Resolved'}
                                                        >
                                                            <option value="" disabled>Assign Worker</option>
                                                            {workers.map(w => (
                                                                <option key={w.id} value={w.id}>{w.name || w.email}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.createdAt?.toDate
                                                        ? item.createdAt.toDate().toLocaleDateString()
                                                        : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A')}
                                                </td>
                                                <td>
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${typeof item.location === 'object'
                                                            ? `${item.location.lat},${item.location.lng}`
                                                            : encodeURIComponent(item.location)
                                                            }`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}
                                                    >
                                                        View Map
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            {showWorkerList && (
                <WorkerListModal
                    workers={workers}
                    headquarters={headquarters}
                    onClose={() => setShowWorkerList(false)}
                />
            )}
            <Footer />
        </>
    );
}
