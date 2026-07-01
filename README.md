# 🎯 Armaria Airsoft

Sistema simples e intuitivo de gestão para armaria de airsoft.

## Funcionalidades

- **Painel** — resumo de clientes, equipamentos, ordens em aberto e alertas de estoque baixo.
- **Cadastro de clientes** — dados de contato, aceite de marketing e histórico.
- **Equipamentos por cliente** — tipo, marca, modelo, número de série e FPS atrelados ao dono.
- **Estoque individual de peças** — quantidade, estoque mínimo (alerta), preço, categoria e localização, com ajuste rápido (+/−).
- **Ordens de serviço** — problema, serviço, peças utilizadas (com baixa automática de estoque), mão de obra, status e total.
- **Geração de PDF da ordem** — guia com campo de assinatura do cliente, para levar na retirada do equipamento.
- **Remarketing** — sugestões de clientes para reconectar (sem contato há 90+ dias), aniversariantes do mês e registro de contatos.

## Tecnologia

- Node.js + Express (API REST)
- SQLite via better-sqlite3 (banco local, sem servidor externo)
- PDFKit (geração de PDF)
- Frontend em HTML/CSS/JS puro (sem build)

## Como executar

```bash
npm install
npm start
```

Acesse **http://localhost:3000**.

O banco `armory.db` é criado automaticamente na primeira execução.
Para usar outra porta: `PORT=8080 npm start`.

## Estrutura

```
server.js            # servidor Express e rota do PDF
db.js                # conexão SQLite e criação das tabelas
routes/              # clientes, equipamentos, pecas, ordens, remarketing
pdf/ordemServico.js  # geração do PDF da ordem de serviço
public/              # interface (index.html, styles.css, app.js)
```
