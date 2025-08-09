document.addEventListener('DOMContentLoaded', function () {
  // Inicializa el slider de Materialize para la sección Proyectos
  const sliders = document.querySelectorAll('.slider');
  M.Slider.init(sliders, {
    indicators: true,
    height: 520,      // igual que en el CSS
    duration: 600,    // velocidad de la animación
    interval: 4000    // tiempo entre slides (ms)
  });
});