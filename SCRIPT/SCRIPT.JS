    
    
    
    google.charts.load('current', { packages: ['corechart', 'bar'] });
    google.charts.setOnLoadCallback(loadData);

    let rawData = null;
    let toastTimer = null;
    let alertTimer = null;
    let paisSelecionadoBotao = '';
    let categoriaSelecionadaBotao = '';
    let modoSelecionado = 'nacional';
    let tipoSelecionado = '';

    function formatNumber(value) {
      return new Intl.NumberFormat('pt-BR').format(value || 0);
    }

    function parseNumber(value) {
      if (!value) return 0;
      const str = String(value).trim();
      return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
    }

    function formatDecimal(value) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value || 0);
    }

    function formatPercent(value) {
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(value || 0) + '%';
    }

    function removeAccents(text) {
      return (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    }

    function escapeHtml(text) {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getFlagByDestino(destino) {
      const nome = removeAccents(destino);
      if (nome.includes('paraguai')) return '🇵🇾';
      if (nome.includes('uruguai')) return '🇺🇾';
      if (nome.includes('chile')) return '🇨🇱';
      if (nome.includes('panama')) return '🇵🇦';
      if (nome.includes('mexico')) return '🇲🇽';
      if (nome.includes('portugal')) return '🇵🇹';
      if (nome.includes('romaneio')) return '🇧🇷';
      return '🌍';
    }

    function getCountryCodeByDestino(destino) {
      const nome = removeAccents(destino);
      if (nome.includes('paraguai')) return 'PY';
      if (nome.includes('uruguai')) return 'UY';
      if (nome.includes('chile')) return 'CL';
      if (nome.includes('panama')) return 'PA';
      if (nome.includes('mexico')) return 'MX';
      if (nome.includes('portugal')) return 'PT';
      return '??';
    }

    function getCanonicalCountryName(destino) {
      const nome = removeAccents(destino);
      if (nome.includes('paraguai')) return 'Paraguai';
      if (nome.includes('uruguai')) return 'Uruguai';
      if (nome.includes('chile')) return 'Chile';
      if (nome.includes('panama')) return 'Panamá';
      if (nome.includes('mexico')) return 'México';
      if (nome.includes('portugal')) return 'Portugal';
      return destino;
    }

    function isValidDestino(destino) {
      if (!destino) return false;
      const destinoNorm = destino.trim().toLowerCase();
      return destinoNorm !== '' && destinoNorm !== 'sem destino';
    }

    function isExportCountryDestino(destino) {
      if (!destino) return false;
      const paises = ['paraguai', 'uruguai', 'chile', 'panama', 'mexico', 'portugal'];
      const destinoNorm = removeAccents(destino).toLowerCase();
      return paises.some(function(pais) {
        return destinoNorm === pais || destinoNorm.startsWith(pais + ' ') || destinoNorm.includes(' ' + pais + ' ');
      });
    }

    function processSheetData(values) {
      if (!values || values.length < 2) return { filtros: { categorias: [], destinos: [], empresas: [], mercadorias: [] }, registros: [], metadados: { tamanhos: [] }, metasM3: {} };

      const normalizeKey = function(text) {
        return removeAccents(String(text || ''))
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '')
          .toLowerCase();
      };

      const headerMap = {
        mercadoria: 'mercadoria',
        empresa: 'empresa',
        tamanho: 'tamanho',
        qtd: 'qtd',
        m3: 'm3',
        m: 'm3',
        volumen: 'volumes',
        volumes: 'volumes',
        destino: 'destino',
        kg: 'kg',
        categoria: 'categoria',
        palet: 'palet',
        palet: 'palet',
        destinocompleto: 'destinoCompleto',
        pais: 'pais',
        modo: 'modo',
        tipo: 'tipo'
      };

      const headers = values[0];
      console.log('Headers originais:', headers);
      
      // Mapa adicional para headers que contêm M³ ou outros caracteres especiais
      const headerIndexMap = {};
      headers.forEach((header, index) => {
        const key = normalizeKey(header);
        const mapped = headerMap[key] || key;
        
        // Verifica se o header original contém M³
        if ((header || '').includes('M³') || (header || '').includes('M3')) {
          headerIndexMap[index] = 'm3';
        } else if (mapped === 'volumes' || mapped === 'volumen') {
          headerIndexMap[index] = 'volumes';
        } else if (mapped) {
          headerIndexMap[index] = mapped;
        }
      });
      
      console.log('Mapa de headers:', headerIndexMap);
      console.log('Headers com índices:', headers.map((h, i) => `[${i}] ${h}`).join(', '));
      
      const rows = values.slice(1);

      const registros = rows.map((row, rowIndex) => {
        const obj = {};

        headers.forEach((header, index) => {
          const mapped = headerIndexMap[index];
          const key = normalizeKey(header);
          const fallbackMapped = headerMap[key] || key;
          
          const fieldName = mapped || fallbackMapped;
          obj[fieldName] = row[index] || '';
        });

        if (rowIndex === 0) {
          console.log('Primeiro registro raw:', obj);
          console.log('Valor de m3 raw:', obj.m3);
        }

        const destino = (obj.destino || '').trim();
        const destinoLower = removeAccents(destino).toLowerCase();

        let tipo = '';
        let pais = 'Brasil';
        let modo = 'nacional';

        if (destinoLower.includes('romance')) {
          tipo = 'romance';
          modo = 'internacional';
          
          const paisMatch = destino.match(/^(.+?)\s+Romance$/i);
          if (paisMatch) {
            pais = getCanonicalCountryName(paisMatch[1].trim());
          }
        } else if (destinoLower.includes('favorita')) {
          tipo = 'favorita';
          modo = 'internacional';
          
          const paisMatch = destino.match(/^(.+?)\s+Favorita$/i);
          if (paisMatch) {
            pais = getCanonicalCountryName(paisMatch[1].trim());
          }
        } else if (isExportCountryDestino(destino)) {
          tipo = '';
          modo = 'internacional';
          pais = getCanonicalCountryName(destino);
        } else {
          tipo = 'nacional';
          modo = 'nacional';
          pais = 'Brasil';
        }

        obj.tipo = tipo;
        obj.pais = pais;
        obj.modo = modo;
        obj.destinoCompleto = destino;

        obj.qtd = parseNumber(obj.qtd);
        obj.volumes = parseNumber(obj.volumes);
        obj.kg = parseNumber(obj.kg);
        obj.m3 = parseNumber(obj.m3);

        if (rowIndex === 0) {
          console.log('Primeiro registro com números parseados:', {
            m3: obj.m3,
            volumes: obj.volumes,
            kg: obj.kg,
            qtd: obj.qtd
          });
        }

        return obj;
      });

      const categorias = [...new Set(registros.map(r => r.categoria).filter(Boolean))].sort();
      const destinos = [...new Set(registros.map(r => r.destinoCompleto || r.destino).filter(Boolean))].sort();
      const empresas = [...new Set(registros.map(r => r.empresa).filter(Boolean))].sort();
      const mercadorias = [...new Set(registros.map(r => r.mercadoria).filter(Boolean))].sort();
      const tamanhos = [...new Set(registros.map(r => r.tamanho).filter(Boolean))].sort();

      return {
        filtros: { categorias, destinos, empresas, mercadorias },
        registros,
        metadados: {
          tamanhos: tamanhos
        },
        metasM3: {
          'Chile': 90,
          'Paraguai': 105,
          'Uruguai': 100,
          'Portugal': 28,
          'Panama': 28,
          'Mexico': 28
        }
      };
    }

    function loadData(showToastOnSuccess = false) {
      toggleRefreshButton(true);

      const spreadsheetId = '1VBpyW-wQTyw_BIkFmjgQOjKoYPqqnh6hMJZOjgKMqAw';
      const range = 'BASE GERAL';
      const apiKey = 'AIzaSyCsRYzAkwTpefC70hx9sG9CHXnhP5YLZ4M';
      const encodedRange = encodeURIComponent(range);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`;

      console.log('Iniciando busca de dados da planilha...');

      fetch(url)
        .then(function(response) {
          console.log('Resposta da API:', response);
          if (!response.ok) throw new Error('Erro ao buscar dados da planilha: ' + response.status + ' ' + response.statusText);
          return response.json();
        })
        .then(function(data) {
          console.log('Dados recebidos:', data);
          rawData = processSheetData(data.values);
          console.log('Dados processados:', rawData);
          console.log('Países extraídos:', [...new Set(rawData.registros.map(r => r.pais))]);
          console.log('Tipos extraídos:', [...new Set(rawData.registros.map(r => r.tipo))]);
          preencherFiltros(rawData.filtros);
          aplicarFiltros();
          toggleRefreshButton(false);

          if (showToastOnSuccess) {
            showToast('Dados atualizados com sucesso');
          }
        })
        .catch(function(error) {
          console.error('Erro:', error);
          toggleRefreshButton(false);
          showError(error.message || error);
        });
    }

    function atualizarDados() {
      loadData(true);
    }

    function toggleRefreshButton(disabled) {
      const btn = document.getElementById('btnRefresh');
      if (btn) {
        btn.disabled = disabled;
        btn.innerHTML = disabled
          ? '<span class="spinner"></span>Atualizando...'
          : 'Atualizar dados';
      }
    }

    function showToast(message) {
      const toast = document.getElementById('toastMessage');
      toast.textContent = message;
      toast.classList.add('show');

      if (toastTimer) clearTimeout(toastTimer);

      toastTimer = setTimeout(function() {
        toast.classList.remove('show');
      }, 3200);
    }

    function showAlertToast(message) {
      const toast = document.getElementById('alertMessage');
      toast.innerHTML = message;
      toast.classList.add('show');

      if (alertTimer) clearTimeout(alertTimer);

      alertTimer = setTimeout(function() {
        toast.classList.remove('show');
      }, 7000);
    }

    function showSuccessToast(message) {
      const existingToast = document.getElementById('successMessage');
      if (existingToast) {
        existingToast.innerHTML = message;
        existingToast.classList.add('show');
      } else {
        const newToast = document.createElement('div');
        newToast.id = 'successMessage';
        newToast.className = 'success-toast show';
        newToast.innerHTML = message;
        document.body.appendChild(newToast);
      }
      setTimeout(function() {
        const successToast = document.getElementById('successMessage');
        if (successToast) successToast.classList.remove('show');
      }, 6000);
    }

    function preencherFiltros(filtros) {
      preencherSelect('filtroCategoria', filtros.categorias || [], 'Todas');
      preencherSelect('filtroDestino', filtros.destinos || [], 'Todos');
      preencherSelect('filtroEmpresa', filtros.empresas || [], 'Todas');
      preencherDatalist('listaMercadorias', filtros.mercadorias || []);
    }

    function preencherFiltrosPorModo() {
      if (!rawData) return;
      
      const registrosModo = getRegistrosBasePorModo();
      const categorias = [...new Set(registrosModo.map(r => r.categoria).filter(Boolean))].sort();
      const destinos = [...new Set(registrosModo.map(r => r.destinoCompleto || r.destino).filter(Boolean))].sort();
      const empresas = [...new Set(registrosModo.map(r => r.empresa).filter(Boolean))].sort();
      const mercadorias = [...new Set(registrosModo.map(r => r.mercadoria).filter(Boolean))].sort();
      
      preencherSelect('filtroCategoria', categorias, 'Todas');
      preencherSelect('filtroDestino', destinos, modoSelecionado === 'internacional' ? 'Todos os destinos' : 'Todos');
      preencherSelect('filtroEmpresa', empresas, 'Todas');
      preencherDatalist('listaMercadorias', mercadorias);
    }

    function atualizarFiltroDestinoPorModo(registrosBaseModo) {
      const destinos = [...new Set((registrosBaseModo || []).map(function(item) {
        return item.destinoCompleto;
      }).filter(Boolean))].sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
      });
      preencherSelect('filtroDestino', destinos, modoSelecionado === 'internacional' ? 'Todos os destinos de exportação' : 'Todos os destinos nacionais');
    }

    function preencherSelect(id, items, labelAll) {
      const el = document.getElementById(id);
      const valorAtual = el.value;
      el.innerHTML = '';

      const optAll = document.createElement('option');
      optAll.value = '';
      optAll.textContent = labelAll;
      el.appendChild(optAll);

      items.forEach(function(item) {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        el.appendChild(opt);
      });

      el.value = items.includes(valorAtual) ? valorAtual : '';
    }

    function preencherDatalist(id, items) {
      const el = document.getElementById(id);
      el.innerHTML = '';

      items.forEach(function(item) {
        const opt = document.createElement('option');
        opt.value = item;
        el.appendChild(opt);
      });
    }

    function setModo(modo) {
      modoSelecionado = modo;
      paisSelecionadoBotao = '';
      tipoSelecionado = '';
      categoriaSelecionadaBotao = '';
      document.getElementById('filtroDestino').value = '';
      document.getElementById('filtroCategoria').value = '';
      document.getElementById('filtroEmpresa').value = '';
      document.getElementById('filtroMercadoria').value = '';
      preencherFiltrosPorModo();
      aplicarFiltros();
    }

    function renderModeButtons() {
      const cardNacional = document.getElementById('cardModoNacional');
      const cardExportacao = document.getElementById('cardModoExportacao');

      if (cardNacional) cardNacional.classList.toggle('active', modoSelecionado === 'nacional');
      if (cardExportacao) cardExportacao.classList.toggle('active', modoSelecionado === 'internacional');
    }

    function getRegistrosBasePorModo() {
      if (!rawData || !rawData.registros) return [];

      return rawData.registros.filter(function(item) {
        if (!isValidDestino(item.destinoCompleto)) return false;
        if (!modoSelecionado) return true;
        return item.modo === modoSelecionado;
      });
    }

    function renderPaisButtons(items) {
      const wrap = document.getElementById('paisButtonsWrap');
      wrap.innerHTML = '';

      const allBtn = document.createElement('button');
      allBtn.className = 'chip-btn' + (!paisSelecionadoBotao ? ' active' : '');
      allBtn.textContent = modoSelecionado === 'nacional' ? 'Todos os destinos nacionais' : 'Todos os países';
      allBtn.onclick = function() {
        paisSelecionadoBotao = '';
        aplicarFiltros();
      };
      wrap.appendChild(allBtn);

      items.forEach(function(item) {
        if (modoSelecionado === 'internacional' && item === 'Brasil') return;

        const btn = document.createElement('button');
        btn.className = 'chip-btn' + (paisSelecionadoBotao === item ? ' active' : '');
        btn.textContent = getFlagByDestino(item) + ' ' + item;
        btn.onclick = function() {
          paisSelecionadoBotao = (paisSelecionadoBotao === item ? '' : item);
          aplicarFiltros();
        };
        wrap.appendChild(btn);
      });
    }

    function renderTipoButtons(items) {
      const wrap = document.getElementById('tipoButtonsWrap');
      if (!wrap) return;
      
      wrap.innerHTML = '';

      const allBtn = document.createElement('button');
      allBtn.className = 'chip-btn' + (!tipoSelecionado ? ' active' : '');
      allBtn.textContent = 'Todos os tipos';
      allBtn.onclick = function() {
        tipoSelecionado = '';
        aplicarFiltros();
      };
      wrap.appendChild(allBtn);

      items.forEach(function(item) {
        const btn = document.createElement('button');
        btn.className = 'chip-btn' + (tipoSelecionado === item ? ' active' : '');
        btn.textContent = item.charAt(0).toUpperCase() + item.slice(1);
        btn.onclick = function() {
          tipoSelecionado = (tipoSelecionado === item ? '' : item);
          aplicarFiltros();
        };
        wrap.appendChild(btn);
      });
    }

    function renderCategoriaButtons(items) {
      const wrap = document.getElementById('categoriaButtonsWrap');
      wrap.innerHTML = '';

      const allBtn = document.createElement('button');
      allBtn.className = 'chip-btn' + (!categoriaSelecionadaBotao ? ' active' : '');
      allBtn.textContent = 'Todas as categorias';
      allBtn.onclick = function() {
        categoriaSelecionadaBotao = '';
        document.getElementById('filtroCategoria').value = '';
        aplicarFiltros();
      };
      wrap.appendChild(allBtn);

      items.forEach(function(item) {
        const btn = document.createElement('button');
        btn.className = 'chip-btn' + (categoriaSelecionadaBotao === item ? ' active' : '');
        btn.textContent = item;
        btn.onclick = function() {
          categoriaSelecionadaBotao = (categoriaSelecionadaBotao === item ? '' : item);
          document.getElementById('filtroCategoria').value = categoriaSelecionadaBotao;
          aplicarFiltros();
        };
        wrap.appendChild(btn);
      });
    }

    function onCategoriaSelectChange() {
      categoriaSelecionadaBotao = document.getElementById('filtroCategoria').value || '';
      aplicarFiltros();
    }

    function limparFiltros() {
      document.getElementById('filtroCategoria').value = '';
      document.getElementById('filtroDestino').value = '';
      document.getElementById('filtroEmpresa').value = '';
      document.getElementById('filtroMercadoria').value = '';
      paisSelecionadoBotao = '';
      categoriaSelecionadaBotao = '';
      modoSelecionado = modoSelecionado || 'nacional';
      aplicarFiltros();
    }

    function aplicarFiltros() {
      if (!rawData) return;

      renderModeButtons();

      const registrosBaseModo = getRegistrosBasePorModo();
      atualizarFiltroDestinoPorModo(registrosBaseModo);
      const chipHeader = document.getElementById('paisChipHeader');
      if (chipHeader) {
        chipHeader.textContent = modoSelecionado === 'nacional' ? 'Seleção rápida por destino nacional' : 'Seleção rápida por país exportação';
      }
      const tituloResumo = document.getElementById('tituloResumoVisual');
      if (tituloResumo) {
        tituloResumo.textContent = modoSelecionado === 'internacional' ? 'Resumo por País' : 'Resumo por Destino';
      }
      const tituloChart = document.getElementById('tituloChartVisual');
      if (tituloChart) {
        tituloChart.textContent = modoSelecionado === 'internacional' ? 'Representatividade por País' : 'Representatividade por Destino';
      }

      const tipoPanel = document.getElementById('tipoPanel');
      if (tipoPanel) {
        tipoPanel.style.display = modoSelecionado === 'internacional' ? 'block' : 'none';
      }

      const registrosComQtd = registrosBaseModo.filter(function(item) {
        return Number(item.qtd || 0) > 0;
      });

      const paisesModo = modoSelecionado === 'nacional'
        ? [...new Set(registrosComQtd.map(function(item) {
            return item.destinoCompleto || item.destino;
          }).filter(Boolean))]
        : [...new Set(registrosComQtd.map(function(item) {
            return item.pais;
          }).filter(Boolean))];

      const categoriasModo = [...new Set(registrosBaseModo.map(function(item) {
        return item.categoria;
      }).filter(Boolean))].sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
      });

      paisesModo.sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
      });

      renderPaisButtons(paisesModo);
      renderCategoriaButtons(categoriasModo);

      const categoriaSelecionada = categoriaSelecionadaBotao || document.getElementById('filtroCategoria').value;
      const destinoSelecionado = document.getElementById('filtroDestino').value;
      const empresaSelecionada = document.getElementById('filtroEmpresa').value;
      const mercadoriaBusca = (document.getElementById('filtroMercadoria').value || '').toLowerCase().trim();

      if (modoSelecionado === 'internacional') {
        const tiposModo = [...new Set(registrosBaseModo.map(function(item) {
          return item.tipo;
        }).filter(Boolean))].sort();
        renderTipoButtons(tiposModo);
      }

      const registrosFiltrados = registrosBaseModo.filter(function(item) {
        const categoriaItem = item.categoria || '';
        const itemPaisOuDestino = modoSelecionado === 'nacional' ? item.destinoCompleto : item.pais;
        const matchPaisBotao = !paisSelecionadoBotao || itemPaisOuDestino === paisSelecionadoBotao;
        const matchCategoria = !categoriaSelecionada || categoriaItem === categoriaSelecionada;
        const matchDestino = !destinoSelecionado || item.destinoCompleto === destinoSelecionado;
        const matchEmpresa = !empresaSelecionada || item.empresa === empresaSelecionada;
        const matchMercadoria = !mercadoriaBusca || (item.mercadoria || '').toLowerCase().indexOf(mercadoriaBusca) > -1;
        const matchTipo = !tipoSelecionado || item.tipo === tipoSelecionado;

        return matchPaisBotao && matchCategoria && matchDestino && matchEmpresa && matchMercadoria && matchTipo;
      });

      const totais = calcularTotais(registrosFiltrados);
      const resumoDestino = agruparVisual(registrosFiltrados);
      let ordemTamanhos = (rawData.metadados && Array.isArray(rawData.metadados.tamanhos)) ? rawData.metadados.tamanhos : [];
      const ordemPadrao = ['P', 'M', 'G', 'GG', 'EGG', 'EXGG'];
      const tamanhosValidos = ordemPadrao.filter(t => ordemTamanhos.includes(t));
      const temOutros = ordemTamanhos.some(t => !ordemPadrao.includes(t));
      ordemTamanhos = tamanhosValidos.concat(temOutros ? ['OUTROS'] : []);

      const produtosPivot = gerarPivotProdutos(registrosFiltrados, ordemTamanhos);
      const categoriasPivot = gerarPivotCategorias(registrosFiltrados, ordemTamanhos);
      const metasResumo = calcularMetasResumo(registrosBaseModo);

      animateValue('totalVolumes', totais.volumes, 'int');
      animateValue('totalKg', totais.kg, 'int');
      animateValue('totalM3', totais.m3, 'decimal');
      animateValue('totalPecas', totais.pecas, 'int');

      drawChart(resumoDestino);
      renderResumoTable(resumoDestino);
      renderCategoriasTable(categoriasPivot, ordemTamanhos);
      renderProdutosTable(produtosPivot, ordemTamanhos);
      renderMetasM3(metasResumo);
      verificarAlertas(metasResumo);
    }

    function calcularTotais(registros) {
      return registros.reduce(function(acc, item) {
        acc.volumes += Number(item.volumes || 0);
        acc.kg += Number(item.kg || 0);
        acc.m3 += Number(item.m3 || 0);
        acc.pecas += Number(item.qtd || 0);
        return acc;
      }, { volumes: 0, kg: 0, m3: 0, pecas: 0 });
    }

    function getChaveVisual(item) {
      if (modoSelecionado === 'internacional') return item.pais || item.destinoCompleto;
      return item.destinoCompleto;
    }

    function agruparVisual(registros) {
      const mapa = {};
      let totalVolumes = 0;

      registros.forEach(function(item) {
        const chave = getChaveVisual(item);
        if (!isValidDestino(chave)) return;

        if (!mapa[chave]) {
          mapa[chave] = {
            destino: chave,
            volumes: 0,
            kg: 0,
            pecas: 0,
            m3: 0,
            representatividade: 0,
            detalhesMapa: {}
          };
        }

        mapa[chave].volumes += Number(item.volumes || 0);
        mapa[chave].kg += Number(item.kg || 0);
        mapa[chave].pecas += Number(item.qtd || 0);
        mapa[chave].m3 += Number(item.m3 || 0);
        totalVolumes += Number(item.volumes || 0);

        const detalheChave = item.destinoCompleto || chave;
        if (!mapa[chave].detalhesMapa[detalheChave]) {
          mapa[chave].detalhesMapa[detalheChave] = {
            destino: detalheChave,
            volumes: 0,
            kg: 0,
            pecas: 0,
            m3: 0
          };
        }

        mapa[chave].detalhesMapa[detalheChave].volumes += Number(item.volumes || 0);
        mapa[chave].detalhesMapa[detalheChave].kg += Number(item.kg || 0);
        mapa[chave].detalhesMapa[detalheChave].pecas += Number(item.qtd || 0);
        mapa[chave].detalhesMapa[detalheChave].m3 += Number(item.m3 || 0);
      });

      const lista = Object.keys(mapa).map(function(k) {
        const item = mapa[k];
        item.representatividade = totalVolumes > 0 ? (item.volumes / totalVolumes) * 100 : 0;
        item.detalhes = Object.keys(item.detalhesMapa).map(function(d) {
          return item.detalhesMapa[d];
        }).sort(function(a, b) {
          return b.m3 - a.m3;
        });
        delete item.detalhesMapa;
        return item;
      });

      return lista.sort(function(a, b) {
        return b.representatividade - a.representatividade;
      });
    }

    function gerarPivotProdutos(registros, ordemTamanhos) {
      const mapa = {};
      const ordemPadrao = ['P', 'M', 'G', 'GG', 'EGG', 'EXGG'];

      registros.forEach(function(item) {
        const produto = item.mercadoria || 'Sem mercadoria';
        const tamanho = ordemPadrao.includes(item.tamanho) ? item.tamanho : 'OUTROS';
        const qtd = Number(item.qtd || 0);

        if (!mapa[produto]) {
          mapa[produto] = { produto: produto, total: 0 };
          ordemTamanhos.forEach(function(t) {
            mapa[produto][t] = 0;
          });
          if (!mapa[produto]['OUTROS']) {
            mapa[produto]['OUTROS'] = 0;
          }
        }

        mapa[produto][tamanho] += qtd;
        mapa[produto].total += qtd;
      });

      return Object.keys(mapa).map(function(k) {
        return mapa[k];
      }).sort(function(a, b) {
        return b.total - a.total;
      });
    }

    function gerarPivotCategorias(registros, ordemTamanhos) {
      const mapa = {};
      const ordemPadrao = ['P', 'M', 'G', 'GG', 'EGG', 'EXGG'];

      registros.forEach(function(item) {
        const categoria = item.categoria || 'Sem categoria';
        const tamanho = ordemPadrao.includes(item.tamanho) ? item.tamanho : 'OUTROS';
        const qtd = Number(item.qtd || 0);

        if (!mapa[categoria]) {
          mapa[categoria] = { categoria: categoria, total: 0 };
          ordemTamanhos.forEach(function(t) {
            mapa[categoria][t] = 0;
          });
          if (!mapa[categoria]['OUTROS']) {
            mapa[categoria]['OUTROS'] = 0;
          }
        }

        mapa[categoria][tamanho] += qtd;
        mapa[categoria].total += qtd;
      });

      return Object.keys(mapa).map(function(k) {
        return mapa[k];
      }).sort(function(a, b) {
        return b.total - a.total;
      });
    }

    function normalizarChaveMeta(destinoCompleto) {
      const destino = removeAccents(destinoCompleto);

      // Retorna o nome do país para buscar a meta
      if (destino.includes('chile')) return 'Chile';
      if (destino.includes('paraguai')) return 'Paraguai';
      if (destino.includes('uruguai')) return 'Uruguai';
      if (destino.includes('portugal')) return 'Portugal';
      if (destino.includes('panama')) return 'Panama';
      if (destino.includes('mexico')) return 'Mexico';

      return destinoCompleto;
    }

    function calcularMetasResumo(registros) {
      const mapa = {};
      
      // Gera metas de 100 m³ para destinos nacionais
      const destinavosNacionais = [...new Set(registros
        .filter(r => r.modo === 'nacional')
        .map(r => r.destinoCompleto)
        .filter(Boolean))];
      
      destinavosNacionais.forEach(dest => {
        const chaveDestino = normalizarChaveMeta(dest);
        if (!rawData.metasM3[chaveDestino]) {
          rawData.metasM3[chaveDestino] = 100;
        }
      });

      registros.forEach(function(item) {
        if (!isValidDestino(item.destinoCompleto)) return;

        const chaveMeta = normalizarChaveMeta(item.destinoCompleto);
        const meta = rawData && rawData.metasM3 ? Number(rawData.metasM3[chaveMeta] || 0) : 0;
        // Remove o filtro: if (!meta) return; para permitir Romance/Favorita aparecerem

        const chaveVisual = item.modo === 'internacional' ? (item.pais || chaveMeta) : item.destinoCompleto;
        const tipo = item.tipo || 'Geral';

        if (!mapa[chaveVisual]) {
          mapa[chaveVisual] = {
            destino: chaveVisual,
            real: 0,
            meta: meta,  // Agora sempre recebe a meta, mesmo que 0
            volumes: 0,
            pecas: 0,
            destinosSet: new Set(),
            tiposMapa: {}
          };
        }

        mapa[chaveVisual].real += Number(item.m3 || 0);
        mapa[chaveVisual].volumes += Number(item.volumes || 0);
        mapa[chaveVisual].pecas += Number(item.qtd || 0);
        
        // Atualiza meta se ainda é 0 (para casos onde meta vem depois)
        if (mapa[chaveVisual].meta === 0 && meta > 0) {
          mapa[chaveVisual].meta = meta;
        }

        mapa[chaveVisual].destinosSet.add(item.destinoCompleto || chaveVisual);

        if (!mapa[chaveVisual].tiposMapa[tipo]) {
          mapa[chaveVisual].tiposMapa[tipo] = {
            tipo: tipo === 'Geral' ? chaveVisual : tipo,
            real: 0,
            volumes: 0,
            pecas: 0
          };
        }

        mapa[chaveVisual].tiposMapa[tipo].real += Number(item.m3 || 0);
        mapa[chaveVisual].tiposMapa[tipo].volumes += Number(item.volumes || 0);
        mapa[chaveVisual].tiposMapa[tipo].pecas += Number(item.qtd || 0);
      });

      return Object.keys(mapa).map(function(k) {
        const item = mapa[k];
        item.destinosCount = item.destinosSet.size;
        item.percentual = item.meta > 0 ? (item.real / item.meta) * 100 : 0;
        item.falta = Math.max(item.meta - item.real, 0);
        item.detalhes = Object.keys(item.tiposMapa).map(function(d) {
          return item.tiposMapa[d];
        }).sort(function(a, b) {
          return b.real - a.real;
        });
        delete item.destinosSet;
        delete item.tiposMapa;
        return item;
      }).filter(function(item) {
        // Filtra apenas países que têm meta
        return item.meta > 0;
      }).sort(function(a, b) {
        return b.percentual - a.percentual;
      });
    }

    function animateValue(id, value, type) {
      const el = document.getElementById(id);
      if (!el) return;

      const finalValue = Number(value || 0);
      const startValue = Number(el.dataset.current || 0);

      const duration = 900;
      const startTime = performance.now();

      function format(v) {
        return type === 'decimal' ? formatDecimal(v) : formatNumber(Math.round(v));
      }

      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (finalValue - startValue) * eased;

        el.textContent = format(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.dataset.current = finalValue;
          el.textContent = format(finalValue);
        }
      }

      requestAnimationFrame(step);
    }

    function buildVisualTooltip(item) {
      const detalheHtml = (item.detalhes || []).map(function(d) {
        return '<div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.12);padding-top:6px;margin-top:6px;">' +
          '<span style="color:#CBD5E1;">' + escapeHtml(d.destino) + '</span>' +
          '<b style="color:#fff;">' + formatDecimal(d.m3 || d.real || 0) + ' m³</b>' +
        '</div>';
      }).join('');

      return '<div style="padding:12px 14px;min-width:230px;background:#0F172A;color:#fff;border-radius:12px;">' +
        '<div style="font-weight:800;margin-bottom:8px;">' + getFlagByDestino(item.destino) + ' ' + escapeHtml(item.destino) + '</div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;"><span>Representatividade</span><b>' + formatPercent(item.representatividade) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;"><span>Volumes</span><b>' + formatNumber(item.volumes) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between;gap:16px;"><span>M³</span><b>' + formatDecimal(item.m3) + '</b></div>' +
        (detalheHtml ? '<div style="font-size:11px;color:#94A3B8;text-transform:uppercase;font-weight:800;margin-top:10px;">Destinos</div>' + detalheHtml : '') +
      '</div>';
    }

    function drawChart(items) {
      const chartDiv = document.getElementById('chart_div');

      if (!items.length) {
        chartDiv.innerHTML = '<div class="empty"><div class="empty-icon">📊</div><p style="color:#94A3B8;">Sem dados para o filtro selecionado</p></div>';
        return;
      }

      chartDiv.innerHTML = '';

      var chartData = new google.visualization.DataTable();
      chartData.addColumn('string', 'Destino');
      chartData.addColumn('number', 'Representatividade');
      chartData.addColumn({ type: 'string', role: 'annotation' });
      chartData.addColumn({ type: 'string', role: 'style' });
      chartData.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

      items.forEach(function(item) {
        const colors = {
          'Paraguai': '#3B82F6',
          'Portugal': '#10B981',
          'Uruguai': '#F59E0B',
          'Chile': '#8B5CF6',
          'Panamá': '#EC4899',
          'México': '#06B6D4'
        };
        const color = colors[item.destino] || '#38BDF8';
        const style = 'color: ' + color + '; stroke-color: ' + color + '; stroke-width: 1.5; fill-opacity: 0.92';
        chartData.addRow([
          item.destino,
          item.representatividade,
          formatPercent(item.representatividade),
          style,
          buildVisualTooltip(item)
        ]);
      });

      var options = {
        title: '',
        height: Math.max(360, items.length * 48),
        legend: { position: 'none' },
        chartArea: {
          width: window.innerWidth <= 768 ? '64%' : '78%',
          height: '86%',
          left: window.innerWidth <= 768 ? 110 : 170,
          top: 20
        },
        annotations: {
          alwaysOutside: false,
          textStyle: {
            fontSize: 12,
            bold: true,
            color: '#FFFFFF'
          }
        },
        hAxis: {
          minValue: 0,
          maxValue: 100,
          gridlines: { color: 'rgba(255,255,255,0.04)' },
          minorGridlines: { color: 'transparent' },
          baselineColor: 'rgba(255,255,255,0.08)',
          textStyle: { color: '#94A3B8', fontSize: 12 },
          format: "#'%'"
        },
        vAxis: {
          gridlines: { color: 'transparent' },
          baselineColor: 'transparent',
          textStyle: { color: '#CBD5E1', fontSize: 13, fontWeight: 'bold' }
        },
        backgroundColor: 'transparent',
        bar: { groupWidth: '72%' },
        tooltip: {
          isHtml: true,
          textStyle: { fontSize: 13 },
          showColorCode: true
        },
        enableInteractivity: true
      };

      var chart = new google.visualization.BarChart(chartDiv);
      chart.draw(chartData, options);

      setTimeout(function() {
        const rects = chartDiv.getElementsByTagName('rect');
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const fill = rect.getAttribute('fill');
          if (fill && fill !== 'transparent' && !fill.match(/^rgb\(220/)) {
            rect.setAttribute('rx', '10');
            rect.setAttribute('ry', '10');
            rect.style.filter = 'drop-shadow(0 8px 16px rgba(0,0,0,0.30)) drop-shadow(0 0 12px ' + fill.replace(/opacity/, 'opacity') + ')';
          }
        }
      }, 150);
    }

    function renderResumoTable(items) {
      var tbody = document.getElementById('tableResumoBody');
      tbody.innerHTML = '';

      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty" style="color:#94A3B8;">Sem dados disponíveis</td></tr>';
        return;
      }

      items.forEach(function(item) {
        // Linha principal do país/destino
        var trPrincipal = document.createElement('tr');
        trPrincipal.className = 'resumo-principal';
        trPrincipal.innerHTML =
          '<td class="font-semibold">' + escapeHtml(item.destino) + '</td>' +
          '<td class="text-right font-semibold">' + formatPercent(item.representatividade) + '</td>' +
          '<td class="text-right">' + formatNumber(item.volumes) + '</td>' +
          '<td class="text-right">' + formatNumber(item.kg) + '</td>' +
          '<td class="text-right">' + formatDecimal(item.m3) + '</td>' +
          '<td class="text-right">' + formatNumber(item.pecas) + '</td>';
        tbody.appendChild(trPrincipal);

        // Linhas de detalhe (Romance/Favorita) se existirem
        if (modoSelecionado === 'internacional' && item.detalhes && item.detalhes.length > 0) {
          item.detalhes.forEach(function(d) {
            var trDetalhe = document.createElement('tr');
            trDetalhe.className = 'resumo-detalhe';
            trDetalhe.innerHTML =
              '<td style="padding-left:40px; color:#94A3B8;"><span style="color:#64748B;">▶</span> ' + escapeHtml(d.destino) + '</td>' +
              '<td class="text-right" style="color:#94A3B8;">—</td>' +
              '<td class="text-right" style="color:#94A3B8;">' + formatNumber(d.volumes) + '</td>' +
              '<td class="text-right" style="color:#94A3B8;">' + formatNumber(d.kg) + '</td>' +
              '<td class="text-right">' + formatDecimal(d.m3) + '</td>' +
              '<td class="text-right" style="color:#94A3B8;">' + formatNumber(d.pecas) + '</td>';
            tbody.appendChild(trDetalhe);
          });
        }
      });
    }

    function renderCategoriasTable(items, tamanhos) {
      var thead = document.getElementById('categoriasThead');
      var tbody = document.getElementById('categoriasBody');

      thead.innerHTML = '';
      tbody.innerHTML = '';

      var header = document.createElement('tr');
      header.innerHTML = '<th>Categoria</th>' +
        tamanhos.map(function(t) { return '<th class="text-right">' + escapeHtml(t) + '</th>'; }).join('') +
        '<th class="text-right" style="color:#FACC15;">Total</th>';
      thead.appendChild(header);

      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="' + (tamanhos.length + 2) + '" class="empty" style="color:#94A3B8;">Sem dados disponíveis</td></tr>';
        return;
      }

      items.forEach(function(item) {
        var tr = document.createElement('tr');
        var cols = '<td class="font-semibold">' + escapeHtml(item.categoria) + '</td>';

        tamanhos.forEach(function(tam) {
          cols += '<td class="text-right">' + formatNumber(item[tam] || 0) + '</td>';
        });

        cols += '<td class="text-right font-bold" style="background:rgba(250,204,21,0.05); color:#FACC15;">' + formatNumber(item.total || 0) + '</td>';
        tr.innerHTML = cols;
        tbody.appendChild(tr);
      });
    }

    function renderProdutosTable(items, tamanhos) {
      var thead = document.getElementById('produtosThead');
      var tbody = document.getElementById('produtosBody');

      thead.innerHTML = '';
      tbody.innerHTML = '';

      var header = document.createElement('tr');
      header.innerHTML = '<th>Produto</th>' +
        tamanhos.map(function(t) { return '<th class="text-right">' + escapeHtml(t) + '</th>'; }).join('') +
        '<th class="text-right" style="color:#FACC15;">Total</th>';
      thead.appendChild(header);

      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="' + (tamanhos.length + 2) + '" class="empty" style="color:#94A3B8;">Sem dados disponíveis</td></tr>';
        return;
      }

      items.forEach(function(item) {
        var tr = document.createElement('tr');
        var cols = '<td class="font-semibold">' + escapeHtml(item.produto) + '</td>';

        tamanhos.forEach(function(tam) {
          cols += '<td class="text-right">' + formatNumber(item[tam] || 0) + '</td>';
        });

        cols += '<td class="text-right font-bold" style="background:rgba(250,204,21,0.05); color:#FACC15;">' + formatNumber(item.total || 0) + '</td>';
        tr.innerHTML = cols;
        tbody.appendChild(tr);
      });
    }

    function getStatusMeta(percent) {
      if (percent > 100) {
        return { className: 'concluida', label: 'Concluída', color: '#3B82F6' };
      }
      if (percent >= 91) {
        return { className: 'reta-final', label: 'Reta final', color: '#22C55E' };
      }
      if (percent >= 51) {
        return { className: 'quase-la', label: 'Quase lá', color: '#F97316' };
      }
      if (percent >= 31) {
        return { className: 'em-andamento', label: 'Em andamento', color: '#FACC15' };
      }
      return { className: 'iniciada', label: 'Iniciada', color: '#EF4444' };
    }

    function buildMetaDetalhesTooltip(item) {
      if (!item.detalhes || item.detalhes.length === 0) return '';

      return '<div class="tooltip-section-title">Detalhe por tipo</div>' +
        item.detalhes.map(function(d) {
          return '<div class="tooltip-row">' +
            '<span class="tooltip-label">' + escapeHtml(d.tipo) + '</span>' +
            '<span class="tooltip-value">' + formatDecimal(d.real) + ' m³ · ' + formatNumber(d.volumes) + ' vol</span>' +
          '</div>';
        }).join('');
    }

    function renderMetasM3(items) {
      const wrap = document.getElementById('metasM3Wrap');
      wrap.innerHTML = '';

      if (!items.length) {
        wrap.innerHTML = '<div class="empty"><div class="empty-icon">🎯</div><p style="color:#94A3B8;">Sem destinos com meta para o filtro selecionado</p></div>';
        return;
      }

      items.forEach(function(item) {
        const percent = item.percentual;
        const percentBar = Math.max(0, Math.min(percent, 100));
        const flag = getFlagByDestino(item.destino);
        const code = getCountryCodeByDestino(item.destino);
        const status = getStatusMeta(percent);
        const avgM3PorVolume = item.volumes > 0 ? (item.real / item.volumes) : 0;
        const faltaVolumes = avgM3PorVolume > 0 ? Math.ceil(item.falta / avgM3PorVolume) : 0;

        const marker25 = 25;
        const marker50 = 50;
        const marker75 = 75;
        const transportLeft = percentBar < 6 ? 6 : percentBar > 98 ? 98 : percentBar;

        const div = document.createElement('div');
        div.className = 'meta-item';

        div.innerHTML =
          '<div class="meta-top meta-top-header">' +
            '<div class="meta-head-left">' +
              '<div class="meta-card-code">' + escapeHtml(code) + '</div>' +
              '<div class="meta-label">' + escapeHtml(item.destino) + '</div>' +
              '<div class="meta-subtitle">' + item.destinosCount + ' destino' + (item.destinosCount === 1 ? '' : 's') + ' · ' + formatNumber(item.volumes) + ' vol.</div>' +
            '</div>' +
            '<div class="meta-percent-inline" style="color:' + status.color + ';">' + formatDecimal(item.percentual) + '%</div>' +
          '</div>' +

          '<div class="thermo-block">' +
            '<div class="thermo-track-wrap">' +
              '<div class="thermo-scale">' +
                '<span>0%</span>' +
                '<span>25%</span>' +
                '<span>50%</span>' +
                '<span>75%</span>' +
                '<span>100%</span>' +
              '</div>' +

              '<div class="thermo-markers">' +
                '<span class="thermo-marker" style="left:' + marker25 + '%;"></span>' +
                '<span class="thermo-marker" style="left:' + marker50 + '%;"></span>' +
                '<span class="thermo-marker" style="left:' + marker75 + '%;"></span>' +
              '</div>' +

              '<div class="thermo-track">' +
                '<div class="thermo-fill ' + status.className + '" style="width:' + percentBar + '%;"></div>' +
                '<div class="transport-icon ' + status.className + '" style="left:calc(' + transportLeft + '%);">' +
                  '<img src="./assets/images/truck-icon.png" class="truck-image" alt="Caminhão em progresso">' +
                '</div>' +
              '</div>' +

              '<div class="thermo-tooltip">' +
                '<div class="tooltip-title"><span>' + flag + '</span><span>' + escapeHtml(item.destino) + '</span></div>' +
                '<div class="tooltip-grid">' +
                  '<div class="tooltip-row"><span class="tooltip-label">Volumes</span><span class="tooltip-value">' + formatNumber(item.volumes) + '</span></div>' +
                  '<div class="tooltip-row"><span class="tooltip-label">M³ carregados</span><span class="tooltip-value">' + formatDecimal(item.real) + '</span></div>' +
                  '<div class="tooltip-row"><span class="tooltip-label">Faltam para concluir</span><span class="tooltip-value">' + formatDecimal(item.falta) + ' m³</span></div>' +
                  (avgM3PorVolume > 0 ? '<div class="tooltip-row"><span class="tooltip-label">Média / volume</span><span class="tooltip-value">' + formatDecimal(avgM3PorVolume) + ' m³</span></div>' : '') +
                  (faltaVolumes > 0 ? '<div class="tooltip-row"><span class="tooltip-label">Volumes faltando</span><span class="tooltip-value">' + formatNumber(faltaVolumes) + '</span></div>' : '') +
                  buildMetaDetalhesTooltip(item) +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="thermo-bottom">' +
            '<div>Real: <b>' + formatDecimal(item.real) + '</b> m³</div>' +
            '<div>Meta: <b>' + formatDecimal(item.meta) + '</b> m³</div>' +
            '<div class="thermo-status ' + status.className + '">' + status.label + '</div>' +
          '</div>';

        wrap.appendChild(div);
      });
    }

    function verificarAlertas(items) {
      const quaseAlertas = items.filter(function(item) {
        return item.percentual >= 91 && item.percentual < 100;
      });
      const concluidas = items.filter(function(item) {
        return item.percentual >= 100;
      });

      if (quaseAlertas.length) {
        const nomes = quaseAlertas.map(function(item) {
          return escapeHtml(item.destino);
        });
        let mensagem = '';
        if (nomes.length === 1) {
          mensagem = '⚠️ Atenção: a carga de <b>' + nomes[0] + '</b> está prestes a ser finalizada. Fique atento.';
        } else {
          mensagem = '⚠️ Atenção: as cargas de <b>' + nomes.join(', ') + '</b> estão prestes a ser finalizadas. Fique atento.';
        }
        showAlertToast(mensagem);
      }

      if (concluidas.length) {
        const nomes = concluidas.map(function(item) {
          return escapeHtml(item.destino);
        });
        let mensagem = '';
        if (nomes.length === 1) {
          mensagem = '✅ Carga concluída: <b>' + nomes[0] + '</b>. Bora enviar!!!';
        } else {
          mensagem = '✅ Cargas concluídas: <b>' + nomes.join(', ') + '</b>. Bora enviar!!!';
        }
        showSuccessToast(mensagem);
      }
    }

    function showError(error) {
      document.body.innerHTML =
        '<div class="app-shell"><div class="glass-card panel"><h2 style="color:#EF4444; margin-bottom:12px;">Erro</h2><p style="color:#CBD5E1;">' +
        escapeHtml(error && error.message ? error.message : error) +
        '</p></div></div>';
    }

    window.addEventListener('resize', function() {
      if (rawData) {
        aplicarFiltros();
      }
    });
