(function () {
  const page = document.querySelector("[data-grades]");
  if (!page) return;

  const DEFAULT_SCALE = [
    { letter: "AA", min: 90 },
    { letter: "BA", min: 85 },
    { letter: "BB", min: 80 },
    { letter: "CB", min: 75 },
    { letter: "CC", min: 70 },
    { letter: "DC", min: 65 },
    { letter: "DD", min: 60 },
    { letter: "FD", min: 50 },
    { letter: "FF", min: 0 }
  ];

  const scaleMount = document.querySelector("[data-scale]");
  scaleMount.innerHTML = DEFAULT_SCALE.map(function (row) {
    return (
      '<label class="scale-item">' +
        "<span>" + row.letter + "</span>" +
        '<input type="number" min="0" max="100" step="1" value="' + row.min + '" data-letter="' + row.letter + '">' +
      "</label>"
    );
  }).join("");

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

  document.querySelector("[data-target-form]").addEventListener("submit", function (event) {
    event.preventDefault();
    const midterm = num("#target-midterm");
    const midW = num("#target-mid-w") / 100;
    const finW = num("#target-fin-w") / 100;
    const wanted = document.querySelector("#target-letter").value;
    const out = document.querySelector("[data-target-result]");

    if (Math.abs(midW + finW - 1) > 0.001) {
      out.innerHTML = "<p>Vize ve final yüzdelerinin toplamı %100 olmalıdır.</p>";
      return;
    }

    const minScore = readScale().find(function (row) { return row.letter === wanted; }).min;
    const needed = (minScore - midterm * midW) / finW;

    let message;
    let value;
    if (needed > 100) {
      value = "—";
      message = wanted + " için finalden 100 almak bile yetmez. Hedefi düşürmeyi veya ağırlıkları kontrol etmeyi dene.";
    } else if (needed <= 0) {
      value = "0";
      message = "Finalden 0 alsan bile " + wanted + " harfini korursun. Mevcut vize yeterli.";
    } else {
      value = Math.ceil(needed * 10) / 10;
      message = wanted + " için finalden en az <strong>" + value + "</strong> alman gerekiyor. (Barem: " + minScore + " ve üzeri)";
    }

    out.innerHTML =
      'Gerekli final notu<div class="result-value">' + value + "</div>" +
      "<p>" + message + "</p>";
  });

  document.querySelector("[data-avg-form]").addEventListener("submit", function (event) {
    event.preventDefault();
    const midterm = num("#avg-midterm");
    const final = num("#avg-final");
    const midW = num("#avg-mid-w") / 100;
    const finW = num("#avg-fin-w") / 100;
    const out = document.querySelector("[data-avg-result]");

    if (Math.abs(midW + finW - 1) > 0.001) {
      out.innerHTML = "<p>Vize ve final yüzdelerinin toplamı %100 olmalıdır.</p>";
      return;
    }

    const avg = midterm * midW + final * finW;
    const letter = letterFor(avg);
    out.innerHTML =
      'Dönem sonu ortalaması<div class="result-value">' + avg.toFixed(1) + "</div>" +
      "<p>Harf notu: <span class=\"letter-badge\">" + letter + "</span></p>";
  });
})();
