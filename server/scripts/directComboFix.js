const mongoose = require('mongoose');
require('dotenv').config();

async function directComboFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;
    
    // Buscar a bebida Coca-Cola 2L
    const bebida2L = await db.collection('itemcardapios').findOne({
      categoria: 'bebida',
      tamanho: '2L'
    });

    if (!bebida2L) {
      console.log('❌ Bebida 2L não encontrada');
      return;
    }

    console.log(`✅ Bebida encontrada: ${bebida2L.nome} (ID: ${bebida2L._id})`);

    // Buscar combos com tamanhoBebida
    const combos = await db.collection('itemcardapios').find({
      categoria: 'combo',
      'itensCombo.tamanhoBebida': { $exists: true }
    }).toArray();

    console.log(`🔄 Encontrados ${combos.length} combos para corrigir`);

    for (const combo of combos) {
      console.log(`\n📦 Corrigindo combo: ${combo.nome}`);
      
      for (let i = 0; i < combo.itensCombo.length; i++) {
        const item = combo.itensCombo[i];
        
        if (item.tamanhoBebida === '2L' && item.tipo === 'bebida') {
          console.log(`  🥤 Corrigindo bebida 2L`);
          
          // Atualizar diretamente
          combo.itensCombo[i].item = bebida2L._id;
          delete combo.itensCombo[i].tamanhoBebida;
        }
      }
      
      // Salvar combo atualizado
      await db.collection('itemcardapios').replaceOne(
        { _id: combo._id },
        combo
      );
      
      console.log(`  ✅ Combo ${combo.nome} atualizado`);
    }

    console.log('\n🎉 Correção concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

directComboFix();