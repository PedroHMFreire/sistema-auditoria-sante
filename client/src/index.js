import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const LoadingScreen = () => (
  <div className="loading-container">
    <img src="/logo192.png" alt="Logo" className="loading-logo" />
    <h1 className="loading-slogan">Audite - Controle de Estoque Inteligente</h1>
    <div className="loader"></div>
  </div>
);

const RootComponent = () => {
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShowApp(true), 2000); // 2 segundos de loading
    return () => clearTimeout(timeout);
  }, []);

  return showApp ? <App /> : <LoadingScreen />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
