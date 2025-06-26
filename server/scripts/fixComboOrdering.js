const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');

async function fixComboOrdering() {
  try {
    // Conectar ao banco de dados
    await mongoose.connect('mongodb://localhost:27017/goldpizza', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');

    // Buscar todos os combos
    const combos = await ItemCardapio.find({ categoria: 'combo' });
    console.log(`\nEncontrados ${combos.length} combos para verificar`);

    let combosAtualizados = 0;

    for (const combo of combos) {
      if (combo.itensCombo && combo.itensCombo.length > 0) {
        // Verificar se precisa de reordenação
        const originalOrder = combo.itensCombo.map(item => item.tipo);
        
        // Criar cópia ordenada
        const itensOrdenados = [...combo.itensCombo].sort((a, b) => {
          if (a.tipo === 'pizza' && b.tipo === 'bebida') return -1;
          if (a.tipo === 'bebida' && b.tipo === 'pizza') return 1;
          return 0;
        });
        
        const newOrder = itensOrdenados.map(item => item.tipo);
        
        // Verificar se a ordem mudou
        const needsUpdate = JSON.stringify(originalOrder) !== JSON.stringify(newOrder);
        
        console.log(`\n📋 Combo: ${combo.nome}`);
        console.log(`   Ordem original: [${originalOrder.join(', ')}]`);
        console.log(`   Nova ordem:     [${newOrder.join(', ')}]`);
        console.log(`   Precisa atualizar: ${needsUpdate ? '✅ SIM' : '❌ NÃO'}`);
        
        if (needsUpdate) {
          // Atualizar o combo no banco
          combo.itensCombo = itensOrdenados;
          await combo.save();
          combosAtualizados++;
          console.log(`   ✅ Combo atualizado com sucesso!`);
        }
      } else {
        console.log(`\n📋 Combo: ${combo.nome} - sem itens`);
      }
    }

    console.log(`\n🎯 Resumo:`);
    console.log(`   Total de combos verificados: ${combos.length}`);
    console.log(`   Combos atualizados: ${combosAtualizados}`);
    console.log(`   Combos que já estavam corretos: ${combos.length - combosAtualizados}`);

    if (combosAtualizados > 0) {
      console.log(`\n✅ Correção concluída! ${combosAtualizados} combo(s) foram reordenados.`);
    } else {
      console.log(`\n✅ Todos os combos já estavam com a ordenação correta!`);
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir ordenação dos combos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar o script
fixComboOrdering();