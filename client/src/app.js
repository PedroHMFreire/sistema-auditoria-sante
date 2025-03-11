import React, { useState, useRef, useEffect } from 'react';
import Quagga from 'quagga';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    await fetch('http://localhost:3000/upload', {
      method: 'POST',
      body: formData,
    });
    alert('Planilha carregada!');
  };

  const handleCount = async () => {
    if (!code) return;
    await fetch('http://localhost:3000/count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setCode('');
  };

  const handleReport = async () => {
    const res = await fetch('http://localhost:3000/report');
    const data = await res.json();
    setReport(data);
  };

  const startScanner = () => {
    setScanning(true);
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: { facingMode: 'environment' },
      },
      decoder: { readers: ['code_128_reader', 'ean_reader', 'upc_reader'] },
    }, (err) => {
      if (err) {
        console.error(err);
        setScanning(false);
        return;
      }
      Quagga.start();
    });

    Quagga.onDetected((data) => {
      const scannedCode = data.codeResult.code;
      setCode(scannedCode);
      handleCount();
      Quagga.stop();
      setScanning(false);
    });
  };

  const stopScanner = () => {
    Quagga.stop();
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scanning) Quagga.stop();
    };
  }, [scanning]);

  return (
    <div className="App">
      <h1>Sistema de Auditoria Santê</h1>
      <section>
        <h2>Carregar Planilha</h2>
        <input type="file" accept=".xlsx" onChange={handleUpload} />
      </section>
      <section>
        <h2>Contagem</h2>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite ou escaneie o código"
        />
        <button onClick={handleCount}>Contar</button>
        <button onClick={startScanner} disabled={scanning}>
          {scanning ? 'Escaneando...' : 'Escanear com Câmera'}
        </button>
        {scanning && <button onClick={stopScanner}>Parar Escaneamento</button>}
        {scanning && <div ref={scannerRef} style={{ width: '100%', height: '200px', marginTop: '10px' }} />}
      </section>
      <section>
        <h2>Relatório</h2>
        <button onClick={handleReport}>Gerar Relatório</button>
        {report && (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Saldo</th>
                <th>Contado</th>
                <th>Diferença</th>
              </tr>
            </thead>
            <tbody>
              {report.map((item, index) => (
                <tr key={index}>
                  <td>{item.Código}</td>
                  <td>{item.Produto}</td>
                  <td>{item.Saldo_Estoque}</td>
                  <td>{item.Contado}</td>
                  <td>{item.Diferença}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default App;