const mongoose = require('mongoose');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

// Lista de sabores com ingredientes e valores
const sabores = [
  {
    nome: "5 Queijos",
    descricao: "Pizza com 5 tipos de queijos diferentes",
    valorEspecial: 10.00,
    ingredientes: ["Mussarela", "molho de tomate", "gorgonzola", "requeijão", "provolone", "parmesão", "azeitonas", "orégano"]
  },
  {
    nome: "A baita",
    descricao: "Pizza especial da casa",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "peito de peru", "abacaxi", "cheddar", "azeitonas", "orégano"]
  },
  {
    nome: "Alho e óleo",
    descricao: "Pizza tradicional com alho e óleo",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "parmesão", "alho e óleo", "azeitonas", "orégano"]
  },
  {
    nome: "Atum com queijo",
    descricao: "Pizza com atum e queijo",
    valorEspecial: 10.00,
    ingredientes: ["Mussarela", "molho de tomate", "atum", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Bacon",
    descricao: "Pizza com bacon e ovo",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "bacon", "ovo", "azeitonas", "orégano"]
  },
  {
    nome: "Baiana",
    descricao: "Pizza picante estilo baiano",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "calabresa moída", "molho de pimenta", "requeijão", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Banana flambada",
    descricao: "Pizza doce com banana flambada",
    valorEspecial: 10.00,
    ingredientes: ["Creme de leite", "Banana", "chocolate branco flambado"]
  },
  {
    nome: "Bananinha",
    descricao: "Pizza doce com banana e doce de leite",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Banana com doce de leite", "canela"]
  },
  {
    nome: "Beijinho",
    descricao: "Pizza doce sabor beijinho",
    valorEspecial: 0,
    ingredientes: ["creme de leite", "chocolate branco", "coco"]
  },
  {
    nome: "Brigadeiro",
    descricao: "Pizza doce sabor brigadeiro",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "granulado"]
  },
  {
    nome: "Brócolis",
    descricao: "Pizza com brócolis e bacon",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "brócolis", "alho", "bacon", "requeijão", "azeitonas", "orégano"]
  },
  {
    nome: "Caipira",
    descricao: "Pizza estilo caipira",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "bacon", "milho", "azeitonas", "orégano"]
  },
  {
    nome: "Calabresa",
    descricao: "Pizza tradicional de calabresa",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "calabresa", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Calabresa a parmesão",
    descricao: "Calabresa especial com parmesão",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "calabresa", "parmesão", "catupiry", "alho e óleo", "azeitonas", "orégano"]
  },
  {
    nome: "Califórnia",
    descricao: "Pizza doce com frutas",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "Creme de leite", "pêssego", "abacaxi", "figo"]
  },
  {
    nome: "Camarão alho e oleo",
    descricao: "Pizza premium com camarão",
    valorEspecial: 30.00,
    ingredientes: ["Camarão", "alho", "óleo"]
  },
  {
    nome: "Camarão catupiry",
    descricao: "Pizza premium com camarão e catupiry",
    valorEspecial: 30.00,
    ingredientes: ["Camarão", "catupiry"]
  },
  {
    nome: "Carne seca",
    descricao: "Pizza com carne seca desfiada",
    valorEspecial: 15.00,
    ingredientes: ["molho de tomate", "mussarela", "carne seca desfiada", "molho barbecue", "pimentão", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Catuperu",
    descricao: "Pizza com peito de peru e catupiry",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "peito de peru", "Catupiry", "azeitonas", "orégano"]
  },
  {
    nome: "Champignon",
    descricao: "Pizza com cogumelos champignon",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "champignon", "parmesão", "alho e óleo", "azeitonas", "orégano"]
  },
  {
    nome: "Charge",
    descricao: "Pizza doce com chocolate e amendoim",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Chocolate preto", "amendoim"]
  },
  {
    nome: "Choco-ninho branco",
    descricao: "Pizza doce com chocolate branco e leite ninho",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate branco", "leite Ninho em pó"]
  },
  {
    nome: "Choco-ninho preto",
    descricao: "Pizza doce com chocolate preto e leite ninho",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "leite Ninho em pó"]
  },
  {
    nome: "Chocolate branco",
    descricao: "Pizza doce de chocolate branco",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Chocolate branco"]
  },
  {
    nome: "Chocolate preto",
    descricao: "Pizza doce de chocolate preto",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Chocolate preto"]
  },
  {
    nome: "Confete branco",
    descricao: "Pizza doce com chocolate branco e confetes",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate branco", "confetes"]
  },
  {
    nome: "Confetes",
    descricao: "Pizza doce com chocolate e confetes",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "confetes"]
  },
  {
    nome: "Divina",
    descricao: "Pizza especial com alho porró",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "alho porró", "parmesão", "azeitonas", "orégano"]
  },
  {
    nome: "Do pizzaiolo",
    descricao: "Pizza especial do pizzaiolo",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "lombinho", "palmito", "requeijão", "azeitonas", "orégano"]
  },
  {
    nome: "Dois amores",
    descricao: "Pizza doce com dois tipos de chocolate",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Chocolate preto e branco misturados"]
  },
  {
    nome: "Executiva",
    descricao: "Pizza premium executiva",
    valorEspecial: 15.00,
    ingredientes: ["Mussarela", "molho de tomate", "lombo canadense", "palmito", "cheddar", "bacon", "azeitonas", "orégano"]
  },
  {
    nome: "Ferrero",
    descricao: "Pizza doce estilo ferrero rocher",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "creme de avelã", "amendoim"]
  },
  {
    nome: "File alho e óleo",
    descricao: "Pizza com filé e alho e óleo",
    valorEspecial: 15.00,
    ingredientes: ["Molho de tomate", "mussarela", "file", "alho e oleo", "azeitona", "oregano"]
  },
  {
    nome: "File com Catupiry",
    descricao: "Pizza com filé e catupiry",
    valorEspecial: 15.00,
    ingredientes: ["Mussarela", "molho de tomate", "file", "alho e óleo", "Catupiry", "azeitonas", "orégano"]
  },
  {
    nome: "File com cheddar",
    descricao: "Pizza com filé e cheddar",
    valorEspecial: 15.00,
    ingredientes: ["Molho de tomate", "mussarela", "file", "alho e oleo", "cheddar", "azeitona", "oregano"]
  },
  {
    nome: "Frango com catupiry",
    descricao: "Pizza tradicional de frango com catupiry",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "requeijão", "azeitonas", "orégano"]
  },
  {
    nome: "Frango com cheddar",
    descricao: "Pizza de frango com cheddar",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "cheddar", "azeitonas", "orégano"]
  },
  {
    nome: "Frango supremo",
    descricao: "Pizza de frango especial",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "creme de leite", "milho verde", "azeitonas", "orégano"]
  },
  {
    nome: "Italiana",
    descricao: "Pizza estilo italiano",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "salame italiano", "azeitonas", "orégano"]
  },
  {
    nome: "Lauro Miliense",
    descricao: "Pizza especial da casa",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "salame italiano", "milho", "bacon", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Lombinho",
    descricao: "Pizza com lombinho canadense",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "Lombo canadense", "azeitonas", "orégano"]
  },
  {
    nome: "Lombo ao creme",
    descricao: "Pizza de lombo com creme",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "lombo canadense", "creme de leite", "milho verde", "azeitonas", "orégano"]
  },
  {
    nome: "Madre",
    descricao: "Pizza especial madre",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "palmito", "bacon", "parmesão", "azeitonas", "orégano"]
  },
  {
    nome: "Marguerita",
    descricao: "Pizza clássica marguerita",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "manjericão", "parmesão", "tomates picados", "azeitonas", "orégano"]
  },
  {
    nome: "Mexicana",
    descricao: "Pizza picante estilo mexicano",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "Carne moída", "pimentão", "molho de pimenta", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Mico leão",
    descricao: "Pizza doce com chocolate e banana",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "banana"]
  },
  {
    nome: "Milho com bacon",
    descricao: "Pizza com milho e bacon",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "milho verde", "bacon", "azeitonas", "orégano"]
  },
  {
    nome: "Mista",
    descricao: "Pizza mista tradicional",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "presunto", "palmito", "azeitonas", "orégano"]
  },
  {
    nome: "Modinha",
    descricao: "Pizza da moda",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "presunto", "bacon", "alho", "azeitonas", "orégano"]
  },
  {
    nome: "Mussarela",
    descricao: "Pizza simples de mussarela",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "tomates picados", "azeitonas", "oregano"]
  },
  {
    nome: "Napolitana",
    descricao: "Pizza napolitana tradicional",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "presunto", "parmesão", "azeitonas", "orégano"]
  },
  {
    nome: "Palmito",
    descricao: "Pizza com palmito e catupiry",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "palmito", "Catupiry", "azeitonas", "orégano"]
  },
  {
    nome: "Pasqualina",
    descricao: "Pizza especial pasqualina",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "bacon", "parmesão", "alho", "requeijao", "azeitonas", "orégano"]
  },
  {
    nome: "Pepperoni",
    descricao: "Pizza americana de pepperoni",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "pepperoni", "azeitonas", "orégano"]
  },
  {
    nome: "Portuguesa",
    descricao: "Pizza portuguesa tradicional",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "presunto", "ovos", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Prestigio",
    descricao: "Pizza doce sabor prestígio",
    valorEspecial: 0,
    ingredientes: ["Chocolate preto", "coco", "creme de leite"]
  },
  {
    nome: "Quatro queijos",
    descricao: "Pizza com quatro tipos de queijo",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "provolone", "parmesão", "requeijão", "azeitonas", "oregano"]
  },
  {
    nome: "Romanesca",
    descricao: "Pizza estilo romano",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "calabresa moída", "bacon", "ovos", "cebola", "azeitonas", "orégano"]
  },
  {
    nome: "Romeu e Julieta",
    descricao: "Pizza doce de mussarela e goiabada",
    valorEspecial: 0,
    ingredientes: ["mussarela", "goiabada"]
  },
  {
    nome: "Salada doce",
    descricao: "Pizza doce com frutas variadas",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "pêssego", "coco", "morango"]
  },
  {
    nome: "Sedução",
    descricao: "Pizza doce sedutora",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "Chocolate branco", "morangos"]
  },
  {
    nome: "Sensação",
    descricao: "Pizza doce sensacional",
    valorEspecial: 0,
    ingredientes: ["Creme de leite", "chocolate preto", "morango"]
  },
  {
    nome: "Siciliana",
    descricao: "Pizza estilo siciliano",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "frango", "catupiry", "batata palha", "azeitonas", "orégano"]
  },
  {
    nome: "Speciale",
    descricao: "Pizza especial da casa",
    valorEspecial: 15.00,
    ingredientes: ["Mussarela", "molho de tomate", "Pepperoni", "alho", "cebola", "bacon", "azeitonas", "orégano"]
  },
  {
    nome: "Strogonoff de Camarão",
    descricao: "Pizza de strogonoff de camarão",
    valorEspecial: 30.00,
    ingredientes: ["Strogonoff de camarão"]
  },
  {
    nome: "Strogonoff de carne",
    descricao: "Pizza de strogonoff de carne",
    valorEspecial: 15.00,
    ingredientes: ["Mussarela", "molho de tomate", "file", "alho e óleo", "creme de leite", "champignon", "batata palha", "azeitonas", "orégano"]
  },
  {
    nome: "Strogonoff de frango",
    descricao: "Pizza de strogonoff de frango",
    valorEspecial: 15.00,
    ingredientes: ["Mussarela", "molho de tomate", "frango desfiado", "creme de leite", "champignon", "batata palha", "azeitonas", "orégano"]
  },
  {
    nome: "Tomate Seco",
    descricao: "Pizza com tomate seco e rúcula",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "tomate seco", "rúcula", "azeitonas", "orégano"]
  },
  {
    nome: "Vegetariana",
    descricao: "Pizza vegetariana com legumes",
    valorEspecial: 0,
    ingredientes: ["Mussarela", "molho de tomate", "brócolis", "palmito", "champignon", "milho", "azeitonas", "orégano"]
  }
];

