# 🎯 Armory — Armaria Airsoft
> **Full-stack inventory control, customer relations, and service order manager.**

Language / Idioma:
[🇺🇸 English](#-english-version) | [🇧🇷 Versão em Português](#-versao-em-portugues)

---

## 🇺🇸 English Version

Armory is a lightweight, responsive management system tailored for airsoft shops and armories. It streamlines tracking clients, their replicas, spare parts inventory, service orders with PDF receipt generation, and automated customer remarketing triggers.

### ✨ Key Features
- **Dashboard**: High-level overview of active clients, registered equipment, open orders, and automatic low-stock parts alerts.
- **Client & Equipment Registry**: Maintain detailed contacts, marketing agreements, and bind replicas with brand, serial numbers, model, and FPS stats.
- **Dynamic Parts Inventory**: Manage spare parts stock levels, minimum thresholds, locations, pricing, and fast quantity adjustment (+/−).
- **Service Orders (O.S.)**: Log issues, service detail, parts utilized (automatically deducts stock), labor rates, and overall totals.
- **PDF Generation**: Generates clean, printer-friendly service receipts with signature blocks for client pick-ups.
- **Customer Remarketing**: Built-in prompts to reconnect with clients inactive for 90+ days or celebrating birthdays.

### 🛠️ Technologies
- **Backend**: Node.js & Express (REST API)
- **Database**: SQLite via `better-sqlite3` (zero-configuration, embedded local DB)
- **PDF Generation**: PDFKit
- **Frontend**: Vanilla HTML / CSS / JS (Zero build step, optimized for fast loading)

### 🚀 Getting Started

#### Prerequisites
- Node.js (v16+) installed.

#### Installation
1. Install project dependencies:
   ```bash
   cd Armory
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to:
   👉 **http://localhost:3000**

*(The SQLite database `armory.db` will be initialized automatically on the first launch)*.

---

## 🇧🇷 Versão em Português

O Armory é um sistema de gestão integrado para oficinas de manutenção de airsoft e armarias. Simplifica o controle de clientes, equipamentos registrados, controle de estoque de peças, emissão de ordens de serviço (com PDF) e remarketing automático.

### ✨ Funcionalidades
- **Painel Geral**: Visão rápida de clientes ativos, equipamentos na oficina, ordens em aberto e alertas de estoque baixo.
- **Cadastro de Clientes e Equipamentos**: Histórico de contatos, dados de marketing, marca do equipamento, número de série, modelo e estatísticas de FPS.
- **Estoque de Peças**: Gerencie localizações de estoque, preços, níveis mínimos seguros para reposição e atalhos rápidos de controle (+/−).
- **Ordens de Serviço (O.S.)**: Registro de problemas, peças usadas (com baixa automatizada de estoque), valor da mão de obra e totalizador de preços.
- **Geração de PDF**: Emissão automática de ordens de serviço impressas prontas para assinatura do cliente no ato da entrega/retirada.
- **Remarketing**: Sugestões automáticas de reengajamento com clientes sumidos há mais de 90 dias ou aniversariantes.

### 🛠️ Tecnologias
- **Backend**: Node.js & Express (API REST)
- **Banco de Dados**: SQLite via `better-sqlite3` (banco de dados local integrado)
- **PDF**: PDFKit
- **Frontend**: HTML5 / CSS3 / JS Vanilla (Totalmente estático, sem necessidade de build)

### 🚀 Começando

#### Pré-requisitos
- Node.js (v16+) instalado.

#### Inicialização
1. Instale as dependências:
   ```bash
   cd Armory
   npm install
   ```
2. Inicie o servidor:
   ```bash
   npm start
   ```
3. Acesse no navegador:
   👉 **http://localhost:3000**
