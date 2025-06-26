const express = require('express');
const ItemCardapio = require('../models/Cardapio');
const { auth, requireRole, requireSamePizzaria } = require('../middleware/auth');
const router = express.Router();

// Listar itens do cardápio publicamente (para sistema de pedidos)
router.get('/publico/:pizzariaId', async (req, res) => {
  try {
    const { pizzariaId } = req.params;
    const { categoria } = req.query;
    
    let query = { 
      pizzaria: pizzariaId,
      disponivel: true 
    };
    
    // Se categoria foi especificada, filtrar por ela
    if (categoria && categoria !== 'todas') {
      query.categoria = categoria;
      
      // Para pizzas, adicionar filtro de visibilidade no cardápio
      if (categoria === 'pizza') {
        query.visivelCardapio = true;
      }
    } else {
      // Se não especificou categoria, aplicar filtro para todas as pizzas
      query.$or = [
        { categoria: { $ne: 'pizza' } }, // Todos os itens que não são pizza
        { categoria: 'pizza', visivelCardapio: true } // Apenas pizzas visíveis
      ];
    }
    
    const itens = await ItemCardapio.find(query)
      .select('nome descricao categoria preco valorEspecial tamanho ingredientes itensCombo quantidadeFatias quantidadeSabores')
      .populate('itensCombo.item', 'nome categoria quantidadeFatias quantidadeSabores tamanho')
      .sort({ categoria: 1, nome: 1 });
    
    // Para combos, ordenar itens para pizza ficar primeiro
    itens.forEach(item => {
      if (item.categoria === 'combo' && item.itensCombo) {
        item.itensCombo.sort((a, b) => {
          if (a.tipo === 'pizza' && b.tipo === 'bebida') return -1;
          if (a.tipo === 'bebida' && b.tipo === 'pizza') return 1;
          return 0;
        });
      }
    });
      
    res.json(itens);
  } catch (error) {
    console.error('Erro ao buscar cardápio publicamente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar itens do cardápio de uma pizzaria
router.get('/pizzaria/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;
    const { categoria, disponivel } = req.query;

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

    let query = { pizzaria: pizzariaId };
    
    if (categoria && categoria !== 'todas') {
      query.categoria = categoria;
    }
    
    if (disponivel !== undefined) {
      query.disponivel = disponivel === 'true';
    }

    const itens = await ItemCardapio.find(query)
      .populate('itensCombo.item', 'nome categoria tamanho')
      .sort({ categoria: 1, nome: 1 });
    
    // Para combos, ordenar itens para pizza ficar primeiro
    itens.forEach(item => {
      if (item.categoria === 'combo' && item.itensCombo) {
        item.itensCombo.sort((a, b) => {
          if (a.tipo === 'pizza' && b.tipo === 'bebida') return -1;
          if (a.tipo === 'bebida' && b.tipo === 'pizza') return 1;
          return 0;
        });
      }
    });
    
    res.json(itens);
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo item do cardápio
router.post('/', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const {
      nome,
      descricao,
      categoria,
      preco,
      valorEspecial,
      tipoPizza,
      pizzasCompativeis,
      itensCombo,
      tempoPreparoMinutos,
      ingredientes,
      opcionais,
      tamanhos,
      tamanho,
      quantidadeFatias,
      quantidadeSabores,
      visivelCardapio,
      pizzaria
    } = req.body;

    // Verificar acesso à pizzaria
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== pizzaria) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    const itemData = {
      nome,
      descricao,
      categoria,
      preco,
      tempoPreparoMinutos,
      ingredientes: ingredientes || [],
      opcionais: opcionais || [],
      pizzaria
    };

    // Adicionar campos específicos para pizzas
    if (categoria === 'pizza') {
      itemData.quantidadeFatias = quantidadeFatias;
      itemData.quantidadeSabores = quantidadeSabores;
      itemData.visivelCardapio = visivelCardapio !== undefined ? visivelCardapio : true;
    }

    // Adicionar campos específicos por categoria
    if (categoria === 'pizza' && tipoPizza) {
      // Verificar se já existe um item com este tipo de pizza
      const existingPizza = await ItemCardapio.findOne({
        categoria: 'pizza',
        tipoPizza: tipoPizza,
        pizzaria: pizzaria
      });
      
      if (existingPizza) {
        return res.status(400).json({ 
          message: `Já existe um item do cardápio vinculado ao tipo de pizza selecionado: "${existingPizza.nome}"` 
        });
      }
      
      itemData.tipoPizza = tipoPizza;
    }
    
    if (categoria === 'sabor') {
      itemData.valorEspecial = valorEspecial || 0;
      itemData.pizzasCompativeis = pizzasCompativeis || [];
    }
    
    if (categoria === 'bebida') {
      itemData.tamanho = tamanho;
      itemData.valorEspecial = valorEspecial || 0;
    }
    
    if (categoria === 'borda') {
      itemData.valorEspecial = valorEspecial || 0;
    }
    
    if (categoria === 'combo' && itensCombo) {
      itemData.itensCombo = itensCombo;
    }

    const item = new ItemCardapio(itemData);

    await item.save();
    
    // Emitir evento WebSocket para atualizar cardápio em tempo real
    console.log(`📡 Emitindo evento cardapio_updated para pizzaria ${pizzaria}:`, {
      action: 'created',
      item: item.nome,
      categoria: item.categoria
    });
    req.io.to(pizzaria).emit('cardapio_updated', {
      action: 'created',
      item: item,
      pizzaria: pizzaria
    });
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Erro ao criar item do cardápio:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Já existe um item com este nome nesta pizzaria' });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Dados inválidos',
        errors: errors
      });
    }
    
    if (error.name === 'CastError' && error.path === 'tipoPizza') {
      return res.status(400).json({ message: 'Tipo de pizza inválido' });
    }
    
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar item do cardápio
router.put('/:id', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    // Verificar acesso
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    const {
      nome,
      descricao,
      categoria,
      preco,
      valorEspecial,
      tipoPizza,
      pizzasCompativeis,
      itensCombo,
      tempoPreparoMinutos,
      ingredientes,
      opcionais,
      tamanhos,
      tamanho,
      quantidadeFatias,
      quantidadeSabores,
      visivelCardapio
    } = req.body;

    // Verificar se estão tentando mudar a categoria (não permitido)
    if (categoria && categoria !== item.categoria) {
      return res.status(400).json({ message: 'A categoria não pode ser alterada após a criação' });
    }

    const updateData = {
      nome,
      descricao,
      preco,
      tempoPreparoMinutos,
      ingredientes: ingredientes || item.ingredientes,
      opcionais: opcionais || item.opcionais
    };

    // Adicionar campos específicos para pizzas
    if (item.categoria === 'pizza') {
      if (quantidadeFatias !== undefined) updateData.quantidadeFatias = quantidadeFatias;
      if (quantidadeSabores !== undefined) updateData.quantidadeSabores = quantidadeSabores;
      if (visivelCardapio !== undefined) updateData.visivelCardapio = visivelCardapio;
    }

    // Validações específicas por categoria
    if (item.categoria === 'pizza' && tipoPizza) {
      // Verificar se já existe outro item com este tipo de pizza (excluindo o item atual)
      const existingPizza = await ItemCardapio.findOne({
        categoria: 'pizza',
        tipoPizza: tipoPizza,
        pizzaria: item.pizzaria,
        _id: { $ne: item._id } // Excluir o item atual da verificação
      });
      
      if (existingPizza) {
        return res.status(400).json({ 
          message: `Já existe um item do cardápio vinculado ao tipo de pizza selecionado: "${existingPizza.nome}"` 
        });
      }
      
      updateData.tipoPizza = tipoPizza;
      updateData.valorEspecial = 0;
      updateData.tamanhos = undefined;
      updateData.itensCombo = undefined;
      updateData.pizzasCompativeis = undefined;
    } else if (item.categoria === 'sabor') {
      updateData.preco = 0;
      updateData.valorEspecial = valorEspecial || item.valorEspecial;
      updateData.pizzasCompativeis = pizzasCompativeis || item.pizzasCompativeis;
      updateData.tamanhos = undefined;
      updateData.itensCombo = undefined;
      updateData.tipoPizza = undefined;
    } else if (item.categoria === 'bebida') {
      updateData.tamanho = tamanho || item.tamanho;
      updateData.valorEspecial = valorEspecial !== undefined ? valorEspecial : item.valorEspecial;
      updateData.tamanhos = undefined;
      updateData.itensCombo = undefined;
      updateData.pizzasCompativeis = undefined;
      updateData.tipoPizza = undefined;
    } else if (item.categoria === 'borda') {
      updateData.valorEspecial = valorEspecial !== undefined ? valorEspecial : item.valorEspecial;
      updateData.tamanhos = undefined;
      updateData.itensCombo = undefined;
      updateData.pizzasCompativeis = undefined;
      updateData.tipoPizza = undefined;
    } else if (item.categoria === 'combo' && itensCombo) {
      updateData.itensCombo = itensCombo;
      updateData.valorEspecial = 0;
      updateData.tamanhos = undefined;
      updateData.pizzasCompativeis = undefined;
      updateData.tipoPizza = undefined;
    }

    Object.assign(item, updateData);
    await item.save();

    // Emitir evento WebSocket para atualizar cardápio em tempo real
    req.io.to(item.pizzaria.toString()).emit('cardapio_updated', {
      action: 'updated',
      item: item,
      pizzaria: item.pizzaria.toString()
    });

    res.json(item);
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Alternar disponibilidade do item
router.patch('/:id/toggle-disponibilidade', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    // Verificar acesso
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    item.disponivel = !item.disponivel;
    await item.save({ validateBeforeSave: false });

    // Emitir evento WebSocket para atualizar cardápio em tempo real
    console.log(`📡 Emitindo evento cardapio_updated para pizzaria ${item.pizzaria}:`, {
      action: 'availability_changed',
      item: item.nome,
      disponivel: item.disponivel
    });
    req.io.to(item.pizzaria.toString()).emit('cardapio_updated', {
      action: 'availability_changed',
      item: item,
      pizzaria: item.pizzaria.toString()
    });

    res.json({ message: `Item ${item.disponivel ? 'disponibilizado' : 'indisponibilizado'}`, item });
  } catch (error) {
    console.error('Erro ao alterar disponibilidade:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Alternar visibilidade no cardápio (apenas para pizzas)
router.patch('/:id/toggle-visibilidade-cardapio', auth, requireRole(['admin', 'admin_pizzaria', 'atendente']), async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    if (item.categoria !== 'pizza') {
      return res.status(400).json({ message: 'Apenas pizzas podem ter visibilidade no cardápio alterada' });
    }

    // Verificar acesso
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    item.visivelCardapio = !item.visivelCardapio;
    await item.save({ validateBeforeSave: false });

    // Emitir evento WebSocket para atualizar cardápio em tempo real
    console.log(`📡 Emitindo evento cardapio_updated para pizzaria ${item.pizzaria}:`, {
      action: 'visibility_changed',
      item: item.nome,
      visivelCardapio: item.visivelCardapio
    });
    req.io.to(item.pizzaria.toString()).emit('cardapio_updated', {
      action: 'visibility_changed',
      item: item,
      pizzaria: item.pizzaria.toString()
    });

    res.json({ 
      message: `Pizza ${item.visivelCardapio ? 'visível' : 'oculta'} no cardápio`, 
      item 
    });
  } catch (error) {
    console.error('Erro ao alterar visibilidade no cardápio:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Deletar item do cardápio
router.delete('/:id', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const item = await ItemCardapio.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item não encontrado' });
    }

    // Verificar acesso (apenas admin ou admin da pizzaria)
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (userPizzariaId !== item.pizzaria.toString()) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
    }

    // Emitir evento WebSocket antes de deletar para ter dados do item
    req.io.to(item.pizzaria.toString()).emit('cardapio_updated', {
      action: 'deleted',
      item: item,
      pizzaria: item.pizzaria.toString()
    });

    await ItemCardapio.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removido do cardápio' });
  } catch (error) {
    console.error('Erro ao deletar item:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota de teste para emitir eventos WebSocket
router.get('/test-websocket/:pizzariaId', (req, res) => {
  const { pizzariaId } = req.params;
  
  console.log(`🧪 TESTE: Emitindo evento para pizzaria ${pizzariaId}`);
  
  req.io.to(pizzariaId).emit('cardapio_updated', {
    action: 'test',
    message: 'Teste de WebSocket funcionando!',
    pizzaria: pizzariaId,
    timestamp: new Date().toISOString()
  });
  
  res.json({ 
    message: 'Evento WebSocket emitido',
    pizzaria: pizzariaId,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;