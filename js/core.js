(function () {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
  }

  document.addEventListener("click", function (event) {
    if (!nav || !nav.classList.contains("open")) return;
    if (nav.contains(event.target) || (toggle && toggle.contains(event.target))) return;
    nav.classList.remove("open");
  });
})();

const Kampus = {
  DAYS: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
  MONTHS: [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ],

  pad: function (n) {
    return String(n).padStart(2, "0");
  },

  toISODate: function (date) {
    return date.getFullYear() + "-" + this.pad(date.getMonth() + 1) + "-" + this.pad(date.getDate());
  },

  parseISODate: function (iso) {
    const parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },

  formatLong: function (date) {
    return date.getDate() + " " + this.MONTHS[date.getMonth()] + " " + this.DAYS[date.getDay()];
  },

  fetchJSON: async function (path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error("Veri yüklenemedi: " + path);
    return response.json();
  },

  haversineKm: function (lat1, lon1, lat2, lon2) {
    const toRad = function (d) { return (d * Math.PI) / 180; };
    const r = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  minutesAway: function (km, speedKmh) {
    if (!speedKmh) speedKmh = 28;
    return Math.max(1, Math.round((km / speedKmh) * 60));
  }
};
