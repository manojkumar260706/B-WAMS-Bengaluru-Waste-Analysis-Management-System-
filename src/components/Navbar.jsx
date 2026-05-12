import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { MAP_PLACEHOLDER_IMAGE } from '../constants';

// Simple profile modal
function ProfileModal({ user, role, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>User Profile</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', background: '#e2e8f0', borderRadius: '50%',
                        margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', color: '#64748b'
                    }}>
                        {user.email[0].toUpperCase()}
                    </div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{user.email}</p>
                    <span className={`badge badge-${role === 'admin' ? 'high' : (role === 'worker' ? 'medium' : 'low')}`} style={{ marginTop: '5px' }}>
                        {role ? role.toUpperCase() : 'USER'}
                    </span>
                </div>
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Member since: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
}

// Complaint List Modal (Reused for both Citizen History and Admin Resolved)
function ComplaintListModal({ title, userId, statusFilter, onClose }) {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                let q;
                const complaintsRef = collection(db, 'complaints');

                if (userId) {
                    // Citizen: Own complaints
                    q = query(complaintsRef, where("userId", "==", userId));
                } else if (statusFilter) {
                    // Admin: Resolved complaints
                    q = query(complaintsRef, where("status", "==", statusFilter));
                } else {
                    return;
                }

                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Client-side sort by date desc for simplicity (composite index might be needed for server sort)
                data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                setComplaints(data);
            } catch (error) {
                console.error("Error fetching complaints", error);
            }
            setLoading(false);
        }
        fetchData();
    }, [userId, statusFilter]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                </div>

                {loading ? <div style={{ textAlign: 'center' }}>Loading...</div> : (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Date</th>
                                    <th style={{ padding: '10px' }}>Type</th>
                                    <th style={{ padding: '10px' }}>Status</th>
                                    <th style={{ padding: '10px' }}>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {complaints.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No records found.</td></tr>
                                ) : (
                                    complaints.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '10px' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                                            <td style={{ padding: '10px' }}>{c.wasteType}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span className={`badge badge-${c.status === 'Resolved' ? 'low' : 'medium'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {typeof c.location === 'object'
                                                    ? `${c.location.lat.toFixed(6)}, ${c.location.lng.toFixed(6)}`
                                                    : c.location}
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
    );
}

export default function Navbar({ showUserMenu = true, customMenuItems = [], isLanding = false }) {
    const { currentUser, userRole, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showResolved, setShowResolved] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <>
            <nav className="navbar">
                <div className="navbar-row">
                    <Link to="/" className="navbar-brand">
                        {/* Logo */}
                        <img src="/logo.png" alt="Logo" className="navbar-logo" />
                        <span>B-WAMS</span>
                    </Link>

                    {isLanding && (
                        <div className="landing-nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <a href="#home" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Home</a>
                            <a href="#features" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Features</a>
                            <a href="#how-it-works" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>How It Works</a>
                            <a href="#technology" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Technology</a>
                            <a href="/login" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Dashboard</a>
                            <a href="#contact" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Contact</a>
                            <a href="/register" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Report Waste</a>
                        </div>
                    )}

                    {showUserMenu && currentUser && (
                        <div className="nav-actions">
                            <div className="user-menu">
                                <button
                                    className="menu-trigger"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    title="Account Menu"
                                >
                                    {/* Home Icon as requested (using SVG) */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                </button>

                                <div className={`dropdown-menu ${isDropdownOpen ? 'active' : ''}`}>
                                    <button className="dropdown-item" onClick={() => { setShowProfile(true); setIsDropdownOpen(false); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        View Profile
                                    </button>

                                    {/* Citizen: Your Complaints */}
                                    {userRole === 'citizen' && (
                                        <button className="dropdown-item" onClick={() => { setShowHistory(true); setIsDropdownOpen(false); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            Your Complaints
                                        </button>
                                    )}

                                    {/* Admin: Resolved Complaints */}
                                    {userRole === 'admin' && (
                                        <button className="dropdown-item" onClick={() => { setShowResolved(true); setIsDropdownOpen(false); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                                            Resolved Complaints
                                        </button>
                                    )}

                                    {/* Custom Menu Items (e.g. Worker Route Config) */}
                                    {customMenuItems && customMenuItems.map((item, index) => (
                                        <React.Fragment key={index}>{item}</React.Fragment>
                                    ))}

                                    <button className="dropdown-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Marquee Section */}
                <div className="marquee-container">
                    <div className="marquee-text">
                        Welcome to B-WAMS: Bengaluru Waste Analytics & Management System • Empowering Citizens for a Cleaner City • Report Waste • Track Status • Be a Change Maker • Contact Helpers: +91 999-888-7777 •
                    </div>
                </div>
            </nav>

            {showProfile && (
                <ProfileModal
                    user={currentUser}
                    role={userRole}
                    onClose={() => setShowProfile(false)}
                />
            )}

            {showHistory && currentUser && (
                <ComplaintListModal
                    title="Your Complaint History"
                    userId={currentUser.uid}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {showResolved && (
                <ComplaintListModal
                    title="Resolved Complaints Archive"
                    statusFilter="Resolved"
                    onClose={() => setShowResolved(false)}
                />
            )}
        </>
    );
}
