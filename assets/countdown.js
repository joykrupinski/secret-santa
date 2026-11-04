// Countdown bis Heiligabend
(function () {
  var el = document.getElementById("countdown");
  if (!el) return;

  var EN = (document.documentElement.lang || "").indexOf("en") === 0;
  var L = EN
    ? { xmas: "🎉 It's Christmas! Merry Christmas! 🎉", until: "Countdown to Christmas Eve", d: "Days", h: "Hrs", m: "Min", s: "Sec" }
    : { xmas: "🎉 Es ist Weihnachten! Frohes Fest! 🎉", until: "Noch bis Heiligabend", d: "Tage", h: "Std", m: "Min", s: "Sek" };

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function tick() {
    var now = new Date();
    var year = now.getFullYear();
    var target = new Date(year, 11, 24, 18, 0, 0); // 24.12., 18 Uhr
    if (now > new Date(year, 11, 26, 23, 59, 59)) target = new Date(year + 1, 11, 24, 18, 0, 0);
    var diff = target - now;

    if (diff <= 0) {
      el.innerHTML = '<p class="cd-title">' + L.xmas + '</p>';
      return;
    }
    var d = Math.floor(diff / 864e5);
    var h = Math.floor((diff % 864e5) / 36e5);
    var m = Math.floor((diff % 36e5) / 6e4);
    var s = Math.floor((diff % 6e4) / 1e3);
    el.innerHTML =
      '<p class="cd-title">' + L.until + '</p>' +
      '<div class="cd-grid">' +
      '<div><b>' + d + '</b><span>' + L.d + '</span></div>' +
      '<div><b>' + pad(h) + '</b><span>' + L.h + '</span></div>' +
      '<div><b>' + pad(m) + '</b><span>' + L.m + '</span></div>' +
      '<div><b>' + pad(s) + '</b><span>' + L.s + '</span></div>' +
      '</div>';
  }

  tick();
  setInterval(tick, 1000);
})();
