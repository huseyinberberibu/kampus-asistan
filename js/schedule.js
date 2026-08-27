(function () {
  const page = document.querySelector("[data-schedule-page]");
  if (!page) return;

  const YEAR_KEY = "kampus-class-year";
  const state = { data: null, semesterId: "fall", yearId: 1, dayFilter: "all" };
  const wideWeek = window.matchMedia("(min-width: 900px)");

  function currentWeekIndex(semester) {
    const start = Kampus.parseISODate(semester.weekStart);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
    if (diff < 0) return 0;
    if (diff >= semester.weekCount) return semester.weekCount - 1;
    return diff;
  }

  function isInSemester(semester) {
    const start = Kampus.parseISODate(semester.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + semester.weekCount * 7);
    const now = new Date();
    return now >= start && now < end;
  }

  function yearLabel() {
    const row = (state.data.years || []).find(function (y) { return y.id === state.yearId; });
    return row ? row.label : state.yearId + ". Sınıf";
  }

  function coursesAt(semester, day, slot) {
    return semester.courses.filter(function (course) {
      if (course.year !== state.yearId) return false;
      return course.slots.some(function (s) { return s.day === day && s.slot === slot; });
    });
  }

  function renderYearTabs() {
    const tabs = document.querySelector("[data-year-tabs]");
    const years = state.data.years || [
      { id: 1, label: "1. Sınıf" },
      { id: 2, label: "2. Sınıf" },
      { id: 3, label: "3. Sınıf" },
      { id: 4, label: "4. Sınıf" }
    ];
    tabs.innerHTML = years.map(function (y) {
      return '<button type="button" class="' + (y.id === state.yearId ? "active" : "") + '" data-year="' + y.id + '">' + y.label + "</button>";
    }).join("");
    tabs.querySelectorAll("[data-year]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.yearId = Number(btn.getAttribute("data-year"));
        try { localStorage.setItem(YEAR_KEY, String(state.yearId)); } catch (e) {}
        render();
      });
    });
  }

  function renderDayTabs() {
    const tabs = document.querySelector("[data-day-tabs]");
    const semester = state.data.semesters.find(function (s) { return s.id === state.semesterId; });
    const short = ["Pzt", "Sal", "Çar", "Per", "Cum"];
    let html = '<button type="button" class="' + (state.dayFilter === "all" ? "active" : "") + '" data-day="all">Tüm hafta</button>';
    semester.days.forEach(function (day, i) {
      html += '<button type="button" class="' + (state.dayFilter === i ? "active" : "") + '" data-day="' + i + '">' + (short[i] || day) + "</button>";
    });
    tabs.innerHTML = html;
    tabs.querySelectorAll("[data-day]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const v = btn.getAttribute("data-day");
        state.dayFilter = v === "all" ? "all" : Number(v);
        render();
      });
    });
  }

  function renderTabs() {
    const tabs = document.querySelector("[data-sem-tabs]");
    tabs.innerHTML = state.data.semesters.map(function (sem) {
      return '<button type="button" class="' + (sem.id === state.semesterId ? "active" : "") + '" data-sem="' + sem.id + '">' + sem.label + "</button>";
    }).join("");
    tabs.querySelectorAll("[data-sem]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.semesterId = btn.getAttribute("data-sem");
        render();
      });
    });
  }

  function cellHtml(courses) {
    if (!courses.length) return "<td></td>";
    const inner = courses.map(function (course) {
      return (
        '<button type="button" class="course-cell" style="background:' + course.color + '" data-course="' + course.id + '">' +
          "<strong>" + course.name + "</strong>" +
          "<span>" + course.instructor + " · " + course.room + "</span>" +
        "</button>"
      );
    }).join("");
    return '<td><div class="course-stack">' + inner + "</div></td>";
  }

  function bindCourseClicks(semester, root) {
    root.querySelectorAll("[data-course]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(semester, btn.getAttribute("data-course"));
      });
    });
  }

  function renderStackedWeek(semester) {
    let html = "";
    semester.days.forEach(function (dayName, day) {
      html += '<section class="day-sheet"><h3>' + dayName + "</h3>";
      let rows = "";
      semester.timeSlots.forEach(function (time, slot) {
        const courses = coursesAt(semester, day, slot);
        if (!courses.length) return;
        rows += "<tr><td>" + time + "</td>" + cellHtml(courses) + "</tr>";
      });
      if (!rows) {
        html += '<p class="day-empty">Bu gün ders yok</p></section>';
        return;
      }
      html += '<table class="schedule-table"><tbody>' + rows + "</tbody></table></section>";
    });
    return '<div class="week-stack">' + html + "</div>";
  }

  function renderGridTable(semester, dayIndexes) {
    let html = '<div class="timetable-wrap">';
    html += '<table class="schedule-table"><thead><tr><th>Saat</th>';
    dayIndexes.forEach(function (day) { html += "<th>" + semester.days[day] + "</th>"; });
    html += "</tr></thead><tbody>";

    let rows = "";
    semester.timeSlots.forEach(function (time, slot) {
      const cells = dayIndexes.map(function (day) { return coursesAt(semester, day, slot); });
      if (cells.every(function (courses) { return !courses.length; })) return;
      rows += "<tr><td>" + time + "</td>";
      cells.forEach(function (courses) { rows += cellHtml(courses); });
      rows += "</tr>";
    });

    if (!rows) {
      return '<p class="day-empty">Bu görünümde ders yok</p>';
    }

    html += rows;
    html += "</tbody></table></div>";
    return html;
  }

  function renderTable() {
    const semester = state.data.semesters.find(function (s) { return s.id === state.semesterId; });
    const wrap = document.querySelector("[data-table]");
    const count = semester.courses.filter(function (c) { return c.year === state.yearId; }).length;
    const stackWeek = state.dayFilter === "all" && !wideWeek.matches;

    const dayIndexes = state.dayFilter === "all"
      ? semester.days.map(function (_d, i) { return i; })
      : [state.dayFilter];

    let html = '<div class="schedule-board">';
    html += '<p class="schedule-caption">' + yearLabel() + " · " + semester.label + " · " + (semester.year || "") + " · " + count + " ders</p>";
    html += stackWeek ? renderStackedWeek(semester) : renderGridTable(semester, dayIndexes);
    html += "</div>";
    wrap.innerHTML = html;
    bindCourseClicks(semester, wrap);
  }

  function openModal(semester, courseId) {
    const course = semester.courses.find(function (c) { return c.id === courseId; });
    const week = currentWeekIndex(semester);
    const inTerm = isInSemester(semester);
    const backdrop = document.querySelector("[data-modal]");
    document.querySelector("[data-modal-title]").textContent = course.name;
    document.querySelector("[data-modal-meta]").textContent =
      yearLabel() + " · " + course.instructor + " · " + course.room + " · " + semester.label;

    const list = document.querySelector("[data-weeks]");
    list.innerHTML = course.syllabus.map(function (topic, i) {
      const mark = i === week ? " current" : "";
      return (
        '<li class="' + mark + '">' +
          '<span class="wk">Hafta ' + (i + 1) + "</span>" +
          "<span>" + topic + (inTerm && i === week ? " · bu hafta" : "") + "</span>" +
        "</li>"
      );
    }).join("");

    if (!inTerm) {
      document.querySelector("[data-week-note]").textContent =
        "Dönem henüz başlamadı veya bitti.";
    } else {
      document.querySelector("[data-week-note]").textContent =
        "Güncel hafta: " + (week + 1) + " / " + semester.weekCount + " (başlangıç " + semester.weekStart + ")";
    }

    backdrop.classList.add("open");
    backdrop.removeAttribute("hidden");
  }

  function render() {
    renderYearTabs();
    renderTabs();
    renderDayTabs();
    renderTable();
  }

  function onWeekWidthChange() {
    if (state.data) renderTable();
  }
  if (wideWeek.addEventListener) wideWeek.addEventListener("change", onWeekWidthChange);
  else if (wideWeek.addListener) wideWeek.addListener(onWeekWidthChange);

  document.querySelector("[data-modal-close]").addEventListener("click", function () {
    const modal = document.querySelector("[data-modal]");
    modal.classList.remove("open");
    modal.setAttribute("hidden", "");
  });
  document.querySelector("[data-modal]").addEventListener("click", function (event) {
    if (event.target === event.currentTarget) {
      event.currentTarget.classList.remove("open");
      event.currentTarget.setAttribute("hidden", "");
    }
  });

  Kampus.fetchJSON("data/schedule.json?v=2025-26-days")
    .then(function (data) {
      state.data = data;
      try {
        const saved = Number(localStorage.getItem(YEAR_KEY));
        if (saved >= 1 && saved <= 4) state.yearId = saved;
      } catch (e) {}
      const live = data.semesters.find(isInSemester);
      state.semesterId = live ? live.id : "fall";
      render();
    })
    .catch(function () {
      document.querySelector("[data-table]").innerHTML =
        '<div class="soft-card empty-state"><p>Ders programı yüklenemedi.</p></div>';
    });
})();
