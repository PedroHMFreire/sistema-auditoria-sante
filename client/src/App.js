import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ActiveCount from './ActiveCount';
import CreatedCounts from './CreatedCounts';
import CountDetail from './CountDetail';
import PastCounts from './PastCounts';
import './App.css';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTitleClick = () => {
    if (location.pathname === '/') {
      window.location.reload();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title" onClick={handleTitleClick} style={{ cursor: 'pointer' }}>
          AUDITÊ
        </h1>
      </header>
      <main className="App-main">
        <Routes>
          <Route path="/" element={<ActiveCount />} />
          <Route path="/created-counts" element={<CreatedCounts />} />
          <Route path="/count/:id" element={<CountDetail />} />
          <Route path="/past-counts" element={<PastCounts />} />
        </Routes>
      </main>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
