// Entschlüsselt den Wichtelpartner und inszeniert das Auspacken.
(function () {
  "use strict";

  // ---------- Mini-SHA-256 (funktioniert auch ohne https / file://) ----------
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var len = bytes.length;
    var total = ((len + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 0x80;
    var bits = len * 8;
    m[total - 4] = (bits >>> 24) & 0xff;
    m[total - 3] = (bits >>> 16) & 0xff;
    m[total - 2] = (bits >>> 8) & 0xff;
    m[total - 1] = bits & 0xff;
    var w = new Array(64);
    for (var off = 0; off < total; off += 64) {
      for (var i = 0; i < 16; i++) {
        w[i] = (m[off + i * 4] << 24) | (m[off + i * 4 + 1] << 16) | (m[off + i * 4 + 2] << 8) | m[off + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var a0 = w[i - 15], a1 = w[i - 2];
        var s0 = ((a0 >>> 7) | (a0 << 25)) ^ ((a0 >>> 18) | (a0 << 14)) ^ (a0 >>> 3);
        var s1 = ((a1 >>> 17) | (a1 << 15)) ^ ((a1 >>> 19) | (a1 << 13)) ^ (a1 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      out[i * 4] = (H[i] >>> 24) & 0xff;
      out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
      out[i * 4 + 3] = H[i] & 0xff;
    }
    return out;
  }

  function b64ToBytes(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function concat() {
    var n = 0, i;
    for (i = 0; i < arguments.length; i++) n += arguments[i].length;
    var out = new Uint8Array(n), p = 0;
    for (i = 0; i < arguments.length; i++) { out.set(arguments[i], p); p += arguments[i].length; }
    return out;
  }

  function decrypt(keyB64, nonceB64, cipherB64) {
    var key = b64ToBytes(keyB64);
    var nonce = b64ToBytes(nonceB64);
    var cipher = b64ToBytes(cipherB64);
    var plain = new Uint8Array(cipher.length);
    for (var block = 0; block * 32 < cipher.length; block++) {
      var ctr = new Uint8Array([(block >>> 24) & 255, (block >>> 16) & 255, (block >>> 8) & 255, block & 255]);
      var ks = sha256(concat(key, nonce, ctr));
      for (var j = 0; j < 32 && block * 32 + j < cipher.length; j++) {
        plain[block * 32 + j] = cipher[block * 32 + j] ^ ks[j];
      }
    }
    var text = new TextDecoder().decode(plain);
    if (text.indexOf("WICHTEL:") !== 0) return null;
    return text.slice(8);
  }

  // ---------- Texte (Deutsch / Englisch je nach <html lang>) ----------
  var EN = (document.documentElement.lang || "").indexOf("en") === 0;
  var T = EN ? {
    badKey: "Hmm, this link doesn't look quite right. Please open exactly the link you were sent – including everything after the #.",
    noKey: "This link is incomplete. Please open exactly the link you were sent – including everything after the #.",
    soundOn: "🔔 Sound on", soundOff: "🔕 Sound off",
    shake: ["Shake it again… something's jingling in there! 🔔", "Almost! Shake it one last time! 🤩"],
    missions: [
      "Secret mission: wrap your gift so nobody can guess who it's from. 🕵️",
      "Bonus points for a handwritten card with a little Christmas rhyme! ✍️",
      "Tip: quietly listen for what they'd love to get – but don't give it away! 👂",
      "Bonus mission: make the wrapping so festive it's almost too pretty to open. ✨",
      "Cookie rule: whoever listens to Christmas music while shopping finds the better gift. 🎶"
    ],
    drum: "Drumroll… 🥁",
    decided: "Santa has made his choice …",
    notMe: function (n) { return "No problem! Then leave this gift for " + n + ". 😉"; }
  } : {
    badKey: "Hmm, dieser Link scheint nicht ganz zu stimmen. Öffne bitte genau den Link, den du bekommen hast – inklusive allem nach dem #.",
    noKey: "Der Link ist unvollständig. Öffne bitte genau den Link, den du bekommen hast – inklusive allem nach dem #.",
    soundOn: "🔔 Ton an", soundOff: "🔕 Ton aus",
    shake: ["Schüttel es nochmal… da klimpert was! 🔔", "Fast! Noch ein letztes Mal schütteln! 🤩"],
    missions: [
      "Geheime Mission: Verpacke dein Geschenk so, dass niemand errät, von wem es ist. 🕵️",
      "Extra-Punkte für eine selbstgeschriebene Karte mit einem kleinen Weihnachtsreim! ✍️",
      "Tipp: Hör mal unauffällig zu, was sich die Person wünscht – aber nicht verraten! 👂",
      "Bonus-Mission: Mach das Geschenkpapier so festlich, dass es fast zu schade zum Auspacken ist. ✨",
      "Plätzchen-Regel: Wer beim Aussuchen Weihnachtsmusik hört, findet das bessere Geschenk. 🎶"
    ],
    drum: "Trommelwirbel… 🥁",
    decided: "Das Christkind hat entschieden …",
    notMe: function (n) { return "Kein Problem! Dann lass das Geschenk lieber für " + n + " liegen. 😉"; }
  };

  // ---------- Elemente ----------
  var data = window.WICHTEL || {};
  var $ = function (id) { return document.getElementById(id); };
  var gift = $("gift"), hint = $("hint"), confirmBox = $("confirm"), reveal = $("reveal");
  var revealName = $("revealName"), errorBox = $("error"), lead = $("lead"), mission = $("mission");
  var soundBtn = $("sound");

  var key = (location.hash || "").replace(/^#/, "");
  var receiver = null;
  try { receiver = key ? decrypt(key, data.nonce, data.cipher) : null; } catch (e) { receiver = null; }

  if (!receiver) {
    gift.disabled = true;
    gift.classList.add("is-locked");
    hint.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = key
      ? T.badKey
      : T.noKey;
    return;
  }

  // ---------- Sound (Glöckchen per Web Audio) ----------
  var soundOn = true;
  var audioCtx = null;
  function ctx() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function bell(freq, start, dur, vol) {
    var ac = ctx();
    if (!ac || !soundOn) return;
    var t = ac.currentTime + start;
    [1, 2.01, 3.02].forEach(function (mult, i) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((vol || 0.18) / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  function jingle() {
    // Jingle Bells (traditionell, gemeinfrei) – der Refrain-Anfang
    var E = 659.25, G = 783.99, C = 523.25, D = 587.33, F = 698.46;
    var notes = [
      [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2],
      [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4],
      [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5],
      [E, 1], [D, 1], [D, 1], [E, 1], [D, 2], [G, 2]
    ];
    var beat = 0.2, t = 0;
    notes.forEach(function (n) { bell(n[0], t, Math.max(0.35, n[1] * beat * 1.6), 0.14); t += n[1] * beat; });
  }

  function shakeSound(level) {
    bell(880 + level * 220, 0, 0.25, 0.08);
    bell(1320 + level * 220, 0.06, 0.25, 0.06);
  }

  function drumroll(ms) {
    var ac = ctx();
    if (!ac || !soundOn) return;
    var len = ms / 1000;
    var buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) {
      var pulse = Math.abs(Math.sin((i / ac.sampleRate) * Math.PI * 28));
      d[i] = (Math.random() * 2 - 1) * pulse * (0.3 + 0.7 * (i / d.length));
    }
    var src = ac.createBufferSource();
    var f = ac.createBiquadFilter();
    var g = ac.createGain();
    f.type = "lowpass"; f.frequency.value = 900;
    g.gain.value = 0.25;
    src.buffer = buf;
    src.connect(f).connect(g).connect(ac.destination);
    src.start();
  }

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      soundBtn.setAttribute("aria-pressed", String(soundOn));
      soundBtn.textContent = soundOn ? T.soundOn : T.soundOff;
      if (soundOn) bell(1046.5, 0, 0.5, 0.12);
    });
  }

  function buzz(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* iOS kann nicht vibrieren */ }
  }

  // ---------- Konfetti ----------
  var bits = ["❄️", "⭐", "🎄", "🎁", "✨", "🔔", "🍪", "❤️", "🦌", "🎅"];
  function burst(count) {
    var r = gift.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < count; i++) {
      var s = document.createElement("span");
      s.className = "spark";
      s.setAttribute("aria-hidden", "true");
      s.textContent = bits[(Math.random() * bits.length) | 0];
      var ang = Math.random() * Math.PI * 2;
      var dist = 120 + Math.random() * 260;
      s.style.left = cx + "px";
      s.style.top = cy + "px";
      s.style.fontSize = (14 + Math.random() * 22) + "px";
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", Math.sin(ang) * dist - 80 + "px");
      s.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      s.style.animationDelay = Math.random() * 0.25 + "s";
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }, 2000, s);
    }
  }

  // ---------- Ablauf: schütteln → bestätigen → Trommelwirbel → öffnen ----------
  var shakes = 0;
  var needed = 3;
  var shakeTexts = T.shake;
  var missions = T.missions;

  function openGift() {
    confirmBox.hidden = true;
    hint.hidden = false;
    hint.classList.add("drum");
    hint.textContent = T.drum;
    gift.classList.add("is-rumble");
    drumroll(1600);
    setTimeout(function () {
      gift.classList.remove("is-rumble");
      gift.classList.add("is-open");
      buzz([80, 60, 160]);
      burst(60);
      jingle();
      setTimeout(function () {
        gift.classList.add("is-gone");
        revealName.textContent = receiver;
        reveal.hidden = false;
        hint.hidden = true;
        lead.textContent = T.decided;
        if (mission) {
          mission.textContent = missions[(Math.random() * missions.length) | 0];
          mission.hidden = false;
        }
        document.body.classList.add("celebrate");
        // Auf dem Handy den Namen ins Bild holen
        try { reveal.parentNode.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { reveal.parentNode.scrollIntoView(); }
        setTimeout(function () { burst(30); }, 500);
      }, 650);
    }, 1600);
  }

  gift.addEventListener("click", function () {
    if (gift.classList.contains("is-open") || !confirmBox.hidden) return;
    ctx();
    shakes++;
    gift.classList.remove("shake-1", "shake-2", "shake-3");
    void gift.offsetWidth; // Animation neu starten
    gift.classList.add("shake-" + Math.min(shakes, 3));
    shakeSound(shakes);
    buzz(40 + shakes * 40);
    if (shakes < needed) {
      hint.textContent = shakeTexts[shakes - 1];
      return;
    }
    hint.hidden = true;
    confirmBox.hidden = false;
    $("confirmYes").focus({ preventScroll: true });
    try { confirmBox.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { /* egal */ }
  });

  $("confirmYes").addEventListener("click", openGift);
  $("confirmNo").addEventListener("click", function () {
    confirmBox.hidden = true;
    hint.hidden = false;
    shakes = 0;
    hint.textContent = T.notMe(data.giver);
  });
})();
