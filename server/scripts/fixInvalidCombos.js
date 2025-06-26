const mongoose = require('mongoose');
require('dotenv').config();

async function fixInvalidCombos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;
    
    // Buscar combos com referências inválidas
    const combosInvalidos = await db.collection('itemcardapios').find({
      categoria: 'combo',
      $or: [
        { 'itensCombo.item': { $exists: false } },
        { 'itensCombo.item': null },
        { 'itensCombo.item': undefined },
        { 'itensCombo': { $elemMatch: { item: { $exists: false } } } },
        { 'itensCombo': { $elemMatch: { item: null } } }
      ]
    }).toArray();

    console.log(`🔍 Encontrados ${combosInvalidos.length} combos com referências inválidas`);

    if (combosInvalidos.length === 0) {
      console.log('✅ Nenhum combo inválido encontrado');
      return;
    }

    // Buscar bebida padrão para substituir referências inválidas
    const bebidaPadrao = await db.collection('itemcardapios').findOne({
      categoria: 'bebida',
      tamanho: '2L'
    });

    if (!bebidaPadrao) {
      console.log('❌ Bebida padrão 2L não encontrada');
      return;
    }

    console.log(`✅ Bebida padrão encontrada: ${bebidaPadrao.nome} (ID: ${bebidaPadrao._id})`);

    for (const combo of combosInvalidos) {
      console.log(`\n📦 Corrigindo combo: ${combo.nome}`);
      
      // Filtrar itens válidos e corrigir inválidos
      const itensCorrigidos = combo.itensCombo.map(item => {
        if (!item.item || item.item === null || item.item === undefined) {
          console.log(`  🔧 Corrigindo item inválido do tipo: ${item.tipo}`);
          
          if (item.tipo === 'bebida') {
            return {
              ...item,
              item: bebidaPadrao._id,
              quantidade: item.quantidade || 1
            };
          } else {
            // Para outros tipos, manter o item mas logar para revisão manual
            console.log(`  ⚠️  Item de tipo '${item.tipo}' precisa de revisão manual`);
            return null; // Remover item inválido
          }
        }
        return item;
      }).filter(item => item !== null); // Remover itens nulos

      // Atualizar combo com itens corrigidos
      await db.collection('itemcardapios').updateOne(
        { _id: combo._id },
        { $set: { itensCombo: itensCorrigidos } }
      );
      
      console.log(`  ✅ Combo ${combo.nome} corrigido`);
    }

    console.log('\n🎉 Correção de combos inválidos concluída!');

    // Verificar se ainda há combos inválidos
    const combosAindaInvalidos = await db.collection('itemcardapios').find({
      categoria: 'combo',
      $or: [
        { 'itensCombo.item': { $exists: false } },
        { 'itensCombo.item': null },
        { 'itensCombo.item': undefined }
      ]
    }).toArray();

    if (combosAindaInvalidos.length > 0) {
      console.log(`⚠️  Ainda restam ${combosAindaInvalidos.length} combos que precisam de revisão manual:`);
      combosAindaInvalidos.forEach(combo => {
        console.log(`  - ${combo.nome} (ID: ${combo._id})`);
      });
    } else {
      console.log('✅ Todos os combos foram corrigidos com sucesso!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixInvalidCombos();