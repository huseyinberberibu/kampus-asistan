(function () {
  const mount = document.querySelector("[data-home-menu]");
  if (!mount) return;

  Kampus.fetchJSON("data/meals.json")
    .then(function (data) {
      const today = Kampus.toISODate(new Date());
      const meal = (data.meals || []).find(function (item) { return item.date === today; });
      if (!meal) {
        mount.innerHTML = "<p>Bugün için örnek menü kaydı yok. Yemek listesinden tarih seçebilirsin.</p>";
        return;
      }
      mount.innerHTML =
        "<p><strong>" + Kampus.formatLong(new Date()) + "</strong></p>" +
        "<p>Kahvaltı: " + meal.breakfast.items.slice(0, 3).map(function (i) { return i.name; }).join(", ") + "</p>" +
        "<p>Akşam: " + meal.dinner.items.slice(0, 3).map(function (i) { return i.name; }).join(", ") + "</p>" +
        '<p style="margin-top:12px"><a class="btn btn-navy" href="yemek.html">Tam menüyü gör</a></p>';
    })
    .catch(function () {
      mount.innerHTML = "<p>Menü özeti yüklenemedi.</p>";
    });
})();
