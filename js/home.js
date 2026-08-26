(function () {
  const mount = document.querySelector("[data-home-menu]");
  if (!mount) return;

  Kampus.fetchJSON("data/meals.json")
    .then(function (data) {
      const meals = data.meals || [];
      const today = Kampus.toISODate(new Date());
      let meal = meals.find(function (item) { return item.date === today; });
      let labelDate = new Date();
      if (!meal && meals.length) {
        meal = meals[0];
        labelDate = Kampus.parseISODate(meal.date);
      }
      if (!meal) {
        mount.innerHTML = "<p>Menü kaydı yok. Yemek listesinden tarih seçebilirsin.</p>";
        return;
      }
      mount.innerHTML =
        "<h3>Yemek özeti</h3>" +
        "<p><strong>" + Kampus.formatLong(labelDate) + "</strong></p>" +
        "<p>Kahvaltı: " + meal.breakfast.items.slice(0, 3).map(function (i) { return i.name; }).join(", ") + "</p>" +
        "<p>Akşam: " + meal.dinner.items.slice(0, 3).map(function (i) { return i.name; }).join(", ") + "</p>" +
        '<p style="margin-top:12px"><a class="btn btn-navy" href="yemek.html">Tam menüyü gör</a></p>';
    })
    .catch(function () {
      mount.innerHTML = "<p>Menü özeti yüklenemedi.</p>";
    });
})();
