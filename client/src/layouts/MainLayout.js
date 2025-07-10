import React from 'react';
import { useAuth } from '../context/AuthContext';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="app-title">AUDITÊ</h1>
        {user && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className="user-info">Olá, {user.email}</span>
            <button onClick={logout} className="btn secondary">Sair</button>
          </div>
        )}
      </header>

      <main className="App-main">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
