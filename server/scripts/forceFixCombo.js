const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

async function forceFixCombo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB');

    // Buscar a bebida Coca-Cola 2L
    const bebida2L = await ItemCardapio.findOne({
      categoria: 'bebida',
      tamanho: '2L'
    });

    if (!bebida2L) {
      console.log('❌ Bebida 2L não encontrada');
      return;
    }

    console.log(`✅ Bebida encontrada: ${bebida2L.nome} (ID: ${bebida2L._id})`);

    // Atualizar todos os combos que têm tamanhoBebida: "2L"
    const result = await ItemCardapio.updateMany(
      {
        categoria: 'combo',
        'itensCombo.tamanhoBebida': '2L',
        'itensCombo.tipo': 'bebida'
      },
      {
        $set: {
          'itensCombo.$[elem].item': bebida2L._id
        },
        $unset: {
          'itensCombo.$[elem].tamanhoBebida': ''
        }
      },
      {
        arrayFilters: [
          {
            'elem.tipo': 'bebida',
            'elem.tamanhoBebida': '2L'
          }
        ]
      }
    );

    console.log(`✅ Atualizados ${result.modifiedCount} combos`);

    // Verificar resultado
    const combosAtualizados = await ItemCardapio.find({
      categoria: 'combo',
      'itensCombo.item': bebida2L._id
    }).populate('itensCombo.item', 'nome categoria tamanho');

    console.log('\n📦 Combos atualizados:');
    combosAtualizados.forEach(combo => {
      console.log(`- ${combo.nome}:`);
      combo.itensCombo.forEach(item => {
        if (item.tipo === 'bebida') {
          console.log(`  🥤 ${item.item?.nome || 'Bebida'} (quantidade: ${item.quantidade})`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

forceFixCombo();