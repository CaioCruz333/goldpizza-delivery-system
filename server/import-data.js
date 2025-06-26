const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Importar todos os modelos
const User = require('./models/User');
const Pizzaria = require('./models/Pizzaria');
const Pedido = require('./models/Pedido');

async function importData() {
  try {
    // Ler dados do backup
    if (!fs.existsSync('./data-backup.json')) {
      throw new Error('Arquivo data-backup.json não encontrado');
    }

    const backupData = JSON.parse(fs.readFileSync('./data-backup.json', 'utf8'));
    console.log('📂 Backup carregado:', new Date(backupData.exportDate));

    // Conectar ao MongoDB de produção (MongoDB Atlas)
    const MONGODB_PROD_URI = process.env.MONGODB_URI;

    await mongoose.connect(MONGODB_PROD_URI);
    console.log('✅ Conectado ao MongoDB de produção');

    // Limpar dados existentes
    console.log('🗑️ Limpando dados existentes...');
    await User.deleteMany({});
    await Pizzaria.deleteMany({});
    await Pedido.deleteMany({});

    // Importar dados
    console.log('📥 Importando dados...');
    
    if (backupData.users.length > 0) {
      await User.insertMany(backupData.users);
      console.log(`   ✅ ${backupData.users.length} usuários importados`);
    }

    if (backupData.pizzarias.length > 0) {
      await Pizzaria.insertMany(backupData.pizzarias);
      console.log(`   ✅ ${backupData.pizzarias.length} pizzarias importadas`);
    }

    if (backupData.pedidos.length > 0) {
      await Pedido.insertMany(backupData.pedidos);
      console.log(`   ✅ ${backupData.pedidos.length} pedidos importados`);
    }

    await mongoose.connection.close();
    console.log('✅ Importação concluída!');
    console.log('🚀 Agora os dados da produção estão sincronizados com o local');
    
  } catch (error) {
    console.error('❌ Erro ao importar:', error);
    process.exit(1);
  }
}

importData();