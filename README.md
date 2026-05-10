<div align="center">

<h1 align="center">
  ♻️ B-WAMS
</h1>

<h3 align="center">
  Bengaluru Waste Analytics & Management System
</h3>

<p align="center">
  AI-powered civic platform for smarter waste management in Bengaluru.
</p>

<p align="center">
  <a href="https://b-wams.web.app">
    <img src="https://img.shields.io/badge/🚀_Launch_B--WAMS-0d1117?style=for-the-badge" />
  </a>
</p>

<!-- <p align="center">
  <img src="https://skillicons.dev/icons?i=react,nodejs,express,firebase,vite" />
</p> -->

<p align="center">
  React • Node.js • Express • Firebase • Gemini AI 
</p>

</div>

---

![B-WAMS Hero Screenshot](screenshots/hero.png)

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Setup & Installation (Windows)](#-setup--installation-windows)
- [Running the Application](#-running-the-application)
- [Deployment](#-deployment)
- [User Roles](#-user-roles)
- [Screenshots](#-screenshots)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 📖 About

**B-WAMS** is a full-stack web application designed to bridge the gap between citizens and municipal authorities in Bengaluru. Citizens can report waste issues by pinning locations on an interactive map, uploading images, and providing descriptions. The system uses **AI-powered analysis (Gemini)** to automatically classify complaint severity, and an intelligent routing algorithm to assign tasks to the nearest available field worker.

![B-WAMS Problem Section](screenshots/problem.png)

---

## ✨ Features

### For Citizens
- 📍 **Map-based Reporting** — Drop a pin on an interactive Leaflet map to report waste with exact GPS coordinates.
- 📸 **Image Upload** — Attach photos of waste issues for visual evidence.
- 📊 **Real-time Tracking** — Monitor complaint status from *Pending* → *Assigned* → *Resolved*.
- 📜 **Complaint History** — View all past reports and their resolution status.

### For Workers
- 🗺️ **Route Configuration** — Configure patrol routes using Headquarters IDs.
- 🧭 **OSRM Routing** — View optimized routes on the map with turn-by-turn directions.
- ✅ **Task Management** — Accept, update, and resolve assigned complaints.

### For Administrators
- 🎯 **Auto-Assignment** — Intelligent algorithm assigns complaints to the nearest worker based on route proximity.
- 🏢 **HQ Management** — Create, edit, and manage Headquarters (collection points).
- 📈 **Dashboard Overview** — View all pending, assigned, and resolved complaints at a glance.
- 🔄 **Manual Override** — Reassign tasks and manage worker-complaint mappings.

### AI-Powered Analysis
- 🤖 **Image Analysis** — Gemini AI detects garbage accumulation from uploaded images.
- ⚡ **Severity Detection** — Automatically classifies complaints as High, Medium, or Low priority.
- 📝 **Smart Summaries** — Generates concise descriptions for authorities.

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|:-------------|:------------------------------------|
| **Frontend** | React 19, Vite, React Router v7     |
| **Maps**     | Leaflet, React-Leaflet, OSRM       |
| **Backend**  | Node.js, Express.js                 |
| **Database** | Firebase Firestore                  |
| **Auth**     | Firebase Authentication (OAuth)     |
| **AI**       | Google Gemini AI                    |
| **Hosting**  | Firebase Hosting                    |
| **Styling**  | Vanilla CSS (Custom Design System)  |

---

## 📂 Project Structure

```
B-WAMS/
├── public/                  # Static assets (logos, map backgrounds, icons)
│   ├── bg-map.png
│   ├── logo.png
│   └── ...
├── server/                  # Backend API service
│   ├── index.js             # Express server with /assign-task endpoint
│   ├── package.json
│   └── .env
├── src/                     # React frontend source
│   ├── components/
│   │   ├── Navbar.jsx       # Navigation bar with role-based menus
│   │   └── Footer.jsx       # Site-wide footer
│   ├── contexts/
│   │   └── AuthContext.jsx  # Firebase auth provider & session management
│   ├── pages/
│   │   ├── Landing.jsx      # Public landing page
│   │   ├── Login.jsx        # Sign-in page
│   │   ├── Register.jsx     # Sign-up page
│   │   ├── CitizenDashboard.jsx   # Citizen complaint submission
│   │   ├── WorkerDashboard.jsx    # Worker route & task management
│   │   └── AdminDashboard.jsx     # Admin oversight & auto-assignment
│   ├── firebase.js          # Firebase config & initialization
│   ├── constants.js         # Shared constants (map center, etc.)
│   ├── App.jsx              # Root component with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles & design system
├── firebase.json            # Firebase Hosting configuration
├── package.json             # Frontend dependencies
└── README.md
```

---

## ✅ Prerequisites

Before you begin, ensure you have the following installed on your **Windows** machine:

| Requirement  | Version  | Check Command          |
|:-------------|:---------|:-----------------------|
| **Node.js**  | ≥ 18.x   | `node --version`       |
| **npm**      | ≥ 9.x    | `npm --version`        |
| **Git**      | Latest   | `git --version`        |

> 💡 Download Node.js from [https://nodejs.org](https://nodejs.org) (LTS version recommended).

---

## 🚀 Setup & Installation (Windows)

### 1. Clone the Repository

Open **PowerShell** or **Command Prompt** and run:

```bash
git clone https://github.com/manojkumar260706/B-WAMS-Bengaluru-Waste-Analysis-Management-System-.git
cd B-WAMS-Bengaluru-Waste-Analysis-Management-System-
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### 4. Configure Firebase

The Firebase configuration is located in `src/firebase.js`. If you are forking this project, replace the config object with your own Firebase project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 5. Configure Backend Environment

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
```

### 6. Set Up Firestore Security Rules

In the [Firebase Console](https://console.firebase.google.com), navigate to **Firestore → Rules** and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /complaints/{complaintId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    match /headquarters/{hqId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## ▶️ Running the Application

### Start the Frontend (Terminal 1)

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

### Start the Backend (Terminal 2)

```bash
cd server
npm run dev
```

The API server will start on **http://localhost:5000**

> ⚠️ **Note:** Both the frontend and backend must be running simultaneously for full functionality (e.g., auto-assignment requires the backend).

---

## 🌐 Deployment

The frontend is deployed on **Firebase Hosting**.

### Deploy Steps

```bash
# 1. Install Firebase CLI (one-time)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Build for production
npm run build

# 4. Deploy
firebase deploy --only hosting
```

**Live URL:** [https://b-wams.web.app](https://b-wams.web.app)

---

## 👤 User Roles

B-WAMS uses a role-based access control system. Roles are assigned during registration based on the email domain:

| Role       | Email Pattern            | Access                            |
|:-----------|:-------------------------|:----------------------------------|
| **Citizen**| Any standard email       | Report waste, track complaints    |
| **Worker** | `*@bwams.worker`         | View assigned tasks, manage routes|
| **Admin**  | `*@bwams.admin`          | Full dashboard, auto-assignment   |

---

## 📸 Screenshots

<details>
<summary><b>🏠 Landing Page</b></summary>
<br>
<img src="screenshots/hero.png" alt="Landing Page Hero" width="100%">
</details>

<details>
<summary><b>⚠️ Problem Section</b></summary>
<br>
<img src="screenshots/problem.png" alt="Problem Section" width="100%">
</details>

---

## 🔮 Future Enhancements

- 🚛 **Smart Route Optimization** — Optimized garbage truck routing using graph algorithms.
- 🗑️ **IoT Smart Bins** — Integration with sensor-equipped bins for fill-level monitoring.
- 🌍 **City-wide Deployment** — Scale to cover all BBMP zones and wards.
- 🌐 **Multi-language Support** — Kannada, Hindi, and English interfaces.
- 📊 **Predictive Analytics** — ML-based waste generation forecasting.

---

## 📄 License

This project is developed for educational and civic purposes.

---

<div align="center">

**Built with ❤️ for a cleaner Bengaluru**

[Live Demo](https://b-wams.web.app) · [Report Bug](https://github.com/manojkumar260706/B-WAMS-Bengaluru-Waste-Analysis-Management-System-/issues) · [Request Feature](https://github.com/manojkumar260706/B-WAMS-Bengaluru-Waste-Analysis-Management-System-/issues)

</div>
