const express = require('express');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const ItemCardapio = require('../models/Cardapio');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// DEBUG: Endpoint temporário para verificar permissões do usuário
router.get('/debug/user-permissions', auth, async (req, res) => {
  try {
    const userFromDB = await User.findById(req.user._id);
    res.json({
      currentUser: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        permissoesCozinha: req.user.permissoesCozinha
      },
      userFromDatabase: {
        id: userFromDB._id,
        email: userFromDB.email,
        role: userFromDB.role,
        permissoesCozinha: userFromDB.permissoesCozinha
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo pedido (público)
router.post('/', async (req, res) => {
  try {
    console.log('🆕 Nova requisição de pedido:', {
      body: req.body,
      hasClienteId: !!req.body.clienteId,
      hasPizzariaId: !!req.body.pizzariaId,
      hasItens: !!req.body.itens,
      itensLength: req.body.itens?.length
    });
    
    const {
      clienteId,
      pizzariaId,
      itens,
      endereco,
      tipo,
      formaPagamento,
      observacoes
    } = req.body;

    // Verificar se o cliente existe
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    // Calcular valores dos itens
    let subtotal = 0;
    const itensProcessados = [];

    for (const itemPedido of itens) {
      const item = await ItemCardapio.findById(itemPedido.item);
      if (!item) {
        return res.status(404).json({ message: `Item não encontrado: ${itemPedido.item}` });
      }

      let precoTotal = item.preco * itemPedido.quantidade;
      
      // Adicionar valor especial se houver
      if (item.valorEspecial && itemPedido.valorEspecial) {
        precoTotal += itemPedido.valorEspecial * itemPedido.quantidade;
      }

      // Para pizzas com sabores
      if (itemPedido.sabores && itemPedido.sabores.length > 0) {
        for (const saborInfo of itemPedido.sabores) {
          const sabor = await ItemCardapio.findById(saborInfo.sabor);
          if (sabor && sabor.valorEspecial) {
            precoTotal += sabor.valorEspecial * saborInfo.quantidade;
          }
        }
      }

      // Para pizzas com bordas
      if (itemPedido.borda) {
        const borda = await ItemCardapio.findById(itemPedido.borda);
        if (borda) {
          precoTotal += (borda.preco + (borda.valorEspecial || 0)) * itemPedido.quantidade;
        }
      }

      const itemProcessado = {
        item: itemPedido.item,
        quantidade: itemPedido.quantidade,
        precoUnitario: item.preco,
        valorEspecial: itemPedido.valorEspecial || 0,
        sabores: itemPedido.sabores || [],
        borda: itemPedido.borda || null,
        observacoes: itemPedido.observacoes || '',
        subtotal: precoTotal
      };

      // Se for um combo com pizzas configuradas, adicionar o campo pizzas
      if (itemPedido.pizzas && itemPedido.pizzas.length > 0) {
        itemProcessado.pizzas = itemPedido.pizzas;
      }

      itensProcessados.push(itemProcessado);
      subtotal += precoTotal;
    }

    // Calcular taxa de entrega (simplificado)
    const taxaEntrega = tipo === 'delivery' ? 5.00 : 0;
    const total = subtotal + taxaEntrega;

    // Gerar número do pedido
    const numero = await Pedido.gerarNumero(pizzariaId);

    const novoPedido = new Pedido({
      numero,
      cliente: clienteId,
      pizzaria: pizzariaId,
      itens: itensProcessados,
      endereco,
      tipo,
      formaPagamento,
      valores: {
        subtotal,
        taxaEntrega,
        desconto: 0,
        total
      },
      observacoes,
      historico: [{
        status: 'recebido',
        timestamp: new Date()
      }]
    });

    await novoPedido.save();

    // Atualizar último pedido do cliente
    cliente.ultimoPedido = new Date();
    await cliente.save();

    // Retornar pedido populado
    const pedidoPopulado = await Pedido.findById(novoPedido._id)
      .populate('cliente')
      .populate({
        path: 'itens.item',
        select: 'nome categoria preco itensCombo',
        populate: {
          path: 'itensCombo.item',
          select: 'nome categoria preco tamanho'
        }
      })
      .populate('itens.sabores.sabor')
      .populate('itens.borda');

    console.log('✅ Pedido criado com sucesso:', {
      pedidoId: pedidoPopulado._id,
      numero: pedidoPopulado.numero,
      cliente: pedidoPopulado.cliente?.nome,
      total: pedidoPopulado.valores?.total
    });
    
    res.status(201).json(pedidoPopulado);
  } catch (error) {
    console.error('❌ Erro ao criar pedido:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// Listar pedidos da cozinha (otimizado)
router.get('/cozinha/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;

    // Verificar permissões
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (pizzariaId !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    // Construir query baseada no role do usuário
    let query = {
      pizzaria: pizzariaId,
      status: { $in: ['recebido', 'preparando', 'finalizado', 'pronto', 'saiu_entrega', 'entregue', 'finalizado_pago'] }
    };

    // Se for cozinha (role 'cozinha'), aplicar filtros baseados nas permissões específicas
    if (req.user.role === 'cozinha') {
      const permissoes = req.user.permissoesCozinha || {};
      
      // Construir filtro baseado nas permissões
      let statusPermitidos = [];
      let filtrosEspeciais = [];
      
      // Preparo: apenas pedidos próprios e disponíveis
      if (permissoes.preparo) {
        statusPermitidos.push('recebido', 'preparando');
        filtrosEspeciais.push(
          { status: 'recebido', pizzaiolo: { $exists: false } },
          { status: 'recebido', pizzaiolo: null },
          { pizzaiolo: req.user._id, status: { $in: ['recebido', 'preparando'] } }
        );
      }
      
      // Finalização: todos os pedidos finalizados
      if (permissoes.finalizacao) {
        statusPermitidos.push('finalizado');
        filtrosEspeciais.push(
          { status: 'finalizado' }
        );
      }
      
      // Expedição: todos os pedidos prontos
      if (permissoes.expedicao) {
        statusPermitidos.push('pronto');
        filtrosEspeciais.push(
          { status: 'pronto' }
        );
      }
      
      // Se tem permissões específicas, usar filtros especiais
      if (filtrosEspeciais.length > 0) {
        query.$or = filtrosEspeciais;
      } else {
        // Fallback: comportamento original se não tem permissões específicas
        query.$or = [
          { status: 'recebido', pizzaiolo: { $exists: false } },
          { status: 'recebido', pizzaiolo: null },
          { pizzaiolo: req.user._id }
        ];
      }
    }

    // Buscar pedidos baseado na query construída
    const pedidos = await Pedido.find(query)
      .populate('cliente', 'nome telefone enderecos')
      .populate({
        path: 'itens.item',
        select: 'nome categoria preco itensCombo',
        populate: {
          path: 'itensCombo.item',
          select: 'nome categoria preco tamanho'
        }
      })
      .populate('itens.sabores.sabor', 'nome')
      .populate('itens.borda', 'nome preco')
      .populate('pizzaiolo', 'name')
      .populate('motoboy', 'name')
      .sort({ 
        status: 1, // recebido primeiro
        createdAt: 1 // mais antigos primeiro
      });

    
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao listar pedidos da cozinha:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar pedidos de uma pizzaria
router.get('/pizzaria/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;
    const { status, page = 1, limit = 20, dataInicio, dataFim } = req.query;

    // Verificar permissões
    if (req.user.role !== 'admin') {
      const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
      if (pizzariaId !== userPizzariaId) {
        return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
      }
    }

    let query = { pizzaria: pizzariaId };

    if (status && status !== 'todos') {
      query.status = status;
    }

    if (dataInicio || dataFim) {
      query.createdAt = {};
      if (dataInicio) {
        query.createdAt.$gte = new Date(dataInicio);
      }
      if (dataFim) {
        query.createdAt.$lte = new Date(dataFim);
      }
    }

    const pedidos = await Pedido.find(query)
      .populate('cliente', 'nome telefone endereco')
      .populate({
        path: 'itens.item',
        select: 'nome categoria preco itensCombo',
        populate: {
          path: 'itensCombo.item',
          select: 'nome categoria preco tamanho'
        }
      })
      .populate('itens.sabores.sabor', 'nome')
      .populate('itens.borda', 'nome preco')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Pedido.countDocuments(query);

    // Se não especificou page na query, retorna apenas o array
    if (!req.query.page) {
      res.json(pedidos);
    } else {
      res.json({
        pedidos,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });
    }
  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar pedidos do motoboy
router.get('/motoboy/:motoboyId', auth, async (req, res) => {
  try {
    const { motoboyId } = req.params;
    
    console.log('🏍️ Buscando pedidos para motoboy:', {
      motoboyId,
      userRole: req.user.role,
      userId: req.user._id
    });
    
    // Verificar se é o próprio motoboy ou admin
    console.log('🔐 Verificando autorização:', {
      userRole: req.user.role,
      userId: req.user._id.toString(),
      motoboyIdParam: motoboyId,
      saoIguais: req.user._id.toString() === motoboyId
    });
    
    if (req.user.role !== 'admin' && req.user._id.toString() !== motoboyId) {
      console.log('❌ Acesso negado para motoboy');
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const mongoose = require('mongoose');
    const query = {
      motoboy: new mongoose.Types.ObjectId(motoboyId), // Converter para ObjectId
      status: { $in: ['saiu_entrega', 'entregue', 'finalizado_pago'] } // Todos os status de entrega
    };

    console.log('🔍 Query para pedidos do motoboy:', JSON.stringify(query, null, 2));

    const pedidos = await Pedido.find(query)
      .populate('cliente', 'nome telefone endereco')
      .populate({
        path: 'itens.item',
        select: 'nome categoria preco itensCombo',
        populate: {
          path: 'itensCombo.item',
          select: 'nome categoria preco tamanho'
        }
      })
      .populate('itens.sabores.sabor', 'nome')
      .populate('itens.borda', 'nome preco')
      .populate('motoboy', 'name dadosMotoboy')
      .sort({ createdAt: -1 });

    console.log('📦 Pedidos encontrados para motoboy:', {
      total: pedidos.length,
      pedidos: pedidos.map(p => ({
        id: p._id,
        numero: p.numero,
        status: p.status,
        motoboy: p.motoboy?._id || 'nenhum'
      }))
    });

    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos do motoboy:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar novo pedido (interno - comentado para não conflitar)
/*
router.post('/', auth, async (req, res) => {
  try {
    const {
      pizzaria,
      cliente,
      itens,
      origem,
      tipo,
      valores,
      pagamento,
      observacoes
    } = req.body;

    // Verificar se tem acesso à pizzaria
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    if (req.user.role !== 'admin' && userPizzariaId !== pizzaria) {
      return res.status(403).json({ message: 'Acesso negado à esta pizzaria' });
    }

    // Validar dados obrigatórios
    if (!cliente?.nome || !cliente?.telefone || !itens?.length) {
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }

    const pedido = new Pedido({
      pizzaria,
      cliente,
      itens,
      origem: origem || 'atendente',
      tipo: tipo || 'entrega',
      valores,
      pagamento,
      observacoes
    });

    await pedido.save();
    
    // Emitir evento para clientes conectados na pizzaria
    req.io.to(pizzaria).emit('novo_pedido', pedido);

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});
*/

// Buscar pedido por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('pizzaria')
      .populate('motoboy', 'name dadosMotoboy');

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verificar acesso
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    if (req.user.role !== 'admin' && 
        userPizzariaId !== pedido.pizzaria._id.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json(pedido);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar status do pedido
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    console.log('📝 Requisição de atualização de status:', {
      pedidoId: req.params.id,
      novoStatus: status,
      userRole: req.user.role,
      userName: req.user.name
    });
    
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verificar acesso
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    const pedidoPizzariaId = pedido.pizzaria?.toString();
    
    console.log('🔍 Verificando acesso ao pedido:', {
      userRole: req.user.role,
      userPizzariaId,
      pedidoPizzariaId,
      isAdmin: req.user.role === 'admin'
    });
    
    if (req.user.role !== 'admin' && userPizzariaId !== pedidoPizzariaId) {
      console.log('❌ Acesso negado - pizzaria não confere');
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Validar transições de status
    const validTransitions = {
      'pendente': ['recebido', 'cancelado'],
      'recebido': ['preparando', 'cancelado'],
      'confirmado': ['preparando', 'cancelado'],
      'preparando': ['finalizado', 'cancelado'],
      'finalizado': ['pronto', 'cancelado'],
      'pronto': ['saiu_entrega', 'entregue'],
      'saiu_entrega': ['entregue'],
      'entregue': ['finalizado_pago'],
      'finalizado_pago': [],
      'cancelado': []
    };

    if (!validTransitions[pedido.status].includes(status)) {
      return res.status(400).json({ 
        message: `Não é possível alterar status de ${pedido.status} para ${status}` 
      });
    }

    // Lógica especial para atribuição de responsável
    if (status === 'preparando') {
      console.log('🍕 Tentando atribuir pizzaiolo:', {
        pedidoId: req.params.id,
        usuarioId: req.user._id,
        usuarioRole: req.user.role,
        pizzaioloAtual: pedido.pizzaiolo
      });
      
      // Validar se usuário pode assumir pedidos (apenas preparo)
      const allowedRoles = ['admin_pizzaria', 'admin'];
      const isCozinhaComPreparo = req.user.role === 'cozinha' && req.user.permissoesCozinha?.preparo;
      
      console.log('🔍 Debug permissões:', {
        userRole: req.user.role,
        userId: req.user._id,
        userEmail: req.user.email,
        permissoesCozinha: req.user.permissoesCozinha,
        preparo: req.user.permissoesCozinha?.preparo,
        allowedRoles,
        isCozinhaComPreparo,
        podeAssumir: allowedRoles.includes(req.user.role) || isCozinhaComPreparo
      });
      
      if (!allowedRoles.includes(req.user.role) && !isCozinhaComPreparo) {
        console.log('❌ Usuário não tem permissão para assumir pedidos');
        return res.status(403).json({ 
          message: 'Você não tem permissão para assumir pedidos (necessário permissão de Preparo)' 
        });
      }
      
      // Verificar se já tem pizzaiolo atribuído
      if (pedido.pizzaiolo && pedido.pizzaiolo.toString() !== req.user._id.toString()) {
        console.log('❌ Pedido já atribuído a outro pizzaiolo');
        return res.status(400).json({ 
          message: 'Este pedido já foi atribuído a outra pessoa' 
        });
      }
      
      // Usar operação atômica para atribuir pizzaiolo
      const pedidoAtualizado = await Pedido.findOneAndUpdate(
        { 
          _id: req.params.id,
          $or: [
            { pizzaiolo: { $exists: false } },
            { pizzaiolo: null },
            { pizzaiolo: req.user._id }
          ]
        },
        { 
          status: 'preparando',
          pizzaiolo: req.user._id,
          [`tempos.${status}`]: new Date()
        },
        { new: true }
      );

      if (!pedidoAtualizado) {
        console.log('❌ Pedido já foi assumido por outro pizzaiolo');
        return res.status(409).json({ 
          message: 'Este pedido já foi assumido por outra pessoa' 
        });
      }

      console.log('✅ Pizzaiolo atribuído com sucesso via operação atômica');
      
      // Emitir evento para clientes conectados
      req.io.to(pedidoAtualizado.pizzaria.toString()).emit('pedido_atualizado', {
        pedidoId: pedidoAtualizado._id,
        status,
        timestamp: pedidoAtualizado.tempos[status],
        pizzaiolo: pedidoAtualizado.pizzaiolo
      });

      return res.json({ message: 'Status atualizado com sucesso', pedido: pedidoAtualizado });
    }

    // Validações específicas por status e permissão
    if (req.user.role === 'cozinha') {
      const permissoes = req.user.permissoesCozinha || {};
      
      // Preparando: apenas quem tem permissão de preparo e é o responsável
      if (status === 'preparando' && pedido.pizzaiolo) {
        if (!permissoes.preparo || pedido.pizzaiolo.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
            message: 'Apenas a pessoa responsável pelo preparo pode gerenciar este pedido' 
          });
        }
      }
      
      // Finalizado: apenas quem tem permissão de preparo e é o responsável
      if (status === 'finalizado' && pedido.pizzaiolo) {
        if (!permissoes.preparo || pedido.pizzaiolo.toString() !== req.user._id.toString()) {
          return res.status(403).json({ 
            message: 'Apenas a pessoa responsável pelo preparo pode finalizar este pedido' 
          });
        }
      }
      
      // Pronto: apenas quem tem permissão de finalização
      if (status === 'pronto') {
        if (!permissoes.finalizacao) {
          return res.status(403).json({ 
            message: 'Você não tem permissão para marcar pedidos como prontos (necessário permissão de Finalização)' 
          });
        }
      }
      
      // Saiu entrega/entregue: apenas quem tem permissão de expedição
      if (['saiu_entrega', 'entregue'].includes(status)) {
        if (!permissoes.expedicao) {
          return res.status(403).json({ 
            message: 'Você não tem permissão para gerenciar expedição (necessário permissão de Expedição)' 
          });
        }
      }
    }
    // Para admins, manter validação original
    else if (['preparando', 'finalizado'].includes(status) && pedido.pizzaiolo) {
      if (req.user.role !== 'admin' && 
          req.user.role !== 'admin_pizzaria' && 
          pedido.pizzaiolo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Apenas a pessoa responsável pode gerenciar este pedido' 
        });
      }
    }

    // Para outros status, usar atualização normal
    console.log('📝 Atualizando status:', {
      de: pedido.status,
      para: status,
      pedidoId: pedido._id
    });
    
    pedido.status = status;
    pedido.tempos[status] = new Date();

    console.log('💾 Salvando pedido no banco...');
    await pedido.save();
    console.log('✅ Pedido salvo com sucesso!');

    // Emitir evento para clientes conectados
    if (req.io) {
      req.io.to(pedido.pizzaria.toString()).emit('pedido_atualizado', {
        pedidoId: pedido._id,
        status,
        timestamp: pedido.tempos[status],
        pizzaiolo: pedido.pizzaiolo
      });
    }

    res.json({ message: 'Status atualizado com sucesso', pedido });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar progresso das pizzas individuais
router.patch('/:id/progresso-pizzas', auth, async (req, res) => {
  try {
    const { progressoPizzas } = req.body;
    
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verificar acesso
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    const pedidoPizzariaId = pedido.pizzaria?.toString();
    
    if (req.user.role !== 'admin' && userPizzariaId !== pedidoPizzariaId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Verificar se tem permissão para preparação (apenas durante preparo)
    if (req.user.role === 'cozinha') {
      const permissoes = req.user.permissoesCozinha || {};
      
      if (!permissoes.preparo) {
        return res.status(403).json({ 
          message: 'Você não tem permissão para atualizar o progresso das pizzas' 
        });
      }
      
      // Verificar se é o responsável pelo pedido
      if (pedido.pizzaiolo && pedido.pizzaiolo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Apenas a pessoa responsável pelo preparo pode atualizar o progresso' 
        });
      }
    }

    // Atualizar progresso
    pedido.progressoPizzas = new Map(Object.entries(progressoPizzas));
    await pedido.save();

    // Emitir evento para clientes conectados
    if (req.io) {
      req.io.to(pedido.pizzaria.toString()).emit('progresso_pizzas_atualizado', {
        pedidoId: pedido._id,
        progressoPizzas: Object.fromEntries(pedido.progressoPizzas)
      });
    }

    res.json({ 
      message: 'Progresso das pizzas atualizado com sucesso', 
      progressoPizzas: Object.fromEntries(pedido.progressoPizzas)
    });
  } catch (error) {
    console.error('Erro ao atualizar progresso das pizzas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Aceitar entrega (motoboy)
router.patch('/:id/aceitar-entrega', auth, requireRole('motoboy'), async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    if (pedido.status !== 'pronto') {
      return res.status(400).json({ message: 'Pedido não está pronto para entrega' });
    }

    if (pedido.motoboy) {
      return res.status(400).json({ message: 'Pedido já foi aceito por outro motoboy' });
    }

    // Atribuir motoboy e alterar status
    pedido.motoboy = req.user._id;
    pedido.status = 'saiu_entrega';
    pedido.tempos.saiu_entrega = new Date();

    await pedido.save();

    // Emitir evento
    req.io.to(pedido.pizzaria.toString()).emit('pedido_aceito_entrega', {
      pedidoId: pedido._id,
      motoboy: req.user.name,
      timestamp: pedido.tempos.saiu_entrega
    });

    res.json({ message: 'Entrega aceita com sucesso' });
  } catch (error) {
    console.error('Erro ao aceitar entrega:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Marcar como entregue
router.patch('/:id/entregar', auth, requireRole('motoboy'), async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    if (!pedido.motoboy) {
      return res.status(400).json({ message: 'Pedido não tem motoboy atribuído' });
    }

    if (pedido.motoboy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Este pedido não foi aceito por você' });
    }

    if (pedido.status !== 'saiu_entrega') {
      return res.status(400).json({ message: 'Pedido não está em entrega' });
    }

    pedido.status = 'entregue';
    pedido.tempos.entregue = new Date();
    // Remover linha que causava erro - pedido.pagamento.status não existe no schema

    await pedido.save();

    // Emitir evento
    if (req.io) {
      req.io.to(pedido.pizzaria.toString()).emit('pedido_entregue', {
        pedidoId: pedido._id,
        timestamp: pedido.tempos.entregue
      });
    }

    res.json({ message: 'Pedido marcado como entregue' });
  } catch (error) {
    console.error('Erro ao marcar como entregue:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Cancelar pedido
router.patch('/:id/cancelar', auth, async (req, res) => {
  try {
    const { motivo } = req.body;
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Verificar acesso
    const userPizzariaId = req.user.pizzaria?._id?.toString() || req.user.pizzaria?.toString();
    if (req.user.role !== 'admin' && 
        userPizzariaId !== pedido.pizzaria.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    if (['entregue', 'cancelado'].includes(pedido.status)) {
      return res.status(400).json({ message: 'Não é possível cancelar este pedido' });
    }

    pedido.status = 'cancelado';
    if (motivo) pedido.observacoes = (pedido.observacoes || '') + `\nCancelado: ${motivo}`;

    await pedido.save();

    // Emitir evento
    req.io.to(pedido.pizzaria.toString()).emit('pedido_cancelado', {
      pedidoId: pedido._id,
      motivo
    });

    res.json({ message: 'Pedido cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para buscar motoboys da pizzaria (para seleção na expedição)
router.get('/pizzaria/:pizzariaId/motoboys', auth, async (req, res) => {
  try {
    const motoboys = await User.find({
      pizzaria: req.params.pizzariaId,
      role: 'motoboy',
      ativo: true
    }).select('name dadosMotoboy telefone');
    
    res.json(motoboys);
  } catch (error) {
    console.error('Erro ao buscar motoboys:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para atribuir motoboy na expedição
router.patch('/:id/atribuir-motoboy', auth, async (req, res) => {
  try {
    const { motoboyId } = req.body;
    
    console.log('🏍️ Atribuindo motoboy:', {
      pedidoId: req.params.id,
      motoboyId,
      userRole: req.user.role
    });
    
    const pedido = await Pedido.findById(req.params.id);

    if (!pedido) {
      console.log('❌ Pedido não encontrado:', req.params.id);
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    console.log('📦 Pedido encontrado:', {
      numero: pedido.numero,
      status: pedido.status,
      tipo: pedido.tipo,
      pizzaria: pedido.pizzaria
    });

    if (pedido.status !== 'pronto') {
      console.log('❌ Status inválido:', pedido.status);
      return res.status(400).json({ message: 'Pedido não está pronto para expedição' });
    }

    if (pedido.tipo !== 'delivery') {
      console.log('❌ Tipo inválido:', pedido.tipo);
      return res.status(400).json({ message: 'Apenas pedidos de entrega podem ter motoboy atribuído' });
    }

    // Verificar se o motoboy existe e é da mesma pizzaria
    const motoboy = await User.findOne({
      _id: motoboyId,
      pizzaria: pedido.pizzaria,
      role: 'motoboy',
      ativo: true
    });

    console.log('👤 Motoboy encontrado:', motoboy ? {
      id: motoboy._id,
      name: motoboy.name,
      ativo: motoboy.ativo,
      pizzaria: motoboy.pizzaria
    } : 'Não encontrado');

    if (!motoboy) {
      return res.status(404).json({ message: 'Motoboy não encontrado ou inativo' });
    }

    // Atribuir motoboy e alterar status
    pedido.motoboy = motoboyId;
    pedido.status = 'saiu_entrega';
    await pedido.save();

    console.log('✅ Motoboy atribuído com sucesso:', {
      pedidoId: pedido._id,
      motoboyId: pedido.motoboy,
      novoStatus: pedido.status
    });

    const pedidoPopulado = await Pedido.findById(pedido._id)
      .populate('motoboy', 'name dadosMotoboy telefone');

    res.json(pedidoPopulado);
  } catch (error) {
    console.error('Erro ao atribuir motoboy:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;