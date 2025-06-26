const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

async function atualizarTipoSabores() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar todos os sabores
    const sabores = await ItemCardapio.find({ categoria: 'sabor' });
    console.log(`📊 Encontrados ${sabores.length} sabores para atualizar`);

    let sucessos = 0;
    let erros = 0;

    for (const sabor of sabores) {
      try {
        // Verificar se a descrição inicia com 'Pizza doce' (case insensitive)
        const tipoSabor = sabor.descricao.toLowerCase().startsWith('pizza doce') ? 'doce' : 'salgado';
        
        // Atualizar o sabor
        await ItemCardapio.updateOne(
          { _id: sabor._id },
          { $set: { tipoSabor: tipoSabor } }
        );

        console.log(`✅ ${sabor.nome}: ${tipoSabor}`);
        sucessos++;

      } catch (error) {
        console.error(`❌ Erro ao atualizar sabor "${sabor.nome}":`, error.message);
        erros++;
      }
    }

    console.log(`\n🎉 Atualização finalizada!`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);

  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar o script
atualizarTipoSabores();