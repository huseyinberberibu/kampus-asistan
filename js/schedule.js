(function () {
  const page = document.querySelector("[data-schedule-page]");
  if (!page) return;

  const state = { data: null, semesterId: "fall" };

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

  function courseAt(semester, day, slot) {
    return semester.courses.find(function (course) {
      return course.slots.some(function (s) { return s.day === day && s.slot === slot; });
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

  function renderTable() {
    const semester = state.data.semesters.find(function (s) { return s.id === state.semesterId; });
    const wrap = document.querySelector("[data-table]");
    let html = '<div class="timetable-wrap"><table class="schedule-table"><thead><tr><th>Saat</th>';
    semester.days.forEach(function (day) { html += "<th>" + day + "</th>"; });
    html += "</tr></thead><tbody>";

    semester.timeSlots.forEach(function (time, slot) {
      html += "<tr><td>" + time + "</td>";
      semester.days.forEach(function (_day, day) {
        const course = courseAt(semester, day, slot);
        if (!course) {
          html += "<td></td>";
          return;
        }
        html +=
          '<td><button type="button" class="course-cell" style="background:' + course.color + '" data-course="' + course.id + '">' +
            "<strong>" + course.code + "</strong>" +
            "<span>" + course.name + "</span>" +
          "</button></td>";
      });
      html += "</tr>";
    });

    html += "</tbody></table></div>";
    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-course]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(semester, btn.getAttribute("data-course"));
      });
    });
  }

  function openModal(semester, courseId) {
    const course = semester.courses.find(function (c) { return c.id === courseId; });
    const week = currentWeekIndex(semester);
    const inTerm = isInSemester(semester);
    const backdrop = document.querySelector("[data-modal]");
    document.querySelector("[data-modal-title]").textContent = course.code + " · " + course.name;
    document.querySelector("[data-modal-meta]").textContent =
      course.instructor + " · " + course.room + " · " + semester.label;

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
        "Dönem henüz başlamadı veya bitti. Liste 1. haftadan itibaren örnek müfredattır; güncel hafta vurgusu dönem içinde aktif olur.";
    } else {
      document.querySelector("[data-week-note]").textContent =
        "Güncel hafta: " + (week + 1) + " / " + semester.weekCount + " (başlangıç " + semester.weekStart + ")";
    }

    backdrop.classList.add("open");
    backdrop.removeAttribute("hidden");
  }

  function render() {
    renderTabs();
    renderTable();
  }

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

  Kampus.fetchJSON("data/schedule.json")
    .then(function (data) {
      state.data = data;
      const live = data.semesters.find(isInSemester);
      state.semesterId = live ? live.id : "fall";
      render();
    })
    .catch(function () {
      document.querySelector("[data-table]").innerHTML =
        '<div class="soft-card empty-state"><p>Ders programı yüklenemedi.</p></div>';
    });
})();
