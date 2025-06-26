const express = require('express');
const TipoPizza = require('../models/TipoPizza');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Listar tipos de pizza de uma pizzaria
router.get('/pizzaria/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;
    
    // Verificar permissões
    if (req.user.role !== 'admin' && req.user.role !== 'admin_pizzaria') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Admin da pizzaria só pode ver tipos da sua pizzaria
    if (req.user.role === 'admin_pizzaria') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (pizzariaId !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    const tipos = await TipoPizza.find({ 
      pizzaria: pizzariaId,
      ativo: true 
    }).sort({ ordem: 1, nome: 1 });
    
    res.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos de pizza:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo tipo de pizza
router.post('/', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const {
      nome,
      descricao,
      fatias,
      maxSabores,
      ordem,
      pizzaria
    } = req.body;

    // Verificar acesso à pizzaria
    if (req.user.role === 'admin_pizzaria') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (pizzaria !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    const tipoPizza = new TipoPizza({
      nome: nome.toUpperCase(),
      descricao,
      fatias,
      maxSabores,
      ordem,
      pizzaria
    });

    await tipoPizza.save();
    res.status(201).json(tipoPizza);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Já existe um tipo de pizza com este nome nesta pizzaria' });
    }
    console.error('Erro ao criar tipo de pizza:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar tipo de pizza
router.put('/:id', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const tipoPizza = await TipoPizza.findById(req.params.id);
    
    if (!tipoPizza) {
      return res.status(404).json({ message: 'Tipo de pizza não encontrado' });
    }

    // Verificar acesso
    if (req.user.role === 'admin_pizzaria') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (tipoPizza.pizzaria.toString() !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    const updateData = req.body;
    if (updateData.nome) {
      updateData.nome = updateData.nome.toUpperCase();
    }
    delete updateData.pizzaria; // Não permitir mudança de pizzaria

    Object.assign(tipoPizza, updateData);
    await tipoPizza.save();

    res.json(tipoPizza);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Já existe um tipo de pizza com este nome nesta pizzaria' });
    }
    console.error('Erro ao atualizar tipo de pizza:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Desativar tipo de pizza (soft delete)
router.delete('/:id', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const tipoPizza = await TipoPizza.findById(req.params.id);
    
    if (!tipoPizza) {
      return res.status(404).json({ message: 'Tipo de pizza não encontrado' });
    }

    // Verificar acesso
    if (req.user.role === 'admin_pizzaria') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (tipoPizza.pizzaria.toString() !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    tipoPizza.ativo = false;
    await tipoPizza.save();

    res.json({ message: 'Tipo de pizza desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar tipo de pizza:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;