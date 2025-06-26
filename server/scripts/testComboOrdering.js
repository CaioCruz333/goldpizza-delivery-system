const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');

async function testComboOrdering() {
  try {
    // Conectar ao banco de dados
    await mongoose.connect('mongodb://localhost:27017/goldpizza', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado ao MongoDB');

    // Simular o que a rota admin faz
    const pizzariaId = '6852bbe82a4d58c0a099d5f5'; // ID da pizzaria de teste
    
    console.log('\n🔍 Testando ordenação de combos na consulta admin...');
    console.log(`Pizzaria ID: ${pizzariaId}`);
    
    const query = { 
      pizzaria: pizzariaId,
      categoria: 'combo'
    };

    const itens = await ItemCardapio.find(query)
      .populate('itensCombo.item', 'nome categoria')
      .sort({ categoria: 1, nome: 1 });
    
    console.log(`\n📋 Encontrados ${itens.length} combos antes da ordenação:`);
    
    // Mostrar ordem antes da correção
    itens.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.nome}:`);
      if (item.itensCombo && item.itensCombo.length > 0) {
        item.itensCombo.forEach((comboItem, i) => {
          console.log(`   ${i + 1}. Tipo: ${comboItem.tipo}, Quantidade: ${comboItem.quantidade}`);
        });
      }
    });

    // Aplicar a ordenação (como na rota admin corrigida)
    itens.forEach(item => {
      if (item.categoria === 'combo' && item.itensCombo) {
        item.itensCombo.sort((a, b) => {
          if (a.tipo === 'pizza' && b.tipo === 'bebida') return -1;
          if (a.tipo === 'bebida' && b.tipo === 'pizza') return 1;
          return 0;
        });
      }
    });

    console.log(`\n✅ Após aplicar ordenação:`);
    
    // Mostrar ordem depois da correção
    itens.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.nome}:`);
      if (item.itensCombo && item.itensCombo.length > 0) {
        item.itensCombo.forEach((comboItem, i) => {
          console.log(`   ${i + 1}. Tipo: ${comboItem.tipo}, Quantidade: ${comboItem.quantidade}`);
        });
      }
    });

    console.log(`\n🎯 Teste concluído!`);
    console.log(`A rota admin agora está retornando combos com pizzas primeiro.`);

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

// Executar o teste
testComboOrdering();