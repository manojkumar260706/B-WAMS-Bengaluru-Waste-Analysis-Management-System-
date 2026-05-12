import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { DEFAULT_CENTER } from '../constants';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Helper to center map programmatically
function RecenterMap({ center }) {
    const map = useMap();
    React.useEffect(() => {
        if (center) {
            map.flyTo(center, 15);
        }
    }, [center, map]);
    return null;
}

function LocationPicker({ mapMarker, setMapMarker, setFormData }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            setMapMarker({ lat, lng });
            setFormData(prev => ({
                ...prev,
                location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
            }));
        },
    });

    return mapMarker ? <Marker position={mapMarker} /> : null;
}

export default function CitizenDashboard() {
    const { currentUser } = useAuth();

    const [formData, setFormData] = useState({
        location: '',
        wasteType: 'Mixed',
        quantity: 'Small',
        description: ''
    });
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Map State
    const [mapMarker, setMapMarker] = useState(null);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [submitted, setSubmitted] = useState(false);

    const wasteTypes = ['Plastic', 'Organic', 'Construction', 'Hazardous', 'Mixed'];
    const quantities = ['Small', 'Medium', 'Large'];

    function handleGeolocation() {
        if (!navigator.geolocation) {
            setMessage({ type: 'error', text: "Geolocation is not supported by your browser." });
            return;
        }

        setMessage({ type: '', text: 'Getting your location...' });

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const newPos = { lat: latitude, lng: longitude };

                setMapMarker(newPos);
                setMapCenter([latitude, longitude]);
                setFormData(prev => ({
                    ...prev,
                    location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                }));
                setMessage({ type: 'success', text: "Location pinned successfully!" });

                // Clear success message after 3 seconds
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            },
            (error) => {
                console.error("Geolocation error:", error);
                let errorMsg = "Location access denied. Please pin manually.";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMsg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMsg = "An unknown error occurred.";
                        break;
                }
                setMessage({ type: 'error', text: errorMsg });
            },
            options
        );
    }

    function handleImageChange(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    }

    function calculateSeverity(type, qty) {
        let typeScore = 1;
        if (type === 'Hazardous') typeScore = 3;
        if (type === 'Mixed' || type === 'Construction') typeScore = 2;

        let qtyScore = 1;
        if (qty === 'Large') qtyScore = 3;
        if (qty === 'Medium') qtyScore = 2;

        const total = typeScore + qtyScore;
        if (total >= 5) return 'High';
        if (total >= 3) return 'Medium';
        return 'Low';
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const severity = calculateSeverity(formData.wasteType, formData.quantity);

            let locData = {};
            if (mapMarker) {
                locData = { lat: mapMarker.lat, lng: mapMarker.lng };
            } else {
                // Try to parse string
                const parts = formData.location.split(',').map(s => s.trim());
                if (parts.length === 2) {
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        locData = { lat, lng };
                    } else {
                        throw new Error("Invalid location coordinates. Please use the map or enter 'lat, lng'");
                    }
                } else {
                    // Fallback for address-only inputs if we supported geocoding (we don't yet), 
                    // or just save it and warn. For now, enforcing coordinates for map to work.
                    throw new Error("Please pin a location on the map.");
                }
            }

            const complaintData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                location: locData, // Saved as object {lat, lng}
                address: formData.location, // Saved as string
                wasteType: formData.wasteType,
                quantity: formData.quantity,
                description: formData.description,
                severity: severity,
                status: 'Pending',
                createdAt: serverTimestamp()
            };

            // Add the document and get its ID
            const docRef = await addDoc(collection(db, 'complaints'), complaintData);
            const complaintId = docRef.id;


            // Manual Assignment Flow: Complaint is just saved as Pending.
            // setMessage({ type: 'success', text: 'Complaint submitted successfully! Admin will review and assign a worker.' });

            // Show Success UI
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setFormData({
                location: '',
                wasteType: 'Mixed',
                quantity: 'Small',
                description: ''
            });
            setImagePreview(null);
            setMapMarker(null);
        } catch (error) {
            console.error("Error submitting complaint:", error);
            setMessage({ type: 'error', text: error.message || 'Failed to submit complaint.' });
        }
        setLoading(false);
    }

    return (
        <>
            <Navbar />
            <div className="container">
                {/* Intro Section */}
                <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '700px', margin: '0 auto 40px' }} className="page-enter">
                    <h1 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Welcome to B-WAMS</h1>
                    <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: '1.6' }}>
                        Join the mission to keep Bengaluru clean. Use this platform to report waste accumulation,
                        illegal dumping, or irregular pickups in your neighborhood. Together, we make a difference.
                    </p>
                </div>

                <div className="card page-enter-delay-1" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '25px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>File a New Complaint</h2>
                        <p style={{ margin: '5px 0 0', color: '#64748b' }}>Fill in the details below to submit a report</p>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '20px',
                            backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                            color: message.type === 'error' ? '#b91c1c' : '#15803d',
                            border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                        }}>
                            {message.text}
                        </div>
                    )}

                    {submitted ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{
                                width: '60px', height: '60px', background: '#dcfce7', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                                color: '#15803d'
                            }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h3 style={{ color: '#15803d', marginBottom: '10px' }}>Complaint Submitted Successfully</h3>
                            <p style={{ color: '#475569', maxWidth: '400px', margin: '0 auto 30px' }}>
                                Thank you for your report. Our admin team has been notified and will assign a worker shortly.
                            </p>
                            <button className="btn" onClick={() => setSubmitted(false)}>File Another Complaint</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Map Section */}
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ margin: 0 }}>Location (Pin on Map)</label>
                                    <button
                                        type="button"
                                        onClick={handleGeolocation}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--primary-color)',
                                            fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                                        Use My Location
                                    </button>
                                </div>
                                <div className="map-hover-effect map-border" style={{ borderRadius: '0.5rem', overflow: 'hidden', height: '300px', marginBottom: '10px' }}>
                                    <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <RecenterMap center={mapCenter} />
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        />
                                        <LocationPicker mapMarker={mapMarker} setMapMarker={setMapMarker} setFormData={setFormData} />
                                    </MapContainer>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        readOnly={!!mapMarker}
                                        placeholder="Click on map or use 'Use My Location'"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        style={{ marginTop: '0', flex: 1 }}
                                    />
                                    {mapMarker && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 12px', fontSize: '0.8rem' }}
                                            onClick={() => {
                                                setMapMarker(null);
                                                setFormData(prev => ({ ...prev, location: '' }));
                                            }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {message.type === 'error' && message.text.includes("Location") && (
                                    <small style={{ color: '#dc2626', display: 'block', marginTop: '5px' }}>{message.text}</small>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Waste Type</label>
                                <select
                                    value={formData.wasteType}
                                    onChange={(e) => setFormData({ ...formData, wasteType: e.target.value })}
                                >
                                    {wasteTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Quantity Estimate</label>
                                <select
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                >
                                    {quantities.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Short Description</label>
                                <textarea
                                    rows="3"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the issue..."
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label>Upload Image</label>
                                <div style={{ border: '2px dashed #e2e8f0', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                        id="file-upload"
                                    />
                                    <label htmlFor="file-upload" style={{ cursor: 'pointer', color: 'var(--primary-color)', marginBottom: 0 }}>
                                        Click to upload image
                                    </label>
                                    {imagePreview && (
                                        <div style={{ marginTop: '15px' }}>
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button disabled={loading} type="submit" className="btn btn-block">
                                {loading ? 'Submitting...' : 'Submit Complaint'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}