async function cadastrarSabores() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('🍕 Conectado ao MongoDB');

    // Buscar a primeira pizzaria para associar os sabores
    const pizzarias = await mongoose.connection.db.collection('pizzarias').find({}).toArray();
    if (pizzarias.length === 0) {
      console.log('❌ Nenhuma pizzaria encontrada. Crie uma pizzaria primeiro.');
      return;
    }

    const pizzariaId = pizzarias[0]._id;
    console.log(`🏪 Usando pizzaria: ${pizzarias[0].nome} (${pizzariaId})`);

    let sucessos = 0;
    let erros = 0;

    for (const saborData of sabores) {
      try {
        // Verificar se já existe
        const existe = await ItemCardapio.findOne({
          nome: saborData.nome,
          pizzaria: pizzariaId,
          categoria: 'sabor'
        });

        if (existe) {
          console.log(`⚠️  Sabor "${saborData.nome}" já existe. Pulando...`);
          continue;
        }

        // Criar o sabor
        const novoSabor = new ItemCardapio({
          nome: saborData.nome,
          descricao: saborData.descricao,
          categoria: 'sabor',
          valorEspecial: saborData.valorEspecial,
          ingredientes: saborData.ingredientes.map(nome => ({ nome, preco: 0 })),
          pizzaria: pizzariaId,
          preco: 0 // Sabores não têm preço base
        });

        await novoSabor.save();
        console.log(`✅ Sabor "${saborData.nome}" cadastrado com sucesso! (Valor especial: R$ ${saborData.valorEspecial.toFixed(2)})`);
        sucessos++;

      } catch (error) {
        console.error(`❌ Erro ao cadastrar sabor "${saborData.nome}":`, error.message);
        erros++;
      }
    }

    console.log(`\n🎉 Cadastro finalizado!`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total de sabores processados: ${sabores.length}`);

  } catch (error) {
    console.error('❌ Erro na conexão:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar o script
cadastrarSabores();