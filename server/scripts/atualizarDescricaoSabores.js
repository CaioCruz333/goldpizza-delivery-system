const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

async function atualizarDescricaoSabores() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar todos os sabores
    const sabores = await ItemCardapio.find({ categoria: 'sabor' });
    console.log(`📊 Encontrados ${sabores.length} sabores para atualizar descrição`);

    let sucessos = 0;
    let erros = 0;

    for (const sabor of sabores) {
      try {
        // Atualizar descrição para ser automática baseada no nome
        const novaDescricao = `Sabor ${sabor.nome}`;
        
        await ItemCardapio.updateOne(
          { _id: sabor._id },
          { $set: { descricao: novaDescricao } }
        );

        console.log(`✅ ${sabor.nome}: "${novaDescricao}"`);
        sucessos++;

      } catch (error) {
        console.error(`❌ Erro ao atualizar descrição do sabor "${sabor.nome}":`, error.message);
        erros++;
      }
    }

    console.log(`\n🎉 Atualização de descrições finalizada!`);
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
atualizarDescricaoSabores();