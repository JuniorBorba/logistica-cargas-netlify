    
    
    
    google.charts.load('current', { packages: ['corechart', 'bar'] });
    google.charts.setOnLoadCallback(loadData);

    let rawData = null;
    let toastTimer = null;
    let alertTimer = null;
    let paisSelecionadoBotao = '';
    let categoriaSelecionadaBotao = '';
    let modoSelecionado = 'nacional';

    function formatNumber(value) {
      return new Intl.NumberFormat('pt-BR').format(value || 0);
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

    function isValidDestino(destino) {
      if (!destino) return false;
      const destinoNorm = destino.trim().toLowerCase();
      return destinoNorm !== '' && destinoNorm !== 'sem destino';
    }

    function loadData(showToastOnSuccess = false) {
      toggleRefreshButton(true);

      google.script.run
        .withSuccessHandler(function(data) {
          rawData = data;
          preencherFiltros(data.filtros);
          aplicarFiltros();
          toggleRefreshButton(false);

          if (showToastOnSuccess) {
            showToast('Dados atualizados com sucesso');
          }
        })
        .withFailureHandler(function(error) {
          toggleRefreshButton(false);
          showError(error);
        })
        .getDashboardData();
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

    function preencherFiltros(filtros) {
      preencherSelect('filtroCategoria', filtros.categorias || [], 'Todas');
      preencherSelect('filtroDestino', filtros.destinos || [], 'Todos');
      preencherSelect('filtroEmpresa', filtros.empresas || [], 'Todas');
      preencherDatalist('listaMercadorias', filtros.mercadorias || []);
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
      document.getElementById('filtroDestino').value = '';
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

      const paisesModo = [...new Set(registrosBaseModo.map(function(item) {
        return item.pais;
      }).filter(Boolean))].sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
      });

      const categoriasModo = [...new Set(registrosBaseModo.map(function(item) {
        return item.categoria;
      }).filter(Boolean))].sort(function(a, b) {
        return a.localeCompare(b, 'pt-BR');
      });

      renderPaisButtons(paisesModo);
      renderCategoriaButtons(categoriasModo);

      const categoriaSelecionada = categoriaSelecionadaBotao || document.getElementById('filtroCategoria').value;
      const destinoSelecionado = document.getElementById('filtroDestino').value;
      const empresaSelecionada = document.getElementById('filtroEmpresa').value;
      const mercadoriaBusca = (document.getElementById('filtroMercadoria').value || '').toLowerCase().trim();

      const registrosFiltrados = registrosBaseModo.filter(function(item) {
        const categoriaItem = item.categoria || '';
        const matchPaisBotao = !paisSelecionadoBotao || item.pais === paisSelecionadoBotao;
        const matchCategoria = !categoriaSelecionada || categoriaItem === categoriaSelecionada;
        const matchDestino = !destinoSelecionado || item.destinoCompleto === destinoSelecionado;
        const matchEmpresa = !empresaSelecionada || item.empresa === empresaSelecionada;
        const matchMercadoria = !mercadoriaBusca || (item.mercadoria || '').toLowerCase().indexOf(mercadoriaBusca) > -1;

        return matchPaisBotao && matchCategoria && matchDestino && matchEmpresa && matchMercadoria;
      });

      const totais = calcularTotais(registrosFiltrados);
      const resumoDestino = agruparVisual(registrosFiltrados);
      const produtosPivot = gerarPivotProdutos(registrosFiltrados, rawData.metadados.tamanhos);
      const categoriasPivot = gerarPivotCategorias(registrosFiltrados, rawData.metadados.tamanhos);
      const metasResumo = calcularMetasResumo(registrosFiltrados);

      animateValue('totalVolumes', totais.volumes, 'int');
      animateValue('totalKg', totais.kg, 'int');
      animateValue('totalM3', totais.m3, 'decimal');
      animateValue('totalPecas', totais.pecas, 'int');

      drawChart(resumoDestino);
      renderResumoTable(resumoDestino);
      renderCategoriasTable(categoriasPivot, rawData.metadados.tamanhos);
      renderProdutosTable(produtosPivot, rawData.metadados.tamanhos);
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

      registros.forEach(function(item) {
        const produto = item.mercadoria || 'Sem mercadoria';
        const tamanho = ordemTamanhos.includes(item.tamanho) ? item.tamanho : 'OUTROS';
        const qtd = Number(item.qtd || 0);

        if (!mapa[produto]) {
          mapa[produto] = { produto: produto, total: 0 };
          ordemTamanhos.forEach(function(t) {
            mapa[produto][t] = 0;
          });
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

      registros.forEach(function(item) {
        const categoria = item.categoria || 'Sem categoria';
        const tamanho = ordemTamanhos.includes(item.tamanho) ? item.tamanho : 'OUTROS';
        const qtd = Number(item.qtd || 0);

        if (!mapa[categoria]) {
          mapa[categoria] = { categoria: categoria, total: 0 };
          ordemTamanhos.forEach(function(t) {
            mapa[categoria][t] = 0;
          });
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

      if (destino === 'mexico romance') return 'Mexico Romance';
      if (destino === 'méxico romance') return 'Mexico Romance';
      if (destino === 'panama romance') return 'Panama Romance';
      if (destino === 'panamá romance') return 'Panama Romance';
      if (destino === 'portugal romance') return 'Portugal Romance';
      if (destino === 'chile romance') return 'Chile Romance';
      if (destino === 'chile favorita') return 'Chile Favorita';
      if (destino === 'paraguai romance') return 'Paraguai Romance';
      if (destino === 'paraguai favorita') return 'Paraguai Favorita';
      if (destino === 'uruguai romance') return 'Uruguai Romance';
      if (destino === 'uruguai favorita') return 'Uruguai Favorita';

      return destinoCompleto;
    }

    function calcularMetasResumo(registros) {
      const mapa = {};

      registros.forEach(function(item) {
        if (!isValidDestino(item.destinoCompleto)) return;
        if (item.modo !== 'internacional') return;

        const chaveMeta = normalizarChaveMeta(item.destinoCompleto);
        const meta = rawData && rawData.metasM3 ? Number(rawData.metasM3[chaveMeta] || 0) : 0;
        if (!meta) return;

        const chaveVisual = modoSelecionado === 'internacional' ? (item.pais || chaveMeta) : chaveMeta;

        if (!mapa[chaveVisual]) {
          mapa[chaveVisual] = {
            destino: chaveVisual,
            real: 0,
            meta: 0,
            volumes: 0,
            detalhesMapa: {}
          };
        }

        mapa[chaveVisual].real += Number(item.m3 || 0);
        mapa[chaveVisual].volumes += Number(item.volumes || 0);

        if (!mapa[chaveVisual].detalhesMapa[chaveMeta]) {
          mapa[chaveVisual].detalhesMapa[chaveMeta] = {
            destino: chaveMeta,
            real: 0,
            meta: meta,
            volumes: 0
          };
          mapa[chaveVisual].meta += meta;
        }

        mapa[chaveVisual].detalhesMapa[chaveMeta].real += Number(item.m3 || 0);
        mapa[chaveVisual].detalhesMapa[chaveMeta].volumes += Number(item.volumes || 0);
      });

      return Object.keys(mapa).map(function(k) {
        const item = mapa[k];
        item.percentual = item.meta > 0 ? (item.real / item.meta) * 100 : 0;
        item.falta = Math.max(item.meta - item.real, 0);
        item.detalhes = Object.keys(item.detalhesMapa).map(function(d) {
          const detalhe = item.detalhesMapa[d];
          detalhe.percentual = detalhe.meta > 0 ? (detalhe.real / detalhe.meta) * 100 : 0;
          detalhe.falta = Math.max(detalhe.meta - detalhe.real, 0);
          return detalhe;
        }).sort(function(a, b) {
          return b.percentual - a.percentual;
        });
        delete item.detalhesMapa;
        return item;
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
        const style = 'color: #38BDF8; stroke-color: #60A5FA; stroke-width: 1; opacity: 0.98';
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
        height: Math.max(320, items.length * 42),
        legend: { position: 'none' },
        chartArea: {
          width: window.innerWidth <= 768 ? '64%' : '78%',
          height: '82%',
          left: window.innerWidth <= 768 ? 110 : 170,
          top: 18
        },
        annotations: {
          alwaysOutside: false,
          textStyle: {
            fontSize: 11,
            bold: true,
            color: '#FFFFFF'
          }
        },
        hAxis: {
          minValue: 0,
          maxValue: 100,
          gridlines: { color: 'transparent' },
          minorGridlines: { color: 'transparent' },
          baselineColor: 'transparent',
          textStyle: { color: '#94A3B8', fontSize: 11 },
          format: "#'%'"
        },
        vAxis: {
          gridlines: { color: 'transparent' },
          baselineColor: 'transparent',
          textStyle: { color: '#CBD5E1', fontSize: 12 }
        },
        backgroundColor: 'transparent',
        bar: { groupWidth: '64%' },
        tooltip: {
          isHtml: true,
          textStyle: { fontSize: 12 },
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
          if (fill && (fill.toLowerCase() === '#38bdf8' || fill.toLowerCase() === '#60a5fa')) {
            rect.setAttribute('rx', '8');
            rect.setAttribute('ry', '8');
            rect.style.filter = 'drop-shadow(0 0 8px rgba(56,189,248,0.60)) drop-shadow(0 0 16px rgba(56,189,248,0.30))';
          }
        }

        const texts = chartDiv.getElementsByTagName('text');
        for (let i = 0; i < texts.length; i++) {
          const t = texts[i];
          const fill = t.getAttribute('fill');
          if (fill && (fill.toLowerCase() === '#ffffff' || fill.toLowerCase() === '#fff')) {
            t.style.filter = 'drop-shadow(0 0 6px rgba(56,189,248,0.18))';
          }
        }
      }, 120);
    }

    function renderResumoTable(items) {
      var tbody = document.getElementById('tableResumoBody');
      tbody.innerHTML = '';

      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty" style="color:#94A3B8;">Sem dados disponíveis</td></tr>';
        return;
      }

      items.forEach(function(item) {
        var tr = document.createElement('tr');
        const detalhes = (item.detalhes || []).map(function(d) {
          return d.destino + ': ' + formatNumber(d.volumes) + ' vol | ' + formatDecimal(d.m3) + ' m³';
        }).join('\n');
        const detalhesHtml = modoSelecionado === 'internacional' && item.detalhes && item.detalhes.length > 1
          ? '<div class="detail-stack">' + item.detalhes.map(function(d) {
              return '<span class="detail-pill">' + escapeHtml(d.destino) + ': <b>' + formatDecimal(d.m3) + ' m³</b></span>';
            }).join('') + '</div>'
          : '';
        tr.title = detalhes;
        tr.innerHTML =
          '<td class="font-semibold">' + escapeHtml(item.destino) + detalhesHtml + '</td>' +
          '<td class="text-right font-semibold">' + formatPercent(item.representatividade) + '</td>' +
          '<td class="text-right">' + formatNumber(item.volumes) + '</td>' +
          '<td class="text-right">' + formatNumber(item.kg) + '</td>' +
          '<td class="text-right">' + formatDecimal(item.m3) + '</td>' +
          '<td class="text-right">' + formatNumber(item.pecas) + '</td>';
        tbody.appendChild(tr);
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
      if (percent <= 30) {
        return { className: 'low', label: 'Baixo nível', color: '#EF4444' };
      }
      if (percent <= 60) {
        return { className: 'medium', label: 'Em atenção', color: '#FACC15' };
      }
      return { className: 'high', label: 'Bom avanço', color: '#22C55E' };
    }

    function buildMetaDetalhesTooltip(item) {
      if (!item.detalhes || item.detalhes.length <= 1) return '';

      return '<div class="tooltip-section-title">Detalhe por destino</div>' +
        item.detalhes.map(function(d) {
          return '<div class="tooltip-row">' +
            '<span class="tooltip-label">' + escapeHtml(d.destino) + '</span>' +
            '<span class="tooltip-value">' + formatDecimal(d.real) + ' / ' + formatDecimal(d.meta) + ' m³ · ' + formatDecimal(d.percentual) + '%</span>' +
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
        const status = getStatusMeta(percent);

        const marker25 = 25;
        const marker50 = 50;
        const marker75 = 75;
        const transportLeft = percentBar < 6 ? 6 : percentBar > 98 ? 98 : percentBar;

        const div = document.createElement('div');
        div.className = 'meta-item';

        div.innerHTML =
          '<div class="meta-top">' +
            '<div class="meta-label"><span class="meta-flag">' + flag + '</span><span>' + escapeHtml(item.destino) + '</span></div>' +
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
      const alertas = items.filter(function(item) {
        return item.percentual >= 90 && item.percentual < 100;
      });

      if (!alertas.length) return;

      const nomes = alertas.map(function(item) {
        return escapeHtml(item.destino);
      });

      let mensagem = '';

      if (nomes.length === 1) {
        mensagem = '⚠️ Atenção: a carga de <b>' + nomes[0] + '</b> está prestes a fechar. Fique atento.';
      } else {
        mensagem = '⚠️ Atenção: as cargas de <b>' + nomes.join(', ') + '</b> estão prestes a fechar. Fique atento.';
      }

      showAlertToast(mensagem);
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
