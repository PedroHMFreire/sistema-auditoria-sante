import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (emailInputRef.current) emailInputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage('Preencha todos os campos.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, {
        email,
        password
      });

      onLogin(response.data.token);
      setMessage('');
      navigate('/active-count');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Entrar no Sistema</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email:</label>
          <input
            type="email"
            ref={emailInputRef}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-input"
            placeholder="seu@email.com"
            required
          />
        </div>
        <div className="field">
          <label>Senha:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-input"
            placeholder="Digite sua senha"
            required
          />
        </div>
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      {message && <p className="count-info" style={{ color: 'red' }}>{message}</p>}
      <p style={{ marginTop: '1rem' }}>
        Não tem conta? <a href="/register">Registre-se</a>
      </p>
    </div>
  );
};

export default Login;
