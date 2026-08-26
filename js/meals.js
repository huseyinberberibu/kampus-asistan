(function () {
  const calendarEl = document.querySelector("[data-calendar]");
  if (!calendarEl) return;

  const state = {
    cursor: new Date(),
    selected: new Date(),
    meals: [],
    breakfastTime: "07:30 – 09:30",
    dinnerTime: "17:00 – 19:30"
  };

  state.cursor.setDate(1);
  state.selected.setHours(0, 0, 0, 0);

  function mealByDate(iso) {
    return state.meals.find(function (item) { return item.date === iso; });
  }

  function renderCalendar() {
    const year = state.cursor.getFullYear();
    const month = state.cursor.getMonth();
    const label = document.querySelector("[data-cal-label]");
    if (label) label.textContent = Kampus.MONTHS[month] + " " + year;

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const todayIso = Kampus.toISODate(new Date());
    const selectedIso = Kampus.toISODate(state.selected);

    const grid = document.querySelector("[data-cal-grid]");
    grid.innerHTML = "";

    for (let i = 0; i < 42; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      let dayNum;
      let cellDate;

      if (i < startOffset) {
        dayNum = prevDays - startOffset + i + 1;
        cellDate = new Date(year, month - 1, dayNum);
        btn.classList.add("muted");
        btn.disabled = true;
      } else if (i >= startOffset + daysInMonth) {
        dayNum = i - (startOffset + daysInMonth) + 1;
        cellDate = new Date(year, month + 1, dayNum);
        btn.classList.add("muted");
        btn.disabled = true;
      } else {
        dayNum = i - startOffset + 1;
        cellDate = new Date(year, month, dayNum);
      }

      const iso = Kampus.toISODate(cellDate);
      btn.textContent = String(dayNum);
      if (iso === todayIso) btn.classList.add("today");
      if (iso === selectedIso) btn.classList.add("selected");
      if (mealByDate(iso)) btn.classList.add("has-menu");

      if (!btn.classList.contains("muted")) {
        btn.addEventListener("click", function () {
          state.selected = cellDate;
          renderCalendar();
          renderMenu();
        });
      }

      grid.appendChild(btn);
    }
  }

  function mealItems(items) {
    return items.map(function (item) {
      const portion = item.portion
        ? '<span class="meal-item-portion">' + item.portion + "</span>"
        : "";
      return (
        "<li>" +
          '<span class="dot"></span>' +
          '<span class="meal-item-name">' + item.name + "</span>" +
          portion +
        "</li>"
      );
    }).join("");
  }

  function mealCard(title, meal, time) {
    if (!meal) return "";
    const when = time || meal.time || "";
    return (
      '<article class="meal-card">' +
        '<div class="meal-card-body">' +
          '<span class="meal-label">' + title + "</span>" +
          "<h3>" + title + "</h3>" +
          '<p class="meal-meta">' + when + " · " + meal.calories + " kcal</p>" +
          '<ul class="meal-list">' + mealItems(meal.items) + "</ul>" +
        "</div>" +
      "</article>"
    );
  }

  function renderMenu() {
    const iso = Kampus.toISODate(state.selected);
    const dateLabel = document.querySelector("[data-selected-date]");
    if (dateLabel) dateLabel.textContent = Kampus.formatLong(state.selected);

    const mount = document.querySelector("[data-menu]");
    const found = mealByDate(iso);

    if (!found) {
      mount.innerHTML =
        '<div class="soft-card empty-state">' +
          "<p>Bu tarih için menü henüz eklenmedi. Yeni ay listesi gelince <code>data/meals.json</code> dosyasına o günleri eklemen yeterli.</p>" +
        "</div>";
      return;
    }

    mount.innerHTML =
      '<div class="menu-grid">' +
        mealCard("Kahvaltı", found.breakfast, state.breakfastTime) +
        mealCard("Akşam Yemeği", found.dinner, state.dinnerTime) +
      "</div>";
  }

  document.querySelector("[data-cal-prev]").addEventListener("click", function () {
    state.cursor.setMonth(state.cursor.getMonth() - 1);
    renderCalendar();
  });

  document.querySelector("[data-cal-next]").addEventListener("click", function () {
    state.cursor.setMonth(state.cursor.getMonth() + 1);
    renderCalendar();
  });

  Kampus.fetchJSON("data/meals.json")
    .then(function (data) {
      state.meals = data.meals || [];
      if (data.meta && data.meta.breakfastTime) state.breakfastTime = data.meta.breakfastTime;
      if (data.meta && data.meta.dinnerTime) state.dinnerTime = data.meta.dinnerTime;
      const notes = document.querySelector("[data-menu-notes]");
      if (notes && data.meta && data.meta.notes) {
        notes.innerHTML = data.meta.notes.map(function (line) {
          return "<p>" + line + "</p>";
        }).join("");
      }
      const todayIso = Kampus.toISODate(state.selected);
      if (!mealByDate(todayIso) && state.meals.length) {
        const first = Kampus.parseISODate(state.meals[0].date);
        state.selected = first;
        state.cursor = new Date(first.getFullYear(), first.getMonth(), 1);
      }
      renderCalendar();
      renderMenu();
    })
    .catch(function () {
      document.querySelector("[data-menu]").innerHTML =
        '<div class="soft-card empty-state"><p>Menü verisi yüklenemedi. Yerel sunucu üzerinden açmayı dene.</p></div>';
      renderCalendar();
    });
})();
