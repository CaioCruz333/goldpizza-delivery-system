const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');

async function testAllCombos() {
  try {
    // Conectar ao banco de dados
    await mongoose.connect('mongodb://localhost:27017/goldpizza', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');

    console.log('\n🔍 Verificando todos os combos do sistema...');
    
    const combos = await ItemCardapio.find({ categoria: 'combo' })
      .populate('itensCombo.item', 'nome categoria')
      .sort({ nome: 1 });
    
    console.log(`\n📋 Encontrados ${combos.length} combos no sistema:`);
    
    combos.forEach((combo, index) => {
      console.log(`\n${index + 1}. 🎯 ${combo.nome}:`);
      console.log(`   Pizzaria: ${combo.pizzaria}`);
      console.log(`   Preço: R$ ${combo.preco}`);
      
      if (combo.itensCombo && combo.itensCombo.length > 0) {
        console.log(`   Itens do combo:`);
        combo.itensCombo.forEach((item, i) => {
          const itemInfo = item.item ? ` (${item.item.nome})` : '';
          const tamanho = item.tamanhoBebida ? ` - ${item.tamanhoBebida}` : '';
          console.log(`     ${i + 1}. ${item.tipo}${tamanho} x${item.quantidade}${itemInfo}`);
        });
        
        // Verificar se está ordenado corretamente
        const tipos = combo.itensCombo.map(item => item.tipo);
        const pizzaIndex = tipos.indexOf('pizza');
        const bebidaIndex = tipos.indexOf('bebida');
        
        const isCorrectOrder = pizzaIndex !== -1 && bebidaIndex !== -1 ? pizzaIndex < bebidaIndex : true;
        console.log(`   📊 Ordenação: ${isCorrectOrder ? '✅ CORRETA' : '❌ INCORRETA'} [${tipos.join(', ')}]`);
      } else {
        console.log(`   ⚠️  Combo sem itens definidos`);
      }
    });

    console.log(`\n🎯 Verificação concluída!`);

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar o teste
testAllCombos();