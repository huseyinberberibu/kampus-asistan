(function () {
  const page = document.querySelector("[data-grades]");
  if (!page) return;

  const DEFAULT_SCALE = [
    { letter: "AA", min: 90, gpa: "4.00", label: "Pekiyi", tone: "aa" },
    { letter: "BA", min: 85, gpa: "3.50", label: "İyi-üstü", tone: "ba" },
    { letter: "BB", min: 80, gpa: "3.00", label: "İyi", tone: "bb" },
    { letter: "CB", min: 75, gpa: "2.50", label: "Orta-üstü", tone: "cb" },
    { letter: "CC", min: 70, gpa: "2.00", label: "Orta", tone: "cc" },
    { letter: "DC", min: 65, gpa: "1.50", label: "Geçer", tone: "dc" },
    { letter: "DD", min: 60, gpa: "1.00", label: "Koşullu geçer", tone: "dd" },
    { letter: "FD", min: 50, gpa: "0.50", label: "Başarısız", tone: "fd" },
    { letter: "FF", min: 0, gpa: "0.00", label: "Başarısız", tone: "ff" }
  ];

  const scaleMount = document.querySelector("[data-scale]");
  scaleMount.innerHTML = DEFAULT_SCALE.map(function (row) {
    return (
      '<label class="scale-row tone-' + row.tone + '">' +
        '<span class="scale-badge">' + row.letter + "</span>" +
        '<span class="scale-copy">' +
          '<span class="scale-copy-top"><strong>' + row.label + '</strong><span class="scale-gpa">' + row.gpa + "</span></span>" +
          '<span class="scale-range" data-range="' + row.letter + '"></span>' +
          '<span class="scale-bar"><i data-bar="' + row.letter + '"></i></span>' +
        "</span>" +
        '<span class="scale-input">' +
          "<small>Alt sınır</small>" +
          '<input type="number" min="0" max="100" step="1" value="' + row.min + '" data-letter="' + row.letter + '">' +
        "</span>" +
      "</label>"
    );
  }).join("");

  function refreshRanges() {
    const rows = DEFAULT_SCALE.map(function (row) {
      const input = scaleMount.querySelector('input[data-letter="' + row.letter + '"]');
      return { letter: row.letter, min: Number(input.value) };
    });
    rows.forEach(function (row, i) {
      const next = rows[i - 1];
      const max = i === 0 ? 100 : Math.max(row.min, next.min - 1);
      const text = i === 0 ? row.min + " – 100" : (row.min >= next.min ? row.min + "+" : row.min + " – " + max);
      const rangeEl = scaleMount.querySelector('[data-range="' + row.letter + '"]');
      const barEl = scaleMount.querySelector('[data-bar="' + row.letter + '"]');
      if (rangeEl) rangeEl.textContent = text;
      if (barEl) barEl.style.width = Math.max(8, Math.min(100, row.min)) + "%";
    });
  }

  scaleMount.addEventListener("input", function () {
    refreshRanges();
    paintTargetResult();
    paintAvgResult();
  });
  refreshRanges();

  function readScale() {
    return Array.from(scaleMount.querySelectorAll("input")).map(function (input) {
      return { letter: input.dataset.letter, min: Number(input.value) };
    }).sort(function (a, b) { return b.min - a.min; });
  }

  function letterFor(score) {
    const scale = readScale();
    for (let i = 0; i < scale.length; i++) {
      if (score + 1e-9 >= scale[i].min) return scale[i].letter;
    }
    return "FF";
  }

  function num(selector) {
    return Number(document.querySelector(selector).value);
  }

  function metaFor(letter) {
    return DEFAULT_SCALE.find(function (row) { return row.letter === letter; }) || DEFAULT_SCALE[DEFAULT_SCALE.length - 1];
  }

  function rangeFor(letter) {
    const rows = readScale();
    const i = rows.findIndex(function (row) { return row.letter === letter; });
    if (i < 0) return "";
    const min = rows[i].min;
    if (i === 0) return min + " – 100";
    if (min >= rows[i - 1].min) return min + "+";
    return min + " – " + Math.max(min, rows[i - 1].min - 1);
  }

  function ladderHtml(active) {
    return '<div class="avg-ladder">' + DEFAULT_SCALE.map(function (row) {
      const on = row.letter === active ? " is-on" : "";
      return '<span class="avg-ladder-dot' + on + '" data-tone="' + row.tone + '">' + row.letter + "</span>";
    }).join("") + "</div>";
  }

  function paintAvgResult() {
    const out = document.querySelector("[data-avg-result]");
    const midterm = num("#avg-midterm");
    const final = num("#avg-final");
    const midPct = num("#avg-mid-w");
    const finPct = num("#avg-fin-w");
    const midW = midPct / 100;
    const finW = finPct / 100;

    if ([midterm, final, midPct, finPct].some(function (n) { return Number.isNaN(n); })) {
      return;
    }

    if (Math.abs(midW + finW - 1) > 0.001) {
      out.className = "avg-result is-warn";
      out.innerHTML =
        '<span class="avg-result-badge">!</span>' +
        "<div><strong>Yüzdeler %100 olmalı</strong><p>Vize ve final ağırlıklarının toplamını kontrol et.</p></div>";
      return;
    }

    const avg = midterm * midW + final * finW;
    const letter = letterFor(avg);
    const row = metaFor(letter);
    const midShare = midterm * midW;
    const finShare = final * finW;

    out.className = "avg-result tone-" + row.tone;
    out.innerHTML =
      '<span class="avg-result-badge">' + letter + "</span>" +
      "<div>" +
        '<p class="avg-kicker">Dönem sonu ortalaması</p>' +
        '<div class="avg-copy-top">' +
          "<strong>" + row.label + "</strong>" +
          '<span class="scale-gpa">' + row.gpa + " / 4.00</span>" +
        "</div>" +
        '<div class="result-value">' + avg.toFixed(1) + "</div>" +
        '<span class="scale-range">' + rangeFor(letter) + " aralığı</span>" +
        '<span class="scale-bar"><i style="width:' + Math.max(8, Math.min(100, avg)) + '%"></i></span>' +
        '<p class="avg-formula">' + midterm + " × %" + midPct + " + " + final + " × %" + finPct + " = " + avg.toFixed(1) + "</p>" +
        '<div class="avg-split">' +
          "<span><small>Vize katkısı</small><strong>" + midShare.toFixed(1) + "</strong></span>" +
          "<span><small>Final katkısı</small><strong>" + finShare.toFixed(1) + "</strong></span>" +
        "</div>" +
        ladderHtml(letter) +
      "</div>";
  }

  function paintTargetResult() {
    const out = document.querySelector("[data-target-result]");
    const midterm = num("#target-midterm");
    const midPct = num("#target-mid-w");
    const finPct = num("#target-fin-w");
    const midW = midPct / 100;
    const finW = finPct / 100;
    const wanted = document.querySelector("#target-letter").value;
    const row = metaFor(wanted);

    if ([midterm, midPct, finPct].some(function (n) { return Number.isNaN(n); })) {
      return;
    }

    if (Math.abs(midW + finW - 1) > 0.001) {
      out.className = "avg-result is-warn";
      out.innerHTML =
        '<span class="avg-result-badge">!</span>' +
        "<div><strong>Yüzdeler %100 olmalı</strong><p>Vize ve final ağırlıklarının toplamını kontrol et.</p></div>";
      return;
    }

    const minScore = readScale().find(function (item) { return item.letter === wanted; }).min;
    const needed = (minScore - midterm * midW) / finW;
    const midShare = midterm * midW;

    let value;
    let message;
    let barWidth;
    let toneClass = "avg-result tone-" + row.tone;

    if (needed > 100) {
      value = Math.ceil(needed * 10) / 10;
      message = wanted + " için finalden 100 almak bile yetmez. Hedefi düşürmeyi veya ağırlıkları kontrol etmeyi dene.";
      barWidth = 100;
      toneClass = "avg-result is-warn";
    } else if (needed <= 0) {
      value = "0";
      message = "Finalden 0 alsan bile " + wanted + " harfini korursun. Mevcut vize yeterli.";
      barWidth = 8;
    } else {
      value = Math.ceil(needed * 10) / 10;
      message = wanted + " için finalden en az bu notu alman gerekiyor.";
      barWidth = Math.max(8, Math.min(100, Number(value)));
    }

    out.className = toneClass;
    out.innerHTML =
      '<span class="avg-result-badge">' + wanted + "</span>" +
      "<div>" +
        '<p class="avg-kicker">Gerekli final notu</p>' +
        '<div class="avg-copy-top">' +
          "<strong>" + row.label + "</strong>" +
          '<span class="scale-gpa">' + row.gpa + " / 4.00</span>" +
        "</div>" +
        '<div class="result-value">' + value + "</div>" +
        '<span class="scale-range">Hedef ' + rangeFor(wanted) + "</span>" +
        '<span class="scale-bar"><i style="width:' + barWidth + '%"></i></span>' +
        '<p class="avg-formula">' + message + "</p>" +
        '<div class="avg-split">' +
          "<span><small>Vize katkısı</small><strong>" + midShare.toFixed(1) + "</strong></span>" +
          "<span><small>Hedef ortalama</small><strong>" + minScore + "</strong></span>" +
        "</div>" +
        ladderHtml(wanted) +
      "</div>";
  }

  const targetForm = document.querySelector("[data-target-form]");
  targetForm.addEventListener("submit", function (event) {
    event.preventDefault();
    paintTargetResult();
  });
  targetForm.addEventListener("input", paintTargetResult);
  targetForm.addEventListener("change", paintTargetResult);

  const avgForm = document.querySelector("[data-avg-form]");
  avgForm.addEventListener("submit", function (event) {
    event.preventDefault();
    paintAvgResult();
  });
  avgForm.addEventListener("input", paintAvgResult);
  paintTargetResult();
  paintAvgResult();
})();
