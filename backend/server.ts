
// ⚠️ AVISO DE SEGURANÇA (auditoria 07/10/2026)
// Este servidor é um rascunho antigo e NÃO é usado pelo sistema (o app guarda os dados no navegador).
// Ele não tem autenticação, aceita qualquer origem (CORS aberto) e grava o corpo da requisição direto
// no banco (sem validação). Se for publicado como está, qualquer pessoa na internet poderia ler e
// alterar dados. Por isso ele se recusa a iniciar, a menos que seja liberado de propósito.
if (process.env.AWG_LIBERAR_BACKEND_INSEGURO !== 'sim') {
  console.error('backend/server.ts está desativado por segurança (sem autenticação). Veja o aviso no topo do arquivo.');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Fix: Define __dirname for ESM environments where it is not globally available
const __dirname = path.resolve();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Transactions Routes
app.get('/api/transactions', async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    include: { category: true, account: true, entity: true }
  });
  res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
  const transaction = await prisma.transaction.create({ data: req.body });
  res.status(201).json(transaction);
});

// Categories Routes
app.get('/api/categories', async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// Settings Routes
app.get('/api/settings', async (req, res) => {
  const settings = await prisma.settings.findFirst();
  res.json(settings);
});

app.put('/api/settings', async (req, res) => {
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: req.body
  });
  res.json(settings);
});

// Server initiation
app.listen(PORT, () => {
  console.log(`Backend AwgFinanceiro rodando na porta ${PORT}`);
});
