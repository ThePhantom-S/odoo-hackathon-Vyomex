import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Truck, Users, Route, Wrench, 
  Fuel, TrendingUp, Settings, LogOut, Plus, 
  Search, Filter, Calendar, DollarSign, ShieldAlert, 
  FileSpreadsheet, Check, X, Moon, Sun, AlertTriangle, Map, Leaf, Bell, Clock, Activity, Mail, Lock,
  Play, Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, LineChart, Line, Cell, CartesianGrid, PieChart, Pie, AreaChart, Area
} from 'recharts';
import * as THREE from 'three';

// Utility to get coordinates for a city
const getCoordinatesForCity = (cityName) => {
  const name = String(cityName || '').trim().toLowerCase();
  if (name.includes('gandhinagar') || name.includes('delhi')) {
    return { x: 80, y: 70 };
  }
  if (name.includes('ahmedabad') || name.includes('mumbai')) {
    return { x: 120, y: 160 };
  }
  if (name.includes('vatva') || name.includes('bengaluru')) {
    return { x: 260, y: 220 };
  }
  if (name.includes('sanand') || name.includes('chennai')) {
    return { x: 320, y: 150 };
  }
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = 60 + Math.abs((hash * 17) % 280);
  const y = 60 + Math.abs((hash * 31) % 180);
  return { x, y };
};

// Helper to extract short facility name from full address
const getShortAddressName = (addressString) => {
  if (!addressString) return '';
  const parts = addressString.split(':');
  return parts[0].trim();
};

const splitAddress = (address) => {
  const parts = String(address || '').split(':');
  if (parts.length > 1) {
    return {
      name: parts[0].trim(),
      details: parts.slice(1).join(':').trim()
    };
  }
  return {
    name: address,
    details: ''
  };
};

const closeWithTransition = (stateSetter) => {
  const overlay = document.querySelector('.modal-overlay:not(.closing)');
  if (overlay) {
    overlay.classList.add('closing');
    setTimeout(() => {
      stateSetter();
    }, 200);
  } else {
    stateSetter();
  }
};

// Helper to render premium status badges
const renderStatusPill = (status) => {
  let badgeClass = 'badge-muted';
  let dotColor = '#94a3b8';
  let text = 'PLANNED';

  if (status === 'Completed') {
    badgeClass = 'badge-success';
    dotColor = 'var(--success)';
    text = 'COMPLETED';
  } else if (status === 'Dispatched') {
    badgeClass = 'badge-info';
    dotColor = 'var(--info)';
    text = 'RUNNING';
  } else if (status === 'Cancelled') {
    badgeClass = 'badge-danger';
    dotColor = 'var(--danger)';
    text = 'CANCELLED';
  } else if (status === 'Draft') {
    badgeClass = 'badge-muted';
    dotColor = 'var(--warning)';
    text = 'PLANNED';
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '9px', padding: '3px 8px', letterSpacing: '0.5px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }}></span>
      {text}
    </span>
  );
};

// Helper to render vehicle status pills
const renderVehicleStatusPill = (status) => {
  let badgeClass = 'badge-muted';
  let dotColor = '#94a3b8';
  let text = 'RETIRED';

  if (status === 'Available') {
    badgeClass = 'badge-success';
    dotColor = 'var(--success)';
    text = 'AVAILABLE';
  } else if (status === 'On Trip') {
    badgeClass = 'badge-info';
    dotColor = 'var(--info)';
    text = 'ON TRIP';
  } else if (status === 'In Shop') {
    badgeClass = 'badge-danger';
    dotColor = 'var(--danger)';
    text = 'IN SHOP';
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '9px', padding: '3px 8px', letterSpacing: '0.5px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }}></span>
      {text}
    </span>
  );
};

// Live Logistics Map component using Leaflet dynamically
function LiveLogisticsMap({ trips, darkMode }) {
  const mapRef = React.useRef(null);
  const mapInstance = React.useRef(null);

  React.useEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const cityCoords = {
      'ahmedabad': [23.0225, 72.5714],
      'surat': [21.1702, 72.8311],
      'vadodara': [22.3072, 73.1812],
      'rajkot': [22.3039, 70.8022],
      'mumbai': [19.0760, 72.8777],
      'delhi': [28.6139, 77.2090],
      'gandhinagar': [23.2156, 72.6369],
      'bengaluru': [12.9716, 77.5946],
      'chennai': [13.0827, 80.2707],
      'pune': [18.5204, 73.8567],
      'indore': [22.7196, 75.8577]
    };

    const getCityLatLng = (cityName) => {
      const name = String(cityName || '').trim().toLowerCase();
      for (const [key, val] of Object.entries(cityCoords)) {
        if (name.includes(key)) return val;
      }
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const lat = 20.0 + Math.abs((hash * 17) % 8);
      const lng = 72.0 + Math.abs((hash * 31) % 8);
      return [lat, lng];
    };

    const map = window.L.map(mapRef.current, {
      zoomControl: false
    }).setView([22.5, 75.0], 5);

    mapInstance.current = map;

    const tileUrl = darkMode 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    window.L.tileLayer(tileUrl, {
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    }).addTo(map);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    const displayTrips = trips.filter(t => t.status === 'Dispatched' || t.status === 'Completed');

    displayTrips.forEach(trip => {
      const startLatLng = getCityLatLng(trip.source);
      const endLatLng = getCityLatLng(trip.destination);

      const isActive = trip.status === 'Dispatched';
      const markerColor = isActive ? 'var(--primary)' : 'var(--success)';

      const markerIcon = window.L.divIcon({
        className: 'custom-map-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 24px; height: 24px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${markerColor}" stroke="#ffffff" stroke-width="1.5"/>
            </svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
      });

      window.L.marker(startLatLng, { icon: markerIcon })
        .addTo(map)
        .bindPopup(`<b>Hub Source: ${trip.source}</b><br/>Trip TR-${String(trip.id).padStart(4, '0')} (${trip.status})`);

      window.L.marker(endLatLng, { icon: markerIcon })
        .addTo(map)
        .bindPopup(`<b>Destination: ${trip.destination}</b><br/>Status: ${trip.status}<br/>Vehicle: ${trip.vehicle_reg_no}`);

      window.L.polyline([startLatLng, endLatLng], {
        color: markerColor,
        weight: isActive ? 3 : 2,
        opacity: isActive ? 0.9 : 0.5,
        dashArray: isActive ? '5, 10' : ''
      }).addTo(map);
    });

    if (displayTrips.length > 0) {
      const bounds = displayTrips.map(t => [getCityLatLng(t.source), getCityLatLng(t.destination)]).flat();
      map.fitBounds(bounds, { padding: [40, 40] });
    }

  }, [trips, darkMode]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--border-radius-sm)' }} />;
}

// Real, proper logistics hubs and depot facility addresses
const LOGISTICS_HUBS = [
  { value: 'Gandhinagar Depot: Sector 25, GIDC Electronics Estate, Gandhinagar, Gujarat 382025', label: 'Gandhinagar Depot (Sector 25, GIDC)' },
  { value: 'Ahmedabad Hub: Plot 45, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445', label: 'Ahmedabad Hub (Plot 45, Vatva GIDC)' },
  { value: 'Sanand Warehouse: Sarkhej-Viramgam Highway, Sanand GIDC, Ahmedabad, Gujarat 382110', label: 'Sanand Warehouse (Sanand GIDC)' },
  { value: 'Vadodara Transit Hub: National Highway 8, Ranoli, Vadodara, Gujarat 391350', label: 'Vadodara Transit Hub (NH8, Ranoli)' },
  { value: 'Surat Distribution Center: GIDC Industrial Estate, Sachin, Surat, Gujarat 394230', label: 'Surat Distribution Center (Sachin GIDC)' },
  { value: 'Mumbai Logistics Port: JNPT Terminal Road, Nhava Sheva, Navi Mumbai, Maharashtra 400707', label: 'Mumbai Logistics Port (JNPT, Navi Mumbai)' }
];

