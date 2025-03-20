# Sistema de Auditoria Sante

Este é um sistema para auditoria de estoque, permitindo criar contagens, carregar dados de planilhas Excel, registrar contagens da loja e gerar relatórios.

## Estrutura do Projeto

- **`/client/`**: Frontend (React)
  - `src/ActiveCounts.js`: Página inicial para criar e gerenciar contagens.
  - `src/PastCounts.js`: Página para visualizar contagens salvas.
- **`/server/`**: Backend (Node.js/Express)
  - `server.js`: Servidor principal, com endpoints para gerenciar contagens.

## Como Executar

1. **Backend**:
   - Navegue até o diretório `/server`.
   - Execute `npm install` para instalar as dependências.
   - Execute `npm start` para iniciar o servidor.

2. **Frontend**:
   - Navegue até o diretório `/client`.
   - Execute `npm install` para instalar as dependências.
   - Execute `npm start` para iniciar o frontend.
