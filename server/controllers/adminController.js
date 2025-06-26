const Pedido = require('../models/Pedido');
const Pizzaria = require('../models/Pizzaria');
const User = require('../models/User');

const getAdminStats = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Contar pizzarias ativas
    const totalPizzarias = await Pizzaria.countDocuments({ ativa: true });

    // Contar pedidos de hoje
    const pedidosHoje = await Pedido.countDocuments({
      createdAt: { $gte: hoje }
    });

    // Faturamento do mês
    const faturamentoResult = await Pedido.aggregate([
      {
        $match: {
          createdAt: { $gte: inicioMes },
          status: 'entregue'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valores.total' }
        }
      }
    ]);

    const faturamentoMes = faturamentoResult.length > 0 ? faturamentoResult[0].total : 0;

    // Usuários ativos
    const usuariosAtivos = await User.countDocuments({ ativo: true });

    res.json({
      totalPizzarias,
      pedidosHoje,
      faturamentoMes,
      usuariosAtivos
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas admin:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

const getRelatorioVendas = async (req, res) => {
  try {
    const { dataInicio, dataFim, pizzariaId } = req.query;

    let matchQuery = {
      status: 'entregue'
    };

    if (dataInicio || dataFim) {
      matchQuery.createdAt = {};
      if (dataInicio) matchQuery.createdAt.$gte = new Date(dataInicio);
      if (dataFim) matchQuery.createdAt.$lte = new Date(dataFim);
    }

    if (pizzariaId) {
      matchQuery.pizzaria = pizzariaId;
    }

    const vendas = await Pedido.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            pizzaria: '$pizzaria',
            dia: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalPedidos: { $sum: 1 },
          faturamento: { $sum: '$valores.total' },
          ticketMedio: { $avg: '$valores.total' }
        }
      },
      {
        $lookup: {
          from: 'pizzarias',
          localField: '_id.pizzaria',
          foreignField: '_id',
          as: 'pizzaria'
        }
      },
      {
        $sort: { '_id.dia': -1 }
      }
    ]);

    res.json(vendas);
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

const getRelatorioProdutividade = async (req, res) => {
  try {
    const { dataInicio, dataFim, pizzariaId } = req.query;

    let matchQuery = {};

    if (dataInicio || dataFim) {
      matchQuery.createdAt = {};
      if (dataInicio) matchQuery.createdAt.$gte = new Date(dataInicio);
      if (dataFim) matchQuery.createdAt.$lte = new Date(dataFim);
    }

    if (pizzariaId) {
      matchQuery.pizzaria = pizzariaId;
    }

    const produtividade = await Pedido.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          quantidade: { $sum: 1 }
        }
      }
    ]);

    // Calcular tempo médio de preparo
    const temposPreparo = await Pedido.aggregate([
      {
        $match: {
          ...matchQuery,
          'tempos.pronto': { $exists: true }
        }
      },
      {
        $project: {
          tempoPreparo: {
            $subtract: ['$tempos.pronto', '$tempos.recebido']
          }
        }
      },
      {
        $group: {
          _id: null,
          tempoMedioPreparo: { $avg: '$tempoPreparo' }
        }
      }
    ]);

    const tempoMedioPreparo = temposPreparo.length > 0 
      ? Math.round(temposPreparo[0].tempoMedioPreparo / (1000 * 60)) // Converter para minutos
      : 0;

    res.json({
      statusDistribution: produtividade,
      tempoMedioPreparo
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de produtividade:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

module.exports = {
  getAdminStats,
  getRelatorioVendas,
  getRelatorioProdutividade
};