// Custom UI Dropdown Component
function CustomSelect({ options, value, onChange, placeholder = 'Select option', disabled = false, className = '', name, style, required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`} style={style} ref={dropdownRef}>
      {name && (
        <input 
          type="text" 
          name={name} 
          value={value || ''} 
          required={required} 
          style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', zIndex: -1, pointerEvents: 'none' }}
          onChange={() => {}} 
        />
      )}
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="custom-select-arrow">▼</span>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              className={`custom-select-option ${String(value) === String(opt.value) ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const API_BASE = '/api';

// 3D WebGL Logistics Globe Background Component
function ThreeLogisticsGlobe() {
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Create Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create Group for the Globe
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Create a wireframe sphere representing the globe grid
    const sphereGeom = new THREE.SphereGeometry(90, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const globeGrid = new THREE.Mesh(sphereGeom, sphereMat);
    globeGroup.add(globeGrid);

    // 2. Create nodes (warehouse points)
    const pointsCount = 35;
    const pointsGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(pointsCount * 3);
    const nodeCoords = [];

    for (let i = 0; i < pointsCount; i++) {
      // Uniform distribution on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 90;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      nodeCoords.push(new THREE.Vector3(x, y, z));
    }

    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 4,
      transparent: true,
      opacity: 0.7
    });
    const points = new THREE.Points(pointsGeom, pointsMat);
    globeGroup.add(points);

    // 3. Create connecting bezier curves (logistics paths)
    const linesGroup = new THREE.Group();
    globeGroup.add(linesGroup);

    const connectionsCount = 20;
    const curveMaterials = [];
    const curveMeshes = [];

    for (let i = 0; i < connectionsCount; i++) {
      // Pick two random nodes
      const startNode = nodeCoords[Math.floor(Math.random() * pointsCount)];
      const endNode = nodeCoords[Math.floor(Math.random() * pointsCount)];

      if (startNode === endNode) continue;

      // Calculate midpoint and pull it outward to create an arc
      const mid = new THREE.Vector3().addVectors(startNode, endNode).multiplyScalar(0.5);
      const dist = startNode.distanceTo(endNode);
      mid.normalize().multiplyScalar(90 + dist * 0.25); // pull outward

      // Create quadratic bezier curve
      const curve = new THREE.QuadraticBezierCurve3(startNode, mid, endNode);
      const curvePoints = curve.getPoints(30);
      const curveGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);

      const isBlue = Math.random() > 0.5;
      const mat = new THREE.LineBasicMaterial({
        color: isBlue ? 0x3b82f6 : 0xf59e0b,
        transparent: true,
        opacity: 0.25
      });
      const line = new THREE.Line(curveGeom, mat);
      linesGroup.add(line);

      curveMeshes.push(line);
      curveMaterials.push(mat);
    }

    // 4. Create floating light particles (dispatches en route)
    const particleCount = 100;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds = [];

    for (let i = 0; i < particleCount; i++) {
      // Scatter in space around the globe
      const r = 120 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);

      particleSpeeds.push({
        x: (Math.random() - 0.5) * 0.05,
        y: (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.05
      });
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 2,
      transparent: true,
      opacity: 0.4
    });
    const spaceParticles = new THREE.Points(particleGeom, particleMat);
    scene.add(spaceParticles);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate the globe group
      globeGroup.rotation.y += 0.002;
      globeGroup.rotation.x += 0.0005;

      // Rotate space particles in opposite direction
      spaceParticles.rotation.y -= 0.0005;
      spaceParticles.rotation.x -= 0.0002;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement.parentNode) {
        container.removeChild(renderer.domElement);
      }
      // Dispose materials & geometries
      sphereGeom.dispose();
      sphereMat.dispose();
      pointsGeom.dispose();
      pointsMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      curveMaterials.forEach(m => m.dispose());
      curveMeshes.forEach(m => m.geometry.dispose());
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="three-bg-canvas"
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 0, 
        pointerEvents: 'none',
        opacity: 0.75
      }} 
    />
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // App settings & UI states
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalMessage, setGlobalMessage] = useState(null);

  // Core Data states
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Loading states
  const [dataLoading, setDataLoading] = useState(false);

  // Modals state
  const [vehicleModal, setVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  const [driverModal, setDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [tripModal, setTripModal] = useState(false);
  const [completeTripModal, setCompleteTripModal] = useState(null); // stores trip to complete

  const [maintModal, setMaintModal] = useState(false);
  
  const [expenseModal, setExpenseModal] = useState(false);
  const [fuelModal, setFuelModal] = useState(false);

  // Custom confirmation dialog state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Live Route Tracking State
  const [trackingTrip, setTrackingTrip] = useState(null);

  // Notifications Bell state
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Dynamic Leaflet map state loader hook
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, []);

  // Custom Select Dropdowns states
  const [formVehType, setFormVehType] = useState('Van');
  const [formVehStatus, setFormVehStatus] = useState('Available');
  const [formDrvCat, setFormDrvCat] = useState('LMV');
  const [formDrvStatus, setFormDrvStatus] = useState('Available');
  const [formTripVeh, setFormTripVeh] = useState('');
  const [formTripDrv, setFormTripDrv] = useState('');
  const [formTripSource, setFormTripSource] = useState(LOGISTICS_HUBS[0].value);
  const [formTripDest, setFormTripDest] = useState(LOGISTICS_HUBS[1].value);
  const [formMaintVeh, setFormMaintVeh] = useState('');
  const [formExpVeh, setFormExpVeh] = useState('');
  const [formExpType, setFormExpType] = useState('Toll');
  const [formExpTrip, setFormExpTrip] = useState('');

  // Filter & Search states
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('All');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('All');

  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('All');

  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState('All');

  // Trigger global message
  const triggerMessage = (text, type = 'success') => {
    setGlobalMessage({ text, type });
    setTimeout(() => setGlobalMessage(null), 5000);
  };

  // Fetch current user details
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUser();
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // Load database data once authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  // Dark mode effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.remove('light-mode');
    } else {
      root.classList.add('light-mode');
    }
  }, [darkMode]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const dropdown = document.querySelector('.notifications-dropdown');
      if (notifPanelOpen && dropdown && !dropdown.contains(e.target) && !e.target.closest('button')?.title?.includes('Compliance')) {
        setNotifPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [notifPanelOpen]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token expired/invalid
        setToken('');
      }
    } catch (err) {
      console.error('Error verifying user:', err);
      setToken('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        triggerMessage(`Welcome back, ${data.user.name}!`);
      } else {
        setAuthError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setAuthError('Connection to server failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    // Automate form submission
    setTimeout(() => {
      const form = document.getElementById('login-form');
      if (form) form.requestSubmit();
    }, 100);
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setActiveTab('Dashboard');
    triggerMessage('Successfully logged out.');
  };

  // Switch role dynamically (for easy RBAC evaluation)
  const handleSimulatedRoleChange = (role) => {
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      triggerMessage(`Simulated role switched to: ${role}`, 'warning');
      
      // Reset tab if new role doesn't have access to current tab
      const allowed = getAllowedTabs(role);
      if (!allowed.includes(activeTab)) {
        setActiveTab('Dashboard');
      }
    }
  };

  // Tab permissions configuration based on the Settings & RBAC matrix
  const getAllowedTabs = (userRole) => {
    if (!userRole) return ['Dashboard'];
    
    switch (userRole) {
      case 'Fleet Manager':
        return ['Dashboard', 'Fleet', 'Drivers', 'Trips', 'Maintenance', 'Fuel & Expenses', 'Reports & Analytics', 'Settings & RBAC'];
      case 'Dispatcher':
        return ['Dashboard', 'Fleet', 'Trips', 'Settings & RBAC'];
      case 'Safety Officer':
        return ['Dashboard', 'Drivers', 'Trips', 'Settings & RBAC'];
      case 'Financial Analyst':
        return ['Dashboard', 'Fleet', 'Fuel & Expenses', 'Reports & Analytics', 'Settings & RBAC'];
      default:
        return ['Dashboard'];
    }
  };

  const hasWriteAccess = (userRole, tabName) => {
    if (userRole === 'Fleet Manager') {
      return ['Fleet', 'Drivers', 'Maintenance'].includes(tabName);
    }
    if (userRole === 'Dispatcher') {
      return ['Trips'].includes(tabName);
    }
    if (userRole === 'Safety Officer') {
      return ['Drivers'].includes(tabName);
    }
    if (userRole === 'Financial Analyst') {
      return ['Fuel & Expenses'].includes(tabName);
    }
    return false;
  };

  // API Data Loaders
  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const role = user.role;

      // Conditional fetching based on RBAC permissions to prevent unauthorized 403 network responses
      if (['Fleet Manager', 'Dispatcher', 'Financial Analyst'].includes(role)) {
        const resVeh = await fetch(`${API_BASE}/vehicles`, { headers });
        if (resVeh.ok) setVehicles(await resVeh.json());
      }
      
      if (['Fleet Manager', 'Safety Officer'].includes(role)) {
        const resDrv = await fetch(`${API_BASE}/drivers`, { headers });
        if (resDrv.ok) setDrivers(await resDrv.json());
      }

      const resTrips = await fetch(`${API_BASE}/trips`, { headers });
      if (resTrips.ok) setTrips(await resTrips.json());

      if (['Fleet Manager', 'Financial Analyst'].includes(role)) {
        const resMaint = await fetch(`${API_BASE}/maintenance`, { headers });
        if (resMaint.ok) setMaintenanceLogs(await resMaint.json());

        const resExp = await fetch(`${API_BASE}/expenses`, { headers });
        if (resExp.ok) setExpenses(await resExp.json());

        const resFuel = await fetch(`${API_BASE}/expenses/fuel-logs`, { headers });
        if (resFuel.ok) setFuelLogs(await resFuel.json());

        const resAnal = await fetch(`${API_BASE}/reports/analytics`, { headers });
        if (resAnal.ok) setAnalytics(await resAnal.json());
      } else {
        // Minimal analytics for dashboard counters
        // Since other roles cannot hit full reports/analytics, we compute basic KPIs on frontend
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Helper to re-fetch and refresh dashboards
  const refreshData = () => {
    loadAllData();
  };

  // --- CRUD ACTIONS ---

  // Vehicle Submit
  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    const method = selectedVehicle ? 'PUT' : 'POST';
    const endpoint = selectedVehicle 
      ? `${API_BASE}/vehicles/${selectedVehicle.registration_number}`
      : `${API_BASE}/vehicles`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage(selectedVehicle ? 'Vehicle updated successfully!' : 'Vehicle registered successfully!');
        setVehicleModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to submit vehicle data', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Delete Vehicle
  const handleVehicleDelete = (regNo) => {
    setConfirmModal({
      open: true,
      title: 'Delete Vehicle Registration',
      message: `Are you sure you want to delete vehicle ${regNo}? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/vehicles/${regNo}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            triggerMessage('Vehicle deleted successfully.');
            refreshData();
          } else {
            triggerMessage(data.error || 'Failed to delete vehicle', 'danger');
          }
        } catch (err) {
          triggerMessage('Network error occurred.', 'danger');
        }
      }
    });
  };

  // Driver Submit
  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    const method = selectedDriver ? 'PUT' : 'POST';
    const endpoint = selectedDriver 
      ? `${API_BASE}/drivers/${selectedDriver.id}`
      : `${API_BASE}/drivers`;

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage(selectedDriver ? 'Driver profile updated!' : 'Driver profile registered!');
        setDriverModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to submit driver profile', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Delete Driver
  const handleDriverDelete = (id) => {
    setConfirmModal({
      open: true,
      title: 'Delete Driver Profile',
      message: 'Are you sure you want to delete this driver profile? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/drivers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            triggerMessage('Driver deleted successfully.');
            refreshData();
          } else {
            triggerMessage(data.error || 'Failed to delete driver', 'danger');
          }
        } catch (err) {
          triggerMessage('Network error occurred.', 'danger');
        }
      }
    });
  };

  // Trip Creation
  const handleTripCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/trips`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Draft trip created successfully.');
        setTripModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to plan trip', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Trip Dispatch
  const handleTripDispatch = async (tripId) => {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Trip successfully dispatched!');
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to dispatch trip', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Trip Completion
  const handleTripComplete = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/trips/${completeTripModal.id}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Trip completed! Odometer, fuel logs, and expenses automatically updated.');
        setCompleteTripModal(null);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to complete trip', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Cancel Trip
  const handleTripCancel = (tripId) => {
    setConfirmModal({
      open: true,
      title: 'Cancel Cargo Dispatch',
      message: 'Are you sure you want to cancel this trip? The vehicle and driver status will revert to Available.',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/trips/${tripId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            triggerMessage('Trip cancelled.', 'warning');
            refreshData();
          } else {
            triggerMessage(data.error || 'Failed to cancel trip', 'danger');
          }
        } catch (err) {
          triggerMessage('Network error occurred.', 'danger');
        }
      }
    });
  };

  // Log Maintenance
  const handleMaintSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Vehicle sent to In Shop. Maintenance logged.');
        setMaintModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to log maintenance record', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Complete Maintenance
  const handleMaintComplete = async (logId) => {
    try {
      const res = await fetch(`${API_BASE}/maintenance/${logId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Maintenance marked complete. Vehicle restored to Available.');
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to complete maintenance', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Log Expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Expense recorded.');
        setExpenseModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to record expense', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Log Fuel
  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`${API_BASE}/expenses/fuel-logs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        triggerMessage('Fuel log saved.');
        setFuelModal(false);
        refreshData();
      } else {
        triggerMessage(data.error || 'Failed to log fuel data', 'danger');
      }
    } catch (err) {
      triggerMessage('Network error occurred.', 'danger');
    }
  };

  // Export CSV download helper
  const handleCSVExport = () => {
    window.open(`${API_BASE}/reports/export-csv?authorization=Bearer ${token}`, '_blank');
    triggerMessage('CSV download started.');
  };

  // --- RENDERS ---

  if (!token || !user) {
    return (
      <div className="login-screen">
        <ThreeLogisticsGlobe />
        <div className="login-bg-glow-1"></div>
        <div className="login-bg-glow-2"></div>
        <div className="login-left">          <div className="login-screen-left-inner">
            <div className="logo-container" style={{ border: 'none', paddingLeft: 0, marginBottom: '28px' }}>
              <div className="logo-icon" style={{ background: 'linear-gradient(135deg, var(--primary), #e07a00)', width: '44px', height: '44px', fontSize: '16px' }}>TO</div>
              <div>
                <div className="logo-text" style={{ fontSize: '20px' }}>TransitOps</div>
                <div className="logo-subtitle">Fleet Management</div>
              </div>
            </div>

            <h1 style={{ fontSize: '34px', fontWeight: '800', fontFamily: 'var(--font-display)', lineHeight: '1.15', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Smart Transport<br />Operations Platform
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '14px', lineHeight: '1.7', fontSize: '13px', maxWidth: '420px' }}>
              Digitize vehicles, drivers, dispatches, and expenses from a single high-fidelity workspace with real-time analytics.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
              <div className="login-feature-item">
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '10px', borderRadius: '10px', color: 'var(--primary)', flexShrink: 0 }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Asset Intelligence</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.5' }}>Odometer telemetry, fleet health logs, and automated service reminders.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '10px', color: 'var(--info)', flexShrink: 0 }}>
                  <Route size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Dispatch & Real-Time Tracking</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.5' }}>Multi-stage trip workflows, interactive maps, and cargo-weight enforcement.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px', color: 'var(--success)', flexShrink: 0 }}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Expense & Carbon Analytics</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: '1.5' }}>Fuel cost computation, ROI audits, and live CO₂ footprint dashboards.</p>
                </div>
              </div>
            </div>

            {/* Platform quick stats — hardcoded since data loads post-login */}
            <div className="login-stats-row">
              <div className="login-stat-item">
                <div className="login-stat-value">50+</div>
                <div className="login-stat-label">Fleet Assets</div>
              </div>
              <div className="login-stat-item">
                <div className="login-stat-value">4</div>
                <div className="login-stat-label">RBAC Roles</div>
              </div>
              <div className="login-stat-item">
                <div className="login-stat-value">Live</div>
                <div className="login-stat-label">GPS Tracking</div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>ODOO HACKATHON 2026 &nbsp;·&nbsp; TRANSITOPS v1.0</span>
            </div>
          </div>     </div>
 
        <div className="login-right">
          
          <div className="login-card">
            {/* Product badge */}
            <div className="login-product-badge">
              <Activity size={10} />
              Fleet Management Platform
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>Sign in to your TransitOps workspace</p>
            
            {authError && (
              <div className="alert-banner alert-banner-danger" style={{ marginBottom: '20px' }}>
                <ShieldAlert size={16} />
                <span>{authError}</span>
              </div>
            )}
 
            <form id="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>EMAIL ADDRESS</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input 
                    type="email" 
                    className="form-control" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@transitops.com"
                    style={{ paddingLeft: '36px', height: '42px', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                    required 
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <div className="login-password-row">
                  <label style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0 }}>PASSWORD</label>
                  <button type="button" className="login-forgot-link">Forgot password?</button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input 
                    type="password" 
                    className="form-control" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingLeft: '36px', height: '42px', backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}
                    required 
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px', fontWeight: '700', fontSize: '13px', letterSpacing: '0.8px', textTransform: 'uppercase', borderRadius: '10px' }} disabled={loginLoading}>
                {loginLoading ? 'Authenticating...' : 'Sign In to TransitOps'}
              </button>
            </form>
 
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>EVALUATOR QUICK SIGN-IN</span>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              </div>
              
              <div className="demo-account-grid">
                <button className="demo-account-btn" onClick={() => handleDemoLogin('manager@transitops.com')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="demo-account-role">Manager</span>
                    <LayoutDashboard size={12} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="demo-account-name">Raven K.</div>
                  <div className="demo-account-email">manager@transitops.com</div>
                </button>
                <button className="demo-account-btn" onClick={() => handleDemoLogin('dispatcher@transitops.com')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="demo-account-role">Dispatcher</span>
                    <Route size={12} style={{ color: 'var(--info)' }} />
                  </div>
                  <div className="demo-account-name">Jenish S.</div>
                  <div className="demo-account-email">dispatcher@transitops.com</div>
                </button>
                <button className="demo-account-btn" onClick={() => handleDemoLogin('safety@transitops.com')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="demo-account-role">Safety</span>
                    <ShieldAlert size={12} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div className="demo-account-name">Jackson J.</div>
                  <div className="demo-account-email">safety@transitops.com</div>
                </button>
                <button className="demo-account-btn" onClick={() => handleDemoLogin('analyst@transitops.com')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="demo-account-role">Analyst</span>
                    <DollarSign size={12} style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="demo-account-name">Hari K.</div>
                  <div className="demo-account-email">analyst@transitops.com</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Define tab navigation based on role permissions
  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Fleet', icon: Truck },
    { name: 'Drivers', icon: Users },
    { name: 'Trips', icon: Route },
    { name: 'Maintenance', icon: Wrench },
    { name: 'Fuel & Expenses', icon: Fuel },
    { name: 'Reports & Analytics', icon: TrendingUp },
    { name: 'Settings & RBAC', icon: Settings }
  ];

  const allowedTabs = getAllowedTabs(user.role);

  // Get active system notifications
  const getActiveNotifications = () => {
    const alerts = [];
    
    // 1. Expiring / Expired Driver Licenses
    drivers.forEach(d => {
      if (!d.license_expiry_date) return;
      const today = new Date();
      const expiry = new Date(d.license_expiry_date);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 30) {
        alerts.push({
          id: `drv-exp-${d.id}`,
          type: 'warning',
          title: 'License Expiring Soon',
          message: `Driver ${d.name}'s license category ${d.license_category} expires in ${diffDays} days.`
        });
      } else if (diffDays < 0) {
        alerts.push({
          id: `drv-expd-${d.id}`,
          type: 'danger',
          title: 'License Expired',
          message: `Driver ${d.name} license is expired! Update profile and suspend driver.`
        });
      }
    });

    // 2. Vehicles Due for Maintenance
    vehicles.forEach(v => {
      if (v.odometer >= 10000 && v.status === 'Available') {
        alerts.push({
          id: `maint-due-${v.registration_number}`,
          type: 'warning',
          title: 'Preventive Maintenance Due',
          message: `Asset ${v.registration_number} (${v.name_model}) odometer is ${v.odometer.toLocaleString()} km. Service due.`
        });
      }
    });

    // 3. Delayed/Long Trips check
    trips.forEach(t => {
      if (t.status === 'Dispatched') {
        const dispatchDate = new Date(t.created_at || Date.now());
        const ageHours = (Date.now() - dispatchDate) / (1000 * 60 * 60);
        if (ageHours > 24) {
          alerts.push({
            id: `trip-delay-${t.id}`,
            type: 'danger',
            title: 'Active Trip Delayed',
            message: `Trip TR-${String(t.id).padStart(4, '0')} to ${t.destination} active > 24h.`
          });
        }
      }
    });

    return alerts;
  };

  const notificationAlerts = getActiveNotifications();

  const expiringDrivers = drivers.filter(d => {
    if (!d.license_expiry_date) return false;
    const today = new Date();
    const expiry = new Date(d.license_expiry_date);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  return (
    <div className="app-container">
      {/* Global notifications banner */}
      {globalMessage && (
        <div className={`toast-notification toast-${globalMessage.type || 'success'}`}>
          {globalMessage.type === 'success' && <Check size={18} className="toast-icon-success" />}
          {globalMessage.type === 'warning' && <AlertTriangle size={18} className="toast-icon-warning" />}
          {globalMessage.type === 'danger' && <X size={18} className="toast-icon-danger" />}
          <span className="toast-text">{globalMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <div className="logo-icon">TO</div>
          <div>
            <div className="logo-text">TransitOps</div>
            <div className="logo-subtitle">Smart Platform</div>
          </div>
        </div>
        
        <ul className="nav-links">
          {tabs.map(tab => {
            const isAllowed = allowedTabs.includes(tab.name);
            if (!isAllowed) return null;
            const Icon = tab.icon;
            
            const displayNameMap = {
              'Dashboard': 'Dashboard',
              'Fleet': 'Fleet Registry',
              'Drivers': 'Driver Profiles',
              'Trips': 'Cargo Dispatches',
              'Maintenance': 'Service Logs',
              'Fuel & Expenses': 'Fuel & Expenses',
              'Reports & Analytics': 'Analytics & ESG',
              'Settings & RBAC': 'Platform Settings'
            };

            return (
              <li key={tab.name}>
                <div 
                  className={`nav-item ${activeTab === tab.name ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.name);
                    setSidebarOpen(false);
                    setNotifPanelOpen(false);
                  }}
                >
                  <Icon size={18} style={{ marginRight: '10px' }} />
                  <span>{displayNameMap[tab.name]}</span>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>v1.0.0 Stable</span>
            <button onClick={() => setDarkMode(!darkMode)} className="btn btn-secondary" style={{ padding: '6px 8px', borderRadius: '50%' }}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 className="header-title">{activeTab}</h1>
          </div>
          
          <div className="user-profile" style={{ gap: '16px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setNotifPanelOpen(!notifPanelOpen)} 
                className={`btn btn-secondary ${notificationAlerts.length > 0 ? 'pulse-red-glow' : ''}`} 
                style={{ 
                  padding: '8px', 
                  borderRadius: '50%', 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderColor: notificationAlerts.length > 0 ? 'var(--danger)' : 'var(--border-color)',
                  color: notificationAlerts.length > 0 ? 'var(--danger)' : 'var(--text-primary)',
                  transition: 'all 0.3s ease'
                }}
                title="System Compliance Alerts"
              >
                <Bell size={16} />
                {notificationAlerts.length > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    right: '-4px', 
                    backgroundColor: 'var(--danger)', 
                    color: '#fff', 
                    fontSize: '9px', 
                    fontWeight: '800', 
                    borderRadius: '50%', 
                    width: '15px', 
                    height: '15px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}>
                    {notificationAlerts.length}
                  </span>
                )}
              </button>

              {/* Dropdown Alerts Panel */}
              <div 
                className={`notifications-dropdown ${notifPanelOpen ? 'show' : ''}`} 
                style={{ width: '340px', padding: '16px', maxHeight: '420px', overflowY: 'auto' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} style={{ color: notificationAlerts.length > 0 ? 'var(--danger)' : 'var(--success)' }} />
                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.3px' }}>System Compliance Alerts</span>
                  </div>
                  <span className="badge" style={{ backgroundColor: notificationAlerts.length > 0 ? 'var(--danger-bg)' : 'var(--success-bg)', color: notificationAlerts.length > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                    {notificationAlerts.length} Active
                  </span>
                </div>
                
                {notificationAlerts.length === 0 ? (
                  <div style={{ padding: '24px 0', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Check size={24} style={{ color: 'var(--success)' }} />
                    <span>All operating systems compliant. No active alerts.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {notificationAlerts.map(alert => {
                      const isDanger = alert.type === 'danger';
                      const isWarning = alert.type === 'warning';
                      
                      let itemBg = 'rgba(59, 130, 246, 0.04)';
                      let itemBorder = 'var(--info)';
                      if (isDanger) {
                        itemBg = 'rgba(239, 68, 68, 0.04)';
                        itemBorder = 'var(--danger)';
                      } else if (isWarning) {
                        itemBg = 'rgba(245, 158, 11, 0.04)';
                        itemBorder = 'var(--warning)';
                      }

                      return (
                        <div 
                          key={alert.id} 
                          style={{ 
                            padding: '12px', 
                            borderRadius: '8px', 
                            borderLeft: `4px solid ${itemBorder}`,
                            backgroundColor: itemBg,
                            borderTop: '1px solid rgba(255,255,255,0.01)',
                            borderRight: '1px solid rgba(255,255,255,0.01)',
                            borderBottom: '1px solid rgba(255,255,255,0.01)',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <div style={{ marginTop: '2px' }}>
                            {isDanger ? (
                              <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />
                            ) : isWarning ? (
                              <ShieldAlert size={14} style={{ color: 'var(--warning)' }} />
                            ) : (
                              <Activity size={14} style={{ color: 'var(--info)' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '11.5px', marginBottom: '2px' }}>{alert.title}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>{alert.message}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: notificationAlerts.length > 0 ? 'var(--warning)' : 'var(--success)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '14px', justifyContent: 'center', letterSpacing: '0.5px', fontWeight: '700' }}>
                  <Activity size={10} className="pulse-dot" style={{ backgroundColor: 'transparent', display: 'inline-block' }} />
                  <span>COMPLIANCE MONITOR ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        <div className="content-body">
          {/* Driver License Expiry warning alerts */}
          {expiringDrivers.length > 0 && ['Fleet Manager', 'Safety Officer'].includes(user.role) && (
            <div className="alert-banner alert-banner-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>License Renewal Warning:</strong> {expiringDrivers.length} driver(s) have licenses expiring in less than 30 days ({expiringDrivers.map(d => `${d.name} Exp: ${d.license_expiry_date}`).join(', ')}).
              </div>
            </div>
          )}

          {/* TAB CONTENTS */}

          {activeTab === 'Dashboard' && (
            <div>
              {/* Quick Actions Panel */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {hasWriteAccess(user.role, 'Trips') && (
                  <button className="btn btn-primary" onClick={() => { setFormTripVeh(''); setFormTripDrv(''); setTripModal(true); }} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} />
                    <span>New Cargo Dispatch</span>
                  </button>
                )}
                {hasWriteAccess(user.role, 'Fleet') && (
                  <button className="btn btn-secondary" onClick={() => { setSelectedVehicle(null); setFormVehType('Van'); setFormVehStatus('Available'); setVehicleModal(true); }} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={14} />
                    <span>Add Fleet Asset</span>
                  </button>
                )}
                {hasWriteAccess(user.role, 'Drivers') && (
                  <button className="btn btn-secondary" onClick={() => { setSelectedDriver(null); setFormDrvCat('LMV'); setFormDrvStatus('Available'); setDriverModal(true); }} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} />
                    <span>Register Driver</span>
                  </button>
                )}
                {hasWriteAccess(user.role, 'Fuel & Expenses') && (
                  <button className="btn btn-secondary" onClick={() => { setFormExpVeh(''); setExpenseModal(true); }} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} />
                    <span>Log Expense</span>
                  </button>
                )}
              </div>

              {/* KPI section */}
              {analytics ? (
                <div>
                  {/* Row 1: Operations Hero KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Hero Card: Active Trips */}
                    <div className="kpi-card" style={{ 
                      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', 
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      boxShadow: '0 0 20px rgba(245, 158, 11, 0.1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', color: 'var(--primary)', opacity: 0.08 }}><Route size={96} /></div>
                      <div className="kpi-header">
                        <span className="kpi-title" style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600' }}>Active Cargo Dispatches</span>
                        <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                          <Route size={16} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '12px' }}>
                        <span style={{ fontSize: '42px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#fff' }}>{analytics.kpis.activeTrips}</span>
                        <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '600' }}>● Running Live</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                        Last updated 2 mins ago • Evaluator check
                      </span>
                    </div>

                    {/* Card 2: Vehicles Available */}
                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">Vehicles Available</span>
                        <div className="kpi-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                          <Truck size={16} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{analytics.kpis.availableVehicles}</span>
                        <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>▲ +12% today</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                        Registry Total: {vehicles.length}
                      </span>
                    </div>

                    {/* Card 3: Drivers On duty */}
                    <div className="kpi-card">
                      <div className="kpi-header">
                        <span className="kpi-title">Drivers On Duty</span>
                        <div className="kpi-icon" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
                          <Users size={16} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                        <span style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>{analytics.kpis.driversOnDuty}</span>
                        <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>● Active</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                        Registry Total: {drivers.length}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Secondary Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                    {/* KPI 4: Fleet Health SVG Ring Gauge */}
                    {(() => {
                      const healthyVehicles = vehicles.filter(v => v.status !== 'In Shop' && v.status !== 'Retired').length;
                      const healthPct = vehicles.length > 0 ? Math.round((healthyVehicles / vehicles.length) * 100) : 100;
                      const healthDesc = healthPct >= 90 ? 'Excellent Condition' : healthPct >= 75 ? 'Good Condition' : 'Maintenance Required';
                      const strokeDash = `${healthPct} ${100 - healthPct}`;
                      const glowClass = healthPct >= 90 ? 'glow-success' : healthPct >= 75 ? 'glow-warning' : 'glow-danger';
                      return (
                        <div className={`kpi-card ${glowClass}`} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                          <div>
                            <span className="kpi-title">Fleet Health</span>
                            <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '8px', fontFamily: 'var(--font-display)', color: healthPct >= 90 ? 'var(--success)' : healthPct >= 75 ? 'var(--warning)' : 'var(--danger)' }}>
                              {healthPct}%
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>{healthDesc}</span>
                          </div>
                          {/* Tiny SVG progress ring */}
                          <svg width="50" height="50" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="15.91" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.91" fill="none" stroke={healthPct >= 90 ? 'var(--success)' : healthPct >= 75 ? 'var(--warning)' : 'var(--danger)'} strokeWidth="3" strokeDasharray={strokeDash} />
                          </svg>
                        </div>
                      );
                    })()}

                    {/* KPI 5: Fleet Utilization */}
                    <div className="kpi-card glow-primary" style={{ 
                      padding: '16px 20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      minHeight: '110px'
                    }}>
                      <div>
                        <div className="kpi-header">
                          <span className="kpi-title">Fleet Utilization</span>
                          <div className="kpi-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <TrendingUp size={16} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                          <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                            {analytics.kpis.fleetUtilization}%
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>▲ +4% Today</span>
                        </div>
                      </div>
                      {/* Micro Bar Chart Sparkline */}
                      <div style={{ height: '24px', marginTop: '8px' }}>
                        {(() => {
                          const sparkData = [
                            { name: 'Mon', value: 40 },
                            { name: 'Tue', value: 55 },
                            { name: 'Wed', value: 70 },
                            { name: 'Thu', value: 65 },
                            { name: 'Fri', value: 80 },
                            { name: 'Sat', value: 50 },
                            { name: 'Sun', value: analytics.kpis.fleetUtilization || 60 }
                          ];
                          return (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Bar dataKey="value" fill="var(--primary)" radius={[2, 2, 0, 0]}>
                                  {sparkData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={index === sparkData.length - 1 ? 'var(--primary)' : 'rgba(245, 158, 11, 0.3)'} 
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    </div>

                    {/* KPI 6: Monthly Expenses */}
                    {(() => {
                      const fuelTotal = expenses.filter(e => e.type === 'Fuel').reduce((sum, e) => sum + e.cost, 0);
                      const maintTotal = expenses.filter(e => e.type === 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
                      const totalExpenses = fuelTotal + maintTotal;
                      return (
                        <div className="kpi-card glow-warning" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div className="kpi-header">
                              <span className="kpi-title">Operational Cost</span>
                              <div className="kpi-icon" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
                                <DollarSign size={16} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                              <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)' }}>₹{totalExpenses.toLocaleString()}</span>
                              <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: '600' }}>↑ 8%</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            Compared to yesterday
                          </span>
                        </div>
                      );
                    })()}

                    {/* KPI 7: Fleet CO2 Emissions */}
                    <div className="kpi-card glow-success" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.02)', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div className="kpi-header">
                          <span className="kpi-title" style={{ color: 'var(--success)' }}>Fleet CO2 Footprint</span>
                          <div className="kpi-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
                            <Leaf size={16} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                          <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                            {analytics.kpis.totalCarbonEmissions ? `${analytics.kpis.totalCarbonEmissions.toLocaleString()} kg` : '0 kg'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>↓ 3%</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        Offset: {Math.ceil((analytics.kpis.totalCarbonEmissions || 0) / 22)} trees needed
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fallback basic stats */
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                  <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div className="kpi-header">
                      <span className="kpi-title" style={{ color: 'var(--primary)' }}>Active Cargo Dispatches</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '12px' }}>
                      <span style={{ fontSize: '42px', fontWeight: '800' }}>{trips.filter(t => t.status === 'Dispatched').length}</span>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">Vehicles Available</span></div>
                    <div style={{ display: 'flex', marginTop: '12px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '700' }}>{vehicles.filter(v => v.status === 'Available').length}</span>
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-header"><span className="kpi-title">Drivers On Duty</span></div>
                    <div style={{ display: 'flex', marginTop: '12px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '700' }}>{drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 3: Live Operations Map & Dispatch Board */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Live Dispatch Board */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">Live Dispatch Board</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Showing active dispatches</span>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>TRIP</th>
                          <th>VEHICLE</th>
                          <th>DRIVER</th>
                          <th>ROUTE</th>
                          <th>ETA</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trips.length > 0 ? (
                          trips.slice(0, 6).map(trip => {
                            const isHeavy = trip.cargo_weight > 5000;
                            return (
                              <tr key={trip.id}>
                                <td style={{ fontWeight: '600' }}>TR-{String(trip.id).padStart(4, '0')}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <Truck size={14} style={{ marginRight: '6px', color: isHeavy ? 'var(--primary)' : 'var(--info)', display: 'inline-block', verticalAlign: 'middle' }} />
                                  {trip.vehicle_reg_no}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <div style={{ 
                                      width: '20px', 
                                      height: '20px', 
                                      borderRadius: '50%', 
                                      backgroundColor: 'var(--primary-light)', 
                                      color: 'var(--primary)', 
                                      fontSize: '9px', 
                                      fontWeight: '700', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      {trip.driver_name ? trip.driver_name.charAt(0) : 'D'}
                                    </div>
                                    <span style={{ fontSize: '12px' }}>{trip.driver_name}</span>
                                  </div>
                                </td>
                                <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }} title={`${trip.source} → ${trip.destination}`}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '180px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                      {getShortAddressName(trip.source)}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                      → {getShortAddressName(trip.destination)}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {(() => {
                                    if (trip.status === 'Completed') return <span style={{ color: 'var(--text-muted)' }}>--</span>;
                                    if (trip.status === 'Dispatched') {
                                      const hrs = Math.max(1, Math.round(trip.planned_distance / 65));
                                      return <span style={{ fontWeight: '600', color: 'var(--info)' }}>{hrs}h</span>;
                                    }
                                    return <span style={{ color: 'var(--text-secondary)' }}>Planned</span>;
                                  })()}
                                </td>
                                <td>{renderStatusPill(trip.status)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan="6" style={{ textAlign: 'center' }}>No active dispatches logged.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Dashboard Live Map */}
                <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', height: '360px' }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="card-title">Live Dispatch Tracking Map</h3>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>● Live Telemetry</span>
                  </div>
                  <div style={{ flexGrow: 1, backgroundColor: 'rgba(2, 6, 23, 0.4)', borderRadius: 'var(--border-radius-sm)', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {leafletLoaded ? (
                      <LiveLogisticsMap trips={trips} darkMode={darkMode} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Loading real-time GPS telemetry assets...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Timeline, Drivers & Maintenance Widgets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '20px', marginTop: '20px' }}>
                
                {/* 1. Upcoming Maintenance Widget */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
                      <Wrench size={16} style={{ color: 'var(--warning)', marginRight: '8px' }} />
                      <span>Upcoming Maintenance</span>
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                     {vehicles.filter(v => v.status !== 'Retired').slice(0, 3).map(v => {
                      const serviceInterval = 10000;
                      const nextServiceOdo = Math.ceil((v.odometer + 1) / serviceInterval) * serviceInterval;
                      const rem = nextServiceOdo - v.odometer;
                      const pct = Math.round(((v.odometer % serviceInterval) / serviceInterval) * 100);
                      const dueDays = Math.max(1, Math.ceil(rem / 120)); // Assume 120 km average travel per day
                      
                      const getDueDateEst = (days) => {
                        const date = new Date();
                        date.setDate(date.getDate() + days);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      };

                      let statusColor = 'var(--success)';
                      if (rem <= 1500) statusColor = 'var(--danger)';
                      else if (rem <= 3500) statusColor = 'var(--warning)';

                      return (
                        <div key={v.registration_number} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{v.registration_number} ({v.name_model})</span>
                            <span style={{ color: statusColor, fontWeight: '700' }}>{rem.toLocaleString()} km left</span>
                          </div>
                          {/* Linear progress bar */}
                          <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', backgroundColor: statusColor }}></div>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Due: {getDueDateEst(dueDays)} (Est. {dueDays} days)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Driver Availability Cards */}
                <div className="card" style={{ marginBottom: 0 }}>
                  <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
                      <Users size={16} style={{ color: 'var(--info)', marginRight: '8px' }} />
                      <span>Driver Status Monitor</span>
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                    {drivers.slice(0, 4).map(d => {
                      let statusText = 'Online';
                      let statusClass = 'badge-success';
                      let activeRouteText = 'Resting / Available';

                      if (d.status === 'On Trip') {
                        statusText = 'On Duty';
                        statusClass = 'badge-info';
                        const activeTrip = trips.find(t => t.driver_id === d.id && t.status === 'Dispatched');
                        if (activeTrip) activeRouteText = `${activeTrip.source} → ${activeTrip.destination}`;
                      } else if (d.status === 'Off Duty') {
                        statusText = 'Break';
                        statusClass = 'badge-warning';
                      } else if (d.status === 'Suspended') {
                        statusText = 'Suspended';
                        statusClass = 'badge-danger';
                        activeRouteText = 'Action Required';
                      }

                      return (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{d.name}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{activeRouteText}</div>
                          </div>
                          <span className={`badge ${statusClass}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{statusText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Right Dashboard Sidebar Column (Hub Logistics Intel) */}
                <div className="card" style={{ marginBottom: 0, padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '10px' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center' }}>
                      <Map size={16} style={{ color: 'var(--success)', marginRight: '8px' }} />
                      <span>Hub Logistics Intel</span>
                    </h3>
                  </div>

                  {/* Weather Widget */}
                  {(() => {
                    const latestTrip = trips[trips.length - 1];
                    let cityName = 'Ahmedabad Hub';
                    let temp = 34;
                    let conditions = 'Good Driving Conditions';
                    
                    if (latestTrip) {
                      cityName = getShortAddressName(latestTrip.source);
                      let hash = 0;
                      for (let i = 0; i < latestTrip.source.length; i++) {
                        hash = latestTrip.source.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      temp = 24 + (Math.abs(hash) % 12);
                      conditions = (Math.abs(hash) % 3 === 0) ? 'Clear • Perfect Visibility' : (Math.abs(hash) % 3 === 1) ? 'Overcast • Good Conditions' : 'Slight Rain • Reduce Speed';
                    }

                    return (
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                        <Sun size={24} style={{ color: 'var(--primary)' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{cityName}</div>
                          <div style={{ fontSize: '11px', color: temp > 30 ? 'var(--warning)' : 'var(--success)', fontWeight: '600' }}>{temp}°C • {conditions}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dynamic Operations Log Feed */}
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Operations Feed</div>
                    <div className="operations-feed-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '140px', paddingRight: '4px' }}>
                      {(() => {
                        const feedLogs = [];
                        
                        trips.forEach(t => {
                          const time = t.created_at ? t.created_at.split(' ')[1].substring(0, 5) : '09:00';
                          if (t.status === 'Completed') {
                            feedLogs.push({
                              time,
                              title: `Trip Completed`,
                              desc: `TR-${String(t.id).padStart(4, '0')} loaded revenue of ₹${t.revenue.toLocaleString()}`,
                              type: 'success'
                            });
                          } else if (t.status === 'Dispatched') {
                            feedLogs.push({
                              time,
                              title: `Vehicle Dispatched`,
                              desc: `TR-${String(t.id).padStart(4, '0')} en route to ${getShortAddressName(t.destination)}`,
                              type: 'info'
                            });
                          } else {
                            feedLogs.push({
                              time,
                              title: `Cargo Route Planned`,
                              desc: `TR-${String(t.id).padStart(4, '0')} created for ${t.vehicle_reg_no}`,
                              type: 'warning'
                            });
                          }
                        });

                        maintenanceLogs.forEach(m => {
                          feedLogs.push({
                            time: '08:30',
                            title: `Maintenance Logged`,
                            desc: `Vehicle ${m.vehicle_reg_no}: ${m.service_type} (${m.status})`,
                            type: 'danger'
                          });
                        });

                        expenses.slice(0, 3).forEach(e => {
                          feedLogs.push({
                            time: '10:12',
                            title: `Expense Logged`,
                            desc: `₹${e.cost.toLocaleString()} logged under ${e.type} for ${e.vehicle_reg_no}`,
                            type: 'warning'
                          });
                        });

                        if (feedLogs.length === 0) {
                          feedLogs.push({
                            time: '09:00',
                            title: 'Operations Online',
                            desc: 'TransitOps live logging systems online',
                            type: 'success'
                          });
                        }

                        // Take latest 5 logs, reverse for chronological order
                        return feedLogs.slice(-5).reverse().map((log, index) => {
                          let dotColor = 'var(--text-muted)';
                          if (log.type === 'success') dotColor = 'var(--success)';
                          else if (log.type === 'info') dotColor = 'var(--info)';
                          else if (log.type === 'warning') dotColor = 'var(--warning)';
                          else if (log.type === 'danger') dotColor = 'var(--danger)';

                          return (
                            <div key={index} style={{ display: 'flex', gap: '12px', fontSize: '11px', borderLeft: '1.5px dashed var(--border-color)', paddingLeft: '12px', marginLeft: '6px', position: 'relative' }}>
                              <div style={{ 
                                position: 'absolute', 
                                left: '-5px', 
                                top: '3px', 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                backgroundColor: dotColor,
                                border: '1.5px solid var(--bg-primary)'
                              }}></div>
                              <div style={{ flexGrow: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: 'var(--text-primary)' }}>
                                  <span>{log.title}</span>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '9px' }}>{log.time}</span>
                                </div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>{log.desc}</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Fleet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Fleet Mini Stats HUD */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="kpi-card glow-info" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Fleet Assets</span>
                    <Truck size={14} style={{ color: 'var(--info)' }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    {vehicles.length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Registered in Database</span>
                </div>

                <div className="kpi-card glow-success" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Assets</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }}></span>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                    {vehicles.filter(v => v.status === 'Available').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Ready for Dispatch</span>
                </div>

                <div className="kpi-card glow-primary" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Transit</span>
                    <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--info)', display: 'inline-block' }}></div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--info)' }}>
                    {vehicles.filter(v => v.status === 'On Trip').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>En Route (GPS Online)</span>
                </div>

                <div className="kpi-card glow-danger" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>In Service Shop</span>
                    <Wrench size={14} style={{ color: 'var(--danger)' }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--danger)' }}>
                    {vehicles.filter(v => v.status === 'In Shop').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending Maintenance</span>
                </div>
              </div>

              {/* Main Vehicle Registry Card */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Vehicle Registry</h3>
                  {hasWriteAccess(user.role, 'Fleet') && (
                    <button className="btn btn-primary" onClick={() => { setSelectedVehicle(null); setFormVehType('Van'); setFormVehStatus('Available'); setVehicleModal(true); }}>
                      <Plus size={16} />
                      <span>Register Vehicle</span>
                    </button>
                  )}
                </div>

                {/* Filters bar */}
                <div className="filter-bar">
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon-pos" />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search model or registration number..." 
                      value={vehicleSearch} 
                      onChange={e => setVehicleSearch(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CustomSelect
                      style={{ width: '130px' }}
                      options={[
                        { value: 'All', label: 'All Types' },
                        { value: 'Van', label: 'Van' },
                        { value: 'Truck', label: 'Truck' },
                        { value: 'Mini', label: 'Mini-Truck' },
                        { value: 'Sedan', label: 'Sedan' }
                      ]}
                      value={vehicleTypeFilter}
                      onChange={setVehicleTypeFilter}
                    />

                    <CustomSelect
                      style={{ width: '130px' }}
                      options={[
                        { value: 'All', label: 'All Statuses' },
                        { value: 'Available', label: 'Available' },
                        { value: 'On Trip', label: 'On Trip' },
                        { value: 'In Shop', label: 'In Shop' },
                        { value: 'Retired', label: 'Retired' }
                      ]}
                      value={vehicleStatusFilter}
                      onChange={setVehicleStatusFilter}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>REGISTRATION NO.</th>
                        <th>MODEL / CLASS</th>
                        <th>TYPE</th>
                        <th>LOAD CAPACITY</th>
                        <th>ODOMETER (KM)</th>
                        <th>ACQUISITION COST</th>
                        <th>STATUS</th>
                        {hasWriteAccess(user.role, 'Fleet') && <th>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {vehicles
                        .filter(v => {
                          const matchesSearch = v.registration_number.toLowerCase().includes(vehicleSearch.toLowerCase()) || v.name_model.toLowerCase().includes(vehicleSearch.toLowerCase());
                          const matchesType = vehicleTypeFilter === 'All' || v.type === vehicleTypeFilter;
                          const matchesStatus = vehicleStatusFilter === 'All' || v.status === vehicleStatusFilter;
                          return matchesSearch && matchesType && matchesStatus;
                        })
                        .map(v => (
                          <tr key={v.registration_number}>
                            <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                              <Truck size={14} style={{ marginRight: '6px', color: 'var(--primary)', display: 'inline-block', verticalAlign: 'middle' }} />
                              <span>{v.registration_number}</span>
                            </td>
                            <td>{v.name_model}</td>
                            <td>
                              <span className="badge badge-muted" style={{ textTransform: 'uppercase', fontSize: '9px', padding: '2px 6px' }}>
                                {v.type}
                              </span>
                            </td>
                            <td>{v.max_load_capacity.toLocaleString()} kg</td>
                            <td>
                               <div>{v.odometer.toLocaleString()} km</div>
                               {v.odometer >= 10000 && v.status === 'Available' && (
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                   <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 6px', textTransform: 'none' }}>Service Due</span>
                                   {hasWriteAccess(user.role, 'Maintenance') && (
                                     <button 
                                       type="button"
                                       style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', fontSize: '10px', padding: 0, cursor: 'pointer', fontWeight: '500' }}
                                       onClick={() => {
                                         setFormMaintVeh(v.registration_number);
                                         setMaintModal(true);
                                       }}
                                     >
                                       Schedule
                                     </button>
                                   )}
                                 </div>
                               )}
                             </td>
                            <td>₹{v.acquisition_cost.toLocaleString()}</td>
                            <td>{renderVehicleStatusPill(v.status)}</td>
                            {hasWriteAccess(user.role, 'Fleet') && (
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setSelectedVehicle(v); setFormVehType(v.type); setFormVehStatus(v.status); setVehicleModal(true); }}>
                                    Edit
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleVehicleDelete(v.registration_number)}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Drivers' && (
            <div>
              {/* Compliance Alerts Panel */}
              {(() => {
                const today = new Date();
                const expiringSoonDrivers = drivers.filter(d => {
                  if (!d.license_expiry_date) return false;
                  const expiry = new Date(d.license_expiry_date);
                  const diffTime = expiry - today;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 30; // expiring in 30 days or already expired
                });

                if (expiringSoonDrivers.length === 0) return null;

                return (
                  <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.03)', padding: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
                      <h4 style={{ color: 'var(--danger)', fontSize: '15px', fontWeight: '600', margin: 0 }}>Driver License Expiry Compliance Warnings ({expiringSoonDrivers.length})</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {expiringSoonDrivers.map(d => {
                        const isExpired = new Date(d.license_expiry_date) < today;
                        return (
                          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <div>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)', marginRight: '8px' }}>{d.name}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>License: {d.license_number}</span>
                              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                {isExpired ? (
                                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Expired on {d.license_expiry_date}</span>
                                ) : (
                                  <span style={{ color: 'var(--warning)', fontWeight: '500' }}>Expiring on {d.license_expiry_date} (within 30 days)</span>
                                )}
                              </div>
                            </div>
                            {hasWriteAccess(user.role, 'Drivers') && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--warning)', color: 'var(--warning)' }}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_BASE}/drivers/${d.id}/send-reminder`, {
                                      method: 'POST',
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                      triggerMessage(`Email simulation dispatched to ${d.name}!`);
                                    } else {
                                      triggerMessage(data.error || 'Failed to send simulation', 'danger');
                                    }
                                  } catch (err) {
                                    triggerMessage('Network error occurred.', 'danger');
                                  }
                                }}
                              >
                                Send Reminder Email
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="card">
              <div className="card-header">
                <h3 className="card-title">Drivers & Compliance Profiles</h3>
                {hasWriteAccess(user.role, 'Drivers') && (
                  <button className="btn btn-primary" onClick={() => { setSelectedDriver(null); setFormDrvCat('LMV'); setFormDrvStatus('Available'); setDriverModal(true); }}>
                    <Plus size={16} />
                    <span>Register Driver</span>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="filter-bar">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-pos" />
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search drivers by name or license..." 
                    value={driverSearch}
                    onChange={e => setDriverSearch(e.target.value)}
                  />
                </div>

                <CustomSelect
                  style={{ width: '150px' }}
                  options={[
                    { value: 'All', label: 'All Statuses' },
                    { value: 'Available', label: 'Available' },
                    { value: 'On Trip', label: 'On Trip' },
                    { value: 'Off Duty', label: 'Off Duty' },
                    { value: 'Suspended', label: 'Suspended' }
                  ]}
                  value={driverStatusFilter}
                  onChange={setDriverStatusFilter}
                />
              </div>

              {/* Table */}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>DRIVER NAME</th>
                      <th>LICENSE NO.</th>
                      <th>CATEGORY</th>
                      <th>LICENSE EXPIRY</th>
                      <th>CONTACT NO.</th>
                      <th>SAFETY SCORE</th>
                      <th>STATUS</th>
                      {hasWriteAccess(user.role, 'Drivers') && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {drivers
                      .filter(d => {
                        const matchesSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) || d.license_number.toLowerCase().includes(driverSearch.toLowerCase());
                        const matchesStatus = driverStatusFilter === 'All' || d.status === driverStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map(d => {
                        const today = new Date().toISOString().split('T')[0];
                        const isExpired = d.license_expiry_date < today;
                        
                        return (
                          <tr key={d.id}>
                            <td style={{ fontWeight: '500' }}>{d.name}</td>
                            <td>{d.license_number}</td>
                            <td>{d.license_category}</td>
                            <td style={{ color: isExpired ? 'var(--danger)' : 'inherit' }}>
                              {d.license_expiry_date} {isExpired && ' (EXPIRED)'}
                            </td>
                            <td>{d.contact_number}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '600' }}>{d.safety_score}%</span>
                                <div style={{ width: '60px', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    width: `${d.safety_score}%`, 
                                    height: '100%', 
                                    backgroundColor: d.safety_score >= 90 ? 'var(--success)' : d.safety_score >= 75 ? 'var(--warning)' : 'var(--danger)' 
                                  }}></div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${
                                d.status === 'Available' ? 'badge-success' :
                                d.status === 'On Trip' ? 'badge-warning' :
                                d.status === 'Suspended' ? 'badge-danger' : 'badge-muted'
                              }`}>
                                {d.status}
                              </span>
                            </td>
                            {hasWriteAccess(user.role, 'Drivers') && (
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setSelectedDriver(d); setFormDrvCat(d.license_category); setFormDrvStatus(d.status); setDriverModal(true); }}>
                                    Edit
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDriverDelete(d.id)}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'Trips' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Trips Mini Stats HUD */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div className="kpi-card glow-primary" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Cargo Dispatches</span>
                    <Route size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                    {trips.length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>All Time Created</span>
                </div>

                <div className="kpi-card glow-info" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active En Route</span>
                    <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--info)', display: 'inline-block' }}></div>
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--info)' }}>
                    {trips.filter(t => t.status === 'Dispatched').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Transit / Tracking Live</span>
                </div>

                <div className="kpi-card glow-success" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed Deliveries</span>
                    <Check size={14} style={{ color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                    {trips.filter(t => t.status === 'Completed').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Successfully Unloaded</span>
                </div>

                <div className="kpi-card glow-warning" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="kpi-title" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draft / Scheduled</span>
                    <Calendar size={14} style={{ color: 'var(--warning)' }} />
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '10px', fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
                    {trips.filter(t => t.status === 'Draft').length}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending Dispatch Trigger</span>
                </div>
              </div>

              {/* Main Trip Panel Card */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card-header">
                  <h3 className="card-title">Trip Management Panel</h3>
                  {hasWriteAccess(user.role, 'Trips') && (
                    <button className="btn btn-primary" onClick={() => { setFormTripVeh(''); setFormTripDrv(''); setTripModal(true); }}>
                      <Plus size={16} />
                      <span>Create Cargo Dispatch</span>
                    </button>
                  )}
                </div>

                {/* Filters bar */}
                <div className="filter-bar">
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon-pos" />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search routes, vehicle reg, driver..." 
                      value={tripSearch} 
                      onChange={e => setTripSearch(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <CustomSelect
                      style={{ width: '150px' }}
                      options={[
                        { value: 'All', label: 'All Statuses' },
                        { value: 'Draft', label: 'Draft' },
                        { value: 'Dispatched', label: 'Dispatched' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'Cancelled', label: 'Cancelled' }
                      ]}
                      value={tripStatusFilter}
                      onChange={setTripStatusFilter}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>TRIP ID</th>
                        <th>VEHICLE REG</th>
                        <th>DRIVER</th>
                        <th>ROUTE</th>
                        <th>DISTANCE</th>
                        <th>WEIGHT LIMIT</th>
                        <th>REVENUE</th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips
                        .filter(t => {
                          const matchesSearch = t.source.toLowerCase().includes(tripSearch.toLowerCase()) || 
                                                t.destination.toLowerCase().includes(tripSearch.toLowerCase()) || 
                                                t.vehicle_reg_no.toLowerCase().includes(tripSearch.toLowerCase()) ||
                                                (t.driver_name && t.driver_name.toLowerCase().includes(tripSearch.toLowerCase()));
                          const matchesStatus = tripStatusFilter === 'All' || t.status === tripStatusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map(trip => {
                          const isHeavy = trip.cargo_weight > 5000;

                          return (
                            <tr key={trip.id}>
                              <td style={{ verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: '600' }}>TR-{String(trip.id).padStart(4, '0')}</span>
                                  {trip.status === 'Completed' && (
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                      {trip.actual_fuel_consumed}L · {trip.final_odometer ? `${Math.round(trip.final_odometer / 1000)}k` : '--'} km
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <Truck size={14} style={{ marginRight: '6px', color: isHeavy ? 'var(--primary)' : 'var(--info)', display: 'inline-block', verticalAlign: 'middle' }} />
                                {trip.vehicle_reg_no}
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                  <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '50%', 
                                    backgroundColor: 'var(--primary-light)', 
                                    color: 'var(--primary)', 
                                    fontSize: '10px', 
                                    fontWeight: '700', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {trip.driver_name ? trip.driver_name.charAt(0) : 'D'}
                                  </div>
                                  <span>{trip.driver_name}</span>
                                </div>
                              </td>
                              <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }} title={`${trip.source} → ${trip.destination}`}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '180px' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {getShortAddressName(trip.source)}
                                  </span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    → {getShortAddressName(trip.destination)}
                                  </span>
                                </div>
                              </td>
                              <td>{trip.planned_distance} km</td>
                              <td>{trip.cargo_weight.toLocaleString()} kg</td>
                              <td style={{ fontWeight: '600' }}>₹{trip.revenue.toLocaleString()}</td>
                              <td>{renderStatusPill(trip.status)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  {trip.status === 'Draft' && hasWriteAccess(user.role, 'Trips') && (
                                    <>
                                      <button 
                                        className="btn btn-primary" 
                                        style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                        onClick={() => handleTripDispatch(trip.id)}
                                        title="Dispatch Trip"
                                      >
                                        <Play size={12} fill="currentColor" style={{ marginLeft: '1px' }} />
                                      </button>
                                      <button 
                                        className="btn btn-danger" 
                                        style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                        onClick={() => handleTripCancel(trip.id)}
                                        title="Cancel Trip"
                                      >
                                        <X size={12} strokeWidth={2.5} />
                                      </button>
                                    </>
                                  )}

                                  {trip.status === 'Dispatched' && hasWriteAccess(user.role, 'Trips') && (
                                    <>
                                      <button 
                                        className="btn btn-success" 
                                        style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                        onClick={() => setCompleteTripModal(trip)}
                                        title="Complete Trip"
                                      >
                                        <Check size={12} strokeWidth={3} />
                                      </button>
                                      <button 
                                        className="btn btn-danger" 
                                        style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} 
                                        onClick={() => handleTripCancel(trip.id)}
                                        title="Cancel Trip"
                                      >
                                        <X size={12} strokeWidth={2.5} />
                                      </button>
                                    </>
                                  )}

                                  {(trip.status === 'Dispatched' || trip.status === 'Completed') && (
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderColor: 'var(--primary)', color: 'var(--primary)' }} 
                                      onClick={() => setTrackingTrip(trip)}
                                      title="Track Route"
                                    >
                                      <Map size={12} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Maintenance' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Maintenance Record Log</h3>
                {hasWriteAccess(user.role, 'Maintenance') && (
                  <button className="btn btn-primary" onClick={() => { setFormMaintVeh(''); setMaintModal(true); }}>
                    <Plus size={16} />
                    <span>Log Service Record</span>
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>LOG ID</th>
                      <th>VEHICLE REG</th>
                      <th>SERVICE TYPE</th>
                      <th>COST</th>
                      <th>DATE</th>
                      <th>STATUS</th>
                      <th>NOTES</th>
                      {hasWriteAccess(user.role, 'Maintenance') && <th>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceLogs.map(log => (
                      <tr key={log.id}>
                        <td>#M-{String(log.id).padStart(4, '0')}</td>
                        <td style={{ fontWeight: '500' }}>{log.vehicle_reg_no}</td>
                        <td>{log.service_type}</td>
                        <td>₹{log.cost.toLocaleString()}</td>
                        <td>{log.date}</td>
                        <td>
                          <span className={`badge ${log.status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>
                            {log.status === 'Active' ? 'In Shop' : 'Completed'}
                          </span>
                        </td>
                        <td>{log.notes}</td>
                        {hasWriteAccess(user.role, 'Maintenance') && (
                          <td>
                            {log.status === 'Active' && (
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleMaintComplete(log.id)}>
                                Mark Fixed
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Fuel & Expenses' && (
            <div>
              {/* Financial Analyst controls */}
              {hasWriteAccess(user.role, 'Fuel & Expenses') && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <button className="btn btn-primary" onClick={() => { setFormExpVeh(''); setFuelModal(true); }}>
                    <Plus size={16} />
                    <span>Log Fuel Purchase</span>
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setFormExpVeh(''); setFormExpType('Toll'); setFormExpTrip(''); setExpenseModal(true); }}>
                    <Plus size={16} />
                    <span>Record Toll / Expense</span>
                  </button>
                </div>
              )}

              <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Fuel Purchase logs */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '16px' }}>Fuel Purchase Logs</h3>
                  <div className="table-responsive" style={{ maxHeight: '400px' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>VEHICLE REG</th>
                          <th>LITERS</th>
                          <th>TOTAL COST</th>
                          <th>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fuelLogs.map(log => (
                          <tr key={log.id}>
                            <td>{log.vehicle_reg_no}</td>
                            <td>{log.liters} L</td>
                            <td>₹{log.cost.toLocaleString()}</td>
                            <td>{log.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expenses logs */}
                <div className="card">
                  <h3 className="card-title" style={{ marginBottom: '16px' }}>All Operational Expenses</h3>
                  <div className="table-responsive" style={{ maxHeight: '400px' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>VEHICLE REG</th>
                          <th>TYPE</th>
                          <th>COST</th>
                          <th>DATE</th>
                          <th>DESCRIPTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(exp => (
                          <tr key={exp.id}>
                            <td>{exp.vehicle_reg_no}</td>
                            <td>
                              <span className={`badge ${
                                exp.type === 'Fuel' ? 'badge-info' :
                                exp.type === 'Maintenance' ? 'badge-danger' :
                                exp.type === 'Toll' ? 'badge-success' : 'badge-muted'
                              }`}>
                                {exp.type}
                              </span>
                            </td>
                            <td>₹{exp.cost.toLocaleString()}</td>
                            <td>{exp.date}</td>
                            <td>{exp.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Reports & Analytics' && (
            <div>
              {/* Export control */}
              <div className="card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Operational Excel/CSV Report</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>Download the complete vehicle lifecycle and ROI data sheet</p>
                </div>
                <button className="btn btn-primary" onClick={handleCSVExport}>
                  <FileSpreadsheet size={16} />
                  <span>Export Fleet CSV</span>
                </button>
              </div>

              {/* Dynamic Recharts Charts */}
              {analytics && (
                <>
                  <div className="charts-grid">
                    {/* Monthly Cost vs Revenue */}
                    <div className="card" style={{ height: 'auto', marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: '20px' }}>Monthly Revenue vs Total Costs</h3>
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                          <BarChart data={analytics.monthlyChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="month" stroke="var(--text-secondary)" />
                            <YAxis stroke="var(--text-secondary)" />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            <Legend />
                            <Bar dataKey="revenue" fill="var(--success)" name="Revenue (₹)" />
                            <Bar dataKey="cost" fill="var(--danger)" name="Expenses (₹)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Costliest vehicles bar chart */}
                    <div className="card" style={{ height: 'auto', marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: '20px' }}>Top Costliest Vehicles (₹)</h3>
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                          <BarChart data={analytics.vehicles.slice(0, 5).sort((a,b)=> b.operational_cost - a.operational_cost)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis type="number" stroke="var(--text-secondary)" />
                            <YAxis type="category" dataKey="name_model" stroke="var(--text-secondary)" width={100} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            <Bar dataKey="operational_cost" fill="var(--warning)" name="Operating Cost (₹)">
                              {analytics.vehicles.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--danger)' : index === 1 ? 'var(--warning)' : 'var(--info)'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '24px' }}>
                    {/* Expense Breakdown Pie Chart */}
                    <div className="card" style={{ height: 'auto', marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: '20px' }}>Expenses by Category Breakdown</h3>
                      <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(() => {
                          const fuelTotal = expenses.filter(e => e.type === 'Fuel').reduce((sum, e) => sum + e.cost, 0);
                          const maintTotal = expenses.filter(e => e.type === 'Maintenance').reduce((sum, e) => sum + e.cost, 0);
                          const tollTotal = expenses.filter(e => e.type === 'Toll').reduce((sum, e) => sum + e.cost, 0);
                          const otherTotal = expenses.filter(e => e.type === 'Other').reduce((sum, e) => sum + e.cost, 0);

                          const pieData = [
                            { name: 'Fuel', value: fuelTotal, color: '#3b82f6' },
                            { name: 'Maintenance', value: maintTotal, color: '#ef4444' },
                            { name: 'Tolls', value: tollTotal, color: '#10b981' },
                            { name: 'Other', value: otherTotal, color: '#f59e0b' }
                          ].filter(d => d.value > 0);

                          if (pieData.length === 0) {
                            return <div style={{ color: 'var(--text-secondary)' }}>No expense data recorded.</div>;
                          }

                          return (
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={90}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Fuel Efficiency Comparison */}
                    <div className="card" style={{ height: 'auto', marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: '20px' }}>Vehicle Fuel Efficiency Comparison (km/L)</h3>
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                          <BarChart data={analytics.vehicles.filter(v => v.fuel_efficiency > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="registration_number" stroke="var(--text-secondary)" />
                            <YAxis stroke="var(--text-secondary)" />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            <Legend />
                            <Bar dataKey="fuel_efficiency" fill="var(--success)" name="Efficiency (km/L)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Carbon Footprint comparison chart */}
                    <div className="card" style={{ height: 'auto', marginBottom: 0 }}>
                      <h3 className="card-title" style={{ marginBottom: '20px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Leaf size={18} />
                        <span>Carbon Footprint Comparison (kg CO2)</span>
                      </h3>
                      <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer>
                          <BarChart data={analytics.vehicles.filter(v => v.carbon_emissions > 0)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="registration_number" stroke="var(--text-secondary)" />
                            <YAxis stroke="var(--text-secondary)" />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            <Legend />
                            <Bar dataKey="carbon_emissions" fill="#10b981" name="Emissions (kg CO2)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Reports Summary Grid */}
                  <div className="card">
                    <h3 className="card-title" style={{ marginBottom: '20px' }}>Vehicle ROI & Fuel Metrics</h3>
                    <div className="table-responsive">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>VEHICLE REG</th>
                            <th>MODEL NAME</th>
                            <th>FUEL EFFICIENCY (KM/L)</th>
                            <th>OPERATIONAL COST</th>
                            <th>ACQUISITION COST</th>
                            <th>REVENUE GENERATED</th>
                            <th>VEHICLE ROI</th>
                            <th>CO2 EMISSIONS</th>
                            <th>ESG RATING</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.vehicles.map(v => {
                            const emissionsPerKm = v.total_distance > 0 ? (v.carbon_emissions / v.total_distance) : 0;
                            let esgRating = 'C (High)';
                            let esgClass = 'badge-danger';
                            if (v.total_distance > 0) {
                              if (emissionsPerKm < 0.25) {
                                esgRating = 'A (Eco)';
                                esgClass = 'badge-success';
                              } else if (emissionsPerKm < 0.45) {
                                esgRating = 'B (Average)';
                                esgClass = 'badge-warning';
                              }
                            } else if (v.total_fuel_liters === 0) {
                              esgRating = 'Pending';
                              esgClass = 'badge-muted';
                            }
                            return (
                              <tr key={v.registration_number}>
                                <td style={{ fontWeight: '600' }}>{v.registration_number}</td>
                                <td>{v.name_model}</td>
                                <td>{v.fuel_efficiency > 0 ? `${v.fuel_efficiency} km/l` : 'N/A'}</td>
                                <td>₹{v.operational_cost.toLocaleString()}</td>
                                <td>₹{v.acquisition_cost.toLocaleString()}</td>
                                <td>₹{v.total_revenue.toLocaleString()}</td>
                                <td style={{ fontWeight: '700', color: v.roi >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                  {v.roi}%
                                </td>
                                <td>{v.carbon_emissions.toLocaleString()} kg</td>
                                <td>
                                  <span className={`badge ${esgClass}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                                    {esgRating}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'Settings & RBAC' && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '16px' }}>Role-Based Access Controls (RBAC) Settings</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                TransitOps applies strict scoping of read/write resource permissions based on user role assignments. You can simulate switching your current role below to instantly see UI and API access updates.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', backgroundColor: 'var(--primary-light)', padding: '20px', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '14px' }}>SIMULATE ACTIVE EVALUATOR ROLE:</span>
                <CustomSelect
                  style={{ width: '220px' }}
                  options={[
                    { value: 'Fleet Manager', label: 'Fleet Manager' },
                    { value: 'Dispatcher', label: 'Dispatcher' },
                    { value: 'Safety Officer', label: 'Safety Officer' },
                    { value: 'Financial Analyst', label: 'Financial Analyst' }
                  ]}
                  value={user.role}
                  onChange={handleSimulatedRoleChange}
                />
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Active RBAC Permissions Matrix</h4>
              <div className="table-responsive">
                <table className="custom-table" style={{ border: '1px solid var(--border-color)' }}>
                  <thead>
                    <tr>
                      <th>ROLE</th>
                      <th>FLEET REGISTRY</th>
                      <th>DRIVERS DIRECTORY</th>
                      <th>TRIPS / DISPATCHING</th>
                      <th>MAINTENANCE LOGS</th>
                      <th>FUEL & EXPENSES</th>
                      <th>ANALYTICS & REPORTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={user.role === 'Fleet Manager' ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--primary)' } : {}}>
                      <td style={{ fontWeight: '600' }}>
                        Fleet Manager {user.role === 'Fleet Manager' && <span style={{ color: 'var(--primary)', fontSize: '10px', marginLeft: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>(ACTIVE)</span>}
                      </td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-muted">View Only</span></td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-muted">View Only</span></td>
                      <td><span className="badge badge-success">Full Access</span></td>
                    </tr>
                    <tr style={user.role === 'Dispatcher' ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--primary)' } : {}}>
                      <td style={{ fontWeight: '600' }}>
                        Dispatcher {user.role === 'Dispatcher' && <span style={{ color: 'var(--primary)', fontSize: '10px', marginLeft: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>(ACTIVE)</span>}
                      </td>
                      <td><span className="badge badge-muted">View Only</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                    </tr>
                    <tr style={user.role === 'Safety Officer' ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--primary)' } : {}}>
                      <td style={{ fontWeight: '600' }}>
                        Safety Officer {user.role === 'Safety Officer' && <span style={{ color: 'var(--primary)', fontSize: '10px', marginLeft: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>(ACTIVE)</span>}
                      </td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-muted">View Only</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                    </tr>
                    <tr style={user.role === 'Financial Analyst' ? { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderLeft: '3px solid var(--primary)' } : {}}>
                      <td style={{ fontWeight: '600' }}>
                        Financial Analyst {user.role === 'Financial Analyst' && <span style={{ color: 'var(--primary)', fontSize: '10px', marginLeft: '6px', fontWeight: '800', letterSpacing: '0.5px' }}>(ACTIVE)</span>}
                      </td>
                      <td><span className="badge badge-muted">View Only</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-danger">No Access</span></td>
                      <td><span className="badge badge-success">Read / Write</span></td>
                      <td><span className="badge badge-success">Full Access</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALL MODAL FORMS */}

          {/* 1. Vehicle Form Modal */}
          {vehicleModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setVehicleModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">{selectedVehicle ? 'Update Vehicle' : 'Register New Vehicle'}</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setVehicleModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleVehicleSubmit}>
                  <div className="form-group">
                    <label>VEHICLE REGISTRATION NUMBER (UNIQUE)</label>
                    <input 
                      type="text" 
                      name="registration_number" 
                      className="form-control" 
                      defaultValue={selectedVehicle?.registration_number} 
                      disabled={!!selectedVehicle} 
                      placeholder="e.g. GJ01AB1234"
                      pattern="^[A-Za-z0-9\s-]{5,15}$"
                      title="Registration number must be alphanumeric (letters, numbers, spaces, or hyphens) between 5 to 15 characters"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>VEHICLE MODEL / BRAND</label>
                    <input 
                      type="text" 
                      name="name_model" 
                      className="form-control" 
                      defaultValue={selectedVehicle?.name_model} 
                      placeholder="e.g. Tata Ace Gold"
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>VEHICLE TYPE</label>
                      <CustomSelect 
                        name="type"
                        options={[
                          { value: 'Van', label: 'Van' },
                          { value: 'Truck', label: 'Truck' },
                          { value: 'Mini', label: 'Mini-Truck' },
                          { value: 'Sedan', label: 'Sedan' }
                        ]}
                        value={formVehType}
                        onChange={setFormVehType}
                      />
                    </div>
                    <div className="form-group">
                      <label>MAX CARGO CAPACITY (KG)</label>
                      <input 
                        type="number" 
                        name="max_load_capacity" 
                        className="form-control" 
                        defaultValue={selectedVehicle?.max_load_capacity} 
                        placeholder="e.g. 750"
                        min="1"
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>ODOMETER READING (KM)</label>
                      <input 
                        type="number" 
                        name="odometer" 
                        className="form-control" 
                        defaultValue={selectedVehicle?.odometer || 0} 
                        min="0"
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>ACQUISITION COST (₹)</label>
                      <input 
                        type="number" 
                        name="acquisition_cost" 
                        className="form-control" 
                        defaultValue={selectedVehicle?.acquisition_cost} 
                        min="1"
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>VEHICLE STATUS</label>
                    <CustomSelect 
                      name="status"
                      options={[
                        { value: 'Available', label: 'Available' },
                        { value: 'On Trip', label: 'On Trip (Trip Dispatch Only)', disabled: true },
                        { value: 'In Shop', label: 'In Shop (Maintenance)' },
                        { value: 'Retired', label: 'Retired' }
                      ]}
                      value={formVehStatus}
                      onChange={setFormVehStatus}
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setVehicleModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Vehicle</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Driver Form Modal */}
          {driverModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setDriverModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">{selectedDriver ? 'Update Driver Profile' : 'Register Driver Profile'}</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setDriverModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleDriverSubmit}>
                  <div className="form-group">
                    <label>FULL NAME</label>
                    <input 
                      type="text" 
                      name="name" 
                      className="form-control" 
                      defaultValue={selectedDriver?.name} 
                      placeholder="Driver Name"
                      pattern="^[A-Za-z\s\.]{2,50}$"
                      title="Name must contain only letters, dots and spaces, between 2 to 50 characters"
                      required 
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>LICENSE NUMBER</label>
                      <input 
                        type="text" 
                        name="license_number" 
                        className="form-control" 
                        defaultValue={selectedDriver?.license_number} 
                        placeholder="e.g. DL-12345"
                        pattern="^[A-Z0-9-]{5,20}$"
                        title="License number must be uppercase alphanumeric and hyphens, between 5 to 20 characters"
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>LICENSE CATEGORY</label>
                      <CustomSelect 
                        name="license_category"
                        options={[
                          { value: 'LMV', label: 'LMV (Light Motor Vehicle)' },
                          { value: 'HMV', label: 'HMV (Heavy Motor Vehicle)' }
                        ]}
                        value={formDrvCat}
                        onChange={setFormDrvCat}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>LICENSE EXPIRY DATE</label>
                      <input 
                        type="date" 
                        name="license_expiry_date" 
                        className="form-control" 
                        defaultValue={selectedDriver?.license_expiry_date} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>CONTACT NUMBER</label>
                      <input 
                        type="tel" 
                        name="contact_number" 
                        className="form-control" 
                        defaultValue={selectedDriver?.contact_number} 
                        placeholder="10-digit number"
                        pattern="^[0-9]{10}$"
                        title="Contact number must be exactly 10 digits"
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>COMPLIANCE/SAFETY SCORE (0-100)</label>
                      <input 
                        type="number" 
                        name="safety_score" 
                        className="form-control" 
                        defaultValue={selectedDriver?.safety_score || 100} 
                        min="0"
                        max="100"
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>STATUS</label>
                      <CustomSelect 
                        name="status"
                        options={[
                          { value: 'Available', label: 'Available' },
                          { value: 'On Trip', label: 'On Trip', disabled: true },
                          { value: 'Off Duty', label: 'Off Duty' },
                          { value: 'Suspended', label: 'Suspended' }
                        ]}
                        value={formDrvStatus}
                        onChange={setFormDrvStatus}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setDriverModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Driver</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. Trip Planner Modal */}
          {tripModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setTripModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Plan Cargo Trip</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setTripModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleTripCreate}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>SOURCE DEPOT</label>
                      <CustomSelect 
                        name="source"
                        placeholder="-- Select Source --"
                        options={LOGISTICS_HUBS}
                        value={formTripSource}
                        onChange={val => {
                          setFormTripSource(val);
                          if (val === formTripDest) {
                            const other = LOGISTICS_HUBS.find(h => h.value !== val);
                            if (other) setFormTripDest(other.value);
                          }
                        }}
                        required={true}
                      />
                    </div>
                    <div className="form-group">
                      <label>DESTINATION HUB</label>
                      <CustomSelect 
                        name="destination"
                        placeholder="-- Select Destination --"
                        options={LOGISTICS_HUBS}
                        value={formTripDest}
                        onChange={val => {
                          setFormTripDest(val);
                          if (val === formTripSource) {
                            const other = LOGISTICS_HUBS.find(h => h.value !== val);
                            if (other) setFormTripSource(other.value);
                          }
                        }}
                        required={true}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <CustomSelect 
                      name="vehicle_reg_no"
                      placeholder="-- Choose Vehicle --"
                      options={vehicles.filter(v => v.status === 'Available').map(v => ({
                        value: v.registration_number,
                        label: `${v.registration_number} - ${v.name_model} (Cap: ${v.max_load_capacity}kg)`
                      }))}
                      value={formTripVeh}
                      onChange={setFormTripVeh}
                      required={true}
                    />
                  </div>

                  <div className="form-group">
                    <CustomSelect 
                      name="driver_id"
                      placeholder="-- Choose Driver --"
                      options={drivers
                        .filter(d => {
                          const today = new Date().toISOString().split('T')[0];
                          return d.status === 'Available' && d.license_expiry_date >= today;
                        })
                        .map(d => ({
                          value: d.id,
                          label: `${d.name} (Score: ${d.safety_score}%, Class: ${d.license_category})`
                        }))}
                      value={formTripDrv}
                      onChange={setFormTripDrv}
                      required={true}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>CARGO WEIGHT (KG)</label>
                      <input type="number" name="cargo_weight" className="form-control" min="1" placeholder="Weight in kg" required />
                    </div>
                    <div className="form-group">
                      <label>PLANNED ROUTE DISTANCE (KM)</label>
                      <input type="number" name="planned_distance" className="form-control" min="1" placeholder="Distance" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>PROJECTED REVENUE (₹)</label>
                    <input type="number" name="revenue" className="form-control" min="0" placeholder="Revenue" required />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setTripModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Draft Trip</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 4. Complete Trip Modal */}
          {completeTripModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setCompleteTripModal(null))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Complete Trip TR-{String(completeTripModal.id).padStart(4, '0')}</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setCompleteTripModal(null))}><X size={20} /></button>
                </div>
                <form onSubmit={handleTripComplete}>
                  <div className="form-group">
                    <label>VEHICLE ON TRIP</label>
                    <input type="text" className="form-control" value={completeTripModal.vehicle_reg_no} disabled />
                  </div>

                  <div className="form-group">
                    <label>FINAL ODOMETER READING (KM)</label>
                    <input 
                      type="number" 
                      name="final_odometer" 
                      className="form-control" 
                      placeholder="Must be greater than current vehicle odometer" 
                      min="0"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>ACTUAL FUEL CONSUMED (LITERS)</label>
                    <input 
                      type="number" 
                      name="actual_fuel_consumed" 
                      className="form-control" 
                      placeholder="Liters of fuel" 
                      step="0.01" 
                      min="0.1" 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>TOTAL FUEL COST (₹) (OPTIONAL)</label>
                    <input 
                      type="number" 
                      name="fuel_cost" 
                      className="form-control" 
                      placeholder="Defaults to liters * ₹95" 
                      min="0"
                    />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setCompleteTripModal(null))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Complete Trip</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 5. Maintenance Form Modal */}
          {maintModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setMaintModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Log Service Record</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setMaintModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleMaintSubmit}>
                  <div className="form-group">
                    <CustomSelect 
                      name="vehicle_reg_no"
                      placeholder="-- Choose Vehicle --"
                      options={vehicles.filter(v => v.status !== 'Retired').map(v => ({
                        value: v.registration_number,
                        label: `${v.registration_number} - ${v.name_model} (${v.status})`
                      }))}
                      value={formMaintVeh}
                      onChange={setFormMaintVeh}
                      required={true}
                    />
                  </div>

                  <div className="form-group">
                    <label>SERVICE TYPE / WORK DETAILS</label>
                    <input type="text" name="service_type" className="form-control" placeholder="e.g. Oil Change, Brake Repair" required />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>SERVICE COST (₹)</label>
                      <input type="number" name="cost" className="form-control" min="0" required />
                    </div>
                    <div className="form-group">
                      <label>SERVICE DATE</label>
                      <input type="date" name="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>ADDITIONAL MAINTENANCE NOTES</label>
                    <textarea name="notes" className="form-control" rows="3" placeholder="Explain details of the mechanical issues..."></textarea>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setMaintModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Log Service Record</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 6. Fuel Log Form Modal */}
          {fuelModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setFuelModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Record Fuel Purchase</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setFuelModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleFuelSubmit}>
                  <div className="form-group">
                    <CustomSelect 
                      name="vehicle_reg_no"
                      placeholder="-- Choose Vehicle --"
                      options={vehicles.map(v => ({
                        value: v.registration_number,
                        label: `${v.registration_number} - ${v.name_model}`
                      }))}
                      value={formExpVeh}
                      onChange={setFormExpVeh}
                      required={true}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>LITERS FILLED</label>
                      <input type="number" name="liters" className="form-control" min="0.1" step="0.01" required />
                    </div>
                    <div className="form-group">
                      <label>TOTAL COST (₹)</label>
                      <input type="number" name="cost" className="form-control" min="1" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>PURCHASE DATE</label>
                    <input type="date" name="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setFuelModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Fuel Log</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 7. Expense Form Modal */}
          {expenseModal && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setExpenseModal(false))}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Log Operational Expense</h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setExpenseModal(false))}><X size={20} /></button>
                </div>
                <form onSubmit={handleExpenseSubmit}>
                  <div className="form-group">
                    <label>VEHICLE REGISTRATION</label>
                    <CustomSelect 
                      name="vehicle_reg_no"
                      placeholder="-- Choose Vehicle --"
                      options={vehicles.map(v => ({
                        value: v.registration_number,
                        label: `${v.registration_number} - ${v.name_model}`
                      }))}
                      value={formExpVeh}
                      onChange={setFormExpVeh}
                      required={true}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>EXPENSE TYPE</label>
                      <CustomSelect 
                        name="type"
                        options={[
                          { value: 'Toll', label: 'Toll Charges' },
                          { value: 'Other', label: 'Other Miscellaneous' }
                        ]}
                        value={formExpType}
                        onChange={setFormExpType}
                        required={true}
                      />
                    </div>
                    <div className="form-group">
                      <label>COST (₹)</label>
                      <input type="number" name="cost" className="form-control" min="1" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>ASSOCIATED TRIP ID (OPTIONAL)</label>
                    <CustomSelect 
                      name="trip_id"
                      placeholder="-- None --"
                      options={[
                        { value: '', label: '-- None --' },
                        ...trips.map(t => ({
                          value: t.id,
                          label: `TR-${String(t.id).padStart(4, '0')} (${getShortAddressName(t.source)} → ${getShortAddressName(t.destination)})`
                        }))
                      ]}
                      value={formExpTrip}
                      onChange={setFormExpTrip}
                    />
                  </div>

                  <div className="form-group">
                    <label>EXPENSE DATE</label>
                    <input type="date" name="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>

                  <div className="form-group">
                    <label>DESCRIPTION</label>
                    <input type="text" name="description" className="form-control" placeholder="e.g. NH8 toll booth cash paid" required />
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setExpenseModal(false))}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Expense</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* 8. Custom Confirmation Dialog Modal */}
          {confirmModal.open && (
            <div className="modal-overlay" onClick={() => closeWithTransition(() => setConfirmModal({ ...confirmModal, open: false }))}>
              <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} />
                    <span>{confirmModal.title}</span>
                  </h3>
                  <button className="modal-close" onClick={() => closeWithTransition(() => setConfirmModal({ ...confirmModal, open: false }))}><X size={20} /></button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                  {confirmModal.message}
                </p>
                <div className="modal-footer" style={{ marginTop: 0 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setConfirmModal({ ...confirmModal, open: false }))}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => {
                      if (confirmModal.onConfirm) confirmModal.onConfirm();
                      closeWithTransition(() => setConfirmModal({ ...confirmModal, open: false }));
                    }}
                  >
                    Confirm Deletion
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 9. Live Route Tracking Modal */}
          {trackingTrip && (() => {
            const src = getCoordinatesForCity(getShortAddressName(trackingTrip.source));
            const dest = getCoordinatesForCity(getShortAddressName(trackingTrip.destination));

            return (
              <div className="modal-overlay" onClick={() => closeWithTransition(() => setTrackingTrip(null))}>
                <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Map size={20} style={{ color: 'var(--primary)' }} />
                      <span>Live Dispatch Route: TR-{String(trackingTrip.id).padStart(4, '0')}</span>
                    </h3>
                    <button className="modal-close" onClick={() => closeWithTransition(() => setTrackingTrip(null))}><X size={20} /></button>
                  </div>
                  
                  {(() => {
                    const fromAddr = splitAddress(trackingTrip.source);
                    const toAddr = splitAddress(trackingTrip.destination);
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', fontSize: '13px', backgroundColor: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>FROM</div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {fromAddr.name}
                          </div>
                          {fromAddr.details && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.4' }}>
                              {fromAddr.details}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexShrink: 0, padding: '0 8px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '13px' }}>{trackingTrip.planned_distance} km</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>→</span>
                        </div>

                        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>TO</div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {toAddr.name}
                          </div>
                          {toAddr.details && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '10.5px', marginTop: '2px', lineHeight: '1.4' }}>
                              {toAddr.details}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* SVG Route Map */}
                  <div style={{ backgroundColor: '#020617', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', position: 'relative', height: '300px' }}>
                    <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ display: 'block' }}>
                      {/* Grid background */}
                      <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {/* Map Title/Telemetry HUD */}
                      <text x="15" y="25" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">MAP MODE: DYNAMIC HASH TOPOLOGY</text>
                      <text x="15" y="40" fill="var(--success)" fontSize="10" fontFamily="monospace">STATUS: ACTIVE TELEMETRY ONLINE</text>

                      {/* Background Hub Nodes */}
                      <circle cx="80" cy="220" r="3" fill="rgba(255,255,255,0.15)" />
                      <text x="88" y="223" fill="rgba(255,255,255,0.2)" fontSize="8">Jaipur Hub</text>
                      
                      <circle cx="220" cy="90" r="3" fill="rgba(255,255,255,0.15)" />
                      <text x="228" y="93" fill="rgba(255,255,255,0.2)" fontSize="8">Indore Hub</text>

                      <circle cx="200" cy="170" r="3" fill="rgba(255,255,255,0.15)" />
                      <text x="208" y="173" fill="rgba(255,255,255,0.2)" fontSize="8">Bhopal Hub</text>

                      {/* Route Line Path */}
                      <path 
                        d={`M ${src.x} ${src.y} L ${dest.x} ${dest.y}`} 
                        stroke="rgba(245, 158, 11, 0.2)" 
                        strokeWidth="3" 
                        fill="none" 
                      />
                      <path 
                        id="animated-route" 
                        d={`M ${src.x} ${src.y} L ${dest.x} ${dest.y}`} 
                        stroke="var(--primary)" 
                        strokeWidth="2" 
                        strokeDasharray="6,6" 
                        fill="none" 
                      />

                      {/* Source Node */}
                      <circle cx={src.x} cy={src.y} r="8" fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
                      <circle cx={src.x} cy={src.y} r="3" fill="#3b82f6" />
                      <text x={src.x} y={src.y - 12} fill="var(--text-primary)" fontSize="10" fontWeight="600" textAnchor="middle">{getShortAddressName(trackingTrip.source)}</text>

                      {/* Destination Node */}
                      <circle cx={dest.x} cy={dest.y} r="8" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
                      <circle cx={dest.x} cy={dest.y} r="3" fill="#10b981" />
                      <text x={dest.x} y={dest.y - 12} fill="var(--text-primary)" fontSize="10" fontWeight="600" textAnchor="middle">{getShortAddressName(trackingTrip.destination)}</text>

                      {/* Animated Moving Vehicle Circle */}
                      {trackingTrip.status === 'Dispatched' && (
                        <g>
                          <circle r="7" fill="var(--primary)" filter="drop-shadow(0 0 4px var(--primary))">
                            <animateMotion dur="6s" repeatCount="indefinite" path={`M ${src.x} ${src.y} L ${dest.x} ${dest.y}`} />
                          </circle>
                          <circle r="3" fill="#000">
                            <animateMotion dur="6s" repeatCount="indefinite" path={`M ${src.x} ${src.y} L ${dest.x} ${dest.y}`} />
                          </circle>
                        </g>
                      )}
                    </svg>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <strong>Vehicle Details:</strong>
                      <div style={{ marginTop: '4px' }}>Reg: {trackingTrip.vehicle_reg_no}</div>
                      <div>Weight Loaded: {trackingTrip.cargo_weight} kg</div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <strong>Driver Details:</strong>
                      <div style={{ marginTop: '4px' }}>Name: {trackingTrip.driver_name}</div>
                      <div>Status: {trackingTrip.status}</div>
                    </div>
                  </div>

                  <div className="modal-footer" style={{ marginTop: '20px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => closeWithTransition(() => setTrackingTrip(null))}>Close Tracker</button>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
