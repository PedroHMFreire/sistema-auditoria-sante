import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Register from './Register';
import Admin from './Admin';
import CountDetail from './CountDetail';
import CreatedCounts from './CreatedCounts';
import ActiveCount from './ActiveCount';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.Authorization = `Bearer ${token}`;
      setIsAuthenticated(true);
      // Carregar dados do usuário (opcional)
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.Authorization = `Bearer ${token}`;
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    axios.defaults.headers.Authorization = null;
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1 className="app-title">AUDITÊ</h1>
          {isAuthenticated && <button onClick={handleLogout} className="btn secondary">Sair</button>}
        </header>
        <main className="App-main">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
            <Route path="/admin" element={isAuthenticated ? <Admin /> : <Navigate to="/login" />} />
            <Route path="/count/:id" element={isAuthenticated ? <CountDetail /> : <Navigate to="/login" />} />
            <Route path="/created-counts" element={isAuthenticated ? <CreatedCounts /> : <Navigate to="/login" />} />
            <Route path="/active-count" element={isAuthenticated ? <ActiveCount /> : <Navigate to="/login" />} />
            <Route path="/" element={isAuthenticated ? <Navigate to="/active-count" /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
