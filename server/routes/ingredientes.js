const express = require('express');
const ItemCardapio = require('../models/Cardapio');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Adicionar ingrediente a um sabor específico
router.post('/:itemId', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ message: 'Nome do ingrediente é obrigatório' });
    }

    // Buscar o item (deve ser um sabor)
    const item = await ItemCardapio.findById(itemId);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    if (item.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Ingredientes só podem ser adicionados a sabores' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Verificar se o ingrediente já existe
    const ingredienteExistente = item.ingredientes.find(
      ing => ing.nome.toLowerCase().trim() === nome.toLowerCase().trim()
    );

    if (ingredienteExistente) {
      return res.status(400).json({ message: 'Este ingrediente já existe neste sabor' });
    }

    // Adicionar o ingrediente
    item.ingredientes.push({
      nome: nome.trim(),
      preco: 0
    });

    await item.save();

    res.status(201).json({
      message: 'Ingrediente adicionado com sucesso',
      ingrediente: item.ingredientes[item.ingredientes.length - 1]
    });
  } catch (error) {
    console.error('Erro ao adicionar ingrediente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Remover ingrediente de um sabor específico
router.delete('/:itemId/:ingredienteId', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const { itemId, ingredienteId } = req.params;

    // Buscar o item (deve ser um sabor)
    const item = await ItemCardapio.findById(itemId);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    if (item.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Ingredientes só podem ser removidos de sabores' });
    }

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Encontrar e remover o ingrediente
    const ingredienteIndex = item.ingredientes.findIndex(
      ing => ing._id.toString() === ingredienteId
    );

    if (ingredienteIndex === -1) {
      return res.status(404).json({ message: 'Ingrediente não encontrado' });
    }

    item.ingredientes.splice(ingredienteIndex, 1);
    await item.save();

    res.json({ message: 'Ingrediente removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover ingrediente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar ingredientes de um sabor específico
router.get('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Buscar o item (deve ser um sabor)
    const item = await ItemCardapio.findById(itemId).select('nome categoria ingredientes');
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    if (item.categoria !== 'sabor') {
      return res.status(400).json({ message: 'Apenas sabores possuem ingredientes' });
    }

    res.json({
      sabor: item.nome,
      ingredientes: item.ingredientes
    });
  } catch (error) {
    console.error('Erro ao buscar ingredientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;