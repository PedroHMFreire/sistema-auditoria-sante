import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../Login';
import Register from '../Register';
import Admin from '../Admin';
import CountDetail from '../CountDetail';
import CreatedCounts from '../CreatedCounts';
import ActiveCount from '../ActiveCount';
import PrivateRoute from './PrivateRoute';
import MainLayout from '../layouts/MainLayout';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/admin" element={<PrivateRoute><MainLayout><Admin /></MainLayout></PrivateRoute>} />
      <Route path="/count/:id" element={<PrivateRoute><MainLayout><CountDetail /></MainLayout></PrivateRoute>} />
      <Route path="/created-counts" element={<PrivateRoute><MainLayout><CreatedCounts /></MainLayout></PrivateRoute>} />
      <Route path="/active-count" element={<PrivateRoute><MainLayout><ActiveCount /></MainLayout></PrivateRoute>} />

      <Route path="/" element={<Navigate to="/active-count" />} />
    </Routes>
  );
};

export default AppRoutes;
