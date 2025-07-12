import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import './App.css';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Header />
          <main className="App-main">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
