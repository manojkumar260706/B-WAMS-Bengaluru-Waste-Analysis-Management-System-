import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function Landing() {
    const location = useLocation();
    const mainRef = useRef(null);

    // Hash scroll
    useEffect(() => {
        if (location.hash) {
            const element = document.getElementById(location.hash.substring(1));
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location]);

    // Scroll-reveal observer
    useEffect(() => {
        const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        if (!revealEls.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar isLanding={true} />
            
            <main style={{ flexGrow: 1 }}>
                {/* HERO SECTION */}
                <section className="hero-section page-enter" id="home">
                    <div className="container">
                        <div className="hero-content">
                            <h1 className="hero-title">
                                Smarter Waste Management for a Cleaner Bengaluru
                            </h1>
                            <p className="hero-subtitle">
                                B-WAMS is an AI-powered platform that helps citizens report waste issues and enables authorities to respond faster through intelligent prioritization and real-time tracking.
                            </p>
                            <div className="hero-actions">
                                <Link to="/register" className="btn btn-primary btn-lg">
                                    Report Waste
                                </Link>
                                <Link to="/login" className="btn btn-secondary btn-lg">
                                    View Dashboard
                                </Link>
                            </div>

                            <div className="hero-stats-card card reveal-scale">
                                <h3>Active Reports</h3>
                                <p className="stats-total">1,248 Across Bengaluru</p>
                                <ul className="stats-list">
                                    <li><span className="badge badge-high">High Priority</span> — 312</li>
                                    <li><span className="badge badge-medium">Medium Priority</span> — 547</li>
                                    <li><span className="badge badge-low">Low Priority</span> — 389</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PROBLEM SECTION */}
                <section className="problem-section dark-section" id="problem">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>The Problem</h2>
                        </div>
                        <div className="icon-grid stagger-children">
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </div>
                                <h3>Rising Waste</h3>
                                <p>Rapid urbanization in Bengaluru has significantly increased solid waste generation across the city.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <h3>Reactive Systems</h3>
                                <p>Waste collection systems are mostly schedule-based and reactive instead of real-time.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                </div>
                                <h3>Health & Hygiene Risks</h3>
                                <p>Overflowing garbage and delayed cleanups create pollution, health risks, and poor urban hygiene.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                </div>
                                <h3>Lack of Visibility</h3>
                                <p>Municipal authorities lack real-time visibility and severity-based prioritization.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* HOW B-WAMS WORKS */}
                <section className="how-it-works-section" id="how-it-works">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>How B-WAMS Works</h2>
                        </div>
                        <div className="timeline-container stagger-children">
                            <div className="timeline-item reveal">
                                <div className="timeline-number">1</div>
                                <div>
                                    <h3>Report</h3>
                                    <p>Citizens upload waste complaints with image, location, and description.</p>
                                </div>
                            </div>
                            <div className="timeline-item reveal">
                                <div className="timeline-number">2</div>
                                <div>
                                    <h3>AI Analysis</h3>
                                    <p>AI analyzes uploaded images and text to determine issue severity.</p>
                                </div>
                            </div>
                            <div className="timeline-item reveal">
                                <div className="timeline-number">3</div>
                                <div>
                                    <h3>Prioritize</h3>
                                    <p>Complaints are categorized as High, Medium, or Low urgency.</p>
                                </div>
                            </div>
                            <div className="timeline-item reveal">
                                <div className="timeline-number">4</div>
                                <div>
                                    <h3>Action</h3>
                                    <p>Authorities view prioritized complaints and take action quickly.</p>
                                </div>
                            </div>
                            <div className="timeline-item reveal">
                                <div className="timeline-number">5</div>
                                <div>
                                    <h3>Resolve</h3>
                                    <p>Issues are tracked until marked as resolved.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES SECTION */}
                <section className="features-section dark-section" id="features">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>Platform Features</h2>
                        </div>
                        <div className="split-grid">
                            <div className="split-card reveal-left">
                                <h3>For Citizens</h3>
                                <ul className="feature-list">
                                    <li>Easy complaint submission with images and location</li>
                                    <li>Real-time complaint tracking</li>
                                    <li>Resolution status updates</li>
                                    <li>Cleaner community participation</li>
                                </ul>
                            </div>
                            <div className="split-card reveal-right">
                                <h3>For Authorities</h3>
                                <ul className="feature-list">
                                    <li>Priority-based complaint dashboard</li>
                                    <li>Pending and resolved issue tracking</li>
                                    <li>Faster response management</li>
                                    <li>Data-driven waste management decisions</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* TECH STACK SECTION */}
                <section className="tech-stack-section" id="technology">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>Built with Modern Technology</h2>
                        </div>
                        <div className="feature-grid stagger-children">
                            <div className="feature-card reveal">
                                <h3>React.js</h3>
                                <p>Modern and responsive frontend for a smooth user experience.</p>
                            </div>
                            <div className="feature-card reveal">
                                <h3>Node.js + Express.js</h3>
                                <p>Scalable backend APIs for complaint handling and real-time processing.</p>
                            </div>
                            <div className="feature-card reveal">
                                <h3>Gemini AI</h3>
                                <p>AI-powered image analysis for waste detection and severity assessment.</p>
                            </div>
                            <div className="feature-card reveal">
                                <h3>Firebase</h3>
                                <p>Secure OAuth authentication and cloud storage for application data.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI CAPABILITIES SECTION */}
                <section className="ai-capabilities-section dark-section" id="ai">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>AI-Powered Waste Analysis</h2>
                        </div>
                        <div className="icon-grid stagger-children">
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </div>
                                <h3>Image Analysis</h3>
                                <p>AI detects visible garbage accumulation from uploaded images.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4"></path><path d="M3.34 16A10 10 0 1 1 20.66 16"></path></svg>
                                </div>
                                <h3>Severity Detection</h3>
                                <p>Automatically classifies complaints as Low, Medium, or High priority.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <h3>Smart Summaries</h3>
                                <p>Generates concise summaries for municipal authorities.</p>
                            </div>
                            <div className="icon-item reveal">
                                <div className="icon-circle">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                </div>
                                <h3>Faster Decisions</h3>
                                <p>Helps authorities focus on the most critical waste issues first.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* WHY B-WAMS SECTION */}
                <section className="why-bwams-section">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>Why B-WAMS?</h2>
                        </div>
                        <div className="list-grid reveal">
                            <ul className="feature-list large-list">
                                <li>AI-powered waste severity detection</li>
                                <li>Real-time reporting and tracking</li>
                                <li>Faster municipal response</li>
                                <li>Better resource allocation</li>
                                <li>Cleaner and smarter cities</li>
                                <li>Scalable architecture for future expansion</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* FUTURE SCOPE SECTION */}
                <section className="future-scope-section dark-section">
                    <div className="container">
                        <div className="section-header reveal">
                            <h2>Future Enhancements</h2>
                        </div>
                        <div className="list-grid reveal">
                            <ul className="feature-list large-list">
                                <li>Smart route optimization for garbage trucks</li>
                                <li>IoT-enabled smart bin integration</li>
                                <li>City-wide municipal deployment</li>
                                <li>Multi-language citizen support</li>
                                <li>Predictive waste analytics</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* FINAL CTA SECTION */}
                <section className="final-cta-section">
                    <div className="container text-center reveal-scale">
                        <h2>Together, We Can Build a Cleaner Bengaluru</h2>
                        <p>Your report can make a real difference in creating a smarter, healthier, and cleaner city.</p>
                        <Link to="/register" className="btn btn-primary btn-lg" style={{ marginTop: '20px' }}>
                            Report Waste Now
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
