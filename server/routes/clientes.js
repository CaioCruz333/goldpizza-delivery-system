const express = require('express');
const Cliente = require('../models/Cliente');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Buscar cliente por telefone OU email (para o sistema público)
router.post('/buscar', async (req, res) => {
  try {
    const { telefone, email } = req.body;
    
    // Criar query para buscar por telefone OU email
    const query = { ativo: true };
    const conditions = [];
    
    if (telefone) {
      conditions.push({ telefone });
    }
    
    if (email) {
      conditions.push({ email });
    }
    
    if (conditions.length === 0) {
      return res.status(400).json({ message: 'Telefone ou email deve ser fornecido' });
    }
    
    query.$or = conditions;
    
    const cliente = await Cliente.findOne(query);
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar cliente por telefone (para o sistema público) - mantido para compatibilidade
router.get('/telefone/:telefone', async (req, res) => {
  try {
    const { telefone } = req.params;
    const cliente = await Cliente.findOne({ telefone, ativo: true });
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo cliente
router.post('/', async (req, res) => {
  try {
    const { nome, telefone, email, enderecos, observacoes } = req.body;
    
    // Verificar se já existe cliente com este telefone ou email
    const conditions = [];
    if (telefone) conditions.push({ telefone });
    if (email) conditions.push({ email });
    
    if (conditions.length > 0) {
      const clienteExistente = await Cliente.findOne({ $or: conditions });
      if (clienteExistente) {
        const campo = clienteExistente.telefone === telefone ? 'telefone' : 'email';
        return res.status(400).json({ message: `Já existe um cliente com este ${campo}` });
      }
    }
    
    const cliente = new Cliente({
      nome,
      telefone,
      email,
      enderecos: enderecos || [],
      observacoes
    });
    
    await cliente.save();
    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Já existe um cliente com este telefone' });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar todos os clientes (admin)
router.get('/', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    let query = { ativo: true };
    
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { telefone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clientes = await Cliente.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Cliente.countDocuments(query);
    
    res.json({
      clientes,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar cliente por ID
router.get('/:id', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    const { nome, telefone, email, enderecos, observacoes } = req.body;
    
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    // Verificar se o telefone já existe em outro cliente
    if (telefone !== cliente.telefone) {
      const clienteExistente = await Cliente.findOne({ 
        telefone,
        _id: { $ne: req.params.id }
      });
      if (clienteExistente) {
        return res.status(400).json({ message: 'Já existe um cliente com este telefone' });
      }
    }
    
    cliente.nome = nome;
    cliente.telefone = telefone;
    cliente.email = email || '';
    cliente.enderecos = enderecos || [];
    cliente.observacoes = observacoes || '';
    
    await cliente.save();
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Adicionar endereço ao cliente
router.post('/:id/enderecos', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    cliente.enderecos.push(req.body);
    await cliente.save();
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Remover endereço do cliente
router.delete('/:id/enderecos/:enderecoId', async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    
    cliente.enderecos.id(req.params.enderecoId).remove();
    await cliente.save();
    
    res.json(cliente);
  } catch (error) {
    console.error('Erro ao remover endereço:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;