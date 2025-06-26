import React, { useEffect, useRef, useState } from 'react';

const GoogleMapMotoboy = ({ 
  localizacaoAtual, 
  entregas, 
  onAbrirNavegacao, 
  formatarNumeroPedido,
  onErro 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [marcadores, setMarcadores] = useState([]);
  const [mapaCarregado, setMapaCarregado] = useState(false);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);

  // Verificar se Google Maps API está disponível
  useEffect(() => {
    const verificarGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapaCarregado(true);
      } else {
        // Tentar novamente em 1 segundo
        setTimeout(verificarGoogleMaps, 1000);
      }
    };
    
    verificarGoogleMaps();
  }, []);

  // Inicializar mapa quando API estiver carregada e localização disponível
  useEffect(() => {
    if (mapaCarregado && localizacaoAtual && mapRef.current && !mapInstanceRef.current) {
      inicializarMapa();
    }
  }, [mapaCarregado, localizacaoAtual]);

  // Atualizar marcadores quando entregas mudarem (não quando zoom mudar)
  useEffect(() => {
    if (mapInstanceRef.current && localizacaoAtual) {
      atualizarMarcadores();
    }
  }, [entregas]);

  // Atualizar posição do motoboy quando localização mudar
  useEffect(() => {
    if (mapInstanceRef.current && localizacaoAtual) {
      console.log('📍 Localização atualizada, reposicionando motoboy:', localizacaoAtual);
      atualizarMarcadores();
      
      // Não alterar mais a visualização automáticamente
      // mapInstanceRef.current.setCenter({ lat: localizacaoAtual.lat, lng: localizacaoAtual.lng });
      // mapInstanceRef.current.setZoom(16);
    }
  }, [localizacaoAtual]);

  const inicializarMapa = () => {
    try {
      console.log('🗺️ Inicializando Google Maps...');
      
      const mapOptions = {
        zoom: 16,
        center: { lat: localizacaoAtual.lat, lng: localizacaoAtual.lng },
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        keyboardShortcuts: false,
        clickableIcons: false,
        styles: [
          {
            featureType: "poi",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.business",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.attraction",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.government",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.medical",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.park",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.place_of_worship",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.school",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "poi.sports_complex",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            stylers: [{ visibility: "off" }]
          }
        ]
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Ocultar elementos de copyright e termos após o mapa carregar
      mapInstanceRef.current.addListener('tilesloaded', () => {
        // Ocultar elementos via CSS
        const style = document.createElement('style');
        style.textContent = `
          .gm-style-cc, 
          .gmnoprint, 
          .gm-bundled-control, 
          .gm-fullscreen-control,
          .gmnoscreen,
          [title="Atalhos de teclado"],
          [title="Dados cartográficos"],
          [title="Termos de Uso"] {
            display: none !important;
          }
          .gm-style .gm-style-cc {
            display: none !important;
          }
          .gm-style .gmnoprint {
            display: none !important;
          }
        `;
        document.head.appendChild(style);
      });
      
      // Inicializar serviços de direções
      const service = new window.google.maps.DirectionsService();
      const renderer = new window.google.maps.DirectionsRenderer({
        draggable: false,
        suppressMarkers: true, // Não mostrar marcadores padrão para manter nossos customizados
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
      
      setDirectionsService(service);
      setDirectionsRenderer(renderer);
      renderer.setMap(mapInstanceRef.current);
      
      // Removido o listener automático de zoom para evitar atualizações desnecessárias
      // O espaçamento agora é calculado uma vez no momento da criação dos marcadores
      
      console.log('✅ Google Maps inicializado com sucesso');
      atualizarMarcadores();
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Google Maps:', error);
      if (onErro) {
        onErro('Erro ao carregar o mapa. Verifique a API Key do Google Maps.');
      }
    }
  };

  const atualizarMarcadores = async () => {
    if (!mapInstanceRef.current) return;
    
    console.log('🔄 Atualizando marcadores...');
    
    // Limpar TODOS os marcadores existentes
    marcadores.forEach(marcador => {
      if (marcador && marcador.setMap) {
        marcador.setMap(null);
      }
    });
    
    const novosMarcadores = [];
    
    // Adicionar marcador do motoboy (apenas um)
    if (localizacaoAtual) {
      const marcadorMotoboy = criarMarcadorMotoboy();
      if (marcadorMotoboy) {
        novosMarcadores.push(marcadorMotoboy);
        console.log('✅ Marcador do motoboy criado e adicionado');
      }
    }
    
    // Agrupar entregas por coordenadas para evitar sobreposição
    const entregasComCoordenadas = [];
    const coordenadasUsadas = new Map();
    
    // Adicionar marcadores das entregas com espaçamento inteligente
    console.log('🔍 Total de entregas a processar:', entregas.length);
    console.log('🔍 Entregas:', entregas.map(e => ({ numero: e.numero, id: e._id })));
    
    for (const entrega of entregas) {
      const marcadorEntrega = await criarMarcadorEntrega(entrega, coordenadasUsadas);
      if (marcadorEntrega) {
        novosMarcadores.push(marcadorEntrega);
        console.log('✅ Marcador criado para entrega:', entrega.numero);
      }
    }
    
    setMarcadores(novosMarcadores);
    
    // Mostrar animação inicial para visualizar entregas, mas só na primeira vez
    if (novosMarcadores.length > 1 && !window.mapaJaInicializado) {
      // Centralizar no motoboy primeiro
      mapInstanceRef.current.setCenter({ lat: localizacaoAtual.lat, lng: localizacaoAtual.lng });
      mapInstanceRef.current.setZoom(24);
      
      // Depois de 1.5 segundos, ajustar para mostrar todas as entregas
      setTimeout(() => {
        if (mapInstanceRef.current && novosMarcadores.length > 1) {
          ajustarZoomParaTodosOsMarcadores(novosMarcadores);
        }
      }, 1500);
      
      // Marcar que o mapa já foi inicializado para não repetir
      window.mapaJaInicializado = true;
    }
    
    console.log(`✅ ${novosMarcadores.length} marcadores adicionados ao mapa`);
  };

  const criarMarcadorMotoboy = () => {
    try {
      console.log('🛵 Criando marcador do motoboy na posição:', localizacaoAtual);
      
      // Ícone emoji da moto
      const iconeCustomizado = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="30" height="30" xmlns="http://www.w3.org/2000/svg">
            <text x="15" y="22" font-family="Arial, sans-serif" font-size="20" text-anchor="middle">🛵</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(30, 30),
        anchor: new window.google.maps.Point(15, 15)
      };

      const marcador = new window.google.maps.Marker({
        position: { lat: localizacaoAtual.lat, lng: localizacaoAtual.lng },
        map: mapInstanceRef.current,
        icon: iconeCustomizado,
        title: 'Sua localização (Motoboy) 🛵',
        zIndex: 9999,
        optimized: false
      });

      // InfoWindow para o motoboy
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="text-align: center; padding: 10px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">🏍️ Você está aqui!</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">
              Lat: ${localizacaoAtual.lat.toFixed(6)}<br>
              Lng: ${localizacaoAtual.lng.toFixed(6)}
            </p>
            <button onclick="navigator.geolocation.getCurrentPosition(pos => window.location.reload())" 
                    style="margin-top: 8px; padding: 4px 8px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🔄 Atualizar Localização
            </button>
          </div>
        `
      });

      marcador.addListener('click', () => {
        // Fechar outras InfoWindows
        marcadores.forEach(m => {
          if (m.infoWindow && m.infoWindow !== infoWindow) {
            m.infoWindow.close();
          }
        });
        infoWindow.open(mapInstanceRef.current, marcador);
      });

      marcador.infoWindow = infoWindow;
      return marcador;
      
    } catch (error) {
      console.error('❌ Erro ao criar marcador do motoboy:', error);
      return null;
    }
  };

  // Função para geocodificar endereço usando Google Maps API
  const geocodificarEndereco = async (endereco) => {
    try {
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API não está disponível');
        return null;
      }

      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode({ address: endereco }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            console.warn(`Geocoding falhou para: ${endereco}. Status: ${status}`);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Erro no geocoding:', error);
      return null;
    }
  };

  const criarMarcadorEntrega = async (entrega, coordenadasUsadas = new Map()) => {
    try {
      // Obter endereço da entrega
      const endereco = entrega.endereco || entrega.enderecoEntrega || entrega.cliente?.endereco;
      
      let lat, lng;
      
      // Tentar usar coordenadas existentes
      if (endereco && (endereco.lat || endereco.latitude)) {
        lat = endereco.lat || endereco.latitude;
        lng = endereco.lng || endereco.longitude;
      } else {
        // Tentar geocoding com o endereço completo
        if (endereco && endereco.rua && endereco.numero) {
          try {
            const enderecoCompleto = `${endereco.rua}, ${endereco.numero}, ${endereco.bairro || ''}, Blumenau, SC, Brasil`;
            const coordenadas = await geocodificarEndereco(enderecoCompleto);
            if (coordenadas) {
              lat = coordenadas.lat;
              lng = coordenadas.lng;
              console.log(`📍 Coordenadas geocodificadas para entrega ${entrega.numero}: ${lat}, ${lng}`);
            } else {
              // Fallback para coordenadas de Blumenau se geocoding falhar
              const bairros = [
                { lat: -26.9034, lng: -49.0661, nome: 'Centro' },
                { lat: -26.9234, lng: -49.0461, nome: 'Vila Nova' },
                { lat: -26.8894, lng: -49.0861, nome: 'Fortaleza' },
                { lat: -26.9394, lng: -49.0261, nome: 'Ponta Aguda' },
                { lat: -26.8734, lng: -49.1061, nome: 'Salto do Norte' },
                { lat: -26.9534, lng: -49.0061, nome: 'Água Verde' }
              ];
              
              const bairroIndex = entrega.numero % bairros.length;
              const bairro = bairros[bairroIndex];
              lat = bairro.lat + (Math.random() - 0.5) * 0.005;
              lng = bairro.lng + (Math.random() - 0.5) * 0.005;
              console.log(`📍 Fallback para ${bairro.nome} entrega ${entrega.numero}: ${lat}, ${lng}`);
            }
          } catch (error) {
            console.error(`❌ Erro no geocoding para entrega ${entrega.numero}:`, error);
            return null;
          }
        } else {
          console.warn(`⚠️ Entrega ${entrega.numero} sem endereço completo para geocoding`);
          return null;
        }
      }
      
      if (!lat || !lng) {
        console.warn(`⚠️ Coordenadas inválidas para entrega ${entrega.numero}`);
        return null;
      }

      // Aplicar espaçamento inteligente para evitar sobreposição
      const coordenadaChave = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      
      if (coordenadasUsadas.has(coordenadaChave)) {
        const contador = coordenadasUsadas.get(coordenadaChave);
        coordenadasUsadas.set(coordenadaChave, contador + 1);
        
        // Espaçamento fixo otimizado para visualização
        const espacamento = 0.0001; // Aproximadamente 10 metros
        
        // Distribuir em círculo ao redor da coordenada original
        const angulo = (contador * 60) * (Math.PI / 180); // 60 graus entre cada marcador
        lat = lat + Math.cos(angulo) * espacamento;
        lng = lng + Math.sin(angulo) * espacamento;
        
        console.log(`📍 Espaçamento aplicado para entrega ${entrega.numero}: ${lat}, ${lng}`);
      } else {
        coordenadasUsadas.set(coordenadaChave, 1);
      }

      // Determinar cor baseada no status (cores iguais à legenda)
      // saiu_entrega = verde (Iniciar/Pendente), entregando = laranja (Entregando)
      const cor = entrega.status === 'entregando' ? '#f97316' : '#22c55e'; // Orange-500 ou Green-500
      const statusTexto = entrega.status === 'entregando' ? 'Entregando' : 'Iniciar';
      
      console.log(`🎯 Criando marcador ${entrega.numero}: status=${entrega.status}, cor=${cor}`);

      // Criar um ícone SVG customizado com o número embutido
      const numeroFormatado = entrega.numero.toString().padStart(3, '0');
      const svgIcon = `
        <svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2Z" 
                fill="${cor}" stroke="#333" stroke-width="0.5"/>
          <text x="12" y="11" font-family="Roboto, sans-serif" font-size="7" font-weight="400" 
                fill="black" text-anchor="middle" dominant-baseline="middle">${numeroFormatado}</text>
        </svg>
      `;

      const marcador = new window.google.maps.Marker({
        position: { lat: parseFloat(lat), lng: parseFloat(lng) },
        map: mapInstanceRef.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
          scaledSize: new window.google.maps.Size(30, 40),
          anchor: new window.google.maps.Point(15, 40)
        },
        title: `Pedido ${formatarNumeroPedido ? formatarNumeroPedido(entrega.numero) : entrega.numero} - ${statusTexto}`
      });

      marcador.addListener('click', () => {
        // Chamar a função de navegação que já existe e mostra toast + modal
        const endereco = entrega.endereco || entrega.enderecoEntrega || entrega.cliente?.endereco;
        if (onAbrirNavegacao && endereco) {
          onAbrirNavegacao(endereco, entrega);
        }
      });
      return marcador;

    } catch (error) {
      console.error(`❌ Erro ao criar marcador para entrega ${entrega.numero}:`, error);
      return null;
    }
  };

  const ajustarZoomParaTodosOsMarcadores = (marcadoresLista) => {
    if (!mapInstanceRef.current || marcadoresLista.length === 0) return;
    
    try {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Adicionar posição de cada marcador aos bounds
      marcadoresLista.forEach(marcador => {
        if (marcador.getPosition) {
          bounds.extend(marcador.getPosition());
        }
      });
      
      // Ajustar o mapa para mostrar todos os marcadores com padding
      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
      
      // Garantir zoom máximo para não ficar muito próximo
      const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', function() {
        if (mapInstanceRef.current.getZoom() > 15) {
          mapInstanceRef.current.setZoom(15);
        }
        window.google.maps.event.removeListener(listener);
      });
      
    } catch (error) {
      console.error('❌ Erro ao ajustar zoom:', error);
    }
  };

  // Função para calcular rota até uma entrega
  const calcularRota = async (entrega) => {
    if (!directionsService || !directionsRenderer || !localizacaoAtual) {
      console.warn('⚠️ Serviços de direção não disponíveis');
      return;
    }

    const endereco = entrega.endereco || entrega.enderecoEntrega || entrega.cliente?.endereco;
    if (!endereco) {
      console.warn('⚠️ Endereço da entrega não encontrado');
      return;
    }

    let destino;
    
    // Usar coordenadas se disponíveis
    if (endereco.lat || endereco.latitude) {
      destino = {
        lat: endereco.lat || endereco.latitude,
        lng: endereco.lng || endereco.longitude
      };
    } else {
      // Usar endereço textual
      destino = `${endereco.rua}, ${endereco.numero}, ${endereco.bairro || ''}, Blumenau, SC, Brasil`;
    }

    const request = {
      origin: { lat: localizacaoAtual.lat, lng: localizacaoAtual.lng },
      destination: destino,
      travelMode: window.google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    };

    try {
      console.log(`🚗 Calculando rota para entrega ${entrega.numero}...`);
      
      const result = await new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK') {
            resolve(result);
          } else {
            reject(`Erro no cálculo da rota: ${status}`);
          }
        });
      });

      // Mostrar a rota no mapa
      directionsRenderer.setDirections(result);
      setRotaAtiva(entrega.numero);
      
      // Mostrar informações da rota
      const route = result.routes[0];
      const leg = route.legs[0];
      
      console.log(`✅ Rota calculada:`);
      console.log(`📏 Distância: ${leg.distance.text}`);
      console.log(`⏱️ Tempo estimado: ${leg.duration.text}`);
      
      // Opcional: Exibir alerta com informações da rota
      if (window.confirm(`Rota para entrega ${entrega.numero}:\n\nDistância: ${leg.distance.text}\nTempo estimado: ${leg.duration.text}\n\nDeseja abrir no aplicativo de navegação?`)) {
        if (onAbrirNavegacao) {
          onAbrirNavegacao(endereco, entrega);
        }
      }

    } catch (error) {
      console.error('❌ Erro ao calcular rota:', error);
      alert('Não foi possível calcular a rota para esta entrega.');
    }
  };

  // Função para limpar rota
  const limparRota = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] });
      setRotaAtiva(null);
      console.log('🧹 Rota removida do mapa');
    }
  };

  // Função para centralizar no motoboy
  const centralizarNoMotoboy = () => {
    if (mapInstanceRef.current && localizacaoAtual) {
      mapInstanceRef.current.setCenter({ lat: localizacaoAtual.lat, lng: localizacaoAtual.lng });
      mapInstanceRef.current.setZoom(15);
      limparRota(); // Limpar rota ao centralizar
    }
  };

  // Expor funções para componente pai (sem dependências que causam re-render)
  useEffect(() => {
    window.centralizarNoMotoboy = centralizarNoMotoboy;
    window.calcularRotaEntrega = (numeroEntrega) => {
      const entrega = entregas.find(e => e.numero === numeroEntrega);
      if (entrega) {
        calcularRota(entrega);
      }
    };
    window.limparRotaMapa = limparRota;
    window.resetarMapaInicializado = () => {
      window.mapaJaInicializado = false;
    };
    
    // Cleanup quando componente desmonta
    return () => {
      window.mapaJaInicializado = false;
    };
  }, []);

  if (!mapaCarregado) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <span className="text-sm text-gray-700">Carregando Google Maps...</span>
        </div>
      </div>
    );
  }

  if (!localizacaoAtual) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-2">📍</div>
          <span className="text-sm text-gray-700">Aguardando localização...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Div onde o mapa será renderizado */}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Botões de controle */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-2 z-10" style={{ zIndex: 10 }}>
        {rotaAtiva && (
          <button
            onClick={limparRota}
            className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
            title="Limpar rota"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          onClick={centralizarNoMotoboy}
          className="p-3 bg-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title="Centralizar na minha localização"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      {/* Legenda */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10" style={{ zIndex: 10 }}>
        <div className="text-xs space-y-1">
          <div className="flex items-center space-x-2">
            <span>🛵 Motoboy</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Iniciar</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Entregando</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapMotoboy;