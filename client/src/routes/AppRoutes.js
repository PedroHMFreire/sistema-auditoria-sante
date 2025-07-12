import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../Login';
import Register from '../Register';
import Admin from '../Admin';
import ActiveCount from '../ActiveCount';
import CountDetail from '../CountDetail';
import CreatedCounts from '../CreatedCounts';
import { useAuth } from '../context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route path="/admin" element={isAuthenticated ? <Admin /> : <Navigate to="/login" />} />
      <Route path="/count/:id" element={isAuthenticated ? <CountDetail /> : <Navigate to="/login" />} />
      <Route path="/created-counts" element={isAuthenticated ? <CreatedCounts /> : <Navigate to="/login" />} />
      <Route path="/active-count" element={isAuthenticated ? <ActiveCount /> : <Navigate to="/login" />} />
      <Route path="/" element={isAuthenticated ? <Navigate to="/active-count" /> : <Navigate to="/login" />} />
    </Routes>
  );
};

export default AppRoutes;
