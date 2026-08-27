(function () {
  const page = document.querySelector("[data-laundry-page]");
  if (!page) return;

  const ENDPOINT = "data/laundry.json";
  const TICK_MS = 1000;
  const DEFAULT_POLL_MS = 60000;

  const STATUS = {
    idle: { label: "Müsait", hint: "Kullanıma hazır", icon: "fa-check" },
    running: { label: "Çalışıyor", hint: "", icon: "fa-clock" },
    done: { label: "Bitti", hint: "Çamaşırı al", icon: "fa-bell" },
    fault: { label: "Arızalı", hint: "Devre dışı", icon: "fa-ban" }
  };

  let snapshot = null;
  let snapshotAt = 0;
  let lastRaw = "";
  let lastPollAt = 0;
  let activeTab = "washer";

  async function fetchLaundryStatus() {
    return Kampus.fetchJSON(ENDPOINT + "?t=" + Date.now());
  }

  function liveStatus(machine) {
    if (machine.status !== "running") {
      return { status: machine.status, remaining: 0, progress: 0 };
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - snapshotAt) / 1000));
    const remaining = Math.max(0, (machine.remainingSec || 0) - elapsed);
    if (remaining <= 0) {
      return { status: "done", remaining: 0, progress: 100 };
    }
    const cycle = machine.cycleSec || machine.remainingSec || 1;
    const done = cycle - remaining;
    return {
      status: "running",
      remaining: remaining,
      progress: Math.max(8, Math.min(100, Math.round((done / cycle) * 100)))
    };
  }

  function formatRemain(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return "Bitmesine " + h + " saat " + m + " dk kaldı";
    if (m > 0) return "Bitmesine " + m + " dk kaldı";
    return "Bitmesine " + sec + " sn kaldı";
  }

  function formatClock(date) {
    return Kampus.pad(date.getHours()) + ":" + Kampus.pad(date.getMinutes());
  }

  function countBy(list) {
    return list.reduce(function (acc, machine) {
      const status = liveStatus(machine).status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { idle: 0, running: 0, done: 0, fault: 0 });
  }

  function machineCard(machine) {
    const live = liveStatus(machine);
    const meta = STATUS[live.status] || STATUS.idle;
    const hint = live.status === "running" ? formatRemain(live.remaining) : meta.hint;
    const bar = live.status === "running"
      ? '<span class="scale-bar"><i style="width:' + live.progress + '%"></i></span>'
      : "";
    return (
      '<article class="machine-card is-' + live.status + '" data-id="' + machine.id + '">' +
        '<span class="machine-num">' + Kampus.pad(machine.number) + "</span>" +
        '<span class="machine-icon"><i class="fa-solid ' + meta.icon + '"></i></span>' +
        "<strong>" + meta.label + "</strong>" +
        "<p>" + hint + "</p>" +
        bar +
      "</article>"
    );
  }

  function summaryLine(counts) {
    return counts.idle + " müsait · " + counts.running + " çalışıyor · " + counts.done + " bitti · " + counts.fault + " arızalı";
  }

  function paintColumn(type, title, icon) {
    const list = (snapshot.machines || [])
      .filter(function (item) { return item.type === type; })
      .sort(function (a, b) { return a.number - b.number; });
    const counts = countBy(list);
    return (
      '<section class="scale-panel laundry-col" data-laundry-col="' + type + '">' +
        '<div class="scale-panel-head">' +
          '<span class="feature-icon" style="margin:0"><i class="fa-solid ' + icon + '"></i></span>' +
          "<div>" +
            "<h3>" + title + "</h3>" +
            "<p>" + summaryLine(counts) + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="machine-grid">' + list.map(machineCard).join("") + "</div>" +
      "</section>"
    );
  }

  function paint() {
    if (!snapshot) return;
    const mount = page.querySelector("[data-laundry-board]");
    mount.innerHTML =
      paintColumn("washer", "Çamaşır makineleri", "fa-soap") +
      paintColumn("dryer", "Kurutma makineleri", "fa-wind");

    const col = page.querySelector('[data-laundry-col="' + activeTab + '"]');
    if (col) col.classList.add("is-on");

    page.querySelectorAll("[data-laundry-tabs] button").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === activeTab);
    });

    const washers = snapshot.machines.filter(function (m) { return m.type === "washer"; });
    const dryers = snapshot.machines.filter(function (m) { return m.type === "dryer"; });
    const idle = countBy(snapshot.machines).idle;
    const meta = page.querySelector("[data-laundry-meta]");
    meta.textContent =
      idle + " makine şu an boş · son kontrol " + formatClock(new Date(lastPollAt || Date.now())) +
      " · " + washers.length + " çamaşır + " + dryers.length + " kurutma · 1 dk’de bir yenilenir";
  }

  async function refresh() {
    const data = await fetchLaundryStatus();
    const raw = JSON.stringify(data.machines || []);
    if (!snapshot || raw !== lastRaw) {
      snapshot = data;
      snapshotAt = Date.now();
      lastRaw = raw;
    }
    lastPollAt = Date.now();
    paint();
  }

  page.querySelector("[data-laundry-tabs]").addEventListener("click", function (event) {
    const btn = event.target.closest("[data-tab]");
    if (!btn) return;
    activeTab = btn.getAttribute("data-tab");
    paint();
  });

  refresh()
    .then(function () {
      const ms = (snapshot.meta && snapshot.meta.pollMs) || DEFAULT_POLL_MS;
      setInterval(function () {
        refresh().catch(function () {});
      }, ms);
    })
    .catch(function () {
      page.querySelector("[data-laundry-board]").innerHTML =
        '<div class="soft-card empty-state"><p>Çamaşırhane verisi şu an yüklenemedi.</p></div>';
    });

  setInterval(function () {
    if (snapshot) paint();
  }, TICK_MS);
})();
