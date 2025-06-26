const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Importar todos os modelos
const User = require('./models/User');
const Pizzaria = require('./models/Pizzaria');
const Pedido = require('./models/Pedido');

async function exportData() {
  try {
    // Conectar ao MongoDB local
    await mongoose.connect('mongodb://localhost:27017/goldpizza');
    console.log('✅ Conectado ao MongoDB local');

    // Exportar dados
    const users = await User.find({});
    const pizzarias = await Pizzaria.find({});
    const pedidos = await Pedido.find({});

    const exportData = {
      users,
      pizzarias,
      pedidos,
      exportDate: new Date()
    };

    // Salvar em arquivo
    fs.writeFileSync('./data-backup.json', JSON.stringify(exportData, null, 2));
    
    console.log(`📦 Dados exportados:`);
    console.log(`   - ${users.length} usuários`);
    console.log(`   - ${pizzarias.length} pizzarias`);
    console.log(`   - ${pedidos.length} pedidos`);
    console.log(`   - Arquivo: data-backup.json`);

    await mongoose.connection.close();
    console.log('✅ Exportação concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao exportar:', error);
    process.exit(1);
  }
}

exportData();