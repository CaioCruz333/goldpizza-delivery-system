const mongoose = require('mongoose');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
const Pizzaria = require('../models/Pizzaria');
const ItemCardapio = require('../models/Cardapio');
require('dotenv').config();

const seedPedidos = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldpizza');
    console.log('Conectado ao MongoDB para seed de pedidos');

    // Buscar pizzaria existente
    const pizzaria = await Pizzaria.findOne({ nome: 'Pizza Gold Express' });
    if (!pizzaria) {
      console.log('Pizzaria não encontrada. Execute o seed principal primeiro.');
      return;
    }

    // Limpar e recriar cliente de teste
    await Cliente.deleteMany({ email: 'cliente@teste.com' });
    
    const cliente = new Cliente({
      nome: 'João Silva',
      telefone: '(11) 99999-9999',
      email: 'cliente@teste.com',
      enderecos: [{
        rua: 'Rua dos Clientes',
        numero: '456',
        bairro: 'Vila Teste',
        cidade: 'São Paulo',
        cep: '01234-567'
      }]
    });
    await cliente.save();
    console.log('Cliente de teste criado');

    // Criar itens de cardápio básicos se não existirem
    let pizza = await ItemCardapio.findOne({ nome: 'Pizza Margherita' });
    if (!pizza) {
      pizza = new ItemCardapio({
        nome: 'Pizza Margherita',
        descricao: 'Pizza tradicional com molho de tomate, mussarela e manjericão',
        categoria: 'pizza',
        preco: 35.90,
        quantidadeFatias: 8,
        quantidadeSabores: 2,
        disponivel: true,
        pizzaria: pizzaria._id
      });
      await pizza.save();
    }

    let bebida = await ItemCardapio.findOne({ nome: 'Coca-Cola 350ml' });
    if (!bebida) {
      bebida = new ItemCardapio({
        nome: 'Coca-Cola 350ml',
        descricao: 'Refrigerante Coca-Cola lata 350ml',
        categoria: 'bebida',
        tamanho: '350ml',
        preco: 5.50,
        disponivel: true,
        pizzaria: pizzaria._id
      });
      await bebida.save();
    }

    // Limpar pedidos existentes da pizzaria de teste
    await Pedido.deleteMany({ pizzaria: pizzaria._id });
    console.log('Pedidos antigos removidos');

    // Criar pedidos de teste com diferentes status
    const pedidosParaCriar = [
      {
        status: 'recebido',
        observacoes: 'Sem cebola, por favor'
      },
      {
        status: 'recebido', 
        observacoes: 'Pizza bem assada'
      },
      {
        status: 'preparando',
        observacoes: 'Cliente preferencial'
      },
      {
        status: 'pronto',
        observacoes: 'Entrega rápida'
      }
    ];

    for (let i = 0; i < pedidosParaCriar.length; i++) {
      const pedidoData = pedidosParaCriar[i];
      
      
      // Gerar número único para cada pedido
      const numero = await Pedido.gerarNumero(pizzaria._id);
      
      const pedido = new Pedido({
        numero,
        cliente: cliente._id,
        pizzaria: pizzaria._id,
        itens: [
          {
            item: pizza._id,
            quantidade: 1,
            precoUnitario: pizza.preco,
            subtotal: pizza.preco
          },
          {
            item: bebida._id,
            quantidade: 2,
            precoUnitario: bebida.preco,
            subtotal: bebida.preco * 2
          }
        ],
        endereco: {
          rua: cliente.enderecos[0].rua,
          numero: cliente.enderecos[0].numero,
          bairro: cliente.enderecos[0].bairro,
          cidade: cliente.enderecos[0].cidade,
          cep: cliente.enderecos[0].cep
        },
        tipo: 'delivery',
        status: pedidoData.status,
        formaPagamento: {
          tipo: 'dinheiro',
          necessitaTroco: false
        },
        valores: {
          subtotal: pizza.preco + (bebida.preco * 2),
          taxaEntrega: 5.00,
          desconto: 0,
          total: pizza.preco + (bebida.preco * 2) + 5.00
        },
        observacoes: pedidoData.observacoes,
        tempos: {
          [pedidoData.status]: new Date()
        },
        createdAt: new Date(Date.now() - (i * 300000)) // Espaçar os pedidos por 5 min
      });

      await pedido.save();
      console.log(`Pedido criado: #${numero} - Status: ${pedidoData.status}`);
    }

    console.log('\n=== PEDIDOS DE TESTE CRIADOS ===');
    console.log(`Pizzaria: ${pizzaria.nome} (ID: ${pizzaria._id})`);
    console.log(`Cliente: ${cliente.nome}`);
    console.log('4 pedidos criados com status: recebido, recebido, preparando, pronto');

  } catch (error) {
    console.error('Erro ao criar pedidos de teste:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedPedidos();
}

module.exports = seedPedidos;