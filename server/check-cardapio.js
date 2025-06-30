const mongoose = require('mongoose');
require('dotenv').config();

const ItemCardapio = require('./models/Cardapio');
const Pizzaria = require('./models/Pizzaria');

async function checkCardapio() {
  try {
    // Conectar ao MongoDB local
    console.log('🔍 Verificando dados locais...');
    await mongoose.connect('mongodb://localhost:27017/goldpizza');
    
    const pizzariasLocal = await Pizzaria.find({});
    const cardapioLocal = await ItemCardapio.find({});
    
    console.log(`📊 LOCAL:`);
    console.log(`   - ${pizzariasLocal.length} pizzarias`);
    console.log(`   - ${cardapioLocal.length} itens de cardápio`);
    
    if (cardapioLocal.length > 0) {
      console.log(`   - Categorias:`, [...new Set(cardapioLocal.map(item => item.categoria))]);
      console.log(`   - Primeira pizzaria ID:`, pizzariasLocal[0]?._id);
      
      const itensPrimeiraPizzaria = cardapioLocal.filter(item => 
        item.pizzaria.toString() === pizzariasLocal[0]?._id.toString()
      );
      console.log(`   - Itens da primeira pizzaria: ${itensPrimeiraPizzaria.length}`);
    }
    
    await mongoose.connection.close();
    
    // Conectar ao MongoDB de produção
    console.log('\n🌐 Verificando dados de produção...');
    const MONGODB_PROD_URI = process.env.MONGODB_URI;
    await mongoose.connect(MONGODB_PROD_URI);
    
    const pizzariasProd = await Pizzaria.find({});
    const cardapioProd = await ItemCardapio.find({});
    
    console.log(`📊 PRODUÇÃO:`);
    console.log(`   - ${pizzariasProd.length} pizzarias`);
    console.log(`   - ${cardapioProd.length} itens de cardápio`);
    
    if (cardapioProd.length > 0) {
      console.log(`   - Categorias:`, [...new Set(cardapioProd.map(item => item.categoria))]);
      console.log(`   - Primeira pizzaria ID:`, pizzariasProd[0]?._id);
      
      const itensPrimeiraPizzariaProd = cardapioProd.filter(item => 
        item.pizzaria.toString() === pizzariasProd[0]?._id.toString()
      );
      console.log(`   - Itens da primeira pizzaria: ${itensPrimeiraPizzariaProd.length}`);
    }
    
    await mongoose.connection.close();
    
    if (cardapioLocal.length > 0 && cardapioProd.length === 0) {
      console.log('\n❌ PROBLEMA: Cardápio existe no local mas não na produção!');
      console.log('📋 Solução: Reexportar dados incluindo o cardápio');
    } else if (cardapioLocal.length === cardapioProd.length) {
      console.log('\n✅ Dados sincronizados corretamente');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkCardapio();