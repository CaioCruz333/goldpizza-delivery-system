const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
const TipoPizza = require('../models/TipoPizza');
const Pizzaria = require('../models/Pizzaria');
require('dotenv').config();

const seedPizzasBase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar a pizzaria existente
    const pizzaria = await Pizzaria.findOne();
    if (!pizzaria) {
      console.log('❌ Nenhuma pizzaria encontrada. Execute o seed principal primeiro.');
      return;
    }

    // Buscar tipos de pizza
    const tiposPizza = await TipoPizza.find({ pizzaria: pizzaria._id }).sort({ ordem: 1 });
    if (tiposPizza.length === 0) {
      console.log('❌ Nenhum tipo de pizza encontrado. Execute o seed de tipos primeiro.');
      return;
    }

    // Limpar pizzas existentes
    await ItemCardapio.deleteMany({ categoria: 'pizza', pizzaria: pizzaria._id });
    console.log('🗑️ Pizzas existentes removidas');

    // Criar pizza base com preços por tipo
    const precosPorTipo = tiposPizza.map(tipo => ({
      tipoPizza: tipo._id,
      preco: tipo.nome === 'P' ? 25.00 :
             tipo.nome === 'M' ? 35.00 :
             tipo.nome === 'G' ? 45.00 :
             tipo.nome === 'GG' ? 55.00 : 30.00
    }));

    const pizzaBase = {
      nome: 'Pizza Tradicional',
      descricao: 'Pizza tradicional com massa artesanal - escolha seus sabores',
      categoria: 'pizza',
      preco: 30.00, // Preço base médio
      valorEspecial: 0,
      quantidadeFatias: 8, // Valor padrão
      quantidadeSabores: 2, // Valor padrão
      precosPorTipo: precosPorTipo,
      tempoPreparoMinutos: 25,
      pizzaria: pizzaria._id
    };

    const novaPizza = new ItemCardapio(pizzaBase);
    await novaPizza.save();
    
    console.log('✅ Pizza base criada:');
    console.log(`   Nome: ${pizzaBase.nome}`);
    tiposPizza.forEach(tipo => {
      const preco = precosPorTipo.find(p => p.tipoPizza.toString() === tipo._id.toString());
      console.log(`   ${tipo.nome} (${tipo.fatias} fatias, até ${tipo.maxSabores} sabores): R$ ${preco.preco.toFixed(2)}`);
    });

    console.log('');
    console.log('🎉 Pizza base criada com sucesso!');
    console.log('');
    console.log('💡 Exemplo de cálculo de preço:');
    console.log('   Pizza M (R$ 35,00) + 2 sabores Camarão (R$ 8,00 cada) = R$ 51,00');
    console.log('   Pizza G (R$ 45,00) + 1 sabor Pepperoni (R$ 2,50) = R$ 47,50');

  } catch (error) {
    console.error('❌ Erro ao criar pizza base:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
  }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
  seedPizzasBase();
}

module.exports = seedPizzasBase;