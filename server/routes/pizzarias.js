const express = require('express');
const Pizzaria = require('../models/Pizzaria');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const router = express.Router();

// Listar pizzarias publicamente (para sistema de pedidos)
router.get('/publico', async (req, res) => {
  try {
    const pizzarias = await Pizzaria.find({ ativa: true })
      .select('nome endereco contato configuracoes')
      .sort({ nome: 1 });
    
    res.json(pizzarias);
  } catch (error) {
    console.error('Erro ao buscar pizzarias publicamente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar pizzaria por ID publicamente
router.get('/publico/:id', async (req, res) => {
  try {
    const pizzaria = await Pizzaria.findById(req.params.id)
      .select('nome endereco contato configuracoes');
    
    if (!pizzaria) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }
    
    res.json(pizzaria);
  } catch (error) {
    console.error('Erro ao buscar pizzaria:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Listar pizzarias - admin vê todas, admin_pizzaria vê apenas a sua
router.get('/', auth, async (req, res) => {
  try {
    let pizzarias;
    
    if (req.user.role === 'admin') {
      // Admin geral vê todas as pizzarias
      pizzarias = await Pizzaria.find().sort({ createdAt: -1 });
    } else if (req.user.role === 'admin_pizzaria') {
      // Admin da pizzaria vê apenas a sua
      const pizzariaId = req.user.pizzaria?._id || req.user.pizzaria;
      if (!pizzariaId) {
        return res.status(400).json({ message: 'Usuário não possui pizzaria associada' });
      }
      pizzarias = await Pizzaria.find({ _id: pizzariaId }).sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    
    res.json(pizzarias);
  } catch (error) {
    console.error('Erro ao buscar pizzarias:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Buscar pizzaria por ID
router.get('/:id', auth, async (req, res) => {
  try {
    const pizzaria = await Pizzaria.findById(req.params.id);
    
    if (!pizzaria) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }

    // Verificar se o usuário tem acesso à pizzaria
    if (req.user.role !== 'admin' && 
        req.user.role !== 'admin_pizzaria' &&
        req.user.pizzaria.toString() !== pizzaria._id.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json(pizzaria);
  } catch (error) {
    console.error('Erro ao buscar pizzaria:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Criar nova pizzaria (apenas admin)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const {
      nome,
      endereco,
      contato,
      configuracoes
    } = req.body;

    if (!nome || !endereco || !contato) {
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }

    const pizzaria = new Pizzaria({
      nome,
      endereco,
      contato,
      configuracoes: {
        ...configuracoes,
        horarioFuncionamento: configuracoes?.horarioFuncionamento || {
          abertura: '18:00',
          fechamento: '23:00'
        },
        taxaEntrega: configuracoes?.taxaEntrega || 5.00,
        tempoPreparoMedio: configuracoes?.tempoPreparoMedio || 30,
        comissaoMotoboy: configuracoes?.comissaoMotoboy || 2.50,
        limiteUsuarios: configuracoes?.limiteUsuarios || 10
      }
    });

    await pizzaria.save();
    
    // Emitir evento para clientes conectados
    req.io.emit('nova_pizzaria', pizzaria);

    res.status(201).json(pizzaria);
  } catch (error) {
    console.error('Erro ao criar pizzaria:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar pizzaria
router.put('/:id', auth, requireRole(['admin', 'admin_pizzaria']), async (req, res) => {
  try {
    const pizzaria = await Pizzaria.findById(req.params.id);
    
    if (!pizzaria) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }

    // admin_pizzaria só pode editar sua própria pizzaria
    if (req.user.role === 'admin_pizzaria' && 
        req.user.pizzaria.toString() !== pizzaria._id.toString()) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const {
      nome,
      endereco,
      contato,
      configuracoes,
      ativa
    } = req.body;

    // Atualizar campos
    if (nome) pizzaria.nome = nome;
    if (endereco) pizzaria.endereco = { ...pizzaria.endereco, ...endereco };
    if (contato) pizzaria.contato = { ...pizzaria.contato, ...contato };
    if (configuracoes) pizzaria.configuracoes = { ...pizzaria.configuracoes, ...configuracoes };
    if (ativa !== undefined) pizzaria.ativa = ativa;

    await pizzaria.save();
    
    // Emitir evento para clientes conectados
    req.io.emit('pizzaria_atualizada', pizzaria);

    res.json(pizzaria);
  } catch (error) {
    console.error('Erro ao atualizar pizzaria:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Desativar/Ativar pizzaria
router.patch('/:id/toggle-status', auth, requireRole('admin'), async (req, res) => {
  try {
    const pizzaria = await Pizzaria.findById(req.params.id);
    
    if (!pizzaria) {
      return res.status(404).json({ message: 'Pizzaria não encontrada' });
    }

    pizzaria.ativa = !pizzaria.ativa;
    await pizzaria.save();

    // Se desativando pizzaria, desativar usuários também
    if (!pizzaria.ativa) {
      await User.updateMany(
        { pizzaria: pizzaria._id },
        { ativo: false }
      );
    }

    res.json({ message: `Pizzaria ${pizzaria.ativa ? 'ativada' : 'desativada'} com sucesso` });
  } catch (error) {
    console.error('Erro ao alterar status da pizzaria:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Estatísticas da pizzaria
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const pizzariaId = req.params.id;
    
    // Verificar acesso
    if (req.user.role !== 'admin' && 
        req.user.role !== 'admin_pizzaria' &&
        req.user.pizzaria.toString() !== pizzariaId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // TODO: Implementar consultas de estatísticas
    const stats = {
      pedidosHoje: 0,
      faturamentoDia: 0,
      pedidosAndamento: 0,
      tempoMedioEntrega: 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;