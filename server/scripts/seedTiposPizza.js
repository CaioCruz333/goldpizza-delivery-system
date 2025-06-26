const mongoose = require('mongoose');
const TipoPizza = require('../models/TipoPizza');
const Pizzaria = require('../models/Pizzaria');
require('dotenv').config();

const seedTiposPizza = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar a pizzaria existente
    const pizzaria = await Pizzaria.findOne();
    if (!pizzaria) {
      console.log('❌ Nenhuma pizzaria encontrada. Execute o seed principal primeiro.');
      return;
    }

    // Limpar tipos existentes
    await TipoPizza.deleteMany({ pizzaria: pizzaria._id });
    console.log('🗑️ Tipos de pizza existentes removidos');

    // Criar tipos de pizza padrão
    const tiposPizza = [
      {
        nome: 'P',
        descricao: 'Pequena',
        fatias: 4,
        maxSabores: 1,
        ordem: 1,
        pizzaria: pizzaria._id
      },
      {
        nome: 'M',
        descricao: 'Média',
        fatias: 6,
        maxSabores: 2,
        ordem: 2,
        pizzaria: pizzaria._id
      },
      {
        nome: 'G',
        descricao: 'Grande',
        fatias: 8,
        maxSabores: 2,
        ordem: 3,
        pizzaria: pizzaria._id
      },
      {
        nome: 'GG',
        descricao: 'Gigante',
        fatias: 12,
        maxSabores: 3,
        ordem: 4,
        pizzaria: pizzaria._id
      }
    ];

    for (const tipo of tiposPizza) {
      const tipoPizza = new TipoPizza(tipo);
      await tipoPizza.save();
      console.log(`✅ Tipo de pizza criado: ${tipo.nome} - ${tipo.descricao} (${tipo.fatias} fatias, até ${tipo.maxSabores} sabores)`);
    }

    console.log('🎉 Tipos de pizza criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tipos de pizza:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexão com MongoDB fechada');
  }
};

// Executar apenas se chamado diretamente
if (require.main === module) {
  seedTiposPizza();
}

module.exports = seedTiposPizza;