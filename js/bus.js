(function () {
  const page = document.querySelector("[data-bus-page]");
  if (!page) return;

  const LocationService = {
    getPosition: function () {
      return new Promise(function (resolve) {
        if (!navigator.geolocation) {
          resolve({ ok: false, reason: "unsupported" });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            resolve({
              ok: true,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          function (err) {
            resolve({ ok: false, reason: err && err.code === 1 ? "denied" : "unavailable" });
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
        );
      });
    }
  };

  const BusDataService = {
    data: null,
    load: async function () {
      this.data = await Kampus.fetchJSON("data/bus.json");
      return this.data;
    },
    mode: function () {
      return (this.data && this.data.meta && this.data.meta.mode) || "live";
    },
    stopById: function (id) {
      return this.data.stops.find(function (s) { return s.id === id; });
    },
    routeById: function (id) {
      return this.data.routes.find(function (r) { return r.id === id; });
    },
    vehiclesFor: function (routeId) {
      return this.data.vehicles.filter(function (v) { return v.routeId === routeId; });
    }
  };

  const GeoUtil = {
    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },
    pointOnRoute: function (stops, progress) {
      if (stops.length === 1) return { lat: stops[0].lat, lng: stops[0].lng, seg: 0 };
      const t = Math.max(0, Math.min(0.999, progress));
      const scaled = t * (stops.length - 1);
      const i = Math.floor(scaled);
      const f = scaled - i;
      const a = stops[i];
      const b = stops[i + 1];
      return {
        lat: this.lerp(a.lat, b.lat, f),
        lng: this.lerp(a.lng, b.lng, f),
        seg: i
      };
    }
  };

  const ETACalculator = {
    minutes: function (from, to, speed) {
      const km = Kampus.haversineKm(from.lat, from.lng, to.lat, to.lng);
      return Kampus.minutesAway(km, speed);
    }
  };

  const MapView = {
    draw: function (svg, routeStops, user, buses) {
      const pad = 36;
      const w = 640;
      const h = 360;
      const lats = routeStops.map(function (s) { return s.lat; });
      const lngs = routeStops.map(function (s) { return s.lng; });
      if (user) {
        lats.push(user.lat);
        lngs.push(user.lng);
      }
      const minLat = Math.min.apply(null, lats);
      const maxLat = Math.max.apply(null, lats);
      const minLng = Math.min.apply(null, lngs);
      const maxLng = Math.max.apply(null, lngs);

      function xy(lat, lng) {
        const x = pad + ((lng - minLng) / (maxLng - minLng || 1)) * (w - pad * 2);
        const y = pad + (1 - (lat - minLat) / (maxLat - minLat || 1)) * (h - pad * 2);
        return { x: x, y: y };
      }

      const path = routeStops.map(function (s, i) {
        const p = xy(s.lat, s.lng);
        return (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
      }).join(" ");

      const stopDots = routeStops.map(function (s) {
        const p = xy(s.lat, s.lng);
          const short = s.name.split(" ")[0];
          return '<circle cx="' + p.x + '" cy="' + p.y + '" r="6" fill="#34d399"/><text x="' + p.x + '" y="' + (p.y - 12) + '" fill="#a7f3d0" font-size="10" text-anchor="middle">' + short + "</text>";
      }).join("");

      const busDots = buses.map(function (b) {
        const p = xy(b.lat, b.lng);
        return '<g><circle cx="' + p.x + '" cy="' + p.y + '" r="10" fill="#10b981"/><text x="' + p.x + '" y="' + (p.y + 4) + '" fill="#07111f" font-size="9" text-anchor="middle" font-weight="700">B</text></g>';
      }).join("");

      let userDot = "";
      if (user) {
        const p = xy(user.lat, user.lng);
        userDot = '<circle cx="' + p.x + '" cy="' + p.y + '" r="8" fill="#fff"/><circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#1b365d"/>';
      }

      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.innerHTML =
        '<rect width="' + w + '" height="' + h + '" fill="#0a1628"/>' +
        '<path d="' + path + '" fill="none" stroke="#234574" stroke-width="10" stroke-linecap="round"/>' +
        '<path d="' + path + '" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="8 8"/>' +
        stopDots + busDots + userDot;
    }
  };

  const LiveView = {
    render: function (ctx) {
      document.querySelector("[data-live-view]").classList.remove("hidden");
      document.querySelector("[data-schedule-view]").classList.add("hidden");

      const route = ctx.route;
      const stops = route.stopIds.map(function (id) { return BusDataService.stopById(id); });
      const speed = BusDataService.data.config.avgSpeedKmh;
      const tick = ((Date.now() / 120000) % 1) * 0.12;

      const buses = BusDataService.vehiclesFor(route.id).map(function (v) {
        const progress = (v.progress + tick) % 1;
        const point = GeoUtil.pointOnRoute(stops, progress);
        return Object.assign({}, v, point);
      });

      MapView.draw(document.querySelector("[data-map]"), stops, ctx.user, buses);

      const origin = ctx.origin;
      let nearest = null;
      buses.forEach(function (bus) {
        const mins = ETACalculator.minutes(bus, origin, speed);
        if (!nearest || mins < nearest.mins) nearest = { bus: bus, mins: mins };
      });

      const eta = document.querySelector("[data-eta]");
      if (!origin) {
        eta.innerHTML = "<p>Konum veya durak seçilmediği için tahmini süre hesaplanamıyor.</p>";
      } else if (!nearest) {
        eta.innerHTML = "<p>Bu hatta aktif sahte araç bulunamadı.</p>";
      } else {
        eta.innerHTML =
          '<div><p class="meal-meta" style="margin:0">En yakın otobüs · ' + nearest.bus.plate + "</p>" +
          '<div class="eta-mins">' + nearest.mins + " dk</div>" +
          "<p>Tahmini " + nearest.mins + " dakika uzaklıkta · doluluk: " + nearest.bus.occupancy + "</p></div>" +
          '<span class="letter-badge">Hat ' + route.code + "</span>";
      }

      const list = document.querySelector("[data-stops]");
      list.innerHTML = stops.map(function (s) {
        const active = ctx.manualStop && ctx.manualStop.id === s.id;
        return "<li class=\"" + (active ? "active" : "") + "\"><span>" + s.name + "</span><span>" + s.landmark + "</span></li>";
      }).join("");
    }
  };

  const ScheduleView = {
    dayKey: function () {
      const day = new Date().getDay();
      if (day === 0) return "sunday";
      if (day === 6) return "saturday";
      return "weekdays";
    },
    render: function (ctx) {
      document.querySelector("[data-live-view]").classList.add("hidden");
      document.querySelector("[data-schedule-view]").classList.remove("hidden");
      const route = ctx.route;
      const table = document.querySelector("[data-timetable-body]");
      const keys = [
        { key: "weekdays", label: "Hafta içi" },
        { key: "saturday", label: "Cumartesi" },
        { key: "sunday", label: "Pazar" }
      ];
      table.innerHTML = keys.map(function (row) {
        const hours = (route.schedule[row.key] || []).join(" · ") || "Sefer yok";
        const today = row.key === ScheduleView.dayKey() ? ' style="background:#ecfdf5"' : "";
        return "<tr" + today + "><th>" + row.label + "</th><td>" + hours + "</td></tr>";
      }).join("");
    }
  };

  const App = {
    user: null,
    manualStop: null,
    userPickedStop: false,
    routeId: "hat-14",
    timer: null,

    paintStatus: function (loc) {
      const banner = document.querySelector("[data-geo-banner]");
      if (loc.ok) {
        banner.className = "fallback-banner ok";
        banner.innerHTML = "<div><strong>Konum alındı.</strong> Otobüs mesafesi konumuna göre hesaplanıyor. İstersen yine de durak seçebilirsin.</div>";
      } else if (loc.reason === "pending") {
        banner.className = "fallback-banner";
        banner.innerHTML = "<div><strong>Konum izni isteniyor.</strong> İzin vermezsen veya konum kapalıysa aşağıdaki durak listesinden beklediğin durağı seç.</div>";
      } else {
        const why = loc.reason === "denied"
          ? "Konum izni verilmedi."
          : loc.reason === "unsupported"
            ? "Tarayıcı konum API'sini desteklemiyor."
            : "Konum alınamadı.";
        banner.className = "fallback-banner";
        banner.innerHTML = "<div><strong>" + why + "</strong> Aşağıdan beklediğin durağı seç; tahmini süre o durağa göre hesaplanır.</div>";
      }
    },

    fillSelects: function () {
      const routeSel = document.querySelector("[data-route-select]");
      routeSel.innerHTML = BusDataService.data.routes.map(function (r) {
        return '<button type="button" class="chip' + (r.id === App.routeId ? " active" : "") + '" data-route="' + r.id + '">Hat ' + r.code + "</button>";
      }).join("");

      routeSel.querySelectorAll("[data-route]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          App.routeId = btn.getAttribute("data-route");
          App.fillSelects();
          App.render();
        });
      });

      const stopSel = document.querySelector("[data-stop-select]");
      if (!stopSel.dataset.ready) {
        stopSel.innerHTML = '<option value="">Durak seç</option>' + BusDataService.data.stops.map(function (s) {
          return '<option value="' + s.id + '">' + s.name + "</option>";
        }).join("");
        stopSel.onchange = function () {
          App.manualStop = BusDataService.stopById(stopSel.value);
          App.userPickedStop = Boolean(App.manualStop);
          App.render();
        };
        stopSel.dataset.ready = "1";
      }
    },

    render: function () {
      const ctx = {
        user: App.user,
        manualStop: App.manualStop,
        origin: (App.userPickedStop && App.manualStop) || App.user || App.manualStop,
        route: BusDataService.routeById(App.routeId)
      };

      const mode = BusDataService.mode();
      document.querySelector("[data-mode-label]").textContent =
        mode === "schedule" ? "Mod: statik hareket saatleri" : "Mod: canlı (mock) konum";

      if (mode === "schedule") ScheduleView.render(ctx);
      else LiveView.render(ctx);

      ScheduleView.renderTimetableOnly(ctx);
    },

    start: async function () {
      await BusDataService.load();
      App.fillSelects();
      App.manualStop = BusDataService.stopById("kampus-giris");
      document.querySelector("[data-stop-select]").value = "kampus-giris";
      App.paintStatus({ ok: false, reason: "pending" });
      App.render();
      App.timer = setInterval(App.render, BusDataService.data.config.refreshMs);

      const loc = await LocationService.getPosition();
      App.paintStatus(loc);
      if (loc.ok) App.user = { lat: loc.lat, lng: loc.lng };
      App.render();
    }
  };

  ScheduleView.renderTimetableOnly = function (ctx) {
    const mount = document.querySelector("[data-static-times]");
    const route = ctx.route;
    const todayKey = ScheduleView.dayKey();
    const hours = route.schedule[todayKey] || [];
    mount.innerHTML =
      "<h3>Hat " + route.code + " · Kampüs kalkış saatleri</h3>" +
      "<p class=\"hint\">Canlı API bulunamazsa `data/bus.json` içindeki <code>meta.mode</code> değerini <code>schedule</code> yapman yeterli. Bu tablo aynı veriden üretilir.</p>" +
      '<div class="chip-row" style="margin-top:12px">' +
        (hours.length ? hours.map(function (h) { return '<span class="chip">' + h + "</span>"; }).join("") : "<p>Bugün sefer yok.</p>") +
      "</div>";
  };

  App.start().catch(function () {
    document.querySelector("[data-geo-banner]").innerHTML =
      "<div><strong>Otobüs verisi yüklenemedi.</strong> Sayfayı yerel bir sunucu ile aç.</div>";
  });
})();
