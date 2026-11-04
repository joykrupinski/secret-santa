// Leise rieselnder Schnee im Hintergrund
(function () {
  var canvas = document.getElementById("snow");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  // Bewusst immer animiert (auch auf Handys mit "Bewegung reduzieren"), nur etwas langsamer
  var reduce = false;
  var slow = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.5 : 1;
  var flakes = [];
  var w, h, dpr;

  var lastW = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var widthChanged = window.innerWidth !== lastW;
    lastW = window.innerWidth;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Auf dem Handy feuert "resize" beim Scrollen (Adressleiste) – dann Schnee nicht neu starten
    if (!widthChanged && flakes.length) return;
    var count = Math.max(50, Math.min(160, Math.round((w * h) / 9000)));
    flakes = [];
    for (var i = 0; i < count; i++) flakes.push(make(true));
  }

  function make(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: Math.random() * 2.6 + 0.8,
      s: Math.random() * 0.8 + 0.3,
      drift: Math.random() * Math.PI * 2,
      o: Math.random() * 0.5 + 0.4
    };
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + f.o + ")";
      ctx.fill();
      if (!reduce) {
        f.drift += 0.01;
        f.y += f.s * slow;
        f.x += Math.sin(f.drift) * 0.4;
        if (f.y > h + 10) flakes[i] = make(false);
      }
    }
    if (!reduce) requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();
