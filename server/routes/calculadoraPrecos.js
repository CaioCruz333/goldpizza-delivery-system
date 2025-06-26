const express = require('express');
const router = express.Router();
const ItemCardapio = require('../models/Cardapio');
const TipoPizza = require('../models/TipoPizza');
const { calcularPrecoPizza, validarSelecaoSabores } = require('../utils/calculadoraPrecos');
const { auth } = require('../middleware/auth');

// POST /calcular-preco - Calcular preço de uma pizza customizada
router.post('/calcular-preco', auth, async (req, res) => {
  try {
    const { tipoPizzaId, saboresIds, pizzariaId } = req.body;

    // Validar parâmetros obrigatórios
    if (!tipoPizzaId || !saboresIds || !pizzariaId) {
      return res.status(400).json({
        message: 'tipoPizzaId, saboresIds e pizzariaId são obrigatórios'
      });
    }

    // Buscar tipo da pizza
    const tipoPizza = await TipoPizza.findById(tipoPizzaId);
    if (!tipoPizza) {
      return res.status(404).json({ message: 'Tipo de pizza não encontrado' });
    }

    // Buscar pizza base para o tipo específico
    const pizzaBase = await ItemCardapio.findOne({ 
      categoria: 'pizza', 
      tipoPizza: tipoPizzaId,
      pizzaria: pizzariaId 
    });
    if (!pizzaBase) {
      return res.status(404).json({ message: 'Pizza base para este tipo não encontrada' });
    }

    // Buscar sabores selecionados
    const saboresSelecionados = await ItemCardapio.find({
      _id: { $in: saboresIds },
      categoria: 'sabor',
      pizzaria: pizzariaId
    });

    if (saboresSelecionados.length !== saboresIds.length) {
      return res.status(404).json({ message: 'Um ou mais sabores não encontrados' });
    }

    // Validar seleção de sabores
    const validacao = validarSelecaoSabores(tipoPizza, saboresSelecionados);
    if (!validacao.valido) {
      return res.status(400).json({
        message: 'Seleção de sabores inválida',
        erros: validacao.erros
      });
    }

    // Calcular preço
    const resultado = calcularPrecoPizza(tipoPizza, saboresSelecionados, pizzaBase);

    res.json({
      success: true,
      calculo: resultado
    });

  } catch (error) {
    console.error('Erro ao calcular preço:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// GET /tipos-sabores/:pizzariaId - Listar tipos de pizza e sabores disponíveis
router.get('/tipos-sabores/:pizzariaId', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.params;

    // Buscar tipos de pizza
    const tiposPizza = await TipoPizza.find({ pizzaria: pizzariaId, ativo: true })
      .sort({ ordem: 1 });

    // Buscar sabores disponíveis
    const sabores = await ItemCardapio.find({
      categoria: 'sabor',
      pizzaria: pizzariaId,
      disponivel: true
    }).select('nome descricao valorEspecial')
      .sort({ nome: 1 });

    // Buscar pizzas com preços para cada tipo
    const pizzasComPrecos = await ItemCardapio.find({
      categoria: 'pizza',
      pizzaria: pizzariaId
    }).populate('tipoPizza');

    if (pizzasComPrecos.length === 0) {
      return res.status(404).json({ message: 'Nenhuma pizza configurada' });
    }

    // Criar mapa de preços por tipo de pizza
    const precosPorTipo = {};
    pizzasComPrecos.forEach(pizza => {
      if (pizza.tipoPizza) {
        precosPorTipo[pizza.tipoPizza._id] = {
          tipoPizza: pizza.tipoPizza,
          preco: pizza.preco
        };
      }
    });

    res.json({
      tiposPizza,
      sabores,
      precosPorTipo
    });

  } catch (error) {
    console.error('Erro ao buscar tipos e sabores:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /simular-precos - Simular diferentes combinações (útil para testes)
router.post('/simular-precos', auth, async (req, res) => {
  try {
    const { pizzariaId } = req.body;

    const tiposPizza = await TipoPizza.find({ pizzaria: pizzariaId, ativo: true });
    const sabores = await ItemCardapio.find({ categoria: 'sabor', pizzaria: pizzariaId, disponivel: true });
    const pizzaBase = await ItemCardapio.findOne({ categoria: 'pizza', pizzaria: pizzariaId });

    if (!pizzaBase || tiposPizza.length === 0 || sabores.length === 0) {
      return res.status(404).json({ message: 'Dados incompletos para simulação' });
    }

    // Criar algumas combinações de exemplo
    const simulacoes = [];

    for (const tipo of tiposPizza) {
      // Simulação 1: Pizza com 1 sabor mais barato
      const saborMaisBarato = sabores.reduce((min, sabor) => 
        sabor.valorEspecial < min.valorEspecial ? sabor : min
      );
      
      try {
        const calc1 = calcularPrecoPizza(tipo, [saborMaisBarato], pizzaBase);
        simulacoes.push({
          cenario: `${tipo.nome} com sabor mais barato`,
          ...calc1
        });
      } catch (error) {
        console.error('Erro na simulação 1:', error.message);
      }

      // Simulação 2: Pizza com máximo de sabores permitidos (sabores mais caros)
      const saboresCaros = sabores
        .sort((a, b) => b.valorEspecial - a.valorEspecial)
        .slice(0, tipo.maxSabores);
      
      try {
        const calc2 = calcularPrecoPizza(tipo, saboresCaros, pizzaBase);
        simulacoes.push({
          cenario: `${tipo.nome} com sabores premium`,
          ...calc2
        });
      } catch (error) {
        console.error('Erro na simulação 2:', error.message);
      }
    }

    res.json({
      simulacoes,
      resumo: {
        totalTipos: tiposPizza.length,
        totalSabores: sabores.length,
        faixaPrecos: {
          minimo: Math.min(...simulacoes.map(s => s.precoFinal)),
          maximo: Math.max(...simulacoes.map(s => s.precoFinal))
        }
      }
    });

  } catch (error) {
    console.error('Erro na simulação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router;