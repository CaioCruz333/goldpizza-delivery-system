const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
const Pizzaria = require('../models/Pizzaria');
require('dotenv').config();

const seedSabores = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar a pizzaria existente
    const pizzaria = await Pizzaria.findOne();
    if (!pizzaria) {
      console.log('❌ Nenhuma pizzaria encontrada. Execute o seed principal primeiro.');
      return;
    }

    // Limpar sabores existentes
    await ItemCardapio.deleteMany({ categoria: 'sabor', pizzaria: pizzaria._id });
    console.log('🗑️ Sabores existentes removidos');

    // Criar sabores de exemplo
    const sabores = [
      {
        nome: 'Margherita',
        descricao: 'Molho de tomate, mussarela, manjericão fresco e azeite',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 0, // Sabor simples sem valor adicional
        pizzaria: pizzaria._id
      },
      {
        nome: 'Pepperoni',
        descricao: 'Molho de tomate, mussarela e pepperoni',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 2.50, // Sabor com valor adicional
        pizzaria: pizzaria._id
      },
      {
        nome: 'Quatro Queijos',
        descricao: 'Mussarela, parmesão, gorgonzola e provolone',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 5.00, // Sabor premium
        pizzaria: pizzaria._id
      },
      {
        nome: 'Portuguesa',
        descricao: 'Presunto, ovos, cebola, azeitona e ervilha',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 3.00,
        pizzaria: pizzaria._id
      },
      {
        nome: 'Calabresa',
        descricao: 'Calabresa, cebola e azeitona',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 1.00,
        pizzaria: pizzaria._id
      },
      {
        nome: 'Frango com Catupiry',
        descricao: 'Frango desfiado, catupiry e milho',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 3.50,
        pizzaria: pizzaria._id
      },
      {
        nome: 'Camarão',
        descricao: 'Camarão, catupiry e cebola',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 8.00, // Sabor premium
        pizzaria: pizzaria._id
      },
      {
        nome: 'Chocolate',
        descricao: 'Chocolate ao leite com granulado',
        categoria: 'sabor',
        preco: 0,
        valorEspecial: 4.00, // Sabor doce
        pizzaria: pizzaria._id
      }
    ];

    for (const sabor of sabores) {
      const novoSabor = new ItemCardapio(sabor);
      await novoSabor.save();
      console.log(`✅ Sabor criado: ${sabor.nome} - Valor especial: R$ ${sabor.valorEspecial.toFixed(2)}`);
    }

    console.log('🎉 Sabores criados com sucesso!');
    console.log('');
    console.log('📝 Lógica de preços:');
    console.log('   • Pizza base (P/M/G/GG): preço configurado por tipo');
    console.log('   • Sabor especial: valor adicional × quantidade de sabores');
    console.log('   • Preço final = preço base + (valor especial × qtd sabores)');

  } catch (error) {
    console.error('❌ Erro ao criar sabores:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
  }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
  seedSabores();
}

module.exports = seedSabores;