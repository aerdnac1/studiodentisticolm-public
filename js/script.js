function activateMap(consentBox, iframe) {
  iframe.src = consentBox.dataset.src;
  consentBox.classList.add('map-hidden');
  iframe.classList.remove('map-hidden');
}

// Carica la mappa Google Maps e salva il consenso in localStorage
function loadMap(btn) {
  const consentBox = document.getElementById('mapConsentBox');
  const iframe = document.getElementById('mapIframe');
  if (!consentBox || !iframe) return;

  activateMap(consentBox, iframe);
  localStorage.setItem('maps_consent', '1');
}

// Revoca del consenso Google Maps:
// 1. Rimuove il consenso dal localStorage (dato tecnico del sito)
// 2. Interrompe immediatamente la connessione con Google svuotando l'iframe
// Nota: i cookie già impostati da Google non possono essere rimossi via JS
//       (appartengono al dominio google.com - Same-Origin Policy)
function resetPrivacy() {
  localStorage.removeItem('maps_consent');

  var iframe = document.getElementById('mapIframe');
  if (iframe) {
    iframe.src = ''; // interrompe subito la connessione con Google
  }

  location.reload();
}

// Carosello multi-item: 1 item alla volta, loop infinito.
// Tecnica standard: clona `visible` item dalla fine (prepend) e dall'inizio (append).
// Al termine della transizione, se siamo nella zona cloni, torna istantaneamente
// alla posizione reale equivalente (contenuto identico → nessun flash).
function initMultiCarousel(el) {
  var visible = parseInt(el.dataset.mcVisible, 10) || 1;
  var interval = parseInt(el.dataset.mcInterval, 10) || 3000;
  var track = el.querySelector('.mc-track');
  if (!track) return;

  var items = Array.from(track.querySelectorAll('.mc-item'));
  var n = items.length;
  if (n <= visible) return;

  el.style.setProperty('--mc-visible', visible);

  // Prepend: cloni degli ultimi `visible` item in ordine corretto (non invertito).
  // Usando DocumentFragment si preserva la sequenza: items[n-v], ..., items[n-1]
  // così pos=visible-1 mostra correttamente items[n-1] come primo elemento a sinistra.
  var backFrag = document.createDocumentFragment();
  items.slice(-visible).forEach(function (item) {
    var c = item.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    backFrag.appendChild(c);
  });
  track.insertBefore(backFrag, track.firstChild);

  // Append: cloni dei primi `visible` item
  items.slice(0, visible).forEach(function (item) {
    var c = item.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    track.appendChild(c);
  });

  var pos = visible; // indice del DOM item mostrato come primo a sinistra
  var sliding = false;
  var slideGuard = null;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setPos(p, animate) {
    track.style.transition = animate && !rm ? 'transform 0.45s ease-in-out' : 'none';
    track.style.transform = 'translateX(' + (-p * (100 / visible)) + '%)';
    pos = p;
    if (!animate || rm) sliding = false;
  }

  setPos(visible, false);

  track.addEventListener('transitionend', function (e) {
    // Filtra: solo l'evento transform del track stesso (non di figli con altri transition)
    if (e.target !== track || e.propertyName !== 'transform') return;

    clearTimeout(slideGuard); // transitionend scattato regolarmente: annulla il fallback

    // Wrap silenzioso: i contenuti ai bordi dei cloni sono identici agli originali,
    // quindi il salto è invisibile. Si legge offsetWidth per forzare il reflow
    // PRIMA che il browser componga il prossimo frame.
    if (pos < visible) {
      track.style.transition = 'none';
      pos += n;
      track.style.transform = 'translateX(' + (-pos * (100 / visible)) + '%)';
      track.offsetWidth; // flush layout sincrono, impedisce flash
    } else if (pos >= visible + n) {
      track.style.transition = 'none';
      pos -= n;
      track.style.transform = 'translateX(' + (-pos * (100 / visible)) + '%)';
      track.offsetWidth;
    }

    sliding = false;
  });

  function slide(dir) {
    if (el.offsetParent === null) { sliding = false; return; } // nascosto (breakpoint)
    if (sliding) return;
    sliding = true;
    setPos(pos + dir, true);
    // Fallback Safari: sblocca sliding se transitionend non scatta entro 600ms
    clearTimeout(slideGuard);
    slideGuard = setTimeout(function () { sliding = false; }, 600);
  }

  var prevBtn = el.querySelector('.mc-prev');
  var nextBtn = el.querySelector('.mc-next');
  if (prevBtn) prevBtn.addEventListener('click', function () { stopAutoplay(); slide(-1); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { stopAutoplay(); slide(1); startAutoplay(); });

  var timer = null;
  function startAutoplay() {
    if (rm) return;
    clearInterval(timer); // evita timer stacking su Safari (mouseleave multipli)
    timer = setInterval(function () {
      if (el.offsetParent === null) { sliding = false; return; }
      if (!sliding) slide(1);
    }, interval);
  }
  function stopAutoplay() { clearInterval(timer); timer = null; }

  el.addEventListener('mouseenter', stopAutoplay);
  el.addEventListener('mouseleave', startAutoplay);

  var touchStartX = 0;
  el.addEventListener('touchstart', function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchend', function (e) {
    var diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      stopAutoplay();
      slide(diff > 0 ? 1 : -1);
      startAutoplay();
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopAutoplay();
    } else {
      if (el.offsetParent !== null) startAutoplay();
    }
  });

  startAutoplay();
}

// Al caricamento: carica la mappa se il consenso era già stato dato
// e collega i listener (sostituisce gli onclick inline per rispettare la CSP)
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('maps_consent') === '1') {
    const consentBox = document.getElementById('mapConsentBox');
    const iframe = document.getElementById('mapIframe');
    if (consentBox && iframe) {
      activateMap(consentBox, iframe);
    }
  }

  const consentBtn = document.getElementById('mapConsentBtn');
  if (consentBtn) consentBtn.addEventListener('click', loadMap);

  const resetBtn = document.getElementById('resetPrivacyBtn');
  if (resetBtn) resetBtn.addEventListener('click', resetPrivacy);

  // Inizializza tutti i caroselli multi-item
  document.querySelectorAll('.mc-carousel').forEach(initMultiCarousel);
});
