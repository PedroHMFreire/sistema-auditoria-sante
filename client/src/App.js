import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider, AuthContext } from './context/AuthContext';
import './App.css';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1 className="app-title">AUDITÊ</h1>
            <AuthContext.Consumer>
              {({ isAuthenticated, logout, user }) =>
                isAuthenticated && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {user?.email && <span className="user-info">Olá, {user.email}</span>}
                    <button onClick={logout} className="btn secondary">Sair</button>
                  </div>
                )
              }
            </AuthContext.Consumer>
          </header>
          <main className="App-main">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
