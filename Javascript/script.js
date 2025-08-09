// ==========================
// Inicializar Sidenav y ScrollSpy
// ==========================
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.sidenav');
  if (elems.length) M.Sidenav.init(elems);

  const spy = document.querySelectorAll('.scrollspy');
  if (spy.length) M.ScrollSpy.init(spy, { scrollOffset: 100 });

  // Detectar scroll para cambiar navbar
  const navbar = document.querySelector('nav');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
});

// ==========================
// Gráfico de radiación por meses (NASA)
// ==========================
let grafico = null;

async function calcularEnergia() {
  const lat = parseFloat(document.getElementById("lat")?.value);
  const lon = parseFloat(document.getElementById("lon")?.value);
  const potencia = parseFloat(document.getElementById("potencia")?.value); // en W
  const resultadoEl = document.getElementById("resultado");

  if (!resultadoEl) return;

  resultadoEl.innerHTML = "Consultando datos de la NASA......";

  if (isNaN(lat) || isNaN(lon) || isNaN(potencia)) {
    resultadoEl.innerHTML = "Por favor ingresa valores válidos para todos los campos.";
    return;
  }

  // Endpoint NASA POWER - climatología
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Datos recibidos:", data);

    const radiacionMensual = data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;

    if (!radiacionMensual) {
      // Nota: el string anterior tenía "class=white-text" que no aplica como clase; lo muestro limpio
      resultadoEl.innerHTML = '<span class="white-text">No se encontraron datos de radiación para esta ubicación.</span>';
      return;
    }

    let energiaTotalKWh = 0;
    const areaPanel = potencia / 1000 / 0.18; // simplificación de área con eficiencia asumida
    const labels = [];
    const valoresRadiacion = [];

    const mesesOrden = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];

    for (let mes of mesesOrden) {
      const valor = radiacionMensual[mes];
      labels.push(mes);
      valoresRadiacion.push(valor);
      energiaTotalKWh += (valor * 30 * areaPanel * 0.18);
    }

    resultadoEl.innerHTML = `
      <strong>Radiación solar mensual promedio (NASA POWER - histórico):</strong><br>
      <strong>Ubicación:</strong> Lat: ${lat}, Lon: ${lon}<br>
      <strong>Potencia del panel:</strong> ${potencia} W<br><br>
      <strong>Energía estimada generada en un año:</strong> ${energiaTotalKWh.toFixed(2)} kWh
    `;

    dibujarGraficoRadiacion(labels, valoresRadiacion);

  } catch (error) {
    console.error("Error capturado en catch:", error);
    resultadoEl.innerHTML = "Error al consultar los datos climáticos. Intenta nuevamente.";
  }
}

function dibujarGraficoRadiacion(meses, valores) {
  const canvas = document.getElementById('graficoRadiacion');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (grafico) {
    grafico.destroy();
  }

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [{
        label: 'Radiación solar (kWh/m²/día)',
        data: valores,
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: 'rgba(255, 193, 7, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.raw.toFixed(2)} kWh/m²/día`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'kWh/m²/día' }
        }
      }
    }
  });
}

// ==========================
// Controles jingle (si existe el audio)
// ==========================
const audio = document.getElementById("jingle-audio");

function reproducirJingle() {
  if (!audio) {
    console.error("No se encontró el elemento de audio.");
    return;
  }
  if (audio.paused) {
    audio.play().catch(error => {
      console.error("Error al reproducir:", error);
    });
  } else {
    audio.pause();
  }
}

