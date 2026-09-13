/*
 * camera-fx.js — motor compartido de "cámara vieja" (Sala de juegos y
 * Dejá tu foto en la home usan el mismo código, no dos copias).
 *
 * Toma un <video> (con el stream de la cámara o nada), lo dibuja en un
 * canvas chico de verdad (no un filtro CSS sobre video HD), le agrega
 * ruido y algún glitch de franja, y lo escala pixelado a un canvas
 * visible a pocos FPS. Un tap/click sobre ese canvas visible cicla
 * NORMAL -> B&N -> SEPIA -> NORMAL.
 *
 * La interacción usa Pointer Events (pointerdown/pointerup) en vez de
 * "click" o "touchend" por separado: mouse, touch y pen terminan en el
 * mismo listener, así que no hay riesgo de que un tap dispare el efecto
 * dos veces (una por touch y otra por el click sintético que generan
 * los navegadores). Se tolera un poco de movimiento/tiempo para no
 * confundir un tap con un intento de scroll.
 */
function createCameraFx(config) {
  var video = config.video;
  var smallCanvas = config.smallCanvas;
  var dispCanvas = config.dispCanvas;
  var smallCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
  var dispCtx = dispCanvas.getContext('2d');

  var SMALL_W = smallCanvas.width;
  var SMALL_H = smallCanvas.height;
  var FILTERS = ['none', 'grayscale(1) contrast(1.1)', 'sepia(0.85) saturate(1.15)'];
  var FPS_MS = config.fps ? Math.round(1000 / config.fps) : 130; // ~7-8 fps a propósito

  var state = 0;
  var usingPlaceholder = true;
  var frameTimer = null;

  function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

  function drawPlaceholderFrame() {
    var imgData = smallCtx.createImageData(SMALL_W, SMALL_H);
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() * 55 + 35;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    smallCtx.putImageData(imgData, 0, 0);
  }

  function drawFrame() {
    if (!usingPlaceholder && video && video.readyState >= 2) {
      try {
        smallCtx.drawImage(video, 0, 0, SMALL_W, SMALL_H);
      } catch (e) {
        drawPlaceholderFrame();
      }
    } else {
      drawPlaceholderFrame();
    }

    // ruido digital sutil
    var imgData = smallCtx.getImageData(0, 0, SMALL_W, SMALL_H);
    var d = imgData.data;
    for (var i = 0; i < d.length; i += 4) {
      var n = (Math.random() - 0.5) * 24;
      d[i] = clamp(d[i] + n);
      d[i + 1] = clamp(d[i + 1] + n);
      d[i + 2] = clamp(d[i + 2] + n);
    }
    smallCtx.putImageData(imgData, 0, 0);

    // artefacto ocasional: una franja horizontal se corre un poco
    if (Math.random() < 0.08) {
      var row = Math.floor(Math.random() * (SMALL_H - 3));
      var shift = Math.round((Math.random() - 0.5) * 8);
      smallCtx.drawImage(smallCanvas, 0, row, SMALL_W, 2, shift, row, SMALL_W, 2);
    }

    dispCtx.imageSmoothingEnabled = false;
    dispCtx.filter = FILTERS[state];
    dispCtx.clearRect(0, 0, dispCanvas.width, dispCanvas.height);
    dispCtx.drawImage(smallCanvas, 0, 0, dispCanvas.width, dispCanvas.height);
    dispCtx.filter = 'none';
  }

  function start() {
    if (frameTimer) return;
    drawFrame();
    frameTimer = setInterval(drawFrame, FPS_MS);
  }

  function stop() {
    if (frameTimer) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
  }

  function setUsingPlaceholder(v) { usingPlaceholder = !!v; }
  function cycleFilter() { state = (state + 1) % FILTERS.length; }
  function getState() { return state; }
  function setState(s) { state = s % FILTERS.length; }
  function captureDataURL(type, quality) {
    return dispCanvas.toDataURL(type || 'image/jpeg', quality || 0.85);
  }

  // tap/click unificado sobre el canvas visible para ciclar el filtro
  function attachTapToCycle(onCycle) {
    var startX = 0, startY = 0, startT = 0, activeId = null;
    var MOVE_TOLERANCE = 14, TIME_TOLERANCE = 600;

    dispCanvas.style.touchAction = 'none';

    dispCanvas.addEventListener('pointerdown', function (e) {
      activeId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startT = Date.now();
    });

    function finish(e, isTap) {
      if (e.pointerId !== activeId) return;
      activeId = null;
      if (isTap) {
        cycleFilter();
        if (onCycle) onCycle(state);
      }
    }

    dispCanvas.addEventListener('pointerup', function (e) {
      var dx = e.clientX - startX, dy = e.clientY - startY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dt = Date.now() - startT;
      finish(e, dist <= MOVE_TOLERANCE && dt <= TIME_TOLERANCE);
    });

    dispCanvas.addEventListener('pointercancel', function (e) { finish(e, false); });
  }

  return {
    start: start,
    stop: stop,
    setUsingPlaceholder: setUsingPlaceholder,
    cycleFilter: cycleFilter,
    getState: getState,
    setState: setState,
    captureDataURL: captureDataURL,
    attachTapToCycle: attachTapToCycle,
    drawOnce: drawFrame
  };
}

/* pequeño sonido de obturador — Web Audio, sin archivo de audio.
   Se crea perezosamente en el primer uso (gesto del usuario) y no
   rompe nada si el navegador bloquea audio. */
function playShutterSound() {
  try {
    if (!playShutterSound._ctx) {
      playShutterSound._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    var ctx = playShutterSound._ctx;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  } catch (e) { /* audio bloqueado por el navegador: seguimos sin sonido */ }
}
