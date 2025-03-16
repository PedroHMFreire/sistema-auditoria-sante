import React, { useState, useRef } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import PastCounts from './PastCounts';

function App() {
  const [systemFile, setSystemFile] = useState(null);
  const [systemSummary, setSystemSummary] = useState(null);
  const [countTitle, setCountTitle] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [storeQuantity, setStoreQuantity] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [reportType, setReportType] = useState(null);
  const reportRef = useRef(null);

  const handleSystemFileChange = (e) => {
    setSystemFile(e.target.files[0]);
  };

  const handleUploadSystemExcel = async () => {
    if (!systemFile) {
      alert('Por favor, selecione um arquivo Excel.');
      return;
    }

    const formData = new FormData();
    formData.append('file', systemFile);

    try {
      const res = await fetch('/upload-system-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        setSystemSummary(data.summary);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo Excel:', error);
      alert('Erro ao fazer upload do arquivo Excel.');
    }
  };

  const handleUploadSystemText = async () => {
    if (!systemFile) {
      alert('Por favor, selecione um arquivo de texto.');
      return;
    }

    const formData = new FormData();
    formData.append('file', systemFile);

    try {
      const res = await fetch('/upload-system-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.message) {
        setSystemSummary(data.summary);
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo de texto:', error);
      alert('Erro ao fazer upload do arquivo de texto.');
    }
  };

  const handleSetCountTitle = async () => {
    if (!countTitle.trim()) {
      alert('Por favor, insira um título para a contagem.');
      return;
    }

    try {
      const res = await fetch('/set-count-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: countTitle }),
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao definir título:', error);
      alert('Erro ao definir título.');
    }
  };

  const handleCountStore = async () => {
    if (!storeCode.trim()) {
      alert('Por favor, insira um código da loja.');
      return;
    }
    const qty = storeQuantity.trim() ? parseInt(storeQuantity, 10) : 1; // Padrão 1 se em branco
    if (qty <= 0) {
      alert('Por favor, insira uma quantidade válida maior que 0.');
      return;
    }

    try {
      const res = await fetch('/count-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: storeCode, quantity: qty }),
      });
      const data = await res.json();
      if (data.message) {
        setStoreMessage(data.message);
        setStoreCode('');
        setStoreQuantity('');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao adicionar código da loja:', error);
      alert('Erro ao adicionar código da loja.');
    }
  };

  const handleSaveCount = async () => {
    try {
      const res = await fetch('/save-count', { method: 'POST' });
      const data = await res.json();
      alert(data.message);
    } catch (error) {
      console.error('Erro ao salvar contagem:', error);
      alert('Erro ao salvar contagem.');
    }
  };

  const handleFinalize = () => {
    setShowReportOptions(true);
    setFinalReport(null);
    setReportType(null);
  };

  const handleShowSyntheticReport = async () => {
    try {
      const res = await fetch('/report-synthetic');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
        setReportType('synthetic');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório sintético:', error);
      alert('Erro ao gerar relatório sintético.');
    }
  };

  const handleShowDetailedReport = async () => {
    try {
      const res = await fetch('/report-detailed');
      const data = await res.json();
      if (data.summary) {
        setFinalReport(data);
        setReportType('detailed');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar relatório detalhado:', error);
      alert('Erro ao gerar relatório detalhado.');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleSaveReportAsText = () => {
    if (!finalReport) return;

    const reportText = `