function detenerJingle() {
  if (!audio) {
    console.error("No se encontró el elemento de audio.");
    return;
  }
  if (!audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// ==========================
// Lector CSV + Top países (TWh)
// ==========================
let datosOriginales = []; // Almacena los datos cargados del CSV
let graficoTop = null;    // Referencia al gráfico actual para poder destruirlo si se actualiza

// Cabeceras esperadas
const columnas = [
  'Continent',
  'Entity',
  'Code',
  'Year',
  'Geo Biomass Other - TWh',
  'Solar Generation - TWh',
  'Wind Generation - TWh',
  'Hydro Generation - TWh'
];

const colores = [
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 206, 86, 0.6)',
  'rgba(75, 192, 192, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)'
];

// Cargar archivo CSV (si existe el input en la página)
const inputArchivo = document.getElementById('inputArchivo');
if (inputArchivo) {
  inputArchivo.addEventListener('change', function (e) {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function (event) {
      const contenido = event.target.result;
      procesarCSV(contenido);
    };
    lector.readAsText(archivo);
  });
}

function procesarCSV(texto) {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
  const delimitador = texto.includes(';') ? ';' : ',';
  const cabeceras = lineas[0].split(delimitador).map(c => c.trim());

  const validas = columnas.every(c => cabeceras.includes(c));
  if (!validas) {
    alert('❌ Cabeceras inválidas. Se esperaban: ' + columnas.join(', '));
    return;
  }

  datosOriginales = lineas.slice(1).map(linea => {
    const partes = linea.split(delimitador);
    const obj = {};
    cabeceras.forEach((c, i) => obj[c] = partes[i]?.trim());
    return obj;
  });

  actualizarCabecerasTabla();
  poblarFiltros();
  aplicarFiltros();
}

// Poblar filtros dinámicos (si están en la página)
function poblarFiltros() {
  const continentes = [...new Set(datosOriginales.map(d => d['Continent']))].sort();
  const años = [...new Set(datosOriginales.map(d => d['Year']))].sort();
  const entidades = [...new Set(datosOriginales.map(d => d['Entity']))].sort();

  llenarSelect('comboContinente', continentes);
  llenarSelect('comboAnio', años);
  llenarSelect('comboPais', entidades);
  llenarSelect('comboFuente', columnas.slice(4));
}

function llenarSelect(id, opciones) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '<option value="">-- Todos --</option>';
  opciones.forEach(op => {
    const opt = document.createElement('option');
    opt.value = op;
    opt.textContent = op.replace(' - TWh', '');
    select.appendChild(opt);
  });
}

// Aplicar filtros y actualizar tabla + gráfico
function aplicarFiltros() {
  if (!datosOriginales.length) return;

  const continente = document.getElementById('comboContinente')?.value || '';
  const año = document.getElementById('comboAnio')?.value || '';
  const entidad = document.getElementById('comboPais')?.value || '';
  const fuente = document.getElementById('comboFuente')?.value || 'Solar Generation - TWh';
  const topN = parseInt(document.getElementById('comboTop')?.value) || 10;

  let filtrados = datosOriginales.filter(d => {
    return (!continente || d['Continent'] === continente) &&
           (!año || d['Year'] === año) &&
           (!entidad || d['Entity'] === entidad);
  });

  filtrados.sort((a, b) => {
    const valA = parseFloat((a[fuente] ?? '').replace(',', '.')) || 0;
    const valB = parseFloat((b[fuente] ?? '').replace(',', '.')) || 0;
    return valB - valA;
  });

  const datosTop = filtrados.slice(0, topN);

  actualizarTabla(datosTop);
  actualizarGrafico(datosTop, fuente);
}

// Actualizar tabla
function actualizarTabla(datos) {
  const cuerpo = document.getElementById('tablaDatos');
  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  datos.forEach(d => {
    const fila = document.createElement('tr');
    fila.innerHTML = columnas
      .map(c => `<td style="text-align: right;">${d[c] ?? ''}</td>`)
      .join('');
    cuerpo.appendChild(fila);
  });
}

// Cabeceras de tabla
function actualizarCabecerasTabla() {
  const cabecera = document.getElementById('cabeceraTabla');
  if (!cabecera) return;
  cabecera.innerHTML = columnas
    .map(c => `<th style="color:green;">${c}</th>`)
    .join('');
}

// Gráfico Top por fuente (Chart.js)
function actualizarGrafico(datos, fuente) {
  const canvas = document.getElementById('graficoTop');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const entidades = datos.map(d => d['Entity']);
  const valores = datos.map(d => {
    const raw = d[fuente] ?? '';
    const limpio = typeof raw === 'string' ? raw.replace(',', '.') : raw;
    return parseFloat(limpio) || 0;
  });

  if (graficoTop) graficoTop.destroy();

  const backgroundColors = valores.map((_, i) => colores[i % colores.length]);

  graficoTop = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: entidades,
      datasets: [{
        label: `${fuente.replace(' - TWh', '')} (TWh)`,
        data: valores,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `Top Países por ${fuente.replace(' - TWh', '')}`
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Países', color: '#333', font: { size: 16, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Tera Vatios Hora (TWh)', color: '#333', font: { size: 16, weight: 'bold' } }
        }
      }
    }
  });
}

// Listeners de filtros (solo si existen)
['comboContinente', 'comboAnio', 'comboPais', 'comboTop', 'comboFuente'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', aplicarFiltros);
});
