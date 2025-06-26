/**
 * Calculadora de preços para pizzas com sabores especiais
 * 
 * Lógica: Preço Final = Preço Base + (Valor Especial × Quantidade de Sabores)
 */

const calcularPrecoPizza = (tipoPizza, saboresSelecionados, pizzaBase) => {
  // 1. Obter preço base da pizza pelo tipo
  const precoBase = pizzaBase.precosPorTipo.find(
    preco => preco.tipoPizza.toString() === tipoPizza._id.toString()
  );

  if (!precoBase) {
    throw new Error(`Preço não encontrado para o tipo ${tipoPizza.nome}`);
  }

  // 2. Calcular valor adicional dos sabores
  let valorAdicionalSabores = 0;
  
  for (const sabor of saboresSelecionados) {
    valorAdicionalSabores += sabor.valorEspecial || 0;
  }

  // 3. Multiplicar pelo número de sabores (conforme solicitado)
  const quantidadeSabores = saboresSelecionados.length;
  const valorEspecialTotal = valorAdicionalSabores * quantidadeSabores;

  // 4. Calcular preço final
  const precoFinal = precoBase.preco + valorEspecialTotal;

  return {
    tipoPizza: tipoPizza.nome,
    precoBase: precoBase.preco,
    sabores: saboresSelecionados.map(s => ({
      nome: s.nome,
      valorEspecial: s.valorEspecial
    })),
    quantidadeSabores,
    valorEspecialUnitario: valorAdicionalSabores,
    valorEspecialTotal,
    precoFinal,
    detalhes: {
      calculo: `R$ ${precoBase.preco.toFixed(2)} + (R$ ${valorAdicionalSabores.toFixed(2)} × ${quantidadeSabores}) = R$ ${precoFinal.toFixed(2)}`,
      fatias: tipoPizza.fatias,
      maxSabores: tipoPizza.maxSabores
    }
  };
};

const validarSelecaoSabores = (tipoPizza, saboresSelecionados) => {
  const erros = [];

  // Verificar se não excede máximo de sabores
  if (saboresSelecionados.length > tipoPizza.maxSabores) {
    erros.push(`Tipo ${tipoPizza.nome} permite no máximo ${tipoPizza.maxSabores} sabores. Selecionados: ${saboresSelecionados.length}`);
  }

  // Verificar se tem pelo menos um sabor
  if (saboresSelecionados.length === 0) {
    erros.push('Selecione pelo menos um sabor');
  }

  return {
    valido: erros.length === 0,
    erros
  };
};

// Função para simular diferentes cenários
const exemploCalculos = () => {
  console.log('🍕 EXEMPLOS DE CÁLCULO DE PREÇOS\n');
  
  // Dados de exemplo (baseados nos seeds criados)
  const tipoM = { _id: 'tipo_m', nome: 'M', fatias: 6, maxSabores: 2 };
  const tipoG = { _id: 'tipo_g', nome: 'G', fatias: 8, maxSabores: 2 };
  const tipoGG = { _id: 'tipo_gg', nome: 'GG', fatias: 12, maxSabores: 3 };

  const pizzaBase = {
    precosPorTipo: [
      { tipoPizza: 'tipo_m', preco: 35.00 },
      { tipoPizza: 'tipo_g', preco: 45.00 },
      { tipoPizza: 'tipo_gg', preco: 55.00 }
    ]
  };

  const sabores = {
    margherita: { nome: 'Margherita', valorEspecial: 0 },
    pepperoni: { nome: 'Pepperoni', valorEspecial: 2.50 },
    quatroQueijos: { nome: 'Quatro Queijos', valorEspecial: 5.00 },
    camarao: { nome: 'Camarão', valorEspecial: 8.00 }
  };

  const cenarios = [
    {
      descricao: 'Pizza M com 1 sabor simples',
      tipo: tipoM,
      sabores: [sabores.margherita]
    },
    {
      descricao: 'Pizza M com 2 sabores especiais',
      tipo: tipoM,
      sabores: [sabores.pepperoni, sabores.quatroQueijos]
    },
    {
      descricao: 'Pizza G com 1 sabor premium',
      tipo: tipoG,
      sabores: [sabores.camarao]
    },
    {
      descricao: 'Pizza GG com 3 sabores mistos',
      tipo: tipoGG,
      sabores: [sabores.margherita, sabores.pepperoni, sabores.camarao]
    }
  ];

  cenarios.forEach((cenario, index) => {
    console.log(`${index + 1}. ${cenario.descricao}`);
    try {
      const validacao = validarSelecaoSabores(cenario.tipo, cenario.sabores);
      if (!validacao.valido) {
        console.log(`   ❌ Erro: ${validacao.erros.join(', ')}`);
        return;
      }

      const resultado = calcularPrecoPizza(cenario.tipo, cenario.sabores, pizzaBase);
      console.log(`   ✅ ${resultado.detalhes.calculo}`);
      console.log(`   📝 Sabores: ${resultado.sabores.map(s => `${s.nome} (+R$ ${s.valorEspecial.toFixed(2)})`).join(', ')}`);
      console.log(`   🍕 ${resultado.fatias} fatias, até ${resultado.maxSabores} sabores`);
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    console.log('');
  });
};

module.exports = {
  calcularPrecoPizza,
  validarSelecaoSabores,
  exemploCalculos
};

// Executar exemplos se chamado diretamente
if (require.main === module) {
  exemploCalculos();
}