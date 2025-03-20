# Sistema de Auditoria - AUDITÊ

Este é um sistema para auditoria de estoque, permitindo criar contagens, carregar dados de planilhas Excel, registrar contagens da loja e gerar relatórios. O sistema foi estilizado com um tema laranja e fundo preto, usando as fontes Poppins e Norwester.

## Estrutura do Projeto

- **`/client/`**: Frontend (React)
  - `src/ActiveCounts.js`: Página inicial para criar e gerenciar contagens.
  - `src/PastCounts.js`: Página para visualizar contagens salvas.
  - `src/App.css`: Estilos do sistema (tema laranja e preto, fontes personalizadas).
- **`/server/`**: Backend (Node.js/Express)
  - `server.js`: Servidor principal, com endpoints para gerenciar contagens.
  - `counts.json`: Arquivo onde as contagens são salvas (persistência).

## Como Executar Localmente

1. **Backend**:
   - Navegue até o diretório `/server`.
   - Execute `npm install` para instalar as dependências.
   - Execute `npm start` para iniciar o servidor.

2. **Frontend**:
   - Navegue até o diretório `/client`.
   - Execute `npm install` para instalar as dependências.
   - Execute `npm start` para iniciar o frontend.

## Deploy no Render

- O projeto está configurado para deploy no Render.
- Certifique-se de que o arquivo `render.yaml` está configurado corretamente.
- Faça o deploy com cache limpo para evitar problemas:
  1. Acesse o Render Dashboard.
  2. Crie um novo Web Service.
  3. Conecte o repositório GitHub.
  4. Configure:
     - **Runtime**: Node
     - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
     - **Start Command**: `cd server && npm start`
     - **Environment Variables**:
       - `NODE_ENV=production`
  5. Faça o deploy e acompanhe os logs.

## Notas

- O sistema agora usa um arquivo `counts.json` para persistência de dados. No entanto, no plano gratuito do Render, os dados podem ser perdidos em reinicializações completas.
- Para maior robustez, considere usar um banco de dados PostgreSQL no Render.
- O tema do sistema é laranja com fundo preto, com o título "AUDITÊ" e fontes personalizadas (Poppins e Norwester).