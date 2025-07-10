import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import Login from '../Login';
import Register from '../Register';
import Admin from '../Admin';
import CountDetail from '../CountDetail';
import CreatedCounts from '../CreatedCounts';
import ActiveCount from '../ActiveCount';
import PrivateRoute from './PrivateRoute';
import { AuthContext } from '../context/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated, login } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
      <Route path="/count/:id" element={<PrivateRoute><CountDetail /></PrivateRoute>} />
      <Route path="/created-counts" element={<PrivateRoute><CreatedCounts /></PrivateRoute>} />
      <Route path="/active-count" element={<PrivateRoute><ActiveCount /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/active-count" />} />
    </Routes>
  );
};

export default AppRoutes;
