// Inicializar Sidenav y ScrollSpy
document.addEventListener('DOMContentLoaded', function() {
  const elems = document.querySelectorAll('.sidenav');
  M.Sidenav.init(elems);

  const spy = document.querySelectorAll('.scrollspy');
  M.ScrollSpy.init(spy, { scrollOffset: 100 });

  // Detectar scroll para cambiar navbar
  const navbar = document.querySelector('nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
});

// Declaración del gráfico global
let grafico = null;

async function calcularEnergia() {
  const lat = parseFloat(document.getElementById("lat").value);
  const lon = parseFloat(document.getElementById("lon").value);
  const potencia = parseFloat(document.getElementById("potencia").value); // en W
  const resultadoEl = document.getElementById("resultado");

  resultadoEl.innerHTML = "Consultando datos de la NASA......";

  if (isNaN(lat) || isNaN(lon) || isNaN(potencia)) {
    resultadoEl.innerHTML = "Por favor ingresa valores válidos para todos los campos.";
    return;
  }

 //Usamos un endpoint confiable (NASA POWER - climatología)
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Datos recibidos:", data);

    const radiacionMensual = data.properties.parameter.ALLSKY_SFC_SW_DWN;

    if (!radiacionMensual) {
      resultadoEl.innerHTML = "class=white-text No se encontraron datos de radiación para esta ubicación.";
      return;
    }

    let energiaTotalKWh = 0;
    const areaPanel = potencia / 1000 / 0.18;
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
      energiaTotalKWh += valor * 30 * areaPanel * 0.18;
    }

    resultadoEl.innerHTML = `
      <strong class="white-text">Radiación solar mensual promedio (NASA POWER - histórico):</strong><br>
      <strong class="white-text">Ubicación:</strong> Lat: ${lat}, Lon: ${lon}<br>
      <strong class="white-text">Potencia del panel:</strong> ${potencia} W<br><br>
      <strong class="white-text">Energía estimada generada en un año:</strong> ${energiaTotalKWh.toFixed(2)} kWh
    `;

    dibujarGraficoRadiacion(labels, valoresRadiacion);

  } catch (error) {
    console.error(" class= white-text Error capturado en catch:", error);
    resultadoEl.innerHTML = "Error al consultar los datos climáticos. Intenta nuevamente.";
  }
}

function dibujarGraficoRadiacion(meses, valores) {
  const ctx = document.getElementById('graficoRadiacion').getContext('2d');

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
        legend: {
          display: true
        },
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
          title: {
            display: true,
            text: 'kWh/m²/día'
          }
        }
      }
    }
  });
}

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
