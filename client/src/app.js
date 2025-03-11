import React, { useState, useRef, useEffect } from 'react';
import Quagga from 'quagga';
import './App.css';

// URL base da API - facilita a mudança entre ambientes
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [code, setCode] = useState('');
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState({
    totalItems: 0,
    itemsCounted: 0,
    itemsWithDifference: 0,
    completionPercentage: 0
  });
  const [filterReport, setFilterReport] = useState({
    showOnlyDifferences: false,
    searchTerm: ''
  });
  const [lastScanned, setLastScanned] = useState([]);
  
  const scannerRef = useRef(null);
  const codeInputRef = useRef(null);

  // Função para mostrar mensagem de sucesso temporária
  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Função para mostrar mensagem de erro temporária
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Carregar planilha Excel
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Verificar se é um arquivo Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showError('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao carregar a planilha');
      }
      
      const data = await response.json();
      showSuccess(data.message);
      // Atualizar relatório após upload bem-sucedido
      handleReport();
    } catch (err) {
      showError(`Erro ao carregar planilha: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Contar item por código
  const handleCount = async () => {
    if (!code.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao registrar contagem');
      }
      
      const data = await response.json();
      
      // Adicionar à lista de últimos escaneados
      setLastScanned(prev => {
        const newList = [{ code: code.trim(), timestamp: new Date(), product: data.productName }].concat(prev.slice(0, 9));
        return newList;
      });
      
      setCode('');
      showSuccess(data.message);
      
      // Atualizar o relatório após contagem
      handleReport();
      
      // Foco no input para continuar escaneando
      if (codeInputRef.current) {
        codeInputRef.current.focus();
      }
    } catch (err) {
      showError(`Erro ao registrar contagem: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gerar relatório
  const handleReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/report`);
      
      if (!response.ok) {
        throw new Error('Erro ao gerar relatório');
      }
      
      const data = await response.json();
      setReport(data);
      
      // Calcular estatísticas
      const totalItems = data.length;
      const itemsCounted = data.filter(item => item.Contado > 0).length;
      const itemsWithDifference = data.filter(item => item.Diferença !== 0).length;
      const completionPercentage = totalItems > 0 ? (itemsCounted / totalItems) * 100 : 0;
      
      setStats({
        totalItems,
        itemsCounted,
        itemsWithDifference,
        completionPercentage: completionPercentage.toFixed(1)
      });
    } catch (err) {
      showError(`Erro ao gerar relatório: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Exportar relatório para Excel
  const handleExport = async () => {
    if (!report || report.length === 0) {
      showError('Não há dados para exportar');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/export`);
      
      if (!response.ok) {
        throw new Error('Erro ao exportar relatório');
      }
      
      // Baixar o arquivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_auditoria_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('Relatório exportado com sucesso!');
    } catch (err) {
      showError(`Erro ao exportar relatório: ${err.message}`);
    }
  };

  // Reiniciar contagem
  const handleReset = async () => {
    if (!window.confirm('Tem certeza que deseja zerar todas as contagens? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao reiniciar contagem');
      }
      
      showSuccess('Contagem reiniciada com sucesso!');
      setLastScanned([]);
      handleReport();
    } catch (err) {
      showError(`Erro ao reiniciar contagem: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar scanner de código de barras
  const startScanner = () => {
    setScanning(true);
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: { facingMode: 'environment' },
        area: { top: "0%", right: "0%", left: "0%", bottom: "0%" },
      },
      locator: {
        patchSize: 'medium',
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: { 
        readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'upc_reader'] 
      },
      locate: true
    }, (err) => {
      if (err) {
        console.error(err);
        showError('Erro ao iniciar o scanner: ' + err.message);
        setScanning(false);
        return;
      }
      Quagga.start();
    });

    // Melhorar a detecção
    let lastResult = null;
    let consecutiveEqual = 0;
    
    Quagga.onDetected((data) => {
      const scannedCode = data.codeResult.code;
      
      // Validar leitura com múltiplas confirmações
      if (scannedCode === lastResult) {
        consecutiveEqual++;
        
        // Apenas aceitar após 3 leituras iguais consecutivas
        if (consecutiveEqual >= 2) {
          setCode(scannedCode);
          lastResult = null;
          consecutiveEqual = 0;
          stopScanner();
          handleCount();
        }
      } else {
        lastResult = scannedCode;
        consecutiveEqual = 0;
      }
    });
  };

  // Parar scanner
  const stopScanner = () => {
    Quagga.stop();
    setScanning(false);
  };

  // Filtrar relatório
  const getFilteredReport = () => {
    if (!report) return [];
    
    return report.filter(item => {
      // Filtrar apenas itens com diferença se a opção estiver ativada
      if (filterReport.showOnlyDifferences && item.Diferença === 0) {
        return false;
      }
      
      // Filtrar por termo de busca (código ou nome do produto)
      if (filterReport.searchTerm.trim() !== '') {
        const searchLower = filterReport.searchTerm.toLowerCase();
        const codeMatch = item.Código.toString().toLowerCase().includes(searchLower);
        const productMatch = item.Produto.toLowerCase().includes(searchLower);
        return codeMatch || productMatch;
      }
      
      return true;
    });
  };

  // Lidar com teclas para facilitar uso (Enter para contar)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && code.trim()) {
      handleCount();
    }
  };

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (scanning) Quagga.stop();
    };
  }, [scanning]);

  // Filtrado relatório para exibição
  const filteredReport = getFilteredReport();

  return (
    <div className="App">
      <h1>Sistema de Auditoria Santê</h1>
      
      {/* Mensagens de feedback */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <section>
        <h2>Carregar Planilha</h2>
        <input 
          type="file" 
          accept=".xlsx,.xls" 
          onChange={handleUpload} 
          disabled={loading}
        />
        {loading && <div className="loading"><div className="loading-spinner"></div> Carregando...</div>}
      </section>
      
      <section>
        <h2>Contagem</h2>
        <input
          ref={codeInputRef}
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite ou escaneie o código"
          disabled={scanning || loading}
        />
        <button 
          onClick={handleCount} 
          disabled={!code.trim() || scanning || loading}
          className="success"
        >
          Contar
        </button>
        <button 
          onClick={startScanner} 
          disabled={scanning || loading}
        >
          {scanning ? 'Escaneando...' : 'Escanear com Câmera'}
        </button>
        {scanning && (
          <button 
            onClick={stopScanner} 
            className="danger"
          >
            Parar Escaneamento
          </button>
        )}
        
        {scanning && (
          <div className="scanner-container">
            <div ref={scannerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
        
        {/* Últimos itens escaneados */}
        {lastScanned.length > 0 && (
          <div className="last-scanned">
            <h3>Últimos Escaneados</h3>
            <ul>
              {lastScanned.map((item, index) => (
                <li key={index}>
                  {item.product || item.code} - {new Date(item.timestamp).toLocaleTimeString()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      
      <section>
        <h2>Relatório</h2>
        <div className="report-actions">
          <button onClick={handleReport} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar Relatório'}
          </button>
          <button onClick={handleExport} disabled={!report || loading}>
            Exportar para Excel
          </button>
          <button onClick={handleReset} disabled={loading} className="danger">
            Reiniciar Contagem
          </button>
        </div>
        
        {report && (
          <>
            {/* Resumo de estatísticas */}
            <div className="stats-summary">
              <div className="stat-card">
                <div className="stat-value">{stats.totalItems}</div>
                <div className="stat-label">Total de Itens</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.itemsCounted}</div>
                <div className="stat-label">Itens Contados</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.itemsWithDifference}</div>
                <div className="stat-label">Itens com Diferença</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.completionPercentage}%</div>
                <div className="stat-label">Progresso</div>
              </div>
            </div>
            
            {/* Filtros de relatório */}
            <div className="report-filters">
              <input
                type="text"
                placeholder="Buscar por código ou nome do produto"
                value={filterReport.searchTerm}
                onChange={(e) => setFilterReport({...filterReport, searchTerm: e.target.value})}
              />
              <label>
                <input
                  type="checkbox"
                  checked={filterReport.showOnlyDifferences}
                  onChange={(e) => setFilterReport({...filterReport, showOnlyDifferences: e.target.checked})}
                />
                Mostrar apenas itens com diferença
              </label>
            </div>
            
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
                {filteredReport.length > 0 ? (
                  filteredReport.map((item, index) => (
                    <tr key={index}>
                      <td>{item.Código}</td>
                      <td>{item.Produto}</td>
                      <td>{item.Saldo_Estoque}</td>
                      <td>{item.Contado}</td>
                      <td className={
                        item.Diferença < 0 
                          ? 'difference-negative' 
                          : item.Diferença > 0 
                            ? 'difference-positive' 
                            : 'difference-zero'
                      }>
                        {item.Diferença}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">Nenhum item encontrado com os filtros atuais</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

export default App;
