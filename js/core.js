(function () {
  const nav = document.querySelector(".site-nav");
  const toggle = document.querySelector(".nav-toggle");

  function setNavOpen(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNavOpen(!nav.classList.contains("open"));
    });
  }

  document.addEventListener("click", function (event) {
    if (!nav || !nav.classList.contains("open")) return;
    if (nav.contains(event.target) || (toggle && toggle.contains(event.target))) return;
    setNavOpen(false);
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
  },

  _scrollLocks: 0,
  _scrollY: 0,

  lockScroll: function () {
    this._scrollLocks += 1;
    if (this._scrollLocks !== 1) return;
    this._scrollY = window.scrollY || window.pageYOffset;
    document.body.classList.add("scroll-locked");
    document.body.style.top = "-" + this._scrollY + "px";
    document.documentElement.style.overflow = "hidden";
  },

  unlockScroll: function () {
    this._scrollLocks = Math.max(0, this._scrollLocks - 1);
    if (this._scrollLocks !== 0) return;
    document.body.classList.remove("scroll-locked");
    document.body.style.top = "";
    document.documentElement.style.overflow = "";
    window.scrollTo(0, this._scrollY || 0);
  }
};
