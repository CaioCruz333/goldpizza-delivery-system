const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
const Pizzaria = require('../models/Pizzaria');
require('dotenv').config();

const seedBebidas = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🥤 Conectado ao MongoDB');

    // Buscar a pizzaria existente
    const pizzaria = await Pizzaria.findOne();
    if (!pizzaria) {
      console.log('❌ Nenhuma pizzaria encontrada. Execute o seed principal primeiro.');
      return;
    }

    // Limpar bebidas existentes
    await ItemCardapio.deleteMany({ categoria: 'bebida', pizzaria: pizzaria._id });
    console.log('🗑️ Bebidas existentes removidas');

    // Criar bebidas de exemplo - uma entrada para cada tamanho
    const bebidasData = [
      {
        nome: 'Coca-Cola',
        descricao: 'Refrigerante de cola tradicional',
        tamanhos: [
          { nome: '350ml', preco: 4.50, descricao: 'Lata' },
          { nome: '600ml', preco: 6.50, descricao: 'Garrafa' },
          { nome: '2L', preco: 8.50, descricao: 'Garrafa família' }
        ]
      },
      {
        nome: 'Guaraná Antarctica',
        descricao: 'Refrigerante de guaraná natural',
        tamanhos: [
          { nome: '350ml', preco: 4.50, descricao: 'Lata' },
          { nome: '600ml', preco: 6.50, descricao: 'Garrafa' },
          { nome: '2L', preco: 8.50, descricao: 'Garrafa família' }
        ]
      },
      {
        nome: 'Suco de Laranja',
        descricao: 'Suco natural de laranja',
        tamanhos: [
          { nome: '300ml', preco: 5.00, descricao: 'Copo' },
          { nome: '500ml', preco: 7.50, descricao: 'Garrafa' }
        ]
      },
      {
        nome: 'Água Mineral',
        descricao: 'Água mineral sem gás',
        tamanhos: [
          { nome: '500ml', preco: 2.50, descricao: 'Garrafa' },
          { nome: '1.5L', preco: 4.00, descricao: 'Garrafa grande' }
        ]
      },
      {
        nome: 'Cerveja Heineken',
        descricao: 'Cerveja premium importada',
        tamanhos: [
          { nome: '330ml', preco: 8.50, descricao: 'Long neck' },
          { nome: '600ml', preco: 12.00, descricao: 'Garrafa' }
        ]
      }
    ];

    // Criar uma entrada no cardápio para cada tamanho de bebida
    for (const bebidaData of bebidasData) {
      for (const tamanho of bebidaData.tamanhos) {
        const bebida = {
          nome: `${bebidaData.nome} ${tamanho.nome}`,
          descricao: `${bebidaData.descricao} - ${tamanho.descricao}`,
          categoria: 'bebida',
          preco: tamanho.preco,
          valorEspecial: 0,
          tamanho: tamanho.nome,
          pizzaria: pizzaria._id
        };

        const novaBebida = new ItemCardapio(bebida);
        await novaBebida.save();
        console.log(`✅ Bebida criada: ${bebida.nome} - R$ ${bebida.preco.toFixed(2)}`);
      }
    }

    console.log('🎉 Bebidas criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar bebidas:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
  }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
  seedBebidas();
}

module.exports = seedBebidas;