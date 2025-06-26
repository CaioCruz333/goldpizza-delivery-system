const express = require('express');
const ItemCardapio = require('../models/Cardapio');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Listar todos os sabores de uma pizzaria
router.get('/pizzaria/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;

    // Verificar permissões - admin pode acessar qualquer pizzaria
    if (req.user.role === 'admin') {
      // Admin pode acessar qualquer pizzaria
    } else if (req.user.role === 'admin_pizzaria') {
      // Admin da pizzaria só pode acessar sua própria pizzaria
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (pizzariaId !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    } else {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const sabores = await ItemCardapio.find({
      pizzaria: pizzariaId,
      categoria: 'sabor'
    }).sort({ nome: 1 });

    res.json(sabores);
  } catch (error) {
    console.error('Erro ao buscar sabores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar sabor específico por ID
router.get('/:saborId', auth, async (req, res) => {
  try {
    const { saborId } = req.params;

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    res.json(sabor);
  } catch (error) {
    console.error('Erro ao buscar sabor:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo sabor
router.post('/', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const {
      nome,
      descricao,
      tipoSabor,
      valorEspecial,
      ingredientes,
      pizzaria
    } = req.body;

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== pizzaria) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Verificar se já existe sabor com esse nome na pizzaria
    const saborExistente = await ItemCardapio.findOne({
      nome,
      pizzaria,
      categoria: 'sabor'
    });

    if (saborExistente) {
      return res.status(400).json({ message: 'Já existe um sabor com este nome nesta pizzaria' });
    }

    const novoSabor = new ItemCardapio({
      nome,
      descricao,
      categoria: 'sabor',
      tipoSabor: tipoSabor || 'salgado',
      preco: 0, // Sabores não têm preço base
      valorEspecial: valorEspecial || 0,
      ingredientes: ingredientes || [],
      pizzaria
    });

    await novoSabor.save();
    
    // Emitir evento WebSocket para atualizar cardápio em tempo real
    req.io.to(pizzaria).emit('cardapio_updated', {
      action: 'created',
      item: novoSabor,
      pizzaria: pizzaria
    });
    
    res.status(201).json(novoSabor);
  } catch (error) {
    console.error('Erro ao criar sabor:', error);
    
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

// Atualizar sabor existente
router.put('/:saborId', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { saborId } = req.params;
    const {
      nome,
      descricao,
      tipoSabor,
      valorEspecial,
      ingredientes
    } = req.body;

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Verificar se outro sabor já tem esse nome na mesma pizzaria
    if (nome && nome !== sabor.nome) {
      const saborExistente = await ItemCardapio.findOne({
        nome,
        pizzaria: sabor.pizzaria,
        categoria: 'sabor',
        _id: { $ne: saborId }
      });

      if (saborExistente) {
        return res.status(400).json({ message: 'Já existe um sabor com este nome nesta pizzaria' });
      }
    }

    // Atualizar campos
    if (nome !== undefined) sabor.nome = nome;
    if (descricao !== undefined) sabor.descricao = descricao;
    if (tipoSabor !== undefined) sabor.tipoSabor = tipoSabor;
    if (valorEspecial !== undefined) sabor.valorEspecial = valorEspecial;
    if (ingredientes !== undefined) sabor.ingredientes = ingredientes;

    await sabor.save();
    
    // Emitir evento WebSocket para atualizar cardápio em tempo real
    req.io.to(sabor.pizzaria.toString()).emit('cardapio_updated', {
      action: 'updated',
      item: sabor,
      pizzaria: sabor.pizzaria.toString()
    });
    
    res.json(sabor);
  } catch (error) {
    console.error('Erro ao atualizar sabor:', error);
    
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

// Adicionar ingrediente ao sabor
router.post('/:saborId/ingredientes', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { saborId } = req.params;
    const { nome, preco } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome do ingrediente é obrigatório' });
    }

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Verificar se o ingrediente já existe
    const ingredienteExistente = sabor.ingredientes.find(
      ing => ing.nome.toLowerCase().trim() === nome.toLowerCase().trim()
    );

    if (ingredienteExistente) {
      return res.status(400).json({ message: 'Este ingrediente já existe neste sabor' });
    }

    // Adicionar o ingrediente
    sabor.ingredientes.push({
      nome: nome.trim(),
      preco: preco || 0
    });

    await sabor.save();

    res.status(201).json({
      message: 'Ingrediente adicionado com sucesso',
      ingrediente: sabor.ingredientes[sabor.ingredientes.length - 1],
      sabor: sabor
    });
  } catch (error) {
    console.error('Erro ao adicionar ingrediente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Remover ingrediente do sabor
router.delete('/:saborId/ingredientes/:ingredienteId', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { saborId, ingredienteId } = req.params;

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Encontrar e remover o ingrediente
    const ingredienteIndex = sabor.ingredientes.findIndex(
      ing => ing._id.toString() === ingredienteId
    );

    if (ingredienteIndex === -1) {
      return res.status(404).json({ message: 'Ingrediente não encontrado' });
    }

    sabor.ingredientes.splice(ingredienteIndex, 1);
    await sabor.save();

    res.json({ 
      message: 'Ingrediente removido com sucesso',
      sabor: sabor
    });
  } catch (error) {
    console.error('Erro ao remover ingrediente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Alternar disponibilidade do sabor
router.patch('/:saborId/toggle-disponibilidade', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { saborId } = req.params;

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    sabor.disponivel = !sabor.disponivel;
    await sabor.save();

    // Emitir evento WebSocket para atualizar cardápio em tempo real
    req.io.to(sabor.pizzaria.toString()).emit('cardapio_updated', {
      action: 'availability_changed',
      item: sabor,
      pizzaria: sabor.pizzaria.toString()
    });

    res.json({ 
      message: `Sabor ${sabor.disponivel ? 'disponibilizado' : 'indisponibilizado'}`, 
      sabor: sabor
    });
  } catch (error) {
    console.error('Erro ao alterar disponibilidade:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Deletar sabor
router.delete('/:saborId', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const { saborId } = req.params;

    const sabor = await ItemCardapio.findById(saborId);
    
    if (!sabor) {
      return res.status(404).json({ message: 'Sabor não encontrado' });
    }

    if (sabor.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Item não é um sabor' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== sabor.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Emitir evento WebSocket antes de deletar para ter dados do sabor
    req.io.to(sabor.pizzaria.toString()).emit('cardapio_updated', {
      action: 'deleted',
      item: sabor,
      pizzaria: sabor.pizzaria.toString()
    });

    await ItemCardapio.findByIdAndDelete(saborId);
    res.json({ message: 'Sabor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar sabor:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;