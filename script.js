document.addEventListener('DOMContentLoaded', () => {
  setupHamburgerMenu();
  setupCardClicks();
  loadSection('bosh_sahifa'); // Dastlabki sahifa
});

// Hamburger menyuni ochib-yopish
function setupHamburgerMenu() {
  const menuButton = document.getElementById('menu-button');
  const sidebar = document.getElementById('sidebar');

  if (menuButton && sidebar) {
    menuButton.addEventListener('click', () => {
      const isOpen = sidebar.style.left === '0px';
      sidebar.style.left = isOpen ? '-250px' : '0px';
    });
  } else {
    console.warn("❌ Menu button yoki sidebar topilmadi.");
  }
}

// Kartochkalarni bosganda sahifa ochish
function setupCardClicks() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const onclickAttr = card.getAttribute('onclick');
      if (onclickAttr) {
        if (onclickAttr.includes('loadSection')) {
          const sectionId = onclickAttr.match(/'([^']+)'/)[1];
          loadSection(sectionId);
        } else if (onclickAttr.includes('showSubSection')) {
          const subId = onclickAttr.match(/'([^']+)'/)[1];
          showSubSection(subId);
        }
      }
    });
  });
}

function loadSection(sectionId) {
  // Barcha bo‘limlarni yashirish
  const allSections = document.querySelectorAll('.section');
  allSections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
  });

  // Tanlangan bo‘limni ko‘rsatish
  const selected = document.getElementById(sectionId);
  if (selected) {
      selected.style.display = 'block';
      selected.classList.add('active');

      // Qur'on bo‘limi uchun sura ro‘yxatini ko‘rsatish
      if (sectionId === 'quron') {
          displaySuraList();
      }

      // Faqat namoz bo‘limida namoz ko‘rsatilsin
      const prayerTimesDisplay = document.getElementById('prayerTimesDisplay');
      if (prayerTimesDisplay) {
          if (sectionId === 'namoz_vaqtlari') {
              prayerTimesDisplay.style.display = 'block';
          } else {
              prayerTimesDisplay.style.display = 'none';
          }
      }

      // Sidebar yopish
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.getElementById('menu-button');
      if (sidebar) sidebar.style.left = '-250px';
      if (menuButton) menuButton.style.display = 'block';
  } else {
      console.warn("❌ Bo‘lim topilmadi:", sectionId);
  }
}


// Ichki bo‘limlarni ko‘rsatish
function showSubSection(id) {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.style.display = 'none';
    section.classList.remove('active');
  });

  const selected = document.getElementById(id);
  if (selected) {
    selected.style.display = 'block';
    selected.classList.add('active');
  } else {
    console.warn("❌ Ichki bo‘lim topilmadi:", id);
  }

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-button');
  if (sidebar) sidebar.style.left = '-250px';
  if (menuButton) menuButton.style.display = 'block';
}

// Minutlarni qo'shish
function addMinutes(timeStr, minutes) {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return formatTime(newHours + newMins / 60);
}

// Quyosh deklinatsiyasi
function getSunDeclination(jd) {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lambda = deg2rad(L + 1.915 * Math.sin(deg2rad(g)));
  const declination = Math.asin(Math.sin(deg2rad(23.45)) * Math.sin(lambda)) * 180 / Math.PI;
  return declination;
}

// Asr vaqtini hisoblash
function getAsrTime(date, lat, lon, timezone) {
  const jd = getJulianDate(date);
  const equation = getEquationOfTime(jd);
  const declination = getSunDeclination(jd);
  const noon = 12 - lon / 15 - equation / 60 + timezone;

  // Hanafiy mazhabiga ko'ra (soyaning uzunligi = 2 * ob'ekt balandligi)
  const factor = 2;
  const angle = Math.atan(1 / (factor + Math.tan(deg2rad(Math.abs(lat - declination))))) * 180 / Math.PI;

  const hourAngle = Math.acos((Math.sin(deg2rad(angle)) - Math.sin(deg2rad(lat)) * Math.sin(deg2rad(declination))) / 
                              (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(declination)))) * 12 / Math.PI;

  return formatTime(noon + hourAngle);
}

// Namoz vaqtlarini hisoblash algoritmi
function getPrayerTimes(date, lat, lon, timezone) {
  const times = {};

  // Quyosh vaqtlarini hisoblash
  const sunTimes = getSunTimes(date, lat, lon, timezone);

  // Namoz vaqtlarini belgilash
  times.fajr = addMinutes(sunTimes.sunrise, -90); // Bomdod - quyosh chiqishidan 90 daqiqa oldin
  times.sunrise = sunTimes.sunrise; // Quyosh chiqishi
  times.dhuhr = addMinutes(sunTimes.noon, 5); // Peshin - quyosh zenitdan 5 daqiqa keyin
  times.asr = getAsrTime(date, lat, lon, timezone); // Asr
  times.maghrib = addMinutes(sunTimes.sunset, 5); // Shom - quyosh botgandan 5 daqiqa keyin
  times.isha = addMinutes(sunTimes.sunset, 90); // Xufton - quyosh botgandan 90 daqiqa keyin

  return times;
}

// Quyosh vaqtlarini hisoblash
function getSunTimes(date, lat, lon, timezone) {
  const jd = getJulianDate(date);
  const equation = getEquationOfTime(jd);
  const declination = getSunDeclination(jd);

  // Quyosh chiqishi va botishi burchagi
  const angle = -0.833; // standart quyosh burchagi

  // Vaqtlarni hisoblash
  const noon = 12 - lon / 15 - equation / 60 + timezone;
  const hourAngle = Math.acos((Math.sin(deg2rad(angle)) - Math.sin(deg2rad(lat)) * Math.sin(deg2rad(declination))) / 
                              (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(declination)))) * 12 / Math.PI;

  const sunrise = noon - hourAngle;
  const sunset = noon + hourAngle;

  return {
    sunrise: formatTime(sunrise),
    noon: formatTime(noon),
    sunset: formatTime(sunset)
  };
}

// Equation of time
function getEquationOfTime(jd) {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = deg2rad((357.528 + 0.9856003 * n) % 360);
  const equation = 4 * (L - 0.0057183 - Math.atan2(Math.tan(deg2rad(L - 1.915 * Math.sin(g))), 1) * 180 / Math.PI);
  return equation;
}

// Barcha viloyatlar va ularning tuman/shaharlari
const regions = {
  andijon: {
    name: "Andijon",
    cities: {
      "andijon-shahri": { name: "Andijon shahri", lat: 40.7821, lon: 72.3442 },
      "asaka": { name: "Asaka", lat: 40.6411, lon: 72.2397 },
      "baliqchi": { name: "Baliqchi", lat: 40.8670, lon: 72.3360 },
      "boz": { name: "Bo'z", lat: 40.8108, lon: 72.5808 },
      "buloqboshi": { name: "Buloqboshi", lat: 40.6189, lon: 72.4556 },
      "boston": { name: "Bo'ston", lat: 40.6389, lon: 72.8097 },
      "izboskan": { name: "Izboskan", lat: 40.9264, lon: 72.2314 },
      "jalaquduq": { name: "Jalaquduq", lat: 40.7334, lon: 72.6104 },
      "xojaobod": { name: "Xo'jaobod", lat: 40.6847, lon: 72.5561 },
      "qorgontepa": { name: "Qo'rg'ontepa", lat: 40.7303, lon: 72.7619 },
      "marhamat": { name: "Marhamat", lat: 40.4844, lon: 72.3136 },
      "oltinkol": { name: "Oltinko'l", lat: 40.7822, lon: 72.1558 },
      "paxtaobod": { name: "Paxtaobod", lat: 40.9506, lon: 72.4761 },
      "shahrixon": { name: "Shahrixon", lat: 40.7156, lon: 72.0589 },
      "ulignar": { name: "Ulug'nor", lat: 40.7792, lon: 71.6564 },
      "xonobod": { name: "Xonobod shahri", lat: 40.8133, lon: 72.9883 },
      "qorasuv": { name: "Qorasuv", lat: 40.7242, lon: 72.8858 }
    }
  },
  namangan: {
    name: "Namangan",
    cities: {
      "namangan-shahri": { name: "Namangan shahri", lat: 40.9983, lon: 71.6726 },
      "chortoq": { name: "Chortoq", lat: 41.0697, lon: 71.8253 },
      "chust": { name: "Chust", lat: 41.0033, lon: 71.2378 },
      "kosonsoy": { name: "Kosontoy", lat: 41.2459, lon: 71.5537 },
      "mingbuloq": { name: "Mingbuloq", lat: 40.7833, lon: 71.3667 },
      "norin": { name: "Norin", lat: 40.9044, lon: 72.0719 },
      "pop": { name: "Pop", lat: 40.8736, lon: 71.1089 },
      "torakorgan": { name: "To'raqo'rg'on", lat: 40.9989, lon: 71.5142 },
      "uchkorgan": { name: "Uchqo'rg'on", lat: 41.1133, lon: 72.0789 },
      "uychi": { name: "Uychi", lat: 41.0803, lon: 71.9231 },
      "yangiqorgon": { name: "Yangiqo'rg'on", lat: 41.1953, lon: 71.7169 },
      "davlatobod": { name: "Davlatobod", lat: 40.8922, lon: 71.6306 },
      "yangiboston": { name: "Yangi Bo'ston", lat: 40.8456, lon: 71.4667 }
    }
  },
  fargona: {
    name: "Farg'ona",
    cities: {
      "fargona-shahri": { name: "Farg'ona shahri", lat: 40.3864, lon: 71.7864 },
      "beshariq": { name: "Beshariq", lat: 40.4369, lon: 70.6103 },
      "buvayda": { name: "Buvayda", lat: 40.6181, lon: 71.9064 },
      "dangara": { name: "Dang'ara", lat: 40.5792, lon: 70.9389 },
      "furqat": { name: "Furqat", lat: 40.5267, lon: 71.7044 },
      "qoshtepa": { name: "Qo'shtepa", lat: 40.5219, lon: 71.6733 },
      "quva": { name: "Quva", lat: 40.5222, lon: 72.0778 },
      "rishton": { name: "Rishton", lat: 40.3569, lon: 71.2847 },
      "sox": { name: "So'x", lat: 39.9672, lon: 71.1289 },
      "toshloq": { name: "Toshloq", lat: 40.5153, lon: 71.7703 },
      "uchkoprik": { name: "Uchko'prik", lat: 40.5275, lon: 71.0272 },
      "oltiariq": { name: "Oltiariq", lat: 40.3944, lon: 71.4744 },
      "yozyovon": { name: "Yozyovon", lat: 40.6417, lon: 71.6819 },
      "bagdod": { name: "Bag'dod", lat: 40.4872, lon: 71.1936 },
      "ozbekiston": { name: "O'zbekiston", lat: 40.5469, lon: 71.2406 }
    }
  },
  toshkent: {
    name: "Toshkent",
    cities: {
      "toshkent-shahri": { name: "Toshkent shahri", lat: 41.2995, lon: 69.2401 },
      "angren": { name: "Angren", lat: 41.0167, lon: 70.1431 },
      "bekobod": { name: "Bekobod", lat: 40.2206, lon: 69.2694 },
      "bostonliq": { name: "Bo'stonliq", lat: 41.2925, lon: 69.8347 },
      "chinoz": { name: "Chinoz", lat: 40.9386, lon: 68.7708 },
      "qibray": { name: "Qibray", lat: 41.3625, lon: 69.4597 },
      "ohangaron": { name: "Ohangaron", lat: 40.9064, lon: 69.6378 },
      "oqqorgon": { name: "Oqqo'rg'on", lat: 40.8078, lon: 69.0417 },
      "parkent": { name: "Parkent", lat: 41.2947, lon: 69.6761 },
      "piskent": { name: "Piskent", lat: 40.8914, lon: 69.3486 },
      "yangiyer": { name: "Yangiyer", lat: 40.2750, lon: 68.8222 },
      "yangiyol": { name: "Yangiyol", lat: 41.1119, lon: 69.0472 },
      "yuqori-chirchiq": { name: "Yuqori Chirchiq", lat: 41.1908, lon: 69.5822 },
      "zangiota": { name: "Zangiota", lat: 41.1917, lon: 69.1617 },
      "quyichirchiq": { name: "Quyi Chirchiq", lat: 41.0797, lon: 69.5828 }
    }
  },
  sirdaryo: {
    name: "Sirdaryo",
    cities: {
      "guliston": { name: "Guliston", lat: 40.4897, lon: 68.7842 },
      "yangiyer-shahri": { name: "Yangiyer shahri", lat: 40.2750, lon: 68.8222 },
      "shirin": { name: "Shirin", lat: 40.2350, lon: 68.9911 },
      "boyovut": { name: "Boyovut", lat: 40.0386, lon: 68.9578 },
      "guliston-tumani": { name: "Guliston tumani", lat: 40.4833, lon: 68.6667 },
      "xovos": { name: "Xovos", lat: 40.5033, lon: 68.8233 },
      "mirzaobod": { name: "Mirzaobod", lat: 40.4764, lon: 68.6772 },
      "oqoltin": { name: "Oqoltin", lat: 40.5833, lon: 68.4167 },
      "sardoba": { name: "Sardoba", lat: 40.5333, lon: 68.4833 },
      "sayxunobod": { name: "Sayxunobod", lat: 40.3647, lon: 68.6944 },
      "sirdaryo-tumani": { name: "Sirdaryo tumani", lat: 40.8408, lon: 68.6614 }
    }
  },
  jizzax: {
    name: "Jizzax",
    cities: {
      "jizzax-shahri": { name: "Jizzax shahri", lat: 40.1158, lon: 67.8422 },
      "arnasoy": { name: "Arnasoy", lat: 40.5500, lon: 67.9333 },
      "baxmal": { name: "Baxmal", lat: 39.7756, lon: 67.7503 },
      "dostlik": { name: "Do'stlik", lat: 40.5225, lon: 68.0428 },
      "forish": { name: "Forish", lat: 40.7050, lon: 67.1875 },
      "galla-orol": { name: "G'allaorol", lat: 40.1167, lon: 67.3167 },
      "mirzachul": { name: "Mirzacho'l", lat: 40.7469, lon: 68.0944 },
      "paxtakor": { name: "Paxtakor", lat: 40.3153, lon: 67.9533 },
      "yangiobod": { name: "Yangiobod", lat: 40.0461, lon: 68.0194 },
      "zafarobod": { name: "Zafarobod", lat: 40.4261, lon: 67.7878 },
      "zarband": { name: "Zarbdor", lat: 40.2258, lon: 67.2458 },
      "zomin": { name: "Zomin", lat: 39.8961, lon: 68.3964 }
    }
  },
  navoiy: {
    name: "Navoiy",
    cities: {
      "navoiy-shahri": { name: "Navoiy shahri", lat: 40.0844, lon: 65.3792 },
      "zarafshon": { name: "Zarafshon", lat: 41.5597, lon: 64.2075 },
      "karmana": { name: "Karmana", lat: 40.1353, lon: 65.4125 },
      "konimex": { name: "Konimex", lat: 40.2903, lon: 65.2058 },
      "navbahor": { name: "Navbahor", lat: 40.2294, lon: 64.9319 },
      "nurota": { name: "Nurota", lat: 40.5614, lon: 65.6886 },
      "qiziltepa": { name: "Qiziltepa", lat: 40.0333, lon: 64.8500 },
      "tomdi": { name: "Tomdi", lat: 42.2308, lon: 64.6183 },
      "uchquduq": { name: "Uchquduq", lat: 42.1556, lon: 63.5556 },
      "xatirchi": { name: "Xatirchi", lat: 40.2264, lon: 65.7528 },
      "yangirabad": { name: "Yangirabod", lat: 40.0167, lon: 65.3833 }
    }
  },
  qashqadaryo: {
    name: "Qashqadaryo",
    cities: {
      "qarshi-shahri": { name: "Qarshi shahri", lat: 38.8628, lon: 65.7989 },
      "shahrisabz": { name: "Shahrisabz", lat: 39.0578, lon: 66.8342 },
      "chiroqchi": { name: "Chiroqchi", lat: 39.0339, lon: 66.5719 },
      "dehqonobod": { name: "Dehqonobod", lat: 38.3522, lon: 66.4606 },
      "guzor": { name: "G'uzor", lat: 38.6206, lon: 66.2481 },
      "kasbi": { name: "Kasbi", lat: 39.0817, lon: 65.7531 },
      "kitob": { name: "Kitob", lat: 39.0819, lon: 66.8758 },
      "koson": { name: "Koson", lat: 39.0378, lon: 65.5853 },
      "mirishkor": { name: "Mirishkor", lat: 38.8667, lon: 64.3000 },
      "muborak": { name: "Muborak", lat: 39.2553, lon: 65.1528 },
      "nishon": { name: "Nishon", lat: 38.5672, lon: 65.5328 },
      "qamashi": { name: "Qamashi", lat: 38.7917, lon: 66.6089 },
      "yakkabog": { name: "Yakkabog'", lat: 38.9103, lon: 66.7783 }
    }
  },
  surxondaryo: {
    name: "Surxondaryo",
    cities: {
      "termiz": { name: "Termiz", lat: 37.2242, lon: 67.2783 },
      "angor": { name: "Angor", lat: 37.5333, lon: 67.2667 },
      "bandixon": { name: "Bandixon", lat: 37.8075, lon: 68.7517 },
      "boysun": { name: "Boysun", lat: 38.2056, lon: 67.2036 },
      "denov": { name: "Denov", lat: 38.2675, lon: 67.8919 },
      "jarqorgon": { name: "Jarqo'rg'on", lat: 37.4989, lon: 67.4117 },
      "qiziriq": { name: "Qiziriq", lat: 37.8667, lon: 68.2833 },
      "qumqorgon": { name: "Qumqo'rg'on", lat: 37.8342, lon: 67.5772 },
      "muzrabot": { name: "Muzrabot", lat: 37.2803, lon: 67.0486 },
      "oltinsoy": { name: "Oltinsoy", lat: 37.0833, lon: 67.7833 },
      "sariosiyo": { name: "Sariosiyo", lat: 38.4186, lon: 67.9606 },
      "sherobod": { name: "Sherobod", lat: 37.6672, lon: 67.0356 },
      "shorchi": { name: "Sho'rchi", lat: 37.9997, lon: 67.7875 },
      "termiz-tumani": { name: "Termiz tumani", lat: 37.3333, lon: 67.1667 },
      "uzun": { name: "Uzun", lat: 38.3478, lon: 68.0258 }
    }
  },
  samarqand: {
    name: "Samarqand",
    cities: {
      "samarqand-shahri": { name: "Samarqand shahri", lat: 39.6542, lon: 66.9597 },
      "kattakorgon": { name: "Kattako'rg'on", lat: 39.8989, lon: 66.2561 },
      "bulungur": { name: "Bulung'ur", lat: 39.7667, lon: 67.2667 },
      "ishtixon": { name: "Ishtixon", lat: 39.9789, lon: 66.4861 },
      "jomboy": { name: "Jomboy", lat: 39.6925, lon: 67.0931 },
      "kattakorgon-tumani": { name: "Kattaqo'rg'on tumani", lat: 39.8333, lon: 66.2500 },
      "narpay": { name: "Narpay", lat: 39.4594, lon: 66.0731 },
      "nurobod": { name: "Nurobod", lat: 40.0086, lon: 66.0283 },
      "oqdaryo": { name: "Oqdaryo", lat: 39.8167, lon: 66.6667 },
      "paxtachi": { name: "Paxtachi", lat: 39.1519, lon: 65.9297 },
      "pastdargom": { name: "Pastdarg'om", lat: 39.6950, lon: 66.6125 },
      "poyariq": { name: "Poyariq", lat: 39.9944, lon: 66.8056 },
      "samarqand-tumani": { name: "Samarqand tumani", lat: 39.6278, lon: 66.9047 },
      "toyloq": { name: "Toyloq", lat: 39.5833, lon: 67.2500 },
      "urgut": { name: "Urgut", lat: 39.4022, lon: 67.2433 }
    }
  },
  buxoro: {
    name: "Buxoro",
    cities: {
      "buxoro-shahri": { name: "Buxoro shahri", lat: 39.7750, lon: 64.4286 },
      "kogon": { name: "Kogon", lat: 39.7231, lon: 64.5517 },
      "olot": { name: "Olot", lat: 39.2833, lon: 63.8333 },
      "buxoro-tumani": { name: "Buxoro tumani", lat: 39.7667, lon: 64.5333 },
      "gijduvon": { name: "G'ijduvon", lat: 40.1000, lon: 64.6833 },
      "jondor": { name: "Jondor", lat: 39.7667, lon: 63.5667 },
      "kogon-tumani": { name: "Kogon tumani", lat: 39.7667, lon: 64.5333 },
      "qorakol": { name: "Qorako'l", lat: 39.4833, lon: 63.8500 },
      "qorovulbozor": { name: "Qorovulbozor", lat: 39.5000, lon: 64.7000 },
      "peshko": { name: "Peshko", lat: 40.3667, lon: 63.8833 },
      "romitan": { name: "Romitan", lat: 40.7333, lon: 64.3833 },
      "shofirkon": { name: "Shofirkon", lat: 40.1200, lon: 64.5014 },
      "vobkent": { name: "Vobkent", lat: 40.0306, lon: 64.5153 }
    }
  },
  xorazm: {
    name: "Xorazm",
    cities: {
      "urganch": { name: "Urganch", lat: 41.5534, lon: 60.6313 },
      "xiva": { name: "Xiva", lat: 41.3783, lon: 60.3639 },
      "bagot": { name: "Bog'ot", lat: 41.8000, lon: 60.8667 },
      "gurlan": { name: "Gurlan", lat: 41.8453, lon: 60.3919 },
      "xonqa": { name: "Xonqa", lat: 41.4564, lon: 60.8033 },
      "xazorasp": { name: "Xazorasp", lat: 41.3194, lon: 61.0742 },
      "xiva-tumani": { name: "Xiva tumani", lat: 41.3911, lon: 60.3572 },
      "qoshkopir": { name: "Qo'shko'pir", lat: 41.5350, lon: 60.3458 },
      "shovot": { name: "Shovot", lat: 41.6553, lon: 60.3025 },
      "urganch-tumani": { name: "Urganch tumani", lat: 41.7331, lon: 60.5256 },
      "yangiariq": { name: "Yangiariq", lat: 41.3492, lon: 60.5600 },
      "yangibozor": { name: "Yangibozor", lat: 41.1953, lon: 60.5956 },
      "tupproqqala": { name: "Tupproqqal'a", lat: 41.9275, lon: 60.8144 }
    }
  },
  qoraqalpogiston: {
    name: "Qoraqalpog'iston",
    cities: {
      "nukus": { name: "Nukus", lat: 42.4531, lon: 59.6103 },
      "amudaryo": { name: "Amudaryo", lat: 41.7414, lon: 60.9592 },
      "beruniy": { name: "Beruniy", lat: 41.6914, lon: 60.7522 },
      "chimboy": { name: "Chimboy", lat: 42.9389, lon: 59.7711 },
      "ellikqala": { name: "Ellikqal'a", lat: 41.8992, lon: 60.8256 },
      "kegeyli": { name: "Kegeyli", lat: 42.7764, lon: 59.6078 },
      "moynoq": { name: "Mo'ynoq", lat: 43.7686, lon: 59.0214 },
      "nukus-tumani": { name: "Nukus tumani", lat: 42.5742, lon: 59.6861 },
      "qanlikor": { name: "Qanliyo'l", lat: 42.9178, lon: 59.4211 },
      "qorauzyak": { name: "Qorao'zek", lat: 42.8486, lon: 58.7869 },
      "qongrat": { name: "Qo'ng'irot", lat: 43.0833, lon: 58.9167 },
      "shumanay": { name: "Shumanay", lat: 42.1006, lon: 58.9492 },
      "taxtakopir": { name: "Taxtako'pir", lat: 42.9189, lon: 58.8344 },
      "tortkol": { name: "To'rtko'l", lat: 41.5500, lon: 61.0167 },
      "xujayili": { name: "Xo'jayli", lat: 42.4011, lon: 59.4600 }
    }
  }
};

// Sanalarni ko'rsatish
function showCurrentDate() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const currentDateEl = document.getElementById('currentDate');
  if (currentDateEl) {
    currentDateEl.textContent = today.toLocaleDateString('uz-UZ', options);
  }
}

// Hijriy sanani hisoblash
function getHijriDate() {
  const today = new Date();
  const hijriStart = new Date(622, 6, 16);
  const diffTime = Math.abs(today - hijriStart);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hijriYear = Math.floor(diffDays / 354.36667) + 1;
  const hijriMonth = Math.floor((diffDays % 354.36667) / 29.53) + 1;
  const hijriDay = Math.floor((diffDays % 354.36667) % 29.53) + 1;

  const hijriMonths = [
    "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
    "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
  ];

  const hijriDateEl = document.getElementById('hijriDate');
  if (hijriDateEl) {
    hijriDateEl.textContent = `${hijriDay} ${hijriMonths[hijriMonth - 1]} ${hijriYear} yil (Hijriy)`;
  }
}

// Graduslarni radianlarga o'girish
function deg2rad(deg) {
  return deg * Math.PI / 180;
}

// Vaqtni formatlash
function formatTime(hours) {
  if (hours < 0) hours += 24;
  if (hours >= 24) hours -= 24;

  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Julian sanani hisoblash
function getJulianDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// Quyosh parametrlarini hisoblash
function getSunPosition(jd) {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lambda = L + 1.915 * Math.sin(deg2rad(g)) + 0.020 * Math.sin(deg2rad(2 * g));

  const epsilon = 23.439 - 0.0000004 * n;
  const alpha = Math.atan2(Math.cos(deg2rad(epsilon)) * Math.sin(deg2rad(lambda)), Math.cos(deg2rad(lambda)));
  const delta = Math.asin(Math.sin(deg2rad(epsilon)) * Math.sin(deg2rad(lambda)));

  return {
    declination: delta * 180 / Math.PI,
    equation: 4 * (L - 0.0057183 - alpha * 180 / Math.PI)
  };
}

// Namoz vaqtlarini hisoblash
function calculatePrayerTimes(lat, lon) {
  const date = new Date();
  const timezone = 5; // O'zbekiston UTC+5
  const jd = getJulianDate(date);
  const sunPos = getSunPosition(jd);
  const decl = sunPos.declination;
  const eqt = sunPos.equation;

  // Peshin vaqti
  const dhuhr = 12 + timezone - lon / 15 - eqt / 60;

  // Quyosh chiqishi va botishi
  const sunAngle = -0.833;
  const sunArc = Math.acos(-Math.tan(deg2rad(lat)) * Math.tan(deg2rad(decl))) * 180 / Math.PI / 15;
  const sunrise = dhuhr - sunArc;
  const sunset = dhuhr + sunArc;

  // Bomdod (Fajr) - 18 gradus
  const fajrAngle = -18;
  const fajrArc = Math.acos((Math.sin(deg2rad(fajrAngle)) - Math.sin(deg2rad(lat)) * Math.sin(deg2rad(decl))) / 
                            (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(decl)))) * 180 / Math.PI / 15;
  const fajr = dhuhr - fajrArc;

  // Asr
  const asrAngle = Math.atan(1 / (2 + Math.tan(deg2rad(Math.abs(lat - decl))))) * 180 / Math.PI;
  const asrArc = Math.acos((Math.sin(deg2rad(asrAngle)) - Math.sin(deg2rad(lat)) * Math.sin(deg2rad(decl))) / 
                           (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(decl)))) * 180 / Math.PI / 15;
  const asr = dhuhr + asrArc;

  // Shom (Maghrib) - quyosh botgandan 3 daqiqa keyin
  const maghrib = sunset + 0.05;

  // Xufton (Isha) - 17 gradus
  const ishaAngle = -17;
  const ishaArc = Math.acos((Math.sin(deg2rad(ishaAngle)) - Math.sin(deg2rad(lat)) * Math.sin(deg2rad(decl))) / 
                            (Math.cos(deg2rad(lat)) * Math.cos(deg2rad(decl)))) * 180 / Math.PI / 15;
  const isha = dhuhr + ishaArc;

  // Vaqtlarni formatlash va ko'rsatish
  const times = {
    fajr: formatTime(fajr),
    sunrise: formatTime(sunrise),
    dhuhr: formatTime(dhuhr + 0.05),
    asr: formatTime(asr),
    maghrib: formatTime(maghrib),
    isha: formatTime(isha)
  };

  // DOM elementlarni yangilash
  const fajrTime = document.getElementById('fajrTime');
  const sunriseTime = document.getElementById('sunriseTime');
  const dhuhrTime = document.getElementById('dhuhrTime');
  const asrTime = document.getElementById('asrTime');
  const maghribTime = document.getElementById('maghribTime');
  const ishaTime = document.getElementById('ishaTime');

  if (fajrTime) fajrTime.textContent = times.fajr;
  if (sunriseTime) sunriseTime.textContent = times.sunrise;
  if (dhuhrTime) dhuhrTime.textContent = times.dhuhr;
  if (asrTime) asrTime.textContent = times.asr;
  if (maghribTime) maghribTime.textContent = times.maghrib;
  if (ishaTime) ishaTime.textContent = times.isha;

  // Keyingi namozni yangilash
  updateNextPrayer(times);
}

// Keyingi namozni aniqlash va qolgan vaqtni hisoblash
function updateNextPrayer(times) {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  const prayers = [
    { name: "Bomdod", time: times.fajr },
    { name: "Quyosh", time: times.sunrise },
    { name: "Peshin", time: times.dhuhr },
    { name: "Asr", time: times.asr },
    { name: "Shom", time: times.maghrib },
    { name: "Xufton", time: times.isha }
  ];

  let nextPrayer = null;
  let nextPrayerMinutes = null;

  // Bugungi namozlarni tekshirish
  for (const prayer of prayers) {
    const [h, m] = prayer.time.split(':').map(Number);
    const prayerMinutes = h * 60 + m;

    if (prayerMinutes > currentTimeInMinutes) {
      nextPrayer = prayer.name;
      nextPrayerMinutes = prayerMinutes;
      break;
    }
  }

  // Agar bugun barcha namozlar o'tgan bo'lsa
  if (!nextPrayer) {
    nextPrayer = prayers[0].name; // Ertangi bomdod
    const [h, m] = prayers[0].time.split(':').map(Number);
    nextPrayerMinutes = (24 * 60) + (h * 60 + m);
  }

  // Qolgan vaqtni hisoblash
  const remainingMinutes = nextPrayerMinutes - currentTimeInMinutes;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  // DOM ni yangilash
  const nextPrayerEl = document.getElementById('nextPrayer');
  const timeRemainingEl = document.getElementById('timeRemaining');

  if (nextPrayerEl) {
    nextPrayerEl.textContent = nextPrayer;
  }

  if (timeRemainingEl) {
    timeRemainingEl.textContent = `${hours} soat ${minutes} daqiqa`;
  }
}

// DOM yuklanganda
document.addEventListener('DOMContentLoaded', function() {
  // Elementlarni olish
  const regionSelect = document.getElementById('regionSelect');
  const citySelect = document.getElementById('citySelect');
  const prayerTimesDisplay = document.getElementById('prayerTimesDisplay');
  const selectedLocation = document.getElementById('selectedLocation');
  const searchInput = document.getElementById('suraSearch');
  const searchBtn = document.getElementById('searchBtn');

  // Sanalarni ko'rsatish
  showCurrentDate();
  getHijriDate();

  // Viloyat tanlanganda
  if (regionSelect) {
    regionSelect.addEventListener('change', function() {
      const selectedRegion = this.value;

      if (citySelect) {
        citySelect.innerHTML = '<option value="">Tuman/Shaharni tanlang</option>';
        citySelect.disabled = true;
      }

      if (prayerTimesDisplay) {
        prayerTimesDisplay.style.display = 'none';
      }

      if (selectedRegion && regions[selectedRegion]) {
        if (citySelect) {
          citySelect.disabled = false;
          const cities = regions[selectedRegion].cities;

          for (const cityKey in cities) {
            const option = document.createElement('option');
            option.value = cityKey;
            option.textContent = cities[cityKey].name;
            citySelect.appendChild(option);
          }
        }
      }
    });
  }

  // Shahar tanlanganda
  if (citySelect) {
    citySelect.addEventListener('change', function() {
      const selectedRegion = regionSelect ? regionSelect.value : '';
      const selectedCity = this.value;

      if (selectedRegion && selectedCity) {
        const cityData = regions[selectedRegion].cities[selectedCity];

        if (selectedLocation) {
          selectedLocation.textContent = `${regions[selectedRegion].name} - ${cityData.name}`;
        }

        // Namoz vaqtlarini hisoblash
        calculatePrayerTimes(cityData.lat, cityData.lon);

        if (prayerTimesDisplay) {
          prayerTimesDisplay.style.display = 'block';
        }
      }
    });
  }

  // Qidiruv funksiyasi
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.toLowerCase();
      const filteredSurahs = surahs.filter(surah =>
        surah.name.toLowerCase().includes(query) ||
        surah.arabicName.includes(query) ||
        surah.meaning.toLowerCase().includes(query)
      );
      suraList.innerHTML = '';
      filteredSurahs.forEach(surah => {
        const suraItem = document.createElement('div');
        suraItem.className = 'sura-item';
        suraItem.innerHTML = `
          <div class="sura-name">
            <span class="sura-number">${surah.id}</span>
            <div>
              <div class="sura-name-latin">${surah.name}</div>
              <div style="font-size: 14px; color: #666;">${surah.meaning}</div>
            </div>
            <div class="sura-name-arabic">${surah.arabicName}</div>
          </div>
          <div class="sura-meta">
            <span>${surah.place}</span>
            <span>${surah.ayahCount} oyat</span>
          </div>
        `;
        suraItem.onclick = () => showSura(surah);
        suraList.appendChild(suraItem);
      });
    });
  }

  // Har daqiqa yangilab turish
  setInterval(function() {
    const regionSelectEl = document.getElementById('regionSelect');
    const citySelectEl = document.getElementById('citySelect');

    if (regionSelectEl && citySelectEl) {
      const selectedRegion = regionSelectEl.value;
      const selectedCity = citySelectEl.value;

      if (selectedRegion && selectedCity && regions[selectedRegion]) {
        const cityData = regions[selectedRegion].cities[selectedCity];
        if (cityData) {
          calculatePrayerTimes(cityData.lat, cityData.lon);
        }
      }
    }
  }, 60000); // Har 60 sekund (1 daqiqa)
});

// Qur'on bo'limi

const surahs = [
  {
    "id": 1,
    "name": "Al-Fatiha",
    "arabicName": "الفاتحة",
    "meaning": "Ochuvchi 🔑",
    "ayahCount": 7,
    "place": "Makka 🕋",
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
        "transcription": "bismi llāhi r-raḥmāni r-raḥīm",
        "translation": "Mehribon va rahmli Allohning nomi bilan.",
        "tafsir": "Har bir ishni Allohning nomi bilan boshlash.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
        "transcription": "al-ḥamdu lillāhi rabbi l-ʿālamīn",
        "translation": "Barcha hamd olamlar Rabbi Allohga xosdir.",
        "tafsir": "Allohga shukr va hamd aytish.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
        "transcription": "ar-raḥmāni r-raḥīm",
        "translation": "Mehribon va rahmli Zot.",
        "tafsir": "Allohning rahmat sifatlari.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "مَـٰلِكِ يَوْمِ ٱلدِّينِ",
        "transcription": "māliki yawmi d-dīn",
        "translation": "Qiyomat kunining egasi.",
        "tafsir": "Allohning qiyomat kunidagi hakimiyati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
        "transcription": "iyyāka naʿbudu wa iyyāka nastaʿīn",
        "translation": "Faqat Senga ibodat qilamiz va faqat Sendan yordam so'raymiz.",
        "tafsir": "Allohga yagona ibodat va Undan yordam so'rash.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
        "transcription": "ihdinā ṣ-ṣirāṭa l-mustaqīm",
        "translation": "Bizni to'g'ri yo'lga hidoyat qil.",
        "tafsir": "To'g'ri yo'l so'rash duosi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
        "transcription": "ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa lā ḍ-ḍāllīn",
        "translation": "Sen ne'mat berganlarning yo'lini, g'azabga uchragan va adashganlarning yo'lini emas.",
        "tafsir": "To'g'ri yo'ldagilar va noto'g'ri yo'ldagilar farqi.",
        "copySymbol": "📋"
      }
    ]
  },
  {
    "id": 2,
    "name": "Al-Baqara",
    "arabicName": "البقرة",
    "meaning": "Sigir 🐄",
    "ayahCount": 286,
    "place": "Madina 🌟",
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "الم",
        "transcription": "alif lām mīm",
        "translation": "Alif, Lom, Mim.",
        "tafsir": "Muqatta'a harflari - faqat Alloh biladi ma'nosini.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "ذَٰلِكَ ٱلْكِتَـٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ",
        "transcription": "dhālika l-kitābu lā rayba fīhi hudal li-l-muttaqīn",
        "translation": "Bu Kitob (Qur'on)da hech shak-shubha yo'q. Taqvodorlar uchun hidoyatdir.",
        "tafsir": "Qur'onning haqiqiy va hidoyat kitob ekanligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ",
        "transcription": "alladhīna yu'minūna bi-l-ghaybi wa yuqīmūna ṣ-ṣalāta wa mimmā razaqnāhum yunfiqūn",
        "translation": "Ular g'aybga iymon keltiradilar, namozni to'kis ado etadilar va Biz ularga bergan rizqdan (Alloh yo'lida) sarflaydlar.",
        "tafsir": "Mo'minlarning asosiy sifatlari.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ وَمَآ أُنزِلَ مِن قَبْلِكَ وَبِٱلْءَاخِرَةِ هُمْ يُوقِنُونَ",
        "transcription": "wa alladhīna yu'minūna bimā unzila ilayka wa mā unzila min qablika wa bi-l-ākhirati hum yūqinūn",
        "translation": "Va ular senga nozil qilingan (Qur'on)ga va sendan oldin nozil qilinganlarga iymon keltiradilar hamda oxiratga yakkin qiladilar.",
        "tafsir": "Barcha samoviy kitoblarga va oxiratga iymon.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "أُو۟لَـٰٓئِكَ عَلَىٰ هُدًۭى مِّن رَّبِّهِمْ ۖ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ",
        "transcription": "ulā'ika ʿalā hudal min rabbihim wa ulā'ika humu l-mufliḥūn",
        "translation": "Mana shular o'z Robbilaridan kelgan hidoyat ustidadirlar va mana shular najot topuvchilardir.",
        "tafsir": "Hidoyat topuvchilarning muvaffaqiyati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "إِنَّ ٱلَّذِينَ كَفَرُوا۟ سَوَآءٌ عَلَيْهِمْ ءَأَنذَرْتَهُمْ أَمْ لَمْ تُنذِرْهُمْ لَا يُؤْمِنُونَ",
        "transcription": "inna alladhīna kafarū sawā'un ʿalayhim a-andhartahum am lam tundhirhum lā yu'minūn",
        "translation": "Kofir bo'lganlar uchun bir xil - ularni ogohlantirsang ham, ogohlantirmasang ham, iymon keltirmaydilar.",
        "tafsir": "Qattiq kofirlarda hidoyat qabul qilmaslik.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "خَتَمَ ٱللَّهُ عَلَىٰ قُلُوبِهِمْ وَعَلَىٰ سَمْعِهِمْ ۖ وَعَلَىٰ أَبْصَـٰرِهِمْ غِشَـٰوَةٌۭ ۖ وَلَهُمْ عَذَابٌ عَظِيمٌۭ",
        "transcription": "khatama llāhu ʿalā qulūbihim wa ʿalā samʿihim wa ʿalā abṣārihim ghishāwatun wa lahum ʿadhābun ʿaẓīm",
        "translation": "Alloh ularning qalblariga va quloqlariga muhr bosgan, ko'zlarida esa parda bor. Ularga azim azob bor.",
        "tafsir": "Kofrning oqibatlari - qalb, quloq va ko'zning yopilishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٨",
        "numberLatin": "8",
        "arabic": "وَمِنَ ٱلنَّاسِ مَن يَقُولُ ءَامَنَّا بِٱللَّهِ وَبِٱلْيَوْمِ ٱلْءَاخِرِ وَمَا هُم بِمُؤْمِنِينَ",
        "transcription": "wa mina n-nāsi man yaqūlu āmannā bi-llāhi wa bi-l-yawmi l-ākhiri wa mā hum bi-mu'minīn",
        "translation": "Odamlar ichida shunday kishilar borki, 'Biz Allohga va oxirat kuniga iymon keltirdik' deydilar, holbuki ular mo'min emaslar.",
        "tafsir": "Munofiqlarning soxta iymoni haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٩",
        "numberLatin": "9",
        "arabic": "يُخَـٰدِعُونَ ٱللَّهَ وَٱلَّذِينَ ءَامَنُوا۟ وَمَا يَخْدَعُونَ إِلَّآ أَنفُسَهُمْ وَمَا يَشْعُرُونَ",
        "transcription": "yukhādiʿūna llāha wa alladhīna āmanū wa mā yakhdaʿūna illā anfusahum wa mā yashʿurūn",
        "translation": "Ular Allohni va mo'minlarni aldamoqchi bo'ladilar, aslida faqat o'zlarini aldaydilar, lekin buni sezmaydilar.",
        "tafsir": "Munofiqlarning o'z-o'zlarini aldashi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٠",
        "numberLatin": "10",
        "arabic": "فِى قُلُوبِهِم مَّرَضٌۭ فَزَادَهُمُ ٱللَّهُ مَرَضًۭا ۖ وَلَهُمْ عَذَابٌ أَلِيمٌۢ بِمَا كَانُوا۟ يَكْذِبُونَ",
        "transcription": "fī qulūbihim maraḍun fa zādahumu llāhu maraḍan wa lahum ʿadhābun alīmun bimā kānū yakdhibūn",
        "translation": "Ularning qalblarida kasallik bor. Alloh ularning kasalligini oshirdi. Yolg'on gapirganlaklari uchun ularga alamli azob bor.",
        "tafsir": "Qalb kasalligi va uning oshib borishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١١",
        "numberLatin": "11",
        "arabic": "وَإِذَا قِيلَ لَهُمْ لَا تُفْسِدُوا۟ فِى ٱلْأَرْضِ قَالُوٓا۟ إِنَّمَا نَحْنُ مُصْلِحُونَ",
        "transcription": "wa idhā qīla lahum lā tufsidū fī l-arḍi qālū innamā naḥnu muṣliḥūn",
        "translation": "Ularga 'Yerda fasod qilmang' deyilganda, 'Biz faqat isloh qiluvchilar ekanmiz' deydilar.",
        "tafsir": "Munofiqlarning o'zlarini oqlash urinishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٢",
        "numberLatin": "12",
        "arabic": "أَلَآ إِنَّهُمْ هُمُ ٱلْمُفْسِدُونَ وَلَـٰكِن لَّا يَشْعُرُونَ",
        "transcription": "alā innahum humu l-mufsidūna wa lākin lā yashʿurūn",
        "translation": "Ogo, ular aynan fasodchilardir, lekin sezmaydilar.",
        "tafsir": "Haqiqiy fasodchilar kimligini ko'rsatish.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٣",
        "numberLatin": "13",
        "arabic": "وَإِذَا قِيلَ لَهُمْ ءَامِنُوا۟ كَمَآ ءَامَنَ ٱلنَّاسُ قَالُوٓا۟ أَنُؤْمِنُ كَمَآ ءَامَنَ ٱلسُّفَهَآءُ ۗ أَلَآ إِنَّهُمْ هُمُ ٱلسُّفَهَآءُ وَلَـٰكِن لَّا يَعْلَمُونَ",
        "transcription": "wa idhā qīla lahum āminū kamā āmana n-nāsu qālū a-nu'minu kamā āmana s-sufahā'u alā innahum humu s-sufahā'u wa lākin lā yaʿlamūn",
        "translation": "Ularga 'Odamlar iymon keltirgandek iymon keltiring' deyilganda, 'Biz ahmoqlar iymon keltirgandek iymon keltiramizmi?' deydilar. Ogo, ular o'zlari ahmoqlardir, lekin bilmaydilar.",
        "tafsir": "Munofiqlarning mo'minlarni kamsitish urinishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٤",
        "numberLatin": "14",
        "arabic": "وَإِذَا لَقُوا۟ ٱلَّذِينَ ءَامَنُوا۟ قَالُوٓا۟ ءَامَنَّا وَإِذَا خَلَوْا۟ إِلَىٰ شَيَـٰطِينِهِمْ قَالُوٓا۟ إِنَّا مَعَكُمْ إِنَّمَا نَحْنُ مُسْتَهْزِءُونَ",
        "transcription": "wa idhā laqū alladhīna āmanū qālū āmannā wa idhā khalaw ilā shayāṭīnihim qālū innā maʿakum innamā naḥnu mustahzi'ūn",
        "translation": "Mo'minlar bilan uchrashaganlarida 'Iymon keltirdik' deydilar. O'zlarining shaytonlari bilan yolg'iz qolganlarida esa 'Biz sizlar bilanmiz, faqat (ulardan) masxara qilyapmiz' deydilar.",
        "tafsir": "Munofiqlarning ikki yuzlamaligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٥",
        "numberLatin": "15",
        "arabic": "ٱللَّهُ يَسْتَهْزِئُ بِهِمْ وَيَمُدُّهُمْ فِى طُغْيَـٰنِهِمْ يَعْمَهُونَ",
        "transcription": "allāhu yastahzi'u bihim wa yamudduhum fī ṭughyānihim yaʿmahūn",
        "translation": "Alloh ulardan masxara qiladi va ularni haddan oshib ketishlariga qoldiradi, ular adashib yuradilar.",
        "tafsir": "Allohning munofiqlarni jazolashi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٦",
        "numberLatin": "16",
        "arabic": "أُو۟لَـٰٓئِكَ ٱلَّذِينَ ٱشْتَرَوُا۟ ٱلضَّلَـٰلَةَ بِٱلْهُدَىٰ فَمَا رَبِحَت تِّجَـٰرَتُهُمْ وَمَا كَانُوا۟ مُهْتَدِينَ",
        "transcription": "ulā'ika alladhīna ishtarawū ḍ-ḍalālata bi-l-hudā fa mā rabiḥat tijāratuhum wa mā kānū muhtadīn",
        "translation": "Mana shular hidoyat o'rniga adashishni sotib olganlardir. Ularning tijorati foyda bermadi va ular hidoyat topuvchi bo'lmadi.",
        "tafsir": "Dalolat tanlashning ziyonkorligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٧",
        "numberLatin": "17",
        "arabic": "مَثَلُهُمْ كَمَثَلِ ٱلَّذِى ٱسْتَوْقَدَ نَارًۭا فَلَمَّآ أَضَآءَتْ مَا حَوْلَهُۥ ذَهَبَ ٱللَّهُ بِنُورِهِمْ وَتَرَكَهُمْ فِى ظُلُمَـٰتٍۢ لَّا يُبْصِرُونَ",
        "transcription": "mathaluhum ka-mathali lladhī istawqada nāran fa lammā aḍā'at mā ḥawlahu dhahaba llāhu bi-nūrihim wa tarakahum fī ẓulumātin lā yubṣirūn",
        "translation": "Ularning misoli olov yoqib, u atrofini yorib bergach, Alloh ularning nurini olib ketgan va ularni qorong'uliklarda ko'r qoldirgan kishiga o'xshaydi.",
        "tafsir": "Munofiqlarning ruhiy holatini tasvir etuvchi misollar.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٨",
        "numberLatin": "18",
        "arabic": "صُمٌّۢ بُكْمٌ عُمْىٌۭ فَهُمْ لَا يَرْجِعُونَ",
        "transcription": "ṣummun bukmun ʿumyun fa hum lā yarjiʿūn",
        "translation": "Ular kar, soqov va ko'r, shuning uchun qaytmaydilar.",
        "tafsir": "Munofiqlarning ma'naviy nochorligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٩",
        "numberLatin": "19",
        "arabic": "أَوْ كَصَيِّبٍۢ مِّنَ ٱلسَّمَآءِ فِيهِ ظُلُمَـٰتٌۭ وَرَعْدٌۭ وَبَرْقٌۭ يَجْعَلُونَ أَصَـٰبِعَهُمْ فِىٓ ءَاذَانِهِم مِّنَ ٱلصَّوَٰعِقِ حَذَرَ ٱلْمَوْتِ ۚ وَٱللَّهُ مُحِيطٌۢ بِٱلْكَـٰفِرِينَ",
        "transcription": "aw ka-ṣayyibin mina s-samā'i fīhi ẓulumātun wa raʿdun wa barqun yajʿalūna aṣābiʿahum fī ādhānihim mina ṣ-ṣawāʿiqi ḥadhara l-mawti wa llāhu muḥīṭun bi-l-kāfirīn",
        "translation": "Yoki osmondagi yomg'ir kabi - unda zulmatlar, momaqaldiroq va chaqmoq bor. Ular momaqaldiroqlardan o'limdan qo'rqib barmoqlarini quloqlariga tiqadilar. Alloh kofirlarni o'rab oluvchidir.",
        "tafsir": "Munofiqlarning vahiy oldidagi qo'rquvi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢٠",
        "numberLatin": "20",
        "arabic": "يَكَادُ ٱلْبَرْقُ يَخْطَفُ أَبْصَـٰرَهُمْ ۖ كُلَّمَآ أَضَآءَ لَهُم مَّشَوْا۟ فِيهِ وَإِذَآ أَظْلَمَ عَلَيْهِمْ قَامُوا۟ ۚ وَلَوْ شَآءَ ٱللَّهُ لَذَهَبَ بِسَمْعِهِمْ وَأَبْصَـٰرِهِمْ ۚ إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ",
        "transcription": "yakādu l-barqu yakhtafu abṣārahum kullamā aḍā'a lahum mashaw fīhi wa idhā aẓlama ʿalayhim qāmū wa law shā'a llāhu la-dhahaba bi-samʿihim wa abṣārihim inna llāha ʿalā kulli shay'in qadīr",
        "translation": "Chaqmoq ularning ko'zlarini olib ketmoqchi bo'ladi. Har qachon ularga yorug'lik berganda, unda yurishadi, qorong'u bo'lganda to'xtab qoladilar. Agar Alloh xohlasa, ularning eshitish va ko'rish qobiliyatini olib ketadi. Albatta Alloh har narsaga qodirdir.",
        "tafsir": "Munofiqlarning beqarorlik holati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢١",
        "numberLatin": "21",
        "arabic": "يَـٰٓأَيُّهَا ٱلنَّاسُ ٱعْبُدُوا۟ رَبَّكُمُ ٱلَّذِى خَلَقَكُمْ وَٱلَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ",
        "transcription": "yā ayyuhā n-nāsu ʿbudū rabbakumu lladhī khalaqakum wa alladhīna min qablikum laʿallakum tattaqūn",
        "translation": "Ey odamlar! Sizni va sizdan oldingilarni yaratgan Robbingizga ibodat qiling, ehtimol taqvodor bo'lasiz.",
        "tafsir": "Barcha insonlarga ibodat qilish chaqirig'i.",
        "copySymbol": "📋"
      },
        {
          "numberArabic": "٢٢",
          "numberLatin": "22",
          "arabic": "ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ فِرَٰشًۭا وَٱلسَّمَآءَ بِنَآءًۭ وَأَنزَلَ مِنَ ٱلسَّمَآءِ مَآءًۭ فَأَخْرَجَ بِهِۦ مِنَ ٱلثَّمَرَٰتِ رِزْقًۭا لَّكُمْ ۖ فَلَا تَجْعَلُوا۟ لِلَّهِ أَندَادًۭا وَأَنتُمْ تَعْلَمُونَ",
          "transcription": "alladhī jaʿala lakumu l-arḍa firāshan wa s-samā'a binā'an wa anzala mina s-samā'i mā'an fa-akhraja bihi mina th-thamarāti rizqan lakum fa lā tajʿalū lillāhi andādan wa antum taʿlamūn",
          "translation": "U sizga yerni to'shak, osmonni bino qilib yaratdi, osmondan suv tushirdi va u bilan sizga rizq bo'lgan mevalarni chiqardi. Bilgan holda Allohga tengdoshlar qo'ymang.",
          "tafsir": "Allohning yaratish ne'matlari va shirk qilishdan qaytarish.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٣",
          "numberLatin": "23",
          "arabic": "وَإِن كُنتُمْ فِى رَيْبٍۢ مِّمَّا نَزَّلْنَا عَلَىٰ عَبْدِنَا فَأْتُوا۟ بِسُورَةٍۢ مِّن مِّثْلِهِۦ وَٱدْعُوا۟ شُهَدَآءَكُم مِّن دُونِ ٱللَّهِ إِن كُنتُمْ صَـٰدِقِينَ",
          "transcription": "wa in kuntum fī raybin mimmā nazzalnā ʿalā ʿabdinā fa'tū bi-sūratin min mithlihi wa dʿū shuhadā'akum min dūni llāhi in kuntum ṣādiqīn",
          "translation": "Agar bandamizga nozil qilgan (Qur'on) haqida shubhada bo'lsangiz, unga o'xshash bir sura keltiring va Allohdan o'zga guvohlaringizni chaqiring, agar rostgo'y bo'lsangiz.",
          "tafsir": "Qur'onning i'jozi va unga qarshi kura olmaslik haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٤",
          "numberLatin": "24",
          "arabic": "فَإِن لَّمْ تَفْعَلُوا۟ وَلَن تَفْعَلُوا۟ فَٱتَّقُوا۟ ٱلنَّارَ ٱلَّتِى وَقُودُهَا ٱلنَّاسُ وَٱلْحِجَارَةُ ۖ أُعِدَّتْ لِلْكَـٰفِرِينَ",
          "transcription": "fa in lam tafʿalū wa lan tafʿalū fa ttaqū n-nāra llatī waqūduhā n-nāsu wa l-ḥijāratu uʿiddat li-l-kāfirīn",
          "translation": "Agar buni qila olmasangiz va hech qachon qila olmaysiz, odamlar va toshlar yoqilg'isi bo'lgan va kofirlar uchun tayyorlangan do'zaxdan qo'rqing.",
          "tafsir": "Do'zax azobidan ogohlantirish.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٥",
          "numberLatin": "25",
          "arabic": "وَبَشِّرِ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ أَنَّ لَهُمْ جَنَّـٰتٍۢ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَـٰرُ ۖ كُلَّمَا رُزِقُوا۟ مِنْهَا مِن ثَمَرَةٍۢ رِّزْقًۭا قَالُوا۟ هَـٰذَا ٱلَّذِى رُزِقْنَا مِن قَبْلُ ۖ وَأُتُوا۟ بِهِۦ مُتَشَـٰبِهًۭا ۖ وَلَهُمْ فِيهَآ أَزْوَٰجٌۭ مُّطَهَّرَةٌۭ ۖ وَهُمْ فِيهَا خَـٰلِدُونَ",
          "transcription": "wa bashshiri alladhīna āmanū wa ʿamilū ṣ-ṣāliḥāti anna lahum jannātin tajrī min taḥtihā l-anhāru kullamā ruziqū minhā min thamaratin rizqan qālū hādhā lladhī ruziqnā min qablu wa utū bihi mutashābihan wa lahum fīhā azwājun muṭahharatun wa hum fīhā khālidūn",
          "translation": "Iymon keltirib yaxshi amallar qilganlarga xushxabar ber: Ular uchun ostidan daryolar oqib turgan jannatlar bor. Qachonki ulardan meva rizqi berilsa, 'Bu bizga ilgari berilgan rizqdir' deydilar. Ularga bir-biriga o'xshash (mevalar) beriladi. Ular uchun u yerda pok turmush o'rtoqlari bor va ular u yerda abadiy qoladilar.",
          "tafsir": "Jannat ne'matlari va abadiylik haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٦",
          "numberLatin": "26",
          "arabic": "إِنَّ ٱللَّهَ لَا يَسْتَحْىِۦٓ أَن يَضْرِبَ مَثَلًۭا مَّا بَعُوضَةًۭ فَمَا فَوْقَهَا ۚ فَأَمَّا ٱلَّذِينَ ءَامَنُوا۟ فَيَعْلَمُونَ أَنَّهُ ٱلْحَقُّ مِن رَّبِّهِمْ ۖ وَأَمَّا ٱلَّذِينَ كَفَرُوا۟ فَيَقُولُونَ مَاذَآ أَرَادَ ٱللَّهُ بِهَـٰذَا مَثَلًا ۘ يُضِلُّ بِهِۦ كَثِيرًۭا وَيَهْدِى بِهِۦ كَثِيرًۭا ۚ وَمَا يُضِلُّ بِهِۦٓ إِلَّا ٱلْفَـٰسِقِينَ",
          "transcription": "inna llāha lā yastaḥyī an yaḍriba mathalan mā baʿūḍatan fa-mā fawqahā fa-ammā alladhīna āmanū fa-yaʿlamūna annahu l-ḥaqqu min rabbihim wa ammā alladhīna kafarū fa-yaqūlūna mādhā arāda llāhu bi-hādhā mathalan yuḍillu bihi kathīran wa yahdī bihi kathīran wa mā yuḍillu bihi illā l-fāsiqīn",
          "translation": "Alloh pashsha yoki undan kattaroq narsa haqida misollar keltirishdan uyalmaydi. Mo'minlar buni Robbilaridan kelgan haq deb biladilar. Kofirlar esa 'Alloh bunday misoldan nimani xohladi?' deydilar. U bu bilan ko'plarni adashtiradi va ko'plarni hidoyat qiladi. Lekin u bilan faqat fosiqlarnigina adashtiradi.",
          "tafsir": "Qur'ondagi misollar va ularning ta'siri haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٧",
          "numberLatin": "27",
          "arabic": "ٱلَّذِينَ يَنقُضُونَ عَهْدَ ٱللَّهِ مِنۢ بَعْدِ مِيثَـٰقِهِۦ وَيَقْطَعُونَ مَآ أَمَرَ ٱللَّهُ بِهِۦٓ أَن يُوصَلَ وَيُفْسِدُونَ فِى ٱلْأَرْضِ ۚ أُو۟لَـٰٓئِكَ هُمُ ٱلْخَـٰسِرُونَ",
          "transcription": "alladhīna yanquḍūna ʿahda llāhi min baʿdi mīthāqihi wa yaqṭaʿūna mā amara llāhu bihi an yūṣala wa yufsidūna fī l-arḍi ulā'ika humu l-khāsirūn",
          "translation": "Ular Alloh bilan qilgan ahdni mustahkamlagandan keyin buzadilar, Alloh bog'lashni buyurgan narsalarni uzadilar va yerda fasod qiladilar. Mana shular ziyonkorlardir.",
          "tafsir": "Fosiqlaning sifatlari va ularning ziynokarligi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٨",
          "numberLatin": "28",
          "arabic": "كَيْفَ تَكْفُرُونَ بِٱللَّهِ وَكُنتُمْ أَمْوَٰتًۭا فَأَحْيَـٰكُمْ ۖ ثُمَّ يُمِيتُكُمْ ثُمَّ يُحْيِيكُمْ ثُمَّ إِلَيْهِ تُرْجَعُونَ",
          "transcription": "kayfa takfurūna bi-llāhi wa kuntum amwātan fa-aḥyākum thumma yumītukum thumma yuḥyīkum thumma ilayhi turjaʿūn",
          "translation": "Qanday qilib Allohni inkor qilasiz? Siz o'lik edingiz, U sizni tiriltirib, so'ng o'ldiradi, so'ng yana tiriltirib, keyin Unga qaytarilasiz.",
          "tafsir": "Hayot va o'lim tsiklining Alloh qudratida ekanligi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢٩",
          "numberLatin": "29",
          "arabic": "هُوَ ٱلَّذِى خَلَقَ لَكُم مَّا فِى ٱلْأَرْضِ جَمِيعًۭا ثُمَّ ٱسْتَوَىٰٓ إِلَى ٱلسَّمَآءِ فَسَوَّىٰهُنَّ سَبْعَ سَمَـٰوَٰتٍۢ ۚ وَهُوَ بِكُلِّ شَىْءٍ عَلِيمٌۭ",
          "transcription": "huwa lladhī khalaqa lakum mā fī l-arḍi jamīʿan thumma stawā ilā s-samā'i fa-sawwāhunna sabʿa samāwātin wa huwa bi-kulli shay'in ʿalīm",
          "translation": "U sizlar uchun yerdagi barcha narsalarni yaratgan, so'ng osmonga yo'nalgan va ularni yetti osmon qilib tartibga solgan Zotdir. U har narsani biluvchidir.",
          "tafsir": "Allohning yaratish qudrati va bilimi haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٠",
          "numberLatin": "30",
          "arabic": "وَإِذْ قَالَ رَبُّكَ لِلْمَلَـٰٓئِكَةِ إِنِّى جَاعِلٌۭ فِى ٱلْأَرْضِ خَلِيفَةًۭ ۖ قَالُوٓا۟ أَتَجْعَلُ فِيهَا مَن يُفْسِدُ فِيهَا وَيَسْفِكُ ٱلدِّمَآءَ وَنَحْنُ نُسَبِّحُ بِحَمْدِكَ وَنُقَدِّسُ لَكَ ۖ قَالَ إِنِّىٓ أَعْلَمُ مَا لَا تَعْلَمُونَ",
          "transcription": "wa idh qāla rabbuka li-l-malā'ikati innī jāʿilun fī l-arḍi khalīfatan qālū a-tajʿalu fīhā man yufsidu fīhā wa yasfiku d-dimā'a wa naḥnu nusabbiḥu bi-ḥamdika wa nuqaddisu laka qāla innī aʿlamu mā lā taʿlamūn",
          "translation": "Robbing farishtalar: 'Men yerda xalifa yaratmoqchiman' deganida, ular: 'Unda fasod qiluvchi va qon to'kuvchini yaratasan- mi? Biz esa Seni hamd bilan tasbih etamiz va muqaddas deb bilamiz' dedilar. (Alloh): 'Men sizlar bilmagan narsalarni bilaman' dedi.",
          "tafsir": "Odam Alayhissalomning yaratilishi va xalifaga qilinishi haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣١",
          "numberLatin": "31",
          "arabic": "وَعَلَّمَ ءَادَمَ ٱلْأَسْمَآءَ كُلَّهَا ثُمَّ عَرَضَهُمْ عَلَى ٱلْمَلَـٰٓئِكَةِ فَقَالَ أَنۢبِـُٔونِى بِأَسْمَآءِ هَـٰٓؤُلَآءِ إِن كُنتُمْ صَـٰدِقِينَ",
          "transcription": "wa ʿallama ādama l-asmā'a kullahā thumma ʿaraḍahum ʿalā l-malā'ikati fa-qāla anbi'ūnī bi-asmā'i hā'ulā'i in kuntum ṣādiqīn",
          "translation": "Va (Alloh) Odam Alayhissalomga barcha nomlarni o'rgatdi, so'ng ularni farishtalarni oldiga qo'yib: 'Agar rostgo'y bo'lsangiz, menga bularning nomlarini ayting' dedi.",
          "tafsir": "Odam Alayhissalomga ilm berilishi va farishtalardan ustunligi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٢",
          "numberLatin": "32",
          "arabic": "قَالُوا۟ سُبْحَـٰنَكَ لَا عِلْمَ لَنَآ إِلَّا مَا عَلَّمْتَنَآ ۖ إِنَّكَ أَنتَ ٱلْعَلِيمُ ٱلْحَكِيمُ",
          "transcription": "qālū subḥānaka lā ʿilma lanā illā mā ʿallamtanā innaka anta l-ʿalīmu l-ḥakīm",
          "translation": "Ular: 'Seni poklaymiz! Bizga faqat Sen o'rgatgan narsagina ma'lum. Albatta Sen biluvchi va hikmatli Zotsan' dedilar.",
          "tafsir": "Farishtalarning kamtarligi va Allohning ilmini tan etishi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٣",
          "numberLatin": "33",
          "arabic": "قَالَ يَـٰٓـَٔادَمُ أَنۢبِئْهُم بِأَسْمَآئِهِمْ ۖ فَلَمَّآ أَنۢبَأَهُم بِأَسْمَآئِهِمْ قَالَ أَلَمْ أَقُل لَّكُمْ إِنِّىٓ أَعْلَمُ غَيْبَ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ وَأَعْلَمُ مَا تُبْدُونَ وَمَا كُنتُمْ تَكْتُمُونَ",
          "transcription": "qāla yā ādamu anbi'hum bi-asmā'ihim fa-lammā anba'ahum bi-asmā'ihim qāla a-lam aqul lakum innī aʿlamu ghayba s-samāwāti wa l-arḍi wa aʿlamu mā tubdūna wa mā kuntum taktumūn",
          "translation": "(Alloh): 'Ey Odam! Ularga bularning nomlarini aytib ber' dedi. U ularga nomlarni aytgach, (Alloh): 'Sizlarga: Men osmonlar va yerning g'aybini bilaman, sizlar oshkor qilgan va yashirgan narsalaringizni bilaman, demagan edimmi?' dedi.",
          "tafsir": "Allohning g'ayb bilimi va Odam Alayhissalomning imtiyozi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٤",
          "numberLatin": "34",
          "arabic": "وَإِذْ قُلْنَا لِلْمَلَـٰٓئِكَةِ ٱسْجُدُوا۟ لِءَادَمَ فَسَجَدُوٓا۟ إِلَّآ إِبْلِيسَ أَبَىٰ وَٱسْتَكْبَرَ وَكَانَ مِنَ ٱلْكَـٰفِرِينَ",
          "transcription": "wa idh qulnā li-l-malā'ikati sjudū li-ādama fa-sajadū illā iblīsa abā wa stakbara wa kāna mina l-kāfirīn",
          "translation": "Va farishtalarni 'Odam Alayhissalomga sajda qiling' deganimizni eslang. Iblis bundan bosh tortib, takabburlik qildi va kofirlardain bo'ldi.",
          "tafsir": "Iblisning itatsizligi va takabburligi haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٥",
          "numberLatin": "35",
          "arabic": "وَقُلْنَا يَـٰٓـَٔادَمُ ٱسْكُنْ أَنتَ وَزَوْجُكَ ٱلْجَنَّةَ وَكُلَا مِنْهَا رَغَدًا حَيْثُ شِئْتُمَا وَلَا تَقْرَبَا هَـٰذِهِ ٱلشَّجَرَةَ فَتَكُونَا مِنَ ٱلظَّـٰلِمِينَ",
          "transcription": "wa qulnā yā ādamu skun anta wa zawjuka l-jannata wa kulā minhā raghadan ḥaythu shi'tumā wa lā taqrabā hādhihi sh-shajarata fa-takūnā mina ẓ-ẓālimīn",
          "translation": "Va dedik: 'Ey Odam! Sen va rafiqang jannatda yashagilar, undan xohlaganingizcha mo'l-ko'l yegiler, lekin bu daraxtga yaqinlashmanglar, aks holda zolimlardan bo'lasiz.'",
          "tafsir": "Odam va Havvo Alayhissalomning jannatda yashashi va taqiq daraxt.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٦",
          "numberLatin": "36",
          "arabic": "فَأَزَلَّهُمَا ٱلشَّيْطَـٰنُ عَنْهَا فَأَخْرَجَهُمَا مِمَّا كَانَا فِيهِ ۖ وَقُلْنَا ٱهْبِطُوا۟ بَعْضُكُمْ لِبَعْضٍ عَدُوٌّۭ ۖ وَلَكُمْ فِى ٱلْأَرْضِ مُسْتَقَرٌّۭ وَمَتَـٰعٌ إِلَىٰ حِينٍۢ",
          "transcription": "fa-azallahumā sh-shayṭānu ʿanhā fa-akhrajahumā mimmā kānā fīhi wa qulnā hbiṭū baʿḍukum li-baʿḍin ʿaduwwun wa lakum fī l-arḍi mustaqarrun wa matāʿun ilā ḥīn",
          "translation": "Shayton ularni u(daraxt) dan toyishirib, o'zlari turgan joydan chiqarib yubordi. Biz: 'Tushing! Ba'zingiz ba'zingizga dushmansiz. Sizlar uchun yerda belgilangan vaqtgacha joylashish va foydalanish bor' dedik.",
          "tafsir": "Shaytonning aldovi va jannatdan chiqarish.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٧",
          "numberLatin": "37",
          "arabic": "فَتَلَقَّىٰٓ ءَادَمُ مِن رَّبِّهِۦ كَلِمَـٰتٍۢ فَتَابَ عَلَيْهِ ۚ إِنَّهُۥ هُوَ ٱلتَّوَّابُ ٱلرَّحِيمُ",
          "transcription": "fa-talaqqā ādamu min rabbihi kalimātin fa-tāba ʿalayhi innahu huwa t-tawwābu r-raḥīm",
          "translation": "So'ng Odam Alayhissalom Robbisidan (tavba) so'zlarini oldi va (Alloh) uning tavbasini qabul qildi. Albatta U ko'p tavba qabul qiluvchi va rahmli Zotdir.",
          "tafsir": "Odam Alayhissalomning tavbasi va Allohning rahmati.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٨",
          "numberLatin": "38",
          "arabic": "قُلْنَا ٱهْبِطُوا۟ مِنْهَا جَمِيعًۭا ۖ فَإِمَّا يَأْتِيَنَّكُم مِّنِّى هُدًۭى فَمَن تَبِعَ هُدَايَ فَلَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ",
          "transcription": "qulnā hbiṭū minhā jamīʿan fa-immā ya'tiyannakum minnī hudal fa-man tabiʿa hudāya fa lā khawfun ʿalayhim wa lā hum yaḥzanūn",
          "translation": "Dedik: 'Barchaingiz undan tushing! Mendan sizga hidoyat kelsa, Mening hidoyatimga ergashganlar uchun na qo'rquv bor, na g'am.'",
          "tafsir": "Allohning hidoyat va'dasi va unga ergashuvchilarning xavfsizligi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣٩",
          "numberLatin": "39",
          "arabic": "وَٱلَّذِينَ كَفَرُوا۟ وَكَذَّبُوا۟ بِـَٔايَـٰتِنَآ أُو۟لَـٰٓئِكَ أَصْحَـٰبُ ٱلنَّارِ ۖ هُمْ فِيهَا خَـٰلِدُونَ",
          "transcription": "wa alladhīna kafarū wa kadhdhabū bi-āyātinā ulā'ika aṣḥābu n-nāri hum fīhā khālidūn",
          "translation": "Kufr qilib, oyatlarimizni yolg'onladigan bollar esa do'zax ahlıdırlar va ular unda abadiy qoladilar.",
          "tafsir": "Kofrning oqibati - abadiy do'zax azobı.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٠",
          "numberLatin": "40",
          "arabic": "يَـٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ ٱلَّتِىٓ أَنْعَمْتُ عَلَيْكُمْ وَأَوْفُوا۟ بِعَهْدِىٓ أُوفِ بِعَهْدِكُمْ وَإِيَّـٰىَ فَٱرْهَبُونِ",
          "transcription": "yā banī isrā'īla dhkurū niʿmatiya llatī anʿamtu ʿalaykum wa awfū bi-ʿahdī ūfi bi-ʿahdikum wa iyyāya fa-rhabūn",
          "translation": "Ey Isroil avlodlari! Men sizga bergan ne'matimni eslang va Mening ahdimga vafo qiling, Men ham sizning ahdingizga vafo qilaman. Faqat Mendan qo'rqing.",
          "tafsir": "Bani Isroilga murojaat va ularning zimmasidagi vazifalar.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤١",
          "numberLatin": "41",
          "arabic": "وَءَامِنُوا۟ بِمَآ أَنزَلْتُ مُصَدِّقًۭا لِّمَا مَعَكُمْ وَلَا تَكُونُوٓا۟ أَوَّلَ كَافِرٍۭ بِهِۦ ۖ وَلَا تَشْتَرُوا۟ بِـَٔايَـٰتِى ثَمَنًۭا قَلِيلًۭا وَإِيَّـٰىَ فَٱتَّقُونِ",
          "transcription": "wa āminū bimā anzaltu muṣaddiqan li-mā maʿakum wa lā takūnū awwala kāfirin bihi wa lā tashtarū bi-āyātī thamanan qalīlan wa iyyāya fa-ttaqūn",
          "translation": "Va Men nozil qilgan, sizning qashingizdagi (Tavrot)ni tasdiq qiluvchi (Qur'on)ga iymon keltiring. Unga birinchi bo'lib kofir bo'lmang va Mening oyatlarimni oz bahoga sotmang. Faqat Mendan qo'rqing.",
          "tafsir": "Qur'onni qabul qilish va oyatlarni sotmaslik haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٢",
          "numberLatin": "42",
          "arabic": "وَلَا تَلْبِسُوا۟ ٱلْحَقَّ بِٱلْبَـٰطِلِ وَتَكْتُمُوا۟ ٱلْحَقَّ وَأَنتُمْ تَعْلَمُونَ",
          "transcription": "wa lā talbisū l-ḥaqqa bi-l-bāṭili wa taktumū l-ḥaqqa wa antum taʿlamūn",
          "translation": "Haqni botil bilan aralashtirib yubormang va bilgan holda haqni yashirmang.",
          "tafsir": "Haqiqatni yashirmaslik va uni botil bilan aralashtimaslik.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٣",
          "numberLatin": "43",
          "arabic": "وَأَقِيمُوا۟ ٱلصَّلَوٰةَ وَءَاتُوا۟ ٱلزَّكَوٰةَ وَٱرْكَعُوا۟ مَعَ ٱلرَّٰكِعِينَ",
          "transcription": "wa aqīmū ṣ-ṣalāta wa ātū z-zakāta wa rkaʿū maʿa r-rākiʿīn",
          "translation": "Namozni to'kis ado eting, zakatni bering va ruku qiluvchilar bilan birga ruku qiling.",
          "tafsir": "Namoz, zakat va jamoat bilan ibodat qilish.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٤",
          "numberLatin": "44",
          "arabic": "أَتَأْمُرُونَ ٱلنَّاسَ بِٱلْبِرِّ وَتَنسَوْنَ أَنفُسَكُمْ وَأَنتُمْ تَتْلُونَ ٱلْكِتَـٰبَ ۚ أَفَلَا تَعْقِلُونَ",
          "transcription": "a-ta'murūna n-nāsa bi-l-birri wa tansawna anfusakum wa antum tatlūna l-kitāba a-fa-lā taʿqilūn",
          "translation": "Odamlarni yaxshilikka buyurib, o'zingizni unutasizmi? Holbuki siz Kitobni o'qiyapsiz. Aql yuritmasmisiz?",
          "tafsir": "O'ziga amal qilmasdan boshqalarga vaaz berish aybi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٥",
          "numberLatin": "45",
          "arabic": "وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى ٱلْخَـٰشِعِينَ",
          "transcription": "wa staʿīnū bi-ṣ-ṣabri wa ṣ-ṣalāti wa innahā la-kabīratun illā ʿalā l-khāshiʿīn",
          "translation": "Sabr va namoz bilan yordam so'rang. Albatta, bu (namoz) khushu' qiluvchilardan boshqalarga og'ir keladi.",
          "tafsir": "Sabr va namozning ahamiyati, khushu'ning qadri.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٦",
          "numberLatin": "46",
          "arabic": "ٱلَّذِينَ يَظُنُّونَ أَنَّهُم مُّلَـٰقُوا۟ رَبِّهِمْ وَأَنَّهُمْ إِلَيْهِ رَٰجِعُونَ",
          "transcription": "alladhīna yaẓunnūna annahum mulāqū rabbihim wa annahum ilayhi rājiʿūn",
          "translation": "Ular o'z Robbilariga uchrashishlarini va Unga qaytishlarini biluvchilardir.",
          "tafsir": "Oxiratga ishonuvchi va Allohga uchrashishni kutuvchilar.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٧",
          "numberLatin": "47",
          "arabic": "يَـٰبَنِىٓ إِسْرَٰٓءِيلَ ٱذْكُرُوا۟ نِعْمَتِىَ ٱلَّتِىٓ أَنْعَمْتُ عَلَيْكُمْ وَأَنِّى فَضَّلْتُكُمْ عَلَى ٱلْعَـٰلَمِينَ",
          "transcription": "yā banī isrā'īla dhkurū niʿmatiya llatī anʿamtu ʿalaykum wa annī faḍḍaltukum ʿalā l-ʿālamīn",
          "translation": "Ey Isroil avlodlari! Men sizga bergan ne'matimni va sizni olamlardan ustun qilganimni eslang.",
          "tafsir": "Bani Isroilning o'z zamonidagi fazilati va ne'matlari.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٨",
          "numberLatin": "48",
          "arabic": "وَٱتَّقُوا۟ يَوْمًۭا لَّا تَجْزِى نَفْسٌ عَن نَّفْسٍۢ شَيْـًۭٔا وَلَا يُقْبَلُ مِنْهَا شَفَـٰعَةٌۭ وَلَا يُؤْخَذُ مِنْهَا عَدْلٌۭ وَلَا هُمْ يُنصَرُونَ",
          "transcription": "wa ttaqū yawman lā tajzī nafsun ʿan nafsin shay'an wa lā yuqbalu minhā shafāʿatun wa lā yu'khadhu minhā ʿadlun wa lā hum yunṣarūn",
          "translation": "Shunday kundan qo'rqingki, unda hech bir jon boshqa jon uchun hech narsa qila olmaydi, undan shafa'at qabul qilinmaydi, undan fidya olinmaydi va ularga yordam berilmaydi.",
          "tafsir": "Qiyomat kunining dahshati va har birning o'z amali uchun javobgarligi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤٩",
          "numberLatin": "49",
          "arabic": "وَإِذْ نَجَّيْنَـٰكُم مِّنْ ءَالِ فِرْعَوْنَ يَسُومُونَكُمْ سُوٓءَ ٱلْعَذَابِ يُذَبِّحُونَ أَبْنَآءَكُمْ وَيَسْتَحْيُونَ نِسَآءَكُمْ ۚ وَفِى ذَٰلِكُم بَلَآءٌۭ مِّن رَّبِّكُمْ عَظِيمٌۭ",
          "transcription": "wa idh najjaynākum min āli firʿawna yasūmūnakum sū'a l-ʿadhābi yudhabbiḥūna abnā'akum wa yastaḥyūna nisā'akum wa fī dhālikum balā'un min rabbikum ʿaẓīm",
          "translation": "Va sizni Fir'avn xonaqdonidan qutqarganimizni eslang. Ular sizlarga qattiq azob berib, o'g'il bolalaringizni so'yib, ayollaringizni tirik qoldirardilar. Bunda sizlar uchun Robbingizdan ulkan sinov bor edi.",
          "tafsir": "Bani Isroilning Fir'avndan qutqarilishi va ularga qilingan zulm.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٥٠",
          "numberLatin": "50",
          "arabic": "وَإِذْ فَرَقْنَا بِكُمُ ٱلْبَحْرَ فَأَنجَيْنَـٰكُمْ وَأَغْرَقْنَا ءَالَ فِرْعَوْنَ وَأَنتُمْ تَنظُرُونَ",
          "transcription": "wa idh faraqnā bikumu l-baḥra fa-anjayakum wa aghraqnā āla firʿawna wa antum tanẓurūn",
          "translation": "Va dengizni sizlar uchun bo'lib, sizni qutqarganimizni va ko'zlaringiz oldida Fir'avn xonaqdonini cho'ktirganmizni eslang.",
          "tafsir": "Dengizning bo'linishi va Fir'avnning cho'kishi mo'jizasi.",
          "copySymbol": "📋"
        }
    ]
  },
  {
  "id": 3,
  "name": "Ali Imron",
  "arabicName": "آل عمران",
  "meaning": "Imron oilasi 👨‍👩‍👧‍👦",
  "ayahCount": 200,
  "place": "Madina 🌟",
  "ayahs": [
    {
      "numberArabic": "١",
      "numberLatin": "1",
      "arabic": "الم",
      "transcription": "alif lām mīm",
      "translation": "Alif, Lom, Mim.",
      "tafsir": "Muqatta'a harflari - faqat Alloh biladi ma'nosini.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢",
      "numberLatin": "2",
      "arabic": "ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ",
      "transcription": "allāhu lā ilāha illā huwa l-ḥayyu l-qayyūm",
      "translation": "Alloh - Undan boshqa iloh yo'q. U tirik va barqaror turib turuvchidir.",
      "tafsir": "Allohning yagonaligi va abadiy hayotligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣",
      "numberLatin": "3",
      "arabic": "نَزَّلَ عَلَيْكَ ٱلْكِتَـٰبَ بِٱلْحَقِّ مُصَدِّقًۭا لِّمَا بَيْنَ يَدَيْهِ وَأَنزَلَ ٱلتَّوْرَىٰةَ وَٱلْإِنجِيلَ",
      "transcription": "nazzala ʿalayka l-kitāba bi-l-ḥaqqi muṣaddiqan li-mā bayna yadayhi wa anzala t-tawrāta wa l-injīl",
      "translation": "U senga Kitobni (Qur'onni) haq bilan nozil qildi, o'zidan oldingilarni tasdiq qiluvchi holda. Va Tavrot bilan Injilni nozil qildi.",
      "tafsir": "Qur'onning haqiqiy va tasdiq qiluvchi kitob ekanligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٤",
      "numberLatin": "4",
      "arabic": "مِن قَبْلُ هُدًۭى لِّلنَّاسِ وَأَنزَلَ ٱلْفُرْقَانَ ۗ إِنَّ ٱلَّذِينَ كَفَرُوا۟ بِـَٔايَـٰتِ ٱللَّهِ لَهُمْ عَذَابٌۭ شَدِيدٌۭ ۗ وَٱللَّهُ عَزِيزٌۭ ذُو ٱنتِقَامٍۢ",
      "transcription": "min qablu hudal li-n-nāsi wa anzala l-furqāna inna alladhīna kafarū bi-āyāti llāhi lahum ʿadhābun shadīdun wa llāhu ʿazīzun dhū ntiqām",
      "translation": "Ilgari odamlar uchun hidoyat sifatida (nozil qildi) va Furqonni (haq va botilni farq qiluvchini) nozil qildi. Allohning oyatlarini inkor qilganlar uchun qattiq azob bor. Alloh qudratli va intiqom oluvchidir.",
      "tafsir": "Samoviy kitoblarning hidoyat maqsadi va kofirlar uchun ogohlik.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٥",
      "numberLatin": "5",
      "arabic": "إِنَّ ٱللَّهَ لَا يَخْفَىٰ عَلَيْهِ شَىْءٌۭ فِى ٱلْأَرْضِ وَلَا فِى ٱلسَّمَآءِ",
      "transcription": "inna llāha lā yakhfā ʿalayhi shay'un fī l-arḍi wa lā fī s-samā'",
      "translation": "Albatta Allohdan yerda va osmonda hech narsa yashirin emas.",
      "tafsir": "Allohning har narsani bilishi va hech narsa yashirin emasligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٦",
      "numberLatin": "6",
      "arabic": "هُوَ ٱلَّذِى يُصَوِّرُكُمْ فِى ٱلْأَرْحَامِ كَيْفَ يَشَآءُ ۚ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ",
      "transcription": "huwa lladhī yuṣawwirukum fī l-arḥāmi kayfa yashā'u lā ilāha illā huwa l-ʿazīzu l-ḥakīm",
      "translation": "U sizni qorinlarda xohlagancha shakllantiruvchidir. Undan boshqa iloh yo'q. U qudratli va hikmatli Zotdir.",
      "tafsir": "Allohning yaratish qudrati va ona qornida shakllanish.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٧",
      "numberLatin": "7",
      "arabic": "هُوَ ٱلَّذِىٓ أَنزَلَ عَلَيْكَ ٱلْكِتَـٰبَ مِنْهُ ءَايَـٰتٌۭ مُّحْكَمَـٰتٌ هُنَّ أُمُّ ٱلْكِتَـٰبِ وَأُخَرُ مُتَشَـٰبِهَـٰتٌۭ ۖ فَأَمَّا ٱلَّذِينَ فِى قُلُوبِهِمْ زَيْغٌۭ فَيَتَّبِعُونَ مَا تَشَـٰبَهَ مِنْهُ ٱبْتِغَآءَ ٱلْفِتْنَةِ وَٱبْتِغَآءَ تَأْوِيلِهِۦ ۗ وَمَا يَعْلَمُ تَأْوِيلَهُۥٓ إِلَّا ٱللَّهُ ۗ وَٱلرَّٰسِخُونَ فِى ٱلْعِلْمِ يَقُولُونَ ءَامَنَّا بِهِۦ كُلٌّۭ مِّنْ عِندِ رَبِّنَا ۗ وَمَا يَذَّكَّرُ إِلَّآ أُو۟لُوا۟ ٱلْأَلْبَـٰبِ",
      "transcription": "huwa lladhī anzala ʿalayka l-kitāba minhu āyātun muḥkamātun hunna ummu l-kitābi wa ukharu mutashābihātun fa-ammā lladhīna fī qulūbihim zayghun fa-yattabiʿūna mā tashābaha minhu btighā'a l-fitnati wa btighā'a ta'wīlihi wa mā yaʿlamu ta'wīlahu illā llāhu wa r-rāsikhūna fī l-ʿilmi yaqūlūna āmannā bihi kullun min ʿindi rabbinā wa mā yadhdhakkaru illā ulū l-albāb",
      "translation": "U senga Kitobni nozil qilgan Zotdir. Unda aniq oyatlar bor - ular Kitobning asosidir. Boshqalari esa mutashobehdır. Qalblarida kayishlik bo'lganlar fitna va ta'vil izlab, mutashobeh qismiga ergashadilar. Halbuki uning ta'vilini faqat Alloh biladi. Ilmda puxta bo'lganlar: 'Unga iymon keltirdik, hammasi Robbimizdan' deydilar. Faqat aql egalarigina ibrat oladilar.",
      "tafsir": "Qur'ondagi muhkam va mutashobehat oyatlar haqida.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٨",
      "numberLatin": "8",
      "arabic": "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ ٱلْوَهَّابُ",
      "transcription": "rabbanā lā tuzigh qulūbanā baʿda idh hadaytanā wa hab lanā min ladunka raḥmatan innaka anta l-wahhāb",
      "translation": "Robbimiz! Bizni hidoyat qilgandan keyin qalblarimizni kayishga saldirma va bizga O'z huzuringdan rahmat ato et. Albatta Sen ko'p beruvchi Zotsan.",
      "tafsir": "Hidoyat ustida qolish uchun duo.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٩",
      "numberLatin": "9",
      "arabic": "رَبَّنَآ إِنَّكَ جَامِعُ ٱلنَّاسِ لِيَوْمٍۢ لَّا رَيْبَ فِيهِ ۚ إِنَّ ٱللَّهَ لَا يُخْلِفُ ٱلْمِيعَادَ",
      "transcription": "rabbanā innaka jāmiʿu n-nāsi li-yawmin lā rayba fīhi inna llāha lā yukhlifu l-mīʿād",
      "translation": "Robbimiz! Albatta Sen odamlarni shaksiz kuniga (qiyomatga) yig'uvchi Zotsan. Alloh va'dasini buzmaslik.",
      "tafsir": "Qiyomat kuniga ishonch va Allohning va'da buzmaslik sifati.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٠",
      "numberLatin": "10",
      "arabic": "إِنَّ ٱلَّذِينَ كَفَرُوا۟ لَن تُغْنِىَ عَنْهُمْ أَمْوَٰلُهُمْ وَلَآ أَوْلَـٰدُهُم مِّنَ ٱللَّهِ شَيْـًۭٔا ۖ وَأُو۟لَـٰٓئِكَ هُمْ وَقُودُ ٱلنَّارِ",
      "transcription": "inna alladhīna kafarū lan tughniya ʿanhum amwāluhum wa lā awlāduhum mina llāhi shay'an wa ulā'ika hum waqūdu n-nār",
      "translation": "Kofir bo'lganlar uchun ularning mollari ham, farzandlari ham Allohdan (azobidan) hech narsani to'sa olmaydi. Mana shular do'zax yoqilg'isidir.",
      "tafsir": "Kofirlar uchun mol va farzandning foydasizligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١١",
      "numberLatin": "11",
      "arabic": "كَدَأْبِ ءَالِ فِرْعَوْنَ وَٱلَّذِينَ مِن قَبْلِهِمْ ۚ كَذَّبُوا۟ بِـَٔايَـٰتِنَا فَأَخَذَهُمُ ٱللَّهُ بِذُنُوبِهِمْ ۗ وَٱللَّهُ شَدِيدُ ٱلْعِقَابِ",
      "transcription": "ka-da'bi āli firʿawna wa alladhīna min qablihim kadhdhabū bi-āyātinā fa-akhadhahumu llāhu bi-dhunūbihim wa llāhu shadīdu l-ʿiqāb",
      "translation": "Fir'avn xonaqdonining va ulardan oldingilarning odati kabi. Ular Bizning oyatlarimizni yolg'onladilar, Alloh ularni gunohlariga sabab tutib jazoladi. Alloh qattiq jazolash beruvchidir.",
      "tafsir": "O'tmish qavmlarning oqibati va Allohning jazolaшi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٢",
      "numberLatin": "12",
      "arabic": "قُل لِّلَّذِينَ كَفَرُوا۟ سَتُغْلَبُونَ وَتُحْشَرُونَ إِلَىٰ جَهَنَّمَ ۚ وَبِئْسَ ٱلْمِهَادُ",
      "transcription": "qul li-lladhīna kafarū sa-tughla ūna wa tuḥsharūna ilā jahannama wa bi'sa l-mihād",
      "translation": "Kofir bo'lganlarga ayting: 'Tez orada mag'lub bo'lasiz va jahannamga haydab yig'ilasiz. Va u qanday yomon joydır!'",
      "tafsir": "Kofirlarga qat'iy ogohlik va jahannam azobı.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٣",
      "numberLatin": "13",
      "arabic": "قَدْ كَانَ لَكُمْ ءَايَةٌۭ فِى فِئَتَيْنِ ٱلْتَقَتَا ۖ فِئَةٌۭ تُقَـٰتِلُ فِى سَبِيلِ ٱللَّهِ وَأُخْرَىٰ كَافِرَةٌۭ يَرَوْنَهُم مِّثْلَيْهِمْ رَأْىَ ٱلْعَيْنِ ۚ وَٱللَّهُ يُؤَيِّدُ بِنَصْرِهِۦ مَن يَشَآءُ ۗ إِنَّ فِى ذَٰلِكَ لَعِبْرَةًۭ لِّأُو۟لِى ٱلْأَبْصَـٰرِ",
      "transcription": "qad kāna lakum āyatun fī fi'atayni ltaqatā fi'atun tuqātilu fī sabīli llāhi wa ukhrā kāfiratun yarawnahum mithlayhim ra'ya l-ʿayni wa llāhu yu'ayyidu bi-naṣrihi man yashā'u inna fī dhālika la-ʿibratan li-ulī l-abṣār",
      "translation": "Sizlar uchun to'qnashgan ikki guruhda ibratli belgı bor edi: bir guruh Alloh yo'lida jang qilar, ikkinchisi kofir edi. Ular (kofjrlar) mo'minlarni ko'z bilan ikki baravar ko'rib qo'yishgan. Alloh xohlaganiga O'z nusrati bilan yordamlashadi. Albatta bunda ko'z ochiq bo'lganlar uchun ibrat bor.",
      "tafsir": "Badr jangining ibratlı jomlari va Alloh yordamı.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٤",
      "numberLatin": "14",
      "arabic": "زُيِّنَ لِلنَّاسِ حُبُّ ٱلشَّهَوَٰتِ مِنَ ٱلنِّسَآءِ وَٱلْبَنِينَ وَٱلْقَنَـٰطِيرِ ٱلْمُقَنطَرَةِ مِنَ ٱلذَّهَبِ وَٱلْفِضَّةِ وَٱلْخَيْلِ ٱلْمُسَوَّمَةِ وَٱلْأَنْعَـٰمِ وَٱلْحَرْثِ ۗ ذَٰلِكَ مَتَـٰعُ ٱلْحَيَوٰةِ ٱلدُّنْيَا ۖ وَٱللَّهُ عِندَهُۥ حُسْنُ ٱلْمَـٔابِ",
      "transcription": "zuyyina li-n-nāsi ḥubbu sh-shahawāti mina n-nisā'i wa l-banīna wa l-qanāṭīri l-muqanṭarati mina dh-dhahabi wa l-fiḍḍati wa l-khayli l-musawwamati wa l-anʿāmi wa l-ḥarthi dhālika matāʿu l-ḥayāti d-dunyā wa llāhu ʿindahu ḥusnu l-ma'āb",
      "translation": "Odamlarga shahvatlar - ayollar, o'g'il bolalar, oltin va kumushdan qantarlab yig'ilgan boyliklar, belgılangan otlar, chorva mollari va ekinlarning muhabbati chiroyli qılıngan. Bu dunyo hayotining foydalanish narsalaridir. Alloh esa - Uning huzurida eng yaxshi qaytish joyi bor.",
      "tafsir": "Dunyo hayotining ziynatlari va oxiratning ustunligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٥",
      "numberLatin": "15",
      "arabic": "قُلْ أَؤُنَبِّئُكُم بِخَيْرٍۢ مِّن ذَٰلِكُمْ ۚ لِلَّذِينَ ٱتَّقَوْا۟ عِندَ رَبِّهِمْ جَنَّـٰتٌۭ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَـٰرُ خَـٰلِدِينَ فِيهَا وَأَزْوَٰجٌۭ مُّطَهَّرَةٌۭ وَرِضْوَٰنٌۭ مِّنَ ٱللَّهِ ۗ وَٱللَّهُ بَصِيرٌۢ بِٱلْعِبَادِ",
      "transcription": "qul a-unabbi'ukum bi-khayrin min dhālikum li-lladhīna ttaqaw ʿinda rabbihim jannātun tajrī min taḥtihā l-anhāru khālidīna fīhā wa azwājun muṭahharatun wa riḍwānun mina llāhi wa llāhu baṣīrun bi-l-ʿibād",
      "translation": "Ayting: 'Sizga bundan yaxshiroq narsani xabar bersammi? Taqvo qilganlar uchun Robbiları huzurida ostından daryolar oqib turgan jannatlar bor, ular unda abadıydırlar. Va pokiza juftlar hamda Allohdan rızovanlik bor. Alloh bandalarga ko'ruvchidir.'",
      "tafsir": "Jannat ne'matları va Alloh rizovanligining qadri.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٦",
      "numberLatin": "16",
      "arabic": "ٱلَّذِينَ يَقُولُونَ رَبَّنَآ إِنَّنَآ ءَامَنَّا فَٱغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ ٱلنَّارِ",
      "transcription": "alladhīna yaqūlūna rabbanā innanā āmannā fa-ghfir lanā dhunūbanā wa qinā ʿadhāba n-nār",
      "translation": "Ular: 'Robbimiz! Biz iymon keltirdik. Bizning gunohlarimizni kechir va bizni do'zax azobidan saqla' deydilar.",
      "tafsir": "Mo'minlarning Allohga murojaat duosi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٧",
      "numberLatin": "17",
      "arabic": "ٱلصَّـٰبِرِينَ وَٱلصَّـٰدِقِينَ وَٱلْقَـٰنِتِينَ وَٱلْمُنفِقِينَ وَٱلْمُسْتَغْفِرِينَ بِٱلْأَسْحَارِ",
      "transcription": "aṣ-ṣābirīna wa ṣ-ṣādiqīna wa l-qānitīna wa l-munfiqīna wa l-mustaghfirīna bi-l-asḥār",
      "translation": "Ular sabr qiluvchilar, rostgo'ylar, itoatkorlar, (Alloh yo'lida) sarflovchilar va sahar vaqtlarında istig'for qiluvchilardir.",
      "tafsir": "Taqvodorlarning ulug' sifatlari.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٨",
      "numberLatin": "18",
      "arabic": "شَهِدَ ٱللَّهُ أَنَّهُۥ لَآ إِلَـٰهَ إِلَّا هُوَ وَٱلْمَلَـٰٓئِكَةُ وَأُو۟لُوا۟ ٱلْعِلْمِ قَآئِمًۢا بِٱلْقِسْطِ ۚ لَآ إِلَـٰهَ إِلَّا هُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ",
      "transcription": "shahida llāhu annahu lā ilāha illā huwa wa l-malā'ikatu wa ulū l-ʿilmi qā'iman bi-l-qisṭi lā ilāha illā huwa l-ʿazīzu l-ḥakīm",
      "translation": "Alloh, farishtalar va ilm sohibları Undan boshqa iloh yo'qligiga adalat bilan tik turgan holda guvohlik berishdi. Undan boshqa iloh yo'q. U qudratli va hikmatli Zotdir.",
      "tafsir": "Allohning yagonaligiga eng katta guvohlik.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٩",
      "numberLatin": "19",
      "arabic": "إِنَّ ٱلدِّينَ عِندَ ٱللَّهِ ٱلْإِسْلَـٰمُ ۗ وَمَا ٱخْتَلَفَ ٱلَّذِينَ أُوتُوا۟ ٱلْكِتَـٰبَ إِلَّا مِنۢ بَعْدِ مَا جَآءَهُمُ ٱلْعِلْمُ بَغْيًۢا بَيْنَهُمْ ۗ وَمَن يَكْفُرْ بِـَٔايَـٰتِ ٱللَّهِ فَإِنَّ ٱللَّهَ سَرِيعُ ٱلْحِسَابِ",
      "transcription": "inna d-dīna ʿinda llāhi l-islāmu wa mā kh-talafa alladhīna ūtū l-kitāba illā min baʿdi mā jā'ahumu l-ʿilmu baghyan baynahum wa man yakfur bi-āyāti llāhi fa-inna llāha sarīʿu l-ḥisāb",
      "translation": "Albatta Alloh huzuridagi din Islomdir. Kitob berilganlar o'zlariga ilm kelgandan keyin faqat o'zaro hasaddan ixtilof qildilar. Kim Allohning oyatlarini inkor qilsa, albatta Alloh tez hisob oluvchidir.",
      "tafsir": "Islomning yagona haq din ekanligi va Ahl-kitobning ixtilotlari.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٠",
      "numberLatin": "20",
      "arabic": "فَإِنْ حَآجُّوكَ فَقُلْ أَسْلَمْتُ وَجْهِىَ لِلَّهِ وَمَنِ ٱتَّبَعَنِ ۗ وَقُل لِّلَّذِينَ أُوتُوا۟ ٱلْكِتَـٰبَ وَٱلْأُمِّيِّـۧنَ ءَأَسْلَمْتُمْ ۚ فَإِنْ أَسْلَمُوا۟ فَقَدِ ٱهْتَدَوا۟ ۖ وَّإِن تَوَلَّوْا۟ فَإِنَّمَا عَلَيْكَ ٱلْبَلَـٰغُ ۗ وَٱللَّهُ بَصِيرٌۢ بِٱلْعِبَادِ",
      "transcription": "fa-in ḥājjūka fa-qul aslamtu wajhiya lillāhi wa mani ttabaʿani wa qul li-lladhīna ūtū l-kitāba wa l-ummiyyīna a-aslamtum fa-in aslamū fa-qad htadaw wa in tawallaw fa-innamā ʿalayka l-balāghu wa llāhu baṣīrun bi-l-ʿibād",
      "translation": "Agar ular sen bilan bahslashsalar, de: 'Men yuzimni Allohga taslim qildim va menga ergashganlar ham.' Kitob berilganlarga va savodsizlarga de: 'Islomni qabul qildingizmi?' Agar Islomni qabul qilsalar, hidoyat topganlardir. Agar yuz o'girsalar, senga faqat yetkazish (majburiyati) bor. Alloh bandalarga ko'ruvchidir.",
      "tafsir": "Payg'ambarning vazifasi faqat tabligh qilish ekanligi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢١",
      "numberLatin": "21",
      "arabic": "إِنَّ ٱلَّذِينَ يَكْفُرُونَ بِـَٔايَـٰتِ ٱللَّهِ وَيَقْتُلُونَ ٱلنَّبِيِّـۧنَ بِغَيْرِ حَقٍّۢ وَيَقْتُلُونَ ٱلَّذِينَ يَأْمُرُونَ بِٱلْقِسْطِ مِنَ ٱلنَّاسِ فَبَشِّرْهُم بِعَذَابٍ أَلِيمٍۢ",
      "transcription": "inna alladhīna yakfurūna bi-āyāti llāhi wa yaqtulūna n-nabiyyīna bi-ghayri ḥaqqin wa yaqtulūna alladhīna ya'murūna bi-l-qisṭi mina n-nāsi fa-bashshirhum bi-ʿadhābin alīm",
      "translation": "Allohning oyatlarini inkor qilib, payg'ambarlarni nohaq o'ldirib, odamlardan adalatni buyuruvchilarni o'ldiruvchilarga alamli azobni xushxabar ber.",
      "tafsir": "Payg'ambarlarni o'ldirish va adalat tarafdorlariga zulm qilishning jazo¬si.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٢",
      "numberLatin": "22",
      "arabic": "أُو۟لَـٰٓئِكَ ٱلَّذِينَ حَبِطَتْ أَعْمَـٰلُهُمْ فِى ٱلدُّنْيَا وَٱلْءَاخِرَةِ وَمَا لَهُم مِّن نَّـٰصِرِينَ",
      "transcription": "ulā'ika alladhīna ḥabiṭat aʿmāluhum fī d-dunyā wa l-ākhirati wa mā lahum min nāṣirīn",
      "translation": "Mana shular dunyoda ham, oxiratda ham amalları barbod bo'lganlar va ularga yordamchilar yo'q.",
      "tafsir": "Yomon amallarning dunyoyu oxiratda barbod bo'lishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٣",
      "numberLatin": "23",
      "arabic": "أَلَمْ تَرَ إِلَى ٱلَّذِينَ أُوتُوا۟ نَصِيبًۭا مِّنَ ٱلْكِتَـٰبِ يُدْعَوْنَ إِلَىٰ كِتَـٰبِ ٱللَّهِ لِيَحْكُمَ بَيْنَهُمْ ثُمَّ يَتَوَلَّىٰ فَرِيقٌۭ مِّنْهُمْ وَهُم مُّعْرِضُونَ",
      "transcription": "a-lam tara ilā alladhīna ūtū naṣīban mina l-kitābi yudʿawna ilā kitābi llāhi li-yaḥkuma baynahum thumma yatawallā farīqun minhum wa hum muʿriḍūn",
      "translation": "Kitobdan nasiba berilganlarni ko'rmadingmi? Ular Allohning kitobi(ga) chaqiriladi, u ularning orasida hukm qilsin deb, so'ng ulardan bir guruh yuz o'giradi va ular e'tibordan chiqaruvchilardir.",
      "tafsir": "Ahl-kitobning Alloh kitobidan yuz o'girishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٤",
      "numberLatin": "24",
      "arabic": "ذَٰلِكَ بِأَنَّهُمْ قَالُوا۟ لَن تَمَسَّنَا ٱلنَّارُ إِلَّآ أَيَّامًۭا مَّعْدُودَٰتٍۢ ۖ وَغَرَّهُمْ فِى دِينِهِم مَّا كَانُوا۟ يَفْتَرُونَ",
      "transcription": "dhālika bi-annahum qālū lan tamassanā n-nāru illā ayyāman maʿdūdātin wa gharrahum fī dīnihim mā kānū yaftarūn",
      "translation": "Bu ularning: 'Bizni do'zax faqat sanab o'tadigan bir necha kun tegadi' deyishlaridandir. Ularni dinlarida uydurib turgan narsalari aldadi.",
      "tafsir": "Ahl-kitobning o'zlarini aldovchi e'tiqodlari.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٥",
      "numberLatin": "25",
      "arabic": "فَكَيْفَ إِذَا جَمَعْنَـٰهُمْ لِيَوْمٍۢ لَّا رَيْبَ فِيهِ وَوُفِّيَتْ كُلُّ نَفْسٍۢ مَّا كَسَبَتْ وَهُمْ لَا يُظْلَمُونَ",
      "transcription": "fa-kayfa idhā jamaʿnāhum li-yawmin lā rayba fīhi wa wuffiyat kullu nafsin mā kasabat wa hum lā yuẓlamūn",
      "translation": "Ularni shaksiz kunga (qiyomatga) yig'ib, har bir kishiga kasb qilgani to'liq berilganda va ularga zulm qilinmaganda qanday bo'ladi?",
      "tafsir": "Qiyomat kunida har birning to'liq hisob-kitobga tortilishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٦",
      "numberLatin": "26",
      "arabic": "قُلِ ٱللَّـهُمَّ مَـٰلِكَ ٱلْمُلْكِ تُؤْتِى ٱلْمُلْكَ مَن تَشَآءُ وَتَنزِعُ ٱلْمُلْكَ مِمَّن تَشَآءُ وَتُعِزُّ مَن تَشَآءُ وَتُذِلُّ مَن تَشَآءُ ۖ بِيَدِكَ ٱلْخَيْرُ ۖ إِنَّكَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ",
      "transcription": "quli llāhumma mālika l-mulki tu'tī l-mulka man tashā'u wa tanziʿu l-mulka mimman tashā'u wa tuʿizzu man tashā'u wa tudhillu man tashā'u bi-yadika l-khayru innaka ʿalā kulli shay'in qadīr",
      "translation": "De: 'Allohim! Mulkning egasi! Sen xohlaganingga mulk berasan va xohlaganingdan mulkni tortib olasan. Xohlaganingni aziz qilasan va xohlaganingni xor qilasan. Yaxshilik Sening qo'lingdadir. Albatta Sen har narsaga qodirsan.'",
      "tafsir": "Allohning mutlaq hokimiyati va qudrati haqida duo.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٧",
      "numberLatin": "27",
      "arabic": "تُولِجُ ٱلَّيْلَ فِى ٱلنَّهَارِ وَتُولِجُ ٱلنَّهَارَ فِى ٱلَّيْلِ ۖ وَتُخْرِجُ ٱلْحَىَّ مِنَ ٱلْمَيِّتِ وَتُخْرِجُ ٱلْمَيِّتَ مِنَ ٱلْحَىِّ ۖ وَتَرْزُقُ مَن تَشَآءُ بِغَيْرِ حِسَابٍۢ",
      "transcription": "tūliju l-layla fī n-nahāri wa tūliju n-nahāra fī l-layli wa tukhriju l-ḥayya mina l-mayyiti wa tukhriju l-mayyita mina l-ḥayyi wa tarzuqu man tashā'u bi-ghayri ḥisāb",
      "translation": "Sen kechani kunduzga va kunduzni kechaga kiritasan. Tirikni o'likdan va o'likni tirikdan chiqarasan. Va xohlaganingni hisob-kitobsiz rizqlandirasan.",
      "tafsir": "Allohning tabiatni boshqarish qudrati va cheksiz rizq berishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٨",
      "numberLatin": "28",
      "arabic": "لَّا يَتَّخِذِ ٱلْمُؤْمِنُونَ ٱلْكَـٰفِرِينَ أَوْلِيَآءَ مِن دُونِ ٱلْمُؤْمِنِينَ ۖ وَمَن يَفْعَلْ ذَٰلِكَ فَلَيْسَ مِنَ ٱللَّهِ فِى شَىْءٍ إِلَّآ أَن تَتَّقُوا۟ مِنْهُمْ تُقَىٰةًۭ ۗ وَيُحَذِّرُكُمُ ٱللَّهُ نَفْسَهُۥ ۗ وَإِلَى ٱللَّهِ ٱلْمَصِيرُ",
      "transcription": "lā yattakhidhi l-mu'minūna l-kāfirīna awliyā'a min dūni l-mu'minīna wa man yafʿal dhālika fa-laysa mina llāhi fī shay'in illā an tattaqū minhum tuqātan wa yuḥadhdharukumu llāhu nafsahu wa ilā llāhi l-maṣīr",
      "translation": "Mo'minlar kofirlarni mo'minlarni qo'yib do'st tutmasınlar. Kim buni qilsa, Alloh bilan hech aloqasi qolmaydi. Magar ulardan taqiya qilsangiz (zarurat tufayli). Alloh Sizga O'zidan ehtiyot bo'lishni eslatadi. Va qaytish Allohgadir.",
      "tafsir": "Mo'minlarning kofirlar bilan do'stlik qilish taqiqi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٩",
      "numberLatin": "29",
      "arabic": "قُلْ إِن تُخْفُوا۟ مَا فِى صُدُورِكُمْ أَوْ تُبْدُوهُ يَعْلَمْهُ ٱللَّهُ ۗ وَيَعْلَمُ مَا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ وَٱللَّهُ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌۭ",
      "transcription": "qul in tukhfū mā fī ṣudūrikum aw tubdūhu yaʿlamhu llāhu wa yaʿlamu mā fī s-samāwāti wa mā fī l-arḍi wa llāhu ʿalā kulli shay'in qadīr",
      "translation": "De: 'Ko'kslaringizdagi narsalarni yashirsangiz ham, oshkor qilsangiz ham, Alloh uni biladi. U osmonlardagi va yerdagi narsalarni biladi. Alloh har narsaga qodirdir.'",
      "tafsir": "Allohning sirli va oshkor barcha narsalarni bilishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٠",
      "numberLatin": "30",
      "arabic": "يَوْمَ تَجِدُ كُلُّ نَفْسٍۢ مَّا عَمِلَتْ مِنْ خَيْرٍۢ مُّحْضَرًۭا وَمَا عَمِلَتْ مِن سُوٓءٍۢ تَوَدُّ لَوْ أَنَّ بَيْنَهَا وَبَيْنَهُۥٓ أَمَدًۢا بَعِيدًۭا ۗ وَيُحَذِّرُكُمُ ٱللَّهُ نَفْسَهُۥ ۗ وَٱللَّهُ رَءُوفٌۢ بِٱلْعِبَادِ",
      "transcription": "yawma tajidu kullu nafsin mā ʿamilat min khayrin muḥḍaran wa mā ʿamilat min sū'in tawaddu law anna baynahā wa baynahu amadan baʿīdan wa yuḥadhdharukumu llāhu nafsahu wa llāhu ra'ūfun bi-l-ʿibād",
      "translation": "Har bir kishi o'zi qilgan yaxshiliklarni hazir holda topadigan va qilgan yomonlikları topadigan kun, u o'zi bilan uning orasida uzoq masofa bo'lishini istaydi. Alloh sizga O'zidan ehtiyot bo'lishni eslatadi. Alloh bandalarga shafqatlidir.",
      "tafsir": "Qiyomat kunida amallarning paydo bo'lishi va pushaymonlik.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣١",
      "numberLatin": "31",
      "arabic": "قُلْ إِن كُنتُمْ تُحِبُّونَ ٱللَّهَ فَٱتَّبِعُونِى يُحْبِبْكُمُ ٱللَّهُ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ ۗ وَٱللَّهُ غَفُورٌۭ رَّحِيمٌۭ",
      "transcription": "qul in kuntum tuḥibbūna llāha fa-ttabiʿūnī yuḥbibkumu llāhu wa yaghfir lakum dhunūbakum wa llāhu ghafūrun raḥīm",
      "translation": "De: 'Agar Allohni sevib qo'lsangiz, menga ergashing, Alloh sizni sevadi va gunohlaringizni kechiradi. Alloh mag'firachi va rahmlidir.'",
      "tafsir": "Allohni sevishning alamati Payg'ambarga ergashishdir.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٢",
      "numberLatin": "32",
      "arabic": "قُلْ أَطِيعُوا۟ ٱللَّهَ وَٱلرَّسُولَ ۖ فَإِن تَوَلَّوْا۟ فَإِنَّ ٱللَّهَ لَا يُحِبُّ ٱلْكَـٰفِرِينَ",
      "transcription": "qul aṭīʿū llāha wa r-rasūla fa-in tawallaw fa-inna llāha lā yuḥibbu l-kāfirīn",
      "translation": "De: 'Allohga va Rasulga itoat qiling!' Agar yuz o'girsalar, albatta Alloh kofirlarni sevmaydi.",
      "tafsir": "Alloh va Rasulga itoat qilish majburiyati.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٣",
      "numberLatin": "33",
      "arabic": "إِنَّ ٱللَّهَ ٱصْطَفَىٰٓ ءَادَمَ وَنُوحًۭا وَءَالَ إِبْرَٰهِيمَ وَءَالَ عِمْرَٰنَ عَلَى ٱلْعَـٰلَمِينَ",
      "transcription": "inna llāha ṣṭafā ādama wa nūḥan wa āla ibrāhīma wa āla ʿimrāna ʿalā l-ʿālamīn",
      "translation": "Albatta Alloh Odam, Nuh, Ibrohim avlodi va Imron avlodini olamlardan tanladi.",
      "tafsir": "Payg'ambarlar va ularning oilalarining tanlanishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٤",
      "numberLatin": "34",
      "arabic": "ذُرِّيَّةًۢ بَعْضُهَا مِنۢ بَعْضٍۢ ۗ وَٱللَّهُ سَمِيعٌ عَلِيمٌۭ",
      "transcription": "dhurriyyatan baʿḍuhā min baʿḍin wa llāhu samīʿun ʿalīm",
      "translation": "Ular bir-biridan bo'lgan avloddir. Alloh eshituvchi va biluvchidir.",
      "tafsir": "Payg'ambarlar nasli va Allohning sifatlari.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٥",
      "numberLatin": "35",
      "arabic": "إِذْ قَالَتِ ٱمْرَأَتُ عِمْرَٰنَ رَبِّ إِنِّى نَذَرْتُ لَكَ مَا فِى بَطْنِى مُحَرَّرًۭا فَتَقَبَّلْ مِنِّىٓ ۖ إِنَّكَ أَنتَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
      "transcription": "idh qālati mra'atu ʿimrāna rabbi innī nadhartu laka mā fī baṭnī muḥarraran fa-taqabbal minnī innaka anta s-samīʿu l-ʿalīm",
      "translation": "Imronning xotini: 'Robbim! Men qornımdagini Senga azod qilib nazr qıldım. Mendan qabul qil. Albatta Sen eshituvchi va biluvchi Zotsan' deganda.",
      "tafsir": "Imron xotinining duosi va nazri.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٦",
      "numberLatin": "36",
      "arabic": "فَلَمَّا وَضَعَتْهَا قَالَتْ رَبِّ إِنِّى وَضَعْتُهَآ أُنثَىٰ وَٱللَّهُ أَعْلَمُ بِمَا وَضَعَتْ وَلَيْسَ ٱلذَّكَرُ كَٱلْأُنثَىٰ ۖ وَإِنِّى سَمَّيْتُهَا مَرْيَمَ وَإِنِّىٓ أُعِيذُهَا بِكَ وَذُرِّيَّتَهَا مِنَ ٱلشَّيْطَـٰنِ ٱلرَّجِيمِ",
      "transcription": "fa-lammā waḍaʿathā qālat rabbi innī waḍaʿtuhā unthā wa llāhu aʿlamu bimā waḍaʿat wa laysa dh-dhakaru ka-l-unthā wa innī sammaytuhā maryama wa innī uʿīdhuhā bika wa dhurriyyatahā mina sh-shayṭāni r-rajīm",
      "translation": "Uni tug'gach: 'Robbim! Men uni ayol qilib tug'dim' dedi. Alloh uning nima tug'ganini yaxshi biladi. Erkak ayolga o'xshamaydi. Va men uni Maryam deb nomlodim. Men uni va uning avlodini qoğılgan shaytondan Senga panoh berib qo'yaman.",
      "tafsir": "Maryam Alayhissalomning tug'ulishi va panoh so'rash duosi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٣٧",
      "numberLatin": "37",
      "arabic": "فَتَقَبَّلَهَا رَبُّهَا بِقَبُولٍ حَسَنٍۢ وَأَنۢبَتَهَا نَبَاتًا حَسَنًۭا وَكَفَّلَهَا زَكَرِيَّا ۖ كُلَّمَا دَخَلَ عَلَيْهَا زَكَرِيَّا ٱلْمِحْرَابَ وَجَدَ عِندَهَا رِزْقًۭا ۖ قَالَ يَـٰمَرْيَمُ أَنَّىٰ لَكِ هَـٰذَا ۖ قَالَتْ هُوَ مِنْ عِندِ ٱللَّهِ ۖ إِنَّ ٱللَّهَ يَرْزُقُ مَن يَشَآءُ بِغَيْرِ حِسَابٍۢ",
      "transcription": "fa-taqabbalahā rabbuhā bi-qabūlin ḥasanin wa anabatahā nabātan ḥasanan wa kaffalahā zakariyyā kullamā dakhala ʿalayhā zakariyyā l-miḥrāba wajada ʿindahā rizqan qāla yā maryamu annā laki hādhā qālat huwa min ʿindi llāhi inna llāha yarzuqu man yashā'u bi-ghayri ḥisāb",
      "translation": "Robbi uni go'zal qabul qildi va uni go'zal o'sishiga o'stirdi. Zakariyoni uning vasisi qildi. Zakariya mihrobga uning yaniga har kirganda, uning yonida rizq topardi. (Zakariya): 'Ey Maryam! Bu senga qayerdan?' dedi. (Maryam): 'Bu Alloh tomonidandir. Albatta Alloh xohlaganini hisob-kitobsiz rizqlandiradi' dedi.",
      "tafsir": "Maryam Alayhissalomning tarbiyasi va mo'jizaviy rizq.",
      "copySymbol": "📋"
    },
      {
        "numberArabic": "٣٨",
        "numberLatin": "38",
        "arabic": "هُنَالِكَ دَعَا زَكَرِيَّا رَبَّهُۥ ۖ قَالَ رَبِّ هَبْ لِى مِن لَّدُنكَ ذُرِّيَّةًۭ طَيِّبَةً ۖ إِنَّكَ سَمِيعُ ٱلدُّعَآءِ",
        "transcription": "hunālika daʿā zakariyyā rabbahu qāla rabbi hab lī min ladunka dhurriyyatan ṭayyibatan innaka samīʿu d-duʿā'",
        "translation": "O'sha paytda Zakariya Robbisiga duo qildi. Dedi: 'Robbim! Menga O'z huzuringdan pok avlod ato et. Albatta Sen duoni eshituvchi Zotsan.'",
        "tafsir": "Zakariya Alayhissalomning farzand so'rab duosi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣٩",
        "numberLatin": "39",
        "arabic": "فَنَادَتْهُ ٱلْمَلَـٰٓئِكَةُ وَهُوَ قَآئِمٌۭ يُصَلِّى فِى ٱلْمِحْرَابِ أَنَّ ٱللَّهَ يُبَشِّرُكَ بِيَحْيَىٰ مُصَدِّقًۢا بِكَلِمَةٍۢ مِّنَ ٱللَّهِ وَسَيِّدًۭا وَحَصُورًۭا وَنَبِيًّۭا مِّنَ ٱلصَّـٰلِحِينَ",
        "transcription": "fa-nādathu l-malā'ikatu wa huwa qā'imun yuṣallī fī l-miḥrābi anna llāha yubashshiruka bi-yaḥyā muṣaddiqan bi-kalimatin mina llāhi wa sayyidan wa ḥaṣūran wa nabiyyan mina ṣ-ṣāliḥīn",
        "translation": "U mihrobda turib namoz o'qiyotganida farishtalar uni chaqirib: 'Alloh seni Yahyo bilan xushxabar beradi. U Allohdan bo'lgan kalimani (Iso Alayhissalomni) tasdiq qiluvchi, sarvar, pokiza va solihlardan bo'lgan payg'ambardir' dedilar.",
        "tafsir": "Yahyo Alayhissalomning tug'ilishi haqida xushxabar.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٠",
        "numberLatin": "40",
        "arabic": "قَالَ رَبِّ أَنَّىٰ يَكُونُ لِى غُلَـٰمٌۭ وَقَدْ بَلَغَنِىَ ٱلْكِبَرُ وَٱمْرَأَتِى عَاقِرٌۭ ۖ قَالَ كَذَٰلِكَ ٱللَّهُ يَفْعَلُ مَا يَشَآءُ",
        "transcription": "qāla rabbi annā yakūnu lī ghulāmun wa qad balaghaniya l-kibaru wa mra'atī ʿāqirun qāla kadhālika llāhu yafʿalu mā yashā'u",
        "translation": "Dedi: 'Robbim! Menga qanday qilib farzand bo'ladi? Men keksayib, xotinim ham tug'maydigan ayoldir.' (Javob berildi): 'Alloh xohlaganini qiladi.'",
        "tafsir": "Zakariya Alayhissalomning hayrati va Allohning qudrati haqida javob.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤١",
        "numberLatin": "41",
        "arabic": "قَالَ رَبِّ ٱجْعَل لِّىٓ ءَايَةًۭ ۖ قَالَ ءَايَتُكَ أَلَّا تُكَلِّمَ ٱلنَّاسَ ثَلَـٰثَةَ أَيَّامٍ إِلَّا رَمْزًۭا ۗ وَٱذْكُر رَّبَّكَ كَثِيرًۭا وَسَبِّحْ بِٱلْعَشِىِّ وَٱلْإِبْكَـٰرِ",
        "transcription": "qāla rabbi j'al lī āyatan qāla āyatuka allā tukallima n-nāsa thalāthata ayyāmin illā ramzan wa dhkur rabbaka kathīran wa sabbiḥ bi-l-ʿashiyyi wa l-ibkār",
        "translation": "Dedi: 'Robbim! Menga belgi qilib ber.' (Javob): 'Senning belging - uch kun davomida odamlar bilan ishora-imodan boshqa gapirmaslikdir. Robbingni ko'p zikr qil va kechqurun va ertalab tasbih et.'",
        "tafsir": "Zakariya Alayhissalomga berilgan belgi va zikr buyrug'i.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٢",
        "numberLatin": "42",
        "arabic": "وَإِذْ قَالَتِ ٱلْمَلَـٰٓئِكَةُ يَـٰمَرْيَمُ إِنَّ ٱللَّهَ ٱصْطَفَىٰكِ وَطَهَّرَكِ وَٱصْطَفَىٰكِ عَلَىٰ نِسَآءِ ٱلْعَـٰلَمِينَ",
        "transcription": "wa idh qālati l-malā'ikatu yā maryamu inna llāha ṣṭafāki wa ṭahharaki wa ṣṭafāki ʿalā nisā'i l-ʿālamīn",
        "translation": "Farishtalar: 'Ey Maryam! Albatta Alloh seni tanladi, poklashtirdi va dunyodagi ayollardan ustun qildi' deganlarini (esla).",
        "tafsir": "Maryam Alayhissalomning tanlanishi va poklanishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٣",
        "numberLatin": "43",
        "arabic": "يَـٰمَرْيَمُ ٱقْنُتِى لِرَبِّكِ وَٱسْجُدِى وَٱرْكَعِى مَعَ ٱلرَّٰكِعِينَ",
        "transcription": "yā maryamu qnutī li-rabbiki wa sjudī wa rkaʿī maʿa r-rākiʿīn",
        "translation": "Ey Maryam! Robbingga itoat qil, sajda qil va ruku qiluvchilar bilan birga ruku qil.",
        "tafsir": "Maryam Alayhissalomga ibodat buyrug'i.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٤",
        "numberLatin": "44",
        "arabic": "ذَٰلِكَ مِنْ أَنۢبَآءِ ٱلْغَيْبِ نُوحِيهِ إِلَيْكَ ۚ وَمَا كُنتَ لَدَيْهِمْ إِذْ يُلْقُونَ أَقْلَـٰمَهُمْ أَيُّهُمْ يَكْفُلُ مَرْيَمَ وَمَا كُنتَ لَدَيْهِمْ إِذْ يَخْتَصِمُونَ",
        "transcription": "dhālika min anbā'i l-ghaybi nūḥīhi ilayka wa mā kunta ladayhim idh yulqūna aqlāmahum ayyuhum yakfulu maryama wa mā kunta ladayhim idh yakhtaṣimūn",
        "translation": "Bu g'ayb xabarlaridandir, Biz uni senga vahiy qilamiz. Ular Maryamga kim vasi bo'lishini hal qilish uchun qalamlarini tashlaganlarida sen ularning yonida emas eding. Ular bahslashganlarida ham sen ularning yonida emas eding.",
        "tafsir": "Payg'ambarga g'ayb xabarlarining vahiy qilinishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٥",
        "numberLatin": "45",
        "arabic": "إِذْ قَالَتِ ٱلْمَلَـٰٓئِكَةُ يَـٰمَرْيَمُ إِنَّ ٱللَّهَ يُبَشِّرُكِ بِكَلِمَةٍۢ مِّنْهُ ٱسْمُهُ ٱلْمَسِيحُ عِيسَى ٱبْنُ مَرْيَمَ وَجِيهًۭا فِى ٱلدُّنْيَا وَٱلْءَاخِرَةِ وَمِنَ ٱلْمُقَرَّبِينَ",
        "transcription": "idh qālati l-malā'ikatu yā maryamu inna llāha yubashshiruki bi-kalimatin minhu smuhu l-masīḥu ʿīsā bnu maryama wajīhan fī d-dunyā wa l-ākhirati wa mina l-muqarrabīn",
        "translation": "Farishtalar: 'Ey Maryam! Alloh seni O'zidan bo'lgan kalima bilan xushxabar beradi. Uning nomi Masih Iso ibn Maryam. U dunyoda ham, oxiratda ham hurmatli va (Allohga) yaqinlardan bo'ladi' deganlarini (esla).",
        "tafsir": "Iso Alayhissalomning tug'ilishi haqida xushxabar.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٦",
        "numberLatin": "46",
        "arabic": "وَيُكَلِّمُ ٱلنَّاسَ فِى ٱلْمَهْدِ وَكَهْلًۭا وَمِنَ ٱلصَّـٰلِحِينَ",
        "transcription": "wa yukallilu n-nāsa fī l-mahdi wa kahlan wa mina ṣ-ṣāliḥīn",
        "translation": "U odamlar bilan beshikda ham, katta bo'lganda ham gaplashadi va solihlardan bo'ladi.",
        "tafsir": "Iso Alayhissalomning beshikda gaplash mo'jizasi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٧",
        "numberLatin": "47",
        "arabic": "قَالَتْ رَبِّ أَنَّىٰ يَكُونُ لِى وَلَدٌۭ وَلَمْ يَمْسَسْنِى بَشَرٌۭ ۖ قَالَ كَذَٰلِكِ ٱللَّهُ يَخْلُقُ مَا يَشَآءُ ۚ إِذَا قَضَىٰٓ أَمْرًۭا فَإِنَّمَا يَقُولُ لَهُۥ كُن فَيَكُونُ",
        "transcription": "qālat rabbi annā yakūnu lī waladun wa lam yamsasnī basharun qāla kadhālika llāhu yakhluqu mā yashā'u idhā qaḍā amran fa-innamā yaqūlu lahu kun fa-yakūn",
        "translation": "Dedi: 'Robbim! Menga qanday qilib farzand bo'ladi? Halbuki hech bir inson menga tegmagan.' (Javob): 'Shunday qilib Alloh xohlaganini yaratadi. Bir ishni qilishni xohlasa, unga faqat 'bo'l' deydi va u bo'ladi.'",
        "tafsir": "Maryam Alayhissalomning hayrati va Allohning yaratish qudrati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٨",
        "numberLatin": "48",
        "arabic": "وَيُعَلِّمُهُ ٱلْكِتَـٰبَ وَٱلْحِكْمَةَ وَٱلتَّوْرَىٰةَ وَٱلْإِنجِيلَ",
        "transcription": "wa yuʿallimuhu l-kitāba wa l-ḥikmata wa t-tawrāta wa l-injīl",
        "translation": "Va (Alloh) unga kitob, hikmat, Tavrot va Injilni o'rgatadi.",
        "tafsir": "Iso Alayhissalomga berilgan ilmlar.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤٩",
        "numberLatin": "49",
        "arabic": "وَرَسُولًا إِلَىٰ بَنِىٓ إِسْرَٰٓءِيلَ أَنِّى قَدْ جِئْتُكُم بِـَٔايَةٍۢ مِّن رَّبِّكُمْ ۖ أَنِّىٓ أَخْلُقُ لَكُم مِّنَ ٱلطِّينِ كَهَيْـَٔةِ ٱلطَّيْرِ فَأَنفُخُ فِيهِ فَيَكُونُ طَيْرًۢا بِإِذْنِ ٱللَّهِ ۖ وَأُبْرِئُ ٱلْأَكْمَهَ وَٱلْأَبْرَصَ وَأُحْىِ ٱلْمَوْتَىٰ بِإِذْنِ ٱللَّهِ ۖ وَأُنَبِّئُكُم بِمَا تَأْكُلُونَ وَمَا تَدَّخِرُونَ فِى بُيُوتِكُمْ ۚ إِنَّ فِى ذَٰلِكَ لَءَايَةًۭ لَّكُمْ إِن كُنتُمْ مُّؤْمِنِينَ",
        "transcription": "wa rasūlan ilā banī isrā'īla annī qad ji'tukum bi-āyatin min rabbikum annī akhluqu lakum mina ṭ-ṭīni ka-hay'ati ṭ-ṭayri fa-anfukhu fīhi fa-yakūnu ṭayran bi-idhni llāhi wa ubri'u l-akmaha wa l-abraṣa wa uḥyī l-mawtā bi-idhni llāhi wa unabbi'ukum bimā ta'kulūna wa mā taddakhirūna fī buyūtikum inna fī dhālika la-āyatan lakum in kuntum mu'minīn",
        "translation": "Va Bani Isroilga rasul qilib: 'Men sizlarga Robbingizdan belgi bilan keldim. Men sizlar uchun loydan qush shakliga o'xshash narsa yasab, unga damlab, Allohning izni bilan qush qilaman. Allohning izni bilan ko'r va maxovni shifo beraman va o'liklarni tiriltiraman. Sizlarga nima yeyishingizni va uylaringizda nima yig'ishingizni aytaman. Agar mo'min bo'lsangiz, albatta bunda sizlar uchun belgi bor.'",
        "tafsir": "Iso Alayhissalomning mo'jizalari va Bani Isroilga yuborilishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥٠",
        "numberLatin": "50",
        "arabic": "وَمُصَدِّقًۭا لِّمَا بَيْنَ يَدَىَّ مِنَ ٱلتَّوْرَىٰةِ وَلِأُحِلَّ لَكُم بَعْضَ ٱلَّذِى حُرِّمَ عَلَيْكُمْ ۚ وَجِئْتُكُم بِـَٔايَةٍۢ مِّن رَّبِّكُمْ فَٱتَّقُوا۟ ٱللَّهَ وَأَطِيعُونِ",
        "transcription": "wa muṣaddiqan li-mā bayna yadayya mina t-tawrāti wa li-uḥilla lakum baʿḍa lladhī ḥurrima ʿalaykum wa ji'tukum bi-āyatin min rabbikum fa-ttaqū llāha wa aṭīʿūn",
        "translation": "Va mendan oldingi Tavrotni tasdiq qiluvchi va sizlarga haram qilingan ba'zi narsalarni halol qilish uchun (keldim). Va sizlarga Robbingizdan belgi bilan keldim. Allohdan qo'rqing va menga itoat qiling.",
        "tafsir": "Iso Alayhissalomning Tavrotni tasdiq qilishi va ba'zi ahkomlarni yengillashtirishi.",
        "copySymbol": "📋"
    },
    {

      }
    ]
  },
    {
      "id": 4,
      "name": "An-Nisa",
      "arabicName": "النساء",
      "meaning": "Ayollar 👩‍👧‍👦",
      "ayahCount": 176,
      "place": "Madina 🌟",
      "ayahs": [
        {
          "numberArabic": "١",
          "numberLatin": "1",
          "arabic": "يَـٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمُ ٱلَّذِى خَلَقَكُم مِّن نَّفْسٍۢ وَٰحِدَةٍۢ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًۭا كَثِيرًۭا وَنِسَآءًۭ ۚ وَٱتَّقُوا۟ ٱللَّهَ ٱلَّذِى تَسَآءَلُونَ بِهِۦ وَٱلْأَرْحَامَ ۚ إِنَّ ٱللَّهَ كَانَ عَلَيْكُمْ رَقِيبًۭا",
          "transcription": "yā ayyuhā n-nāsu ttaqū rabbakumu lladhī khalaqakum min nafsin wāḥidatin wa khalaqa minhā zawjahā wa baththa minhumā rijālan kathīran wa nisā'an wa ttaqū llāha lladhī tasā'alūna bihi wa l-arḥāma inna llāha kāna ʿalaykum raqīban",
          "translation": "Ey odamlar! Sizni bir jandan yaratgan va undan juftini yaratib, ikkovidan ko'p erkaklar va ayollarni tarqatgan Robbingizdan qo'rqing. Nomi bilan bir-biringizdan so'rashga majbur bo'lgan Allohdan va qarindoshlik aloqalaridan qo'rqing. Albatta Alloh sizni kuzatib turuvchidir.",
          "tafsir": "Insonlarning bir asldan yaratilishi va taqvo tavsiyasi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٢",
          "numberLatin": "2",
          "arabic": "وَءَاتُوا۟ ٱلْيَتَـٰمَىٰٓ أَمْوَٰلَهُمْ ۖ وَلَا تَتَبَدَّلُوا۟ ٱلْخَبِيثَ بِٱلطَّيِّبِ ۖ وَلَا تَأْكُلُوٓا۟ أَمْوَٰلَهُمْ إِلَىٰٓ أَمْوَٰلِكُمْ ۚ إِنَّهُۥ كَانَ حُوبًۭا كَبِيرًۭا",
          "transcription": "wa ātū l-yatāmā amwālahum wa lā tabaddalū l-khabītha bi-ṭ-ṭayyibi wa lā ta'kulū amwālahum ilā amwālikum innahu kāna ḥūban kabīran",
          "translation": "Yetimlarga ularning mollarini bering. Yomonni yaxshi o'rniga almashtirib qo'ymang va ularning mollarini o'z mollaringiz bilan aralashtirib yemang. Albatta bu katta gunohdir.",
          "tafsir": "Yetim mollariga xiyonat qilish taqiqi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٣",
          "numberLatin": "3",
          "arabic": "وَإِنْ خِفْتُمْ أَلَّا تُقْسِطُوا۟ فِى ٱلْيَتَـٰمَىٰ فَٱنكِحُوا۟ مَا طَابَ لَكُم مِّنَ ٱلنِّسَآءِ مَثْنَىٰ وَثُلَـٰثَ وَرُبَـٰعَ ۖ فَإِنْ خِفْتُمْ أَلَّا تَعْدِلُوا۟ فَوَٰحِدَةً أَوْ مَا مَلَكَتْ أَيْمَـٰنُكُمْ ۚ ذَٰلِكَ أَدْنَىٰٓ أَلَّا تَعُولُوا۟",
          "transcription": "wa in khiftum allā tuqsiṭū fī l-yatāmā fa-nkiḥū mā ṭāba lakum mina n-nisā'i mathnā wa thulātha wa rubāʿa fa-in khiftum allā taʿdilū fa-wāḥidatan aw mā malakat aymānukum dhālika adnā allā taʿūlū",
          "translation": "Agar yetimlarga adolat qila olmasligingizdan qo'rqsangiz, sizga yoqqan ayollardan ikki, uch va to'rttadan nikoh qiling. Agar (xotinlar orasida) adolat qila olmasligingizdan qo'rqsangiz, bittasini yoki qo'lingiz ostidagilarni (oling). Bu zulm qilmasligingizga yaqinroqdir.",
          "tafsir": "Ko'p xotinlik va adolat sharti haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٤",
          "numberLatin": "4",
          "arabic": "وَءَاتُوا۟ ٱلنِّسَآءَ صَدُقَـٰتِهِنَّ نِحْلَةًۭ ۚ فَإِن طِبْنَ لَكُمْ عَن شَىْءٍۢ مِّنْهُ نَفْسًۭا فَكُلُوهُ هَنِيٓـًۭٔا مَّرِيٓـًۭٔا",
          "transcription": "wa ātū n-nisā'a ṣaduqātihinna niḥlatan fa-in ṭibna lakum ʿan shay'in minhu nafsan fa-kulūhu hanī'an marī'an",
          "translation": "Ayollarga mehrlarini sovg'a sifatida bering. Agar ular o'z xohishlari bilan undan biror narsani sizga berishsa, uni yaxshi va halol holda yeng.",
          "tafsir": "Ayollarga mehr berish va ularning rozi bo'lishi haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٥",
          "numberLatin": "5",
          "arabic": "وَلَا تُؤْتُوا۟ ٱلسُّفَهَآءَ أَمْوَٰلَكُمُ ٱلَّتِى جَعَلَ ٱللَّهُ لَكُمْ قِيَـٰمًۭا وَٱرْزُقُوهُمْ فِيهَا وَٱكْسُوهُمْ وَقُولُوا۟ لَهُمْ قَوْلًۭا مَّعْرُوفًۭا",
          "transcription": "wa lā tu'tū s-sufahā'a amwālakumu llatī jaʿala llāhu lakum qiyāman wa rzuqūhum fīhā wa ksūhum wa qūlū lahum qawlan maʿrūfan",
          "translation": "Alloh sizga turmush tiragini qilib qo'ygan mollaringizni nodonlarga bermang. Ularni u (mol) dan rizqlantiring, kiyintiring va ularga yaxshi so'z ayting.",
          "tafsir": "Aqlsizlarga mol ishonib berilmasligi haqida.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٦",
          "numberLatin": "6",
          "arabic": "وَٱبْتَلُوا۟ ٱلْيَتَـٰمَىٰ حَتَّىٰٓ إِذَا بَلَغُوا۟ ٱلنِّكَاحَ فَإِنْ ءَانَسْتُم مِّنْهُمْ رُشْدًۭا فَٱدْفَعُوٓا۟ إِلَيْهِمْ أَمْوَٰلَهُمْ ۖ وَلَا تَأْكُلُوهَآ إِسْرَافًۭا وَبِدَارًا أَن يَكْبَرُوا۟ ۚ وَمَن كَانَ غَنِيًّۭا فَلْيَسْتَعْفِفْ ۖ وَمَن كَانَ فَقِيرًۭا فَلْيَأْكُلْ بِٱلْمَعْرُوفِ ۚ فَإِذَا دَفَعْتُمْ إِلَيْهِمْ أَمْوَٰلَهُمْ فَأَشْهِدُوا۟ عَلَيْهِمْ ۚ وَكَفَىٰ بِٱللَّهِ حَسِيبًۭا",
          "transcription": "wa btalū l-yatāmā ḥattā idhā balaghū n-nikāḥa fa-in ānastum minhum rushdan fa-dfaʿū ilayhim amwālahum wa lā ta'kulūhā isrāfan wa bidāran an yakbarū wa man kāna ghaniyyan fa-l-yastaʿfif wa man kāna faqīran fa-l-ya'kul bi-l-maʿrūf fa-idhā dafaʿtum ilayhim amwālahum fa-ashhidū ʿalayhim wa kafā billāhi ḥasīban",
          "translation": "Yetimlarda nikoh yoshiga yetguncha sinab ko'ring. Agar ularda aql-idrok borligini bilsangiz, mollarini ularga bering. Ular katta bo'lishidan oldin isrof va shoshilinch bilan yemang. Kim boy bo'lsa, poklansin. Kim kambag'al bo'lsa, ma'ruf miqdorda yesin. Mollārini ularga berganda, ustidan guvoh keltiring. Alloh hisob olish uchun yetarlidir.",
          "tafsir": "Yetimlarning mollarini qaytarish tartibi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٧",
          "numberLatin": "7",
          "arabic": "لِّلرِّجَالِ نَصِيبٌۭ مِّمَّا تَرَكَ ٱلْوَٰلِدَانِ وَٱلْأَقْرَبُونَ وَلِلنِّسَآءِ نَصِيبٌۭ مِّمَّا تَرَكَ ٱلْوَٰلِدَانِ وَٱلْأَقْرَبُونَ مِمَّا قَلَّ مِنْهُ أَوْ كَثُرَ ۚ نَصِيبًۭا مَّفْرُوضًۭا",
          "transcription": "li-r-rijāli naṣībun mimmā taraka l-wālidāni wa l-aqrabūna wa li-n-nisā'i naṣībun mimmā taraka l-wālidāni wa l-aqrabūna mimmā qalla minhu aw kathura naṣīban mafrūḍan",
          "translation": "Ota-ona va yaqin qarindoshlar qoldirgan moldan erkaklarga nasiba bor. Ota-ona va yaqin qarindoshlar qoldirgan moldan ayollarga ham nasiba bor - oz bo'lsin yoki ko'p bo'lsin. (Bu) belgilangan nasiba.",
          "tafsir": "Meros haqlarida erkak va ayollarning teng huquqlari.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٨",
          "numberLatin": "8",
          "arabic": "وَإِذَا حَضَرَ ٱلْقِسْمَةَ أُو۟لُوا۟ ٱلْقُرْبَىٰ وَٱلْيَتَـٰمَىٰ وَٱلْمَسَـٰكِينُ فَٱرْزُقُوهُم مِّنْهُ وَقُولُوا۟ لَهُمْ قَوْلًۭا مَّعْرُوفًۭا",
          "transcription": "wa idhā ḥaḍara l-qismata ulū l-qurbā wa l-yatāmā wa l-masākīnu fa-rzuqūhum minhu wa qūlū lahum qawlan maʿrūfan",
          "translation": "Taqsim qilish paytida qarindoshlar, yetimlar va miskinlar hozir bo'lsalar, ularni undan rizqlantiring va ularga yaxshi so'z ayting.",
          "tafsir": "Meros taqsimida kambag'allarni unutmaslik.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "٩",
          "numberLatin": "9",
          "arabic": "وَلْيَخْشَ ٱلَّذِينَ لَوْ تَرَكُوا۟ مِنْ خَلْفِهِمْ ذُرِّيَّةًۭ ضِعَـٰفًا خَافُوا۟ عَلَيْهِمْ فَلْيَتَّقُوا۟ ٱللَّهَ وَلْيَقُولُوا۟ قَوْلًۭا سَدِيدًا",
          "transcription": "wa l-yakhsha lladhīna law tarakū min khalfihim dhurriyyatan ḍiʿāfan khāfū ʿalayhim fa-l-yattaqū llāha wa l-yaqūlū qawlan sadīdan",
          "translation": "Agar o'zlari ortidan zaif avlodlarni qoldirsalar, ular uchun qo'rqadigan kishilar (ham boshqalar haqida) qo'rqsinlar. Allohdan qo'rqsinlar va to'g'ri so'z aytsinlar.",
          "tafsir": "Zaif avlodlarni himoya qilish bo'yicha nasihat.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "١٠",
          "numberLatin": "10",
          "arabic": "إِنَّ ٱلَّذِينَ يَأْكُلُونَ أَمْوَٰلَ ٱلْيَتَـٰمَىٰ ظُلْمًا إِنَّمَا يَأْكُلُونَ فِى بُطُونِهِمْ نَارًۭا ۖ وَسَيَصْلَوْنَ سَعِيرًا",
          "transcription": "inna lladhīna ya'kulūna amwāla l-yatāmā ẓulman innamā ya'kulūna fī buṭūnihim nāran wa sa-yaṣlawna saʿīran",
          "translation": "Yetimlarning mollarini zulm bilan yeyuvchilar qorinlariga faqat olov yeyishmoqda va tez orada ular alangali do'zaxga kirishadi.",
          "tafsir": "Yetim molini yeyishning qattiq jazo¬si.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "١١",
          "numberLatin": "11",
          "arabic": "يُوصِيكُمُ ٱللَّهُ فِىٓ أَوْلَـٰدِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ ٱلْأُنثَيَيْنِ ۚ فَإِن كُنَّ نِسَآءًۭ فَوْقَ ٱثْنَتَيْنِ فَلَهُنَّ ثُلُثَا مَا تَرَكَ ۖ وَإِن كَانَتْ وَٰحِدَةًۭ فَلَهَا ٱلنِّصْفُ ۚ وَلِأَبَوَيْهِ لِكُلِّ وَٰحِدٍۢ مِّنْهُمَا ٱلسُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُۥ وَلَدٌۭ ۚ فَإِن لَّمْ يَكُن لَّهُۥ وَلَدٌۭ وَوَرِثَهُۥٓ أَبَوَاهُ فَلِأُمِّهِ ٱلثُّلُثُ ۚ فَإِن كَانَ لَهُۥٓ إِخْوَةٌۭ فَلِأُمِّهِ ٱلسُّدُسُ ۚ مِنۢ بَعْدِ وَصِيَّةٍۢ يُوصِى بِهَآ أَوْ دَيْنٍۢ ۗ ءَابَآؤُكُمْ وَأَبْنَآؤُكُمْ لَا تَدْرُونَ أَيُّهُمْ أَقْرَبُ لَكُمْ نَفْعًۭا ۚ فَرِيضَةًۭ مِّنَ ٱللَّهِ ۗ إِنَّ ٱللَّهَ كَانَ عَلِيمًا حَكِيمًۭا",
          "transcription": "yūṣīkumu llāhu fī awlādikum li-dh-dhakari mithlu ḥaẓẓi l-unthayayni fa-in kunna nisā'an fawqa thnatayni fa-lahunna thuluthā mā taraka wa in kānat wāḥidatan fa-lahā n-niṣfu wa li-abawayhi li-kulli wāḥidin minhumā s-sudusu mimmā taraka in kāna lahu waladun fa-in lam yakun lahu waladun wa warithahu abawāhu fa-li-ummihi th-thuluthu fa-in kāna lahu ikhwatun fa-li-ummihi s-sudusu min baʿdi waṣiyyatin yūṣī bihā aw daynin ābā'ukum wa abnā'ukum lā tadrūna ayyuhum aqrabu lakum nafʿan farīḍatan mina llāhi inna llāha kāna ʿalīman ḥakīman",
          "translation": "Alloh sizga farzandlaringiz haqida amr qiladi: erkakka ikki ayolning ulushiga teng (bor). Agar (meros qoldiradigan kishi farzandlari) ikki ayoldan ko'p ayol bo'lsa, ularga qoldirganining uchdan ikki qismi tegadi. Agar bitta ayol bo'lsa, unga yarmi tegadi. Agar o'lgan kishining farzandi bo'lsa, uning har bir ota-onasiga qoldirganidan oltidan bir qism tegadi. Agar farzandi bo'lmay, ota-onasi meros olsa, onasiga uchdan bir qism tegadi. Agar uning aka-ukalari bo'lsa, onasiga oltidan bir qism tegadi. (Bu) vasiyat qilgan vasiyatidan yoki qarzdan keyin (amalga oshiriladi). Sizning ota-onalaringiz va farzandlaringiz - qaysi biri sizga foyda jihatidan yaqinroq ekanini bilmaysiz. (Bu) Allohdan fariza. Albatta Alloh biluvchi va hikmatli Zotdir.",
          "tafsir": "Meros taqsimining asosiy qoidalari.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "١٢",
          "numberLatin": "12",
          "arabic": "وَلَكُمْ نِصْفُ مَا تَرَكَ أَزْوَٰجُكُمْ إِن لَّمْ يَكُن لَّهُنَّ وَلَدٌۭ ۚ فَإِن كَانَ لَهُنَّ وَلَدٌۭ فَلَكُمُ ٱلرُّبُعُ مِمَّا تَرَكْنَ ۚ مِنۢ بَعْدِ وَصِيَّةٍۢ يُوصِينَ بِهَآ أَوْ دَيْنٍۢ ۚ وَلَهُنَّ ٱلرُّبُعُ مِمَّا تَرَكْتُمْ إِن لَّمْ يَكُن لَّكُمْ وَلَدٌۭ ۚ فَإِن كَانَ لَكُمْ وَلَدٌۭ فَلَهُنَّ ٱلثُّمُنُ مِمَّا تَرَكْتُم ۚ مِنۢ بَعْدِ وَصِيَّةٍۢ تُوصُونَ بِهَآ أَوْ دَيْنٍۢ ۗ وَإِن كَانَ رَجُلٌۭ يُورَثُ كَلَـٰلَةً أَوِ ٱمْرَأَةٌۭ وَلَهُۥٓ أَخٌ أَوْ أُخْتٌۭ فَلِكُلِّ وَٰحِدٍۢ مِّنْهُمَا ٱلسُّدُسُ ۚ فَإِن كَانُوٓا۟ أَكْثَرَ مِن ذَٰلِكَ فَهُمْ شُرَكَآءُ فِى ٱلثُّلُثِ ۚ مِنۢ بَعْدِ وَصِيَّةٍۢ يُوصَىٰ بِهَآ أَوْ دَيْنٍ غَيْرَ مُضَآرٍّۢ ۚ وَصِيَّةًۭ مِّنَ ٱللَّهِ ۗ وَٱللَّهُ عَلِيمٌ حَلِيمٌۭ",
          "transcription": "wa lakum niṣfu mā taraka azwājukum in lam yakun lahunna waladun fa-in kāna lahunna waladun fa-lakumu r-rubuʿu mimmā tarakna min baʿdi waṣiyyatin yūṣīna bihā aw daynin wa lahunna r-rubuʿu mimmā taraktum in lam yakun lakum waladun fa-in kāna lakum waladun fa-lahunna th-thumunu mimmā taraktum min baʿdi waṣiyyatin tūṣūna bihā aw daynin wa in kāna rajulun yūrathu kalālatan awi mra'atun wa lahu akhun aw ukhtun fa-li-kulli wāḥidin minhumā s-sudusu fa-in kānū akthara min dhālika fa-hum shurakā'u fī th-thuluthi min baʿdi waṣiyyatin yūṣā bihā aw daynin ghayra muḍārrin waṣiyyatan mina llāhi wa llāhu ʿalīmun ḥalīm",
          "translation": "Agar xotinlaringizning farzandi bo'lmasa, ular qoldirganidan sizga yarmi bor. Agar farzandlari bo'lsa, ular qoldirganidan sizga to'rtdan bir qism bor. (Bu) ular vasiyat qilgan vasiyat yoki qarzdan keyin. Agar sizning farzandingiz bo'lmasa, ularga sizning qoldirganingizdan to'rtdan bir qism bor. Agar farzandingiz bo'lsa, ularga sizning qoldirganingizdan sakkizdan bir qism bor. (Bu) siz vasiyat qilgan vasiyat yoki qarzdan keyin. Agar kalala holida meros qoldiradigan erkak yoki ayol bo'lib, uning (ona-ota tomonidan) akasi yoki singlisi bo'lsa, ularning har biriga oltidan bir qism bor. Agar bundan ko'p bo'lsalar, ular uchdan bir qismda sherikdirlar. (Bu) zarar bermaslik sharti bilan vasiyat yoki qarzdan keyin. (Bu) Allohdan vasiyat. Alloh biluvchi va hilmli Zotdir.",
          "tafsir": "Er-xotin va kalala merosining taqsimi.",
          "copySymbol": "📋"
        },
        {
          "numberArabic": "١٣",
          "numberLatin": "13",
          "arabic": "تِلْكَ حُدُودُ ٱللَّهِ ۚ وَمَن يُطِعِ ٱللَّهَ وَرَسُولَهُۥ يُدْخِلْهُ جَنَّـٰتٍۢ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَـٰرُ خَـٰلِدِينَ فِيهَا ۚ وَذَٰلِكَ ٱلْفَوْزُ ٱلْعَظِيمُ",
          "transcription": "tilka ḥudūdu llāhi wa man yuṭiʿi llāha wa rasūlahu yudkhilhu jannātin tajrī min taḥtihā l-anhāru khālidīna fīhā wa dhālika l-fawzu l-ʿaẓīm",
          "translation": "Bular Allohning chegaralaridir. Kim Allohga va Rasulga itoat qilsa, U uni ostidan daryolar oqib turgan jannatlarni kiritadi va ular unda abadiy qoladilar. Va bu ulkan muvaffaqiyatdir.",
          "tafsir": "Meros qoidalariga rioya qilishning mukofoti.",
          "copySymbol": "📋"
        },
          {
            "numberArabic": "١٤",
            "numberLatin": "14",
            "arabic": "وَمَن يَعْصِ ٱللَّهَ وَرَسُولَهُۥ وَيَتَعَدَّ حُدُودَهُۥ يُدْخِلْهُ نَارًا خَـٰلِدًۭا فِيهَا وَلَهُۥ عَذَابٌۭ مُّهِينٌۭ",
            "transcription": "wa man yaʿṣi llāha wa rasūlahu wa yataʿadda ḥudūdahu yudkhilhu nāran khālidan fīhā wa lahu ʿadhābun muhīn",
            "translation": "Kim Allohga va Rasulga osliq qilib, Uning chegaralarini buzsa, U uni do'zaxga kiritadi va unda abadiy qoladi. Unga xorlovchi azob bor.",
            "tafsir": "Alloh chegaralarini buzishning jazo¬si.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٥",
            "numberLatin": "15",
            "arabic": "وَٱلَّـٰتِى يَأْتِينَ ٱلْفَـٰحِشَةَ مِن نِّسَآئِكُمْ فَٱسْتَشْهِدُوا۟ عَلَيْهِنَّ أَرْبَعَةًۭ مِّنكُمْ ۖ فَإِن شَهِدُوا۟ فَأَمْسِكُوهُنَّ فِى ٱلْبُيُوتِ حَتَّىٰ يَتَوَفَّىٰهُنَّ ٱلْمَوْتُ أَوْ يَجْعَلَ ٱللَّهُ لَهُنَّ سَبِيلًۭا",
            "transcription": "wa llātī ya'tīna l-fāḥishata min nisā'ikum fa-stashhidū ʿalayhinna arbaʿatan minkum fa-in shahidū fa-amsikūhunna fī l-buyūti ḥattā yatawaffāhunna l-mawtu aw yajʿala llāhu lahunna sabīlan",
            "translation": "Ayollaringizdan fahshiyat qiladiganlar haqida o'zingizdan to'rt kishi guvoh keltiring. Agar guvohlik berishsa, ularni uylarda to'sib qo'ying, toki o'lim ularni olib ketgunicha yoki Alloh ular uchun yo'l ochgunicha.",
            "tafsir": "Zino qilgan ayollarga jazoning qadimgi tartibi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٦",
            "numberLatin": "16",
            "arabic": "وَٱلَّذَانِ يَأْتِيَـٰنِهَا مِنكُمْ فَـَٔاذُوهُمَا ۖ فَإِن تَابَا وَأَصْلَحَا فَأَعْرِضُوا۟ عَنْهُمَآ ۗ إِنَّ ٱللَّهَ كَانَ تَوَّابًۭا رَّحِيمًۭا",
            "transcription": "wa lladhāni ya'tiyānihā minkum fa-ādhūhumā fa-in tābā wa aṣlaḥā fa-aʿriḍū ʿanhumā inna llāha kāna tawwāban raḥīman",
            "translation": "Sizlardan ikkovingiz (erkak va ayol) uni qilsalar, ularni azoblang. Agar tavba qilib isloh bo'lsalar, ulardan yuz o'giring. Albatta Alloh ko'p tavba qabul qiluvchi va rahmli Zotdir.",
            "tafsir": "Zino qiluvchilarga jazoning umumiy tartibi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٧",
            "numberLatin": "17",
            "arabic": "إِنَّمَا ٱلتَّوْبَةُ عَلَى ٱللَّهِ لِلَّذِينَ يَعْمَلُونَ ٱلسُّوٓءَ بِجَهَـٰلَةٍۢ ثُمَّ يَتُوبُونَ مِن قَرِيبٍۢ فَأُو۟لَـٰٓئِكَ يَتُوبُ ٱللَّهُ عَلَيْهِمْ ۗ وَٱللَّهُ عَلِيمٌ حَكِيمٌۭ",
            "transcription": "inna-mā t-tawbatu ʿalā llāhi li-lladhīna yaʿmalūna s-sū'a bi-jahālatin thumma yatūbūna min qarībin fa-ulā'ika yatūbu llāhu ʿalayhim wa llāhu ʿalīmun ḥakīm",
            "translation": "Tavba faqat yomon ishni nodonlik bilan qilib, so'ng tezda tavba qiluvchilar uchun Alloh zimmasidadir. Mana shularning tavbasini Alloh qabul qiladi. Alloh biluvchi va hikmatli Zotdir.",
            "tafsir": "Tavbaning qabul qilinish shartlari.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٨",
            "numberLatin": "18",
            "arabic": "وَلَيْسَتِ ٱلتَّوْبَةُ لِلَّذِينَ يَعْمَلُونَ ٱلسَّيِّـَٔاتِ حَتَّىٰٓ إِذَا حَضَرَ أَحَدَهُمُ ٱلْمَوْتُ قَالَ إِنِّى تُبْتُ ٱلْـَٔـٰنَ وَلَا ٱلَّذِينَ يَمُوتُونَ وَهُمْ كُفَّارٌ ۚ أُو۟لَـٰٓئِكَ أَعْتَدْنَا لَهُمْ عَذَابًا أَلِيمًۭا",
            "transcription": "wa laysati t-tawbatu li-lladhīna yaʿmalūna s-sayyi'āti ḥattā idhā ḥaḍara aḥadahumu l-mawtu qāla innī tubtu l-āna wa lā lladhīna yamūtūna wa hum kuffārun ulā'ika aʿtadnā lahum ʿadhāban alīman",
            "translation": "Yomon ishlar qilib, birining o'limi yetib kelganda: 'Men hozir tavba qildim' deyuvchilar va kofir holda o'ladigan kishilar uchun tavba yo'q. Mana shular uchun alamli azob tayyorladik.",
            "tafsir": "Qabul qilinmaydigan tavbalar haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٩",
            "numberLatin": "19",
            "arabic": "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا يَحِلُّ لَكُمْ أَن تَرِثُوا۟ ٱلنِّسَآءَ كَرْهًۭا ۖ وَلَا تَعْضُلُوهُنَّ لِتَذْهَبُوا۟ بِبَعْضِ مَآ ءَاتَيْتُمُوهُنَّ إِلَّآ أَن يَأْتِينَ بِفَـٰحِشَةٍۢ مُّبَيِّنَةٍۢ ۚ وَعَاشِرُوهُنَّ بِٱلْمَعْرُوفِ ۚ فَإِن كَرِهْتُمُوهُنَّ فَعَسَىٰٓ أَن تَكْرَهُوا۟ شَيْـًۭٔا وَيَجْعَلَ ٱللَّهُ فِيهِ خَيْرًۭا كَثِيرًۭا",
            "transcription": "yā ayyuhā lladhīna āmanū lā yaḥillu lakum an tarithū n-nisā'a karhan wa lā taʿḍulūhunna li-tadhhabū bi-baʿḍi mā ātaytumūhunna illā an ya'tīna bi-fāḥishatin mubayyinatin wa ʿāshirūhunna bi-l-maʿrūfi fa-in karihtumūhunna fa-ʿasā an takrahū shay'an wa yajʿala llāhu fīhi khayran kathīran",
            "translation": "Ey iymon keltirguvchilar! Sizga ayollarni majburan meros qilib olish halol emas. Ular ochiq-oydin fahshiyat qilmagani holda, ularga berganiringizning bir qismini qaytarib olish uchun ularni qiynmang. Ular bilan yaxshilik bilan yashang. Agar ularni yomon ko'rsangiz, ehtimol siz bir narsani yomon ko'rasiz, Alloh esa unda ko'p yaxshilik qo'yadi.",
            "tafsir": "Ayollarga yaxshi muomala qilish va ularni majburlamamaslik.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٠",
            "numberLatin": "20",
            "arabic": "وَإِنْ أَرَدتُّمُ ٱسْتِبْدَالَ زَوْجٍۢ مَّكَانَ زَوْجٍۢ وَءَاتَيْتُمْ إِحْدَىٰهُنَّ قِنطَارًۭا فَلَا تَأْخُذُوا۟ مِنْهُ شَيْـًۭٔا ۚ أَتَأْخُذُونَهُۥ بُهْتَـٰنًۭا وَإِثْمًۭا مُّبِينًا",
            "transcription": "wa in aradtumu stibdāla zawjin makāna zawjin wa ātaytum iḥdāhunna qinṭāran fa-lā ta'khudhū minhu shay'an a-ta'khudhūnahu buhtānan wa ithman mubīnan",
            "translation": "Agar bir xotinni boshqasi o'rniga almashtirmoqchi bo'lsangiz va ulardan biriga qantar (mol) bergan bo'lsangiz, undan hech narsani olmang. Uni buhtonga va ochiq gunohga olib olasizmi?",
            "tafsir": "Xotinni almashtirish paytida molni qaytarib olish taqiqi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢١",
            "numberLatin": "21",
            "arabic": "وَكَيْفَ تَأْخُذُونَهُۥ وَقَدْ أَفْضَىٰ بَعْضُكُمْ إِلَىٰ بَعْضٍۢ وَأَخَذْنَ مِنكُم مِّيثَـٰقًا غَلِيظًۭا",
            "transcription": "wa kayfa ta'khudhūnahu wa qad afḍā baʿḍukum ilā baʿḍin wa akhdhna minkum mīthāqan ghalīẓan",
            "translation": "Qanday qilib uni olasiz? Holbuki siz bir-biringizga yaqinlashib, ular sizdan qattiq ahd olganlar.",
            "tafsir": "Nikoh ahdining muqaddasligi va mehr haqqi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٢",
            "numberLatin": "22",
            "arabic": "وَلَا تَنكِحُوا۟ مَا نَكَحَ ءَابَآؤُكُم مِّنَ ٱلنِّسَآءِ إِلَّا مَا قَدْ سَلَفَ ۚ إِنَّهُۥ كَانَ فَـٰحِشَةًۭ وَمَقْتًۭا وَسَآءَ سَبِيلًا",
            "transcription": "wa lā tankiḥū mā nakaḥa ābā'ukum mina n-nisā'i illā mā qad salafa innahu kāna fāḥishatan wa maqtan wa sā'a sabīlan",
            "translation": "Otalaringiz nikoh qilgan ayollarni nikoh qilmang - o'tgan ishlardan tashqari. Bu fahshiyat, nafrat va yomon yo'ldir.",
            "tafsir": "Ota xotini bilan nikoh qilish haromi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٣",
            "numberLatin": "23",
            "arabic": "حُرِّمَتْ عَلَيْكُمْ أُمَّهَـٰتُكُمْ وَبَنَاتُكُمْ وَأَخَوَٰتُكُمْ وَعَمَّـٰتُكُمْ وَخَـٰلَـٰتُكُمْ وَبَنَاتُ ٱلْأَخِ وَبَنَاتُ ٱلْأُخْتِ وَأُمَّهَـٰتُكُمُ ٱلَّـٰتِىٓ أَرْضَعْنَكُمْ وَأَخَوَٰتُكُم مِّنَ ٱلرَّضَـٰعَةِ وَأُمَّهَـٰتُ نِسَآئِكُمْ وَرَبَـٰٓئِبُكُمُ ٱلَّـٰتِى فِى حُجُورِكُم مِّن نِّسَآئِكُمُ ٱلَّـٰتِى دَخَلْتُم بِهِنَّ فَإِن لَّمْ تَكُونُوا۟ دَخَلْتُم بِهِنَّ فَلَا جُنَاحَ عَلَيْكُمْ وَحَلَـٰٓئِلُ أَبْنَآئِكُمُ ٱلَّذِينَ مِنْ أَصْلَـٰبِكُمْ وَأَن تَجْمَعُوا۟ بَيْنَ ٱلْأُخْتَيْنِ إِلَّا مَا قَدْ سَلَفَ ۗ إِنَّ ٱللَّهَ كَانَ غَفُورًۭا رَّحِيمًۭا",
            "transcription": "ḥurrimat ʿalaykum ummahātukum wa banātukum wa akhawātukum wa ʿammātukum wa khālātukum wa banātu l-akhi wa banātu l-ukhti wa ummahātukumu llātī arḍaʿnakum wa akhawātukum mina r-raḍāʿati wa ummahātu nisā'ikum wa rabā'ibukumu llātī fī ḥujūrikum min nisā'ikumu llātī dakhaltum bihinna fa-in lam takūnū dakhaltum bihinna fa-lā junāḥa ʿalaykum wa ḥalā'ilu abnā'ikumu lladhīna min aṣlābikum wa an tajmaʿū bayna l-ukhtayni illā mā qad salafa inna llāha kāna ghafūran raḥīman",
            "translation": "Sizga onalaringiz, qizlaringiz, opa-singillaringiz, amalaringiz, xolalaringiz, aka-uka qizlari, opa-singil qizlari, sizni emizgan onalaringiz, sut opa-singilaringiz, xotinlaringizning onalari, yaqin bo'lgan xotinlaringizdan bo'lgan va qaramog'ingizda turgan o'gay qizlaringiz (haram qilindi). Agar ular (onalari) bilan yaqin bo'lmagan bo'lsangiz, (o'gay qizlaringizni olishda) gunoh yo'q. Sulbingizdan bo'lgan o'g'illaringizning xotinlari va ikki opa-singilni bir vaqtda nikohda tutish (haram qilindi) - o'tgan ishlardan tashqari. Albatta Alloh mag'firachi va rahmli Zotdir.",
            "tafsir": "Nikoh qilish haram bo'lgan ayollar ro'yxati.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٤",
            "numberLatin": "24",
            "arabic": "وَٱلْمُحْصَنَـٰتُ مِنَ ٱلنِّسَآءِ إِلَّا مَا مَلَكَتْ أَيْمَـٰنُكُمْ ۖ كِتَـٰبَ ٱللَّهِ عَلَيْكُمْ ۚ وَأُحِلَّ لَكُم مَّا وَرَآءَ ذَٰلِكُمْ أَن تَبْتَغُوا۟ بِأَمْوَٰلِكُم مُّحْصِنِينَ غَيْرَ مُسَـٰفِحِينَ ۚ فَمَا ٱسْتَمْتَعْتُم بِهِۦ مِنْهُنَّ فَـَٔاتُوهُنَّ أُجُورَهُنَّ فَرِيضَةًۭ ۚ وَلَا جُنَاحَ عَلَيْكُمْ فِيمَا تَرَٰضَيْتُم بِهِۦ مِنۢ بَعْدِ ٱلْفَرِيضَةِ ۚ إِنَّ ٱللَّهَ كَانَ عَلِيمًا حَكِيمًۭا",
            "transcription": "wa l-muḥṣanātu mina n-nisā'i illā mā malakat aymānukum kitāba llāhi ʿalaykum wa uḥilla lakum mā warā'a dhālikum an tabtaghū bi-amwālikum muḥṣinīna ghayra musāfiḥīna fa-mā stamtaʿtum bihi minhunna fa-ātūhunna ujūrahunna farīḍatan wa lā junāḥa ʿalaykum fīmā tarāḍaytum bihi min baʿdi l-farīḍati inna llāha kāna ʿalīman ḥakīman",
            "translation": "Ayollardan turmushga chiqqanlar (ham haram) - qo'lingiz ostidagilardan tashqari. Bu sizga Allohning kitobidir. Bunlardan tashqarilari sizga halol qilindi - mollaringiz bilan, poklik saqlovchi bo'lib, buzuqlik qilmasdan talashing uchun. Ulardan kim bilan bahramand bo'lsangiz, ularga belgilangan ajrlarini bering. Belgilanganidan keyin o'zaro rozi bo'lgan narsangizda gunoh yo'q. Albatta Alloh biluvchi va hikmatli Zotdir.",
            "tafsir": "Turmushli ayollar va nikoh shartlari haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٥",
            "numberLatin": "25",
            "arabic": "وَمَن لَّمْ يَسْتَطِعْ مِنكُمْ طَوْلًا أَن يَنكِحَ ٱلْمُحْصَنَـٰتِ ٱلْمُؤْمِنَـٰتِ فَمِن مَّا مَلَكَتْ أَيْمَـٰنُكُم مِّن فَتَيَـٰتِكُمُ ٱلْمُؤْمِنَـٰتِ ۚ وَٱللَّهُ أَعْلَمُ بِإِيمَـٰنِكُم ۚ بَعْضُكُم مِّنۢ بَعْضٍۢ ۚ فَٱنكِحُوهُنَّ بِإِذْنِ أَهْلِهِنَّ وَءَاتُوهُنَّ أُجُورَهُنَّ بِٱلْمَعْرُوفِ مُحْصَنَـٰتٍ غَيْرَ مُسَـٰفِحَـٰتٍۢ وَلَا مُتَّخِذَـٰتِ أَخْدَانٍۢ ۚ فَإِذَآ أُحْصِنَّ فَإِنْ أَتَيْنَ بِفَـٰحِشَةٍۢ فَعَلَيْهِنَّ نِصْفُ مَا عَلَى ٱلْمُحْصَنَـٰتِ مِنَ ٱلْعَذَابِ ۚ ذَٰلِكَ لِمَنْ خَشِىَ ٱلْعَنَتَ مِنكُمْ ۚ وَأَن تَصْبِرُوا۟ خَيْرٌۭ لَّكُمْ ۗ وَٱللَّهُ غَفُورٌۭ رَّحِيمٌۭ",
            "transcription": "wa man lam yastaṭiʿ minkum ṭawlan an yankiḥa l-muḥṣanāti l-mu'mināti fa-min mā malakat aymānukum min fatayātikumu l-mu'mināti wa llāhu aʿlamu bi-īmānikum baʿḍukum min baʿḍin fa-nkiḥūhunna bi-idhni ahlihinna wa ātūhunna ujūrahunna bi-l-maʿrūfi muḥṣanātin ghayra musāfiḥātin wa lā muttakhidhāti akhdānin fa-idhā uḥṣinna fa-in atayna bi-fāḥishatin fa-ʿalayhinna niṣfu mā ʿalā l-muḥṣanāti mina l-ʿadhābi dhālika li-man khashiya l-ʿanata minkum wa an taṣbirū khayrun lakum wa llāhu ghafūrun raḥīm",
            "translation": "Sizlardan mo'mina hür ayollarni nikoh qilishga qudrati yetmaydigan kim bo'lsa, mo'mina qizlaringizdan qo'lingiz ostidagilarni (nikoh qilsin). Alloh sizning iymoningizni yaxshi biladi. Siz bir-biringizdan (yaratilgansiz). Ularni egalari ruxsati bilan nikoh qiling va ma'ruf miqdorda ajrlarini bering. (Ular) poklik saqlovchi bo'lsinlar, buzuqlik qilmassinlar va maxfiy do'st tutmassinlar. Turmushga chiqqandan keyin fahshiyat qilsalar, ularga hür ayollarga (berilgan) azobning yarmi (beriladi). Bu sizlardan mashaqqatdan qo'rquvchilar uchundir. Sabr qilishingiz sizlar uchun yaxshiroqdir. Alloh mag'firachi va rahmli Zotdir.",
            "tafsir": "Qul qizlarni nikoh qilish tartibi va shartlari.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٦",
            "numberLatin": "26",
            "arabic": "يُرِيدُ ٱللَّهُ لِيُبَيِّنَ لَكُمْ وَيَهْدِيَكُمْ سُنَنَ ٱلَّذِينَ مِن قَبْلِكُمْ وَيَتُوبَ عَلَيْكُمْ ۗ وَٱللَّهُ عَلِيمٌ حَكِيمٌۭ",
            "transcription": "yurīdu llāhu li-yubayyina lakum wa yahdiyakum sunana lladhīna min qablikum wa yatūba ʿalaykum wa llāhu ʿalīmun ḥakīm",
            "translation": "Alloh sizga bayan qilmoqchi va sizni sizdan oldingilarning yo'llariga hidoyat qilmoqchi hamda sizning tavbangizni qabul qilmoqchidir. Alloh biluvchi va hikmatli Zotdir.",
            "tafsir": "Allohning hidoyat va bayan qilish iroda¬si.",
            "copySymbol": "📋"
          },
            {
              "numberArabic": "٢٧",
              "numberLatin": "27",
              "arabic": "وَٱللَّهُ يُرِيدُ أَن يَتُوبَ عَلَيْكُمْ وَيُرِيدُ ٱلَّذِينَ يَتَّبِعُونَ ٱلشَّهَوَٰتِ أَن تَمِيلُوا۟ مَيْلًا عَظِيمًۭا",
              "transcription": "wa llāhu yurīdu an yatūba ʿalaykum wa yurīdu lladhīna yattabiʿūna sh-shahawāti an tamīlū maylan ʿaẓīman",
              "translation": "Alloh sizning tavbangizni qabul qilishni xohlaydi. Shahvatlarga ergashuvchilar sizning katta moyil bo'lishingizni xohlaydilar.",
              "tafsir": "Allohning rahmat irodasi va shahvatparast odamlarning yomon niyatlari.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٢٨",
              "numberLatin": "28",
              "arabic": "يُرِيدُ ٱللَّهُ أَن يُخَفِّفَ عَنكُمْ ۚ وَخُلِقَ ٱلْإِنسَـٰنُ ضَعِيفًۭا",
              "transcription": "yurīdu llāhu an yukhaffifa ʿankum wa khuliqa l-insānu ḍaʿīfan",
              "translation": "Alloh sizdan yengillatishni xohlaydi. Inson zaif yaratilgan.",
              "tafsir": "Allohning shariatdagi yengillik va insonning zaifligini hisobga olishi.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٢٩",
              "numberLatin": "29",
              "arabic": "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَأْكُلُوٓا۟ أَمْوَٰلَكُم بَيْنَكُم بِٱلْبَـٰطِلِ إِلَّآ أَن تَكُونَ تِجَـٰرَةً عَن تَرَاضٍۢ مِّنكُمْ ۚ وَلَا تَقْتُلُوٓا۟ أَنفُسَكُمْ ۚ إِنَّ ٱللَّهَ كَانَ بِكُمْ رَحِيمًۭا",
              "transcription": "yā ayyuhā lladhīna āmanū lā ta'kulū amwālakum baynakum bi-l-bāṭili illā an takūna tijāratan ʿan tarāḍin minkum wa lā taqtulū anfusakum inna llāha kāna bikum raḥīman",
              "translation": "Ey iymon keltirguvchilar! Mollaringizni o'zaro batil yo'l bilan yemang. Magar o'zaro rozi bo'lgan savdo bo'lsa. O'zingizni o'ldirmang. Albatta Alloh sizga rahmli Zotdir.",
              "tafsir": "Batil yo'lda mol yeyish va o'z joniga qiyish taqiqi.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٠",
              "numberLatin": "30",
              "arabic": "وَمَن يَفْعَلْ ذَٰلِكَ عُدْوَٰنًۭا وَظُلْمًۭا فَسَوْفَ نُصْلِيهِ نَارًۭا ۚ وَكَانَ ذَٰلِكَ عَلَى ٱللَّهِ يَسِيرًۭا",
              "transcription": "wa man yafʿal dhālika ʿudwānan wa ẓulman fa-sawfa nuṣlīhi nāran wa kāna dhālika ʿalā llāhi yasīran",
              "translation": "Kim buni dushmanchılik va zulm bilan qılsa, tez orada Biz uni olovga kiritamiz. Bu Alloh uchun oson ishdir.",
              "tafsir": "Zulm va dushmanchılik qıluvchılarning jazosi.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣١",
              "numberLatin": "31",
              "arabic": "إِن تَجْتَنِبُوا۟ كَبَآئِرَ مَا تُنْهَوْنَ عَنْهُ نُكَفِّرْ عَنكُمْ سَيِّـَٔاتِكُمْ وَنُدْخِلْكُم مُّدْخَلًۭا كَرِيمًۭا",
              "transcription": "in tajtanibū kabā'ira mā tunhawna ʿanhu nukaffir ʿankum sayyi'ātikum wa nudkhilkum mudkhalan karīman",
              "translation": "Agar sizga taqiqlangan katta gunohlardan qochsangiz, kichik gunohlaringızni sizdan kechıramiz va sizni karamli joyga (jannatga) kirıtarımız.",
              "tafsir": "Katta gunohlardan qochishning mukofotı.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٢",
              "numberLatin": "32",
              "arabic": "وَلَا تَتَمَنَّوْا۟ مَا فَضَّلَ ٱللَّهُ بِهِۦ بَعْضَكُمْ عَلَىٰ بَعْضٍۢ ۚ لِّلرِّجَالِ نَصِيبٌۭ مِّمَّا ٱكْتَسَبُوا۟ ۖ وَلِلنِّسَآءِ نَصِيبٌۭ مِّمَّا ٱكْتَسَبْنَ ۚ وَسْـَٔلُوا۟ ٱللَّهَ مِن فَضْلِهِۦٓ ۗ إِنَّ ٱللَّهَ كَانَ بِكُلِّ شَىْءٍ عَلِيمًۭا",
              "transcription": "wa lā tamannaw mā faḍḍala llāhu bihi baʿḍakum ʿalā baʿḍin li-r-rijāli naṣībun mimmā ktasabū wa li-n-nisā'i naṣībun mimmā ktasabna wa s'alū llāha min faḍlihi inna llāha kāna bi-kulli shay'in ʿalīman",
              "translation": "Alloh ba'zilaringizni boshqalaringizdan ustun qilgan narsasını arzu qılmang. Erkaklarga o'zlari kasb qılganlarından nasiba bor. Ayollarga o'zlari kasb qılganlarından nasiba bor. Allohdan Uning fazlını so'rang. Albatta Alloh har narsanı biluvchidir.",
              "tafsir": "Hasad qılmaslik va har birning o'z nasibasi borligı.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٣",
              "numberLatin": "33",
              "arabic": "وَلِكُلٍّۢ جَعَلْنَا مَوَٰلِىَ مِمَّا تَرَكَ ٱلْوَٰلِدَانِ وَٱلْأَقْرَبُونَ ۚ وَٱلَّذِينَ عَقَدَتْ أَيْمَـٰنُكُمْ فَـَٔاتُوهُمْ نَصِيبَهُمْ ۚ إِنَّ ٱللَّهَ كَانَ عَلَىٰ كُلِّ شَىْءٍۢ شَهِيدًۭا",
              "transcription": "wa li-kullin jaʿalnā mawāliya mimmā taraka l-wālidāni wa l-aqrabūna wa lladhīna ʿaqadat aymānukum fa-ātūhum naṣībahum inna llāha kāna ʿalā kulli shay'in shahīdan",
              "translation": "Har kim uchun ota-ona va yaqın qarındoshlar qoldırgan moldan vorislarni qıldık. O'ng qo'lingiz bilan ahd tuzganlaringizga ularning nasibalarını bering. Albatta Alloh har narsaga guvoh Zotdir.",
              "tafsir": "Meros taqsımı va ahd-shartnoma bo'yicha majburiyatlar.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٤",
              "numberLatin": "34",
              "arabic": "ٱلرِّجَالُ قَوَّٰمُونَ عَلَى ٱلنِّسَآءِ بِمَا فَضَّلَ ٱللَّهُ بَعْضَهُمْ عَلَىٰ بَعْضٍۢ وَبِمَآ أَنفَقُوا۟ مِنْ أَمْوَٰلِهِمْ ۚ فَٱلصَّـٰلِحَـٰتُ قَـٰنِتَـٰتٌ حَـٰفِظَـٰتٌۭ لِّلْغَيْبِ بِمَا حَفِظَ ٱللَّهُ ۚ وَٱلَّـٰتِى تَخَافُونَ نُشُوزَهُنَّ فَعِظُوهُنَّ وَٱهْجُرُوهُنَّ فِى ٱلْمَضَاجِعِ وَٱضْرِبُوهُنَّ ۖ فَإِنْ أَطَعْنَكُمْ فَلَا تَبْغُوا۟ عَلَيْهِنَّ سَبِيلًا ۗ إِنَّ ٱللَّهَ كَانَ عَلِيًّۭا كَبِيرًۭا",
              "transcription": "ar-rijālu qawwāmūna ʿalā n-nisā'i bimā faḍḍala llāhu baʿḍahum ʿalā baʿḍin wa bimā anfaqū min amwālihim fa-ṣ-ṣāliḥātu qānitātun ḥāfiẓātun li-l-ghaybi bimā ḥafiẓa llāhu wa llātī takhāfūna nushūzahunna fa-ʿiẓūhunna wa hjurūhunna fī l-maḍājiʿi wa ḍribūhunna fa-in aṭaʿnakum fa-lā tabghū ʿalayhinna sabīlan inna llāha kāna ʿaliyyan kabīran",
              "translation": "Erkaklar ayollarning ustida qo'yımchılardir - Alloh ba'zılarını boshqalarıdan ustun qılganı va o'z mollarından sarflaganları bilan. Solıha ayollar itoatkor bo'lib, Alloh saqlagan narsanı g'aybda saqlaydilar. İtaatsızlıklarından qo'rqqan ayollaringizga nasihat qiling, yotoqda ayırıng va (zarurat bo'lsa) kaltaklang. Agar sizga bo'ysunsa, ularni zor ko'rish yo'lini ızlamang. Albatta Alloh oliy va buyuk Zotdir.",
              "tafsir": "Oiladagi erkak va ayolning vazifalari hamda nizolarni hal qılish.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٥",
              "numberLatin": "35",
              "arabic": "وَإِنْ خِفْتُمْ شِقَاقَ بَيْنِهِمَا فَٱبْعَثُوا۟ حَكَمًۭا مِّنْ أَهْلِهِۦ وَحَكَمًۭا مِّنْ أَهْلِهَآ إِن يُرِيدَآ إِصْلَـٰحًۭا يُوَفِّقِ ٱللَّهُ بَيْنَهُمَآ ۗ إِنَّ ٱللَّهَ كَانَ عَلِيمًا خَبِيرًۭا",
              "transcription": "wa in khiftum shiqāqa baynihimā fa-bʿathū ḥakaman min ahlihi wa ḥakaman min ahlihā in yurīdā iṣlāḥan yuwaffiqi llāhu baynahumā inna llāha kāna ʿalīman khabīran",
              "translation": "Agar ikkovining orasıda ajralıshdan qo'rqsangız, erning ahilidan bir hakam va ayolning ahlıdan bir hakam yuboring. Agar ikkalası islohni xohlasa, Alloh ularni yarashtiradı. Albatta Alloh biluvchi va xabardor Zotdir.",
              "tafsir": "Oilaviy nizolarni hal qılish uchun hakamlar tayınlash.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٦",
              "numberLatin": "36",
              "arabic": "وَٱعْبُدُوا۟ ٱللَّهَ وَلَا تُشْرِكُوا۟ بِهِۦ شَيْـًۭٔا ۖ وَبِٱلْوَٰلِدَيْنِ إِحْسَـٰنًۭا وَبِذِى ٱلْقُرْبَىٰ وَٱلْيَتَـٰمَىٰ وَٱلْمَسَـٰكِينِ وَٱلْجَارِ ذِى ٱلْقُرْبَىٰ وَٱلْجَارِ ٱلْجُنُبِ وَٱلصَّاحِبِ بِٱلْجَنۢبِ وَٱبْنِ ٱلسَّبِيلِ وَمَا مَلَكَتْ أَيْمَـٰنُكُمْ ۗ إِنَّ ٱللَّهَ لَا يُحِبُّ مَن كَانَ مُخْتَالًۭا فَخُورًا",
              "transcription": "wa ʿbudū llāha wa lā tushrikū bihi shay'an wa bi-l-wālidayni iḥsānan wa bi-dhī l-qurbā wa l-yatāmā wa l-masākīni wa l-jāri dhī l-qurbā wa l-jāri l-junubi wa ṣ-ṣāḥibi bi-l-janbi wa bni s-sabīli wa mā malakat aymānukum inna llāha lā yuḥibbu man kāna mukhtālan fakhūran",
              "translation": "Allohga ibodat qıling va Unga hech narsanı sherık qılmang. Ota-onaga yaxshılıq qıling, qarındoshlarga, yetimlarga, miskınlarga, yaqın qo'shnilarga, uzoq qo'shnılarga, yondosh do'stlarga, yo'lovchılarga va qo'lingız ostıdagılarga (yaxshılık qıling). Albatta Alloh mağrur va maqtanchoq kishini sevmaydi.",
              "tafsir": "Allohga ibodat va turli tobaqa odamlarga yaxshılık qılish.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٧",
              "numberLatin": "37",
              "arabic": "ٱلَّذِينَ يَبْخَلُونَ وَيَأْمُرُونَ ٱلنَّاسَ بِٱلْبُخْلِ وَيَكْتُمُونَ مَآ ءَاتَىٰهُمُ ٱللَّهُ مِن فَضْلِهِۦ ۗ وَأَعْتَدْنَا لِلْكَـٰفِرِينَ عَذَابًۭا مُّهِينًۭا",
              "transcription": "alladhīna yabkhalūna wa ya'murūna n-nāsa bi-l-bukhli wa yaktumūna mā ātāhumu llāhu min faḍlihi wa aʿtadnā li-l-kāfirīna ʿadhāban muhīnan",
              "translation": "Ular baxıllık qılıb, odamlarni baxıllıkka buyuradılar va Alloh ularga bergan fazlını yashıradilar. Kofirlar uchun xorlovchi azob tayyorladık.",
              "tafsir": "Baxıllik va Alloh ne'matini yashırıshning aybi.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٨",
              "numberLatin": "38",
              "arabic": "وَٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ رِئَآءَ ٱلنَّاسِ وَلَا يُؤْمِنُونَ بِٱللَّهِ وَلَا بِٱلْيَوْمِ ٱلْءَاخِرِ ۗ وَمَن يَكُنِ ٱلشَّيْطَـٰنُ لَهُۥ قَرِينًۭا فَسَآءَ قَرِينًۭا",
              "transcription": "wa lladhīna yunfiqūna amwālahum ri'ā'a n-nāsi wa lā yu'minūna bi-llāhi wa lā bi-l-yawmi l-ākhiri wa man yakuni sh-shayṭānu lahu qarīnan fa-sā'a qarīnan",
              "translation": "Mollarını odamlarga ko'rsatish uchun sarflab, Allohga va oxirat kuniga iymon keltırmaydıganlar (ham shundaydir). Kimning sherıgi shayton bo'lsa, u qanday yomon sherikdir!",
              "tafsir": "Riya bilan xayr-ehson qılısh va uning behudalığı.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٣٩",
              "numberLatin": "39",
              "arabic": "وَمَاذَا عَلَيْهِمْ لَوْ ءَامَنُوا۟ بِٱللَّهِ وَٱلْيَوْمِ ٱلْءَاخِرِ وَأَنفَقُوا۟ مِمَّا رَزَقَهُمُ ٱللَّهُ ۚ وَكَانَ ٱللَّهُ بِهِمْ عَلِيمًۭا",
              "transcription": "wa mādhā ʿalayhim law āmanū bi-llāhi wa l-yawmi l-ākhiri wa anfaqū mimmā razaqahumu llāhu wa kāna llāhu bihim ʿalīman",
              "translation": "Agar Allohga va oxirat kuniga iymon keltirib, Alloh ularga bergan rizqdan sarflasalar, ularga nima ziyon bo'lardi? Alloh ularni biluvchidir.",
              "tafsir": "İymon va xayr-ehsonning foydasını ko'rsatish.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٤٠",
              "numberLatin": "40",
              "arabic": "إِنَّ ٱللَّهَ لَا يَظْلِمُ مِثْقَالَ ذَرَّةٍۢ ۖ وَإِن تَكُ حَسَنَةًۭ يُضَـٰعِفْهَا وَيُؤْتِ مِن لَّدُنْهُ أَجْرًا عَظِيمًۭا",
              "transcription": "inna llāha lā yaẓlimu mithqāla dharratin wa in taku ḥasanatan yuḍāʿifhā wa yu'ti min ladunhu ajran ʿaẓīman",
              "translation": "Albatta Alloh zarra miqdoricha zulm qılmaydi. Agar yaxshılık bo'lsa, uni ko'paytıradı va O'z huzurıdan ulkan ajr beradı.",
              "tafsir": "Allohning mutlaq adalati va yaxshı amallarning mukofotı.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٤١",
              "numberLatin": "41",
              "arabic": "فَكَيْفَ إِذَا جِئْنَا مِن كُلِّ أُمَّةٍۭ بِشَهِيدٍۢ وَجِئْنَا بِكَ عَلَىٰ هَـٰٓؤُلَآءِ شَهِيدًۭا",
              "transcription": "fa-kayfa idhā ji'nā min kulli ummatin bi-shahīdin wa ji'nā bika ʿalā hā'ulā'i shahīdan",
              "translation": "Har bir ummatdan guvoh keltirganimızda va seni bular ustıdan guvoh qılib keltirganimızda qanday bo'ladı?",
              "tafsir": "Qiyomat kunida payg'ambarlarning o'z ummatları ustidan guvohlik berıshi.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٤٢",
              "numberLatin": "42",
              "arabic": "يَوْمَئِذٍۢ يَوَدُّ ٱلَّذِينَ كَفَرُوا۟ وَعَصَوُا۟ ٱلرَّسُولَ لَوْ تُسَوَّىٰ بِهِمُ ٱلْأَرْضُ وَلَا يَكْتُمُونَ ٱللَّهَ حَدِيثًۭا",
              "transcription": "yawma'idhin yawaddu lladhīna kafarū wa ʿaṣaw r-rasūla law tusawwā bihimu l-arḍu wa lā yaktumūna llāha ḥadīthan",
              "translation": "O kun kofır bo'lıb Rasulga osılık qılganlar yer ular bilan tekıslanıb ketıshını tılarlar va Allohdan hech gapnı yashıra olmaydılar.",
              "tafsir": "Qiyomat kunida kofirlarning pushaymonlığı va haqıqatning ochıq bo'lıshi.",
              "copySymbol": "📋"
            },
              {
                "numberArabic": "٤٣",
                "numberLatin": "43",
                "arabic": "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَقْرَبُوا۟ ٱلصَّلَوٰةَ وَأَنتُمْ سُكَـٰرَىٰ حَتَّىٰ تَعْلَمُوا۟ مَا تَقُولُونَ وَلَا جُنُبًا إِلَّا عَابِرِى سَبِيلٍ حَتَّىٰ تَغْتَسِلُوا۟ ۚ وَإِن كُنتُم مَّرْضَىٰٓ أَوْ عَلَىٰ سَفَرٍ أَوْ جَآءَ أَحَدٌۭ مِّنكُم مِّنَ ٱلْغَآئِطِ أَوْ لَـٰمَسْتُمُ ٱلنِّسَآءَ فَلَمْ تَجِدُوا۟ مَآءًۭ فَتَيَمَّمُوا۟ صَعِيدًۭا طَيِّبًۭا فَٱمْسَحُوا۟ بِوُجُوهِكُمْ وَأَيْدِيكُمْ ۗ إِنَّ ٱللَّهَ كَانَ عَفُوًّا غَفُورًۭا",
                "transcription": "yā ayyuhā lladhīna āmanū lā taqrabū ṣ-ṣalāta wa antum sukārā ḥattā taʿlamū mā taqūlūna wa lā junuban illā ʿābirī sabīlin ḥattā taghtasilū wa in kuntum marḍā aw ʿalā safarin aw jā'a aḥadun minkum mina l-ghā'iṭi aw lāmastumu n-nisā'a fa-lam tajidū mā'an fa-tayammamū ṣaʿīdan ṭayyiban fa-msaḥū bi-wujūhikum wa aydīkum inna llāha kāna ʿafuwwan ghafūran",
                "translation": "Ey iymon keltirguvchilar! Mest bo'lgan holda nima deyotganingizni bilguncha namozga yaqinlashmang. Junub holda ham - yo'ldan o'tib ketuvchilardan boshqa - yuvinguncha (namozga yaqinlashmang). Agar kasalsangiz yoki safardasangiz yoki biringiz hojatxonadan kelsa yoki ayollar bilan yaqinlashsangiz va suv topmasa, pok tuproq bilan tayammum qiling: yuzlaringiz va qo'llaringizni surting. Albatta Alloh afv qiluvchi va mag'firachi Zotdir.",
                "tafsir": "Namoz uchun tahorat va tayammum qoidalari.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٤",
                "numberLatin": "44",
                "arabic": "أَلَمْ تَرَ إِلَى ٱلَّذِينَ أُوتُوا۟ نَصِيبًۭا مِّنَ ٱلْكِتَـٰبِ يَشْتَرُونَ ٱلضَّلَـٰلَةَ وَيُرِيدُونَ أَن تَضِلُّوا۟ ٱلسَّبِيلَ",
                "transcription": "a-lam tara ilā lladhīna ūtū naṣīban mina l-kitābi yashtarūna ḍ-ḍalālata wa yurīdūna an taḍillū s-sabīl",
                "translation": "Kitobdan nasiba berilganlarni ko'rmadingmi? Ular dalolat sotib olishmoqda va sizning yo'ldan adashishingizni xohlaydilar.",
                "tafsir": "Ahl-kitobning dalolat tanlashi va boshqalarni adashtirish istagı.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٥",
                "numberLatin": "45",
                "arabic": "وَٱللَّهُ أَعْلَمُ بِأَعْدَآئِكُمْ ۚ وَكَفَىٰ بِٱللَّهِ وَلِيًّۭا وَكَفَىٰ بِٱللَّهِ نَصِيرًۭا",
                "transcription": "wa llāhu aʿlamu bi-aʿdā'ikum wa kafā billāhi waliyyan wa kafā billāhi naṣīran",
                "translation": "Alloh sizning dushmanlaringizni yaxshi biladi. Alloh himoyachi sifatida yetarli va Alloh yordamchi sifatida yetarli.",
                "tafsir": "Allohning dushmanlarni bilishi va mo'minlarga himoya va yordam berishi.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٦",
                "numberLatin": "46",
                "arabic": "مِّنَ ٱلَّذِينَ هَادُوا۟ يُحَرِّفُونَ ٱلْكَلِمَ عَن مَّوَاضِعِهِۦ وَيَقُولُونَ سَمِعْنَا وَعَصَيْنَا وَٱسْمَعْ غَيْرَ مُسْمَعٍۢ وَرَٰعِنَا لَيًّۢا بِأَلْسِنَتِهِمْ وَطَعْنًۭا فِى ٱلدِّينِ ۚ وَلَوْ أَنَّهُمْ قَالُوا۟ سَمِعْنَا وَأَطَعْنَا وَٱسْمَعْ وَٱنظُرْنَا لَكَانَ خَيْرًۭا لَّهُمْ وَأَقْوَمَ وَلَـٰكِن لَّعَنَهُمُ ٱللَّهُ بِكُفْرِهِمْ فَلَا يُؤْمِنُونَ إِلَّا قَلِيلًۭا",
                "transcription": "mina lladhīna hādū yuḥarrifūna l-kalima ʿan mawāḍiʿihi wa yaqūlūna samiʿnā wa ʿaṣaynā wa smaʿ ghayra musmaʿin wa rāʿinā layyan bi-alsinatihim wa ṭaʿnan fī d-dīni wa law annahum qālū samiʿnā wa aṭaʿnā wa smaʿ wa nẓurnā la-kāna khayran lahum wa aqwama wa lākin laʿanahumu llāhu bi-kufrihim fa-lā yu'minūna illā qalīlan",
                "translation": "Yahudiylardan ba'zilari so'zlarni o'z joylaridan burmalab, 'Eshitdik va itoatsizlik qildik', 'Eshit, eshittirilmagan', 'Ra'ina' deb tillarini burib, dinga hujum qilib aytadilar. Agar ular: 'Eshitdik va itoat qildik', 'Eshit', 'Bizga qarab tur' desalar, o'zlari uchun yaxshi va to'g'ri bo'lardi. Lekin Alloh ularni kufrlari tufayli la'natladi, shuning uchun ozginalari bundan mustasno iymon keltirmaydilar.",
                "tafsir": "Yahudiylarning so'zlarni buzish va Islomga nisbatan yomon munosabati.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٧",
                "numberLatin": "47",
                "arabic": "يَـٰٓأَيُّهَا ٱلَّذِينَ أُوتُوا۟ ٱلْكِتَـٰبَ ءَامِنُوا۟ بِمَا نَزَّلْنَا مُصَدِّقًۭا لِّمَا مَعَكُم مِّن قَبْلِ أَن نَّطْمِسَ وُجُوهًۭا فَنَرُدَّهَا عَلَىٰٓ أَدْبَارِهَآ أَوْ نَلْعَنَهُمْ كَمَا لَعَنَّآ أَصْحَـٰبَ ٱلسَّبْتِ ۚ وَكَانَ أَمْرُ ٱللَّهِ مَفْعُولًۭا",
                "transcription": "yā ayyuhā lladhīna ūtū l-kitāba āminū bimā nazzalnā muṣaddiqan li-mā maʿakum min qabli an naṭmisa wujūhan fa-naruddahā ʿalā adbārihā aw nalʿanahum ka-mā laʿannā aṣḥāba s-sabti wa kāna amru llāhi mafʿūlan",
                "translation": "Ey Kitob berilganlar! Yuzlarni (belgilarini) o'chirib, orqalariga qaytarishimizdan yoki shanba ahlini la'natlaganimizdek sizni la'natlashimizdan oldin, qashingizdagini tasdiq qiluvchi narsaga (Qur'onga) iymon keltiring. Allohning amri albatta bajarilur.",
                "tafsir": "Ahl-kitobga Qur'onga iymon keltirish taklifi va ogohlik.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٨",
                "numberLatin": "48",
                "arabic": "إِنَّ ٱللَّهَ لَا يَغْفِرُ أَن يُشْرَكَ بِهِۦ وَيَغْفِرُ مَا دُونَ ذَٰلِكَ لِمَن يَشَآءُ ۚ وَمَن يُشْرِكْ بِٱللَّهِ فَقَدِ ٱفْتَرَىٰٓ إِثْمًا عَظِيمًا",
                "transcription": "inna llāha lā yaghfiru an yushraka bihi wa yaghfiru mā dūna dhālika li-man yashā'u wa man yushrik billāhi fa-qadi ftarā ithman ʿaẓīman",
                "translation": "Albatta Alloh O'ziga shirk qilinishini kechirmaydi va undan boshqa (gunohlarni) xohlaganiga kechiradi. Kim Allohga shirk qilsa, katta gunoh uydirgan bo'ladi.",
                "tafsir": "Shirkni kechirmaslik va boshqa gunohlarning kechiriluvi.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٤٩",
                "numberLatin": "49",
                "arabic": "أَلَمْ تَرَ إِلَى ٱلَّذِينَ يُزَكُّونَ أَنفُسَهُم ۚ بَلِ ٱللَّهُ يُزَكِّى مَن يَشَآءُ وَلَا يُظْلَمُونَ فَتِيلًۭا",
                "transcription": "a-lam tara ilā lladhīna yuzakkūna anfusahum bali llāhu yuzakkī man yashā'u wa lā yuẓlamūna fatīlan",
                "translation": "O'zlarini poklab yurganlarni ko'rmadingmi? Yo'q, Alloh xohlaganini poklaydi va ularga xurmo ichi miqdoricha ham zulm qilinmaydi.",
                "tafsir": "O'zini poklaydigan kishilarni rad etish va haqiqiy poklanish Alloh qo'lida ekanligi.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٥٠",
                "numberLatin": "50",
                "arabic": "ٱنظُرْ كَيْفَ يَفْتَرُونَ عَلَى ٱللَّهِ ٱلْكَذِبَ ۖ وَكَفَىٰ بِهِۦٓ إِثْمًۭا مُّبِينًۭا",
                "transcription": "nẓur kayfa yaftarūna ʿalā llāhi l-kadhiba wa kafā bihi ithman mubīnan",
                "translation": "Qarang, ular Allohga qanday yolg'on tuhmat qo'yishmoqda! Bu ochiq gunoh sifatida yetarli.",
                "tafsir": "Allohga yolg'on tuhmat qo'yishning katta gunoh ekanligi.",
                "copySymbol": "📋"
            },
            {
          },
          {
        },
        {
      }
    ]
  },
  {
    id: 5,
    name: "Al-Maida",
    arabicName: "المائدة",
    meaning: "Dasturxon",
    ayahCount: 120,
    place: "Madina",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o‘rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ أَوْفُوا۟ بِٱلْعُقُودِ",
        transcription: "Yaa ayyuha alladhiina aamanuu awfu bil-‘uquud",
        translation: "Ey iymon keltirganlar, shartnomalaringizga rioya qiling",
        tafsir: "Shartnomalarga sodiq bo‘lish muhimligi ta’kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "أُحِلَّتْ لَكُم بَهِيمَةُ ٱلْأَنْعَٰمِ إِلَّا مَا يُتْلَىٰ عَلَيْكُمْ",
        transcription: "Uhilla lakum bahiimat ul-an‘aami illaa maa yutlaa ‘alaykum",
        translation: "Sizlarga chorva hayvonlari halol qilindi, faqat sizga o‘qib berilganlar bundan mustasno",
        tafsir: "Halol va harom oziq-ovqatlar haqida ko‘rsatma beriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "وَلَا تُحَرِّمُوا۟ طَيِّبَٰتِ مَآ أَحَلَّ ٱللَّهُ لَكُمْ",
        transcription: "Walaa tuharrimuu tayyibaati maa ahalla Allahu lakum",
        translation: "Alloh sizlarga halol qilgan pok narsalarni harom qilmang",
        tafsir: "Alloh ruxsat bergan narsalarni o‘z-o‘zidan taqiqlash man etiladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "وَكُلُوا۟ مِمَّا رَزَقَكُمُ ٱللَّهُ حَلَٰلًا طَيِّبًا",
        transcription: "Wakuluu mimmaa razaqakumu Allahu halaalan tayyiban",
        translation: "Alloh sizlarga rizq qilib bergan narsalardan halol va pok bo‘lganini yeng",
        tafsir: "Halol rizqdan foydalanish buyuriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَٱتَّقُوا۟ ٱللَّهَ ٱلَّذِىٓ أَنتُم بِهِۦ مُؤْمِنُونَ",
        transcription: "Wattaqu Allaha alladhii antum bihi mu’minuun",
        translation: "Allohdan qo‘rqing, Unga iymon keltirgan bo‘lsangiz",
        tafsir: "Iymonning talabi sifatida Allohdan qo‘rqish buyuriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا قُمْتُمْ إِلَى ٱلصَّلَوٰةِ فَٱغْسِلُوا۟ وُجُوهَكُمْ",
        transcription: "Yaa ayyuha alladhiina aamanuu idhaa qumtum ila as-salaati fagsiluu wujuuhakum",
        translation: "Ey iymon keltirganlar, namozga tursangiz yuzlaringizni yuvng",
        tafsir: "Namoz oldidan tahorat qilishning muhimligi va qoidalari.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "وَأَيْدِيَكُمْ إِلَى ٱلْمَرَافِقِ وَٱمْسَحُوا۟ بِرُءُوسِكُمْ",
        transcription: "Wa aydiyakum ilal-maraafiqi wamsahuu biru’uusikum",
        translation: "Va qo‘llaringizni tirsaklargacha va boshlaringizga masx torting",
        tafsir: "Tahoratning davomi, qo‘l va boshga masx tortish haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "وَأَرْجُلَكُمْ إِلَى ٱلْكَعْبَيْنِ ۚ إِن كُنتُمْ جُنُبًا فَٱطَّهَّرُوا۟",
        transcription: "Wa arjulakum ilal-ka‘bayni, in kuntum junuban fattahharuu",
        translation: "Va oyoqlaringizni to‘piqlargacha yuvng, agar junub bo‘lsangiz, to‘liq tahorat qiling",
        tafsir: "Tahorat va g‘uslning qoidalari haqida ko‘rsatma.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "وَإِن كُنتُم مَّرْضَىٰٓ أَوْ عَلَىٰ سَفَرٍ أَوْ جَآءَ أَحَدٌ مِّنكُم مِّنَ ٱلْغَآئِطِ",
        transcription: "Wa in kuntum mardaa aw ‘alaa safarin aw jaa’a ahadun minkum mina al-ghaa’iti",
        translation: "Agar kasal bo‘lsangiz yoki safarda bo‘lsangiz yoki birortangiz hojatxonadan kelgan bo‘lsa",
        tafsir: "Tahorat o‘rniga tayammum qilish shartlari haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "أَوْ لَٰمَسْتُمُ ٱلنِّسَآءَ فَلَمْ تَجِدُوا۟ مَآءً فَتَيَمَّمُوا۟ صَعِيدًا طَيِّبًا",
        transcription: "Aw laamastumu an-nisaa’a falam tajiduu maa’an fatayammamuu sa‘iidan tayyiban",
        translation: "Yoki ayollar bilan yaqin bo‘lib, suv topa olmagan bo‘lsangiz, pok tuproq bilan tayammum qiling",
        tafsir: "Tayammumning qoidalari va holatlari haqida.",
        copySymbol: "📋"
      },
      {
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا ٱذْكُرُوا نِعْمَتَ ٱللَّهِ عَلَيْكُمْ إِذْ هَمَّ قَوْمٌ أَن يَبْسُطُوآ إِلَيْكُمْ أَيْدِيَهُمْ فَكَفَّ أَيْدِيَهُمْ عَنكُمْ ۖ وَٱتَّقُوا ٱللَّهَ ۚ وَعَلَىٰ ٱللَّهِ فَلْيَتَوَكَّلِ ٱلْمُؤْمِنُونَ",
          transcription: "Yaa ayyuhaa alladhiina aamanuu udhkuruu ni‘mata allaahi ‘alaykum idh hamma qawmun an yabsutuu ilaykum aydiyahum fakaffa aydiyahum ‘ankum wattaquu allaaha wa ‘alaa allaahi falyatawakkali al-mu’minuuna",
          translation: "Ey iymon keltirganlar! Allohning sizlarga bo‘lgan ne’matini eslang: bir qavm sizlarga qarshi qo‘l ko‘tarmoqchi bo‘lganida, Alloh ularning qo‘llarini sizlardan ushlab qoldi. Allohdan qo‘rqing va mo‘minlar faqat Allohga tavakkal qilsinlar",
          tafsir: "Allohning mo‘minlarni himoya qilishi va tavakkal qilish haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "وَلَقَدْ أَخَذَ ٱللَّهُ مِيثَٰقَ بَنِىٓ إِسْرَٰٓءِيلَ وَبَعَثْنَا مِنْهُمُ ٱثْنَىْ عَشَرَ نَقِيبًۭا ۖ وَقَالَ ٱللَّهُ إِنِّى مَعَكُمْ ۖ لَئِنْ أَقَمْتُمُ ٱلصَّلَوٰةَ وَءَاتَيْتُمُ ٱلزَّكَوٰةَ وَءَامَنتُم بِرُسُلِى وَعَزَّرْتُمُوهُمْ وَأَقْرَضْتُمُ ٱللَّهَ قَرْضًا حَسَنًۭا لَّأُكَفِّرَنَّ عَنكُمْ سَيِّـَٔاتِكُمْ وَلَأُدْخِلَنَّكُمْ جَنَّٰتٍۭ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَٰرُ ۚ فَمَن كَفَرَ بَعْدَ ذَٰلِكَ مِنكُمْ فَقَدْ ضَلَّ سَوَآءَ ٱلسَّبِيلِ",
          transcription: "Walaqad akhadha allaahu miithaaqa banii israa’iila wa ba‘athnaa minhum ithnay ‘ashara naqiiban wa qaala allaahu innii ma‘akum la’in aqamtumu as-salaata wa aataytumu az-zakaata wa aaminuu birusulii wa ‘azzartumuuhum wa aqradtumu allaaha qardan hasanan la’ukaffiranna ‘ankum sayyi’aatiikum wa la’udkhilannakum jannaatin tajrii min tahtihaa al-anhaaru faman kafara ba‘da dhaalika minkum faqad dalla sawaa’a as-sabiili",
          translation: "Alloh Bani Isroildan ahd oldi va ulardan o‘n ikki naqib (rahbar) tayinladi. Alloh dedi: 'Men sizlar bilanman. Agar namozni to‘kis ado qilsangiz, zakot bersangiz, rasullarimga iymon keltirsangiz, ularga yordam bersangiz va Allohga yaxshi qarz bersangiz, gunohlaringizni albatta kechiraman va sizlarni ostidan daryolar oqadigan jannatlarga kiritaman. Kim bundan keyin kofir bo‘lsa, to‘g‘ri yo‘ldan adashgan bo‘ladi'",
          tafsir: "Bani Isroilning Alloh bilan ahdi va itoatning mukofotlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "فَبِمَا نَقْضِهِم مِّيثَٰقَهُمْ لَعَنَّٰهُمْ وَجَعَلْنَا قُلُوبَهُمْ قَٰسِيَةًۭ ۖ يُحَرِّفُونَ ٱلْكَلِمَ عَن مَّوَاضِعِهِۦ ۙ وَنَسُوا حَظًّۭا مِّمَّا ذُكِّرُوا بِهِۦ ۚ وَلَا تَزَالُ تَطَّلِعُ عَلَىٰ خَآئِنَةٍۢ مِّنْهُمْ إِلَّا قَلِيلًۭا مِّنْهُمْ ۖ فَٱعْفُ عَنْهُمْ وَٱصْفَحْ ۚ إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُحْسِنِينَ",
          transcription: "Fabimaa naqdihim miithaaqahum la‘annaahum wa ja‘alnaa quluubahum qaasiyatan yuharrifuuna al-kalima ‘an mawaadi‘ihi wanasuu hazzan mimmaa dhukkiruu bihi walaa tazaalu tattali‘u ‘alaa khaa’inatin minhum illaa qaliilan minhum fa‘fu ‘anhum wasfah inna allaaha yuhibbu al-muhsiniina",
          translation: "Ularning ahdni buzganliklari sababli Biz ularni la’natladik va qalblarini qattiq qildik. Ular so‘zlarni o‘z o‘rnidan burib yuboradilar va o‘zlariga eslatilgan narsadan bir ulushni unutdilar. Ularning ozgina qismidan tashqari, doimo xiyonatlarini ko‘rasan. Ularni kechir va e’tibor berma. Albatta, Alloh yaxshilik qiluvchilarni yaxshi ko‘radi",
          tafsir: "Bani Isroilning ahdni buzishi va Allohning ularni jazolashi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "وَمِنَ ٱلَّذِينَ قَالُوٓا إِنَّا نَصَٰرَىٰٓ أَخَذْنَا مِيثَٰقَهُمْ فَنَسُوا حَظًّۭا مِّمَّا ذُكِّرُوا بِهِۦ فَأَغْرَيْنَا بَيْنَهُمُ ٱلْعَدَاوَةَ وَٱلْبَغْضَآءَ إِلَىٰ يَوْمِ ٱلْقِيَٰمَةِ ۚ وَسَوْفَ يُنَبِّئُهُمُ ٱللَّهُ بِمَا كَانُوا يَصْنَعُونَ",
          transcription: "Wamina alladhiina qaaluu innaa nasaaraa akhadhnaa miithaaqahum fanasuu hazzan mimmaa dhukkiruu bihi fa’aghraynaa baynahumu al-‘adaawata wal-baghdaa’a ilaa yawmi al-qiyaamati wa sawfa yunabbi’uhumu allaahu bimaa kaanuu yasna‘uuna",
          translation: "Biz 'Biz nasroniymiz', deganlardan ahd oldik, lekin ular o‘zlariga eslatilgan narsadan bir ulushni unutdilar. Shuning uchun Biz ular orasiga qiyomatgacha dushmanlik va nafrat solib qo‘ydik. Alloh ularni qilgan amallaridan xabardor qiladi",
          tafsir: "Nasroniylarning ahdni buzishi va oqibatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "يَٰٓأَهْلَ ٱلْكِتَٰبِ قَدْ جَآءَكُمْ رَسُولُنَا يُبَيِّنُ لَكُمْ كَثِيرًۭا مِّمَّا كُنتُمْ تُخْفُونَ مِنَ ٱلْكِتَٰبِ وَيَعْفُو عَن كَثِيرٍۢ ۚ قَدْ جَآءَكُم مِّنَ ٱللَّهِ نُورٌۭ وَكِتَٰبٌۭ مُّبِينٌۭ",
          transcription: "Yaa ahla al-kitaabi qad jaa’akum rasuulunaa yubayyinu lakum kathiiran mimmaa kuntum tukhfuuna mina al-kitaabi wa ya‘fuu ‘an kathiirin qad jaa’akum mina allaahi nuurun wa kitaabun mubiinun",
          translation: "Ey kitob ahli! Rasulimiz sizlarga kitobdan yashirgan ko‘p narsalarni bayon qiladi va ko‘pdan kechadi. Sizlarga Allohdan nur va aniq kitob keldi",
          tafsir: "Payg‘ambar Muhammadning haq ekanligi va Qur‘onning nur ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "يَهْدِى بِهِ ٱللَّٰلُلَّذِينَ ٱلصَبَّعَوْا لِرِضْوَٰنِهِۦ سُبُلَ ٱلسلَّمِ وَيُخْرِجُهُم مِّنَ ٱلظُّلُمَٰتِ إِلَىٰلنُّورِ بِإِذْنِهِ ۙ وَيَهْدِيهِمْ إِلَىٰٰرَاطٍ مُّسْتَقِيمٍ",
          transcription: "Yahdii bihi allaahu alladhiina is-taba‘uu al-ridwaanihi subula as-salaami wa yukhrijuhum mina az-zulumaati ilaa an-nuuri bi’idhnihi wa yahdeehim ilaa siraatin mustaqiim",
          translation: "Alloh u (kitob) bilan rozi bo‘lishini istaganlarni tinchlik yo‘llariga hidoyat qiladi, ularni O‘z izni bilan zulmatlardan nurga chiqaradi va to‘g‘ri yo‘lga yo‘naltiradi",
          tafsir: "Qur‘onning hidoyat yo‘li va nur sifatida tasviri.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "لَقَدْ كَفَرَ ٱلَّذِينَ قَالُوٓا إِنَّ ٱللَّهَ هُوَ ٱلْمَسِيحُ ٱبْنُ مَرْيَمَ ۚ قُلْ فَمَن يَمْلِكُ مِنَ ٱللَّهِ شَيْـًا إِنْ أَرَادَ أَن يُهْلْكَ ٱلْمَسِيحَ ٱبْنَ مَرْيَمَ وَأَمُمْهُ وَمَن فِى ٱلْأَرْضِ جَمِيعًا ۗ وَلِلَّهِ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَمَا بَيْنَهُمَا ۚ يَخْلُقُ مَا يَشَآءُ ۚ وَٱللَّهُ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌٍ",
          transcription: "Laqad kafara alladhiina qaaluu inna allaaha huwa al-masiihu ibnu maryama qul faaman yamliku mina allaahi shayan in araada an yuhlika al-masiiha ibna maryama wa ummahu wa man fii al-ardi jamii’an wa lillaahi mulku as-samawaati wal-ardi wa maa baynahumaa yakhluqu maa yashaa’u wa allaahu ‘alaa kulli shay’in qadiirun",
          translation: "Alloh Masih ibn Maryamdir, deganlar kofir bo‘ldilar. Ayting: 'Agar Alloh Masih ibn Maryamni, uning onasini va yer yuzidagilarning hammasini yo‘q qilmoqchi bo‘lsa, kim Uni‘ga to‘s‘qil qila oladi?' Osmonlar, yer va ular orasidagi hamma narsa Allohnikidir. U xohlaganini yaratadi. Alloh har narsaga qodirdir",
          tafsir: "Masihning iloh emas, balki Allohning bandasi ekanligi va Allohning qudrati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَقَالَتِ ٱلْيَهُودُ وَٱلنَّصَٰرَٰى نَحْنُ أَبْنَٰٓءُ ٱ�للَّهِ وَأَحِبَّٰٓبُهُ ۚ قُلْ فَلِمَ يُعَذِّبُكُمْ بِذُنُوبِكُم ۖ بَلْ أَنتُم بَشَرٌ مِّمَّنْ خَلَقَ ۚ يَغْفِرُ لِمَن يَشَآءُ وَيُعَذِّبُ مَن يَشَآءُ ۚ وَلِلَّهِ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَمَا بَيْنَهُمَا ۖ وَإِلَيْهِ ٱلْمَصِيرُ",
          transcription: "Waqalati al-yahuudu wan-nasaaraa nahnu abnaa’u allaahi wa ahibbaa’uhu qul falima yu‘adhdhibukum bidhunuubikum bal antum basharun mimman khalaqa yaghfiru liman yashaa’u wa yu‘adhdhibu man yashaa’u wa lillaahi mulku as-samawaati wal-ardi wa maa baynahumaa wa ilayhi al-masiiru",
          translation: "Yahudiylar va nasroniylar: 'Biz Allohning farzandlari va sevimlilarimiz', dedilar. Ayting: 'Unday bo‘lsa, nega U sizlarni gunohlaringiz uchun jazolaydi? Yo‘q, sizlar U yaratgan odamlardansiz'. U xohlaganiga mag‘firat qiladi va xohlaganini jazolaydi. Osmonlar, yer va ular orasidagi hamma narsa Allohnikidir va qaytish Unaga bo‘ladi",
          tafsir: "Yahudiy va nasroniylarning noto‘g‘ri da’volari rad etiladi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "يَٰٓأَهْلَ ٱلْكِتَٰبِ قَدْ جَآءَكُمْ رَسُولُنَا يُبَيِّنُ لَكُمْ عَلَىٰ فَتْرَةٍۢ مِّنَ ٱلرُّسُلِ أَن تَقُولُوا مَا جَآءَنَا مِنۢ بَشِيرٍۢ وَلَا نَذِيرٍۢ ۖ قَدْ جَآءَكُم بَشِيرٌۭ وَنَذِيرٌ ۗ ۚ وَٱللَّهُ عَلَىٰكُلِّ شَىْءٍۢ قَدِيرٌٌ",
          transcription: "Yaa ahla al-kitaabi qad jaa’akum rasoolunaa yubayyinu lakum ‘alaa fatratin mina ar-rusuli an taquuluu maa jaa’anaa min bashiirin raa wala naniirhin qad jaa’akum bashiirun wa nahiirun wa allaahu ‘alaa kulli shay’in qadiiirun",
          translation: "Ey kitob ahli! Rasullar orasida foyda bo‘lganidan so‘ng, 'Bizga xushxabar yoki ogohlantiruvchi kelmadi', demasliklizingiz uchun ‘ ‘ Rasulimiz sizlarga keldi. Sizlarga xushxabar beruvchi va ogohlantiruvchi keldi. Alloh har narsaga qodirdir",
          tafsir: "Payg‘ambar Muhammadning haq ekanligi va uning vazifasi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِۦ يَٰقَوْمِ ٱذْكُرُوا نِعْمَةَ ٱللَّهِ عَلَيْكُمْ إِذْ جَعَلَ فِيكُمْ أَنۢبِيَآءَ وَجَعَلَكُم مُّلُوكًۭا وَءَاتَىٰكُم مَّا لَمْ يُؤْتِ أَحَدًۭا مِّنَ ٱلْعَٰلَمِينَ",
          transcription: "Wa idh qaala muusaa liqawmihi yaa qawmi idhkuruu ni‘mata allaahi ‘alaykum idh ja‘ala fiikum anbiyaa’a wa ja‘alakum muluukan wa aataakum maa lam yu’ti ahadan mina al-‘aalamiina",
          translation: "Muso o‘z qavmiga dedi: 'Ey qavmim! Allohning sizlarga bergan ne’matini eslang: U sizlar orasida payg‘ambarlar qildi, sizlarni shohlar qildi va’ sizlarga olamlardan hech kimga berilmagan narsalarni berdi.",
          tafsir: "Muso payg‘ambarning qavmiga Allohning ne’matlarini eslatishi.",
          copySymbol: "📋"
      }
    ]
  },
  {
    id: 6,
    name: "Al-An'am",
    arabicName: "الأنعام",
    meaning: "Chorvalar",
    ayahCount: 165,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o‘rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "ٱلْحَمْدُ لِلَّهِ ٱلَّذِى خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ",
        transcription: "Alhamdu lillahi alladhii khalaqa as-samaawaati wal-ard",
        translation: "Barcha maqtovlar osmonlar va yerni yaratgan Allohga xosdir",
        tafsir: "Allohning yaratuvchilik qudrati ulug‘lanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "وَجَعَلَ ٱلظُّلُمَٰتِ وَٱلنُّورَ ۖ ثُمَّ ٱلَّذِينَ كَفَرُوا۟ بِرَبِّهِمْ يَعْدِلُونَ",
        transcription: "Wa ja‘ala az-zulumaati wan-nuur, thumma alladhiina kafaruu birabbihim ya‘diluun",
        translation: "U zulmatlar va nur yaratdi, so‘ngra kofirlar Robblariga tenglashtiradilar",
        tafsir: "Allohning yagona yaratuvchi ekanligi va shirkdan ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "هُوَ ٱلَّذِى خَلَقَكُم مِّن طِينٍ ثُمَّ قَضَىٰٓ أَجَلًا",
        transcription: "Huwa alladhii khalaqakum min tiinin thumma qadaa ajalan",
        translation: "U sizlarni loydan yaratdi, so‘ngra (umr) muddatini belgiladi",
        tafsir: "Insonning loydan yaratilishi va umrining belgilanganligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "وَأَجَلٌ مُّسَمًّى عِندَهُ ۖ ثُمَّ أَنتُمْ تَمْتَرُونَ",
        transcription: "Wa ajalun musamman ‘indahu, thumma antum tamtaruun",
        translation: "Va Uning huzurida belgilangan muddat bor, lekin sizlar shubhalanasiz",
        tafsir: "Allohning belgilagan taqdiriga shubha qilish noto‘g‘ri ekanligi aytiladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَهُوَ ٱللَّهُ فِى ٱلسَّمَٰوَٰتِ وَفِى ٱلْأَرْضِ",
        transcription: "Wa huwa Allahu fis-samaawaati wa fil-ard",
        translation: "U osmonlarda va yerda Allohdir",
        tafsir: "Allohning hamma joyda hukmron ekanligi ta’kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "يَعْلَمُ سِرَّكُمْ وَجَهْرَكُمْ وَيَعْلَمُ مَا تَكْسِبُونَ",
        transcription: "Ya‘lamu sirrakum wa jahrakum wa ya‘lamu maa taksibuun",
        translation: "U sizning sir va oshkorangizni biladi va nimalar qilayotganingizni biladi",
        tafsir: "Allohning hamma narsani biluvchi ekanligi ta’kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "وَمَا تَأْتِيهِم مِّنْ ءَايَةٍ مِّنْ ءَايَٰتِ رَبِّهِمْ إِلَّا كَانُوا۟ عَنْهَا مُعْرِضِينَ",
        transcription: "Wamaa ta’tiihim min aayatin min aayaati rabbihim illaa kaanuu ‘anhaa mu‘ridiin",
        translation: "Ularga Robblarining oyatlaridan bironta kelsa, undan yuz o‘giradilar",
        tafsir: "Kofirlarning Allohning oyatlariga e’tiborsizligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "فَقَدْ كَذَّبُوا۟ بِٱلْحَقِّ لَمَّا جَآءَهُمْ ۖ فَسَوْفَ يَأْتِيهِمْ أَنۢبَآءُ مَا كَانُوا۟ بِهِۦ يَسْتَهْزِءُونَ",
        transcription: "Faqad kadhdhabuu bil-haqqi lammaa jaa’ahum, fasawfa ya’tiihim anbaa’u maa kaanuu bihi yastahzi’uun",
        translation: "Ular haq keldi-da, uni yolg‘on dedilar, endi ular masxara qilgan narsalarning xabari ularga keladi",
        tafsir: "Haqni inkor qilganlarning oqibati haqida ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "أَلَمْ يَرَوْا۟ كَمْ أَهْلَكْنَا مِن قَبْلِهِم مِّن قَرْنٍ",
        transcription: "Alam yaraw kam ahlaknaa min qablihim min qarnin",
        translation: "Ular o‘zlaridan oldingi qancha avlodlarni halok qilganimizni ko‘rmadilarmi?",
        tafsir: "Oldingi xalqlarning halokati haqida eslatma.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "مَّكَّنَّٰهُمْ فِى ٱلْأَرْضِ مَا لَمْ نُمَكِّن لَّكُمْ",
        transcription: "Makkannaahum fil-ardi maa lam numakkin lakum",
        translation: "Biz ularni yer yuzida sizlarga bermagan imkoniyatlar bilan mustahkamladik",
        tafir: "Oldingi xalqlarga berilgan ne’matlar va ularning halokati haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "قُلْ سِيرُوا فِى ٱلْأَرْضِ ثُمَّا ٱنظُرُوا كَيْفَ كَانَ عَٰٰقِبَةُ ٱلْمُكَذِّبِينَ",
          transcription: "Qul siiruu fii al-ardi thumma anzuuruu kayfa kaana ‘aaqibatu al-mukadhdhibiina",
          translation: "Ayting: 'Yer yuzida sayr qiling va yolg‘onchilarning oqibati qanday bo‘lganini ko‘ring'",
          tafsir: "O‘tmishdagi kofirlarning halokatini o‘rganishga da’vat.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "قُل لِّمَن مَّا فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ ۖ قُل لِلَّهِ ۚ كَتَبَ عَلَىٰ نَفْسِهِ ٱلرَّحْمَةَ ۚ لَيَجْمَعَنَّكُمْ إِلَىٰ يَوْمِ ٱلْقِيَٰمَةِ لَا رَيْبَ فِيهِ ۚ ٱلَّذِينَ خَسِرُوٓا أَوْفُسَهُمْ فَهُمْ لَا يُؤْمِنُونَ",
          transcription: "Qul liman maa fii as-samawaati wal-ardi qul lillaahi kataba ‘alaa nafsihi ar-rahmata layajma‘annakum ilaa yawmi al-qiyaamati laa rayba fiihi alladhiina khasiruu anfusahum fahum laa yu’minuuna",
          translation: "Ayting: 'Osmonlar va yerdagi narsalar kimniki?’ Ayting: 'Allohniki’. U O‘ziga rahm qilishni farz qildi. Sizlarni qiyomat qab, unda shak yo‘q, bir joyga yig‘adi. O‘zlarini yo‘qotganlar iymon keltirmaydilar",
          tafsir: "Allohning rahmat sifati va qiyamatning haqiqati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَلَهُۥ مَا سَكَنَ فِى ٱللَّيْلِ وَٱلنَّهَارِ ۚ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
          transcription: "Walahu maa sakana fii allayli wa-nnahaari wa huwa as-samii‘u al-‘aliimu",
          translation: "Kecha va kunduzda tinadigan hamma narsa Uniki. U eshituvchi va biluvchidir",
          tafsir: "Allohning hamma narsani qamrab olishi va sifatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "قُلْ أَغَيْرَ ٱللَّهِ أَتَّخِذُ وَلِيًّۭا فَاطِرِ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَهُوَ يُطْعِمُ وَلَا يُطْعَمُ ۗ قُلْ إِنِّىٓ أُمِرْتُ أَنْ أَكُونَ أَوَّلَ مَنْ أَسْلَمَ ۖ وَلَا تَكُونَنَّ مِنَ ٱلْمُشْرِكِينَ",
          transcription: "Qul aghayra allaahi attakhidhu waliyyan faatiri as-samawaati wal-ardi wa huwa yut‘imu wala yut‘amu qul innii umirtu an akuuna awwala man aslama wala takuunanna mina al-mushrikiina",
          translation: "Ayting: 'Osmonlar va yerni yaratgan, O‘zi yozadigan va o‘zi yemaydigan Allohdan boshqani do‘st tutamanmi?’ Ayting‘: 'Men birinchi bo‘lib Islomni qabul qilishga buyurildim va mushrikardan bo‘lma'",
          tafsir: "Allohning yagona do‘st va yordamchi ekanligi va shirkdan qochish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "قُلْ إِنِّىٓ أَخَافُ إِنْ عَصَيْتُ رَبِّى عَذَابَ يَوْمٍ عَظِيمٍ",
          transcription: "Qul innii akhaafu in ‘asaytu qal-‘aa’ ‘adhaaba yawmin ‘azhiimin",
          translation: "Ayting‘ya: 'Agar Robbimga isyon qilsam, katta kunning azobidan qo‘rqaman'",
          tafsir: "Payg‘ambarning Allohdan qo‘rquv va itoatkorligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "مَّن يُصْرَفْ عَنْهُ يَوْمَئِذٍ عَذَابُهُۥ فَقَدْ رَحِمَهُ ۚ وَذَٰلِكَ ٱلْفَوْزُ ٱلْمُبِينُ",
          transcription: "Man yusraf ‘anhu yawma’idhin ‘adhaabuhu faqad rahimahu wa dhaalika al-fawzu al-mubiin",
          translation: "O‘sha kuni kimdan azob yuz o‘girsa, unga rahm qilingan bo‘ladi. Bu aniq muvaffaqiyatdir",
          tafsir: "Qiyomatdagi Allohning rahmat va muvaffaqiyati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "وَإِن يَمْسَسْكَ ٱللَّهُ بِضُرٍّۢ فَلَا كَاشِفَ لَهُوٓ إِلَّا هُوَ ۖ وَإِن يَمْسَسْكَ بِخَيْرٍۢ فَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌ",
          transcription: "Wa’in yamsaska allaahu bidurrin falaa kaashifa lahu illaa huwa wa in yamsaska bikhayrin fa huwa ‘alaa kulli shay’in qadiirun",
          translation: "Agar Alloh senga zarar yetkizsa, Uni O‘zidan boshqa hech kim ketkaza oladi. Agar senga yaxshilik yetkizsa, U har narsaga qodirdir",
          tafsir: "Allohning zarar va yaxshilik berishdagi yagona qudrati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَهُوَ ٱلْقَاهِرُ فَوْقَ عِبَادِهِۦ ۚ وَهُوَ ٱلْحَكِيمُ ٱلْخَبِيرُ",
          transcription: "Wa huwa al-qaahiru fawqa ‘ibaadihi wa huwa al-hakiimu al-khabiiru",
          translation: "U bandalari ustidan g‘olibdir. U hikmatli va xabardordir",
          tafsir: "Allohning bandalar ustidagi hukmronligi va sifatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "قُلْ أَىُّ شَىْءٍ أَكْبَرُ شَهَٰدَةًۭ ۖ قُلِ ٱللَّهُ ۖ شَهِيدٌۢ بَيْنِى وَبَيْنَكُمْ ۚ وَأُوحِيَ إِلَىَّ هَٰذَا ٱلْقُرْرْءَانُ لِأُنذِرَكُم بِهِۦ وَمَنۢ بَلَغَ ۚ أَيَأَإِنَّكُمْ لَتَشْهَدُونَ أَنَّ مَعَ ٱللَّهِ إِلَٰهَةً أُخْرَىٰٰ ۖ قُل لَّآ أَشْهَدَ ۚ قُلْ إِنَّمَا هُوَ إِلَٰهٌٰۭ وَٰٰحِدٌۭ وَإِنَّنِى بَرِىٓءٌۭ مِّمَّا تُشْرِكُونَ",
          transcription: "Qul ayyu shay’in akbaru shahaadatan qulillaahu shahiidun baynii wa baynakum wa uuhiya ilayya haadhaa al-qur’aanu li’undhirakum bihi wa man balagha haqad yaa a’innakum latashhaduuna anna ma‘a allaahi ilaahatan ukhraa qul laa ashhadu qul innamaa huwa ilaahun waahidun wa innani bari",
          translation: "Ayting‘: 'Qaysi shahodat eng ulug’? Ayting‘: ‘Alloh’. U men bilan sizlar o‘rtasida guvohdir. Bu Qur‘an menga sizlarni va qabul qilganlarni ogohlantirish uchun no‘zil qilindi. Siz Alloh bilan birga boshqa ilohlar bor deb guvohlik berasizmi? Ayting‘: 'Men guvohlik bermayman! U faqat yagona ilohdir va men siz shirk qilgan narsalardan bezorman'",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "ٱلَّذِينَ رَأَوْتَيْنَاٰهُمُ ٱلْكِتَٰبَ يَعْرِفُونَهُ كَمَا يَعَرِفُونَ أَبْنَآءَهُمْ ۚ ٱلَّذِينَ خَسِرُوٓا أَوْفُسَهُمْ فَهُمْ لَا يُؤْمِنُونَ",
          transcription: "Alladhiina aataynaahumu al-kitaaba ya‘rifuunahu kamaa ya‘rifuuna abnaaa’ahum alladhiina khasiruu anfusahum fahum laa yu’minuuna",
          translation: "Biz kitob berganlar uni o‘z farzandlarini bilganidek biladilar. O‘zanna yo‘qotganlar iymon keltirmaydilar",
          tafsir: "Kitob ehli Payg‘ambarni tanishi va iymonsizlikning oqibati.",
          copySymbol: "📋"
      }
    ]
  },
  {
    id: 7,
    name: "Al-A'raf",
    arabicName: "الأعراف",
    meaning: "Balandliklar",
    ayahCount: 206,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o‘rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "المص",
        transcription: "Alif Laam Miim Saad",
        translation: "Alif, Laam, Miim, Saad",
        tafsir: "Muqatta’at harflari – faqat Allohga ma’lum ma’nodadir.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "كِتَٰبٌ أُنزِلَ إِلَيْكَ فَلَا يَكُن فِى صَدْرِكَ حَرَجٌ مِّنْهُ",
        transcription: "Kitaabun unzila ilayka falaa yakun fii sadrika harajun minhu",
        translation: "Bu Kitob senga nozil qilindi, undan ko‘nglingda tanglik bo‘lmasin",
        tafsir: "Qur’onning Rasulullohga nozil qilingani va uni yetkazishdagi mas’uliyat haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "لِتُنذِرَ بِهِۦ وَذِكْرَىٰ لِلْمُؤْمِنِينَ",
        transcription: "Litundhira bihi wa dhikraa lil-mu’miniin",
        translation: "U bilan ogohlantirish va mo‘minlar uchun eslatma bo‘lsin",
        tafsir: "Qur’onning ogohlantiruvchi va eslatuvchi vazifasi ta’kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "ٱتَّبِعُوا۟ مَآ أُنزِلَ إِلَيْكُم مِّن رَّبِّكُمْ",
        transcription: "Ittabi‘uu maa unzila ilaykum min rabbikum",
        translation: "Robbingizdan sizlarga nozil qilingan narsaga ergashing",
        tafsir: "Qur’onga amal qilish muhimligi buyuriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَلَا تَتَّبِعُوا۟ مِن دُونِهِۦٓ أَوْلِيَآءَ ۗ قَلِيلًا مَّا تَذَكَّرُونَ",
        transcription: "Walaa tattabi‘uu min duunihi awliyaa’a, qaliilan maa tadhakkaruun",
        translation: "Undan boshqa do‘stlarga ergashmang, sizlar kam eslaysiz",
        tafsir: "Allohdan boshqaga ergashishdan ogohlantiriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَكَم مِّن قَرْيَةٍ أَهْلَكْنَٰهَا فَجَآءَهَا بَأْسُنَا بَيَٰتًا أَوْ هُمْ قَآئِلُونَ",
        transcription: "Wa kam min qaryatin ahlaknaahaa fajaa’ahaa ba’sunaa bayaatan aw hum qaa’iluun",
        translation: "Qancha qishloqlarni halok qildik, bas, ularga azobimiz kechasi yoki kunduzi keldi",
        tafsir: "Oldingi xalqlarning halokati haqida ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "فَمَا كَانَ دَعْوَىٰهُمْ إِذْ جَآءَهُم بَأْسُنَآ إِلَّآ أَن قَالُوٓا۟ إِنَّا كُنَّا ظَٰلِمِينَ",
        transcription: "Famaa kaana da‘waahum idh jaa’ahum ba’sunaa illaa an qaaluu innaa kunnaa dhaalimiin",
        translation: "Ularga azobimiz kelganda, faqat: ‘Biz zulm qilgan edik’, dedilar",
        tafsir: "Gunohkorlarning pushaymonligi, lekin kech bo‘lganda.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "فَلَنَسْـَٔلَنَّ ٱلَّذِينَ أُرْسِلَ إِلَيْهِمْ وَلَنَسْـَٔلَنَّ ٱلْمُرْسَلِينَ",
        transcription: "Falanas’alanna alladhiina ursila ilayhim wa lanas’alanna al-mursaliin",
        translation: "Albatta, Biz payg‘ambarlar yuborilganlardan va payg‘ambarlardan so‘raymiz",
        tafsir: "Qiyomat kuni hamma javobgar bo‘lishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "فَلَنَقُصَّنَّ عَلَيْهِم بِعِلْمٍ ۖ وَمَا كُنَّا غَآئِبِينَ",
        transcription: "Falanaqussanna ‘alayhim bi‘ilmin wamaa kunnaa ghaa’ibiin",
        translation: "Ularga ilm bilan hikoya qilamiz, Biz hech qachon g‘oyib bo‘lmaganmiz",
        tafsir: "Allohning hamma narsani bilishi va kuzatishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَٱلْوَزْنُ يَوْمَئِذٍ ٱلْحَقُّ ۚ فَمَن ثَقُلَتْ مَوَٰزِينُهُۥ فَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ",
        transcription: "Wal-waznu yawma’idhin al-haqqu, faman thaqulat mawaaziinuhu fa-ulaa’ika humul-muflihuun",
        translation: "O‘sha kuni tarozi haq bo‘ladi, kimning tarozisi og‘ir kelsa, ular najot topuvchilardir",
        tafsir: "Qiyomatdagi adolatli tarozi va yaxshi amallar haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "وَلَقَدْ خَلَقْنَاكُمْ ثُمَّ صَوَّرْنَاكُمْ ثُمَّ قُلْنَا لِلْمَلَٰٓئِكَةِ ٱسْجُدُوا لِءَادَمَ فَسَجَدُوا إِلَّآ إِبْلِيسَ لَمْ يَكُن مِّنَ ٱلسَّٰجِدِينَ",
          transcription: "Walaqad khalaqnaakum thumma sawwarnaakum thumma qulnaa lilmalaa’ikati isjuduu li’aadama fasajaduu illaa ibliisa lam yakun mina as-saajidiina",
          translation: "Biz sizlarni yaratdik, so‘ng shakl berdik, keyin farishtalarga: 'Odamga sajda qiling', dedik. Ular sajda qildilar, faqat Iblis sajda qiluvchilardan bo‘lmadi",
          tafir: "Odam alayhissalomning yaratilishi va Iblisning isyoni.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "قَالَ مَا مَنَعَكَ أَلَّا تَسْجُدَ إِذْ أَمَرْتُكَ ۖ قَالَ أَنَا خَيْرٌۭ مِّنْهُ خَلَقْتَنِى مِن نَّارٍۢ وَخَلَقْتَهُۥ مِن طِينٍۢ",
          transcription: "Qaala maa mana‘aka allaa tasjuda idh amartuka qaala anaa khayrun minhu khalaqtani min qala‘in wa khalqtahu qina ‘iin‘in",
          translation: "Alloh dedi: 'Senga buyurganimda nima seni sajda qilishdan to‘xtatdi?' U dedi: 'Men undan yaxshiroqman, Seni meni o‘tdan, uni loydan yarad",
          tafsir: "Iblisning kibr va o‘zini Odamdan ustun ko‘rishining sababi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "قَالَ فَٱهْبِطْ مِنْهَا فَمَا يَكُونُ لَكَ أَن تَتَكَبَّرَ فِيهَا ۖ فَٱخْرُجْ إِنَّكَ مِنَ ٱلصَّاغِرِينَ",
          transcription: "Qaala faahbit minhaa famaa yakunu qalaka an tatakabbara qiihaa faqru‘ qinna qala qina’ a’aa’iriina",
          translation: "Alloh dedi: 'Undan tush, unda kibr qilish senga yaramaydi. Chiq, sen xor bo‘luvchilardansan'",
          tafsir: "Iblisning jannatdan haydalishi va uning xorisining",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "قَالَ أَنظِرْنِىٓ إِلَىٰ يَوْمِ يُبْعَثُونَ",
          transcription: "Qaala an‘qirnii qila‘aa qawmi ‘aw ba‘athuun",
          translation: "U dedi: 'Meni qayta tiriladigan kunga qadar kechiktir'",
          tafsir: "Iblisning qiyomatguncha muhlat so‘rashi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "قَالَ إِنَّكَ مِنَ ٱلْمُنظَرِينَ",
          transcription: "Qaala qinnaka qina al-mun qariina",
          translation: "Alloh dedi: 'Sen kechiktirilganlardansan'",
          tafsir: "Allohning Iblisga muhlat berishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "قَالَ فَبِمَآ أَغْوَيْتَنِى لَأَقْعُدَنَّ لَهُمْ صِرَٰطَكَ ٱلْمُسْتَقِيمَ",
          transcription: "Qaala fabi maa’ qawaytani la qal‘adanna qabaum qira’baqa al-mustaqiima",
          translation: "U dedi: 'Meni adashtirganing uchun, ’,qal’ad ad-umun to‘g‘ri yo‘lingda",
          tafsir: "Iblisning insonlarni adashtirishga qasam qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "ثُمَّ لَأَأْتِيَنَّهُم مِّنۢ بَيْنِ أَيْدِيهِمْ وَمِنْ خَلْفِهِمْ وَعَنْ أَيْمَٰنِهِمْ وَعَن شَمَآئِلِهِمْ ۖ وَلَا تَجِدُ أَكْثَرَهُمْ شَٰكِرِينَ",
          transcription: " qamma la qaabiyanna qabum qabin qaydi qabi qim qamin qabafi qim qaba qayma’ nibim qaba qama’ qilib qaba qaba taba qabbara qabum qa’ qiriina",
          translation: "qeyin qabul qaradan qaba qabaqa qan qar qaba qan qap‘allar qaba qan qap‘allar qara qil qay qil qara qil qay qil qar qil qay qil qar qil",
          tafsir: "Iblisning insonlarni har taraf qan adashtirish rejasi va shukrsizlik.",
          copySymbol: "📋�"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "قَالَ ٱخْرُجْ مِنهَا مَذْءُومًا مَّدْحُورًا ۖ لَّمَن تَبِعَكَ مِنهُمْ لَأَمْلَأَنَّ جَهَنَّمَ مِنكُمْ أَجْمَعِينَ",
          transcription: "Qaala qabruq qinba qad q’u qaba qabbad qura’ qaba, qaba qaba taba qaba qabum qaba qaba’ qala’ qaba qabbaba qaba qabum qaba’ qaba’ qina",
          translation: "Alloh dedi: 'Undan qab, qor qilib qaydi qaban! qaba qanda qab qil qaba, qaba qaba jaban qaba qabil qil qab'",
          tafsir: "Iblisning laqqiq qabi qaydab qabil qaba qan qab qil qabanlarning do‘zaxga qib qilishi.",
          copySymbol: "qab"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَيَٰٓءَادَمُ ٱسْكُنْ أَنْتَ وَزَوْجُكَ ٱلْجَنَّةَ فَكُلَا مِنْ حَيْثُ شِئْتُمَا وَلَا تَقْرَبَا هَٰذِهِ ٱلشَّجَرَةَ فَتَكُونَا مِنَ ٱلظَّٰلِمِينَ",
          transcription: "Wa qaa qaabamu qaabun qanta qaba qawjukaba qabbaba qabaqa qabula qaba qaba qaba qay qaba qama qaba la qaba qaba qaba qaba’ qaba qab qaba qaba qaba qaba qina qaba qaba qilib",
          translation: "Ey qadam! qen qaba qotin qan qabil jannat qaba qabun, qaban qardan qay qabi qeyin qil qabil qab, qaba bu qana qara qab qil qaba, qan qaba qol qor qardan qabon",
          tafsir: "Odam qalay qissalom qaba qavmiga jannat qada qab qil qabi va qaba qan qan",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "فَوَسْوَسَ إِلَيْهِمَا ٱلشَّيْطَٰنُ لِيُبْدِيَ لَهُمَا مَا وُورِيَ عَنْهُمَا مِن سَوْءَٰتِهِمَا وَقَالَ مَا نَهَىٰكُمَا رَبُّكُمَا عَنْ هَٰذِهِ ٱلشَّجَرةَ إِلَّآ أَن تَكُونَا مَلَكَيْنِ أَوْ تَكُونَا مِنَ ٱلْخَٰلِدِينَ",
          transcription: "Fawaswasa qilay qaba qabbash qay’a’ qaba qib qadiya qaba qaba qaa qaba quri qaba qaba qaba min qawa’ qabi qaba qaba qaaba qaba qaba qaba qaba qabbukuma qaba qaba’ qaba qaba qaba illa qaba qaba qaba qaba qayni qaba qaba qaba qina qaba qidiina",
          translation: "Shay qon qab qar qaba qasam qildi qaba, qaban qara qab qil qaban qaw q’atlari qaba qaba qadi qaba qaba: 'qabb qaban qab bu qana qan qaba qil qadi qaba, faqat qaba qaban qallak qaban qaba yoki qab qabil qab qaban qabil qil qab’",
          tafsir: "Shay qonning Odam qaba qav qani qab adashtirishi va qaba qil qabi.",
          copySymbol: "📋"
      }
    ]
  },
  {
    id: 8,
    name: "Al-Anfal",
    arabicName: "الأنفال",
    meaning: "O‘ljalar",
    ayahCount: 75,
    place: "Madina",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o‘rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "يَسْـَٔلُونَكَ عَنِ ٱلْأَنفَالِ ۖ قُلِ ٱلْأَنفَالُ لِلَّهِ وَٱلرَّسُولِ",
        transcription: "Yas’aloonaka ‘anil-anfaal, qul il-anfaalu lillahi war-rasuul",
        translation: "Sendan o‘ljalar haqida so‘rashadi, ayting: O‘ljalar Alloh va Rasul uchundir",
        tafsir: "O‘ljalar taqsimoti Alloh va Rasulning ixtiyorida ekanligi aytiladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "فَٱتَّقُوا۟ ٱللَّهَ وَأَصْلِحُوا۟ ذَاتَ بَيْنِكُمْ",
        transcription: "Fattaqu Allaha wa aslihuu dhaata baynikum",
        translation: "Allohdan qo‘rqing va o‘zaro munosabatlaringizni tuzating",
        tafsir: "Mo‘minlar o‘zaro kelishuv va adolatga rioya qilishlari kerak.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "وَأَطِيعُوا۟ ٱللَّهَ وَرَسُولَهُۥٓ إِن كُنتُم مُّؤْمِنِينَ",
        transcription: "Wa atii‘u Allaha wa rasuulahu in kuntum mu’miniin",
        translation: "Allohga va Rasulga itoat qiling, agar mo‘min bo‘lsangiz",
        tafsir: "Iymonning alomati Alloh va Rasulga itoat qilishdir.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "إِنَّمَا ٱلْمُؤْمِنُونَ ٱلَّذِينَ إِذَا ذُكِرَ ٱللَّهُ وَجِلَتْ قُلُوبُهُمْ",
        transcription: "Innama al-mu’minuuna alladhiina idhaa dhukira Allahu wajilat quluubuhum",
        translation: "Mo‘minlar o‘sha kimsalarki, Alloh zikr qilinganda qalblari titraydi",
        tafsir: "Haqiqiy mo‘minlarning Allohni eslaganda qo‘rqib, hurmat ko‘rsatishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَإِذَا تُلِيَتْ عَلَيْهِمْ ءَايَٰتُهُۥ زَادَتْهُمْ إِيمَٰنًا",
        transcription: "Wa idhaa tuliyat ‘alayhim aayaatuhu zaadathum iimaanan",
        translation: "Va ularga Uning oyatlari o‘qilganda, bu ularning iymonini ziyoda qiladi",
        tafsir: "Qur’on oyatlari mo‘minlarning iymonini mustahkamlaydi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَعَلَىٰ رَبِّهِمْ يَتَوَكَّلُونَ",
        transcription: "Wa ‘alaa rabbihim yatawakkaluun",
        translation: "Va ular Robblariga tavakkal qiladilar",
        tafsir: "Mo‘minlarning Allohga to‘liq ishonishi va tavakkali haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "ٱلَّذِينَ يُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَٰهُمْ يُنفِقُونَ",
        transcription: "Alladhiina yuqiimuunas-salaata wa mimmaa razaqnaahum yunfiquun",
        translation: "Ular namozni to‘kis ado etadilar va Biz ularga rizq qilib bergan narsalardan infaq qiladilar",
        tafsir: "Mo‘minlarning namoz va infaq orqali Allohga itoati.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "أُو۟لَٰٓئِكَ هُمُ ٱلْمُؤْمِنُونَ حَقًّا ۚ لَهُمْ دَرَجَٰتٌ عِندَ رَبِّهِمْ",
        transcription: "Ulaa’ika humul-mu’minuuna haqqan, lahum darajaatun ‘inda rabbihim",
        translation: "Aynan ular haqiqiy mo‘minlardir, ularga Robblari huzurida darajalar bor",
        tafsir: "Haqiqiy mo‘minlarning Alloh huzuridagi yuksak darajasi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "وَمَغْفِرَةٌ وَرِزْقٌ كَرِيمٌ",
        transcription: "Wa maghfiratun wa rizqun kariim",
        translation: "Va mag‘firat va ulug‘ rizq bor",
        tafsir: "Mo‘minlarga Allohning mag‘firati va jannatdagi rizqi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "كَمَآ أَخْرَجَكَ رَبُّكَ مِنۢ بَيْتِكَ بِٱلْحَقِّ",
        transcription: "Kamaa akhrajaka rabbuka min baytika bil-haqq",
        translation: "Robbing seni uyingdan haq bilan chiqargandek",
        tafsir: "Rasulullohning haq yo‘lida harakat qilishi haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "إِذْ يُغَشِّيكُمُ ٱلنُّعَاسَ أَمَنَةًۭ مِّنْهُ وَيُنَزِّلُ عَلَيْكُم مِّنَ ٱلسَّمَآءِ مَآءًۭ لِّيُطَهِّرَكُم بِهِۦ وَيُذْهِبَ عَنكُمْ رِجْزَ ٱلشَّيْطَٰنِ وَلِيَرْبِطَ عَلَىٰ قُلُوبِكُمْ وَيُثَبِّتَ بِهِ ٱلْأَقْدَامَ",
          transcription: "Idh yughashiikumu an-nu'aasa amanatan minhu wa yunazzilu 'alaykum mina as-samaa'i maa'an liyutahhirakum bihi wa yudhhiba 'ankum rijza ash-shaytaani wa liyarbita 'alaa quluubikum wa yuthabbita bihi al-aqdaama",
          translation: "O'shanda U sizlarga O'zidan xotirjamlik sifatida mudroq keltirib, osmondan suv tushirdi. U bilan sizlarni poklash, sizlardan shayton vasvasasini ketkazish, qalblaringizni mustahkamlash va oyoqlaringizni sobit qilish uchun",
          tafsir: "Badr jangida Allohning mo'minlarga ko'rsatgan yordami va ularga tinchlik berishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "إِذْ يُوحِى رَبُّكَ إِلَى ٱلْمَلَٰٓئِكَةِ أَنِّى مَعَكُمْ فَثَبِّتُوا ٱلَّذِينَ ءَامَنُوا ۚ سَأُلْقِى فِى قُلُوبِ ٱلَّذِينَ كَفَرُوا ٱلرُّعْبَ فَٱضْرِبُوا فَوْقَ ٱلْأَعْنَاقِ وَٱضْرِبُوا مِنْهُمْ كُلَّ بَنَانٍۢ",
          transcription: "Idh yuuhii rabbuka ilaa al-malaa'ikati annii ma'akum fathabbituu alladhiina aamanuu sa'ulqii fii quluubi alladhiina kafaruu ar-ru'ba fadribuu fawqa al-a'naaqi wadribuu minhum kulla banaanin",
          translation: "O'shanda Parvardigoringiz farishtalaraga: 'Men sizlar bilanman, iymon keltirganlarni mustahkamlang', deb vahiy qildi. Men kofirlarning qalblariga qo'rquv solaman. Bas, bo'yinlarning tepasiga uring va ularning barcha barmoqlarini uring",
          tafsir: "Badr jangida farishtalarning mo'minlarga yordami va kofirlarga qarshi kurash.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "ذَٰلِكَ بِأَنَّهُمْ شَآقُّوا ٱللَّهَ وَرَسُولَهُۥ ۚ وَمَن يُشَاقِقِ ٱللَّهَ وَرَسُولَهُۥ فَإِنَّ ٱللَّهَ شَدِيدُ ٱلْعِقَابِ",
          transcription: "Dhaalika bi'annahum shaaqquu allaaha wa rasuulahu wa man yushaaqiqi allaaha wa rasuulahu fa'inna allaaha shadiidu al-'iqaabi",
          translation: "Bu ular Alloh va Uning Rasuliga qarshi chiqqanlari uchundir. Kim Alloh va Uning Rasuliga qarshi chiqsa, albatta Alloh qattiq iqob qiluvchidir",
          tafsir: "Alloh va Uning Rasuliga qarshi chiqishning og'ir oqibatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "ذَٰلِكُمْ فَذُوقُوهُ وَأَنَّ لِلْكَٰفِرِينَ عَذَابَ ٱلنَّارِ",
          transcription: "Dhaalikum fadhuuquuhu wa anna lilkaafiriina 'adhaaba an-naari",
          translation: "Mana bu! Uni toting! Va albatta, kofirlar uchun do'zax azobidir",
          tafsir: "Kofirlarning dunyodagi jazosi va oxiratdagi do'zax azoblari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا إِذَا لَقِيتُمُ ٱلَّذِينَ كَفَرُوا زَحْفًۭا فَلَا تُوَلُّوهُمُ ٱلْأَدْبَارَ",
          transcription: "Yaa ayyuhaa alladhiina aamanuu idhaa laqiitumu alladhiina kafaruu zahfan falaa tuwalluuhumu al-adbaara",
          translation: "Ey iymon keltirganlar! Jangda kofirlar bilan to'qnashganingizda, ularga orqa ko'rsatmang",
          tafsir: "Jangda qochmaslik va jasorat bilan kurashish haqidagi buyruq.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "وَمَن يُوَلِّهِمْ يَوْمَئِذٍۢ دُبُرَهُۥٓ إِلَّا مُتَحَرِّفًۭا لِّقِتَالٍ أَوْ مُتَحَيِّزًا إِلَىٰ فِئَةٍۢ فَقَدْ بَآءَ بِغَضَبٍۢ مِّنَ ٱللَّهِ وَمَأْوَىٰهُ جَهَنَّمُ ۖ وَبِئْسَ ٱلْمَصِيرُ",
          transcription: "Wa man yuwallihim yawma'idhin duburahu illaa mutaharrifan liqitaalin aw mutahayyizan ilaa fi'atin faqad baa'a bighadabin mina allaahi wa ma'waahu jahannamu wa bi'sa al-masiiru",
          translation: "Kim o'sha kuni jang uchun moslashish yoki guruhga qo'shilish holati bundan mustasno, ularga orqa ko'rsatsa, Allohning g'azabiga duchor bo'ladi. Uning joyi jahannamdir. U qanday yomon joydir!",
          tafsir: "Jangdan qochishning katta gunoh ekanligi, faqat strategik chekinish ruxsat etilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "فَلَمْ تَقْتُلُوهُمْ وَلَٰكِنَّ ٱللَّهَ قَتَلَهُمْ ۚ وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَٰكِنَّ ٱللَّهَ رَمَىٰ ۚ وَلِيُبْلِىَ ٱلْمُؤْمِنِينَ مِنْهُ بَلَآءً حَسَنًا ۚ إِنَّ ٱللَّهَ سَمِيعٌ عَلِيمٌۭ",
          transcription: "Falam taqtuluuhum walaakinna allaaha qatalahum wa maa ramayta idh ramayta walaakinna allaaha ramaa wa liyubliya al-mu'miniina minhu balaa'an hasanan inna allaaha samii'un 'aliimun",
          translation: "Ularni siz o'ldirmadingiz, balki Alloh o'ldirdi. Otganingizda siz otmadingiz, balki Alloh otdi. Mo'minlarni O'zidan yaxshi sinov bilan sinash uchun. Albatta, Alloh eshituvchi va biluvchidir",
          tafsir: "Badr jangidagi g'alabaning haqiqiy sababi Allohning yordami ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "ذَٰلِكُمْ وَأَنَّ ٱللَّهَ مُوهِنُ كَيْدِ ٱلْكَٰفِرِينَ",
          transcription: "Dhaalikum wa anna allaaha muuhinu kaydi al-kaafiriina",
          translation: "Mana shu va albatta, Alloh kofirlarning makrlarini zaiflashtiruvchidir",
          tafsir: "Alloh kofirlarning barcha hiyla-nayranglarini barbod qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "إِن تَسْتَفْتِحُوا فَقَدْ جَآءَكُمُ ٱلْفَتْحُ ۖ وَإِن تَنتَهُوا فَهُوَ خَيْرٌۭ لَّكُمْ ۖ وَإِن تَعُودُوا نَعُدْ وَلَن تُغْنِىَ عَنكُمْ فِئَتُكُمْ شَيْـًۭٔا وَلَوْ كَثُرَتْ وَأَنَّ ٱللَّهَ مَعَ ٱلْمُؤْمِنِينَ",
          transcription: "In tastaftihuu faqad jaa'akumu al-fathu wa in tantahuu fahuwa khayrun lakum wa in ta'uuduu na'ud wa lan tughniya 'ankum fi'atukum shay'an walaw kathurat wa anna allaaha ma'a al-mu'miniina",
          translation: "Agar fatv so'ragan bo'lsangiz, mana sizlarga fatv keldi. Agar to'xtasangiz, bu sizlar uchun yaxshidir. Agar qaytarsangiz, Biz ham qaytaramiz. Guruhingiz ko'p bo'lsa ham, sizlarga hech foyda bermaydi. Albatta, Alloh mo'minlar bilandir",
          tafsir: "Kofirlarning o'zlari so'ragan hukm kelgani va ular uchun tavba eshigi ochiq ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا أَطِيعُوا ٱللَّهَ وَرَسُولَهُۥ وَلَا تَوَلَّوْا عَنْهُ وَأَنتُمْ تَسْمَعُونَ",
          transcription: "Yaa ayyuhaa alladhiina aamanuu atii'uu allaaha wa rasuulahu wa laa tawallaw 'anhu wa antum tasma'uuna",
          translation: "Ey iymon keltirganlar! Allohga va Uning Rasuliga itoat qiling va eshitib turib undan yuz o'girmang",
          tafsir: "Mo'minlarning Alloh va Rasuliga mutlaq itoat qilishi zarurligi.",
          copySymbol: "📋"
      }
    ]
  },

// TO'G'RILANGAN SURAH MASSIVI (Birinchi va ikkinchi qismlar birlashtirildi)
 
  // Tawba surasi
  {
    id: 9,
    name: "At-Tawba",
    arabicName: "التوبة",
    meaning: "Tavba",
    ayahCount: 129,
    place: "Madina",
    prelude: {}, // At-Tawba surasida Bismillah yo'q
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "بَرَآءَةٌ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى ٱلَّذِينَ عَٰهَدتُّم مِّنَ ٱلْمُشْرِكِينَ",
        transcription: "Baraa'atun mina Allahi wa rasuulihi ilaa alladhiina 'aahadttum mina al-mushrikiin",
        translation: "Alloh va Rasulidan mushriklarga qilgan ahdingizdan ozodlik",
        tafsir: "Mushriklarga qilingan ahdlarning bekor qilinishi haqida e'lon.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "فَسِيحُوا۟ فِى ٱلْأَرْضِ أَرْبَعَةَ أَشْهُرٍ",
        transcription: "Fasiihuu fil-ardi arba'ata ashhur",
        translation: "Yer yuzida to'rt oy davomida yuring",
        tafsir: "Mushriklarga to'rt oylik muhlat berilishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "وَأَذَٰنٌ مِّنَ ٱللَّهِ وَرَسُولِهِۦٓ إِلَى ٱلنَّاسِ يَوْمَ ٱلْحَجِّ ٱلْأَكْبَرِ",
        transcription: "Wa adhaanun mina Allahi wa rasuulihi ila an-naasi yawma al-hajjil-akbar",
        translation: "Alloh va Rasulidan odamlarga katta haj kuni e'lon",
        tafsir: "Haj vaqtida mushriklarga ogohlantirish e'lon qilinadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "أَنَّ ٱللَّهَ بَرِىٓءٌ مِّنَ ٱلْمُشْرِكِينَ ۙ وَرَسُولُهُۥ",
        transcription: "Anna Allaha bari'un mina al-mushrikiina wa rasuuluhu",
        translation: "Alloh va Rasuli mushriklardan ozoddir",
        tafsir: "Alloh va Rasulning mushriklardan uzilishi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "فَإِذَا ٱنسَلَخَ ٱلْأَشْهُرُ ٱلْحُرُمُ فَٱقْتُلُوا۟ ٱلْمُشْرِكِينَ حَيْثُ وَجَدتُّمُوهُمْ",
        transcription: "Fa-idhaa insalakha al-ashhurul-hurumu faqtulu al-mushrikiina haythu wajadttumuuhum",
        translation: "Muqaddas oylar tugagach, mushriklarni topgan joyingizda o'ldiring",
        tafsir: "Muqaddas oylar tugagach, ahdni buzadigan mushriklarga qarshi jang qilish buyuriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَإِنْ أَحَدٌ مِّنَ ٱلْمُشْرِكِينَ ٱسْتَجَارَكَ فَأَجِرْهُ حَتَّىٰ يَسْمَعَ كَلَٰمَ ٱللَّهِ",
        transcription: "Wa in ahadun mina al-mushrikiina istajaara fa-ajirhu hattaa yasma'a kalaama Allahi",
        translation: "Agar mushriklardan biri sendan panoh so'rasa, unga Allohning kalomini eshittirguncha panoh ber",
        tafsir: "Mushriklar ham Allohning kalomini eshitish huquqiga ega va ularga panoh berish kerak.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "ثُمَّ أَبْلِغْهُ مَأْمَنَهُۥ ۚ ذَٰلِكَ بِأَنَّهُمْ قَوْمٌ لَّا يَعْلَمُونَ",
        transcription: "Thumma abligh-hu ma'manahu, dhaalika bi-annahum qawmun laa ya'lamuun",
        translation: "So'ngra uni xavfsiz joyiga yetkazing, chunki ular bilmaydigan qavmdir",
        tafsir: "Mushrikka Qur'on eshittirish va xavfsizlik kafolati berish kerak.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "كَيْفَ يَكُونُ لِلْمُشْرِكِينَ عَهْدٌ عِندَ ٱللَّهِ وَعِندَ رَسُولِهِۦٓ",
        transcription: "Kayfa yakuunu lil-mushrikiina 'ahdun 'inda Allahi wa 'inda rasuulihi",
        translation: "Qanday qilib mushriklar uchun Alloh va Rasuli huzurida ahd bo'ladi?",
        tafsir: "Mushriklar ahdlarini buzgani uchun ular bilan shartnoma yaroqsiz hisoblanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "إِلَّا ٱلَّذِينَ عَٰهَدتُّمْ عِندَ ٱلْمَسْجِدِ ٱلْحَرَامِ فَمَا ٱسْتَقَٰمُوا۟ لَكُمْ فَٱسْتَقِيمُوا۟ لَهُمْ",
        transcription: "Illa alladhiina 'aahadtum 'inda al-masjidil-haraami famaa istaqaamuu lakum fastaqiimuu lahum",
        translation: "Faqat Masjidil-Harom yonida ahd qilganlaringiz mustasno, ular sizga to'g'ri bo'lsa, sizlar ham ularga to'g'ri bo'ling",
        tafsir: "Ahdga sodiq bo'lgan mushriklar bilan muomala davom ettiriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُتَّقِينَ",
        transcription: "Inna Allaha yuhibbu al-muttaqiin",
        translation: "Albatta, Alloh taqvodorlarni sevadi",
        tafsir: "Allohning taqvodorlarni sevishi va ularga yaxshilik qilishi haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "فَإِن تَابُوا وَأَقَامُوا ٱلصَّلَوٰةَ وَءَاتَوُا ٱلزَّكَوٰةَ فَإِخْوَٰنُكُمْ فِى ٱلدِّينِ ۗ وَنُفَصِّلُ ٱلْءَايَٰتِ لِقَوْمٍۢ يَعْلَمُونَ",
          transcription: "Fa'in taabuu wa aqaamuu as-salaata wa aatawu az-zakaata fa'ikhwaanukum fii ad-diini wa nufassilu al-aayaati liqawmin ya'lamuuna",
          translation: "Agar ular tavba qilib, namozni to'kis ado etib, zakot bersalar, dindagi qardoshlaringizdir. Biz oyatlarni biladigan qavmlar uchun batafsil bayon qilamiz",
          tafsir: "Kofirlarning Islomga kirish sharti va musulmonlar bilan birodarlik munosabati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "وَإِن نَّكَثُوٓا أَيْمَٰنَهُم مِّنۢ بَعْدِ عَهْدِهِمْ وَطَعَنُوا فِى دِينِكُمْ فَقَٰتِلُوٓا أَئِمَّةَ ٱلْكُفْرِ ۙ إِنَّهُمْ لَآ أَيْمَٰنَ لَهُمْ لَعَلَّهُمْ يَنتَهُونَ",
          transcription: "Wa in nakathuu aymaanahum min ba'di 'ahdihim wa ta'anuu fii diinikum faqaatiluuu a'immata al-kufri innahum laa aymaana lahum la'allahum yantahuuna",
          translation: "Agar ahd qilganlaridan keyin qasamlarini buzsalar va diningizga ta'n qilsalar, kufr boshliqlariga qarshi jang qiling. Albatta, ular uchun qasamlar yo'q. Shoyad to'xtarlar",
          tafsir: "Ahdni buzgan va Islomga hujum qilgan kofir boshliqlarga qarshi kurashish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "أَلَا تُقَٰتِلُونَ قَوْمًۭا نَّكَثُوٓا أَيْمَٰنَهُمْ وَهَمُّوا بِإِخْرَاجِ ٱلرَّسُولِ وَهُم بَدَءُوكُمْ أَوَّلَ مَرَّةٍ ۚ أَتَخْشَوْنَهُمْ ۚ فَٱللَّهُ أَحَقُّ أَن تَخْشَوْهُ إِن كُنتُم مُّؤْمِنِينَ",
          transcription: "Alaa tuqaatiluuna qawman nakathuu aymaanahum wa hammuu bi'ikhraaji ar-rasuuli wa hum bada'uukum awwala marratin atakhshawnahum fallaahu ahaqqu an takhshawhu in kuntum mu'miniina",
          translation: "Qasamlarini buzgan, Rasulni chiqarishga uringan va birinchi bo'lib sizlarga qarshi boshlagan qavmga qarshi jang qilmaysizlarmi? Ulardan qo'rqasizlarmi? Agar mo'min bo'lsangiz, Allohdan qo'rqish haqliroqdir",
          tafsir: "Ahdni buzgan va Payg'ambarni haydashga uringan kofirlar bilan jang qilish zarurligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "قَٰتِلُوهُمْ يُعَذِّبْهُمُ ٱللَّهُ بِأَيْدِيكُمْ وَيُخْزِهِمْ وَيَنصُرْكُمْ عَلَيْهِمْ وَيَشْفِ صُدُورَ قَوْمٍۢ مُّؤْمِنِينَ",
          transcription: "Qaatiluuhum yu'adhdhibhumu allaahu bi'aydiikum wa yukhzihim wa yansurkum 'alayhim wa yashfi suduura qawmin mu'miniina",
          translation: "Ularga qarshi jang qiling, Alloh ularni sizning qo'llaringiz bilan azoblaydi, ularni xor qiladi, sizlarni ularga qarshi g'olib qiladi va mo'min qavmning ko'ngillariga shifo beradi",
          tafsir: "Kofirlar bilan jang qilishning foydalari va Allohning yordami.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "وَيُذْهِبْ غَيْظَ قُلُوبِهِمْ ۗ وَيَتُوبُ ٱللَّهُ عَلَىٰ مَن يَشَآءُ ۗ وَٱللَّهُ عَلِيمٌ حَكِيمٌ",
          transcription: "Wa yudhhib ghayza quluubihim wa yatuubu allaahu 'alaa man yashaa'u wallaahu 'aliimun hakiimun",
          translation: "Va ularning qalblaridagi g'azabni ketkazadi. Alloh xohlagan kishining tavbasini qabul qiladi. Alloh biluvchi va hikmatlidir",
          tafsir: "Mo'minlar qalbidagi g'azabning ketishi va Allohning tavba eshigi ochiq ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "أَمْ حَسِبْتُمْ أَن تُتْرَكُوا وَلَمَّا يَعْلَمِ ٱللَّهُ ٱلَّذِينَ جَٰهَدُوا مِنكُمْ وَلَمْ يَتَّخِذُوا مِن دُونِ ٱللَّهِ وَلَا رَسُولِهِۦ وَلَا ٱلْمُؤْمِنِينَ وَلِيجَةًۭ ۚ وَٱللَّهُ خَبِيرٌۢ بِمَا تَعْمَلُونَ",
          transcription: "Am hasibtum an tutrakuu wa lammaa ya'lami allaahu alladhiina jaahaduu minkum wa lam yattakhidhuu min duuni allaahi wa laa rasuulihi wa laa al-mu'miniina waliijatan wallaahu khabiirun bimaa ta'maluuna",
          translation: "Yoki tashlab qo'yilasiz deb o'yladingizmi? Hali Alloh sizlardan jihod qilgan va Alloh, Uning Rasuli va mo'minlardan boshqa sirli do'st tutmaganlarni bilmadi. Alloh qilayotgan amallaringizdan xabardordir",
          tafsir: "Haqiqiy mo'minlarni sinov orqali aniqlash va ularning ixlosi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "مَا كَانَ لِلْمُشْرِكِينَ أَن يَعْمُرُوا مَسَٰجِدَ ٱللَّهِ شَٰهِدِينَ عَلَىٰٓ أَنفُسِهِم بِٱلْكُفْرِ ۚ أُو۟لَٰٓئِكَ حَبِطَتْ أَعْمَٰلُهُمْ وَفِى ٱلنَّارِ هُمْ خَٰلِدُونَ",
          transcription: "Maa kaana lilmushrikeena an ya'muruu masaajida allaahi shaahidiina 'alaa anfusihim bilkufri ulaa'ika habitat a'maaluhum wa fii an-naari hum khaaliduuna",
          translation: "Mushriklar o'zlarining kofirligiga guvohlik berib turib, Allohning masjidlarini obod qilishlari mumkin emas. Ularning amallari bekor bo'ldi va ular do'zaxda abadiy qoluvchilardir",
          tafsir: "Mushriklarning masjidlarda xizmat qilish huquqi yo'qligi va ularning amallarining bekor bo'lishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "إِنَّمَا يَعْمُرُ مَسَٰجِدَ ٱللَّهِ مَنْ ءَامَنَ بِٱللَّهِ وَٱلْيَوْمِ ٱلْءَاخِرِ وَأَقَامَ ٱلصَّلَوٰةَ وَءَاتَى ٱلزَّكَوٰةَ وَلَمْ يَخْشَ إِلَّا ٱللَّهَ ۖ فَعَسَىٰٓ أُو۟لَٰٓئِكَ أَن يَكُونُوا مِنَ ٱلْمُهْتَدِينَ",
          transcription: "Innamaa ya'muru masaajida allaahi man aamana billaahi wal-yawmi al-aakhiri wa aqaama as-salaata wa aataa az-zakaata wa lam yakhsha illaa allaaha fa'asaa ulaa'ika an yakuunuu mina al-muhtadiina",
          translation: "Allohning masjidlarini faqat Allohga va oxirat kuniga iymon keltirgan, namozni to'kis ado etgan, zakot bergan va Allohdan boshqa hech kimdan qo'rqmagan kishilargina obod qiladi. Shoyad ular hidoyat topganlardan bo'lsalar",
          tafsir: "Masjidlarni obod qilishning haqiqiy sharti - komil iymon va amal.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "أَجَعَلْتُمْ سِقَايَةَ ٱلْحَآجِّ وَعِمَارَةَ ٱلْمَسْجِدِ ٱلْحَرَامِ كَمَنْ ءَامَنَ بِٱللَّهِ وَٱلْيَوْمِ ٱلْءَاخِرِ وَجَٰهَدَ فِى سَبِيلِ ٱللَّهِ ۚ لَا يَسْتَوُۥنَ عِندَ ٱللَّهِ ۗ وَٱللَّهُ لَا يَهْدِى ٱلْقَوْمَ ٱلظَّٰلِمِينَ",
          transcription: "Aja'altum siqaayata al-haajji wa 'imaarata al-masjidi al-haraami kaman aamana billaahi wal-yawmi al-aakhiri wa jaahada fii sabiili allaahi laa yastawuuna 'inda allaahi wallaahu laa yahdii al-qawma az-zaalimiina",
          translation: "Hojilarga suv berish va Masjidi Haromni obod qilishni Allohga va oxirat kuniga iymon keltirib, Alloh yo'lida jihod qilgan kishi bilan barobar qildingizmi? Ular Alloh huzurida barobar emas. Alloh zolim qavmni hidoyat qilmaydi",
          tafsir: "Haqiqiy iymon va jihodning afzalligi zohiriy xizmatlardan.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "ٱلَّذِينَ ءَامَنُوا وَهَاجَرُوا وَجَٰهَدُوا فِى سَبِيلِ ٱللَّهِ بِأَمْوَٰلِهِمْ وَأَنفُسِهِمْ أَعْظَمُ دَرَجَةً عِندَ ٱللَّهِ ۚ وَأُو۟لَٰٓئِكَ هُمُ ٱلْفَآئِزُونَ",
          transcription: "Alladhiina aamanuu wa haajaruu wa jaahaduu fii sabiili allaahi bi'amwaalihim wa anfusihim a'zhamu darajatan 'inda allaahi wa ulaa'ika humu al-faa'izuuna",
          translation: "Iymon keltirib, hijrat qilib, mollari va jonlari bilan Alloh yo'lida jihod qilganlar Alloh huzurida eng ulug' darajadadirlar. Ana o'shalar g'olib bo'luvchilardir",
          tafsir: "Iymon, hijrat va jihodning Alloh huzuridagi ulug' maqomi.",
          copySymbol: "📋"
      }
    ]
  },
  // Yunus surasi
  {
    id: 10,
    name: "Yunus",
    arabicName: "يونس",
    meaning: "Yunus payg'ambar",
    ayahCount: 109,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "الر ۚ تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ٱلْحَكِيمِ",
        transcription: "Alif Laam Raa, tilka aayaatu al-kitaabil-hakiim",
        translation: "Alif, Laam, Raa. Mana hikmatli Kitobning oyatlaridir",
        tafsir: "Muqatta'at harflari va Qur'onning hikmatli kitob ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "أَكَانَ لِلنَّاسِ عَجَبًا أَنْ أَوْحَيْنَآ إِلَىٰ رَجُلٍ مِّنْهُمْ أَنْ أَنذِرِ ٱلنَّاسَ",
        transcription: "A-kaana lin-naasi 'ajaban an awhaynaa ilaa rajulin minhum an andhiri an-naasa",
        translation: "Odamlarga ajab bo'ldimi, Biz ulardagi bir kishiga vahiy qilib: 'Odamlarni ogohlantir' deganimiz?",
        tafsir: "Odamlarning payg'ambarlik haqida hayron bo'lishiga javob beriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "وَبَشِّرِ ٱلَّذِينَ ءَامَنُوٓا۟ أَنَّ لَهُمْ قَدَمَ صِدْقٍ عِندَ رَبِّهِمْ",
        transcription: "Wa bashshiri alladhiina aamanuu anna lahum qadama sidqin 'inda rabbihim",
        translation: "Va iymon keltirganlarga xushxabar ber: Ularning Robblari huzurida haqiqiy maqomlari bor",
        tafsir: "Mo'minlarga Alloh huzuridagi ulug' maqom va'da qilinadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "قَالَ ٱلْكَٰفِرُونَ إِنَّ هَٰذَا لَسَٰحِرٌ مُّبِينٌ",
        transcription: "Qaala al-kaafiruna inna haadha lasaahirun mubiin",
        translation: "Kofirlar: 'Bu aniq sehrgar', dedilar",
        tafsir: "Kofirlarning Rasulullohga nisbatan yolg'on ayblovlari haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "إِنَّ رَبَّكُمُ ٱللَّهُ ٱلَّذِى خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ فِى سِتَّةِ أَيَّامٍ",
        transcription: "Inna rabbakumu Allahu alladhii khalaqa as-samaawaati wal-arda fii sittati ayyaam",
        translation: "Albatta, sizning Robbingiz – osmonlar va yerni olti kunda yaratgan Allohdir",
        tafsir: "Allohning yaratuvchilik qudrati va osmon-yer yaratilishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "ثُمَّ ٱسْتَوَىٰ عَلَى ٱلْعَرْشِ ۖ يُدَبِّرُ ٱلْأَمْرَ",
        transcription: "Thumma istawaa 'alal-'arshi yudabbiru al-amra",
        translation: "So'ngra Arshga mustawi bo'ldi, ishlarni boshqaradi",
        tafsir: "Allohning Arsh ustidagi hukmronligi va boshqaruvchiligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "مَا مِن شَفِيعٍ إِلَّا مِنۢ بَعْدِ إِذْنِهِۦ ۚ ذَٰلِكُمُ ٱللَّهُ رَبُّكُمْ فَٱعْبُدُوهُ",
        transcription: "Maa min shafii'in illaa min ba'di idhnihi, dhaalikumu Allahu rabbukum fa'buduuh",
        translation: "Uning ruxsatisiz hech shofaatchi yo'q. Mana sizning Robbingiz Alloh, bas, Unga ibodat qiling",
        tafsir: "Shofaatning faqat Alloh ruxsati bilan bo'lishi va Unga yagona ibodat qilish buyuriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "أَفَلَا تَذَكَّرُونَ",
        transcription: "Afalaa tadhakkaruun",
        translation: "Aqlingizni ishlatmaysizlarmi?",
        tafsir: "Allohning birligini tushunish uchun aql-idrokni ishlatishga da'vat.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "إِلَيْهِ مَرْجِعُكُمْ جَمِيعًا ۖ وَعْدَ ٱللَّهِ حَقًّا",
        transcription: "Ilayhi marji'ukum jamii'an, wa'da Allahi haqqan",
        translation: "Hammangizning qaytishingiz Unga, Allohning va'dasi haqdir",
        tafsir: "Qiyomat kuni hamma Allohga qaytishi va bu haq va'da ekanligi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "دَعْوَىٰهُمْ فِيهَا سُبْحَٰنَكَ ٱللَّهُمَّ وَتَحِيَّتُهُمْ فِيهَا سَلَٰمٌ ۚ وَءَاخِرُ دَعْوَىٰهُمْ أَنِ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
        transcription: "Da'waahum fiihaa subhaanaka Allaahumma wa tahiyyatuhum fiihaa salaamun wa aakhiru da'waahum anil-hamdu lillaahi rabbil-'aalamiin",
        translation: "Ularning u yerda (jannatda) duolari: 'Subhanakallahumma' va salomlashuvi: 'Salom' bo'ladi va duolarining oxiri: 'Maqtov olamlar Rabbi Allohgadir'",
        tafsir: "Jannat ahlining zikr va duolari haqida, ular doimo Allohni ulug'laydilar.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "وَلَوْ يُعَجِّلُ ٱللَّهُ لِلنَّاسِ ٱلشَّرَّ ٱسْتِعْجَالَهُم بِٱلْخَيْرِ لَقُضِىَ إِلَيْهِمْ أَجَلُهُمْ ۖ فَنَذَرُ ٱلَّذِينَ لَا يَرْجُونَ لِقَآءَنَا فِى طُغْيَٰنِهِمْ يَعْمَهُونَ",
          transcription: "Walaw yu'ajjilu allaahu linnaasi ash-sharra isti'jaalahum bilkhayri laqudiya ilayhim ajaluhum fanadharu alladhiina laa yarjuuna liqaa'anaa fii tughyaanihim ya'mahuuna",
          translation: "Agar Alloh odamlarga yaxshilikni shoshiltirganlari kabi yomonlikni ham shoshiltirsa, ularning ajallari tugab qolgan bo'lar edi. Biz bilan uchrashishni umid qilmaydiganlarni tug'yonlarida boshi qotib qolgan holda qo'yib qo'yamiz",
          tafsir: "Allohning rahmatidan odamlarga azobni kechiktirishi va kofirlarning holati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "وَإِذَا مَسَّ ٱلْإِنسَٰنَ ٱلضُّرُّ دَعَانَا لِجَنۢبِهِۦٓ أَوْ قَاعِدًا أَوْ قَآئِمًۭا فَلَمَّا كَشَفْنَا عَنْهُ ضُرَّهُۥ مَرَّ كَأَن لَّمْ يَدْعُنَآ إِلَىٰ ضُرٍّۢ مَّسَّهُۥ ۚ كَذَٰلِكَ زُيِّنَ لِلْمُسْرِفِينَ مَا كَانُوا يَعْمَلُونَ",
          transcription: "Wa idhaa massa al-insaana ad-durru da'aanaa lijanbihi aw qaa'idan aw qaa'iman falammaa kashafnaa 'anhu durrahu marra ka'an lam yad'unaa ilaa durrin massahu kadhaalika zuyyina lilmusrifiina maa kaanuu ya'maluuna",
          translation: "Insonga zarar yetganda, yotgan, o'tirgan yoki turgan holda Bizga duo qiladi. Undan zararni ketkazganimizda, xuddi unga yetgan zararga Bizni chaqirmagan kabi o'tib ketadi. Shunday qilib, haddan oshganlarga qilayotgan amallari zinatlandi",
          tafsir: "Insonning qiyinchilikda duoga murojaat qilishi va farovonlikda unutishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَلَقَدْ أَهْلَكْنَا ٱلْقُرُونَ مِن قَبْلِكُمْ لَمَّا ظَلَمُوا ۙ وَجَآءَتْهُمْ رُسُلُهُم بِٱلْبَيِّنَٰتِ وَمَا كَانُوا لِيُؤْمِنُوا ۚ كَذَٰلِكَ نَجْزِى ٱلْقَوْمَ ٱلْمُجْرِمِينَ",
          transcription: "Walaqad ahlaknaa al-quruuna min qablikum lammaa zhalamuu wa jaa'athum rusuluhum bilbayyinaati wa maa kaanuu liyu'minuu kadhaalika najzii al-qawma al-mujrimiina",
          translation: "Batahqiq, sizlardan oldingi avlodlarni zulm qilganlarida halok qildik. Ularga rasullari ochiq-oydin dalillar bilan kelgan edi, lekin ular iymon keltirmadilar. Jinoyatchi qavmlarni shunday jazolaymiz",
          tafsir: "O'tgan ummatlarning zulm va kufrdan halok bo'lishi va buning ibrati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "ثُمَّ جَعَلْنَٰكُمْ خَلَٰٓئِفَ فِى ٱلْأَرْضِ مِنۢ بَعْدِهِمْ لِنَنظُرَ كَيْفَ تَعْمَلُونَ",
          transcription: "Thumma ja'alnaakum khalaa'ifa fii al-ardi min ba'dihim linanzhura kayfa ta'maluuna",
          translation: "So'ngra ulardan keyin sizlarni yer yuzida o'rinbosar qildik, qanday amal qilishingizni ko'rish uchun",
          tafsir: "Insoniyatning yer yuzida xalifa bo'lishi va sinov.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "وَإِذَا تُتْلَىٰ عَلَيْهِمْ ءَايَاتُنَا بَيِّنَٰتٍۢ ۙ قَالَ ٱلَّذِينَ لَا يَرْجُونَ لِقَآءَنَا ٱئْتِ بِقُرْءَانٍ غَيْرِ هَٰذَآ أَوْ بَدِّلْهُ ۚ قُلْ مَا يَكُونُ لِىٓ أَنْ أُبَدِّلَهُۥ مِن تِلْقَآئِ نَفْسِىٓ ۖ إِنْ أَتَّبِعُ إِلَّا مَا يُوحَىٰٓ إِلَىَّ ۖ إِنِّىٓ أَخَافُ إِنْ عَصَيْتُ رَبِّى عَذَابَ يَوْمٍ عَظِيمٍۢ",
          transcription: "Wa idhaa tutlaa 'alayhim aayaatunaa bayyinaatin qaala alladhiina laa yarjuuna liqaa'anaa i'ti biqur'aanin ghayri haadhaa aw baddilhu qul maa yakuunu lii an ubaddilahu min tilqaa'i nafsii in attabi'u illaa maa yuuhaa ilayya innii akhaafu in 'asaytu rabbii 'adhaaba yawmin 'azhiimin",
          translation: "Ularga ochiq-oydin oyatlarimiz tilovat qilinganda, Biz bilan uchrashishni umid qilmaydiganlar: 'Bundan boshqa Qur'on keltir yoki uni o'zgartir', deydilar. Ayt: 'Men uni o'z xohishimdan o'zgartirishim mumkin emas. Men faqat menga vahiy qilinganga ergashaman. Agar Rabbimga isyon qilsam, ulug' kunning azobidan qo'rqaman'",
          tafsir: "Kofirlarning Qur'onni o'zgartirish talabi va Payg'ambarning javobi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "قُل لَّوْ شَآءَ ٱللَّهُ مَا تَلَوْتُهُۥ عَلَيْكُمْ وَلَآ أَدْرَىٰكُم بِهِۦ ۖ فَقَدْ لَبِثْتُ فِيكُمْ عُمُرًۭا مِّن قَبْلِهِۦٓ ۚ أَفَلَا تَعْقِلُونَ",
          transcription: "Qul law shaa'a allaahu maa talawtuhuu 'alaykum wa laa adraakum bihi faqad labithtu fiikum 'umuran min qablihi afalaa ta'qiluuna",
          translation: "Ayt: 'Agar Alloh xohlasa edi, men uni sizlarga tilovat qilmas edim va U sizlarga ma'lum qilmas edi. Men bundan oldin sizlar orasida bir umr yashab o'tdim. Aql yuritmaymisizmi?'",
          tafsir: "Payg'ambarning haq ekanligining dalili - uning oldingi pok hayoti.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "فَمَنْ أَظْلَمُ مِمَّنِ ٱفْتَرَىٰ عَلَى ٱللَّهِ كَذِبًا أَوْ كَذَّبَ بِـَٔايَٰتِهِۦٓ ۚ إِنَّهُۥ لَا يُفْلِحُ ٱلْمُجْرِمُونَ",
          transcription: "Faman azhlamu mimmani iftaraa 'alaa allaahi kadhiban aw kadhdhaba bi'aayaatihi innahu laa yuflihu al-mujrimuuna",
          translation: "Allohga yolg'on to'qigan yoki Uning oyatlarini yolg'onga chiqargan kimsadan zolimroq kim bor? Albatta, jinoyatchilar najot topmaydi",
          tafsir: "Allohga yolg'on nisbat berish va Uning oyatlarini inkor etishning og'ir gunohligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَيَعْبُدُونَ مِن دُونِ ٱللَّهِ مَا لَا يَضُرُّهُمْ وَلَا يَنفَعُهُمْ وَيَقُولُونَ هَٰٓؤُلَآءِ شُفَعَٰٓؤُنَا عِندَ ٱللَّهِ ۚ قُلْ أَتُنَبِّـُٔونَ ٱللَّهَ بِمَا لَا يَعْلَمُ فِى ٱلسَّمَٰوَٰتِ وَلَا فِى ٱلْأَرْضِ ۚ سُبْحَٰنَهُۥ وَتَعَٰلَىٰ عَمَّا يُشْرِكُونَ",
          transcription: "Wa ya'buduuna min duuni allaahi maa laa yadurruhum wa laa yanfa'uhum wa yaquuluuna haa'ulaa'i shufa'aa'unaa 'inda allaahi qul atunabi'uuna allaaha bimaa laa ya'lamu fii as-samaawaati wa laa fii al-ardi subhaanahu wa ta'aalaa 'ammaa yushrikuuna",
          translation: "Ular Allohdan o'zga ularga zarar ham, foyda ham bera olmaydigan narsalarga ibodat qiladi va: 'Bular Alloh huzuridagi shafoatchilarimiz', deydilar. Ayt: 'Allohga osmonlaru yerda bilmagan narsasini xabar qilyapsizlarmi?' U pokdir va ular shirk keltirayotgan narsalardan oliydir",
          tafsir: "Butparastlikning mantiqsizligi va shafoat haqidagi noto'g'ri e'tiqod.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَمَا كَانَ ٱلنَّاسُ إِلَّآ أُمَّةًۭ وَٰحِدَةًۭ فَٱخْتَلَفُوا ۚ وَلَوْلَا كَلِمَةٌۭ سَبَقَتْ مِن رَّبِّكَ لَقُضِىَ بَيْنَهُمْ فِيمَا فِيهِ يَخْتَلِفُونَ",
          transcription: "Wa maa kaana an-naasu illaa ummatan waahidatan fakhtalafuu wa lawlaa kalimatun sabaqat min rabbika laqudiya baynahum fiimaa fiihi yakhtaliifuuna",
          translation: "Odamlar faqat bitta ummat edi, keyin ixtilof qildilar. Agar Rabbingning oldindan aytilgan so'zi bo'lmaganda, ular ixtilof qilayotgan narsalarida orasida hukm qilingan bo'lar edi",
          tafsir: "Insoniyatning aslida bir ummat bo'lgani va keyingi ixtiloflar.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "وَيَقُولُونَ لَوْلَآ أُنزِلَ عَلَيْهِ ءَايَةٌۭ مِّن رَّبِّهِۦ ۖ فَقُلْ إِنَّمَا ٱلْغَيْبُ لِلَّهِ فَٱنتَظِرُوٓا إِنِّى مَعَكُم مِّنَ ٱلْمُنتَظِرِينَ",
          transcription: "Wa yaquuluuna lawlaa unzila 'alayhi aayatun min rabbihi faqul innamaa al-ghaybu lillaahi fantazhiruu innii ma'akum mina al-muntazhiriina",
          translation: "Ular: 'Nega unga Rabbidan mo'jiza tushirilmadi?' deydilar. Ayt: 'G'ayb faqat Allohnikdir. Kuting, men ham sizlar bilan birga kutuvchilardanman'",
          tafsir: "Kofirlarning mo'jiza talablari va g'ayb ilmi faqat Allohga xosligi.",
          copySymbol: "📋"
      }
    ]
  },
  // Hud surasi
  {
    id: 11,
    name: "Hud",
    arabicName: "هود",
    meaning: "Hud payg'ambar",
    ayahCount: 123,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "الر ۚ كِتَٰبٌ أُحْكِمَتْ ءَايَٰتُهُۥ ثُمَّ فُصِّلَتْ مِن لَّدُنْ حَكِيمٍ خَبِيرٍ",
        transcription: "Alif Laam Raa, kitaabun uhkimat aayaatuhu thumma fussilat min ladun hakiimin khabiir",
        translation: "Alif, Laam, Raa. Bu Kitob – oyatlari mustahkamlangan, so'ngra hikmatli va xabardor Zotdan tafsillangandir",
        tafsir: "Qur'onning mustahkam va tafsiliy kitob ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "أَلَّا تَعْبُدُوٓا۟ إِلَّا ٱللَّهَ ۚ إِنَّنِى لَكُم مِّنْهُ نَذِيرٌ وَبَشِيرٌ",
        transcription: "Allaa ta'buduu illa Allaha, innaniy lakum minhu nadhiirun wa bashiir",
        translation: "Allohdan boshqaga ibodat qilmang, men sizlarga Undan ogohlantiruvchi va xushxabar beruvchiman",
        tafsir: "Yagona Allohga ibodat qilish va Rasulning vazifasi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "وَأَنِ ٱسْتَغْفِرُوا۟ رَبَّكُمْ ثُمَّ تُوبُوٓا۟ إِلَيْهِ يُمَتِّعْكُم مَّتَٰعًا حَسَنًا",
        transcription: "Wa ani istaghfiruu rabbakum thumma tuubuu ilayhi yumatti'kum mataa'an hasanan",
        translation: "Robbingizdan mag'firat so'rang, so'ngra Unga tavba qiling, sizni yaxshi ne'matlar bilan bahramand qiladi",
        tafsir: "Tavba va istig'forning dunyo va oxiratdagi foydasi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "إِلَىٰٓ أَجَلٍ مُّسَمًّى وَيُؤْتِ كُلَّ ذِى فَضْلٍ فَضْلَهُۥ",
        transcription: "Ilaa ajalin musamman wa yu'ti kulla dhii fadlin fadlahu",
        translation: "Belgilangan muddatgacha va har fazl egasiga uning fazlini beradi",
        tafsir: "Allohning har kimga o'z amallariga mos mukofot berishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَإِن تَوَلَّوْا۟ فَإِنِّىٓ أَخَافُ عَلَيْكُمْ عَذَابَ يَوْمٍ كَبِيرٍ",
        transcription: "Wa in tawallaw fa-inniy akhafu 'alaykum 'adhaaba yawmin kabiir",
        translation: "Agar yuz o'girsangiz, men sizlar uchun katta kun azobidan qo'rqaman",
        tafsir: "Haqdan yuz o'girganlarni qiyomat azobidan ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "إِلَى ٱللَّهِ مَرْجِعُكُمْ ۖ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ",
        transcription: "Ila Allahi marji'ukum wa huwa 'alaa kulli shay'in qadiir",
        translation: "Allohga qaytishingiz va U har narsaga qodirdir",
        tafsir: "Allohga qaytish va Uning qudrati haqida eslatma.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "أَلَآ إِنَّهُمْ يَثْنُونَ صُدُورَهُمْ لِيَسْتَخْفُوا۟ مِنْهُ",
        transcription: "Alaa innahum yathnuuna suduurahum liyastakhfuu minhu",
        translation: "Ogoh bo'ling, ular ko'kslarini bukib, Undan yashirinmoqchi bo'ladilar",
        tafsir: "Munofiqlarning Allohdan yashirinishga urinishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "أَلَا حِينَ يَسْتَغْشُونَ ثِيَابَهُمْ يَعْلَمُ مَا يُسِرُّونَ وَمَا يُعْلِنُونَ",
        transcription: "Alaa hiina yastaghshuuna thiyaabahum ya'lamu maa yusirruna wa maa yu'linuun",
        translation: "Ogoh bo'ling, ular kiyimlarini o'rab olganda ham, U ularning sir va oshkorasini biladi",
        tafsir: "Allohning hamma narsani bilishi va yashirinib bo'lmasligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "إِنَّهُۥ عَلِيمٌ بِذَاتِ ٱلصُّدُورِ",
        transcription: "Innahu 'aliimun bidhaat is-suduur",
        translation: "Albatta, U ko'ngillarning ichini biluvchidir",
        tafsir: "Allohning qalblarning ichidagi narsalarni bilishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَمَا مِن دَآبَّةٍ فِى ٱلْأَرْضِ إِلَّا عَلَى ٱللَّهِ رِزْقُهَا",
        transcription: "Wa maa min daabbatin fil-ardi illaa 'ala Allahi rizquhaa",
        translation: "Yer yuzidagi hech bir jonli mavjudot yo'qki, uning rizqi Alloh zimmasida bo'lmasin",
        tafsir: "Barcha mavjudotlarning rizqini Allohning kafolatlashi haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "وَلَا يَنفَعُكُمْ نُصْحِىٓ إِنْ أَرَدتُّ أَنْ أَنصَحَ لَكُمْ إِن كَانَ ٱللَّهُ يُرِيدُ أَن يُغْوِيَكُمْ ۚ هُوَ رَبُّكُمْ وَإِلَيْهِ تُرْجَعُونَ",
          transcription: "Wa laa yanfa'ukum nushii in aradtu an ansaha lakum in kaana allaahu yuriidu an yughwiyakum huwa rabbukum wa ilayhi turja'uuna",
          translation: "Agar Alloh sizlarni azdirmoqchi bo'lsa, men sizlarga nasihat qilmoqchi bo'lsam ham, nasihatim sizlarga foyda bermaydi. U sizlarning Rabbingizdir va Unga qaytarilasizlar",
          tafsir: "Allohning irodasi oldida insoniy sa'y-harakatlarning cheklanganligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "أَمْ يَقُولُونَ ٱفْتَرَىٰهُ ۖ قُلْ إِنِ ٱفْتَرَيْتُهُۥ فَعَلَىَّ إِجْرَامِى وَأَنَا۠ بَرِىٓءٌۭ مِّمَّا تُجْرِمُونَ",
          transcription: "Am yaquuluuna iftaraahu qul ini iftaraytuhu fa'alayya ijraamii wa ana barii'un mimmaa tujrimuuna",
          translation: "Yoki 'Uni to'qib chiqardi', deydilarmi? Ayt: 'Agar men uni to'qib chiqargan bo'lsam, jinoyatim o'zimgadir. Men sizlar qilayotgan jinoyatdan beg'uborman'",
          tafsir: "Qur'onning haq ekanligi va Payg'ambarning pokligini ta'kidlash.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَأُوحِىَ إِلَىٰ نُوحٍ أَنَّهُۥ لَن يُؤْمِنَ مِن قَوْمِكَ إِلَّا مَن قَدْ ءَامَنَ فَلَا تَبْتَئِسْ بِمَا كَانُوا يَفْعَلُونَ",
          transcription: "Wa uuhiya ilaa Nuuhin annahu lan yu'mina min qawmika illaa man qad aamana falaa tabta'is bimaa kaanuu yaf'aluuna",
          translation: "Nuhga vahiy qilindiki: 'Qavmingdan iymon keltirganlardan boshqa hech kim iymon keltirmaydi. Ular qilayotgan ishlardan g'amgin bo'lma'",
          tafsir: "Nuh alayhissalomga qavmining iymon keltirmasligi haqida xabar.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "وَٱصْنَعِ ٱلْفُلْكَ بِأَعْيُنِنَا وَوَحْيِنَا وَلَا تُخَٰطِبْنِى فِى ٱلَّذِينَ ظَلَمُوٓا ۚ إِنَّهُم مُّغْرَقُونَ",
          transcription: "Wasna'i al-fulka bi'a'yuninaa wa wahyinaa wa laa tukhaatibnii fii alladhiina zhalamuu innahum mughraquuna",
          translation: "Bizning ko'z oldimizda va vahyimiz bilan kema yasang. Zulm qilganlar haqida Menga murojaat qilmang. Albatta, ular g'arq qilinadilar",
          tafsir: "Nuhga kema yasash buyrug'i va zolimlarning halok bo'lishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "وَيَصْنَعُ ٱلْفُلْكَ وَكُلَّمَا مَرَّ عَلَيْهِ مَلَأٌۭ مِّن قَوْمِهِۦ سَخِرُوا مِنْهُ ۚ قَالَ إِن تَسْخَرُوا مِنَّا فَإِنَّا نَسْخَرُ مِنكُمْ كَمَا تَسْخَرُونَ",
          transcription: "Wa yasna'u al-fulka wa kullamaa marra 'alayhi mala'un min qawmihi sakhiruu minhu qaala in taskharuu minnaa fa'innaa naskharu minkum kamaa taskharuuna",
          translation: "U kema yasayotgan edi. Qavmidan bir guruh uning yonidan o'tganda, undan masxara qilishardi. U: 'Agar bizdan masxara qilsangiz, biz ham sizlardan masxara qilamiz, xuddi sizlar masxara qilganingizdek', dedi",
          tafsir: "Nuhning kemani qurishda qavmining masxaralariga javobi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "فَسَوْفَ تَعْلَمُونَ مَن يَأْتِيهِ عَذَابٌۭ يُخْزِيهِ وَيَحِلُّ عَلَيْهِ عَذَابٌۭ مُّقِيمٌ",
          transcription: "Fasawfa ta'lamuuna man ya'tiihi 'adhaabun yukhziihi wa yahillu 'alayhi 'adhaabun muqiimun",
          translation: "Tez orada kimga xor qiluvchi azob kelishini va kimga doimiy azob tushishini bilasizlar",
          tafsir: "Masxara qiluvchi kofirlarni kutayotgan azob haqida ogohlantirish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "حَتَّىٰٓ إِذَا جَآءَ أَمْرُنَا وَفَارَ ٱلتَّنُّورُ قُلْنَا ٱحْمِلْ فِيهَا مِن كُلٍّۢ زَوْجَيْنِ ٱثْنَيْنِ وَأَهْلَكَ إِلَّا مَن سَبَقَ عَلَيْهِ ٱلْقَوْلُ وَمَنْ ءَامَنَ ۚ وَمَآ ءَامَنَ مَعَهُۥٓ إِلَّا قَلِيلٌۭ",
          transcription: "Hattaa idhaa jaa'a amrunaa wa faara at-tannuuru qulnaa ihmil fiihaa min kullin zawjayni ithnayni wa ahlaka illaa man sabaqa 'alayhi al-qawlu wa man aamana wa maa aamana ma'ahu illaa qaliilun",
          translation: "Nihoyat, Bizning amrimiz kelganda va tandir qaynab toshganda, dedik: 'Har turdan ikkitadan juft va ahlini – avvaldan hukm qilinganlardan tashqari – hamda iymon keltirganlarni kemaga yukla'. U bilan birga ozginagina kishi iymon keltirgan edi",
          tafsir: "To'fon boshlanishi va Nuhning kemaga yuklashi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَقَالَ ٱرْكَبُوا فِيهَا بِسْمِ ٱللَّهِ مَجْرِٜهَا وَمُرْسَىٰهَآ ۚ إِنَّ رَبِّى لَغَفُورٌۭ رَّحِيمٌۭ",
          transcription: "Wa qaala irkabu fiihaa bismi allaahi majraahaa wa mursaahaa inna rabbii laghafuurun rahiimun",
          translation: "U: 'Unga mining, Alloh nomi bilan uning suzishi ham, to'xtashi ham. Albatta, mening Rabbim mag'firatli va rahmlidir', dedi",
          tafsir: "Kemaga minishda Alloh nomini zikr qilish va Uning rahmatiga tayanish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَهِىَ تَجْرِى بِهِمْ فِى مَوْجٍۢ كَٱلْجِبَالِ وَنَادَىٰ نُوحٌ ٱبْنَهُۥ وَكَانَ فِى مَعْزِلٍۢ يَٰبُنَىَّ ٱرْكَب مَّعَنَا وَلَا تَكُن مَّعَ ٱلْكَٰفِرِينَ",
          transcription: "Wa hiya tajrii bihim fii mawjin kaljibali wa naadaa Nuuhun ibnahu wa kaana fii ma'zilin yaa bunayya irkab ma'anaa wa laa takun ma'a al-kaafiriina",
          translation: "Kema ular bilan tog'lardek to'lqinlar orasida suzib borardi. Nuh alohida turgan o'g'liga nido qildi: 'Ey o'g'lim! Biz bilan birga min, kofirlar bilan bo'lma'",
          tafsir: "To'fon paytida Nuhning o'g'lini najotga chaqirishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "قَالَ سَـَٔاوِىٓ إِلَىٰ جَبَلٍۢ يَعْصِمُنِى مِنَ ٱلْمَآءِ ۚ قَالَ لَا عَاصِمَ ٱلْيَوْمَ مِنْ أَمْرِ ٱللَّهِ إِلَّا مَن رَّحِمَ ۚ وَحَالَ بَيْنَهُمَا ٱلْمَوْجُ فَكَانَ مِنَ ٱلْمُغْرَقِينَ",
          transcription: "Qaala sa'aawii ilaa jabalin ya'simunii mina al-maa'i qaala laa 'aasima al-yawma min amri allaahi illaa man rahima wa haala baynahumaa al-mawju fakaana mina al-mughraqiina",
          translation: "U: 'Tog'ga panoh olaman, u meni suvdan asraydi', dedi. Nuh: 'Bugun Allohning amridan Uning rahm qilganidan boshqa hech kim asray olmaydi', dedi. Ikkalasining orasiga to'lqin to'sdi va u g'arq bo'lganlardan bo'ldi",
          tafsir: "Nuh o'g'lining kibridan halok bo'lishi va Alloh amridan qochib bo'lmasligi.",
          copySymbol: "📋"
      }
    ]
  },
  // Yusuf surasi
  {
    id: 12,
    name: "Yusuf",
    arabicName: "يوسف",
    meaning: "Yusuf payg'ambar",
    ayahCount: 111,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "الر ۚ تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ٱلْمُبِينِ",
        transcription: "Alif Laam Raa, tilka aayaatu al-kitaabil-mubiin",
        translation: "Alif, Laam, Raa. Mana aniq Kitobning oyatlaridir",
        tafsir: "Qur'onning aniq va ravshan kitob ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "إِنَّآ أَنزَلْنَٰهُ قُرْءَٰنًا عَرَبِيًّا لَّعَلَّكُمْ تَعْقِلُونَ",
        transcription: "Innaa anzalnaahu qur'aanan 'arabiyyan la'allakum ta'qiluun",
        translation: "Biz uni arab tilidagi Qur'on qilib nazil qildik, shoyad aqlingizni ishlatasiz",
        tafsir: "Qur'onning arab tilida nozil qilinishi va aql-idrok bilan tushunish muhimligi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "نَحْنُ نَقُصُّ عَلَيْكَ أَحْسَنَ ٱلْقَصَصِ بِمَآ أَوْحَيْنَآ إِلَيْكَ هَٰذَا ٱلْقُرْءَانَ",
        transcription: "Nahnu naqussu 'alayka ahsana al-qasasi bimaa awhaynaa ilayka haadha al-qur'aan",
        translation: "Biz senga bu Qur'onni vahiy qilish bilan eng go'zal qissalarni hikoya qilamiz",
        tafsir: "Qur'ondagi qissalarning eng go'zal va ibratli ekanligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "وَإِن كُنتَ مِن قَبْلِهِۦ لَمِنَ ٱلْغَٰفِلِينَ",
        transcription: "Wa in kunta min qablihi lamina al-ghaafiliin",
        translation: "Bundan oldin sen g'ofillardan eding",
        tafsir: "Rasulullohning vahiy kelishidan oldingi holati haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "إِذْ قَالَ يُوسُفُ لِأَبِيهِ يَٰٓأَبَتِ إِنِّى رَأَيْتُ أَحَدَ عَشَرَ كَوْكَبًا",
        transcription: "Idh qaala Yuusufu li-abiihi yaa abati inniy ra'aytu ahada 'ashara kawkaban",
        translation: "Yusuf otasiga: 'Ey otajon, men o'n bitta yulduzni ko'rdim' dedi",
        tafsir: "Yusuf payg'ambarning mashhur tushining boshlanishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَٱلشَّمْسَ وَٱلْقَمَرَ رَأَيْتُهُمْ لِى سَٰجِدِينَ",
        transcription: "Wash-shamsa wal-qamara ra'aytuhum liy saajidiin",
        translation: "Va quyosh bilan oyni ko'rdim, ular menga sajda qilishdi",
        tafsir: "Yusufning tushida ko'rgan manzarasi va uning ta'biri.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "قَالَ يَٰبُنَىَّ لَا تَقْصُصْ رُءْيَاكَ عَلَىٰٓ إِخْوَتِكَ فَيَكِيدُوا۟ لَكَ كَيْدًا",
        transcription: "Qaala yaa bunayya laa taqsus ru'yaaka 'alaa ikhwatika fayakiiduu laka kaydan",
        translation: "Dedi: 'Ey o'g'lim, tushingni akalaringga aytma, ular senga hiyla qilishadi'",
        tafsir: "Ya'qub payg'ambarning o'g'liga bergan oqilona maslahati.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "إِنَّ ٱلشَّيْطَٰنَ لِلْإِنسَٰنِ عَدُوٌّ مُّبِينٌ",
        transcription: "Inna ash-shaytaana lil-insaani 'aduwwun mubiin",
        translation: "Albatta, shayton inson uchun aniq dushmandur",
        tafsir: "Shaytonning insonga ochiq dushmanligi haqida ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "وَكَذَٰلِكَ يَجْتَبِيكَ رَبُّكَ وَيُعَلِّمُكَ مِن تَأْوِيلِ ٱلْأَحَادِيثِ",
        transcription: "Wa kadhalika yajtabiika rabbuka wa yu'allimuka min ta'wiil al-ahaadith",
        translation: "Shuning uchun Robbing seni tanlab oladi va tushlar ta'biridan o'rgatadi",
        tafsir: "Allohning Yusufni tanlashi va unga bilim berishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَيُتِمُّ نِعْمَتَهُۥ عَلَيْكَ وَعَلَىٰٓ ءَالِ يَعْقُوبَ",
        transcription: "Wa yutimmu ni'matahu 'alayka wa 'alaa aali Ya'quub",
        translation: "Va senga va Ya'qub oilasiga ne'matini to'ldirib beradi",
        tafsir: "Allohning payg'ambarlar oilasiga ne'matini to'ldirishi haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "قَالُوا يَٰٓأَبَانَا مَا لَكَ لَا تَأْمَ۫نَّا عَلَىٰ يُوسُفَ وَإِنَّا لَهُۥ لَنَٰصِحُونَ",
          transcription: "Qaaluu yaa abaanaa maa laka laa ta'mannaa 'alaa Yusufa wa innaa lahu lanaasihuuna",
          translation: "Ular: 'Ey otamiz! Nima uchun Yusufni bizga ishonib topshirmaysiz? Biz albatta unga xayrixohlar-ku', deydilar",
          tafsir: "Aka-ukalarning Yusufni olish uchun otalariga murojaat qilishlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "أَرْسِلْهُ مَعَنَا غَدًۭا يَرْتَعْ وَيَلْعَبْ وَإِنَّا لَهُۥ لَحَٰفِظُونَ",
          transcription: "Arsilhu ma'anaa ghadan yarta' wa yal'ab wa innaa lahu lahaafizhuuna",
          translation: "Ertaga uni biz bilan jo'nat, sayr qilib o'ynasin. Albatta, biz uni asrab-avaylaymiz",
          tafsir: "Aka-ukalarning Yusufni sayrga olib chiqish uchun va'dalari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "قَالَ إِنِّى لَيَحْزُنُنِىٓ أَن تَذْهَبُوا بِهِۦ وَأَخَافُ أَن يَأْكُلَهُ ٱلذِّئْبُ وَأَنتُمْ عَنْهُ غَٰفِلُونَ",
          transcription: "Qaala innii layahzununii an tadhhabuu bihi wa akhaafu an ya'kulahu adh-dhi'bu wa antum 'anhu ghaafiluuna",
          translation: "U: 'Uni olib ketishingiz meni xafa qiladi. Sizlar undan g'ofil bo'lganingizda uni bo'ri yeb qo'yishidan qo'rqaman', dedi",
          tafsir: "Ya'qub alayhissalomning Yusufni jo'natishdan xavotiri.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "قَالُوا لَئِنْ أَكَلَهُ ٱلذِّئْبُ وَنَحْنُ عُصْبَةٌ إِنَّآ إِذًۭا لَّخَٰسِرُونَ",
          transcription: "Qaaluu la'in akalahu adh-dhi'bu wa nahnu 'usbatun innaa idhan lakhasiruuna",
          translation: "Ular: 'Agar biz shuncha guruh bo'lib turib, uni bo'ri yeb qo'ysa, biz albatta ziyon ko'rgan bo'lamiz', deydilar",
          tafsir: "Aka-ukalarning Yusufni himoya qilish haqidagi qasami.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "فَلَمَّا ذَهَبُوا بِهِۦ وَأَجْمَعُوٓا أَن يَجْعَلُوهُ فِى غَيَٰبَتِ ٱلْجُبِّ ۚ وَأَوْحَيْنَآ إِلَيْهِ لَتُنَبِّئَنَّهُم بِأَمْرِهِمْ هَٰذَا وَهُمْ لَا يَشْعُرُونَ",
          transcription: "Falammaa dhahabuu bihi wa ajma'uu an yaj'aluuhu fii ghayaabati al-jubbi wa awhaynaa ilayhi latunabi'annahum bi'amrihim haadhaa wa hum laa yash'uruuna",
          translation: "Uni olib ketib, quduqning tubiga tashlashga kelishgach, Biz unga: 'Albatta, sen ularga bu ishlarini ular sezmagay bir kunda xabar berasan', deb vahiy qildik",
          tafsir: "Yusufning quduqqa tashlanishi va Allohdan unga vahiy kelishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "وَجَآءُوٓ أَبَاهُمْ عِشَآءًۭ يَبْكُونَ",
          transcription: "Wa jaa'uu abaahum 'ishaa'an yabkuuna",
          translation: "Ular kechqurun otalariga yig'lab keldilar",
          tafsir: "Aka-ukalarning soxta yig'i bilan qaytishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "قَالُوا يَٰٓأَبَانَآ إِنَّا ذَهَبْنَا نَسْتَبِقُ وَتَرَكْنَا يُوسُفَ عِندَ مَتَٰعِنَا فَأَكَلَهُ ٱلذِّئْبُ ۖ وَمَآ أَنتَ بِمُؤْمِنٍۢ لَّنَا وَلَوْ كُنَّا صَٰدِقِينَ",
          transcription: "Qaaluu yaa abaanaa innaa dhahabnaa nastabiqu wa taraknaa Yusufa 'inda mataa'inaa fa'akalahu adh-dhi'bu wa maa anta bimu'minin lanaa wa law kunnaa saadiqiina",
          translation: "Ular: 'Ey otamiz! Biz poygaga ketib, Yusufni buyumlarimiz oldida qoldirgandik, uni bo'ri yeb qo'yibdi. Rost gapirsak ham, sen bizga ishonmaysan', deydilar",
          tafsir: "Aka-ukalarning yolg'on hikoyasi va ularning o'zlarini oqlashi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَجَآءُو عَلَىٰ قَمِيصِهِۦ بِدَمٍۢ كَذِبٍۢ ۚ قَالَ بَلْ سَوَّلَتْ لَكُمْ أَنفُسُكُمْ أَمْرًۭا ۖ فَصَبْرٌۭ جَمِيلٌۭ ۖ وَٱللَّهُ ٱلْمُسْتَعَانُ عَلَىٰ مَا تَصِفُونَ",
          transcription: "Wa jaa'uu 'alaa qamiisihi bidamin kadhibin qaala bal sawwalat lakum anfusukum amran fasabrun jamiilun wallaahu al-musta'aanu 'alaa maa tasiifuuna",
          translation: "Ular uning ko'ylagiga yolg'on qon to'kib keldilar. U: 'Yo'q, nafslaringiz sizlarga bir ishni chiroyli ko'rsatdi. Endi chiroyli sabr qilaman. Sizlar aytayotgan narsaga qarshi Allohdan yordam so'rayman', dedi",
          tafsir: "Ya'qubning farzandlari yolg'onini sezishi va sabr qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَجَآءَتْ سَيَّارَةٌۭ فَأَرْسَلُوا وَارِدَهُمْ فَأَدْلَىٰ دَلْوَهُۥ ۖ قَالَ يَٰبُشْرَىٰ هَٰذَا غُلَٰمٌۭ ۚ وَأَسَرُّوهُ بِضَٰعَةًۭ ۚ وَٱللَّهُ عَلِيمٌۢ بِمَا يَعْمَلُونَ",
          transcription: "Wa jaa'at sayyaaratun fa'arsaluu waaridahum fa'adlaa dalwahu qaala yaa bushraa haadhaa ghulaamun wa asarruuhu bidaa'atan wallaahu 'aliimun bimaa ya'maluuna",
          translation: "Bir karvon kelib, suv oluvchisini jo'natdi. U chelakni tushirdi va: 'Ey xushxabar! Bu bir bola-ku!' dedi. Uni mol sifatida yashirdilar. Alloh ular qilayotgan ishdan xabardordir",
          tafsir: "Yusufning quduqdan topilishi va karvonchilar tomonidan yashirilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "وَشَرَوْهُ بِثَمَنٍۭ بَخْسٍۢ دَرَٰهِمَ مَعْدُودَةٍۢ وَكَانُوا فِيهِ مِنَ ٱلزَّٰهِدِينَ",
          transcription: "Wa sharawhu bithamanin bakhsin daraahima ma'duudatin wa kaanuu fiihi mina az-zaahidiina",
          translation: "Uni arzimagan bahoga – sanoqli dirhamlarga sotdilar. Ular undan voz kechuvchi edilar",
          tafsir: "Yusufning kam pulga sotilishi va uning qadri bilinmasligi.",
          copySymbol: "📋"
      }
    ]
  },
  // Ar-Ra'd surasi
  {
    id: 13,
    name: "Ar-Ra'd",
    arabicName: "الرعد",
    meaning: "Momaqaldiroq",
    ayahCount: 43,
    place: "Madina",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "المر ۚ تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ۗ وَٱلَّذِىٓ أُنزِلَ إِلَيْكَ مِن رَّبِّكَ ٱلْحَقُّ",
        transcription: "Alif Laam Miim Raa, tilka aayaatu al-kitaab walladhiy unzila ilayka min rabbika al-haqq",
        translation: "Alif, Laam, Miim, Raa. Mana Kitobning oyatlari va senga Robbingdan nozil qilingan narsa haqdir",
        tafsir: "Qur'onning haq kitob ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "وَلَٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يُؤْمِنُونَ",
        transcription: "Walakinna akthara an-naasi laa yu'minuun",
        translation: "Lekin ko'pchilik odamlar iymon keltirmaydilar",
        tafsir: "Ko'p odamlarning haqqa qarshi turishi haqida afsuslash.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "ٱللَّهُ ٱلَّذِى رَفَعَ ٱلسَّمَٰوَٰتِ بِغَيْرِ عَمَدٍ تَرَوْنَهَا",
        transcription: "Allahu alladhiy rafa'a as-samaawaati bi-ghayri 'amadin tarawnahaa",
        translation: "Alloh osmonlarni ko'radigan ustunlarsiz ko'tardi",
        tafsir: "Allohning osmon yaratishdagi mo'jizaviy qudrati haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "ثُمَّ ٱسْتَوَىٰ عَلَى ٱلْعَرْشِ ۖ وَسَخَّرَ ٱلشَّمْسَ وَٱلْقَمَرَ",
        transcription: "Thumma istawaa 'ala al-'arshi wa sakhkhara ash-shamsa wal-qamara",
        translation: "So'ngra Arshga mustawi bo'ldi va quyosh bilan oyni bo'ysundirdi",
        tafsir: "Allohning Arsh ustidagi hukmronligi va osmon jismlarini boshqarishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "كُلٌّ يَجْرِى لِأَجَلٍ مُّسَمًّى ۗ يُدَبِّرُ ٱلْأَمْرَ",
        transcription: "Kullun yajrii li-ajalin musamman, yudabbiru al-amra",
        translation: "Har biri belgilangan muddatgacha harakat qiladi, U ishlarni boshqaradi",
        tafsir: "Osmon jismlarining tartibli harakati va Allohning boshqaruvi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "يُفَصِّلُ ٱلْءَايَٰتِ لَعَلَّكُم بِلِقَآءِ رَبِّكُمْ تُوقِنُونَ",
        transcription: "Yufassilu al-aayaati la'allakum biliqa'i rabbikum tuuqinuun",
        translation: "Oyatlarni tafsillab bayonlaydi, shoyad Robbingiz bilan uchrashishga iymonlaringiz komil bo'lsa",
        tafsir: "Qur'on oyatlarining maqsadi va oxiratga iymon haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "وَهُوَ ٱلَّذِى مَدَّ ٱلْأَرْضَ وَجَعَلَ فِيهَا رَوَٰسِىَ وَأَنْهَٰرًا",
        transcription: "Wa huwa alladhiy madda al-arda wa ja'ala fiihaa rawaasiya wa anhaaraa",
        translation: "U yerni yoyib, unda tog'lar va daryolar yaratdi",
        tafsir: "Allohning yer yuzini yaratishi va uni yashanadigan qilishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "وَمِن كُلِّ ٱلثَّمَرَٰتِ جَعَلَ فِيهَا زَوْجَيْنِ ٱثْنَيْنِ",
        transcription: "Wa min kulli ath-thamaraati ja'ala fiihaa zawjayni ithnayn",
        translation: "Barcha mevalardan unda ikkitadan juft yaratdi",
        tafsir: "Allohning barcha narsalarni juft-juft yaratishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "يُغْشِى ٱلَّيْلَ ٱلنَّهَارَ ۚ إِنَّ فِى ذَٰلِكَ لَءَايَٰتٍ لِّقَوْمٍ يَتَفَكَّرُونَ",
        transcription: "Yughshiy al-layla an-nahaar, inna fiy dhaalika la-aayaatin li-qawmin yatafakkaruun",
        translation: "Kechani kunduzga o'rab beradi, bunda fikr qiladigan qavmlar uchun oyatlar bor",
        tafsir: "Kecha-kunduzning almashishida ibratlar borligini ta'kidlash.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَفِى ٱلْأَرْضِ قِطَعٌ مُّتَجَٰوِرَٰتٌ وَجَنَّٰتٌ مِّنْ أَعْنَٰبٍ",
        transcription: "Wa fil-ardi qita'un mutajaawiraatun wa jannaatun min a'naab",
        translation: "Yerda bir-biriga yaqin bo'laklar va uzum bog'lari bor",
        tafsir: "Yer yuzidagi turli xil hududlar va o'simliklar haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "لَهُۥ مُعَقِّبَٰتٌۭ مِّنۢ بَيْنِ يَدَيْهِ وَمِنْ خَلْفِهِۦ يَحْفَظُونَهُۥ مِنْ أَمْرِ ٱللَّهِ ۗ إِنَّ ٱللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ ۗ وَإِذَآ أَرَادَ ٱللَّهُ بِقَوْمٍۢ سُوٓءًۭا فَلَا مَرَدَّ لَهُۥ ۚ وَمَا لَهُم مِّن دُونِهِۦ مِن وَالٍ",
          transcription: "Lahu mu'aqqibaatun min bayni yadayhi wa min khalfihi yahfazhuunahu min amri allaahi inna allaaha laa yughayyiru maa biqawmin hattaa yughayyiruu maa bi'anfusihim wa idhaa araada allaahu biqawmin suu'an falaa maradda lahu wa maa lahum min duunihi min waalin",
          translation: "Uning oldi va orqasidan navbatma-navbat keluvchi (farishtalar) bor, ular uni Allohning amri bilan saqlaydilar. Albatta, Alloh bir qavmning ahvolini o'zgartirmaydi, toki ular o'zlari o'zlaridagi narsani o'zgartirmaguncha. Alloh bir qavmga yomonlik iroda qilsa, uni qaytarib bo'lmaydi. Ular uchun Undan o'zga himoyachi yo'q",
          tafsir: "Alloh qavmlarning ahvolini ular o'zlarini o'zgartirmaguncha o'zgartirmasligi haqidagi muhim qoida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "هُوَ ٱلَّذِى يُرِيكُمُ ٱلْبَرْقَ خَوْفًۭا وَطَمَعًۭا وَيُنشِئُ ٱلسَّحَابَ ٱلثِّقَالَ",
          transcription: "Huwa alladhii yuriikumu al-barqa khawfan wa tama'an wa yunshi'u as-sahaaba ath-thiqaala",
          translation: "U sizlarga chaqmoqni qo'rquv va umid uchun ko'rsatadi va og'ir bulutlarni paydo qiladi",
          tafsir: "Allohning qudratidan chaqmoq va bulutlarning yaratilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَيُسَبِّحُ ٱلرَّعْدُ بِحَمْدِهِۦ وَٱلْمَلَٰٓئِكَةُ مِنْ خِيفَتِهِۦ وَيُرْسِلُ ٱلصَّوَٰعِقَ فَيُصِيبُ بِهَا مَن يَشَآءُ وَهُمْ يُجَٰدِلُونَ فِى ٱللَّهِ وَهُوَ شَدِيدُ ٱلْمِحَالِ",
          transcription: "Wa yusabbihu ar-ra'du bihamdihi wal-malaa'ikatu min khiifatihi wa yursilu as-sawaa'iqa fayusiibu bihaa man yashaa'u wa hum yujadiluuna fii allaahi wa huwa shadiidu al-mihaali",
          translation: "Momaqaldiroq Uni hamd bilan tasbeh aytadi, farishtalar ham Undan qo'rqib. U yashinlarni yuborib, xohlagan kishiga uradi. Ular esa Alloh haqida tortishadilar. Holbuki, U qudrati zo'rdir",
          tafsir: "Tabiatning Allohni ulug'lashi va Uning qudratining namoyon bo'lishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "لَهُۥ دَعْوَةُ ٱلْحَقِّ ۖ وَٱلَّذِينَ يَدْعُونَ مِن دُونِهِۦ لَا يَسْتَجِيبُونَ لَهُم بِشَىْءٍ إِلَّا كَبَٰسِطِ كَفَّيْهِ إِلَى ٱلْمَآءِ لِيَبْلُغَ فَاهُ وَمَا هُوَ بِبَٰلِغِهِۦ ۚ وَمَا دُعَآءُ ٱلْكَٰفِرِينَ إِلَّا فِى ضَلَٰلٍۢ",
          transcription: "Lahu da'watu al-haqqi walladhiina yad'uuna min duunihi laa yastajiibuuna lahum bishay'in illaa kabaasiti kaffayhi ilaa al-maa'i liyablugha faahu wa maa huwa bibaalighihi wa maa du'aa'u al-kaafiriina illaa fii dalaalin",
          translation: "Haq da'vat Ungadir. Undan o'zgalarga iltijo qilganlarning duolari ijobat bo'lmaydi, faqat suvga ikki qo'lini yoyib, og'ziga yetishini kutgan kishi kabi. Holbuki, u yetmaydi. Kofirlarning duosi faqat zalolatdadir",
          tafsir: "Faqat Allohga qilingan duoning haq ekanligi va boshqalarga qilingan duolarning befoydaligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "وَلِلَّهِ يَسْجُدُ مَن فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ طَوْعًۭا وَكَرْهًۭا وَظِلَٰلُهُم بِٱلْغُدُوِّ وَٱلْءَاصَالِ",
          transcription: "Walillaahi yasjudu man fii as-samaawaati wal-ardi taw'an wa karhan wa zhilaaluhum bilghuduwwi wal-aasaali",
          translation: "Osmonlaru yerdagi kimsa xoh, noxoh Allohga sajda qiladi, ularning soyalari ham ertalab va kechqurun",
          tafsir: "Barcha maxluqotlarning Allohga bo'ysunishi va sajda qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "قُلْ مَن رَّبُّ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ قُلِ ٱللَّهُ ۚ قُلْ أَفَٱتَّخَذْتُم مِّن دُونِهِۦٓ أَوْلِيَآءَ لَا يَمْلِكُونَ لِأَنفُسِهِمْ نَفْعًۭا وَلَا ضَرًّۭا ۚ قُلْ هَلْ يَسْتَوِى ٱلْأَعْمَىٰ وَٱلْبَصِيرُ أَمْ هَلْ تَسْتَوِى ٱلظُّلُمَٰتُ وَٱلنُّورُ ۗ أَمْ جَعَلُوا لِلَّهِ شُرَكَآءَ خَلَقُوا كَخَلْقِهِۦ فَتَشَٰبَهَ ٱلْخَلْقُ عَلَيْهِمْ ۚ قُلِ ٱللَّهُ خَٰلِقُ كُلِّ شَىْءٍۢ وَهُوَ ٱلْوَٰحِدُ ٱلْقَهَّٰرُ",
          transcription: "Qul man rabbu as-samaawaati wal-ardi quli allaahu qul afaattakhadhtum min duunihi awliyaa'a laa yamlikuuna li'anfusihim naf'an wa laa darran qul hal yastawii al-a'maa wal-basiiru am hal tastawii azh-zhulumaatu wan-nuuru am ja'aluu lillaahi shurakaa'a khalaquu kakhalqihi fatashaabaha al-khalqu 'alayhim quli allaahu khaaliqu kulli shay'in wa huwa al-waahidu al-qahhaaru",
          translation: "Ayt: 'Osmonlaru yerning Rabbi kim?' Ayt: 'Alloh'. Ayt: 'Undan o'zga o'zlariga na foyda, na zarar bera olmaydigan do'stlar tutdingizmi?' Ayt: 'Ko'r bilan ko'ruvchi barobarmi yoki zulmatlar bilan nur barobarmi?' Yoki Allohga Uning yaratganidek yaratgan sheriklarni qildilarmi, yaratish ularga o'xshash bo'ldimi? Ayt: 'Alloh har narsaning yaratuvchisidir va U yagona, qahhordir'",
          tafsir: "Allohning yagona yaratuvchi ekanligi va Unga sherik qo'shishning mantiqsizligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "أَنزَلَ مِنَ ٱلسَّمَآءِ مَآءًۭ فَسَالَتْ أَوْدِيَةٌۢ بِقَدَرِهَا فَٱحْتَمَلَ ٱلسَّيْلُ زَبَدًۭا رَّابِيًۭا ۖ وَمِمَّا يُوقِدُونَ عَلَيْهِ فِى ٱلنَّارِ ٱبْتِغَآءَ حِلْيَةٍ أَوْ مَتَٰعٍۢ زَبَدٌۭ مِّثْلُهُۥ ۚ كَذَٰلِكَ يَضْرِبُ ٱللَّهُ ٱلْحَقَّ وَٱلْبَٰطِلَ ۚ فَأَمَّا ٱلزَّبَدُ فَيَذْهَبُ جُفَآءًۭ ۖ وَأَمَّا مَا يَنفَعُ ٱلنَّاسَ فَيَمْكُثُ فِى ٱلْأَرْضِ ۚ كَذَٰلِكَ يَضْرِبُ ٱللَّهُ ٱلْأَمْثَالَ",
          transcription: "Anzala mina as-samaa'i maa'an fasaalat awdiyatun biqadarihaa fahtamala as-saylu zabadan raabiyan wa mimmaa yuuqiduuna 'alayhi fii an-naari ibtighaa'a hilyatin aw mataa'in zabadun mithluhu kadhaalika yadribu allaahu al-haqqa wal-baatila fa'ammaa az-zabadu fayadhhabu jufaa'an wa ammaa maa yanfa'u an-naasa fayamkuthu fii al-ardi kadhaalika yadribu allaahu al-amthaala",
          translation: "U osmondan suv tushirdi, vodilar o'z miqdoricha oqdi. Sel ko'pikli ko'puk ko'tardi. Ziynat yoki buyum istab, olovda eritadigan narsalardan ham shunday ko'pik chiqadi. Alloh haq va botilga shunday misol keltiradi. Ko'pik behuda ketadi, odamlarga foyda beradigan narsa esa yerda qoladi. Alloh shunday misollar keltiradi",
          tafsir: "Haq va botilning farqini ko'rsatuvchi go'zal misol.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "لِلَّذِينَ ٱسْتَجَابُوا لِرَبِّهِمُ ٱلْحُسْنَىٰ ۚ وَٱلَّذِينَ لَمْ يَسْتَجِيبُوا لَهُۥ لَوْ أَنَّ لَهُم مَّا فِى ٱلْأَرْضِ جَمِيعًۭا وَمِثْلَهُۥ مَعَهُۥ لَٱفْتَدَوْا بِهِۦٓ ۚ أُو۟لَٰٓئِكَ لَهُمْ سُوٓءُ ٱلْحِسَابِ وَمَأْوَىٰهُمْ جَهَنَّمُ ۖ وَبِئْسَ ٱلْمِهَادُ",
          transcription: "Lilladhiina istajaabuu lirabbihimu al-husnaa walladhiina lam yastajiibu lahu law anna lahum maa fii al-ardi jamii'an wa mithlahu ma'ahu laftadaw bihi ulaa'ika lahum suu'u al-hisaabi wa ma'waahum jahannamu wa bi'sa al-mihaadu",
          translation: "Rabblariga javob berganlar uchun go'zal mukofot bor. Unga javob bermaganlar esa, agar ularga yerdagi hamma narsa va yana shuncha bo'lsa ham, albatta fidya qilib bergan bo'lur edilar. Ular uchun yomon hisob bor, joylari jahannamdir. U qanday yomon joydir!",
          tafsir: "Allohga itoat qilganlar va qilmaganlarning oqibatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "أَفَمَن يَعْلَمُ أَنَّمَآ أُنزِلَ إِلَيْكَ مِن رَّبِّكَ ٱلْحَقُّ كَمَنْ هُوَ أَعْمَىٰٓ ۚ إِنَّمَا يَتَذَكَّرُ أُو۟لُوا ٱلْأَلْبَٰبِ",
          transcription: "Afaman ya'lamu annamaa unzila ilayka min rabbika al-haqqu kaman huwa a'maa innamaa yatadhakkaru uluu al-albaabi",
          translation: "Senga Rabbingdan nozil qilingan narsa haq ekanini bilgan kishi ko'r kishi bilan barobarmi? Faqat aql egalari esga oladilar",
          tafsir: "Haqni bilganlar bilan ko'rlarning farqi va aql egalarining fazilati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "ٱلَّذِينَ يُوفُونَ بِعَهْدِ ٱللَّهِ وَلَا يَنقُضُونَ ٱلْمِيثَٰقَ",
          transcription: "Alladhiina yuufuuna bi'ahdi allaahi wa laa yanquduuna al-miithaaqa",
          translation: "Ular Allohning ahdiga vafо qiladilar va misoqni buzmaydilаr",
          tafsir: "Mo'minlarning Alloh bilan qilgan ahdlariga sodiq qolishlari.",
          copySymbol: "📋"
      }
    ]
  },
  // Ibrahim surasi
  {
    id: 14,
    name: "Ibrahim",
    arabicName: "إبراهيم",
    meaning: "Ibrahim payg'ambar",
    ayahCount: 52,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "الر ۚ كِتَٰبٌ أَنزَلْنَٰهُ إِلَيْكَ لِتُخْرِجَ ٱلنَّاسَ مِنَ ٱلظُّلُمَٰتِ إِلَى ٱلنُّورِ",
        transcription: "Alif Laam Raa, kitaabun anzalnaahu ilayka litukhrija an-naasa mina az-zulumaati ila an-nuur",
        translation: "Alif, Laam, Raa. Bu Kitob - Biz uni senga odamlarni zulmatlardan nurga chiqarishing uchun nozil qildik",
        tafsir: "Qur'an'ni n odamlarni yo'ldan ozdiruvchi zulmatlardan hidoyat nuriga chiqarish vazifasi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "بِإِذْنِ رَبِّهِمْ إِلَىٰ صِرَٰطِ ٱلْعَزِيزِ ٱلْحَمِيدِ",
        transcription: "Bi-idhni rabbihim ilaa siraati al-'aziiz al-hamiid",
        translation: "Robblarining izni bilan aziz va maqtalgan Zotning yo'liga",
        tafsir: "Hidoyat faqat Allohning izni bilan sodir bo'lishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "ٱللَّهِ ٱلَّذِى لَهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
        transcription: "Allahi alladhiy lahu maa fis-samaawaati wa maa fil-ard",
        translation: "Alloh - Uniki osmonlarda va yerdagi barcha narsalar",
        tafsir: "Allohning osmon va yer egasi ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "وَوَيْلٌ لِّلْكَٰفِرِينَ مِنْ عَذَابٍ شَدِيدٍ",
        transcription: "Wa waylun lilkaafiriina min 'adhaabin shadiid",
        translation: "Kofirlar uchun qattiq azob bor",
        tafsir: "Iymon keltirmaganlarga azob va'dasi bor.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "ٱلَّذِينَ يَسْتَحِبُّونَ ٱلْحَيَوٰةَ ٱلدُّنْيَا عَلَى ٱلْآخِرَةِ",
        transcription: "Alladhiina yastahibbuuna al-hayaatad-dunya 'ala al-aakhirah",
        translation: "Ular dunyo hayotini oxiratdan afzal ko'radilar",
        tafsir: "Dunyoviy manfaatlarni oxiratdan ustun qo'yish noto'g'riligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَيَصُدُّونَ عَن سَبِيلِ ٱللَّهِ وَيَبْغُونَهَا عِوَجًا",
        transcription: "Wa yasudduuna 'an sabiilillahi wa yabghuunahaa 'iwajan",
        translation: "Ular Alloh yo'lidan to'sadilar va uni egri qilishga urinadilar",
        tafsir: "Kofirlarning Alloh yo'lidan to'sishi va haqiqatni buzib ko'rsatishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "أُو۟لَٰٓئِكَ فِى ضَلَٰلٍۢ بَعِيدٍ",
        transcription: "Ulaa'ika fii dhalaalin ba'iid",
        translation: "Ular uzoq zalolatdadirlar",
        tafsir: "Haqqdan uzoqlashganlar og'ir zalolat ichidadir.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "وَمَآ أَرْسَلْنَا مِن رَّسُولٍ إِلَّا بِلِسَانِ قَوْمِهِۦ",
        transcription: "Wa maa arsalnaa min rasuulin illaa bilisaani qawmih",
        translation: "Biz har bir rasulni o'z qavmining tilida yuborganmiz",
        tafsir: "Payg'ambarlar o'z xalqining tili bilan yuborilganlar.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "لِيُبَيِّنَ لَهُمْ فَيُضِلُّ ٱللَّهُ مَن يَشَآءُ وَيَهْدِى مَن يَشَآءُ",
        transcription: "Liyubayyina lahum fayudillu Allahu man yashaa'u wa yahdii man yashaa'u",
        translation: "Ular uchun bayon qilsin deb. Alloh xohlaganini adashtiradi, xohlaganini hidoyat qiladi",
        tafsir: "Hidoyat va zalolat Allohning irodasi bilan bo'ladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَهُوَ ٱلْعَزِيزُ ٱلْحَكِيمُ",
        transcription: "Wa huwa al-'aziiz al-hakiim",
        translation: "U aziz va hikmat egasidir",
        tafsir: "Allohning qudratli va hikmatli ekanligi haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "قَالَتْ لَهُمْ رُسُلُهُمْ إِن نَّحْنُ إِلَّا بَشَرٌۭ مِّثْلُكُمْ وَلَٰكِنَّ ٱللَّهَ يَمُنُّ عَلَىٰ مَن يَشَآءُ مِنْ عِبَادِهِۦ ۖ وَمَا كَانَ لَنَآ أَن نَّأْتِيَكُم بِسُلْطَٰنٍ إِلَّا بِإِذْنِ ٱللَّهِ ۚ وَعَلَى ٱللَّهِ فَلْيَتَوَكَّلِ ٱلْمُؤْمِنُونَ",
          transcription: "Qaalat lahum rusuluhum in nahnu illaa basharun mithlukum walaakinna allaaha yamunnu 'alaa man yashaa'u min 'ibaadihi wa maa kaana lanaa an na'tiyakum bisultaanin illaa bi'idhni allaahi wa 'alaa allaahi falyatawakkali al-mu'minuuna",
          translation: "Rasullari ularga: 'Biz sizlar kabi odamlarmiz, lekin Alloh bandalaridan xohlaganiga minnat qiladi. Bizga Allohning iznisiz sizlarga dalil keltirish mumkin emas. Mo'minlar Allohgagina tayansinlar', dedilar",
          tafsir: "Payg'ambarlarning ham oddiy insonlar ekanligi, lekin Alloh tomonidan tanlanishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "وَمَا لَنَآ أَلَّا نَتَوَكَّلَ عَلَى ٱللَّهِ وَقَدْ هَدَىٰنَا سُبُلَنَا ۚ وَلَنَصْبِرَنَّ عَلَىٰ مَآ ءَاذَيْتُمُونَا ۚ وَعَلَى ٱللَّهِ فَلْيَتَوَكَّلِ ٱلْمُتَوَكِّلُونَ",
          transcription: "Wa maa lanaa allaa natawakkala 'alaa allaahi wa qad hadaanaa subulanaa walanasbiranna 'alaa maa aadhaytumunaa wa 'alaa allaahi falyatawakkali al-mutawakkiluuna",
          translation: "Nega Allohga tayanmaymiz? U bizga yo'llarimizni ko'rsatdi. Bizlarni ozor berganlaringizga albatta sabr qilamiz. Tayanuvchilar Allohgagina tayansinlar",
          tafsir: "Payg'ambarlarning Allohga tayanishi va aziyet-uqubatlarga sabr qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَقَالَ ٱلَّذِينَ كَفَرُوا لِرُسُلِهِمْ لَنُخْرِجَنَّكُم مِّنْ أَرْضِنَآ أَوْ لَتَعُودُنَّ فِى مِلَّتِنَا ۖ فَأَوْحَىٰٓ إِلَيْهِمْ رَبُّهُمْ لَنُهْلِكَنَّ ٱلظَّٰلِمِينَ",
          transcription: "Wa qaala alladhiina kafaruu lirusulihim lanukhrijannakum min ardinaa aw lata'uudunna fii millatinaa fa'awhaa ilayhim rabbuhum lanuhlikanna azh-zhaalimiina",
          translation: "Kofirlar o'z rasullariga: 'Albatta sizlarni yerimizdan chiqaramiz yoki dinimizga qaytasizlar', dedilar. Shunda Rabblari ularga: 'Albatta, zolimlarni halok qilamiz', deb vahiy qildi",
          tafsir: "Kofirlarning payg'ambarlarga tahdidi va Allohning zolimlarni halok qilish va'dasi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "وَلَنُسْكِنَنَّكُمُ ٱلْأَرْضَ مِنۢ بَعْدِهِمْ ۚ ذَٰلِكَ لِمَنْ خَافَ مَقَامِى وَخَافَ وَعِيدِ",
          transcription: "Walanuskinannakumu al-arda min ba'dihim dhaalika liman khaafa maqaamii wa khaafa wa'iidi",
          translation: "Va ulardan keyin sizlarni o'sha yerda yashatamiz. Bu Mening maqomimdan va tahdidimdan qo'rqqanlar uchundir",
          tafsir: "Mo'minlarning g'alabasi va ularning zolimlar o'rnini egallashi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "وَٱسْتَفْتَحُوا وَخَابَ كُلُّ جَبَّارٍ عَنِيدٍۢ",
          transcription: "Wastaftahuu wa khaaba kullu jabbaarin 'aniidin",
          translation: "Ular fath so'radilar va har bir qaysar johil noumid bo'ldi",
          tafsir: "Payg'ambarlarning g'alaba so'rashi va kibrli zolimlarning mag'lubiyati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "مِّن وَرَآئِهِۦ جَهَنَّمُ وَيُسْقَىٰ مِن مَّآءٍۢ صَدِيدٍۢ",
          transcription: "Min waraa'ihi jahannamu wa yusqaa min maa'in sadiidin",
          translation: "Uning orqasida jahannam bor va unga yiringli suv ichiriladilar",
          tafsir: "Kofirlarni kutayotgan jahannam azoblari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "يَتَجَرَّعُهُۥ وَلَا يَكَادُ يُسِيغُهُۥ وَيَأْتِيهِ ٱلْمَوْتُ مِن كُلِّ مَكَانٍۢ وَمَا هُوَ بِمَيِّتٍۢ ۖ وَمِن وَرَآئِهِۦ عَذَابٌ غَلِيظٌۭ",
          transcription: "Yatajarra'uhu wa laa yakaadu yusiighuhu wa ya'tiihi al-mawtu min kulli makaanin wa maa huwa bimayyitin wa min waraa'ihi 'adhaabun ghalizhun",
          translation: "Uni yutishga harakat qiladi, ammo deyarli yuta olmaydi. Unga har tomondan o'lim keladi, lekin u o'lmaydi. Uning orqasida yana qattiq azob bor",
          tafsir: "Jahannamda kofirlarning cheksiz azobda qolishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "مَّثَلُ ٱلَّذِينَ كَفَرُوا بِرَبِّهِمْ ۖ أَعْمَٰلُهُمْ كَرَمَادٍ ٱشْتَدَّتْ بِهِ ٱلرِّيحُ فِى يَوْمٍ عَاصِفٍۢ ۖ لَّا يَقْدِرُونَ مِمَّا كَسَبُوا عَلَىٰ شَىْءٍۢ ۚ ذَٰلِكَ هُوَ ٱلضَّلَٰلُ ٱلْبَعِيدُ",
          transcription: "Mathalu alladhiina kafaruu birabbihim a'maaluhum karamaadin ishtaddat bihi ar-riihu fii yawmin 'aasifin laa yaqdiruna mimmaa kasabuu 'alaa shay'in dhaalika huwa ad-dalaalu al-ba'iidu",
          translation: "Rabblariga kufr keltirganlarning misoli – ularning amallari bo'ronli kunda shamol uchirgan kulga o'xshaydi. Ular kasb qilgan narsalaridan hech narsaga qodir emas. Mana shu uzoq adashishdir",
          tafsir: "Kofirlar amallarining behuda bo'lishi va qiyomatda foydasizligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "أَلَمْ تَرَ أَنَّ ٱللَّهَ خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ بِٱلْحَقِّ ۚ إِن يَشَأْ يُذْهِبْكُمْ وَيَأْتِ بِخَلْقٍۢ جَدِيدٍۢ",
          transcription: "Alam tara anna allaaha khalaqa as-samaawaati wal-arda bilhaqqi in yasha' yudhibkum wa ya'ti bikhalqin jadiidin",
          translation: "Alloh osmonlaru yerni haq ila yaratganini ko'rmadingmi? Agar xohlasa, sizlarni ketkazib, yangi xalqni keltiradi",
          tafsir: "Allohning qudrati va insonlarni almashtirishga qodirligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "وَمَا ذَٰلِكَ عَلَى ٱللَّهِ بِعَزِيزٍ",
          transcription: "Wa maa dhaalika 'alaa allaahi bi'aziizin",
          translation: "Bu Alloh uchun qiyin emas",
          tafsir: "Alloh uchun hech narsa qiyin emasligi va Uning cheksiz qudrati.",
          copySymbol: "📋"
      }
    ]
  },
  // Al-Hijr surasi
  {
    id: 15,
    name: "Al-Hijr",
    arabicName: "الحجر",
    meaning: "Toshli vodiya",
    ayahCount: 99,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "الر ۚ تِلْكَ آيَاتُ ٱلْكِتَٰبِ وَقُرْآنٍۢ مُّبِينٍ",
        transcription: "Alif Laam Raa. Tilka aayaatu al-kitaabi wa qur'aanin mubiin",
        translation: "Alif, Laam, Raa. Bu Kitob va ravshan Qur’on oyatlaridir",
        tafsir: "Qur'onning aniq va ochiq bayonli Kitob ekanligi ta'kidlanadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "رُّبَمَا يَوَدُّ ٱلَّذِينَ كَفَرُوا۟ لَوْ كَانُوا۟ مُسْلِمِينَ",
        transcription: "Rubbamaa yawaddu alladhina kafaroo law kaanuu muslimiin",
        translation: "Kofirlar ko‘pincha musulmon bo‘lishni orzu qilurlar",
        tafsir: "Oxiratda kofirlar pushaymon bo‘lishlari haqida eslatiladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "ذَرْهُمْ يَأْكُلُوا۟ وَيَتَمَتَّعُوا۟ وَيُلْهِهِمُ ٱلْأَمَلُ ۖ",
        transcription: "Dharhum ya'kuluu wa yatamatta'uu wa yulhihimul-amal",
        translation: "Ularni qo‘y, yeb-ichsinlar, umidlar ularni chalg‘itsin",
        tafsir: "Dunyo quvonchlariga berilib oxiratni unutganlarning holati.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "وَمَآ أَهْلَكْنَا مِن قَرْيَةٍ إِلَّا وَلَهَا كِتَٰبٌ مَّعْلُومٌ",
        transcription: "Wa maa ahlaknaa min qaryatin illaa walahaa kitaabun ma'luum",
        translation: "Biz hech bir qishloqni ma’lum muddat kitobsiz halok qilgan emasmiz",
        tafsir: "Har bir halokat o‘z vaqti va sababi bilan keladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "مَّا تَسْبِقُ مِنْ أُمَّةٍ أَجَلَهَا وَمَا يَسْتَـْٔخِرُونَ",
        transcription: "Maa tasbiqu min ummatin ajalahaa wa maa yasta’khiruun",
        translation: "Hech bir ummat belgilangan ajalini oldinga sura olmaydi va kechiktira olmaydi",
        tafsir: "Har bir jamiyat uchun Alloh tomonidan belgilangan muddat mavjud.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَقَالُوا۟ يَٰٓأَيُّهَا ٱلَّذِى نُزِّلَ عَلَيْهِ ٱلذِّكْرُ إِنَّكَ لَمَجْنُونٌ",
        transcription: "Wa qaaluu yaa ayyuhalladhii nuzzila 'alayhi adh-dhikr innaka lamajnoon",
        translation: "Ular: “Ey unga zikr nozil qilingan, sen albatta jinnisen!” - dedilar",
        tafsir: "Payg‘ambarga qarshi kofirlarning haqoratli so‘zlari haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "لَّوْ مَا تَأْتِينَا بِٱلْمَلَٰٓئِكَةِ إِن كُنتَ مِنَ ٱلصَّٰدِقِينَ",
        transcription: "Law maa ta’tiinaa bil-malaa’ikati in kunta mina as-sadiqiin",
        translation: "Agar rostgo‘y bo‘lsang, bizga farishtalarni keltir!",
        tafsir: "Mo‘jiza talab qilgan kofirlarning asossiz da’volari haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "مَا نُنَزِّلُ ٱلْمَلَٰٓئِكَةَ إِلَّا بِٱلْحَقِّ وَمَا كَانُوٓا۟ إِذًا مُّنظَرِينَ",
        transcription: "Maa nunazzilu al-malaa’ikata illaa bil-haqq wa maa kaanuu idhan munzariin",
        translation: "Biz farishtalarni faqat Haq bilan tushiramiz. Ular kechiktirilmas",
        tafsir: "Mo‘jiza kelganda azob ham birga keladi — ogohlantirish.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "إِنَّا نَحْنُ نَزَّلْنَا ٱلذِّكْرَ وَإِنَّا لَهُۥ لَحَٰفِظُونَ",
        transcription: "Innaa nahnu nazzalna adh-dhikra wa innaa lahu lahaafizuun",
        translation: "Albatta, Biz Zikrni (Qur’onni) nozil qildik va albatta Biz uni asraymiz",
        tafsir: "Qur’onning Alloh tomonidan saqlanishi haqida muhim oyat.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "وَلَقَدْ أَرْسَلْنَا مِن قَبْلِكَ فِى شِيَعِ ٱلْأَوَّلِينَ",
        transcription: "Wa laqad arsalnaa min qablika fiy shiya'i al-awwaliin",
        translation: "Sizdan oldin ham Biz oldingi ummatlarga payg‘ambarlar yuborganmiz",
        tafsir: "Oldingi ummatlarga ham payg‘ambarlar yuborilgani haqida.",
        copySymbol: "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "وَمَا يَأْتِيهِم مِّن رَّسُولٍ إِلَّا كَانُوا بِهِۦ يَسْتَهْزِءُونَ",
          transcription: "Wa maa ya'tiihim min rasuulin illaa kaanuu bihi yastahzi'uuna",
          translation: "Ularga kelgan har bir rasulni masxara qilishgan edi",
          tafsir: "O'tgan ummatlarning payg'ambarlarni masxara qilish odati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "كَذَٰلِكَ نَسْلُكُهُۥ فِى قُلُوبِ ٱلْمُجْرِمِينَ",
          transcription: "Kadhaalika naslukuhu fii quluubi al-mujrimiina",
          translation: "Shunday qilib, Biz uni (masxara qilishni) jinoyatchilarning qalblariga kiritamiz",
          tafsir: "Jinoyatchilarning qalbiga kibrni kiritish va ularning haqni rad etishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "لَا يُؤْمِنُونَ بِهِۦ ۖ وَقَدْ خَلَتْ سُنَّةُ ٱلْأَوَّلِينَ",
          transcription: "Laa yu'minuuna bihi wa qad khalat sunnatu al-awwaliina",
          translation: "Ular unga iymon keltirmaydilar. Avvalgilarning sunnati o'tib ketdi",
          tafsir: "Kofirlarning iymon keltirmasligi va o'tgan ummatlarning taqdirlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "وَلَوْ فَتَحْنَا عَلَيْهِم بَابًۭا مِّنَ ٱلسَّمَآءِ فَظَلُّوا فِيهِ يَعْرُجُونَ",
          transcription: "Walaw fatahnaa 'alayhim baaban mina as-samaa'i fazhalluu fiihi ya'rujuuna",
          translation: "Agar ularga osmondan eshik ochsak va ular unda ko'tarila bersalar ham",
          tafsir: "Kofirlarning inadkorligi - hatto mo'jizalar ko'rsalar ham iymon keltirmasligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "لَقَالُوٓا إِنَّمَا سُكِّرَتْ أَبْصَٰرُنَا بَلْ نَحْنُ قَوْمٌۭ مَّسْحُورُونَ",
          transcription: "Laqaaluu innamaa sukkirat absaarunaa bal nahnu qawmun mashuuruuna",
          translation: "Albatta: 'Ko'zlarimiz bog'lanibdi, yo'q, biz sehr qilingan qavmmiz', der edilar",
          tafsir: "Kofirlarning mo'jizalarni inkor etish uchun turli bahonalar topishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "وَلَقَدْ جَعَلْنَا فِى ٱلسَّمَآءِ بُرُوجًۭا وَزَيَّنَّٰهَا لِلنَّٰظِرِينَ",
          transcription: "Walaqad ja'alnaa fii as-samaa'i buruujan wa zayyannhaahaa linnaazhiriina",
          translation: "Batahqiq, Biz osmonda burjlar qildik va uni qarash uchun zinatladdik",
          tafsir: "Osmonning go'zalligi va undagi burjlar (yulduz turkumlari) ning yaratilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "وَحَفِظْنَٰهَا مِن كُلِّ شَيْطَٰنٍۢ رَّجِيمٍ",
          transcription: "Wa hafizhnhaahaa min kulli shaytaanin rajiiimin",
          translation: "Va uni har bir la'natli shaytondan saqladik",
          tafsir: "Osmonning shaytonlardan himoyalanishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "إِلَّا مَنِ ٱسْتَرَقَ ٱلسَّمْعَ فَأَتْبَعَهُۥ شِهَابٌۭ مُّبِينٌۭ",
          transcription: "Illaa mani istaraqa as-sam'a fa'atba'ahu shihaabun mubiinun",
          translation: "Faqat o'g'rilab quloq solgan kimsa bundan mustasno, uni ochiq-oydin olov ta'qib qiladi",
          tafsir: "Shaytonlarning osmondagi xabarlarni eshitishga urinishi va ularning haydab chiqarilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَٱلْأَرْضَ مَدَدْنَٰهَا وَأَلْقَيْنَا فِيهَا رَوَٰسِىَ وَأَنۢبَتْنَا فِيهَا مِن كُلِّ شَىْءٍۢ مَّوْزُونٍۢ",
          transcription: "Wal-arda madadnaahaa wa alqaynaa fiihaa rawaasiya wa anbatnaa fiihaa min kulli shay'in mawzuunin",
          translation: "Yerni yoydik va unga mustahkam tog'lar tashladik, unda har xil o'lchovli narsalarni o'stirdik",
          tafsir: "Yerning yaratilishi, tog'larning o'rnatilishi va o'simliklarning muvozanatli o'sishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "وَجَعَلْنَا لَكُمْ فِيهَا مَعَٰيِشَ وَمَن لَّسْتُمْ لَهُۥ بِرَٰزِقِينَ",
          transcription: "Wa ja'alnaa lakum fiihaa ma'aayisha wa man lastum lahu biraaziqiina",
          translation: "Unda sizlar uchun va sizlar rizq bermaydigan kimsalar uchun tirikchilik vositalarini qildik",
          tafsir: "Allohning yerdagi barcha jonzotlar uchun rizq yaratishi.",
          copySymbol: "📋"
      }
    ]
  },
  // An-Nahl surasi
  {
    id: 16,
    name: "An-Nahl",
    arabicName: "النحل",
    meaning: "Asalarilar",
    ayahCount: 128,
    place: "Makka",
    prelude: {
      bismillah: {
        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        transcription: "Bismillahir-Rahmanir-Rahiim",
        translation: "Mehribon va rahmli Alloh nomi bilan",
        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        copySymbol: "📋"
      }
    },
    ayahs: [
      {
        numberArabic: "١",
        numberLatin: "1",
        arabic: "أَتَىٰٓ أَمْرُ ٱللَّهِ فَلَا تَسْتَعْجِلُوهُ",
        transcription: "Ata amrullahi fala tasta'jiluuhu",
        translation: "Allohning amri keldi, shuning uchun uni shoshiltmang",
        tafsir: "Allohning hukmi keldi, sabrli bo'ling.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢",
        numberLatin: "2",
        arabic: "يُنَزِّلُ ٱلْمَلَٰٓئِكَةَ بِٱلرُّوحِ مِنْ أَمْرِهِ عَلَىٰ مَن يَشَآءُ مِنْ عِبَادِهِ",
        transcription: "Yunazzilul malaaikata bir-ruuhi min amrihi 'alaa man yashaa'u min 'ibaadih",
        translation: "U farishtalarni ruh bilan, O'z amridan, bandalaridan istaganiga tushiradi",
        tafsir: "Wahiy faqat Alloh istagan bandalariga tushiriladi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٣",
        numberLatin: "3",
        arabic: "خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ بِٱلْحَقِّ",
        transcription: "Khalaqa as-samaawaati wal-arda bil-haqq",
        translation: "U osmonlar va yerni haq bilan yaratdi",
        tafsir: "Koinotning adolatli yaratilganligi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٤",
        numberLatin: "4",
        arabic: "خَلَقَ ٱلْإِنسَٰنَ مِن نُّطْفَةٍ فَإِذَا هُوَ خَصِيمٌ مُّبِينٌ",
        transcription: "Khalaqa al-insaana min nutfatin fa-idhaa huwa khasiimun mubiin",
        translation: "U insonni nutfadan yaratdi, bas, u (keyin) ochiq dushman bo‘lib qoladi",
        tafsir: "Insonning oddiy bir tomchidan yaratilishi va Allohga qarshi chiqishi haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٥",
        numberLatin: "5",
        arabic: "وَٱلْأَنْعَٰمَ خَلَقَهَا ۗ لَكُمْ فِيهَا دِفْءٌ وَمَنَٰفِعُ",
        transcription: "Wal-an’aama khalaqahaa lakum fiihaa dif’un wa manaafi’u",
        translation: "Va chorva hayvonlarini yaratdi, ularda siz uchun issiqlik va foydalar bor",
        tafsir: "Chorva hayvonlarining inson hayotidagi ahamiyati va foydasi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٦",
        numberLatin: "6",
        arabic: "وَمِنْهَا تَأْكُلُونَ",
        transcription: "Wa minhaa ta'kuluun",
        translation: "Va ulardan yeysizlar",
        tafsir: "Alloh hayvonlarni rizq qilib bergani haqida.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٧",
        numberLatin: "7",
        arabic: "وَلَكُمْ فِيهَا جَمَالٌ حِينَ تُرِيحُونَ وَحِينَ تَسْرَحُونَ",
        transcription: "Wa lakum fiihaa jamaalun hiina turiihuuna wa hiina tasrahuun",
        translation: "Ularda siz uchun go'zallik bor, yaylovdan kelganda va chiqqanda",
        tafsir: "Chorva hayvonlarining go'zalligi va foydalari.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٨",
        numberLatin: "8",
        arabic: "وَتَحْمِلُ أَثْقَالَكُمْ إِلَىٰ بَلَدٍ لَّمْ تَكُونُوا۟ بَٰلِغِيهِ إِلَّا بِشِقِّ ٱلْأَنفُسِ",
        transcription: "Wa tahmilu athqaalakum ilaa baladin lam takuunuu baalighiihi illaa bishiqil anfus",
        translation: "Ular yuklaringizni uzoq shaharlargacha olib boradilar, aks holda siz charchab qolardingiz",
        tafsir: "Chorvalarning tashishda yordamchiligi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٩",
        numberLatin: "9",
        arabic: "إِنَّ رَبَّكَ لَهُوَ ٱلْهَادِىٓ",
        transcription: "Inna rabbaka lahuwal haadii",
        translation: "Albatta, Robbing haqiqiy yo'l ko'rsatuvchidir",
        tafsir: "Hidoyat faqat Allohning ixtiyoridadir.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٠",
        numberLatin: "10",
        arabic: "هُوَ ٱلَّذِىٓ أَنزَلَ مِنَ ٱلسَّمَآءِ مَآءً لَّكُم",
        transcription: "Huwalladhiy anzala minas-samaa'i maaa'an lakum",
        translation: "U sizlarga osmondan suv tushirgan Zotdir",
        tafsir: "Yomg'ir va suv ne'matining Alloh tomonidan berilishi.",
        copySymbol: "📋"
      },
      {
      numberArabic: "١١",
      numberLatin: "11",
      arabic: "يُنبِتُ لَكُم بِهِ ٱلزَّرْعَ وَٱلزَّيْتُونَ وَٱلنَّخِيلَ وَٱلْأَعْنَـٰبَ وَمِن كُلِّ ٱلثَّمَرَٰتِ ۗ إِنَّ فِى ذَٰلِكَ لَءَايَةًۭ لِّقَوْمٍۢ يَتَفَكَّرُونَ",
      transcription: "Yunbitu lakum bihi az-zar‘a waz-zaytoona wan-nakheela wal-a‘naaba wa min kulli ath-thamaraat inna fii dhaalika la-aayatan liqawmin yatafakkaroon",
      translation: "U (yomg‘ir) bilan sizlar uchun ekinlar, zaytun, xurmo, uzum va har xil mevalarni o‘stiradi. Albatta, bunda tafakkur qiladigan qavm uchun alomatlar bordir.",
      tafsir: "Alloh yomg‘ir orqali rizq manbalarini o‘stiradi. Bu, tafakkur qiluvchilar uchun Uning qudrati va ne’matlarini anglatadi.",
      copySymbol: "📋"
    },
    {
      numberArabic: "١٢",
      numberLatin: "12",
      arabic: "وَسَخَّرَ لَكُمُ ٱلَّيْلَ وَٱلنَّهَارَ وَٱلشَّمْسَ وَٱلْقَمَرَ ۖ وَٱلنُّجُومُ مُسَخَّرَٰتٌۢ بِأَمْرِهِۦٓ ۗ إِنَّ فِى ذَٰلِكَ لَءَايَـٰتٍۢ لِّقَوْمٍۢ يَعْقِلُونَ",
      transcription: "Wasakhkhara lakumu al-layla wan-nahaara wash-shamsa wal-qamara wan-nujoomu musakhkharaatun bi-amrih inna fii dhaalika la-aayaatin liqawmin ya‘qiloon.",
      translation: "U sizlar uchun tun va kunduz, quyosh va oylarni bo‘ysundirgan. Yulduzlar ham Uning amri bilan bo‘ysundirilgan. Albatta, bunda aql yurituvchilar uchun alomatlar bordir.",
      tafsir: "Alloh olamni inson foydasiga xizmat qildirdi. Bu tartib va muvozanat — Uning donoligi va kuchining belgilaridir.",
      copySymbol: "📋"
    },
    {
      numberArabic: "١٣",
      numberLatin: "13",
      arabic: "وَمَا ذَرَأَ لَكُمْ فِى ٱلْأَرْضِ مُخْتَلِفًا أَلْوَٰنُهُۥٓ ۚ إِنَّ فِى ذَٰلِكَ لَءَايَةًۭ لِّقَوْمٍۢ يَذَّكَّرُونَ",
      transcription: "Wamaa dhara’a lakum fil-ardi mukhtalifan alwaanuhu inna fii dhaalika la-aayatan liqawmin yadhakkaroon.",
      translation: "Yana U sizlar uchun yerda turli rangdagi (narsalarni) yaratdi. Albatta, bunda eslaydigan qavm uchun alomat bor.",
      tafsir: "Yer yuzidagi rang-barang o‘simlik va ne’matlar Allohning san’atidan dalolat beradi. Bu eslaydiganlar uchun saboqdir.",
      copySymbol: "📋"
    },
    {
      numberArabic: "١٤",
      numberLatin: "14",
      arabic: "وَهُوَ ٱلَّذِى سَخَّرَ ٱلْبَحْرَ لِتَأْكُلُوا۟ مِنْهُ لَحْمًۭا طَرِيًّۭا وَتَسْتَخْرِجُوا۟ مِنْهُ حِلْيَةًۭ تَلْبَسُونَهَا ۖ وَتَرَى ٱلْفُلْكَ مَوَاخِرَ فِيهِ وَلِتَبْتَغُوا۟ مِن فَضْلِهِۦ وَلَعَلَّكُمْ تَشْكُرُونَ",
      transcription: "Wahuwa alladhi sakhkhara al-bahra lita’kuluu minhu lahman toryyan watastakhrijuu minhu hilyatan talbasoonahaa wa taral-fulka mawaakhira fihi wa litabtaghuu min fadlihi wa la‘allakum tashkuroon.",
      translation: "U sizlar uchun dengizni bo‘ysundirgan: undagi yangi go‘shtni yeyishingiz va ziynatli narsalarni (marvaridlar) chiqarib kiyishingiz uchun. Unda kemalarning suzayotganini ko‘rasiz. Shuningdek, Uning fazlidan (rizq) izlaysiz, shoyadki shukr qilsangiz.",
      tafsir: "Dengizlar ham Allohning ne’matidir — oziq, ziynat va savdo manbai sifatida xizmat qiladi. Insonlar bunga shukr qilishlari kerak.",
      copySymbol: "📋"
    },
    {
      numberArabic: "١٥",
      numberLatin: "15",
      arabic: "وَأَلْقَىٰ فِى ٱلْأَرْضِ رَوَٰسِىَ أَن تَمِيدَ بِكُمْ وَأَنْهَـٰرًۭا وَسُبُلًۭا لَّعَلَّكُمْ تَهْتَدُونَ",
      transcription: "Wa alqaa fil-ardi rawaasiya an tamiida bikum wa anhaaran wa subulan la‘allakum tahtadoon.",
      translation: "U yerni sizlarni tebratmasligi uchun unga tog‘lar qo‘ydi, daryolar va yo‘llarni ham yaratdi — shoyadki to‘g‘ri yo‘lni topsangiz.",
      tafsir: "Allohning yerni barqaror qilganligi, hayotni qulaylashtiruvchi daryo va yo‘llarni yaratganligi Uning rahmati va hidoyatidir.",
      copySymbol: "📋"
    },
      {
        numberArabic: "١٦",
        numberLatin: "16",
        arabic: "وَعَلَـٰمَـٰتٍۢ ۚ وَبِٱلنَّجْمِ هُمْ يَهْتَدُونَ",
        transcription: "Wa ‘alaamaatin wa bin-najmi hum yahtadoon.",
        translation: "Yana (U sizlar uchun) belgilarga va yulduzlar bilan yo‘l topishni (yaratdi).",
        tafsir: "Alloh yulduzlar orqali dengiz va sahro yo‘llarida yo‘l topishni insonlarga o‘rgatgan. Bu ham Uning ne’matlaridan biridir.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٧",
        numberLatin: "17",
        arabic: "أَفَمَن يَخْلُقُ كَمَن لَّا يَخْلُقُ ۚ أَفَلَا تَذَكَّرُونَ",
        transcription: "Afa-man yakhluqu kaman laa yakhluq; afalaa tadhakkaroon?",
        translation: "Yaratuvchi (Alloh) hech narsa yarata olmaydigan (butlar)ga o‘xshaydimi? Axir (shuni) o‘ylamaysizlarmi?",
        tafsir: "Allohning yagona yaratuvchi ekanligi va butlarning hech narsaga qodir emasligi bayon qilinmoqda.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٨",
        numberLatin: "18",
        arabic: "وَإِن تَعُدُّوا۟ نِعْمَتَ ٱللَّهِ لَا تُحْصُوهَآ ۗ إِنَّ ٱللَّهَ لَغَفُورٌۭ رَّحِيمٌۭ",
        transcription: "Wa in ta‘udduu ni‘mata allaahi laa tuhsoohaa; inna allaaha laghafoorur-raheem.",
        translation: "Agar Allohning ne’matlarini sanamoqchi bo‘lsangiz, ularni sanay olmaysiz. Albatta, Alloh mag‘firatli va mehribondir.",
        tafsir: "Allohning ne’matlari nihoyasizdir. Ularning hisobini hech kim to‘liq olib chiqolmaydi. Bu Uning rahmatini ko‘rsatadi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٩",
        numberLatin: "19",
        arabic: "وَٱللَّهُ يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ",
        transcription: "Wa allaahu ya‘lamu maa tusirroona wa maa tu‘linun.",
        translation: "Alloh sizlarning yashiringan va oshkor qilgan narsalaringizni biladi.",
        tafsir: "Alloh har qanday yashirin va oshkor fikr va amallarni biladi. Unga hech narsa maxfiy emas.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢٠",
        numberLatin: "20",
        arabic: "وَٱلَّذِينَ يَدْعُونَ مِن دُونِ ٱللَّهِ لَا يَخْلُقُونَ شَيْـًۭٔا وَهُمْ يُخْلَقُونَ",
        transcription: "Walladhiina yad‘uuna min duuni allaahi laa yakhluquuna shay’an wahum yukhlaqoon.",
        translation: "Allohdan o‘zga chaqirayotgan (butlar) hech narsa yarata olmaydi, ular o‘zlari yaratilgandir.",
        tafsir: "Butlarga sig‘inish noto‘g‘riligini ko‘rsatmoqda. Ular hech narsani yarata olmaydi, balki o‘zlari yaratilgan.",
        copySymbol: "📋"
      }
    ]
  },
  // Al-Isro surasi
  {
    "id": 17,
    "name": "Al-Isro",
    "arabicName": "الإسراء",
    "meaning": "Tungi sayohat",
    "ayahCount": 111,
    "place": "Makka",
    "prelude": {
      "bismillah": {
        "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        "transcription": "Bismillahir-Rahmanir-Rahiim",
        "translation": "Mehribon va rahmli Alloh nomi bilan",
        "tafsir": "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        "copySymbol": "📋"
      }
    },
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "سُبْحَٰنَ ٱلَّذِىٓ أَسْرَىٰ بِعَبْدِهِۦ لَيْلًۭا مِّنَ ٱلْمَسْجِدِ ٱلْحَرَامِ إِلَى ٱلْمَسْجِدِ ٱلْأَقْصَى",
        "transcription": "Subhaana alladhii asraa bi'abdihi laylan mina al-masjidi al-haraami ilaa al-masjidi al-aqsaa",
        "translation": "Ulug‘dir O‘zi bandasi bilan kechasi Masjidul-Haromdan Masjidul-Aqso‘gacha sayohat qildirgan Zot",
        "tafsir": "Rasulullohning Isro va Mi‘roj mo‘jizasi boshlanishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "وَءَاتَيْنَا مُوسَى ٱلْكِتَٰبَ وَجَعَلْنَٰهُ هُدًۭى لِّبَنِىٓ إِسْرَٰٓءِيلَ",
        "transcription": "Wa aataynaa Muusa al-kitaaba wa ja'alnaahu hudan li-banii Israa'iil",
        "translation": "Biz Musoga Kitobni berdik va uni Bani Israil uchun hidoyat qildik",
        "tafsir": "Tavrotning Muso payg‘ambarga berilishi va hidoyat manbai ekanligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "ذُرِّيَّةَ مَنْ حَمَلْنَا مَعَ نُوحٍ ۚ إِنَّهُۥ كَانَ عَبْدًۭا شَكُورًۭا",
        "transcription": "Dhurriyyata man hamalnaa ma'a Nuuhin innahu kaana 'abdan shakuuran",
        "translation": "Nuh bilan birga (kemada) olib ketganlarning zurriyotlari, albatta u shukr qiluvchi banda edi",
        "tafsir": "Nuh payg‘ambar va uning zurriyotlari haqida, shukronalik sifati ta’kidlanadi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "وَقَضَيْنَآ إِلَىٰ بَنِىٓ إِسْرَٰٓءِيلَ فِى ٱلْكِتَٰبِ لَتُفْسِدُنَّ فِى ٱلْأَرْضِ مَرَّتَيْنِ",
        "transcription": "Wa qadaynaa ilaa banii Israa'iila fi al-kitaabi latufsidunna fi al-ardi marratayn",
        "translation": "Bani Israilga Kitobda shunday hukm qildik: 'Sizlar yer yuzida ikki marta buzg‘unchilik qilasiz'",
        "tafsir": "Bani Israilning kelajakdagi ikki buzg‘unchiligi haqida bashorat.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "فَإِذَا جَآءَ وَعْدُ أُولَىٰهُمَا بَعَثْنَا عَلَيْكُمْ عِبَادًۭا لَّنَآ أُو۟لِى بَأْسٍۢ شَدِيدٍۢ",
        "transcription": "Fa-idhaa jaa'a wa'du uulaahumaa ba'athnaa 'alaykum 'ibaadan lanaa uulii ba'sin shadiid",
        "translation": "Birinchi va’da kelsa, Biz sizlarga qarshi kuchli jangchilarimizni yubordik",
        "tafsir": "Bani Israilning birinchi buzg‘unchiligiga javoban azob kelishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "ثُمَّ رَدَدْنَا لَكُمُ ٱلْكَرَّةَ عَلَيْهِمْ وَأَمْدَدْنَٰكُم بِأَمْوَٰلٍۢ وَبَنِينَ",
        "transcription": "Thumma radadnaa lakumu al-karrata 'alayhim wa amdadnaakum bi-amwaalin wa baniin",
        "translation": "So‘ngra sizlarga ularga qarshi g‘alabani qaytardik va mol-davlat, farzandlar bilan yordam berdik",
        "tafsir": "Allohning Bani Israilga g‘alaba va ne’matlar berishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "إِنْ أَحْسَنتُمْ أَحْسَنتُمْ لِأَنفُسِكُمْ ۖ وَإِنْ أَسَأْتُمْ فَلَهَا",
        "transcription": "In ahsantum ahsantum li-anfusikum wa in asa'tum falahaa",
        "translation": "Agar yaxshilik qilsangiz, o‘zingiz uchun qilasiz, agar yomonlik qilsangiz, o‘zingizga qilasiz",
        "tafsir": "Amallarning oqibati insonning o‘ziga qaytishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٨",
        "numberLatin": "8",
        "arabic": "عَسَىٰ رَبُّكُمْ أَن يَرْحَمَكُمْ ۚ وَإِنْ عُدتُّمْ عُدْنَا",
        "transcription": "Asaa rabbukum an yarhamakum wa in 'udtum 'udnaa",
        "translation": "Robbingiz sizlarga rahm qilishi mumkin, agar qaytsangiz, Biz ham qaytamiz",
        "tafsir": "Allohning rahmati va gunohga qaytganlar uchun azob haqida ogohlantirish.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٩",
        "numberLatin": "9",
        "arabic": "إِنَّ هَٰذَا ٱلْقُرْءَانَ يَهْدِى لِلَّتِى هِىَ أَقْوَمُ",
        "transcription": "Inna haadhaa al-qur'aana yahdii lillatii hiya aqwam",
        "translation": "Albatta, bu Qur’on eng to‘g‘ri yo‘lga hidoyat qiladi",
        "tafsir": "Qur’onning eng to‘g‘ri yo‘lga yo‘naltiruvchi kitob ekanligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٠",
        "numberLatin": "10",
        "arabic": "وَأَنَّ ٱلَّذِينَ لَا يُؤْمِنُونَ بِٱلْـَٔاخِرَةِ أَعْتَدْنَا لَهُمْ عَذَابًا أَلِيمًا",
        "transcription": "Wa anna alladhiina laa yu'minuuna bil-aakhirati a'tadnaa lahum 'adhaaban aliiman",
        "translation": "Va albatta, oxiratga ishonmaydiganlar uchun alamli azob tayyorladik",
        "tafsir": "Oxiratga ishonmaganlarning qiyomatdagi alamli azobi haqida ogohlantirish.",
        "copySymbol": "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "وَيَدْعُ ٱلْإِنسَٰنُ بِٱلشَّرِّ دُعَآءَهُۥ بِٱلْخَيْرِۖ وَكَانَ ٱلْإِنسَٰنُ عَجُولًۭا",
          transcription: "Wa yad'u al-insanu bish-sharri du'aahu bil-khayri wa kana al-insanu 'ajulan",
          translation: "Inson yaxshilikni tilagandek yomonlikni tilaydi. Inson juda shoshqaloqdir.",
          tafsir: "Insonning nodonlik bilan yomonlikni istashi va sabrsizligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "وَجَعَلْنَا ٱلَّيْلَ وَٱلنَّهَارَ ءَايَتَيْنِۖ فَمَحَوْنَآ ءَايَةَ ٱلَّيْلِ وَجَعَلْنَآ ءَايَةَ ٱلنَّهَارِ مُبْصِرَةًۭ لِّتَبْتَغُوا فَضْلًۭا مِّن رَّبِّكُمْ وَلِتَعْلَمُوا عَدَدَ ٱلسِّنِينَ وَٱلْحِسَابَۚ وَكُلَّ شَىْءٍۢ فَصَّلْنَٰهُ تَفْصِيلًۭا",
          transcription: "Wa ja'alna al-layla wan-nahara ayatayni fa mahawna ayata al-layli wa ja'alna ayata an-nahari mubsiratan litabtaghu fadlan min rabbikum wa lita'lamu 'adada as-sineena wal-hisab. Wa kulla shay'in fassalnahu tafsilan",
          translation: "Biz kecha va kunduzni ikkita belgi qildik. Kecha belgisini (zulmatni) o'chirdik, kunduz belgisini (nurli) qildik, shunda Robbingizning fazlidan izlar va yillar hisobini bilar ekansiz. Biz har bir narsani aniq bayon qildik.",
          tafsir: "Allohning kecha-kunduzni insonlar foydasi uchun yaratishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَكُلَّ إِنسَٰنٍ أَلْزَمْنَٰهُ طَٰٓئِرَهُۥ فِى عُنُقِهِۦۖ وَنُخْرِجُ لَهُۥ يَوْمَ ٱلْقِيَٰمَةِ كِتَٰبًۭا يَلْقَىٰهُ مَنشُورًۭا",
          transcription: "Wa kulla insanin alzamnahu ta'irahu fi 'unuqihi wa nukhriju lahu yawma al-qiyamati kitaban yalqahu manshuran",
          translation: "Har bir insonning qilmishini uning bo'yniga bog'ladik. Qiyomat kuni u ochiq kitob ko'rinishida bo'ladi.",
          tafsir: "Har bir kishining amallari unga bog'liqligi va hisob-kitob haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "ٱقْرَأْ كِتَٰبَكَ كَفَىٰ بِنَفْسِكَ ٱلْيَوْمَ عَلَيْكَ حَسِيبًۭا",
          transcription: "Iqra' kitabaka kafa bi-nafsika al-yawma 'alayka hasiban",
          translation: "O'qishni boshlang Bugun siz oz'ingizga qarashingiz deyiladi.",
          tafsir: "Qiyomatda har bir kishi o'z amallari uchun javobgar bo'ladi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "مَّنِ ٱهْتَدَىٰ فَإِنَّمَا يَهْتَدِى لِنَفْسِهِۦۖ وَمَن ضَلَّ فَإِنَّمَا يَضِلُّ عَلَيْهَاۚ وَلَا تَزِرُ وَازِرَةٌۭ وِزْرَ أُخْرَىٰۗ وَمَا كُنَّا مُعَذِّبِينَ حَتَّىٰ نَبْعَثَ رَسُولًۭا",
          transcription: "Man-ihtada fa-innama yahtadi li-nafsihi wa man dalla fa-innama yadillu 'alayha wa la taziru waziratun wizra ukhra wa ma kunna mu'adhdhibina hatta nab'atha rasulan",
          translation: "Kim to'g'ri yo'l tutsa, faqat o'zi uchun tutadi. Kim adashsa, faqat o'ziga zarar yetkazadi. Hech kim boshqasining gunohini yuklamaydi. Biz payg'ambar yubormasdan azob bermaymiz.",
          tafsir: "Hidoyat va gumrohlik shaxsiy mas'uliyat ekanligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "وَإِذَآ أَرَدْنَآ أَن نُّهْلِكَ قَرْيَةً أَمَرْنَا مُتْرَفِيهَا فَفَسَقُوا فِيهَا فَحَقَّ عَلَيْهَا ٱلْقَوْلُ فَدَمَّرْنَٰهَا تَدْمِيرًۭا",
          transcription: "Wa idha aradna an nuhlika qaryatan amarna mutrafiha fa-fasaqu fiha fa-haqqa 'alayha al-qawlu fa-dammarnaha tadmiran",
          translation: "Biz bir qishloqni halok qilmoqchi bo'lsak, uning noz-ne'matda yashovchilariga buyruq beramiz, ular esa qasddan nofarmonlik qiladilar. Shunda ularga azob haqq bo'ladi va biz ularni butunlay vayron qilamiz.",
          tafsir: "Jazo qonuni va nofarmonlik oqibatlari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "وَكَمْ أَهْلَكْنَا مِنَ ٱلْقُرُونِ مِنۢ بَعْدِ نُوحٍۢۗ وَكَفَىٰ بِرَبِّكَ بِذُنُوبِ عِبَادِهِۦ خَبِيرًۢا بَصِيرًۭا",
          transcription: "Wa kam ahlakna min al-quruni min ba'di Nuh. Wa kafa bi-rabbika bi-dhunubi 'ibadihi khabiran basiran",
          translation: "Nuhdan keyin qancha avlodni halok qilganmiz! Robbingiz bandalarining gunohlaridan xabardor va ko'ruvchi bo'lishi yetarli.",
          tafsir: "Allohning o'tmish ummatlarning aqibati va insonlarning holidan xabardorligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "مَّن كَانَ يُرِيدُ ٱلْعَاجِلَةَ عَجَّلْنَا لَهُۥ فِيهَا مَا نَشَآءُ لِمَن نُّرِيدُ ثُمَّ جَعَلْنَا لَهُۥ جَهَنَّمَ يَصْلَىٰهَا مَذْمُومًۭا مَّدْحُورًۭا",
          transcription: "Man kana yuridu al-'ajilata 'ajjalna lahu fiha ma nasha'u li-man nuridu thumma ja'alna lahu jahannama yaslaha madhmuman madhuran",
          translation: "Kim dunyoviy narsalarni istasa, biz uni istagan kishiga tezda beramiz. Keyin esa unga do'zaxni tayyorlaymiz, u xo'rlanib, quvilgan holda unga kiradi.",
          tafsir: "Dunyoviy narsalarga intilish va oxiratdagi oqibat haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَمَنْ أَرَادَ ٱلْءَاخِرَةَ وَسَعَىٰ لَهَا سَعْيَهَا وَهُوَ مُؤْمِنٌۭ فَأُو۟لَٰٓئِكَ كَانَ سَعْيُهُم مَّشْكُورًۭا",
          transcription: "Wa man arada al-akhirata wa sa'a laha sa'yaha wa huwa mu'minun fa-ula'ika kana sa'yuhum mashkuran",
          translation: "Kim oxiratni istasa va unga loyiq ish qilsa, u ham mo'min bo'lsa, unda bundaylarning sa'y-harakatlari qadrlanadi.",
          tafsir: "Oxiratga intilish va unga erishish yo'llari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "كُلًّۭا نُّمِدُّ هَٰٓؤُلَآءِ وَهَٰٓؤُلَآءِ مِنْ عَطَآءِ رَبِّكَۚ وَمَا كَانَ عَطَآءُ رَبِّكَ مَحْظُورًۭا",
          transcription: "Kullan numiddu ha'ula'i wa ha'ula'i min 'ata'i rabbika. Wa ma kana 'ata'u rabbika mahzuran",
          translation: "Biz ularning (dunyoni va oxiratni istaganlarning) har biriga Robbingizning ato etgan ne'matlaridan beramiz. Robbingizning ato qilishi hech qachon cheklanmagan.",
          tafsir: "Allohning ne'matlari cheksizligi haqida.",
          copySymbol: "📋"
      }
    ]
  },
  {
    "id": 18,
    "name": "Al-Kahf",
    "arabicName": "الكهف",
    "meaning": "G‘or",
    "ayahCount": 110,
    "place": "Makka",
    "prelude": {
      "bismillah": {
        "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        "transcription": "Bismillahir-Rahmanir-Rahiim",
        "translation": "Mehribon va rahmli Alloh nomi bilan",
        "tafsir": "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        "copySymbol": "📋"
      }
    },
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "ٱلْحَمْدُ لِلَّهِ ٱلَّذِىٓ أَنزَلَ عَلَىٰ عَبْدِهِ ٱلْكِتَٰبَ",
        "transcription": "Al-hamdu lillaahi alladhii anzala 'alaa 'abdihi al-kitaaba",
        "translation": "Hamd o‘sha Allohgakim, U bandasi (Muhammad)ga Kitobni nozil qildi",
        "tafsir": "Allohga hamd va Qur’onning nozil qilinishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "قَيِّمًۭا لِّيُنذِرَ بَأْسًۭا شَدِيدًۭا مِّن لَّدُنْهُ",
        "transcription": "Qayyiman li-yundhira ba'san shadiidan min ladunhu",
        "translation": "To‘g‘ri yo‘lga yo‘naltiruvchi, U huzuridan keladigan qattiq azobdan ogohlantirish uchun",
        "tafsir": "Qur’onning ogohlantiruvchi va hidoyat qiluvchi roli.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "وَيُبَشِّرَ ٱلْمُؤْمِنِينَ ٱلَّذِينَ يَعْمَلُونَ ٱلصَّٰلِحَٰتِ",
        "transcription": "Wa yubashshira al-mu'miniina alladhiina ya'maluuna as-saalihaat",
        "translation": "Va solih amal qiluvchi mo‘minlarga xushxabar berish uchun",
        "tafsir": "Mo‘minlar uchun Qur’onning xushxabar beruvchi xususiyati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "وَيُنذِرَ ٱلَّذِينَ قَالُوا۟ ٱتَّخَذَ ٱللَّهُ وَلَدًۭا",
        "transcription": "Wa yundhira alladhiina qaaluu ittakhadha Allahu waladan",
        "translation": "Va Alloh farzand oldi, deganlarni ogohlantirish uchun",
        "tafsir": "Allohga farzand nisbati beruvchilarga ogohlantirish.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "مَّا لَهُم بِهِۦ مِنْ عِلْمٍۢ وَلَا لِءَابَآئِهِمْ",
        "transcription": "Maa lahum bihi min 'ilmin wa laa li-aabaa'ihim",
        "translation": "Na o‘zlari, na ota-bobolari bunga ilmga ega emas",
        "tafsir": "Bunday da’volarning ilmsiz aytilganligi ta’kidlanadi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "فَلَعَلَّكَ بَٰخِعٌۭ نَّفْسَكَ عَلَىٰٓ ءَاثَٰرِهِمْ",
        "transcription": "Fala'allaka baakhi'un nafsaka 'alaa aathaarihim",
        "translation": "Balki sen ularning orqasidan o‘zingni halok qilmoqchisan",
        "tafsir": "Payg‘ambarning kofirlarning iymon keltirmasligidan qayg‘urishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "إِنَّا جَعَلْنَا مَا عَلَى ٱلْأَرْضِ زِينَةًۭ لَّهَا",
        "transcription": "Innaa ja'alnaa maa 'ala al-ardi ziinatan lahaa",
        "translation": "Biz yer yuzidagi narsalarni uning ziynati qildik",
        "tafsir": "Dunyo ne’matlarining sinov sifatida berilishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٨",
        "numberLatin": "8",
        "arabic": "وَإِنَّا لَجَٰعِلُونَ مَا عَلَيْهَا صَعِيدًۭا جُرُزًۭا",
        "transcription": "Wa innaa lajaa'iluuna maa 'alayhaa sa'iidan juruzan",
        "translation": "Va albatta, undagi hamma narsani quruq tuproqqa aylantiruvchimiz",
        "tafsir": "Dunyo ne’matlarining foniyligi haqida eslatma.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٩",
        "numberLatin": "9",
        "arabic": "أَمْ حَسِبْتَ أَنَّ أَصْحَٰبَ ٱلْكَهْفِ وَٱلرَّقِيمِ كَانُوا۟ مِنْ ءَايَٰتِنَا عَجَبًۭا",
        "transcription": "Am hasibta anna ashaaba al-kahfi war-raqiimi kaanuu min aayaatinaa 'ajaban",
        "translation": "Yoki g‘or va raqim ahlini Bizning mo‘jizalarimizdan ajablanarli deb o‘yladingmi?",
        "tafsir": "G‘or ahli hikoyasining muqaddimasi va mo‘jizalar haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٠",
        "numberLatin": "10",
        "arabic": "إِذْ أَوَى ٱلْفِتْيَةُ إِلَى ٱلْكَهْفِ فَقَالُوا۟ رَبَّنَآ ءَاتِنَا مِن لَّدُنكَ رَحْمَةًۭ",
        "transcription": "Idh awa al-fityatu ila al-kahfi faqaaluu rabbanaa aatinaa min ladunka rahmatan",
        "translation": "O‘shanda yigitlar g‘orga panoh topib: 'Rabbimiz, bizga O‘z huzuringdan rahmat ato et', dedilar",
        "tafsir": "G‘or ahlining Allohdan rahmat va panoh so‘ragan duosi haqida.",
        "copySymbol": "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "فَضَرَبْنَا عَلَىٰٓ ءَاذَانِهِمْ فِى ٱلْكَهْفِ سِنِينَ عَدَدًۭا",
          transcription: "Fa darabna 'ala azanihim fi al-kahfi sinina 'adadan",
          translation: "Biz ularning quloqlarini g'orda uzoq yillar uxlatdik.",
          tafsir: "G'or ahli haqida: Alloh ularni uzoq muddat uxlatgani.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "ثُمَّ بَعَثْنَٰهُمْ لِنَعْلَمَ أَيُّ ٱلْحِزْبَيْنِ أَحْصَىٰ لِمَا لَبِثُوٓا أَمَدًۭا",
          transcription: "Thumma ba'athnahum li-na'lama ayyu al-hizbayni ahsa li-ma labithu amadan",
          translation: "Keyin ularni uyg'otdik, qaysi guruh ularning qolgan vaqtini to'g'ri hisoblashini ko'rish uchun.",
          tafsir: "G'or ahli uyg'otilganda ularning vaqt hisobi haqida bahs.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "نَّحْنُ نَقُصُّ عَلَيْكَ نَبَأَهُم بِٱلْحَقِّۚ إِنَّهُمْ فِتْيَةٌ ءَامَنُوا بِرَبِّهِمْ وَزِدْنَٰهُمْ هُدًۭى",
          transcription: "Nahnu naqussu 'alayka naba'ahum bil-haqq. Innahum fityatun amanu birabbihim wa zidnahum huda",
          translation: "Biz ularning qissasini senga haq bilan aytamiz. Ular yosh yigitlar edi, Robbilariga imon keltirgan edilar va Biz ularga hidoyatni ko'paytirdik.",
          tafsir: "G'or ahli - Allohga sodiq yoshlar bo'lgani va ularga hidoyat berilgani.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "وَرَبَطْنَا عَلَىٰ قُلُوبِهِمْ إِذْ قَامُوا فَقَالُوا رَبُّنَا رَبُّ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ لَن نَّدْعُوَا۟ مِن دُونِهِۦٓ إِلَٰهًۭاۖ لَّقَدْ قُلْنَآ إِذًۭا شَطَطًۭا",
          transcription: "Wa rabatna 'ala qulubihim idh qamu fa qalu rabbuna rabbu as-samawati wal-ardi lan nad'u min dunihi ilahan la-qad qulna idhan shatata",
          translation: "Biz ularning qalblarini mustahkam qildik, qachonki ular turib: 'Robbimiz osmonlar va Yerning Rabbidir, Biz Undan o'zga ilohga duo qilmaymiz. Aks holda biz haddan oshgan bo'lardik' dedilar.",
          tafsir: "Yoshlarning qat'iy iymoni va shirkdan uzoqlashishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "هَٰٓؤُلَآءِ قَوْمُنَا ٱتَّخَذُوا مِن دُونِهِۦٓ ءَالِهَةًۭۖ لَّوْلَا يَأْتُونَ عَلَيْهِم بِسُلْطَٰنٍۭ بَيِّنٍۢۖ فَمَنْ أَظْلَمُ مِمَّنِ ٱفْتَرَىٰ عَلَى ٱللَّهِ كَذِبًۭا",
          transcription: "Ha'ula'i qawmunat takhadhu min dunihi alihatan law la ya'tuna 'alayhim bi-sultanin bayyin. Fa-man azlamu mim maniftara 'ala Allahi kaziban",
          translation: "Bizning qavmimiz Undan o'zga ilohlar qilib oldilar. Ular buning uchun aniq dalil keltirsa edilar! Kim Allohga nisbatan yolg'on uydirgandan ko'ra zolimroq bo'ladi?",
          tafsir: "Qavmlarning shirkga tushgani va dalilsiz e'tiqodlari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "وَإِذِ ٱعْتَزَلْتُمُوهُمْ وَمَا يَعْبُدُونَ إِلَّا ٱللَّهَ فَأْوُۥٓا۟ إِلَى ٱلْكَهْفِ يَنشُرْ لَكُمْ رَبُّكُم مِّن رَّحْمَتِهِۦ وَيُهَيِّئْ لَكُم مِّنْ أَمْرِكُم مِّرْفَقًۭا",
          transcription: "Wa idhi i'tazaltumuhum wa ma ya'buduna illa Allaha fa'wu ila al-kahfi yanshur lakum rabbukum min rahmatihi wa yuhayyi' lakum min amrikum mirfaqa",
          translation: "Qachonki sizlar ularni va Allohdan o'zga ibodat qiladigan narsalarni tark etdingiz, g'orga panohlang. Robbingiz o'z rahmatidan sizga foyda beradi va ishingizni osonlashtiradi.",
          tafsir: "G'or ahli mushriklardan ajralib, Allohga sig'inishga qaror qilgani.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "وَتَرَى ٱلشَّمْسَ إِذَا طَلَعَت تَّزَٰوَرُ عَن كَهْفِهِمْ ذَاتَ ٱلْيَمِينِ وَإِذَا غَرَبَت تَّقْرِضُهُمْ ذَاتَ ٱلشِّمَالِ وَهُمْ فِى فَجْوَةٍۢ مِّنْهُۚ ذَٰلِكَ مِنْ ءَايَٰتِ ٱللَّهِۗ مَن يَهْدِ ٱللَّهُ فَهُوَ ٱلْمُهْتَدِۖ وَمَن يُضْلِلْ فَلَن تَجِدَ لَهُۥ وَلِيًّۭا مُّرْشِدًۭا",
          transcription: "Wa tara ash-shamsa idha tala'at tazawaru 'an kahfihim dhat al-yamin wa idha gharabat taqriduhum dhat ash-shimal wa hum fi fajwatin minhu. Dhalika min ayati Allah. Man yahdi Allahu fa-huwa al-muhtadi wa man yudlil fa-lan tajida lahu waliyyan murshida",
          translation: "Sen quyosh chiqqanda ularning g'orlaridan o'ng tomonga burilayotganini, botayotganda esa chap tomondan ularni tark etayotganini ko'rasan. Ular g'orning keng joyida edilar. Bu Allohning oyatlaridan. Kimni Alloh hidoyatga boshlasa, u hidoyat topgan bo'ladi. Kimni adashtirsa, u uchun hech qanday yo'l ko'rsatuvchi do'st topolmaysan.",
          tafsir: "G'or ahli uchun quyosh harakatining mo'jizaviy tartibi va Allohning hidoyati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "وَتَحْسَبُهُمْ أَيْقَاظًۭا وَهُمْ رُقُودٌۭۚ وَنُقَلِّبُهُمْ ذَاتَ ٱلْيَمِينِ وَذَاتَ ٱلشِّمَالِۖ وَكَلْبُهُم بَٰسِطٌۭ ذِرَاعَيْهِ بِٱلْوَصِيدِۚ لَوِ ٱطَّلَعْتَ عَلَيْهِمْ لَوَلَّيْتَ مِنْهُمْ فِرَارًۭا وَلَمُلِئْتَ مِنْهُمْ رُعْبًۭا",
          transcription: "Wa tahsabuhum ayqazan wa hum ruqud. Wa nuqallibuhum dhat al-yamin wa dhat ash-shimal. Wa kalbuhum basitun dhira'ayhi bil-wasid. Lawi attala'ta 'alayhim la-wallayta minhum firaran wa la-muli'ta minhum ru'ba",
          translation: "Sen ularni uyquda deb o'ylaysan, lekin ular uyg'oq. Biz ularni o'ng va chap tomonga aylantiramiz. Itlari esa eshik oldida tizzalarini cho'zgan holda. Agar ularni ko'rsang, qochib ketar va qalbiga qo'rquv to'lib ketar eding.",
          tafsir: "G'or ahli uyquda bo'lsa ham, Alloh ularni himoya qilgani va itning ularni qo'riqlashi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "وَكَذَٰلِكَ بَعَثْنَٰهُمْ لِيَتَسَآءَلُوا بَيْنَهُمْۚ قَالَ قَآئِلٌۭ مِّنْهُمْ كَمْ لَبِثْتُمْۖ قَالُوا لَبِثْنَا يَوْمًا أَوْ بَعْضَ يَوْمٍۢۚ قَالُوا رَبُّكُمْ أَعْلَمُ بِمَا لَبِثْتُمْ فَٱبْعَثُوٓا۟ أَحَدَكُم بِوَرِقِكُمْ هَٰذِهِۦٓ إِلَى ٱلْمَدِينَةِ فَلْيَنظُرْ أَيُّهَآ أَزْكَىٰ طَعَامًۭا فَلْيَأْتِكُم بِرِزْقٍۢ مِّنْهُ وَلْيَتَلَطَّفْ وَلَا يُشْعِرَنَّ بِكُمْ أَحَدًا",
          transcription: "Wa kadhalika ba'athnahum li-yatasaa'alu baynahum. Qala qailun minhum kam labithtum. Qalu labithna yawman aw ba'da yawm. Qalu rabbukum a'lamu bi-ma labithtum fab'athu ahadakum bi-wariqikum hadhihi ila al-madinati fal-yanzur ayyuha azka ta'aman fal-ya'tikum bi-rizqin minhu wa li-yatalattaf wa la yush'iranna bikum ahadan",
          translation: "Shunday qilib Biz ularni uyg'otdik, bir-birlaridan so'rashlari uchun. Ulardan biri: 'Qancha vaqt qoldingiz?' dedi. 'Bir kun yoki kunning bir qismi', dedilar. 'Robbingiz qancha qolganingizni yaxshi biladi. Endi birortangizni shu kumush tangangiz bilan shaharga yuboring. Qaysi ovqat toza ekanligini ko'rsin va sizga u yerdan oziq-ovqat olib kelsin. U ehtiyot bo'lsin va hech kimga siz haqingizda xabar bermasin'.",
          tafsir: "G'or ahli uyg'otilganda ularning o'zaro suhbati va shaharga yuborilgan yigit haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "إِنَّهُمْ إِن يَظْهَرُوا عَلَيْكُمْ يَرْجُمُوكُمْ أَوْ يُعِيدُوكُمْ فِى مِلَّتِهِمْ وَلَن تُفْلِحُوٓا۟ إِذًا أَبَدًۭا",
          transcription: "Innahum in yazharu 'alaykum yarjumukum aw yu'idukum fi millatihim wa lan tuflihu idhan abadan",
          translation: "Agar ular sizni ko'rib qolsa, toshbo'ron qilishadi yoki sizni o'z dinlariga qaytarishadi. Bunday holda siz hech qachon najot topolmaysiz.",
          tafsir: "G'or ahli mushriklarning xavfi ostida ekanligi haqida.",
          copySymbol: "📋"
      }
    ]
  },
  {
    "id": 19,
    "name": "Maryam",
    "arabicName": "مريم",
    "meaning": "Maryam",
    "ayahCount": 98,
    "place": "Makka",
    "prelude": {
      "bismillah": {
        "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        "transcription": "Bismillahir-Rahmanir-Rahiim",
        "translation": "Mehribon va rahmli Alloh nomi bilan",
        "tafsir": "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        "copySymbol": "📋"
      }
    },
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "كٓهيعٓصٓ",
        "transcription": "Kaaf Haa Yaa 'Ayn Saad",
        "translation": "Kaaf, Haa, Yaa, Ayn, Saad",
        "tafsir": "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "ذِكْرُ رَحْمَتِ رَبِّكَ عَبْدَهُۥ زَكَرِيَّآ",
        "transcription": "Dhikru rahmati rabbika 'abdahu Zakariyyaa",
        "translation": "Robbingning bandasi Zakariyoga rahmati haqida eslatma",
        "tafsir": "Zakariyo payg‘ambarga Allohning rahmati hikoyasi boshlanishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "إِذْ نَادَىٰ رَبَّهُۥ نِدَآءً خَفِيًّۭا",
        "transcription": "Idh naadaa rabbahu nidaa'an khafiyyan",
        "translation": "U Robbisiga yashirin nido qilganda",
        "tafsir": "Zakariyoning Allohga yashirin duo qilishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "قَالَ رَبِّ إِنِّى وَهَنَ ٱلْعَظْمُ مِنِّى وَٱشْتَعَلَ ٱلرَّأْسُ شَيْبًۭا",
        "transcription": "Qaala rabbi innii wahana al-'azmu minnii wa ishta'ala ar-ra'su shayban",
        "translation": "U dedi: 'Rabbim, mening suyaklarim zaiflashdi va boshim oqardi'",
        "tafsir": "Zakariyoning qarilik va kuchsizlik haqidagi duosi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "وَإِنِّى خِفْتُ ٱلْمَوَٰلِىَ مِن وَرَآئِى وَكَانَتِ ٱمْرَأَتِى عَاقِرًۭا",
        "transcription": "Wa innii khiftu al-mawaaliya min waraa'ii wa kaanati imra'ati 'aaqiran",
        "translation": "Men orqamdan qoladigan vorislarimdan qo‘rqdim, xotinim bepusht edi",
        "tafsir": "Zakariyoning voris va farzand haqidagi xavotiri.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "فَهَبْ لِى مِن لَّدُنكَ وَلِيًّۭا",
        "transcription": "Fahab lii min ladunka waliyyan",
        "translation": "Menga O‘z huzuringdan bir voris ato et",
        "tafsir": "Zakariyoning Allohdan farzand so‘ragan duosi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "يَرِثُنِى وَيَرِثُ مِنْ ءَالِ يَعْقُوبَ ۖ وَٱجْعَلْهُ رَبِّ رَضِيًّۭا",
        "transcription": "Yarithunii wa yarithu min aali Ya'quuba waj'alhu rabbi radiyyan",
        "translation": "U mening merosimni va Ya’qub oilasining merosini olsin, uni rozi bo‘ladigan qil",
        "tafsir": "Zakariyoning farzandi payg‘ambarlik merosini davom ettirishi haqidagi iltimosi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٨",
        "numberLatin": "8",
        "arabic": "يَٰزَكَرِيَّآ إِنَّا نُبَشِّرُكَ بِغُلَٰمٍ ٱسْمُهُۥ يَحْيَىٰ",
        "transcription": "Yaa Zakariyyaa innaa nubashshiruka bighulaamin ismuhu Yahyaa",
        "translation": "Ey Zakariyo, Biz seni Yahyo ismli o‘g‘il bilan xushxabar beramiz",
        "tafsir": "Allohning Zakariyoga Yahyo payg‘ambar bilan xushxabar berishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٩",
        "numberLatin": "9",
        "arabic": "لَمْ نَجْعَل لَّهُۥ مِن قَبْلُ سَمِيًّۭا",
        "transcription": "Lam naj'al lahu min qablu samiyyan",
        "translation": "Biz undan oldin hech kimga bunday ism qo‘ymagan edik",
        "tafsir": "Yahyo ismining o‘ziga xosligi va birinchi marta qo‘yilishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٠",
        "numberLatin": "10",
        "arabic": "قَالَ رَبِّ ٱجْعَل لِّىٓ ءَايَةًۭ ۖ قَالَ ءَايَتُكَ أَلَّا تُكَلِّمَ ٱلنَّاسَ ثَلَٰثَ لَيَالٍۢ سَوِيًّا",
        "transcription": "Qaala rabbi ij'al lii aayatan, qaala aayatuka allaa tukallima an-naasa thalaatha layaalin sawiyyan",
        "translation": "U: 'Rabbim, menga bir alomat ber', dedi. U: 'Alomating — uch kecha odamlar bilan gaplashmaslikdir', dedi",
        "tafsir": "Zakariyo payg‘ambarning o‘g‘il ko‘rish alomati sifatida uch kecha sukut saqlashi haqida.",
        "copySymbol": "📋"
      },
      {
        numberArabic: "١١",
        numberLatin: "11",
        arabic: "فَخَرَجَ عَلَىٰ قَوْمِهِ مِنَ ٱلْمِحْرَابِ فَأَوْحَىٰٓ إِلَيْهِمْ أَن سَبِّحُوا بُكْرَةًۭ وَعَشِيًّۭا",
        transcription: "Fa kharaja 'ala qawmihi min al-mihrabi fa-awha ilayhim an sabbihu bukratan wa 'ashiyya",
        translation: "Zakariyo mahrabdan chiqib qavmiga ishora qildi: “Ertalab va kechqurun Allohni poklang!”",
        tafsir: "Zakariyo (a.s)ning mo''jizasi va qavmiga tavsiyasi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٢",
        numberLatin: "12",
        arabic: "يَٰيَحْيَىٰ خُذِ ٱلْكِتَٰبَ بِقُوَّةٍۢۖ وَءَاتَيْنَٰهُ ٱلْحُكْمَ صَبِيًّۭا",
        transcription: "Ya Yahya khudh al-kitaba bi-quwwah. Wa ataynahu al-hukma sabiyya",
        translation: "“Ey Yahyo! Kitobni qattiq ushlang!” Biz unga bolaligida hikmat ato etdik.",
        tafsir: "Yahyoga (a.s) bolaligida hikmat berilgani.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٣",
        numberLatin: "13",
        arabic: "وَحَنَانًۭا مِّن لَّدُنَّا وَزَكَوٰةًۭۖ وَكَانَ تَقِيًّۭا",
        transcription: "Wa hananan min ladunna wa zakatan wa kana taqiyya",
        translation: "Undan qo‘lidan mehribonlik va poklik yaratdik. U taqvodor edi.",
        tafsir: "Yahyoning (a.s) fazilatlari.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٤",
        numberLatin: "14",
        arabic: "وَبَرًّۢا بِوَٰلِدَيْهِ وَلَمْ يَكُن جَبَّارًا عَصِيًّۭا",
        transcription: "Wa barran bi-walidayhi wa lam yakun jabbaran 'asiyya",
        translation: "U ota-onasiga xushmuomala edi, zo‘ravon va itoatsiz emas edi.",
        tafsir: "Yahyoning (a.s) ota-onasiga bo‘lgan hurmati.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٥",
        numberLatin: "15",
        arabic: "وَسَلَٰمٌ عَلَيْهِ يَوْمَ وُلِدَ وَيَوْمَ يَمُوتُ وَيَوْمَ يُبْعَثُ حَيًّۭا",
        transcription: "Wa salamun 'alayhi yawma wulida wa yawma yamutu wa yawma yub'athu hayya",
        translation: "Uga tug‘ilgan kuni, o‘lgan kuni va tirilib qaytarilgan kuni salom bo‘lsin!",
        tafsir: "Yahyoga (a.s) Allohning maxsus salomi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٦",
        numberLatin: "16",
        arabic: "وَٱذْكُرْ فِى ٱلْكِتَٰبِ مَرْيَمَ إِذِ ٱنتَبَذَتْ مِنْ أَهْلِهَا مَكَانًۭا شَرْقِيًّۭا",
        transcription: "Wa dhkur fi al-kitabi Maryama idh intabathat min ahliha makanan sharqiyya",
        translation: "Kitobda Maryamni ham eslang! U oilasidan sharq tomonida joy olgan edi.",
        tafsir: "Maryam (a.s)ning hikoyasi boshlanishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٧",
        numberLatin: "17",
        arabic: "فَٱتَّخَذَتْ مِن دُونِهِمْ حِجَابًۭا فَأَرْسَلْنَآ إِلَيْهَا رُوحَنَا فَتَمَثَّلَ لَهَا بَشَرًۭا سَوِيًّۭا",
        transcription: "Fa ittakhathat min dunihim hijaban fa-arsalna ilayha ruhana fa-tamaththala laha basharan sawiyya",
        translation: "U ular oldidan parda tortdi. Biz unga o‘z Ruhimiz (Jibrilni) yubordik, u unga go‘zal bir inson shaklida ko‘rindi.",
        tafsir: "Jibril (a.s)ning Maryamga bashariy ko‘rinishda kelishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٨",
        numberLatin: "18",
        arabic: "قَالَتْ إِنِّىٓ أَعُوذُ بِٱلرَّحْمَٰنِ مِنكَ إِن كُنتَ تَقِيًّۭا",
        transcription: "Qalat inni a'udhu bi-r-Rahmani minka in kunta taqiyya",
        translation: "Maryam: “Agar sen taqvodor bo‘lsang, men sening sharrigdan Rahmonga panoh tilayman”, dedi.",
        tafsir: "Maryamning (a.s) xavfsizlik uchun duo qilishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "١٩",
        numberLatin: "19",
        arabic: "قَالَ إِنَّمَآ أَنَا۠ رَسُولُ رَبِّكِ لِأَهَبَ لَكِ غُلَٰمًۭا زَكِيًّۭا",
        transcription: "Qala innama ana rasulu rabbiki li-ahaba laki ghulaman zakiyya",
        translation: "Jibril: “Men faqat Robbining elchisiman. Senga pokiza bir o‘g‘il ato etish uchun keldim”, dedi.",
        tafsir: "Jibril (a.s)ning vazifasini tushuntirishi.",
        copySymbol: "📋"
      },
      {
        numberArabic: "٢٠",
        numberLatin: "20",
        arabic: "قَالَتْ أَنَّىٰ يَكُونُ لِى غُلَٰمٌۭ وَلَمْ يَمْسَسْنِى بَشَرٌۭ وَلَمْ أَكُ بَغِيًّۭا",
        transcription: "Qalat anna yaku li ghulamun wa lam yamsasni basharun wa lam aku baghiyya",
        translation: "Maryam: “Menga bola qanday bo‘ladi? Menga hech bir inson tegmaydi, men buzuq ham emasman”, dedi.",
        tafsir: "Maryamning (a.s) hayratga tushgan savoli.",
        copySymbol: "📋"
      }
    ]
  },
  {
    "id": 20,
    "name": "Toha",
    "arabicName": "طه",
    "meaning": "To ha",
    "ayahCount": 135,
    "place": "Makka",
    "prelude": {
      "bismillah": {
        "arabic": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        "transcription": "Bismillahir-Rahmanir-Rahiim",
        "translation": "Mehribon va rahmli Alloh nomi bilan",
        "tafsir": "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
        "copySymbol": "📋"
      }
    },
    "ayahs": [
      {
        "numberArabic": "١",
        "numberLatin": "1",
        "arabic": "طٰهٓ",
        "transcription": "Taa Haa",
        "translation": "To, Ha",
        "tafsir": "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٢",
        "numberLatin": "2",
        "arabic": "مَآ أَنزَلْنَا عَلَيْكَ ٱلْقُرْءَانَ لِتَشْقَىٰٓ",
        "transcription": "Maa anzalnaa 'alayka al-qur'aana litashqaa",
        "translation": "Biz Qur’onni senga azob chekishing uchun nozil qilmadik",
        "tafsir": "Qur’onning Rasulullohga osonlik va rahmat sifatida nozil qilinishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٣",
        "numberLatin": "3",
        "arabic": "إِلَّا تَذْكِرَةًۭ لِّمَن يَخْشَىٰ",
        "transcription": "Illaa tadhkiratan liman yakhshaa",
        "translation": "Faqat qo‘rqqanlar uchun eslatma sifatida",
        "tafsir": "Qur’onning Allohdan qo‘rqqanlar uchun pand-nasihat ekanligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٤",
        "numberLatin": "4",
        "arabic": "تَنزِيلًۭا مِّمَّنْ خَلَقَ ٱلْأَرْضَ وَٱلسَّمَٰوَٰتِ ٱلْعُلَى",
        "transcription": "Tanziilan mimman khalaqa al-arda was-samaawaati al-'ulaa",
        "translation": "Yer va yuqori osmonlarni yaratgan Zotdan nozil qilingan",
        "tafsir": "Qur’onning Alloh tomonidan nozil qilinishi va Uning qudrati.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٥",
        "numberLatin": "5",
        "arabic": "ٱلرَّحْمَٰنُ عَلَى ٱلْعَرْشِ ٱسْتَوَىٰ",
        "transcription": "Ar-Rahmaanu 'ala al-'arshi istawaa",
        "translation": "Rahmon Arshga mustavo bo‘ldi",
        "tafsir": "Allohning Arsh ustidagi ulug‘vorligi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٦",
        "numberLatin": "6",
        "arabic": "لَهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ وَمَا بَيْنَهُمَا",
        "transcription": "Lahu maa fi as-samaawaati wa maa fi al-ardi wa maa baynahumaa",
        "translation": "Osmonlar, yer va ular orasidagi hamma narsa Ungadir",
        "tafsir": "Allohning hamma narsa ustidagi egaligi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٧",
        "numberLatin": "7",
        "arabic": "وَإِن تَجْهَرْ بِٱلْقَوْلِ فَإِنَّهُۥ يَعْلَمُ ٱلسِّرَّ وَأَخْفَى",
        "transcription": "Wa in tajhar bil-qawli fa-innahu ya'lamu as-sirra wa akhfaa",
        "translation": "Agar so‘zni oshkora aytsang ham, U sirni va undan yashirinroq narsani biladi",
        "tafsir": "Allohning hamma narsani, hatto yashirinni ham bilishi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٨",
        "numberLatin": "8",
        "arabic": "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ۖ لَهُ ٱلْأَسْمَآءُ ٱلْحُسْنَىٰ",
        "transcription": "Allahu laa ilaaha illaa huwa lahu al-asmaa'u al-husnaa",
        "translation": "Alloh, Undan boshqa iloh yo‘q, eng go‘zal ismlar Unikidir",
        "tafsir": "Allohning yagona iloh ekanligi va eng go‘zal ismlarga ega ekanligi.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "٩",
        "numberLatin": "9",
        "arabic": "وَهَلْ أَتَىٰكَ حَدِيثُ مُوسَىٰٓ",
        "transcription": "Wa hal ataaka hadiithu Muusaa",
        "translation": "Senga Musoning xabari keldimi?",
        "tafsir": "Muso payg‘ambarning hikoyasi boshlanishi haqida.",
        "copySymbol": "📋"
      },
      {
        "numberArabic": "١٠",
        "numberLatin": "10",
        "arabic": "إِذْ رَءَا نَارًۭا فَقَالَ لِأَهْلِهِ ٱمْكُثُوآ إِنِّىٓ ءَانَسْتُ نَارًۭا",
        "transcription": "Idh ra'aa naaran faqaala li-ahlihi amkuthuu innii aanastu naaran",
        "translation": "U olovni ko‘rib, o‘z ahliga: 'Turinglar, men bir olov ko‘rdim', dedi",
        "tafsir": "Muso payg‘ambarning Tur tog‘ida olovni ko‘rishi va Alloh bilan suhbat boshlanishi haqida.",
        "copySymbol": "📋"
      },
        {
          numberArabic: "١١",
          numberLatin: "11",
          arabic: "فَلَمَّا أَتَىٰهَا نُودِىَ يَٰمُوسَىٰٓ",
          transcription: "Falamma ataha nudia ya Musa",
          translation: "Qachonki u (Muso) olovga yetdi, unda: “Ey Muso!” deb nido qilindi.",
          tafsir: "Muso (a.s)ga Allohning birinchi vahyi kelishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٢",
          numberLatin: "12",
          arabic: "إِنِّىٓ أَنَا۠ رَبُّكَ فَٱخْلَعْ نَعْلَيْكَ إِنَّكَ بِٱلْوَادِ ٱلْمُقَدَّسِ طُوًۭى",
          transcription: "Inni ana rabbuka fakhla' na'layka innaka bil-wadi l-muqaddasi tuwa",
          translation: "“Albatta, Men senning Robbingman. Etagingni chiqar, chunki sen Tuvo nomli muqaddas vodiyidasan.”",
          tafsir: "Allohning Musoga (a.s) xitobi va vodiyning qadr-qimmati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٣",
          numberLatin: "13",
          arabic: "وَأَنَا ٱخْتَرْتُكَ فَٱسْتَمِعْ لِمَا يُوحَىٰٓ",
          transcription: "Wa ana ikhtartuka fastami' lima yuha",
          translation: "“Men seni tanladim, shuning uchun vahiy qilinadigan narsaga quloq sol.”",
          tafsir: "Musoning (a.s) payg‘ambarlik uchun tanlanganligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٤",
          numberLatin: "14",
          arabic: "إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَٰهَ إِلَّآ أَنَا۠ فَٱعْبُدْنِى وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ",
          transcription: "Innani ana Allahu la ilaha illa ana fa'budni wa aqimi as-salata li-dhikri",
          translation: "“Albatta, Men Allohman, Mening o‘zimdan o‘zga iloh yo‘q. Shuning uchun Menga ibodat qil va Mening zikrim uchun namozni to‘kis ado et.”",
          tafsir: "Tavhidning asosiy aqidasi va namozning ahamiyati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٥",
          numberLatin: "15",
          arabic: "إِنَّ ٱلسَّاعَةَ ءَاتِيَةٌ أَكَادُ أُخْفِيهَا لِتُجْزَىٰ كُلُّ نَفْسٍۭ بِمَا تَسْعَىٰ",
          transcription: "Inna as-sa'ata atiyah akadu ukhfiha li-tujza kullu nafsin bima tas'a",
          translation: "“Albatta, Qiyomat keladi, Men uni deyarli yashirib qo‘yganman, har bir jon o‘z qilgan amalining javobini olishi uchun.”",
          tafsir: "Qiyomatning kelishi va har bir insonning amallari bo‘yicha hisob berilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٦",
          numberLatin: "16",
          arabic: "فَلَا يَصُدَّنَّكَ عَنْهَا مَن لَّا يُؤْمِنُ بِهَا وَٱتَّبَعَ هَوَىٰهُ فَتَرْدَىٰ",
          transcription: "Fala yasuddannaka 'anha man la yu'minu biha wattaba'a hawahu fa-tarda",
          translation: "“Shunday bo‘lsa ham, unga (Qiyomatga) ishonmaydigan va nafsiga ergashgan kishi seni undan to‘sib qo‘ymasin, yoxsa halok bo‘lib qolarsan.”",
          tafsir: "Qiyomatga ishonmaydiganlarning ta’siridan saqlanish haqida ogohlantirish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٧",
          numberLatin: "17",
          arabic: "وَمَا تِلْكَ بِيَمِينِكَ يَٰمُوسَىٰ",
          transcription: "Wa ma tilka bi-yaminika ya Musa",
          translation: "“Ey Muso, o‘ng qo‘lingdagi nima?”",
          tafsir: "Allohning Musoga (a.s) tayog‘i haqida savoli.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٨",
          numberLatin: "18",
          arabic: "قَالَ هِىَ عَصَاىَ أَتَوَكَّؤُا۟ عَلَيْهَا وَأَهُشُّ بِهَا عَلَىٰ غَنَمِى وَلِىَ فِيهَا مَـَٔارِبُ أُخْرَىٰ",
          transcription: "Qala hiya 'asaya atawakka'u 'alayha wa ahushshu biha 'ala ghanami wa liya fiha ma'aribu ukhra",
          translation: "Muso: “Bu mening tayoq‘imdir, unga suyanaman, undan qo‘ylarimga barg uzataman va unda yana boshqa manfaatlarim ham bor”, dedi.",
          tafsir: "Musoning (a.s) tayoq‘ining ahamiyati va undan foydalanish usullari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٩",
          numberLatin: "19",
          arabic: "قَالَ أَلْقِهَا يَٰمُوسَىٰ",
          transcription: "Qala alqiha ya Musa",
          translation: "Alloh: “Ey Muso, uni (tayoq‘ni) tashla”, dedi.",
          tafsir: "Musoga (a.s) tayoq‘ni tashlashni buyurish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢٠",
          numberLatin: "20",
          arabic: "فَأَلْقَىٰهَا فَإِذَا هِىَ حَيَّةٌۭ تَسْعَىٰ",
          transcription: "Fa-alqaha fa-itha hiya hayyatun tas'a",
          translation: "Muso uni tashladi, u esa ilon bo‘lib harakat qila boshladi.",
          tafsir: "Musoning (a.s) tayoq‘ining ilonga aylanish mo‘jizasi.",
          copySymbol: "📋"
      }
    ]
  },
    {
      id: 21,
      name: "Al-Anbiya",
      arabicName: "الأنبياء",
      meaning: "Payg‘ambarlar",
      ayahCount: 112,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "ٱقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِى غَفْلَةٍۢ مُّعْرِضُونَ",
          transcription: "Iqtaraba linnaasi hisaabuhum wahum fii ghaflatin mu'riduun",
          translation: "Odamlarning hisob-kitob vaqti yaqinlashdi, lekin ular g‘ofillikda yuz o‘giruvchilar",
          tafsir: "Qiyomatning yaqinligi va odamlarning beparvoligi haqida ogohlantirish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "مَا يَأْتِيهِم مِّن ذِكْرٍۢ مِّن رَّبِّهِم مُّحْدَثٍ إِلَّا ٱسْتَمَعُوهُ وَهُمْ يَلْعَبُونَ",
          transcription: "Maa ya'tiihim min dhikrin min rabbihim muhdathin illa istama'uuhu wahum yal'abuun",
          translation: "Ularning Robbilaridan yangi eslatma kelsa, uni o‘ynab-kulib tinglaydilar",
          tafsir: "Kofirlarning Qur’onni masxara qilishi va jiddiy qabul qilmasligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "لَاهِيَةً قُلُوبُهُمْ ۗ وَأَسَرُّوا۟ ٱلنَّجْوَىٰ ٱلَّذِينَ ظَلَمُوا۟",
          transcription: "Laahiyatan quluubuhum wa asarruu an-najwa alladhiina zhalamuu",
          translation: "Ularning qalblari o‘yinga botgan va zulm qilganlar yashirin suhbatlashdilar",
          tafsir: "Kofirlarning yashirin fitnalari va qalblarining g‘ofilligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "قَالُوا۟ رَبُّنَا ٱلَّذِى خَلَقَ كُلَّ شَىْءٍۢ فَهُوَ يُحْيِى وَيُمِيتُ",
          transcription: "Qaaluu rabbunaa alladhii khalaqa kulla shay'in fahuwa yuhyii wa yumiitu",
          translation: "Ular dedilar: 'Bizning Robbimiz hamma narsani yaratgan Zotdir, U tiriltiradi va o‘ldiradi'",
          tafsir: "Kofirlarning Allohning yaratuvchi ekanligini tan olishi, lekin isyonkorligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "بَلْ قَالُوا۟ أَضْغَٰثُ أَحْلَٰمٍۢ بَلِ ٱفْتَرَىٰهُ بَلْ هُوَ شَاعِرٌۭ",
          transcription: "Bal qaaluu adghaathu ahlaamin baliftaraahu, bal huwa shaa'irun",
          translation: "Yo‘q, dedilar: 'Bu tushlar g‘ovg‘osidir, uni uydirdi, u shoirdir'",
          tafsir: "Kofirlarning Qur’onni tush yoki uydirma deb rad qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "مَآ ءَامَنَتْ قَبْلَهُم مِّن قَرْيَةٍ أَهْلَكْنَٰهَآ ۖ أَفَهُمْ يُؤْمِنُونَ",
          transcription: "Maa aamanat qablahum min qaryatin ahlaknaahaa, afahum yu'minuun",
          translation: "Ulardan oldin biror shahar biz halok qilgan bo‘lsa, iymon keltirmadi, endi ular iymon keltiradimi?",
          tafsir: "O‘tgan ummatlarning inkor qilishi va halok bo‘lishi misoli.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "وَمَآ أَرْسَلْنَا قَبْلَكَ إِلَّا رِجَالًۭا نُّوحِىٓ إِلَيْهِمْ",
          transcription: "Wamaa arsalnaa qablaka illaa rijaalan nuuhii ilayhim",
          translation: "Sendan oldin faqat erkaklarga vahiy yubordik",
          tafsir: "Payg‘ambarlarning insonlardan ekanligi va vahiy orqali yuborilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "وَمَا جَعَلْنَٰهُمْ جَسَدًۭا لَّا يَأْكُلُونَ ٱلطَّعَامَ",
          transcription: "Wamaa ja'alnaahum jasadan laa ya'kuluuna at-ta'aam",
          translation: "Biz ularni taom yemaydigan jasad qilmadik",
          tafsir: "Payg‘ambarlarning oddiy inson ekanligi, ovqat yeyishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "ثُمَّ صَدَقْنَٰهُمُ ٱلْوَعْدَ فَأَنجَيْنَٰهُمْ وَمَن نَّشَآءُ",
          transcription: "Thumma sadaqnaahumu al-wa'da fa-anjaynaahum wa man nashaa'u",
          translation: "So‘ngra ularga va’damizni ro‘yobga chiqardik va ularni va xohlaganlarni najot berdik",
          tafsir: "Allohning payg‘ambarlarga yordami va va’dasi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "قَدْ أَنزَلْنَآ إِلَيْكُمْ كِتَٰبًۭا فِيهِ ذِكْرُكُمْ",
          transcription: "Qad anzalnaa ilaykum kitaaban fiihi dhikrukum",
          translation: "Sizlarga o‘z eslatmangiz bo‘lgan Kitob nozil qildik",
          tafsir: "Qur’onning insonlar uchun hidoyat va eslatma ekanligi.",
          copySymbol: "📋"
        },
          {
            numberArabic: "١١",
            numberLatin: "11",
            arabic: "وَكَمْ قَصَمْنَا مِن قَرْيَةٍۢ كَانَتْ ظَالِمَةًۭ وَأَنشَأْنَا بَعْدَهَا قَوْمًا ءَاخَرِينَ",
            transcription: "Wa kam qasamna min qaryatin kanat zalimatan wa ansha'na ba'daha qawman akharin",
            translation: "Biz qancha zolim qishloqlarni qulab tushirdik va ularning o‘rniga boshqa qavmlarni paydo qildik.",
            tafsir: "Allohning zolim qavmlarni halok qilishi va ularning o‘rniga yangi qavmlarni keltirishi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٢",
            numberLatin: "12",
            arabic: "فَلَمَّآ أَحَسُّوا بَأْسَنَآ إِذَا هُم مِّنْهَا يَرْكُضُونَ",
            transcription: "Falamma ahassu ba'sana idha hum minha yarkudun",
            translation: "Qachonki ular azobimizni his qilishsa, darhol undan qochishga tushishardi.",
            tafsir: "Azobni his qilgan zolimlarning qochishga urinishi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٣",
            numberLatin: "13",
            arabic: "لَا تَرْكُضُوا۟ وَٱرْجِعُوٓا۟ إِلَىٰ مَآ أُتْرِفْتُمْ فِيهِ وَمَسَٰكِنِكُمْ لَعَلَّكُمْ تُسْـَٔلُونَ",
            transcription: "La tarkudu warji'u ila ma utriftum fihi wa masakinikum la'allakum tus'alun",
            translation: "(Ularga aytilardi): “Qochmanglar, isrof qilib yurgan ne’matlaringizga va uylaringizga qaytinglar, ehtimol so‘roq qilinursizlar.”",
            tafsir: "Azob qo‘rqusida qochayotganlarga murojaat.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٤",
            numberLatin: "14",
            arabic: "قَالُوا۟ يَٰوَيْلَنَآ إِنَّا كُنَّا ظَٰلِمِينَ",
            transcription: "Qalu ya waylana inna kunna zalimin",
            translation: "Ular: “Voy halok bo‘lganimizga, albatta biz zolim bo‘lganmiz”, deyishardi.",
            tafsir: "Azobni ko‘rgan kufr ehlining pushaymonligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٥",
            numberLatin: "15",
            arabic: "فَمَا زَالَت تِّلْكَ دَعْوَىٰهُمْ حَتَّىٰ جَعَلْنَٰهُمْ حَصِيدًۭا خَٰمِدِينَ",
            transcription: "Fama zalat tilka da'wahum hatta ja'alnahum hasidan khamidin",
            translation: "Ular bu faryodlarini qilishda davom etishardi, toki Biz ularni o‘tlangan ekin singari qilib tashlamagunimizcha.",
            tafsir: "Kufr ehlinining doimiy nolasi va ularning butunlay halok bo‘lishi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٦",
            numberLatin: "16",
            arabic: "وَمَا خَلَقْنَا ٱلسَّمَآءَ وَٱلْأَرْضَ وَمَا بَيْنَهُمَا لَٰعِبِينَ",
            transcription: "Wa ma khalaqna as-sama'a wal-arda wa ma baynahuma la'ibin",
            translation: "Biz osmonlar va Yerni va ular orasidagi narsalarni o‘yin-kulgi uchun yaratgan emasmiz.",
            tafsir: "Olamlarning yaratilishining ulug‘ maqsadi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٧",
            numberLatin: "17",
            arabic: "لَوْ أَرَدْنَآ أَن نَّتَّخِذَ لَهْوًۭا لَّٱتَّخَذْنَٰهُ مِن لَّدُنَّآ إِن كُنَّا فَٰعِلِينَ",
            transcription: "Law aradna an nattakhidha lahwan lattakhadhnahu min ladunna in kunna fa'ilin",
            translation: "Agar Biz o‘yin-kulgini istagan bo‘lsak, albatta uni O‘z huzurimizdan qilib olar edik, agar Biz qiluvchi bo‘lsak.",
            tafsir: "Allohning o‘yin-kulgi uchun hech narsaga muhtoj emasligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٨",
            numberLatin: "18",
            arabic: "بَلْ نَقْذِفُ بِٱلْحَقِّ عَلَى ٱلْبَٰطِلِ فَيَدْمَغُهُۥ فَإِذَا هُوَ زَاهِقٌۭ ۚ وَلَكُمُ ٱلْوَيْلُ مِمَّا تَصِفُونَ",
            transcription: "Bal naqdhifu bil-haqqi 'ala al-batili fa-yadmaghuhu fa-itha huwa zahiqun wa lakumu al-waylu mimma tasifun",
            translation: "Balki Biz haqni botilga otamiz, u uni yorib yuboradi va botil yo‘q bo‘lib ketadi. Sizning (Allohga) nisbat bergan (yolg‘on)laringiz uchun esa halokat bo‘lsin.",
            tafsir: "Haqning botilni yengishi va mushriklarning azobga duchor bo‘lishi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٩",
            numberLatin: "19",
            arabic: "وَلَهُۥ مَن فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ ۚ وَمَنْ عِندَهُۥ لَا يَسْتَكْبِرُونَ عَنْ عِبَادَتِهِۦ وَلَا يَسْتَحْسِرُونَ",
            transcription: "Wa lahu man fi as-samawati wal-ardi wa man 'indahu la yastakbiruna 'an 'ibadatihi wa la yastahsirun",
            translation: "Osmonlarda va Yerdagi barcha mavjudotlar Unga tegishlidir. Uning huzuridagi (farishtalar) Unga ibodat qilishdan mag‘rurlik qilmaydilar va charchamaydilar.",
            tafsir: "Butun mavjudotning Allohga bo‘ysunishi va farishtalarning doimiy ibodati.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٢٠",
            numberLatin: "20",
            arabic: "يُسَبِّحُونَ ٱلَّيْلَ وَٱلنَّهَارَ لَا يَفْتُرُونَ",
            transcription: "Yusabbihuna al-layla wa an-nahara la yafturun",
            translation: "Ular kechayu kunduz Allohni poklaydilar va (bunda) sustlashmaydilar.",
            tafsir: "Farishtalarning uzluksiz tasbehi.",
            copySymbol: "📋"
        }
      ]
    },
    {
      id: 22,
      name: "Al-Hajj",
      arabicName: "الحج",
      meaning: "Haj",
      ayahCount: 78,
      place: "Madina",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "يَٰٓأَيُّهَا ٱلنَّاسُ ٱتَّقُوا۟ رَبَّكُمْ ۚ إِنَّ زَلْزَلَةَ ٱلسَّاعَةِ شَىْءٌ عَظِيمٌۭ",
          transcription: "Yaa ayyuhaa an-naasu ittaquu rabbakum inna zalzalata as-saa'ati shay'un 'azhiim",
          translation: "Ey odamlar, Robbingizdan qo‘rqing, albatta qiyomatning zilzilasi ulkan narsadir",
          tafsir: "Qiyomatning dahshatli voqealari va taqvoning muhimligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "يَوْمَ تَرَوْنَهَا تَذْهَلُ كُلُّ مُرْضِعَةٍ عَمَّآ أَرْضَعَتْ",
          transcription: "Yawma tarawnahaa tadhhalu kullu murdi'atin 'ammaa arda'at",
          translation: "Uni ko‘rgan kuni har bir emizikli ayol emizayotganini unutadi",
          tafsir: "Qiyomatning odamlarga ta’siri va dahshatliligi tasvirlanadi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "وَمِنَ ٱلنَّاسِ مَن يُجَٰدِلُ فِى ٱللَّهِ بِغَيْرِ عِلْمٍۢ",
          transcription: "Wa mina an-naasi man yujaadilu fi illahi bighayri 'ilmin",
          translation: "Odamlar orasida Alloh haqida ilmsiz bahslashadiganlar bor",
          tafsir: "Kofirlarning ilmsiz bahs qilishi va adashishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "كُتِبَ عَلَيْهِ أَنَّهُۥ مَن تَوَلَّاهُ فَأَنَّهُۥ يُضِلُّهُۥ",
          transcription: "Kutiba 'alayhi annahu man tawaallaahu fa-annahu yudilluhu",
          translation: "Unga shunday yozildiki, kim unga ergashsa, uni adashtiradi",
          tafsir: "Shaytonning odamlarni adashtirishi haqida ogohlantirish.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "يَٰٓأَيُّهَا ٱلنَّاسُ إِن كُنتُمْ فِى رَيْبٍۢ مِّنَ ٱلْبَعْثِ",
          transcription: "Yaa ayyuhaa an-naasu in kuntum fii raybin mina al-ba'athi",
          translation: "Ey odamlar, agar tirilishdan shubhada bo‘lsangiz",
          tafsir: "Insonning yaratilishi va qayta tirilishi haqida dalil.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "ذَٰلِكَ بِأَنَّ ٱللَّهَ هُوَ ٱلْحَقُّ وَأَنَّهُ يُحْيَى ٱلْمَوْتَىٰ",
          transcription: "Dhaalika bi-anna allaaha huwa al-haqqu wa annahu yuhyil mawtaa",
          translation: "Buni Allohning haq ekanligi va o‘liklarni tiriltirishi bilan bil",
          tafsir: "Allohning qudrati va qayta tiriltirish haqiqati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "وَأَنَّ ٱلسَّاعَةَةَ ءَاتِيَةٌ لَّا رَيْبَ فِيهَِا ۚ",
          transcription: "Wa anna anna as-saa'ata aatiyatan laa rayba fiihaa",
          translation: "Wa ra qiyomat kiyatun, unda shubha yo‘q",
          tafsir: "Qiyomatning muqarrar ekanligi va shubhasizligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "وَمِنَ ٱلنَّاسِ مَن يُجَٰدِلُ فِى ٱللَّهِ بِغَيْرِ عِلْمٍۢ وَلَا هُدًى",
          transcription: "Wa mina an-naasi man yujaadilu fi illahi bighayri 'ilmin wa laa hudan",
          translation: "Odamlar orasida Alloh haqida ilmsiz va hidoyatsiz bahslashadiganlar bor",
          tafsir: "Kofirlarning ilmsiz va hidoyatsiz bahslari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "يَعْرِضُونَ عَنْهَا كَأَنَّهُمْ حُمُرٌۭ مُّسْتَنْفَرَةٌ",
          transcription: "Ya'riduuna 'anhaa ka'annahum humurun mustanfiratun",
          translation: "Ular undan yuz o‘girishadi, xuddi qo‘rqib qochgan eshaklar kabi",
          tafsir: "Kofirlarning haqdan qochishi tasvirlanadi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "ذَٰلِكَ بِمَا قَدَّمَتْ أَيْدِيكُمْ وَأَنَّ ٱللَّهَ لَيْسَ بِظَلَّٰمٍ لِّلْعَبَادِ",
          transcription: "Dhaalika qamaa qaddamat aydiikum wa anna allaaha laysa bizhallaamin lil-'ibaad",
          translation: "Bu qo‘llaringiz qilgan ishingiz tufayli, Alloh bandalarga zulm qiluvchi emas",
          tafsir: "Insonning o‘z amallari tufayli jazo topishi va Allohning adolati.",
          copySymbol: "📋"
        },
          {
            numberArabic: "١١",
            numberLatin: "11",
            arabic: "وَمِنَ ٱلنَّاسِ مَن يَعْبُدُ ٱللَّهَ عَلَىٰ حَرْفٍۢ ۖ فَإِنْ أَصَابَهُۥ خَيْرٌ ٱطْمَأَنَّ بِهِۦ ۖ وَإِنْ أَصَابَتْهُ فِتْنَةٌ ٱنقَلَبَ عَلَىٰ وَجْهِهِۦ خَسِرَ ٱلدُّنْيَا وَٱلْـَٔاخِرَةَ ۚ ذَٰلِكَ هُوَ ٱلْخُسْرَانُ ٱلْمُبِينُ",
            transcription: "Wa min an-nasi man ya'budu Allaha 'ala harfin fa-in asabahu khayrun itmaanna bihi wa-in asabat-hu fitnatun inqalaba 'ala wajhihi khasira ad-dunya wal-akhirah dhalika huwa al-khusran al-mubin",
            translation: "Odamlardan baʼzilari Allohga bir chekkada (noaniq eʼtiqod bilan) ibodat qiladilar. Agar unga yaxshilik yetib kelsa, unga ishonch hosil qiladi. Agar unga biror fitna (bali) yetib kelsa, yuzi ustiga agʻdarilib ketadi. U dunyo va oxiratda ziyon koʻradi. Ana oʻsha — ochiq-oydin ziyon!",
            tafsir: "Noaniq eʼtiqodli insonlarning holati va ularning oxirati haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٢",
            numberLatin: "12",
            arabic: "يَدْعُوا۟ مِن دُونِ ٱللَّهِ مَا لَا يَضُرُّهُۥ وَمَا لَا يَنفَعُهُۥ ۚ ذَٰلِكَ هُوَ ٱلضَّلَٰلُ ٱلْبَعِيدُ",
            transcription: "Yad'u min duni Allahi ma la yadurruhu wa ma la yanfa'uhu dhalika huwa ad-dalal al-ba'id",
            translation: "U Allohdan oʻzga unga ziyo yetkazmaydigan va foyda bermaydigan narsalarga ibodat qiladi. Ana oʻsha — uzoq adashish!",
            tafsir: "Butlarga ibodat qilishning behudaligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٣",
            numberLatin: "13",
            arabic: "يَدْعُوا۟ لَمَن ضَرُّهُۥٓ أَقْرَبُ مِن نَّفْعِهِۦ ۚ لَبِئْسَ ٱلْمَوْلَىٰ وَلَبِئْسَ ٱلْعَشِيرُ",
            transcription: "Yad'u liman darruhu aqrabu min naf'ihi la bi'sa al-mawla wa la bi'sa al-'ashir",
            translation: "U ziyosi foydasidan yaqin boʻlgan (but)ga ibodat qiladi. U qanday yomon homiy va qanday yomon hamroh!",
            tafsir: "Butlarning insonga foydasiz va hatto zararli ekanligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٤",
            numberLatin: "14",
            arabic: "إِنَّ ٱللَّهَ يُدْخِلُ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ جَنَّٰتٍۢ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَٰرُ ۚ إِنَّ ٱللَّهَ يَفْعَلُ مَا يُرِيدُ",
            transcription: "Inna Allaha yudkhilu alladhina amanu wa 'amilu as-salihati jannatin tajri min tahtiha al-anhar inna Allaha yaf'alu ma yurid",
            translation: "Albatta, Alloh imon keltirgan va solih amallar qilganlarni ostidan daryolar oqadigan jannatlarga kiritur. Albatta, Alloh oʻzi xohlagan narsani qilur.",
            tafsir: "Mominlar uchun jannat vaʼdi va Allohning irodasi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٥",
            numberLatin: "15",
            arabic: "مَن كَانَ يَظُنُّ أَن لَّن يَنصُرَهُ ٱللَّهُ فِى ٱلدُّنْيَا وَٱلْءَاخِرَةِ فَلْيَمْدُدْ بِسَبَبٍ إِلَى ٱلسَّمَآءِ ثُمَّ لْيَقْطَعْ فَلْيَنظُرْ هَلْ يُذْهِبَنَّ كَيْدُهُۥ مَا يَغِيظُ",
            transcription: "Man kana yazunnu an lan yansurahu Allahu fi ad-dunya wal-akhirati fal-yamdud bi-sababin ila as-sama'i thumma li-yaqta' fal-yanzur hal yuzhibanna kayduhu ma yaghiyz",
            translation: "Kim Alloh uni dunyoda va oxiratda yordamlamas deb oʻylasa, osmonga arqon choʻzib (oʻzini osib) oʻldirsin, keyin qarasin, uning hiylasi gʻazabini ketkazadimi?!",
            tafsir: "Allohning yordami haqida mushriklarning notoʻgʻri fikrlari.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٦",
            numberLatin: "16",
            arabic: "وَكَذَٰلِكَ أَنزَلْنَٰهُ ءَايَٰتٍۭ بَيِّنَٰتٍۢ وَأَنَّ ٱللَّهَ يَهْدِى مَن يُرِيدُ",
            transcription: "Wa kadhalika anzalnahu ayatin bayyinatin wa anna Allaha yahdi man yurid",
            translation: "Shunday qilib Biz uni (Qurʼonni) ochiq-oydin oyatlar sifatida nozil qildik. Albatta, Alloh oʻzi xohlagan kishini hidoyatga boshlaydi.",
            tafsir: "Qurʼonning ochiq oyatlar sifatida nozil qilinishi va hidoyat Allohdan ekanligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٧",
            numberLatin: "17",
            arabic: "إِنَّ ٱلَّذِينَ ءَامَنُوا۟ وَٱلَّذِينَ هَادُوا۟ وَٱلصَّٰبِـِٔينَ وَٱلنَّصَٰرَىٰ وَٱلْمَجُوسَ وَٱلَّذِينَ أَشْرَكُوٓا۟ إِنَّ ٱللَّهَ يَفْصِلُ بَيْنَهُمْ يَوْمَ ٱلْقِيَٰمَةِ ۚ إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍۢ شَهِيدٌ",
            transcription: "Inna alladhina amanu walladhina hadu was-sabi'ina wan-nasara wal-majusa walladhina ashraku inna Allaha yafsilu baynahum yawma al-qiyamati inna Allaha 'ala kulli shay'in shahid",
            translation: "Albatta, imon keltirganlar, yahudiylar, sobiylar, nasroniylar, majusiylar va mushriklar (qiyomat kuni) haqida, albatta, Alloh ular orasida hukm qilur. Albatta, Alloh har bir narsaga guvohdir.",
            tafsir: "Turli din vakillari orasida qiyomat kuni ajratish.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٨",
            numberLatin: "18",
            arabic: "أَلَمْ تَرَ أَنَّ ٱللَّهَ يَسْجُدُ لَهُۥ مَن فِى ٱلسَّمَٰوَٰتِ وَمَن فِى ٱلْأَرْضِ وَٱلشَّمْسُ وَٱلْقَمَرُ وَٱلنُّجُومُ وَٱلْجِبَالُ وَٱلشَّجَرُ وَٱلدَّوَآبُّ وَكَثِيرٌۭ مِّنَ ٱلنَّاسِ ۖ وَكَثِيرٌ حَقَّ عَلَيْهِ ٱلْعَذَابُ ۗ وَمَن يُهِنِ ٱللَّهُ فَمَا لَهُۥ مِن مُّكْرِمٍ ۚ إِنَّ ٱللَّهَ يَفْعَلُ مَا يَشَآءُ ۩",
            transcription: "Alam tara anna Allaha yasjudu lahu man fi as-samawati wa man fi al-ardi wash-shamsu wal-qamaru wan-nujumu wal-jibalu wash-shajaru wa ad-dawabbu wa kathirun min an-nasi wa kathirun haqqa 'alayhi al-'adhab wa man yuhini Allahu fama lahu min mukrimin inna Allaha yaf'alu ma yasha'",
            translation: "Koʻrmadingmi, osmonlarda va yerdagi barcha mavjudotlar, quyosh, oy, yulduzlar, togʻlar, daraxtlar, hayvonlar va insonlarning koʻpchiligi Allohga sajda qilishini?! Koʻpchilikka esa azob haqq boʻlgan. Alloh kimsani xor qilsa, uni hech kim qadrlamaydi. Albatta, Alloh oʻzi xohlagan narsani qilur.",
            tafsir: "Butun mavjudotning Allohga sajda qilishi va insonlarning turli taqdiri.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٩",
            numberLatin: "19",
            arabic: "هَٰذَانِ خَصْمَانِ ٱخْتَصَمُوا۟ فِى رَبِّهِمْ ۖ فَٱلَّذِينَ كَفَرُوا۟ قُطِّعَتْ لَهُمْ ثِيَابٌۭ مِّن نَّارٍۢ يُصَبُّ مِن فَوْقِ رُءُوسِهِمُ ٱلْحَمِيمُ",
            transcription: "Hadhani khasmani ikhtasamu fi rabbihim falladhina kafaru qutti'at lahum thiyabun min narin yusabbu min fawqi ru'usihimu al-hamim",
            translation: "Bu ikki tomon (momin va kofir) Rabbilari haqida bahslashdilar. Kofirlarga olovdan kiyimlar qilib qoʻyiladi, ularning boshidan qaynoq suv quyiladi.",
            tafsir: "Momin va kofirlarning bahsi va kofirlarning jahannamdagi azobi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٢٠",
            numberLatin: "20",
            arabic: "يُصْهَرُ بِهِۦ مَا فِى بُطُونِهِمْ وَٱلْجُلُودُ",
            transcription: "Yus-haru bihi ma fi butunihim wal-julud",
            translation: "U (suv) bilan ularning ichidagi narsalar va terilari eritiladi.",
            tafsir: "Jahannam azobining qattiqligi haqida.",
            copySymbol: "📋"
        }
      ]
    },
    {
      id: 23,
      name: "Al-Mu'minun",
      arabicName: "المؤمنون",
      meaning: "Mo‘minlar",
      ayahCount: 118,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "قَدْ أَفْلَحَ ٱلْمُؤْمِنُونَ",
          transcription: "Qad aflaha al-mu'minuun",
          translation: "Albatta, mo‘minlar najot topdilar",
          tafsir: "Haqiqiy mo‘minlarning muvaffaqiyatga erishishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "ٱلَّذِينَ هُمْ فِى صَلَاتِهِمْ خَٰشِعُونَ",
          transcription: "Alladhiina hum fii salaatihim khaashi'uun",
          translation: "Ular namozlarida xushu’ bilan bo‘ladilar",
          tafsir: "Mo‘minlarning namozda xushulik sifati tasvirlanadi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "وَٱلَّذِينَ هُمْ عَنِ ٱللَّغْوِ مُعْرِضُونَ",
          transcription: "Walladhiina hum 'ani allaghwi mu'riduun",
          translation: "Ular bo‘sh ishlar va so‘zlardan yuz o‘giruvchilardir",
          tafsir: "Mo‘minlarning foydasiz ishlardan qochishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "وَٱلَّذِينَ هُمْ لِلزَّكَوٰةِ فَٰعِلُونَ",
          transcription: "Walladhiina hum lizzakaati faa'iluun",
          translation: "Ular zakotni ado qiluvchilardir",
          tafsir: "Mo‘minlarning zakot berishdagi faolligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "وَٱلَّذِينَ هُمْ لِفُرُوجِهِمْ حَٰفِظُونَ",
          transcription: "Walladhiina hum lifuruujihim haafizhuun",
          translation: "Ular o‘z farjlarini (iffatlarini) saqlovchilardir",
          tafsir: "Mo‘minlarning axloqiy pokligi va iffati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "إِلَّا عَلَىٰٓ أَزْوَٰجِهِمْ أَوْ مَا مَلَكَتْ أَيْمَٰنُهُمْ",
          transcription: "Illaa 'alaa azwaajihim aw maa malakat aymaanuhum",
          translation: "Faqat o‘z xotinlari yoki qo‘l ostidagilariga (ruxsat berilgan)",
          tafsir: "Mo‘minlarning halol doirada o‘zlarini saqlashi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "فَمَنِ ٱبْتَغَىٰ وَرَآءَ ذَٰلِكَ فَأُو۟لَٰٓئِكَ هُمُ ٱلْعَادُونَ",
          transcription: "Famani ibtaghaa waraa'a dhaalika fa-ulaa'ika humu al-'aaduun",
          translation: "Kim bundan boshqasini izlasa, ular haddan o‘tuvchilardir",
          tafir: "Haloldan tashqari harom yo‘l izlashning taqiqlanishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "وَٱلَّذِينَ هُمْ لِأَمَٰنَٰتِهِمْ وَعَهْدِهِمْ رَٰعُونَ",
          transcription: "Walladhiina hum li-amaanatihim wa 'ahdihim raa'uun",
          translation: "Ular o‘z amonatlari va ahdlarini rioya qiluvchilardir",
          tafsir: "Mo‘minlarning ishonchli va va’daga vifo qilishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "وَٱلَّذِينَ هُمْ عَلَىٰ صَلَوَٰتِهِمْ يُحَافِظُونَ",
          transcription: "Walladhiina hum 'alaa salawaatihim yuhaafizhuun",
          translation: "Ular namozlarini muhofaza qiluvchilardir",
          tafsir: "Mo‘minlarning namozni doimiy ravishda ado qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "أُو۟لَٰٓئِكَ هُمُ ٱلْوَٰرِثُونَ",
          transcription: "Ulaa'ika humu al-waarithuun",
          translation: "Aynan ular voris bo‘luvchilardir",
          tafsir: "Mo‘minlarning jannatga voris bo‘lishi haqida.",
          copySymbol: "📋"
        },
          {
            numberArabic: "١١",
            numberLatin: "11",
            arabic: "ٱلَّذِينَ يَرِثُونَ ٱلْفِرْدَوْسَ هُمْ فِيهَا خَٰلِدُونَ",
            transcription: "Alladhina yarithuna al-firdawsa hum fiha khalidun",
            translation: "Ular Firdavsni meros qilib oladilar va u yerda abadiy qoladilar.",
            tafsir: "Mominlar uchun Firdavs jannati va abadiylik.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٢",
            numberLatin: "12",
            arabic: "وَلَقَدْ خَلَقْنَا ٱلْإِنسَٰنَ مِن سُلَٰلَةٍۢ مِّن طِينٍۢ",
            transcription: "Wa laqad khalaqna al-insana min sulalatin min tin",
            translation: "Biz insonni loyning xulosasidan yaratdik.",
            tafsir: "Insonning loydan yaratilishi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٣",
            numberLatin: "13",
            arabic: "ثُمَّ جَعَلْنَٰهُ نُطْفَةًۭ فِى قَرَارٍۢ مَّكِينٍۢ",
            transcription: "Thumma ja'alnahu nutfatan fi qararin makin",
            translation: "Keyin uni mustahkam joyga (bachadonga) nutfa qildik.",
            tafsir: "Insonning rivojlanish bosqichlari.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٤",
            numberLatin: "14",
            arabic: "ثُمَّ خَلَقْنَا ٱلنُّطْفَةَ عَلَقَةًۭ فَخَلَقْنَا ٱلْعَلَقَةَ مُضْغَةًۭ فَخَلَقْنَا ٱلْمُضْغَةَ عِظَٰمًۭا فَكَسَوْنَا ٱلْعِظَٰمَ لَحْمًۭا ثُمَّ أَنشَأْنَٰهُ خَلْقًۭا ءَاخَرَ ۚ فَتَبَارَكَ ٱللَّهُ أَحْسَنُ ٱلْخَٰلِقِينَ",
            transcription: "Thumma khalaqna an-nutfata 'alaqatan fa khalaqna al-'alaqata mudghatan fa khalaqna al-mudghata 'izaman fa kasawna al-'izama lahman thumma ansha'nahu khalqan akhara fa tabaraka Allahu ahsanu al-khaliqin",
            translation: "Keyin nutfani alaqa (lokalangan qon)ga, alaqani mudg'a (chaynalgan go'sht)ga, mudg'ani suyaklarga aylantirdik va suyaklarni go'sht bilan qopladik. Keyin uni boshqa bir maxluq qildik. Xudo barakotli Zotdir, eng yaxshi yaratuvchidir.",
            tafsir: "Insonning embrional rivojlanishi va Allohning qudrati.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٥",
            numberLatin: "15",
            arabic: "ثُمَّ إِنَّكُم بَعْدَ ذَٰلِكَ لَمَيِّتُونَ",
            transcription: "Thumma innakum ba'da dhalika la-mayyitun",
            translation: "Keyin siz shundan keyin albatta o'lursiz.",
            tafsir: "Insonning o'limi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٦",
            numberLatin: "16",
            arabic: "ثُمَّ إِنَّكُمْ يَوْمَ ٱلْقِيَٰمَةِ تُبْعَثُونَ",
            transcription: "Thumma innakum yawma al-qiyamati tub'athun",
            translation: "Keyin siz qiyomat kuni tiriltirilursiz.",
            tafsir: "Qiyomat kuni tirilish haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٧",
            numberLatin: "17",
            arabic: "وَلَقَدْ خَلَقْنَا فَوْقَكُمْ سَبْعَ طَرَآئِقَ وَمَا كُنَّا عَنِ ٱلْخَلْقِ غَٰفِلِينَ",
            transcription: "Wa laqad khalaqna fawqakum sab'a tara'iq wa ma kunna 'an al-khalqi ghafilin",
            translation: "Biz sizning ustingizda yetti yo'l (osmon) yaratdik va Biz yaratishdan g'afil emasmiz.",
            tafsir: "Osmonlarning yaratilishi va Allohning har bir narsaga e'tibori.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٨",
            numberLatin: "18",
            arabic: "وَأَنزَلْنَا مِنَ ٱلسَّمَآءِ مَآءًۢ بِقَدَرٍۢ فَأَسْكَنَّٰهُ فِى ٱلْأَرْضِ ۖ وَإِنَّا عَلَىٰ ذَهَابٍۭ بِهِۦ لَقَٰدِرُونَ",
            transcription: "Wa anzalna min as-sama'i ma'an bi-qadarin fa askannahu fi al-ardi wa inna 'ala dhahabin bihi la-qadirun",
            translation: "Biz osmondan muayyan miqdorda suv tushirdik va uni yerga joylashtirdik. Albatta, Biz uni olib ketishga qodirmiz.",
            tafsir: "Suvning nozil qilinishi va Allohning qudrati.",
            copySymbol: "📋"
          },
            {
              numberArabic: "١٩",
              numberLatin: "19",
              arabic: "فَأَنشَأْنَا لَكُم بِهِۦ جَنَّٰتٍۢ مِّن نَّخِيلٍۢ وَأَعْنَٰبٍۢ لَّكُمْ فِيهَا فَوَٰكِهُ كَثِيرَةٌۭ وَمِنْهَا تَأْكُلُونَ",
              transcription: "Fa ansha'na lakum bihi jannatin min nakhiilin wa a'nabin lakum fiha fawakihu kathiratun wa minha ta'kulun",
              translation: "Biz uning (suvning) bilan sizlar uchun xurmo va uzum bog'lari yaratdik. Ularda sizlar uchun ko'p mevalar bor va siz ulardan yeysizlar.",
              tafsir: "Allohning ne'matlari va mevalarning yaratilishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢٠",
              numberLatin: "20",
              arabic: "وَشَجَرَةًۭ تَخْرُجُ مِن طُورِ سَيْنَآءَ تَنۢبُتُ بِٱلدُّهْنِ وَصِبْغٍۢ لِّلْءَاكِلِينَ",
              transcription: "Wa shajaratan takhruju min turi saynaa'a tanbutu bid-duhni wa sibghin lil-akilin",
              translation: "Biz Sina' tog'idan chiqadigan, yog' (zaytun yog'i) va yeyuvchilar uchun ziravor beradigan daraxt (zaytun)ni ham yaratdik.",
              tafsir: "Zaytun daraxti va uning foydalari haqida.",
              copySymbol: "📋"
        }
      ]
    },
    {
      id: 24,
      name: "An-Nur",
      arabicName: "النور",
      meaning: "Nur",
      ayahCount: 64,
      place: "Madina",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "سُورَةٌ أَنزَلْنَٰهَا وَفَرَضْنَٰهَا وَأَنزَلْنَا فِيهَآ ءَايَٰتٍۢ بَيِّنَٰتٍ",
          transcription: "Suuratun anzalnaahaa wa faradnaahaa wa anzalnaa fiihaa aayaatin bayyinaat",
          translation: "Bu sura, uni nozil qildik va farz qildik, unda aniq oyatlar nozil qildik",
          tafsir: "Suraning farz qilinishi va aniq ko‘rsatmalar haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "ٱلزَّانِيَةُ وَٱلزَّانِى فَٱجْلِدُوا۟ كُلَّ وَٰحِدٍۢ مِّنْهُمَا مِا۟ئَةَ جَلْدَةٍۢ",
          transcription: "Az-zaaniyatu waz-zaanii fajlidu kulla waahidin minhuma mi'ata jaldatin",
          translation: "Zinokor ayol va zinokor erkakka yuz darradan uriladi",
          tafsir: "Zinoning jazosi va ijtimoiy tartibni saqlash haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "ٱلزَّانِى لَا يَنكِحُ إِلَّا زَانِيَةً أَوْ مُشْرِكَةًۭ",
          transcription: "Az-zaanii laa yankihu illaa zaaniyatan aw mushrikatan",
          translation: "Zinokor faqat zinokor ayol yoki mushrika bilan nikohlanadi",
          tafsir: "Zinokorlarning nikoh masalasi va axloqiy poklik haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "وَٱلَّذِينَ يَرْمُونَ ٱلْمُحْصَنَٰتِ ثُمَّ لَمْ يَأْتُوا۟ بِأَرْبَعَةِ شُهَدَآءَ",
          transcription: "Walladhiina yarmuuna al-muhsanaati thumma lam ya'tuu bi-arba'ati shuhadaa'",
          translation: "Pok ayollarga tuhmat qilganlar, so‘ng to‘rt guvoh keltirmasa",
          tafsir: "Tuhtan qilishning jiddiy jazosi va adolat haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "إِلَّا ٱلَّذِينَ تَابُوا۟ مِنۢ بَعْدِ ذَٰلِكَ وَأَصْلَحُوا۟",
          transcription: "Illaa alladhiina taabuu min ba'di dhaalika wa aslahu",
          translation: "Faqat bundan keyin tavba qilib, isloh qilganlar mustasno",
          tafsir: "Tavba qilganlarning kechirilishi va Allohning rahmati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "وَٱلَّذِينَ يَرْمُونَ أَزْوَٰجَهُمْ وَلَمْ يَكُن لَّهُمْ شُهَدَآءُ إِلَّآ أَنفُسُهُمْ",
          transcription: "Walladhiina yarmuuna azwaajahum walam yakun lahum shuhadaa'u illaa anfusuhum",
          translation: "O‘z xotinlariga tuhmat qilganlar va guvohi o‘zlaridan boshqa bo‘lmasa",
          tafsir: "Li’an qasami va nikohdagi adolat haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "فَشَهَٰدَةُ أَحَدِهِمْ أَرْبَعُ شَهَٰدَٰتٍۢ بِٱللَّهِ إِنَّهُۥ لَمِنَ ٱلصَّٰدِقِينَ",
          transcription: "Fashahaadatu ahadihim arba'u shahaadaatin billahi innahu lamin as-saadiqiin",
          translation: "Ulardan birining guvohligi Alloh nomiga to‘rt qasamdir, u rostgo‘ylardan",
          tafsir: "Li’an jarayonidagi qasamning ahamiyati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "وَٱلْخَٰمِسَةُ أَنَّ لَعْنَتَ ٱللَّهِ عَلَيْهِ إِن كَانَ مِنَ ٱلْكَٰذِبِينَ",
          transcription: "Wal-khaamisatu anna la'nata allaahi 'alayhi in kaana mina al-kaadhibiin",
          translation: "Beshinchisi Allohning la’nati yolg‘onchilarga bo‘lsin deb qasamdir",
          tafsir: "Li’anning yakuniy qasami va oqibatlari.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "وَيَدْرَؤُا۟ عَنْهَا ٱلْعَذَابَ أَن تَشْهَدَ أَرْبَعَ شَهَٰدَٰتٍۢ بِٱللَّهِ",
          transcription: "Wa yadra'u 'anhaa al-'adhaaba an tashhada arba'a shahaadaatin billahi",
          translation: "Ayolning jazodan qutulishi uchun Alloh nomiga to‘rt qasam qilishi",
          tafsir: "Ayolning li’an qasami orqali himoyasi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "وَلَوْلَا فَضْلُ ٱللَّهِ عَلَيْكُمْ وَرَحْمَتُهُۥ وَأَنَّ ٱللَّهَ تَوَّابٌ حَكِيمٌ",
          transcription: "Walawlaa fadlu allaahi 'alaykum wa rahmatuhu wa anna allaaha tawwaabun hakiim",
          translation: "Agar Allohning fazli va rahmati bo‘lmaganda, U tavba qiluvchilarni qabul qiluvchi va hikmatli",
          tafsir: "Allohning rahmati va adolatli hukmlari haqida.",
          copySymbol: "📋"
        },
          {
            "numberArabic": "١١",
            "numberLatin": "11",
            "arabic": "إِنَّ ٱلَّذِينَ جَآءُو بِٱلْإِفْكِ عُصْبَةٌۭ مِّنكُمْ ۚ لَا تَحْسَبُوهُ شَرًّۭا لَّكُم ۖ بَلْ هُوَ خَيْرٌۭ لَّكُمْ ۚ لِكُلِّ ٱمْرِئٍۢ مِّنْهُم مَّا ٱكْتَسَبَ مِنَ ٱلْإِثْمِ ۚ وَٱلَّذِى تَوَلَّىٰ كِبْرَهُۥ مِنْهُمْ لَهُۥ عَذَابٌ عَظِيمٌۭ",
            "transcription": "Innallazīna jā`ū bil-ifki `usbatun minkum, lā tahsabūhu sharral lakum bal huwa khayrul lakum, likullimri`in minhum maktasaba min al-ismi, wallazī tawallā kibrahū minhum lahū `azābun `azīm",
            "translation": "Albatta, bu yolg'onni (Aisha radiyallahu anhaga nisbat etilgan ifkni) keltirganlar sizlardan bir guruhdir. Uni o'zingiz uchun yomon deb o'ylamang, balki u siz uchun yaxshidir. Ulardan har bir kishi qilgan gunohi uchun javobgar bo'ladi. Ulardan eng katta gunohni yuklangan kishi uchun esa ulkan azob bor.",
            "tafsir": "Bu oyat Aisha radiyallahu anhaga nisbat etilgan ifk (tuhmat) hodisasi haqidadir. Alloh taolo bu yolg'onni tarqatganlarni qoralaydi va bu voqea musulmonlar uchun sinov bo'lganini ta'kidlaydi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٢",
            "numberLatin": "12",
            "arabic": "لَّوْلَآ إِذْ سَمِعْتُمُوهُ ظَنَّ ٱلْمُؤْمِنُونَ وَٱلْمُؤْمِنَـٰتُ بِأَنفُسِهِمْ خَيْرًۭا وَقَالُوا۟ هَـٰذَآ إِفْكٌۭ مُّبِينٌۭ",
            "transcription": "Lawlā idh sami`tumūhu zannal-mu`minūna wal-mu`minātu bi`anfusihim khayran wa qālū hāzā ifkum mubīn",
            "translation": "Nega sizlar bu gapni eshitganingizda, mo'min erkaklar va ayollar o'zlarining (din qardoshlari) haqida yaxshi gumon qilib: \"Bu ochiq-oydin yolg'ondir\" demadingiz?",
            "tafsir": "Bu oyatda mo'minlarga har qanday mish-mishlarni darrov ishonmaslik va birodarlari haqida yaxshi gumon qilish buyuriladi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٣",
            "numberLatin": "13",
            "arabic": "لَّوْلَا جَآءُو عَلَيْهِ بِأَرْبَعَةِ شُهَدَآءَ ۚ فَإِذْ لَمْ يَأْتُوا۟ بِٱلشُّهَدَآءِ فَأُو۟لَـٰٓئِكَ عِندَ ٱللَّـهِ هُمُ ٱلْكَـٰذِبُونَ",
            "transcription": "Lawlā jā`ū `alayhi bi`arba`ati shuhadā`, fa`iz lam ya`tū bish-shuhadā`i fa`ulā`ika `indallāhi humul-kāzibūn",
            "translation": "Nega ular bu da'volari uchun to'rtta guvoh keltirmadilar? Agar guvoh keltirmagan bo'lsalar, bas, ana ular Alloh nazarida yolg'onchilardir.",
            "tafsir": "Bu oyatda jinoiy ayblovlar qo'yishda to'rtta guvoh talab qilinishi haqida so'z boradi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٤",
            "numberLatin": "14",
            "arabic": "وَلَوْلَا فَضْلُ ٱللَّـهِ عَلَيْكُمْ وَرَحْمَتُهُۥ فِى ٱلدُّنْيَا وَٱلْـَٔاخِرَةِ لَمَسَّكُمْ فِى مَآ أَفَضْتُمْ فِيهِ عَذَابٌ عَظِيمٌ",
            "transcription": "Wa lawlā fadlullāhi `alaykum wa rahmatuhū fid-dunyā wal-ākhirati lamassakum fī mā afadtum fīhi `azābun `azīm",
            "translation": "Agar Allohning ustingizdagi fazli va ikkala dunyodagi rahmati bo'lmaganda, siz bu ishga kirishganingiz uchun katta azobga duchor bo'lar edingiz.",
            "tafsir": "Allohning fazli va rahmati tufayli musulmonlar og'ir azobdan qutulgani bayon etiladi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٥",
            "numberLatin": "15",
            "arabic": "إِذْ تَلَقَّوْنَهُۥ بِأَلْسِنَتِكُمْ وَتَقُولُونَ بِأَفْوَاهِكُم مَّا لَيْسَ لَكُم بِهِۦ عِلْمٌۭ وَتَحْسَبُونَهُۥ هَيِّنًۭا وَهُوَ عِندَ ٱللَّـهِ عَظِيمٌۭ",
            "transcription": "Idz talaqqawnahū bi`alsinatikum wa taqūlūna bi`afwāhikum mā laysa lakum bihī `ilmun wa tahsabūnahū hayyinan wa huwa `indallāhi `azīm",
            "translation": "O'sha paytda sizlar bu yolg'onni tillaringiz bilan qabul qilib, og'zingiz bilan haqiqatda sizga ma'lum bo'lmagan narsalarni gapirar, uni oson ish deb hisoblar edingiz. Holbuki u Alloh nazarida juda katta gunohdir.",
            "tafsir": "Yolg'on mish-mishlarni tarqatishning og'irligi ta'kidlanadi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٦",
            "numberLatin": "16",
            "arabic": "وَلَوْلَآ إِذْ سَمِعْتُمُوهُ قُلْتُم مَّا يَكُونُ لَنَآ أَن نَّتَكَلَّمَ بِهَـٰذَا سُبْحَـٰنَكَ هَـٰذَا بُهْتَـٰنٌ عَظِيمٌۭ",
            "transcription": "Wa lawlā idh sami`tumūhu qultum mā yakūnu lanā an natakallama bihāzā subhānaka hāzā buhtānun `azīm",
            "translation": "Nega siz bu gapni eshitganingizda: \"Bunday gaplarni aytish bizga yarashmaydi. Subhanaka (Sen poksan, ey Alloh)! Bu juda katta tuhmatdir\" demadingiz?",
            "tafsir": "Mish-mishlarni rad etish va Allohni poklash haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٧",
            "numberLatin": "17",
            "arabic": "يَعِظُكُمُ ٱللَّـهُ أَن تَعُودُوا۟ لِمِثْلِهِۦٓ أَبَدًا إِن كُنتُم مُّؤْمِنِينَ",
            "transcription": "Ya`izukumullāhu an ta`ūdū limithlihī abadan in kuntum mu`minīn",
            "translation": "Agar mo'min bo'lsangiz, Alloh sizlarga bunday ishni hech qachon takrorlamaslik haqida pand-nasihat qiladi.",
            "tafsir": "Allohning mo'minlarga yolg'on mish-mishlardan uzoq turish haqida pandi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٨",
            "numberLatin": "18",
            "arabic": "وَيُبَيِّنُ ٱللَّـهُ لَكُمُ ٱلْـَٔايَـٰتِ ۚ وَٱللَّـهُ عَلِيمٌ حَكِيمٌ",
            "transcription": "Wa yubayyinullāhu lakumul-āyāt, wallāhu `alīmun hakīm",
            "translation": "Alloh sizlarga oyatlarini tushuntiradi. Alloh biluvchi va hikmatli Zotdir.",
            "tafsir": "Allohning oyatlarini tushuntirishi va Uning bilim va hikmati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٩",
            "numberLatin": "19",
            "arabic": "إِنَّ ٱلَّذِينَ يُحِبُّونَ أَن تَشِيعَ ٱلْفَـٰحِشَةُ فِى ٱلَّذِينَ ءَامَنُوا۟ لَهُمْ عَذَابٌ أَلِيمٌۭ فِى ٱلدُّنْيَا وَٱلْـَٔاخِرَةِ ۚ وَٱللَّـهُ يَعْلَمُ وَأَنتُمْ لَا تَعْلَمُونَ",
            "transcription": "Innallazīna yuhibbūna an tashī`al-fāḥishatu fillazīna āmanū lahum `azābun alīmun fid-dunyā wal-ākhirah, wallāhu ya`lamu wa antum lā ta`lamūn",
            "translation": "Albatta, mo'minlar orasida uyatsizlikning tarqalishini xohlovchilar uchun dunyo va oxiratda alamli azob bor. Alloh biladi, sizlar esa bilmaysizlar.",
            "tafsir": "Yomonliklarni tarqatishni xohlovchilarning jazosi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٠",
            "numberLatin": "20",
            "arabic": "وَلَوْلَا فَضْلُ ٱللَّـهِ عَلَيْكُمْ وَرَحْمَتُهُۥ وَأَنَّ ٱللَّـهَ رَءُوفٌۭ رَّحِيمٌۭ",
            "transcription": "Wa lawlā fadlullāhi `alaykum wa rahmatuhū wa annallāha ra`ūfur rahīm",
            "translation": "Agar Allohning ustingizdagi fazli va rahmati, shuningdek Allohning mehribon va rahmli bo'lmaganda (siz azobga duchor bo'lar edingiz).",
            "tafsir": "Allohning fazli va rahmati tufayli insonlar azobdan saqlanganligi haqida.",
            "copySymbol": "📋"
        }
      ]
    },
    {
      id: 25,
      name: "Al-Furqan",
      arabicName: "الفرقان",
      meaning: "Farqlovchi",
      ayahCount: 77,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "تَبَارَكَ ٱلَّذِى نَزَّلَ ٱلْفُرْقَانَ عَلَىٰ عَبْدِهِۦ لِيَكُونَ لِلْعَٰلَمِينَ نَذِيرًۭا",
          transcription: "Tabaaraka alladhii nazzala al-furqaana 'alaa 'abdihi li-yakuuna lil-'aalamiina nadhiiran",
          translation: "Ulug‘dir O‘zi bandasi (Muhammad)ga Furqonni nozil qilgan Zot, olamlarga ogohlantiruvchi bo‘lsin",
          tafsir: "Qur’onning haq va botilni ajratuvchi kitob ekanligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "ٱلَّذِى لَهُۥ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَلَمْ يَتَّخِذْ وَلَدًۭا",
          transcription: "Alladhii lahu mulku as-samaawaati wal-ardi walam yattakhidh waladan",
          translation: "Osmonlar va yer mulki Unikidir, U farzand olmagan",
          tafsir: "Allohning yagona ilohligi va farzanddan pokligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "وَٱتَّخَذُوا۟ مِن دُونِهِۦٓ ءَالِهَةًۭ لَّا يَخْلُقُونَ شَيْـًۭٔا",
          transcription: "Wattakhadhuu min duunihi aalihatan laa yakhluquuna shay'an",
          translation: "Ular Undan boshqa hech narsa yaratmaydigan ilohlarni qabul qildilar",
          tafsir: "Mushriklarning soxta ilohlarga sig‘inishi va ularning kuchsizligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "وَقَالَ ٱلَّذِينَ كَفَرُوا۟ إِنْ هَٰذَآ إِلَّآ إِفْكٌ ٱفْتَرَىٰهُ",
          transcription: "Wa qaala alladhiina kafaruu in haadhaa illaa ifkuniftaraahu",
          translation: "Kofirlar dedilar: 'Bu faqat u uydirgan yolg‘ondir'",
          tafsir: "Kofirlarning Qur’onni yolg‘on deb rad qilishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "وَقَالُوا۟ أَسَٰطِيرُ ٱلْأَوَّلِينَ ٱكْتَتَبَهَا",
          transcription: "Wa qaaluu asaatiiru al-awwaliina iktatabahaa",
          translation: "Ular dedilar: 'Bu avvalgilarning afsonalari, uni yozib oldi'",
          tafsir: "Kofirlarning Qur’onni o‘tganlarning hikoyasi deb da’vo qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "قُلْ أَنزَلَهُ ٱلَّذِى يَعْلَمُ ٱلسِّرَّ فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
          transcription: "Qul anzalahu alladhii ya'lamu as-sirra fi as-samaawaati wal-ard",
          translation: "Ayting: 'Uni osmonlar va yerdagi sirni biluvchi nozil qildi'",
          tafsir: "Qur’onning Alloh tomonidan ekanligi va Uning ilmi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "وَقَالُوا۟ مَالِ هَٰذَا ٱلرَّسُولِ يَأْكُلُ ٱلطَّعَامَ",
          transcription: "Wa qaaluu maali haadhaa ar-rasuuli ya'kulu at-ta'aam",
          translation: "Ular dedilar: 'Bu rasulga nima bo‘ldi, u taom yeydi'",
          tafsir: "Kofirlarning payg‘ambarning inson ekanligiga e’tirozi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "أَوْ يُلْقَىٰٓ إِلَيْهِ كَنزٌ أَوْ تَكُونُ لَهُۥ جَنَّةٌۭ",
          transcription: "Aw yulqaa ilayhi kanzun aw takuunu lahu jannatun",
          translation: "Yoki unga xazina tashlansa yoki bog‘i bo‘lsa edi",
          tafir: "Kofirlarning moddiy boylik kutishi va haqiqatni inkor qilishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "قُلْ إِنَّمَآ أَنَا۠ بَشَرٌۭ مِّثْلُكُمْ يُوحَىٰٓ إِلَىَّ",
          transcription: "Qul innamaa ana basharun mithlukum yuhaa ilayya",
          translation: "Ayting: 'Men sizlar kabi insonman, faqat menga vahiy keladi'",
          tafsir: "Payg‘ambarning insonligi va vahiy orqali risolat olgani.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "تَبَارَكَ ٱلَّذِىٓ إِن شَآءَ جَعَلَ لَكَ خَيْرًۭا مِّن ذَٰلِكَ",
          transcription: "Tabaaraka alladhii in shaa'a ja'ala laka khayran min dhaalika",
          translation: "Ulug‘dir O‘zi, agar xohlasa, sizga bundan yaxshisini beradi",
          tafsir: "Allohning qudrati va ne’matlarining cheksizligi haqida.",
          copySymbol: "📋"
        },
          {
            "numberArabic": "١١",
            "numberLatin": "11",
            "arabic": "بَلْ عَجِبُوٓا۟ أَن جَآءَهُم مُّنذِرٌۭ مِّنْهُمْ فَقَالَ ٱلْكَـٰفِرُونَ هَـٰذَا شَىْءٌ عَجِيبٌۭ",
            "transcription": "Bal 'ajibuu an jaa-ahum munzirun minhum fa qaalal-kaafiruuna haazaa shay'un 'ajiib",
            "translation": "Balki ularni o'zlaridan ogohlantiruvchi kelganiga hayron bo'lishdi. Kofirlar: \"Bu juda g'aroyib narsa\" dedilar.",
            "tafsir": "Payg'ambar kelishiga kofirlarning hayratlanishi va uni g'aroyib deb topishlari haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٢",
            "numberLatin": "12",
            "arabic": "إِذَا رَأَتْهُم مِّن مَّكَانٍۭ بَعِيدٍۢ سَمِعُوا۟ لَهَا تَغَيُّظًۭا وَزَفِيرًۭا",
            "transcription": "Idzaa ra'at-hum min makaanin ba'iidin sami'uu lahaa taghayyuzan wa zafiiraa",
            "translation": "Jahannam ularni uzoq joydan ko'rganida, ular uning g'azabli ovozini va qaynoq nari eshitadilar.",
            "tafsir": "Jahannamning dahshatli ovozlari va kofirlarning holati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٣",
            "numberLatin": "13",
            "arabic": "وَإِذَآ أُلْقُوا۟ مِنْهَا مَكَانًۭا ضَيِّقًۭا مُّقَرَّنِينَ دَعَوْا۟ هُنَالِكَ ثُبُورًۭا",
            "transcription": "Wa idzaa ulquu minhaa makaanan dayyiqan muqarranin da'av hunaalika thubuuraa",
            "translation": "Qachonki ular tor joyga, zanjirlangan holda tashlansa, u yerda halokat tilaydilar.",
            "tafsir": "Jahannam azobining qattiqligi va mahkumlarning holati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٤",
            "numberLatin": "14",
            "arabic": "لَا تَدْعُوا۟ ٱلْيَوْمَ ثُبُورًۭا وَٰحِدًۭا وَٱدْعُوا۟ ثُبُورًۭا كَثِيرًۭا",
            "transcription": "Laa tad'ul-yauma thubuuran waaidan wad'uu thubuuran katsiiraa",
            "translation": "(Ularga aytiladi): \"Bugun bir marta emas, ko'p marta halokat tilang!\"",
            "tafsir": "Azobning doimiyligi va kofirlarning umidsizligi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٥",
            "numberLatin": "15",
            "arabic": "قُلْ أَذَٰلِكَ خَيْرٌ أَمْ جَنَّةُ ٱلْخُلْدِ ٱلَّتِى وُعِدَ ٱلْمُتَّقُونَ ۚ كَانَتْ لَهُمْ جَزَآءًۭ وَمَصِيرًۭا",
            "transcription": "Qul azaalika khayrun am jannatul-khuldil-latii wu'idal-muttaquun, kaanat lahum jazaa-an wa masiiraa",
            "translation": "Ayting: \"Bu (azob) yaxshimi, yoki taqvodorlarga va'da qilingan abadiy jannatmi? U ular uchun mukofot va qaytish joyidir.\"",
            "tafsir": "Jahannam azobi va jannat ne'matlari qiyoslanishi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٦",
            "numberLatin": "16",
            "arabic": "لَهُمْ فِيهَا مَا يَشَآءُونَ خَـٰلِدِينَ ۚ كَانَ عَلَىٰ رَبِّكَ وَعْدًۭا مَّسْـُٔولًۭا",
            "transcription": "Lahum fiihaa maa yashaa'uuna khaalidiin, kaana 'alaa rabbika wa'dan mas'uulaa",
            "translation": "Ular uchun u yerda abadiy qolishlari uchun istagan narsalari bor. Bu Rabbingizning so'raladigan va'dasidir.",
            "tafsir": "Jannatdagi abadiy ne'matlar va Allohning va'dasining haqiqatliligi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٧",
            "numberLatin": "17",
            "arabic": "وَيَوْمَ يَحْشُرُهُمْ وَمَا يَعْبُدُونَ مِن دُونِ ٱللَّـهِ فَيَقُولُ ءَأَنتُمْ أَضْلَلْتُمْ عِبَادِى هَـٰٓؤُلَآءِ أَمْ هُمْ ضَلُّوا۟ ٱلسَّبِيلَ",
            "transcription": "Wa yawma yahshuruhum wa maa ya'buduuna min duunil-laahi fa yaquulu a-antum adlaltum 'ibaadii haa'ulaa'i am hum dallus-sabiil",
            "translation": "Qiyomat kuni Alloh ularni va Allohdan o'zga ibodat qilgan narsalarini to'playdi va: \"Mening bandalarimni adashtirganlaringizmi, yoki ular o'zlari yo'ldan adashganmi?\" deydi.",
            "tafsir": "Qiyomatda butlar va ularga sig'inuvchilar o'rtasidagi suhbat haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٨",
            "numberLatin": "18",
            "arabic": "قَالُوا۟ سُبْحَـٰنَكَ مَا كَانَ يَنۢبَغِى لَنَآ أَن نَّتَّخِذَ مِن دُونِكَ مِنْ أَوْلِيَآءَ وَلَـٰكِن مَّتَّعْتَهُمْ وَءَابَآءَهُمْ حَتَّىٰ نَسُوا۟ ٱلذِّكْرَ وَكَانُوا۟ قَوْمًۢا بُورًۭا",
            "transcription": "Qaaluu subhaanaka maa kaana yambaghii lanaa an nattakhiza min duunika min awliyaa'a wa laakin matta'tahum wa aabaa'ahum hattaa nasuz-zikra wa kaanuu qawman buuraa",
            "translation": "Ular: \"Sen poksan, ey Alloh! Sening o'zgangi homiylarni qilib olishimiz lozim emas edi. Lekin Sen ularga va ularning otalariga ne'mat berding, toki ular eslatishni unutdilar va halokatga uchragan qavm bo'ldilar\" deydilar.",
            "tafsir": "Butlarning o'zlariga sig'inuvchilarga javobi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٩",
            "numberLatin": "19",
            "arabic": "فَقَدْ كَذَّبُوكُم بِمَا تَقُولُونَ فَمَا تَسْتَطِيعُونَ صَرْفًۭا وَلَا نَصْرًۭا ۚ وَمَن يَظْلِم مِّنكُمْ نُذِقْهُ عَذَابًۭا كَبِيرًۭا",
            "transcription": "Faqad kazzabuukum bimaa taquuluuna famaa tastatii'uuna sarfan wa laa nasraa, wa man yazlim minkum nuziqhu 'azaaban kabiiraa",
            "translation": "Demak, ular sizlar aytgan narsalaringiz bilan sizlarni yolg'onchilikka chiqardilar. Endi sizlar na (azobni) qaytarishga, na yordam berishga qodir emassiz. Kim zulm qilsa, Biz unga katta azobdan totdiramiz.",
            "tafsir": "Butlarning kofirlarga javobi va ularning umidsizligi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٠",
            "numberLatin": "20",
            "arabic": "وَمَآ أَرْسَلْنَا قَبْلَكَ مِنَ ٱلْمُرْسَلِينَ إِلَّآ إِنَّهُمْ لَيَأْكُلُونَ ٱلطَّعَامَ وَيَمْشُونَ فِى ٱلْأَسْوَاقِ ۗ وَجَعَلْنَا بَعْضَكُمْ لِبَعْضٍۢ فِتْنَةً أَتَصْبِرُونَ ۗ وَكَانَ رَبُّكَ بَصِيرًۭا",
            "transcription": "Wa maa arsalnaa qablaka minal-mursaliina illaa innahum la ya'kuluunat-ta'aama wa yamshuuna fil-aswaaq, wa ja'alnaa ba'dakum liba'din fitnatan atasbiruun, wa kaana rabbuka bashiiraa",
            "translation": "Sizdan oldin yuborgan payg'ambarlarimiz ham ovqat eyishar, bozorlarda yuradilar. Biz sizlarning bir qismingizni boshqa qismingiz uchun sinov qildik. (Ey mo'minlar!) Sabr qilasizlarmi? Rabbingiz hamma narsani ko'ruvchidir.",
            "tafsir": "Payg'ambarlarning odamiy holatlari va insonlarning bir-birlari uchun sinov bo'lishi haqida.",
            "copySymbol": "📋"
        }
      ]
    },
    {
      id: 26,
      name: "Ash-Shu'ara",
      arabicName: "الشعراء",
      meaning: "Shoirlar",
      ayahCount: 227,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "طسٓمٓ",
          transcription: "Taa Siin Miim",
          translation: "To, Sin, Mim",
          tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ٱلْمُبِينِ",
          transcription: "Tilka aayaatu al-kitaabi al-mubiin",
          translation: "Bu aniq Kitobning oyatlaridir",
          tafsir: "Qur’onning aniq va haqiqiy kitob ekanligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "لَعَلَّكَ بَٰخِعٌۭ نَّفْسَكَ أَلَّا يَكُونُوا۟ مُؤْمِنِينَ",
          transcription: "La'allaka baakhi'un nafsaka allaa yakuunuu mu'miniin",
          translation: "Balki sen o‘zingni halok qilyapsanki, ular mo‘min bo‘lmaydi",
          tafsir: "Payg‘ambarning kofirlarning iymonsizligidan qayg‘urishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "إِن نَّشَأْ نُنَزِّلْ عَلَيْهِم مِّنَ ٱلسَّمَآءِ ءَايَةًۭ",
          transcription: "In nasha' nunazzil 'alayhim mina as-samaa'i aayatan",
          translation: "Agar xohlasak, ularga osmondan oyat (mo‘jiza) tushiramiz",
          tafsir: "Allohning mo‘jiza yuborish qudrati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "وَمَا يَأْتِيهِم مِّن ذِكْرٍۢ مِّنَ ٱلرَّحْمَٰنِ مُحْدَثٍ إِلَّا كَانُوا۟ عَنْهُ مُعْرِضِينَ",
          transcription: "Wamaa ya'tiihim min dhikrin mina ar-rahmaani muhdathin illaa kaanuu 'anhu mu'ridhiin",
          translation: "Rahmondan yangi eslatma kelsa, ular undan yuz o‘giradilar",
          tafsir: "Kofirlarning Qur’onni rad qilishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "فَقَدْ كَذَّبُوا۟ فَسَيَأْتِيهِمْ أَنۢبَٰٓؤُا۟ مَا كَانُوا۟ بِهِۦ يَسْتَهْزِءُونَ",
          transcription: "Faqad kadhdhabuu fasaya'tiihim anbaa'u maa kaanuu bihi yastahzi'uun",
          translation: "Ular yolg‘on dedilar, tezda ularga masxara qilganlarining xabari keladi",
          tafsir: "Kofirlarning masxarasi va uning oqibatlari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "أَوَلَمْ يَرَوْا۟ إِلَى ٱلْأَرْضِ كَمْ أَنۢبَتْنَا فِيهَا مِن كُلِّ زَوْجٍۢ كَرِيمٍ",
          transcription: "Awalam yaraw ilaa al-ardi kam anbatnaa fiihaa min kulli zawjin kariim",
          translation: "Yerga qaramadilarmi, unda har xil ulug‘vor juftlarni o‘stirdik",
          tafsir: "Allohning yaratgan ne’matlari va qudrati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "إِنَّ فِى ذَٰلِكَ لَءَايَةًۭ ۖ وَمَا كَانَ أَكْثَرُهُم مُّؤْمِنِينَ",
          transcription: "Inna fii dhaalika la-aayatan wamaa kaana aktharuhum mu'miniin",
          translation: "Bunda albatta oyat (belgi) bor, lekin ularning ko‘pi mo‘min emas",
          tafir: "Tabiatdagi mo‘jizalar va kofirlarning iymonsizligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "وَإِنَّ رَبَّكَ لَهُوَ ٱلْعَزِيزُ ٱلرَّحِيمُ",
          transcription: "Wa inna rabbaka lahuwa al-'aziizu ar-rahiim",
          translation: "Albatta, Robbingiz qudratli va rahmli Zotdir",
          tafsir: "Allohning qudrati va rahmati haqida tasdiqlash.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "وَإِذْ نَادَىٰ رَبُّكَ مُوسَىٰٓ أَنِ ٱئْتِ ٱلْقَوْمَ ٱلظَّٰلِمِينَ",
          transcription: "Wa idh naadaa rabbuka muusaa ani i'ti al-qawma azh-zhaalimiin",
          translation: "Robbing Musoga nido qilganda: 'Zulm qilgan qavmga bor'",
          tafir: "Muso payg‘ambarning Fir’avnga yuborilishi haqida.",
          copySymbol: "📋"
        },
        {
      "numberArabic": "١١",
      "numberLatin": "11",
      "arabic": "قَوْمِ فِرْعَوْنَ ۚ أَلَا يَتَّقُونَ",
      "transcription": "Qawmi Fir'awn, ala yattaqun",
      "translation": "Fir'avn qavmidir. Ular (Allohdan) qo'rqmaydilarmi?",
      "tafsir": "Fir'avn qavmining taqvodorlikdan yuz o'girganligi haqida.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٢",
      "numberLatin": "12",
      "arabic": "قَالَ رَبِّ إِنِّي أَخَافُ أَن يُكَذِّبُونِ",
      "transcription": "Qala rabbi inni akhafu an yukazzibun",
      "translation": "(Muso) dedi: \"Rabbim, men ularning meni yolg'onchiga chiqarishlaridan qo'rqaman\".",
      "tafsir": "Muso alayhissalomning qavmining inkori haqidagi tashvishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٣",
      "numberLatin": "13", 
      "arabic": "وَيَضِيقُ صَدْرِي وَلَا يَنطَلِقُ لِسَانِي فَأَرْسِلْ إِلَىٰ هَارُونَ",
      "transcription": "Wa yadiq sadri wa la yantaliq lisani fa arsil ila Harun",
      "translation": "Ko'nglim torayib qoladi va tilim ochilmaydi. Bas, Horunni ham (yuborishni) iltimos qilaman\".",
      "tafsir": "Muso alayhissalomning nutqidagi noqulayligi va ukasi Horunni yordamchi so'rab murojaat qilishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٤",
      "numberLatin": "14",
      "arabic": "وَلَهُمْ عَلَيَّ ذَنبٌ فَأَخَافُ أَن يَقْتُلُونِ",
      "transcription": "Wa lahum 'alayya zanbun fa akhafu an yaqtulun",
      "translation": "Ularning oldida mening gunohim bor (bir misrlikni o'ldirganman), shuning uchun ularning meni o'ldirishlaridan qo'rqaman\".",
      "tafsir": "Muso alayhissalomning o'tmishdagi bir hodisa tufayli tashvishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٥",
      "numberLatin": "15",
      "arabic": "قَالَ كَلَّا ۖ فَاذْهَبَا بِآيَاتِنَا إِنَّا مَعَكُم مُّسْتَمِعُونَ",
      "transcription": "Qala kalla, fadhhaba bi-ayatina inna ma'akum mustami'un",
      "translation": "Alloh dedi: \"Yo'q (qo'rqma)! Ikkalavingiz mo''jizalarimiz bilan boring. Albatta, Biz siz bilan birgamiz, eshituvchimiz\".",
      "tafsir": "Allohning Muso va Horunga yordam va'da qilishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٦",
      "numberLatin": "16",
      "arabic": "فَأْتِيَا فِرْعَوْنَ فَقُولَا إِنَّا رَسُولُ رَبِّ الْعَالَمِينَ",
      "transcription": "Fa'tiya Fir'awna faqula inna rasulu rabbil-'alamin",
      "translation": "Fir'avnga borib: \"Biz butun olamlarning Rabbining elchilarimiz\" deyinglar.",
      "tafsir": "Fir'avnga xitob qilish va risolat vazifasini yetkazish haqida.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٧",
      "numberLatin": "17",
      "arabic": "أَنْ أَرْسِلْ مَعَنَا بَنِي إِسْرَائِيلَ",
      "transcription": "An arsil ma'ana banu Israil",
      "translation": "\"Isroil urug'lari bilan birga (Misolni tark etishga) ruxsat ber\" (deyinglar).",
      "tafsir": "Isroil urug'larini ozod qilish talabi haqida.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٨",
      "numberLatin": "18",
      "arabic": "قَالَ أَلَمْ نُرَبِّكَ فِينَا وَلِيدًا وَلَبِثْتَ فِينَا مِنْ عُمُرِكَ سِنِينَ",
      "transcription": "Qala alam nurabbika fina walidan wa labitta fina min 'umrika sinin",
      "translation": "Fir'avn dedi: \"Sen bolaligingda bizning qo'limizda tarbiya topmadingmi? Yillar davomida bizning oramizda yashamadingmi?\"",
      "tafsir": "Fir'avnning Musoga nisqon qilishga urinishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "١٩",
      "numberLatin": "19",
      "arabic": "وَفَعَلْتَ فَعْلَتَكَ الَّتِي فَعَلْتَ وَأَنتَ مِنَ الْكَافِرِينَ",
      "transcription": "Wa fa'alta fa'latakal-lati fa'alta wa anta minal-kafirin",
      "translation": "Va sen o'sha ishingni (misrlikni o'ldirishni) qilding va sen kofirlardan eding\".",
      "tafsir": "Fir'avnning Musoning o'tmishdagi xatosini eslatishi.",
      "copySymbol": "📋"
    },
    {
      "numberArabic": "٢٠",
      "numberLatin": "20",
      "arabic": "قَالَ فَعَلْتُهَا إِذًا وَأَنَا مِنَ الضَّالِّينَ",
      "transcription": "Qala fa'altuha izan wa ana minad-dallin",
      "translation": "Muso dedi: \"Men uni (o'sha ishni) adashgan paytimda qilgan edim\".",
      "tafsir": "Muso alayhissalomning yoshlikdagi xatosini tan olishi.",
      "copySymbol": "📋"
        }
      ]
    },
    {
      id: 27,
      name: "An-Naml",
      arabicName: "النمل",
      meaning: "Chumolilar",
      ayahCount: 93,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "طسٓ ۚ تِلْكَ ءَايَٰتُ ٱلْقُرْءَانِ وَكِتَابٍۢ مُّبِينٍ",
          transcription: "Taa Siin tilka aayaatu al-qur'aani wa kitaabin mubiin",
          translation: "To, Sin. Bu Qur’on va aniq Kitobning oyatlaridir",
          tafsir: "Qur’onning aniqligi va muqatta’at harflari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "هُدًۭى وَبُشْرَىٰ لِلْمُؤْمِنِينَ",
          transcription: "Hudan wa bushraa lil-mu'miniin",
          translation: "Mo‘minlar uchun hidoyat va xushxabardir",
          tafsir: "Qur’onning mo‘minlar uchun rahbar va xushxabar ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "ٱلَّذِينَ يُقِيمُونَ ٱلصَّلَوٰةَ وَيُؤْتُونَ ٱلزَّكَوٰةَ",
          transcription: "Alladhiina yuqiimuuna as-salaata wa yu'tuuna az-zakaata",
          translation: "Ular namozni ado qiladilar va zakot beradilar",
          tafsir: "Mo‘minlarning ibodat va sadaqa sifatlari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "إِنَّ ٱلَّذِينَ لَا يُؤْمِنُونَ بِٱلْـَٔاخِرَةِ زَيَّنَّا لَهُمْ أَعْمَٰلَهُمْ",
          transcription: "Inna alladhiina laa yu'minuuna bil-aakhirati zayyannaa lahum a'maalahum",
          translation: "Oxiratga ishonmaydiganlarga amallarini chiroyli ko‘rsatdik",
          tafir: "Kofirlarning adashishi va amallari haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "أُو۟لَٰٓئِكَ ٱلَّذِينَ لَهُمْ سُوٓءُ ٱلْعَذَابِ",
          transcription: "Ulaa'ika alladhiina lahum suu'u al-'adhaabi",
          translation: "Aynan ular uchun eng yomon azob bor",
          tafsir: "Kofirlarning oxiratdagi jazo olishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "وَإِنَّكَ لَتُلَقَّى ٱلْقُرْءَانَ مِن لَّدُنْ حَكِيمٍ عَلِيمٍ",
          transcription: "Wa innaka latulaqqaa al-qur'aana min ladun hakiimin 'aliim",
          translation: "Sen Qur’onni hikmatli va biluvchi Zotdan qabul qilasan",
          tafir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "إِذْ قَالَ مُوسَىٰ لِأَهْلِهِۦٓ إِنِّىٓ ءَانَسْتُ نَارًۭا",
          transcription: "Idh qaala muusaa li-ahlilii innni aanastu naaran",
          translation: "Muso o‘z ahliga: 'Men bir olov ko‘rdim', deganda",
          tafir: "Muso payg‘ambarning olovni ko‘rishi va risolat boshlanishi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "فَلَمَّا جَآءَهَا نُودِىَ أَنۢ بُورِكَ مَن فِى ٱلنَّارِ",
          transcription: "Falammaa jaa'ahaa nuudiya an buurika man fi an-naari",
          translation: "U yerga kelganda nido qilindiki: 'Olov atrofidagilar muborak bo‘lsin'",
          tafir: "Muso payg‘ambarning Alloh bilan suhbat boshlash joyi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "يَٰمُوسَىٰٓ إِنَّهُۥٓ أَنَا ٱللَّهُ ٱلْعَزِيزُ ٱلْحَكِيمُ",
          transcription: "Yaa muusaa innahu ana allaahu al-'aziizu al-hakiim",
          translation: "Ey Muso, bu Men, Alloh, qudratli va hikmatli Zotman",
          tafir: "Allohning Musoga o‘zini tanitishi va qudrati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "وَأَلْقِ عَصَاكَ ۚ فَلَمَّا رَءَاهَا تَهْتَزُّ كَأَنَّهَا جَآنٌّۭ",
          transcription: "Wa alqi 'asaaka falammaa ra'aahaa tahtazzu ka'annahaa jaannun",
          translation: "Asangni tashla, uni ilondek tebranayotganini ko‘rganda",
          tafir: "Muso payg‘ambarga mo‘jiza sifatida asaning ilonga aylanishi.",
          copySymbol: "📋"
        },
          {
            "numberArabic": "١١",
            "numberLatin": "11",
            "arabic": "إِلَّا مَن ظَلَمَ ثُمَّ بَدَّلَ حُسْنًۢا بَعْدَ سُوٓءٍۢ فَإِنِّى غَفُورٌۭ رَّحِيمٌۭ",
            "transcription": "Illā man ẓalama thumma baddala ḥusnan baʿda sūin fa-innī ghafūrun raḥīm",
            "translation": "Faqlat zulm qilib, keyin yomonligini yaxshilik bilan almashtirgan kishilardan boshqa. Albatta, Men kechiruvchi, rahmli Zotdirmen.",
            "tafsir": "Allohning tavba qiluvchi bandalariga marhamati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٢",
            "numberLatin": "12",
            "arabic": "وَأَدْخِلْ يَدَكَ فِى جَيْبِكَ تَخْرُجْ بَيْضَآءَ مِنْ غَيْرِ سُوٓءٍۢ فِى تِسْعِ ءَايَـٰتٍ إِلَىٰ فِرْعَوْنَ وَقَوْمِهِۦٓ ۚ إِنَّهُمْ كَانُوا۟ قَوْمًۭا فَـٰسِقِينَ",
            "transcription": "Wa adkhil yadaka fī jaybika takhruj bayḍāa min ghayri sūin fī tisʿi āyātin ilā firʿawna wa qawmih, innahum kānū qawman fāsiqīn",
            "translation": "Qoʻlingni koʻkragingdagi yoqaga sol, u nosozliksiz oq boʻlib chiqsin. Bu toʻqqiz moʻjiza bilan Firʻavn va uning qavmiga (bor). Albatta, ular fosiq qavm boʻlganlar.",
            "tafsir": "Muso alayhissalomga berilgan moʻjizalar va Firʻavn qavmining noqobiligi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٣",
            "numberLatin": "13",
            "arabic": "فَلَمَّا جَآءَتْهُمْ ءَايَـٰتُنَا مُبْصِرَةًۭ قَالُوا۟ هَـٰذَا سِحْرٌۭ مُّبِينٌۭ",
            "transcription": "Fa-lammā jāat-hum āyātunā mubṣiratan qālū hādhā siḥrun mubīn",
            "translation": "Qachonki ularga moʻjizalarimiz ravshan boʻlib kelsa, \"Bu ochiq-oydin sehr\" dedilar.",
            "tafsir": "Firʻavn qavmining moʻjizalarga qarshiligi va ularni sehr deb hisoblashi.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٤",
            "numberLatin": "14",
            "arabic": "وَجَحَدُوا۟ بِهَا وَٱسْتَيْقَنَتْهَآ أَنفُسُهُمْ ظُلْمًۭا وَعُلُوًّۭا ۚ فَٱنظُرْ كَيْفَ كَانَ عَـٰقِبَةُ ٱلْمُفْسِدِينَ",
            "transcription": "Wa jaḥadū bihā wa-stayqanat-hā anfusu-hum ẓulman wa ʿuluwwan fa-nẓur kayfa kāna ʿāqibatu l-mufsidīn",
            "translation": "Ular qalbida ularning haq ekaniga ishonishlariga qaramay, zulm va kibr bilan inkor etdilar. Bas, buzuqchilarning oxiri qanday boʻldi, bir qara!",
            "tafsir": "Kufr va isyonkorlikning oqibati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٥",
            "numberLatin": "15",
            "arabic": "وَلَقَدْ ءَاتَيْنَا دَاوُۥدَ وَسُلَيْمَـٰنَ عِلْمًۭا ۖ وَقَالَا ٱلْحَمْدُ لِلَّـهِ ٱلَّذِى فَضَّلَنَا عَلَىٰ كَثِيرٍۢ مِّنْ عِبَادِهِ ٱلْمُؤْمِنِينَ",
            "transcription": "Wa laqad ātaynā dāwūda wa sulaymāna ʿilman wa qālā l-ḥamdu lillāhi lladhī faḍḍalanā ʿalā kathīrin min ʿibādihi l-muʾminīn",
            "translation": "Biz Dovud va Sulaymonga ilm ato etdik. Ular: \"Bizni moʻmin bandalarning koʻpchiligidan afzal qilgan Allohga hamd boʻlsin\" dedilar.",
            "tafsir": "Dovud va Sulaymon alayhimassalomga berilgan fazl-karam haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٦",
            "numberLatin": "16",
            "arabic": "وَوَرِثَ سُلَيْمَـٰنُ دَاوُۥدَ ۖ وَقَالَ يَـٰٓأَيُّهَا ٱلنَّاسُ عُلِّمْنَا مَنطِقَ ٱلطَّيْرِ وَأُوتِينَا مِن كُلِّ شَىْءٍ ۖ إِنَّ هَـٰذَا لَهُوَ ٱلْفَضْلُ ٱلْمُبِينُ",
            "transcription": "Wa waritha sulaymānu dāwūda wa qāla yā ayyuhā n-nāsu ʿullimnā manṭiqa ṭ-ṭayri wa ūtīnā min kulli shayin inna hādhā la-huwa l-faḍlu l-mubīn",
            "translation": "Sulaymon Dovuddan meros oldi va dedi: \"Ey odamlar! Bizga qushlar tilini oʻrgatildi va bizga har bir narsadan (loyiq boʻlgani) berildi. Albatta, bu - ochiq-oydin ulugʻ fazldir\".",
            "tafsir": "Sulaymon alayhissalomga ato etilgan favqulodda qobiliyatlar haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٧",
            "numberLatin": "17",
            "arabic": "وَحُشِرَ لِسُلَيْمَـٰنَ جُنُودُهُۥ مِنَ ٱلْجِنِّ وَٱلْإِنسِ وَٱلطَّيْرِ فَهُمْ يُوزَعُونَ",
            "transcription": "Wa ḥushira li-sulaymāna junūduhū mina l-jinni wa l-insi wa ṭ-ṭayri fa-hum yūzaʿūn",
            "translation": "Sulaymon uchun jinlar, odamlar va qushlardan iborat qoʻshinlari toʻplandi va ular tartibga solinar edilar.",
            "tafsir": "Sulaymon alayhissalomning gʻayrioddiy hukmdorligi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٨",
            "numberLatin": "18",
            "arabic": "حَتَّىٰٓ إِذَآ أَتَوْا۟ عَلَىٰ وَادِ ٱلنَّمْلِ قَالَتْ نَمْلَةٌۭ يَـٰٓأَيُّهَا ٱلنَّمْلُ ٱدْخُلُوا۟ مَسَـٰكِنَكُمْ لَا يَحْطِمَنَّكُمْ سُلَيْمَـٰنُ وَجُنُودُهُۥ وَهُمْ لَا يَشْعُرُونَ",
            "transcription": "Ḥattā idhā ataw ʿalā wādi n-namli qālat namlatun yā ayyuhā n-namlu dkhulū masākinakum lā yaḥṭimannakum sulaymānu wa junūduhū wa-hum lā yashʿurūn",
            "translation": "Qachonki ular Chumoli vodiysiga yetib kelsalar, bir chumoli: \"Ey chumolilar! Oʻz uylaringizga kirib olinglar, Sulaymon va uning qoʻshinlari bilmasdan sizlarni ezib yubormasinlar\" dedi.",
            "tafsir": "Chumoli bilan Sulaymon alayhissalom orasidagi hodisa haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٩",
            "numberLatin": "19",
            "arabic": "فَتَبَسَّمَ ضَاحِكًۭا مِّن قَوْلِهَا وَقَالَ رَبِّ أَوْزِعْنِىٓ أَنْ أَشْكُرَ نِعْمَتَكَ ٱلَّتِىٓ أَنْعَمْتَ عَلَىَّ وَعَلَىٰ وَالِدَىَّ وَأَنْ أَعْمَلَ صَـٰلِحًۭا تَرْضَىٰهُ وَأَدْخِلْنِى بِرَحْمَتِكَ فِى عِبَادِكَ ٱلصَّـٰلِحِينَ",
            "transcription": "Fa-tabassama ḍāḥikan min qawlihā wa qāla rabbi awziʿnī an ashkura niʿmataka llatī anʿamta ʿalayya wa ʿalā wālidayya wa an aʿmala ṣāliḥan tarḍāhu wa adkhilnī bi-raḥmatika fī ʿibādika ṣ-ṣāliḥīn",
            "translation": "Sulaymon uning soʻzidan kulib qoʻydi va dedi: \"Rabbim! Menga oʻz neʼmatlaringga shukr qilishni, otam-ona hamda menga inʼom etgan neʼmatlaringga shukronalik bildirishni ilhom et. Meni rozi boʻladigan solih amallar qilishga hidoyat qil va meni oʻz rahmating bilan solih bandalaring qatoriga kirit\".",
            "tafsir": "Sulaymon alayhissalomning Allohga shukru duo qilishi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٠",
            "numberLatin": "20",
            "arabic": "وَتَفَقَّدَ ٱلطَّيْرَ فَقَالَ مَا لِىَ لَآ أَرَى ٱلْهُدْهُدَ أَمْ كَانَ مِنَ ٱلْغَآئِبِينَ",
            "transcription": "Wa tafaqqada ṭ-ṭayra fa-qāla mā liya lā arā l-hudhuda am kāna mina l-ghāibīn",
            "translation": "U qushlarni tekshirdi-da: \"Nega men Hudhudni koʻrmayapman? Yoʻqmi, yoki gʻoyib boʻlib qoldimi?\" dedi.",
            "tafsir": "Sulaymon alayhissalomning Hudhud qushini qidirishi haqida.",
            "copySymbol": "📋"
        }
      ]
    },
    {
      id: 28,
      name: "Al-Qasas",
      arabicName: "القصص",
      meaning: "Hikoyalar",
      ayahCount: 88,
      place: "Makka",
      prelude: {
        bismillah: {
          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          transcription: "Bismillahir-Rahmanir-Rahiim",
          translation: "Mehribon va rahmli Alloh nomi bilan",
          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
          copySymbol: "📋"
        }
      },
      ayahs: [
        {
          numberArabic: "١",
          numberLatin: "1",
          arabic: "طسٓمٓ",
          transcription: "Taa Siin Miim",
          translation: "To, Sin, Mim",
          tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٢",
          numberLatin: "2",
          arabic: "تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ٱلْمُبِينِ",
          transcription: "Tilka aayaatu al-kitaabi al-mubiin",
          translation: "Bu aniq Kitobning oyatlaridir",
          tafir: "Qur’onning aniq va haqiqiy kitob ekanligi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٣",
          numberLatin: "3",
          arabic: "نَتْلُوا۟ عَلَيْكَ مِن نَّبَإِ مُوسَىٰ وَفِرْعَوْنَ بِٱلْحَقِّ",
          transcription: "Natluu 'alayka min naba'i muusaa wa fir'awna bil-haqqi",
          translation: "Senga Muso va Fir’avn xabarini haq bilan o‘qiymiz",
          tafir: "Muso va Fir’avn hikoyasining boshlanishi va haqiqati.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٤",
          numberLatin: "4",
          arabic: "إِنَّ فِرْعَوْنَ عَلَا فِى ٱلْأَرْضِ وَجَعَلَ أَهْلَهَا شِيَعًۭا",
          transcription: "Inna fir'awna 'alaa fi al-ardi wa ja'ala ahlahaa shiya'an",
          translation: "Fir’avn yer yuzida ulug‘lik qildi va aholini guruhlarga ajratdi",
          tafir: "Fir’avnning zolimligi va xalqni bo‘linishi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٥",
          numberLatin: "5",
          arabic: "وَنُرِيدُ أَن نَّمُنَّ عَلَى ٱلَّذِينَ ٱسْتُضْعِفُوا۟ فِى ٱلْأَرْضِ",
          transcription: "Wa nuriidu an namunna 'alaa alladhiina istud'ifuu fi al-ardi",
          translation: "Biz yerdagi zaif qilinganlarga ne’mat bermoqni xohlaymiz",
          tafir: "Allohning mustaz’aflarga yordami va adolati haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٦",
          numberLatin: "6",
          arabic: "وَنُمَكِّنَ لَهُمْ فِى ٱلْأَرْضِ وَنُرِىَ فِرْعَوْنَ وَهَٰمَٰنَ",
          transcription: "Wa numakkina lahum fi al-ardi wa nuriya fir'awna wa haamaana",
          translation: "Ularni yer yuzida mustahkam qilamiz va Fir’avn va Homonni ko‘rsatamiz",
          tafir: "Allohning zolimlarga qarshi adolatli hukmi haqida.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٧",
          numberLatin: "7",
          arabic: "وَأَوْحَيْنَآ إِلَىٰٓ أُمِّ مُوسَىٰٓ أَنْ أَرْضِعِيهِ",
          transcription: "Wa aw haynaa ilaa ummi muusaa an ardi'iihi",
          translation: "Muso onasiga vahiy qildik: 'Uni emizgin'",
          tafir: "Muso payg‘ambarning tug‘ilishi va Allohning himoyasi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٨",
          numberLatin: "8",
          arabic: "فَٱلْتَقَطَهُۥٓ ءَالُ فِرْعَوْنَ لِيَكُونَ لَهُمْ عَدُوًّۭا",
          transcription: "Faltaqatahu aalu fir'awna li-yakuuna lahum 'aduwwan",
          translation: "Fir’avn xonadoni uni olib, o‘zlariga dushman bo‘lsin deb",
          tafir: "Muso Fir’avn saroyida tarbiyalanishi va ilohiy taqdir.",
          copySymbol: "📋"
        },
        {
          numberArabic: "٩",
          numberLatin: "9",
          arabic: "وَقَالَتِ ٱمْرَأَتُ فِرْعَوْنَ قُرَّتُ عَيْنٍۢ لِّى وَلَكَ",
          transcription: "Wa qaalati imra'atu fir'awna qurratu 'aynin lii walak",
          translation: "Fir’avn xotini dedi: 'Bu men va sen uchun ko‘z nuridir'",
          tafir: "Fir’avn xotinining Musoga muhabbati va himoyasi.",
          copySymbol: "📋"
        },
        {
          numberArabic: "١٠",
          numberLatin: "10",
          arabic: "وَأَصْبَحَ فُؤَادُ أُمِّ مُوسَىٰ فَٰرِغًۭا",
          transcription: "Wa asbaha fu'aadu ummi muusaa faarighan",
          translation: "Muso onasining qalbi bo‘shaldi",
          tafir: "Muso onasining farzandiga bo‘lgan tashvishi va Allohning yordami.",
          copySymbol: "📋"
        },
          {
            "numberArabic": "١١",
            "numberLatin": "11",
            "arabic": "وَقَالَتْ لِأُخْتِهِۦ قُصِّيهِۦ فَبَصُرَتْ بِهِۦ عَن جُنُبٍۢ وَهُمْ لَا يَشْعُرُونَ",
            "transcription": "Wa qālat li-ukhtihi quṣṣīhi fa-baṣurat bihī ʿan junubin wa hum lā yashʿurūn",
            "translation": "Ona uning (Musoning) opasiga: \"Uni kuzatib bor\" dedi. U esa uzoqdan uni kuzatib turdi, ular esa sezmadilar.",
            "tafsir": "Muso alayhissalomning opasi uni kuzatib borishi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٢",
            "numberLatin": "12",
            "arabic": "وَحَرَّمْنَا عَلَيْهِ ٱلْمَرَاضِعَ مِن قَبْلُ فَقَالَتْ هَلْ أَدُلُّكُمْ عَلَىٰٓ أَهْلِ بَيْتٍۢ يَكْفُلُونَهُۥ لَكُمْ وَهُمْ لَهُۥ نَٰصِحُونَ",
            "transcription": "Wa ḥarramnā ʿalayhi l-marāḍiʿa min qablu fa-qālat hal adullukum ʿalā ahli baytin yakfulūnahu lakum wa hum lahū nāṣiḥūn",
            "translation": "Biz ilgari unga (Musoga) boshqa emizgan onalarni harom qilgan edik. (Opa) dedi: \"Sizlarga unga g'amxo'rlik qiladigan va unga samimiy maslahat beradigan oilani ko'rsataymi?\"",
            "tafsir": "Muso alayhissalomni emizishga haqiqiy onasini topish haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٣",
            "numberLatin": "13",
            "arabic": "فَرَدَدْنَٰهُ إِلَىٰٓ أُمِّهِۦ كَىْ تَقَرَّ عَيْنُهَا وَلَا تَحْزَنَ وَلِتَعْلَمَ أَنَّ وَعْدَ ٱللَّـهِ حَقٌّۭ وَلَـٰكِنَّ أَكْثَرَهُمْ لَا يَعْلَمُونَ",
            "transcription": "Fa-radadnāhu ilā ummihi kay taqarra ʿaynuha wa lā taḥzana wa li-taʿlama anna waʿda llāhi ḥaqqun wa lākinna aktharahum lā yaʿlamūn",
            "translation": "Shunda Biz uni onasiga qaytardik, ko'zi quvonchga to'lsin va qayg'urmasin va Allohning va'dasi haq ekanini bilsin diydik. Lekin ularning ko'pchiligi (buni) bilmaydilar.",
            "tafsir": "Muso alayhissalomning onasiga qaytarilishi va Allohning va'dasining haqiqati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٤",
            "numberLatin": "14",
            "arabic": "وَلَمَّا بَلَغَ أَشُدَّهُۥ وَٱسْتَوَىٰٓ ءَاتَيْنَٰهُ حُكْمًۭا وَعِلْمًۭا ۚ وَكَذَٰلِكَ نَجْزِى ٱلْمُحْسِنِينَ",
            "transcription": "Wa lammā balagha ashuddahu wa stawā ātaynāhu ḥukman wa ʿilman wa kadhalika najzī l-muḥsinīn",
            "translation": "U yetuk yoshga yetib, bo'yi-baravarlashgach, Biz unga hikmat va ilm ato etdik. Biz yaxshilik qilganlarni shunday mukofotlaymiz.",
            "tafsir": "Muso alayhissalomga ato etilgan hikmat va ilim haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٥",
            "numberLatin": "15",
            "arabic": "وَدَخَلَ ٱلْمَدِينَةَ عَلَىٰ حِينِ غَفْلَةٍۢ مِّنْ أَهْلِهَا فَوَجَدَ فِيهَا رَجُلَيْنِ يَقْتَتِلَانِ هَـٰذَا مِن شِيعَتِهِۦ وَهَـٰذَا مِنْ عَدُوِّهِۦ ۖ فَٱسْتَغَٰثَهُ ٱلَّذِى مِن شِيعَتِهِۦ عَلَى ٱلَّذِى مِنْ عَدُوِّهِۦ فَوَكَزَهُۥ مُوسَىٰ فَقَضَىٰ عَلَيْهِ ۖ قَالَ هَـٰذَا مِنْ عَمَلِ ٱلشَّيْطَٰنِ ۖ إِنَّهُۥ عَدُوٌّۭ مُّضِلٌّۭ مُّبِينٌۭ",
            "transcription": "Wa dakhala l-madīnata ʿalā ḥīni ghaflatin min ahlihā fa-wajada fīhā rajulayni yaqtatilāni hādhā min shīʿatihī wa hādhā min ʿaduwwihī fa-staghāthahu lladhī min shīʿatihī ʿalā lladhī min ʿaduwwihī fa-wakazahū mūsā fa-qaḍā ʿalayhi qāla hādhā min ʿamali sh-shayṭāni innahū ʿaduwwun muḍillun mubīn",
            "translation": "U (Muso) shahar aholisi g'afil bo'lgan bir paytda shaharga kirdi va u yerda ikki kishini urishayotganini ko'rdi: biri uning qavmidan, ikkinchisi esa dushmanlaridan edi. Qavmidagi kishi dushmaniga qarshi undan yordam so'radi. Muso uni mushtlab yubordi va o'limiga sabab bo'ldi. (Muso): \"Bu shayton ishidir. Albatta, u ochiq-oydin adashtiruvchi dushmandir\" dedi.",
            "tafsir": "Muso alayhissalomning bir misrlikni o'ldirish hodisasi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٦",
            "numberLatin": "16",
            "arabic": "قَالَ رَبِّ إِنِّى ظَلَمْتُ نَفْسِى فَٱغْفِرْ لِى فَغَفَرَ لَهُۥٓ ۚ إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ",
            "transcription": "Qāla rabbi innī ẓalamtu nafsī fa-ghfir lī fa-ghafara lahū innahū huwa l-ghafūru r-raḥīm",
            "translation": "Muso dedi: \"Rabbim, men o'zimga zulm qildim. Menga mag'firat qil\". Alloh unga mag'firat qildi. Albatta, U mag'firat qiluvchi, rahmli Zotdir.",
            "tafsir": "Muso alayhissalomning tavbasi va Allohning mag'firati haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٧",
            "numberLatin": "17",
            "arabic": "قَالَ رَبِّ بِمَآ ءَاتَيْتَنِى مِنَ ٱلْخَيْرِ فَلَنْ أَكُونَ ظَهِيرًۭا لِّلْمُجْرِمِينَ",
            "transcription": "Qāla rabbi bimā ātaytanī mina l-khayri fa-lan akūna ẓahīran li-l-mujrimīn",
            "translation": "Muso dedi: \"Rabbim, menga in'om etgan ne'matlaring uchun men endi jinoyatchilarga yordamchi bo'lmayman\".",
            "tafsir": "Muso alayhissalomning Allohga shukri va qasamyodi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٨",
            "numberLatin": "18",
            "arabic": "فَأَصْبَحَ فِى ٱلْمَدِينَةِ خَآئِفًۭا يَتَرَقَّبُ فَإِذَا ٱلَّذِى ٱسْتَنصَرَهُۥ بِٱلْأَمْسِ يَسْتَصْرِخُهُۥ ۚ قَالَ لَهُۥ مُوسَىٰٓ إِنَّكَ لَغَوِىٌّۭ مُّبِينٌۭ",
            "transcription": "Fa-aṣbaḥa fī l-madīnati khāifan yataraqqabu fa-idhā lladhī stansarahu bi-l-amsi yastaṣrikhuhū qāla lahū mūsā innaka laghawiyyun mubīn",
            "translation": "Ertalab u shaharda qo'rquvda edi, atrofga nazar solar edi. Kecha undan yordam so'ragan kishi yana unga yordamga chaqirdi. Muso unga dedi: \"Albatta, sen ochiq-oydin adashgansan\".",
            "tafsir": "Muso alayhissalomning shaharda qo'rquvda yurishi va yana bir janjalga duch kelishi haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "١٩",
            "numberLatin": "19",
            "arabic": "فَلَمَّآ أَنْ أَرَادَ أَن يَبْطِشَ بِٱلَّذِى هُوَ عَدُوٌّۭ لَّهُمَا قَالَ يَٰمُوسَىٰٓ أَتُرِيدُ أَن تَقْتُلَنِى كَمَا قَتَلْتَ نَفْسًۢا بِٱلْأَمْسِ ۖ إِن تُرِيدُ إِلَّآ أَن تَكُونَ جَبَّارًۭا فِى ٱلْأَرْضِ وَمَا تُرِيدُ أَن تَكُونَ مِنَ ٱلْمُصْلِحِينَ",
            "transcription": "Fa-lammā an arāda an yabṭisha bi-lladhī huwa ʿaduwwun lahumā qāla yā mūsā aturīdu an taqtulanī kamā qatalta nafsan bi-l-amsi in turīdu illā an takūna jabbāran fī l-arḍi wa mā turīdu an takūna mina l-muṣliḥīn",
            "translation": "Qachonki Muso ikkalasining dushmani bo'lgan odamni ushlamoqchi bo'ldi, u (Misrlik) dedi: \"Ey Muso! Kecha bir odamni o'ldirgandek, meni ham o'ldirmoqchimisan? Sen faqat yer yuzida zo'ravon bo'lishni xohlaysan, islohotchilardan bo'lishni xohlamaysan\".",
            "tafsir": "Muso alayhissalom bilan misrlik o'rtasidagi bahs haqida.",
            "copySymbol": "📋"
          },
          {
            "numberArabic": "٢٠",
            "numberLatin": "20",
            "arabic": "وَجَآءَ رَجُلٌۭ مِّنْ أَقْصَا ٱلْمَدِينَةِ يَسْعَىٰ قَالَ يَٰمُوسَىٰٓ إِنَّ ٱلْمَلَأَ يَأْتَمِرُونَ بِكَ لِيَقْتُلُوكَ فَٱخْرُجْ إِنِّى لَكَ مِنَ ٱلنَّٰصِحِينَ",
            "transcription": "Wa jāa rajulun min aqṣā l-madīnati yasʿā qāla yā mūsā inna l-mala`a ya`tamirūna bika li-yaqtulūka fa-ukhruj innī laka mina n-nāṣiḥīn",
            "translation": "Shaharning narigi tomonidan bir kishi yugurib keldi va dedi: \"Ey Muso! Oliy kengash (Fir'avn kengashi) seni o'ldirish to'g'risida maslahatlashmoqda. (Shahardan) chiqib ket, men senga samimiy maslahat beruvchilardanman\".",
            "tafsir": "Muso alayhissalomga qilingan ogohlantirish va uning Misrdan chiqib ketishi haqida.",
            "copySymbol": "📋"
        }
      ]
    },
      {
        id: 29,
        name: "Al-Ankabut",
        arabicName: "العنكبوت",
        meaning: "O‘rgimchak",
        ayahCount: 69,
        place: "Makka",
        prelude: {
          bismillah: {
            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            transcription: "Bismillahir-Rahmanir-Rahiim",
            translation: "Mehribon va rahmli Alloh nomi bilan",
            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
            copySymbol: "📋"
          }
        },
        ayahs: [
          {
            numberArabic: "١",
            numberLatin: "1",
            arabic: "الٓمٓ",
            transcription: "Alif Laam Miim",
            translation: "Alif, Lam, Mim",
            tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٢",
            numberLatin: "2",
            arabic: "أَحَسِبَ ٱلنَّاسُ أَن يُتْرَكُوا۟ أَن يَقُولُوٓا۟ ءَامَنَّا وَهُمْ لَا يُفْتَنُونَ",
            transcription: "Ahasiba an-naasu an yutrakuu an yaquuluu aamannaa wahum laa yuftanuun",
            translation: "Odamlar 'Iymon keltirdik' desalar, sinovsiz qoldiriladimi?",
            tafsir: "Mo‘minlarning sinovdan o‘tishi va iymonning sinovi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٣",
            numberLatin: "3",
            arabic: "وَلَقَدْ فَتَنَّا ٱلَّذِينَ مِن قَبْلِهِمْ ۖ فَلَيَعْلَمَنَّ ٱللَّهُ",
            transcription: "Walaqad fatannaa alladhiina min qablihim falaya'lamanna allaahu",
            translation: "Ulardan oldingilarni sinadik, Alloh albatta biladi",
            tafsir: "O‘tgan ummatlarning sinovlari va Allohning bilishi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٤",
            numberLatin: "4",
            arabic: "أَمْ حَسِبَ ٱلَّذِينَ يَعْمَلُونَ ٱلسَّيِّـَٔاتِ أَن يَسْبِقُونَا",
            transcription: "Am hasiba alladhiina ya'maluuna as-sayyi'aati an yasbiquunaa",
            translation: "Yomonlik qilganlar bizdan qochib qutuladimi?",
            tafsir: "Gunohkorlarning jazodan qochib qutula olmasligi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٥",
            numberLatin: "5",
            arabic: "مَن كَانَ يَرْجُوا۟ لِقَآءَ ٱللَّهِ فَإِنَّ أَجَلَ ٱللَّهِ لَءَاتٍۢ",
            transcription: "Man kaana yarjuu liqaa'a allaahi fa-inna ajala allaahi la-aatin",
            translation: "Kim Allohga uchrashni umid qilsa, Allohning muddati keladi",
            tafsir: "Allohning va’dasi va uchrashuv kuni haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٦",
            numberLatin: "6",
            arabic: "وَمَن جَٰهَدَ فَإِنَّمَا يُجَٰهِدُ لِنَفْسِهِۦٓ",
            transcription: "Wa man jaahada fa-innamaa yujaahidu linafsihi",
            translation: "Kim jihod qilsa, o‘zi uchun jihod qiladi",
            tafsir: "Jihodning o‘ziga foydasi va Allohning mustaqilligi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٧",
            numberLatin: "7",
            arabic: "وَٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ لَنُكَفِّرَنَّ عَنْهُمْ سَيِّـَٔاتِهِمْ",
            transcription: "Walladhiina aamanuu wa 'amiluu as-saalihaati lanukaffiranna 'anhum sayyi'aatihim",
            translation: "Iymon keltirib, yaxshi amal qilganlarning gunohlari kechiriladi",
            tafsir: "Iymon va solih amalning gunohlarni yuvishi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٨",
            numberLatin: "8",
            arabic: "وَوَصَّيْنَا ٱلْإِنسَٰنَ بِوَٰلِدَيْهِ حُسْنًۭا",
            transcription: "Wa wassaynaa al-insaana biwaalidayhi husnan",
            translation: "Biz insonga ota-onasiga yaxshilik qilishni vasiyat qildik",
            tafsir: "Ota-onaga hurmat va yaxshilik qilishning ahamiyati.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٩",
            numberLatin: "9",
            arabic: "وَإِن جَٰهَدَاكَ لِتُشْرِكَ بِى مَا لَيْسَ لَكَ بِهِۦ عِلْمٌۭ فَلَا تُطِعْهُمَا",
            transcription: "Wa in jaahadaaka litushrika bii maa laysa laka bihi 'ilmun falaa tuti'humaa",
            translation: "Agar seni bilmagan narsaga shirk keltirishga majburlasa, itoat qilma",
            tafsir: "Shirkdan saqlanish va ota-onaga itoatning chegarasi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٠",
            numberLatin: "10",
            arabic: "وَمِنَ ٱلنَّاسِ مَن يَقُولُ ءَامَنَّا بِٱللَّهِ فَإِذَآ أُوذِىَ فِى ٱللَّهِ",
            transcription: "Wa mina an-naasi man yaquulu aamannaa billaahi fa-idhaa uudhiya fi illaahi",
            translation: "Odamlar orasida 'Allohga iymon keltirdik' deydiganlar bor, lekin ozor ko‘rsa",
            tafsir: "Iymonning sinovi va munosabatlarning oqibati haqida.",
            copySymbol: "📋"
            
          }
        ]
      },
      {
        id: 30,
        name: "Ar-Rum",
        arabicName: "الروم",
        meaning: "Rimliklar",
        ayahCount: 60,
        place: "Makka",
        prelude: {
          bismillah: {
            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            transcription: "Bismillahir-Rahmanir-Rahiim",
            translation: "Mehribon va rahmli Alloh nomi bilan",
            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
            copySymbol: "📋"
          }
        },
        ayahs: [
          {
            numberArabic: "١",
            numberLatin: "1",
            arabic: "الٓمٓ",
            transcription: "Alif Laam Miim",
            translation: "Alif, Lam, Mim",
            tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٢",
            numberLatin: "2",
            arabic: "غُلِبَتِ ٱلرُّومُ",
            transcription: "Ghulibati ar-ruum",
            translation: "Rimliklar mag‘lub bo‘ldi",
            tafsir: "Rimliklarning forslar oldida mag‘lub bo‘lishi haqida bashorat.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٣",
            numberLatin: "3",
            arabic: "فِىٓ أَدْنَى ٱلْأَرْضِ وَهُم مِّنۢ بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ",
            transcription: "Fii adnaa al-ardi wahum min ba'di ghalabihim sayaghlibuun",
            translation: "Yerning eng yaqin joyida, lekin mag‘lubiyatdan keyin g‘olib bo‘ladilar",
            tafsir: "Rimliklarning yaqin kelajakda g‘alaba qozonishi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٤",
            numberLatin: "4",
            arabic: "فِى بِضْعِ سِنِينَ ۗ لِلَّهِ ٱلْأَمْرُ مِن قَبْلُ وَمِنۢ بَعْدُ",
            transcription: "Fii bid'i siniina lillaahi al-amru min qablu wamin ba'du",
            translation: "Bir necha yil ichida, ish Allohning ixtiyorida, avval va keyin",
            tafsir: "Allohning hamma ishni boshqarishi va vaqt chegarasi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٥",
            numberLatin: "5",
            arabic: "وَيَوْمَئِذٍۢ يَفْرَحُ ٱلْمُؤْمِنُونَ",
            transcription: "Wa yawma'idhin yafrahu al-mu'minuun",
            translation: "O‘sha kuni mo‘minlar xursand bo‘ladilar",
            tafsir: "Mo‘minlarning Rim g‘alabasi bilan quvonishi haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٦",
            numberLatin: "6",
            arabic: "بِنَصْرِ ٱللَّهِ ۚ يَنصُرُ مَن يَشَآءُ",
            transcription: "Binabri allaahi yansuru man yashaa'u",
            translation: "Allohning yordami bilan, U xohlagan kishiga yordam beradi",
            tafsir: "Allohning yordami va qudrati haqida tasdiqlash.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٧",
            numberLatin: "7",
            arabic: "يَعْلَمُونَ ظَٰهِرًۭا مِّنَ ٱلْحَيَوٰةِ ٱلدُّنْيَا",
            transcription: "Ya'lamuuna zhaahiran mina al-hayaati ad-dunyaa",
            translation: "Ular dunyo hayotining zohirini biladilar",
            tafsir: "Odamlarning dunyoviy bilimlari va oxiratdan g‘ofilligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٨",
            numberLatin: "8",
            arabic: "أَوَلَمْ يَتَفَكَّرُوا۟ فِىٓ أَنفُسِهِم ۗ مَا خَلَقَ ٱللَّهُ ٱلسَّمَٰوَٰتِ",
            transcription: "Awalam yatafakkaru fii anfusihim maa khalaqa allaahu as-samaawaati",
            translation: "O‘zlarida tafakkur qilmadilarmi? Alloh osmonlarni yaratdi",
            tafsir: "Insonning o‘zini va koinotni tafakkur qilishi zarurligi.",
            copySymbol: "📋"
          },
          {
            numberArabic: "٩",
            numberLatin: "9",
            arabic: "أَوَلَمْ يَسِيرُوا۟ فِى ٱلْأَرْضِ فَيَنظُرُوا۟ كَيْفَ كَانَ عَٰقِبَةُ ٱلَّذِينَ مِن قَبْلِهِمْ",
            transcription: "Awalam yasiiruu fi al-ardi fayanzhuruu kayfa kaana 'aaqibatu alladhiina min qablihim",
            translation: "Yer yuzida sayr qilmadilarmi, oldingilarning oqibatini ko‘rish uchun?",
            tafsir: "O‘tgan ummatlarning halokati va undan ibrat olish haqida.",
            copySymbol: "📋"
          },
          {
            numberArabic: "١٠",
            numberLatin: "10",
            arabic: "ثُمَّ كَانَ عَٰقِبَةَ ٱلَّذِينَ أَسَٰٓـُٔوا۟ ٱلسُّوٓأَىٰٓ أَن كَذَّبُوا۟ بِـَٔايَٰتِ ٱللَّهِ",
            transcription: "Thumma kaana 'aaqibata alladhiina asaa'uu as-suu'aa an kadhdhabuu bi-aayaati allaahi",
            translation: "Yomonlik qilganlarning oqibati yomon bo‘ldi, chunki ular Allohning oyatlarini yolg‘on dedilar",
            tafsir: "Kofirlarning Alloh oyatlarini inkor qilishi va oqibati.",
            copySymbol: "📋"
          },
            {
              "numberArabic": "١١",
              "numberLatin": "11",
              "arabic": "ٱللَّهُ يَبْدَؤُا۟ ٱلْخَلْقَ ثُمَّ يُعِيدُهُۥ ثُمَّ إِلَيْهِ تُرْجَعُونَ",
              "transcription": "Allāhu yabda`u al-khalqa thumma yu`īduhu thumma ilayhi turja`ūn",
              "translation": "Alloh yaratishni boshlaydi, soʻngra uni qaytaradi, soʻngra siz Unga qaytarilasiz.",
              "tafsir": "Allohning yaratish va qayta tiriltirish qudrati haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٢",
              "numberLatin": "12",
              "arabic": "وَيَوْمَ تَقُومُ ٱلسَّاعَةُ يُبْلِسُ ٱلْمُجْرِمُونَ",
              "transcription": "Wa yawma taqūmu as-sā`atu yublisu al-mujrimūn",
              "translation": "Qiyomat kuni qoʻzgʻalganda, jinoyatchilar umidsizlikka tushadilar.",
              "tafsir": "Qiyomat kuni kofirlarning holati haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٣",
              "numberLatin": "13",
              "arabic": "وَلَمْ يَكُن لَّهُم مِّن شُرَكَآئِهِمْ شُفَعَـٰٓؤُا۟ وَكَانُوا۟ بِشُرَكَآئِهِمْ كَـٰفِرِينَ",
              "transcription": "Wa lam yakun lahum min shurakā`ihim shufa`ā`u wa kānū bishurakā`ihim kāfirīn",
              "translation": "Ularning sheriklari (butlari) orasida ular uchun shafoat qiluvchilar boʻlmaydi va ular sheriklarini inkor qiladilar.",
              "tafsir": "Butlarning shafoat qilishga qodir emasligi haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٤",
              "numberLatin": "14",
              "arabic": "وَيَوْمَ تَقُومُ ٱلسَّاعَةُ يَوْمَئِذٍۢ يَتَفَرَّقُونَ",
              "transcription": "Wa yawma taqūmu as-sā`atu yawma`idhin yatafarraqūn",
              "translation": "Qiyomat kuni qoʻzgʻalganda, ular (moʻmin va kofirlar) ajralishadilar.",
              "tafsir": "Qiyomat kuni moʻmin va kofirlarning ajralishi haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٥",
              "numberLatin": "15",
              "arabic": "فَأَمَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ فَهُمْ فِى رَوْضَةٍۢ يُحْبَرُونَ",
              "transcription": "Fa`ammā alladhīna āmanū wa `amilu aṣ-ṣāliḥāti fa hum fī rawḍatin yuḥbarūn",
              "translation": "Imon keltirgan va solih amallar qilganlar esa, ular roʻzgorda (jannatda) quvonch ichida boʻladilar.",
              "tafsir": "Moʻminlar uchun jannatdagi neʼmatlar haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٦",
              "numberLatin": "16",
              "arabic": "وَأَمَّا ٱلَّذِينَ كَفَرُوا۟ وَكَذَّبُوا۟ بِـَٔايَـٰتِنَا وَلِقَآئِ ٱلْـَٔاخِرَةِ فَأُو۟لَـٰٓئِكَ فِى ٱلْعَذَابِ مُحْضَرُونَ",
              "transcription": "Wa `ammā alladhīna kafarū wa kadhabū bi`āyātinā wa liqā`i al-ākhirati fa`ulā`ika fī al-`adhābi muḥḍarūn",
              "translation": "Kofir boʻlib, oyatlarimiz va oxirat uchrashuvini yolgʻon deb hisoblaganlar esa, ular azobga tushadilar.",
              "tafsir": "Kofirlarning jahannamdagi azobi haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٧",
              "numberLatin": "17",
              "arabic": "فَسُبْحَـٰنَ ٱللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ",
              "transcription": "Fasubḥāna Allāhi ḥīna tumsūna wa ḥīna tuṣbiḥūn",
              "translation": "Kechqurun va tongda Allohni poklang!",
              "tafsir": "Kunlik zikr va ibodat ahamiyati haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٨",
              "numberLatin": "18",
              "arabic": "وَلَهُ ٱلْحَمْدُ فِى ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ وَعَشِيًّۭا وَحِينَ تُظْهِرُونَ",
              "transcription": "Wa lahu al-ḥamdu fī as-samāwāti wa al-arḍi wa `ashiyyan wa ḥīna tuẓhirūn",
              "translation": "Osmonlarda va yerdagi hamd Unga xosdir. Kechqurun ham, tush paytida ham (Unga hamd aytiling).",
              "tafsir": "Har vaqt Allohga shukr va hamd aytish haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "١٩",
              "numberLatin": "19",
              "arabic": "يُخْرِجُ ٱلْحَىَّ مِنَ ٱلْمَيِّتِ وَيُخْرِجُ ٱلْمَيِّتَ مِنَ ٱلْحَىِّ وَيُحْىِ ٱلْأَرْضَ بَعْدَ مَوْتِهَا ۚ وَكَذَٰلِكَ تُخْرَجُونَ",
              "transcription": "Yukhriju al-ḥayya min al-mayyiti wa yukhriju al-mayyita min al-ḥayyi wa yuḥyi al-arḍa ba`da mawtihā, wa kadhalika tukhrajūn",
              "translation": "U tirikni oʻlikdan va oʻlikni tirikdan chiqaradi. Yerni oʻlik boʻlganidan keyin tiriltiradi. Sizlar ham shunday (qabrlarizdan) chiqarilasiz.",
              "tafsir": "Allohning hayot va oʻlimga hukmronligi haqida.",
              "copySymbol": "📋"
            },
            {
              "numberArabic": "٢٠",
              "numberLatin": "20",
              "arabic": "وَمِنْ ءَايَـٰتِهِۦٓ أَنْ خَلَقَكُم مِّن تُرَابٍۢ ثُمَّ إِذَآ أَنتُم بَشَرٌۭ تَنتَشِرُونَ",
              "transcription": "Wa min `āyātihi an khalaqakum min turābin thumma idhā antum basharun tantashirūn",
              "translation": "Uning oyatlaridan biri - sizlarni tuproqdan yaratgani, keyin esa sizlar inson boʻlib tarqalib yurasiz.",
              "tafsir": "Insonning tuproqdan yaratilishi haqida.",
              "copySymbol": "📋"
          }
        ]
      },
        {
          id: 31,
          name: "Luqmon",
          arabicName: "لقمان",
          meaning: "Luqmon",
          ayahCount: 34,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "الٓمٓ",
              transcription: "Alif Laam Miim",
              translation: "Alif, Lam, Mim",
              tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "تِلْكَ ءَايَٰتُ ٱلْكِتَٰبِ ٱلْحَكِيمِ",
              transcription: "Tilka aayaatu al-kitaabi al-hakiim",
              translation: "Bu hikmatli Kitobning oyatlaridir",
              tafsir: "Qur’onning hikmatli va haqiqiy kitob ekanligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "هُدًۭى وَرَحْمَةًۭ لِّلْمُحْسِنِينَ",
              transcription: "Hudan wa rahmatan lil-muhsiniin",
              translation: "Yaxshilik qiluvchilar uchun hidoyat va rahmatdir",
              tafsir: "Qur’onning yaxshi odamlar uchun yo‘l-yo‘riq ekanligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "ٱلَّذِينَ يُقِيمُونَ ٱلصَّلَوٰةَ وَيُؤْتُونَ ٱلزَّكَوٰةَ",
              transcription: "Alladhiina yuqiimuuna as-salaata wa yu'tuuna az-zakaata",
              translation: "Ular namozni ado qiladilar va zakot beradilar",
              tafsir: "Mo‘minlarning ibodat va sadaqa sifatlari haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "أُو۟لَٰٓئِكَ عَلَىٰ هُدًۭى مِّن رَّبِّهِمْ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ",
              transcription: "Ulaa'ika 'alaa hudan min rabbihim wa ulaa'ika humu al-muflihuun",
              translation: "Ular Robbidan hidoyatdadirlar va ular najot topuvchilardir",
              tafsir: "Allohning yo‘lida bo‘lganlarning muvaffaqiyati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "وَمِنَ ٱلنَّاسِ مَن يَشْتَرِى لَهْوَ ٱلْحَدِيثِ لِيُضِلَّ عَن سَبِيلِ ٱللَّهِ",
              transcription: "Wa mina an-naasi man yashtarii lahwa al-hadiithi liyudhilla 'an sabiili allaahi",
              translation: "Odamlar orasida Alloh yo‘lidan adashtirish uchun bo‘sh gaplarni sotib oluvchilar bor",
              tafsir: "Yolg‘on va foydasiz narsalarga berilganlar haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "وَإِذَا تُتْلَىٰ عَلَيْهِ ءَايَٰتُنَا وَلَّىٰ مُسْتَكْبِرًۭا",
              transcription: "Wa idhaa tutlaa 'alayhi aayaatunaa wallaa mustakbiran",
              translation: "Unga oyatlarimiz o‘qilganda, u mag‘rur bo‘lib yuz o‘giradi",
              tafsir: "Kofirlarning Qur’onni rad qilishi va takabburligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "وَمَا خَلَقْنَا ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ وَمَا بَيْنَهُمَآ إِلَّا بِٱلْحَقِّ",
              transcription: "Wamaa khalaqnaa as-samaawaati wal-arda wamaa baynahumaa illaa bil-haqqi",
              translation: "Osmonlar va yer va ular orasidagilarni faqat haq bilan yaratdik",
              tafsir: "Koinotning haq maqsad bilan yaratilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "أَوَلَمْ يَسِيرُوا۟ فِى ٱلْأَرْضِ فَيَنظُرُوا۟ كَيْفَ كَانَ عَٰقِبَةُ ٱلَّذِينَ مِن قَبْلِهِمْ",
              transcription: "Awalam yasiiruu fi al-ardi fayanzuruu kayfa kaana 'aaqibatu alladhiina min qablihim",
              translation: "Yer yuzida sayr qilmadilarmi, oldingilarning oqibatini ko‘rish uchun?",
              tafsir: "O‘tgan ummatlarning halokati va undan ibrat olish haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "وَلَقَدْ ءَاتَيْنَا لُقْمَٰنَ ٱلْحِكْمَةَ أَنِ ٱشْكُرْ لِلَّهِ",
              transcription: "Walaqad aataynaa luqmaana al-hikmata ani ushkur lillahi",
              translation: "Luqmonaga hikmat berdik: 'Allohga shukr qil'",
              tafsir: "Luqmonning hikmatli maslahatlari va shukronasi haqida.",
              copySymbol: "📋"
            },
              {
                "numberArabic": "١١",
                "numberLatin": "11",
                "arabic": "هَـٰذَا خَلْقُ ٱللَّـهِ فَأَرُونِى مَاذَا خَلَقَ ٱلَّذِينَ مِن دُونِهِۦ ۚ بَلِ ٱلظَّـٰلِمُونَ فِى ضَلَـٰلٍۢ مُّبِينٍۢ",
                "transcription": "Hādhā khalqu Llāhi fa arūnī mādhā khalaqa alladhīna min dūnih, baliẓ-ẓālimūna fī ḍalālim mubīn",
                "translation": "Bu Allohning yaratishidir. Endi menga ko'rsating, Unga sherik qilib qo'yganlaringiz nima yaratgan? Yo'q, zolimlar ochiq-oydin adashganlardir.",
                "tafsir": "Allohning yagona yaratuvchi ekanligi va butlarning qudratisizligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٢",
                "numberLatin": "12",
                "arabic": "وَلَقَدْ ءَاتَيْنَا لُقْمَـٰنَ ٱلْحِكْمَةَ أَنِ ٱشْكُرْ لِلَّـهِ ۚ وَمَن يَشْكُرْ فَإِنَّمَا يَشْكُرُ لِنَفْسِهِۦ ۖ وَمَن كَفَرَ فَإِنَّ ٱللَّـهَ غَنِىٌّ حَمِيدٌۭ",
                "transcription": "Wa laqad ātaynā Luqmān al-ḥikmata ani shkur liLlāh, wa man yashkur fa innamā yashkuru li nafsih, wa man kafara fa inna Llāha ghaniyyun ḥamīd",
                "translation": "Biz Luqmonga hikmat ato etdik: \"Allohga shukr qil\". Kim shukr qilsa, o'z foydasiga shukr qiladi. Kim nankorlik qilsa, Alloh behojat va hamga yetarli Zotdir.",
                "tafsir": "Luqmon alayhissalomga ato etilgan hikmat va shukrning ahamiyati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٣",
                "numberLatin": "13",
                "arabic": "وَإِذْ قَالَ لُقْمَـٰنُ لِٱبْنِهِۦ وَهُوَ يَعِظُهُۥ يَـٰبُنَىَّ لَا تُشْرِكْ بِٱللَّـهِ ۖ إِنَّ ٱلشِّرْكَ لَظُلْمٌ عَظِيمٌۭ",
                "transcription": "Wa idh qāla Luqmān li bnihī wa huwa ya'iẓuhū yā bunayya lā tushrik biLlāh, inna ash-shirka laẓulmun 'aẓīm",
                "translation": "Luqmon o'g'liga nasihat qilar edi: \"Ey o'g'lim! Allohga sherik qo'shganing bo'lmasin. Albatta, sherik qo'shish ulkan zulmdir\".",
                "tafsir": "Luqmon alayhissalomning o'g'lini shirkdan ogohlantirishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٤",
                "numberLatin": "14",
                "arabic": "وَوَصَّيْنَا ٱلْإِنسَـٰنَ بِوَٰلِدَيْهِ حَمَلَتْهُ أُمُّهُۥ وَهْنًا عَلَىٰ وَهْنٍۢ وَفِصَـٰلُهُۥ فِى عَامَيْنِ أَنِ ٱشْكُرْ لِى وَلِوَٰلِدَيْكَ ۖ إِلَىَّ ٱلْمَصِيرُ",
                "transcription": "Wa waṣṣaynā al-insāna bi wālidayh, ḥamalathu ummuhū wahnan 'alā wahnin wa fiṣāluhū fī 'āmayn ani shkur lī wa li wālidayk, ilayya al-maṣīr",
                "translation": "Biz insonga ota-onasiga yaxshilik qilishni tavsiya qildik. Onasi uni zaiflik ustiga zaiflik bilan (og'ir holatda) homilador bo'ldi. Uni ikki yilda emizdi (dedik): \"Menga va ota-onangga shukr qil. Qaytish Mengadir\".",
                "tafsir": "Ota-onaga yaxshilik qilish va shukr etish haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٥",
                "numberLatin": "15",
                "arabic": "وَإِن جَـٰهَدَاكَ عَلَىٰٓ أَن تُشْرِكَ بِى مَا لَيْسَ لَكَ بِهِۦ عِلْمٌۭ فَلَا تُطِعْهُمَا ۖ وَصَاحِبْهُمَا فِى ٱلدُّنْيَا مَعْرُوفًۭا ۖ وَٱتَّبِعْ سَبِيلَ مَنْ أَنَابَ إِلَىَّ ۚ ثُمَّ إِلَىَّ مَرْجِعُكُمْ فَأُنَبِّئُكُم بِمَا كُنتُمْ تَعْمَلُونَ",
                "transcription": "Wa in jāhadāka 'alā an tushrika bī mā laysa laka bihī 'ilmun fa lā tuṭi'humā, wa ṣāḥibhumā fī ad-dunyā ma'rūfan, wattabi' sabīla man anāba ilayy, thumma ilayya marji'ukum fa unabbi'ukum bimā kuntum ta'malūn",
                "translation": "Agar ular (ota-ona) senga haqida biliming bo'lmagan narsani Menga sherik qo'shishga zo'rlasalar, ularga bo'ysunma. Dunyoda ular bilan yaxshilik bilan hamroh bo'l. Menga qaytganlarning yo'lidan bor. Keyin qaytishingiz Menga bo'ladi, men sizlarga qilgan amallaringiz haqida xabar beraman.",
                "tafsir": "Ota-onaga itoat chegaralari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٦",
                "numberLatin": "16",
                "arabic": "يَـٰبُنَىَّ إِنَّهَآ إِن تَكُ مِثْقَالَ حَبَّةٍۢ مِّنْ خَرْدَلٍۢ فَتَكُن فِى صَخْرَةٍ أَوْ فِى ٱلسَّمَـٰوَٰتِ أَوْ فِى ٱلْأَرْضِ يَأْتِ بِهَا ٱللَّـهُ ۚ إِنَّ ٱللَّـهَ لَطِيفٌ خَبِيرٌۭ",
                "transcription": "Yā bunayya innahā in taku mithqāla ḥabbatim min khardalin fa takun fī ṣakhrah aw fī as-samāwāti aw fī al-arḍi ya`tī bihā Allāh, inna Allāha laṭīfun khabīr",
                "translation": "\"Ey o'g'lim! Agar (qilingan ish) xardal donasi og'irligida bo'lib, qoyaning ichida yoki osmonlarda yoki yerdagi bo'lsa ham, Alloh uni (qiyomat kuni) olib keladi. Albatta, Alloh nozik ishlardan xabardor va hamma narsani biluvchidir\".",
                "tafsir": "Allohning har bir mayda-chuyda ishni bilishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٧",
                "numberLatin": "17",
                "arabic": "يَـٰبُنَىَّ أَقِمِ ٱلصَّلَوٰةَ وَأْمُرْ بِٱلْمَعْرُوفِ وَٱنْهَ عَنِ ٱلْمُنكَرِ وَٱصْبِرْ عَلَىٰ مَآ أَصَابَكَ ۖ إِنَّ ذَٰلِكَ مِنْ عَزْمِ ٱلْأُمُورِ",
                "transcription": "Yā bunayya aqimiṣ-ṣalāta wa`mur bil-ma'rūfi wanha 'ani al-munkari waṣbir 'alā mā aṣābak, inna dhālika min 'azmi al-umūr",
                "translation": "\"Ey o'g'lim! Namozni to'kis ado et, yaxshilikni buyur va yomonlikdan qaytar. Senga yetgan musibatlarga sabr qil. Albatta, bu azim ishlardandir\".",
                "tafsir": "Namoz, amr bil ma'ruf va sabrning ahamiyati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٨",
                "numberLatin": "18",
                "arabic": "وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِى ٱلْأَرْضِ مَرَحًا ۖ إِنَّ ٱللَّـهَ لَا يُحِبُّ كُلَّ مُخْتَالٍۢ فَخُورٍۢ",
                "transcription": "Wa lā tuṣa''ir khaddaka lin-nāsi wa lā tamsyi fī al-arḍi maraḥā, inna Allāha lā yuḥibbu kulla mukhtālin fakhūr",
                "translation": "\"Odamlarga yuzingni bukmaslik qil (kibr bilan qarama) va yerdada mag'rurlanib yurma. Albatta, Alloh hech bir mag'rur va maqtanganni sevmaydi\".",
                "tafsir": "Kibr va mag'rurlikdan saqlanish haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٩",
                "numberLatin": "19",
                "arabic": "وَٱقْصِدْ فِى مَشْيِكَ وَٱغْضُضْ مِن صَوْتِكَ ۚ إِنَّ أَنكَرَ ٱلْأَصْوَٰتِ لَصَوْتُ ٱلْحَمِيرِ",
                "transcription": "Waqṣid fī mashyika wagḍuḍ min ṣawtik, inna ankara al-aṣwāti laṣawtu al-ḥamīr",
                "translation": "\"Yurishingda o'rtacha bo'l, ovozingni past qil. Albatta, ovozlarning eng yomon eshakning ovozidir\".",
                "tafsir": "Odob-axloq qoidalari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٢٠",
                "numberLatin": "20",
                "arabic": "أَلَمْ تَرَوْا۟ أَنَّ ٱللَّـهَ سَخَّرَ لَكُم مَّا فِى ٱلسَّمَـٰوَٰتِ وَمَا فِى ٱلْأَرْضِ وَأَسْبَغَ عَلَيْكُمْ نِعَمَهُۥ ظَـٰهِرَةًۭ وَبَاطِنَةًۭ ۗ وَمِنَ ٱلنَّاسِ مَن يُجَـٰدِلُ فِى ٱللَّـهِ بِغَيْرِ عِلْمٍۢ وَلَا هُدًۭى وَلَا كِتَـٰبٍۢ مُّنِيرٍۢ",
                "transcription": "A lam taraw anna Allāha sakhkhara lakum mā fī as-samāwāti wa mā fī al-arḍi wa asbagha 'alaykum ni'amahū ẓāhirah wa bāṭinah, wa min an-nāsi man yujādilu fī Allāhi bi ghayri 'ilmin wa lā hudan wa lā kitābin munīr",
                "translation": "Ko'rmadingizmi, Alloh osmonlarda va yerdagi narsalarni sizning xizmatingizga qo'ydi va zahiriy va botiniy ne'matlarini sizga to'la ato etdi. Odamlardan ba'zilari Alloh haqida bilimsiz, hidoyatsiz va nurli kitobsiz bahslashadilar.",
                "tafsir": "Allohning ne'matlari va nodonlarning bahslashuvi haqida.",
                "copySymbol": "📋"
            }
          ]
        },
        {
          id: 32,
          name: "As-Sajda",
          arabicName: "السجدة",
          meaning: "Sajda",
          ayahCount: 30,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "الٓمٓ",
              transcription: "Alif Laam Miim",
              translation: "Alif, Lam, Mim",
              tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "تَنزِيلُ ٱلْكِتَٰبِ لَا رَيْبَ فِيهِ مِن رَّبِّ ٱلْعَٰلَمِينَ",
              transcription: "Tanziilu al-kitaabi laa rayba fiihi min rabbi al-'aalamiin",
              translation: "Bu Kitobning nozil bo‘lishi, unda shubha yo‘q, olamlar Robbiddandir",
              tafsir: "Qur’onning ilohiy manbasi va shubhasizligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "أَمْ يَقُولُونَ ٱفْتَرَىٰهُ ۚ بَلْ هُوَ ٱلْحَقُّ مِن رَّبِّكَ",
              transcription: "Am yaquuluuna iftaraahu bal huwa al-haqqu min rabbik",
              translation: "Ular 'Uni uydirdi' deydilarmi? Yo‘q, bu Robbingdan haqdir",
              tafsir: "Kofirlarning Qur’onni yolg‘on da’vo qilishi va uning haqiqati.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "ٱللَّهُ ٱلَّذِى خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ فِى سِتَّةِ أَيَّامٍ",
              transcription: "Allaahu alladhii khalaqa as-samaawaati wal-arda fii sittati ayyaam",
              translation: "Alloh osmonlar va yerni olti kunda yaratdi",
              tafsir: "Allohning koinotni yaratishi va qudrati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "يُدَبِّرُ ٱلْأَمْرَ مِنَ ٱلسَّمَآءِ إِلَى ٱلْأَرْضِ",
              transcription: "Yudabbiru al-amra mina as-samaa'i ilaa al-ardi",
              translation: "U osmondan yergacha ishni boshqaradi",
              tafsir: "Allohning koinotdagi hokimiyati va tartibi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "ذَٰلِكَ عَٰلِمُ ٱلْغَيْبِ وَٱلشَّهَٰدَةِ ٱلْعَزِيزُ ٱلرَّحِيمُ",
              transcription: "Dhaalika 'aalimu al-ghaybi wash-shahaadati al-'aziizu ar-rahiim",
              translation: "U g‘ayb va shohidni biluvchi, qudratli va rahmli Zotdir",
              tafsir: "Allohning ilmi, qudrati va rahmati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "ٱلَّذِىٓ أَحْسَنَ كُلَّ شَىْءٍ خَلَقَهُۥ",
              transcription: "Alladhii ahsana kulla shay'in khalaqahu",
              translation: "U hamma narsani eng yaxshi shaklda yaratdi",
              tafsir: "Allohning yaratishdagi mukammalligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "ثُمَّ جَعَلَ نَسْلَهُۥ مِن سُلَٰلَةٍۢ مِّن مَّآءٍۢ مَّهِينٍۢ",
              transcription: "Thumma ja'ala naslahu min sulaalatin min maa'in mahiin",
              translation: "So‘ngra uning naslini nochor suvdan qildi",
              tafsir: "Insonning oddiy suvdan yaratilishi va Allohning qudrati.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "ثُمَّ سَوَّىٰهُ وَنَفَخَ فِيهِ مِن رُّوحِهِۦ",
              transcription: "Thumma sawwaahu wa nafakha fiihi min ruuhihi",
              translation: "So‘ngra uni to‘g‘rilab, unga O‘z ruhidan nafash qildi",
              tafsir: "Insonning ruh bilan mukammal qilinishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "ثُمَّ جَعَلَكُمْ أَزْوَٰجًۭا ۚ وَمَا تَعْمَلُونَ مِنْ عَمَلٍ إِلَّا كَانَ ٱللَّهُ بِهِۦ عَلِيمًۭا",
              transcription: "Thumma ja'alakum azwaajan wamaa ta'maluuna min 'amalin illaa kaana allaahu bihi 'aliiman",
              translation: "So‘ngra sizlarni juft qildi, hech bir amalingiz Allohdan yashirin emas",
              tafsir: "Insonning juft yaratilishi va Allohning hamma narsani bilishi.",
              copySymbol: "📋"
            },
              {
                "numberArabic": "١١",
                "numberLatin": "11",
                "arabic": "قُلْ يَتَوَفَّىٰكُم مَّلَكُ ٱلْمَوْتِ ٱلَّذِى وُكِّلَ بِكُمْ ثُمَّ إِلَىٰ رَبِّكُمْ تُرْجَعُونَ",
                "transcription": "Qul yatawaffākum malakul-mautilladhī wukkila bikum thumma ilā rabbikum turja'ūn",
                "translation": "(Ey Muhammad,) ayt: \"Sizlarni vafot ettiruvchi o'lim malakisi, sizga tayinlangan (malak)dir. So'ngra siz Robbingizga qaytarilasiz\".",
                "tafsir": "O'lim malakasi va oxiratga qaytish haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٢",
                "numberLatin": "12",
                "arabic": "وَلَوْ تَرَىٰٓ إِذِ ٱلْمُجْرِمُونَ نَاكِسُوا۟ رُءُوسِهِمْ عِندَ رَبِّهِمْ رَبَّنَآ أَبْصَرْنَا وَسَمِعْنَا فَٱرْجِعْنَا نَعْمَلْ صَـٰلِحًۭا إِنَّا مُوقِنُونَ",
                "transcription": "Wa law tarā idhil-mujrimūna nākisū ru`ūsihim 'inda rabbihim rabbanā abṣarnā wa sami'nā farji'nā na'mal ṣāliḥan innā mūqinūn",
                "translation": "Agar jinoyatchilarni ko'rsang (qiyomatda) Robbilarining huzurida boshlarini eggan holda: \"Robbimiz! Ko'rdik va eshitdik. Bizni (dunyoga) qaytar, solih amal qilaylik, chunki biz (haqda) ishonch hosil qilganmiz\" deyayotganlarini ko'rsang (ajablanarding)!",
                "tafsir": "Qiyomat kuni gunohkorlarning pushaymonligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٣",
                "numberLatin": "13",
                "arabic": "وَلَوْ شِئْنَا لَـَٔاتَيْنَا كُلَّ نَفْسٍ هُدَىٰهَا وَلَـٰكِنْ حَقَّ ٱلْقَوْلُ مِنِّى لَأَمْلَأَنَّ جَهَنَّمَ مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ أَجْمَعِينَ",
                "transcription": "Wa law shi`nā la`ātaynā kulla nafsin hudāhā wa lākin ḥaqqal-qawlu minnī la`amla`anna jahannama minal-jinnati wan-nāsi ajma'īn",
                "translation": "Agar Biz xohlasak, har bir nafsga uning hidoyatini ato etar edik. Lekin Menim so'zim haq bo'ldi: \"Albatta Men jahannamni jinlar va odamlardan to'ldiraman\".",
                "tafsir": "Allohning irodasi va jahannam aholisi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٤",
                "numberLatin": "14",
                "arabic": "فَذُوقُوا۟ بِمَا نَسِيتُمْ لِقَآءَ يَوْمِكُمْ هَـٰذَا إِنَّا نَسِينَـٰكُمْ ۖ وَذُوقُوا۟ عَذَابَ ٱلْخُلْدِ بِمَا كُنتُمْ تَعْمَلُونَ",
                "transcription": "Fadhūqū bimā nasītum liqā`a yawmikum hādhā innā nasīnākum wa dhūqū 'adhābal-khuldi bimā kuntum ta'malūn",
                "translation": "\"Endi bu kuningizga uchrashishni unutganingiz uchun (azobni) toting. Biz ham sizni unutdik. Qilgan ishlaringiz uchun abadiy azobni toting\".",
                "tafsir": "Kofirlarning jahannamdagi azobi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٥",
                "numberLatin": "15",
                "arabic": "إِنَّمَا يُؤْمِنُ بِـَٔايَـٰتِنَا ٱلَّذِينَ إِذَا ذُكِّرُوا۟ بِهَا خَرُّوا۟ سُجَّدًۭا وَسَبَّحُوا۟ بِحَمْدِ رَبِّهِمْ وَهُمْ لَا يَسْتَكْبِرُونَ ۩",
                "transcription": "Innamā yu`minu bi`āyātinalladhīna idhā dhukkirū bihā kharrū sujjadan wa sabbaḥū biḥamdi rabbihim wa hum lā yastakbirūn",
                "translation": "Bizning oyatlarimizga faqatgina ular eslatilganda sajda qilib yiqiladigan, Robbilarini hamd bilan poklaydigan va kibr qilmaydiganlar imon keltiradilar.",
                "tafsir": "Haqiqiy mo'minlarning sifatlari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٦",
                "numberLatin": "16",
                "arabic": "تَتَجَافَىٰ جُنُوبُهُمْ عَنِ ٱلْمَضَاجِعِ يَدْعُونَ رَبَّهُمْ خَوْفًۭا وَطَمَعًۭا وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ",
                "transcription": "Tatajāfā junūbuhum 'anil-maḍāji'i yad'ūna rabbahum khawfan wa ṭama'ān wa mimmā razaqnāhum yunfiqūn",
                "translation": "Ular (kechalari) yonlarini yotoqlardan ajratib, qo'rquv va umid bilan Robbilariga duo qiladilar va Biz ulagan narsalarimizdan (Alloh yo'lida) infoq qiladilar.",
                "tafsir": "Taqvolarning ibodati va xayr-ehsonlari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٧",
                "numberLatin": "17",
                "arabic": "فَلَا تَعْلَمُ نَفْسٌۭ مَّآ أُخْفِىَ لَهُم مِّن قُرَّةِ أَعْيُنٍۢ جَزَآءًۢ بِمَا كَانُوا۟ يَعْمَلُونَ",
                "transcription": "Falā ta'lamu nafsum mā ukhfiya lahum min qurrati a'yunin jazā`am bimā kānū ya'malūn",
                "translation": "Hech bir nafs ularning ko'zlari quvonchi bo'ladigan qanday mukofotlar ular uchun yashiringanini bilmaydi. Bu ular qilgan amallarining jazosidir.",
                "tafsir": "Jannatdagi yashirin ne'matlar haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٨",
                "numberLatin": "18",
                "arabic": "أَفَمَن كَانَ مُؤْمِنًۭا كَمَن كَانَ فَـٰسِقًۭا ۚ لَّا يَسْتَوُۥنَ",
                "transcription": "Afaman kāna mu`minan kaman kāna fāsiqā, lā yastawūn",
                "translation": "Shunday bo'lsa, imonli kishi fosiq kishi kabi bo'ladimi? Ular teng emaslar.",
                "tafsir": "Mo'min va fosiqlarning farqi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٩",
                "numberLatin": "19",
                "arabic": "أَمَّا ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ فَلَهُمْ جَنَّـٰتُ ٱلْمَأْوَىٰ نُزُلًۢا بِمَا كَانُوا۟ يَعْمَلُونَ",
                "transcription": "Ammalladhīna āmanū wa 'amiluṣ-ṣāliḥāti falahum jannātul-ma`wā nuzulam bimā kānū ya'malūn",
                "translation": "Imon keltirgan va solih amallar qilganlar uchun qilgan ishlarining mukofoti sifatida joylashadigan jannatlar bor.",
                "tafsir": "Mo'minlar uchun jannat mukofoti haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٢٠",
                "numberLatin": "20",
                "arabic": "وَأَمَّا ٱلَّذِينَ فَسَقُوا۟ فَمَأْوَىٰهُمُ ٱلنَّارُ ۖ كُلَّمَآ أَرَادُوٓا۟ أَن يَخْرُجُوا۟ مِنْهَآ أُعِيدُوا۟ فِيهَا وَقِيلَ لَهُمْ ذُوقُوا۟ عَذَابَ ٱلنَّارِ ٱلَّذِى كُنتُم بِهِۦ تُكَذِّبُونَ",
                "transcription": "Wa ammalladhīna fasaqū fama`wāhumun-nār, kullamā arādū an yakhrujū minhā u'īdū fīhā wa qīla lahum dhūqū 'adhāban-nārilladhī kuntum bihī tukadhdhibūn",
                "translation": "Fosiq bo'lganlarga esa, qarorgohlari do'zaxdir. Qachonki undan chiqmoqchi bo'lsalar, yana qaytariladilar va ularga: \"Yolg'on deb hisoblagan do'zax azobini toting\" deyiladi.",
                "tafsir": "Fosiqlarning jahannamdagi azobi haqida.",
                "copySymbol": "📋"
            }
          ]
        },
        {
          id: 33,
          name: "Al-Ahzab",
          arabicName: "الأحزاب",
          meaning: "Guruhlar",
          ayahCount: 73,
          place: "Madina",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "يَٰٓأَيُّهَا ٱلنَّبِىُّ ٱتَّقِ ٱللَّهَ وَلَا تُطِعِ ٱلْكَٰفِرِينَ",
              transcription: "Yaa ayyuhaa an-nabiyyu ittaqi allaaha wala tuti'i al-kaafiriin",
              translation: "Ey Nabiy, Allohdan qo‘rqing va kofirlarga itoat qilma",
              tafsir: "Payg‘ambarga Allohdan qo‘rqish va kofirlarga qarshi turish buyuriladi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "وَٱتَّبِعْ مَا يُوحَىٰٓ إِلَيْكَ مِن رَّبِّكَ",
              transcription: "Wattabi' maa yuuhaa ilayka min rabbik",
              translation: "Robbingdan senga vahiy qilingan narsaga ergash",
              tafsir: "Payg‘ambarning vahiyga sodiq bo‘lishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "وَتَوَكَّلْ عَلَى ٱللَّهِ ۖ وَكَفَىٰ بِٱللَّهِ وَكِيلًۭا",
              transcription: "Wa tawakkal 'alaa allaahi wakafaa billaahi wakiilan",
              translation: "Allohga tavakkal qil, Alloh vakil sifatida yetarlidir",
              tafsir: "Allohga tayanishning muhimligi va Uning yordami haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "مَّا جَعَلَ ٱللَّهُ لِرَجُلٍۢ مِّن قَلْبَيْنِ فِى جَوْفِهِۦ",
              transcription: "Maa ja'ala allaahu lirajulin min qalbayni fii jawfihi",
              translation: "Alloh hech bir odamga ikki yurak bermadi",
              tafsir: "Insonning yagona tabiatiga ishora va shirkning rad etilishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "لَيْسَ عَلَيْكُمْ جُنَاحٌ أَن تَدْعُوهُنَّ أَبْنَآءَكُمْ",
              transcription: "Laysa 'alaykum junaahun an tad'uuhunna abnaa'akum",
              translation: "Ularni o‘g‘illaringiz deb atashingizda gunoh yo‘q",
              tafsir: "Asrab olingan bolalar haqidagi hukm va nikoh masalalari.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "ٱلنَّبِىُّ أَوْلَىٰ بِٱلْمُؤْمِنِينَ مِنْ أَنفُسِهِمْ",
              transcription: "An-nabiyyu awlaa bil-mu'miniina min anfusihim",
              translation: "Nabiy mo‘minlar uchun o‘zlaridan ko‘ra yaqinroqdir",
              tafsir: "Payg‘ambarning mo‘minlar uchun muhim o‘rni haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "وَإِذْ أَخَذْنَا مِنَ ٱلنَّبِيِّـۧنَ مِيثَٰقَهُمْ",
              transcription: "Wa idh akhadhnaa mina an-nabiyyiina miithaaqahum",
              translation: "Payg‘ambarlardan ahd olganimizda",
              tafsir: "Payg‘ambarlarning Alloh bilan ahdi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "لِيَسْـَٔلَ ٱلصَّٰدِقِينَ عَن صِدْقِهِمْ",
              transcription: "Liyas'ala as-saadiqiina 'an sidqihim",
              translation: "Rostgo‘ylarni o‘z sadoqatlaridan so‘rash uchun",
              tafsir: "Iymon va sadoqatning sinovi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱذْكُرُوا۟ نِعْمَةَ ٱللَّهِ عَلَيْكُمْ",
              transcription: "Yaa ayyuhaa alladhiina aamanuu idhkuruu ni'mata allaahi 'alaykum",
              translation: "Ey iymon keltirganlar, Allohning sizlarga ne’matini eslang",
              tafsir: "Allohning ne’matlari va shukronasi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "إِذْ جَآءَتْكُمْ جُنُودٌۭ فَأَرْسَلْنَا عَلَيْهِمْ رِيحًۭا",
              transcription: "Idh jaa'atkum junudun fa-arsalnaa 'alayhim riihan",
              translation: "Sizlarga lashkarlar kelganda, ularga shamol yubordik",
              tafsir: "Allohning mo‘minlarga yordami va Ahzob jangidagi mo‘jiza.",
              copySymbol: "📋"
            },
              {
                "numberArabic": "١١",
                "numberLatin": "11",
                "arabic": "هُنَالِكَ ٱبْتُلِىَ ٱلْمُؤْمِنُونَ وَزُلْزِلُوا۟ زِلْزَالًۭا شَدِيدًۭا",
                "transcription": "hunālika btuliya l-mu'minūna wa zulzilū zilzālan shadīdā",
                "translation": "O'sha paytda mo'minlar sinovga olindilar va qattiq qaltirashdi.",
                "tafsir": "Ahzob jangi paytida mo'minlarning qattiq sinovdan o'tishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٢",
                "numberLatin": "12",
                "arabic": "وَإِذْ يَقُولُ ٱلْمُنَـٰفِقُونَ وَٱلَّذِينَ فِى قُلُوبِهِم مَّرَضٌۭ مَّا وَعَدَنَا ٱللَّـهُ وَرَسُولُهُۥٓ إِلَّا غُرُورًۭا",
                "transcription": "wa-idh yaqūlu l-munāfiqūna wa-lladhīna fī qulūbihim maraḍun mā waʿadanā llāhu wa-rasūluhu illā ghurūrā",
                "translation": "Munofiqlar va qalblarida kasallik bo'lganlar: \"Alloh va Uning rasuli bizga faqat aldash uchun va'da berganlar\" deyishardi.",
                "tafsir": "Munofiqlarning mo'minlarga nisbatan shubhalari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٣",
                "numberLatin": "13",
                "arabic": "وَإِذْ قَالَت طَّآئِفَةٌۭ مِّنْهُمْ يَـٰٓأَهْلَ يَثْرِبَ لَا مُقَامَ لَكُمْ فَٱرْجِعُوا۟ ۚ وَيَسْتَـْٔذِنُ فَرِيقٌۭ مِّنْهُمُ ٱلنَّبِىَّ يَقُولُونَ إِنَّ بُيُوتَنَا عَوْرَةٌۭ وَمَا هِىَ بِعَوْرَةٍ ۖ إِن يُرِيدُونَ إِلَّا فِرَارًۭا",
                "transcription": "wa-idh qālat ṭā'ifatun minhum yā ahla yathriba lā muqāma lakum farjiʿū wa yasta'dhinu farīqun minhumu n-nabiyya yaqūlūna inna buyūtanā ʿawratun wa mā hiya biʿawratin in yurīdūna illā firārā",
                "translation": "Ulardan bir guruh: \"Ey Yasrib (Madina) aholisi! Bu yerda qolish joyingiz yo'q, qaytib keting\" dedi. Ulardan bir guruh Payg'ambardan ruxsat so'rab: \"Bizning uylarimiz ochiq (himoyasiz)\" dedilar. Holbuki ular (himoyasiz) emas edi. Ular faqat qochishni xohlashardi.",
                "tafsir": "Ahzob jangi paytida ba'zi munofiqlarning qo'rqoqlik ko'rsatishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٤",
                "numberLatin": "14",
                "arabic": "وَلَوْ دُخِلَتْ عَلَيْهِم مِّنْ أَقْطَارِهَا ثُمَّ سُئِلُوا۟ ٱلْفِتْنَةَ لَـَٔاتَوْهَا وَمَا تَلَبَّثُوا۟ بِهَآ إِلَّا يَسِيرًۭا",
                "transcription": "wa-law dukhila ʿalayhim min aqṭārihā thumma su'ilū l-fitnata la-ātawhā wa mā talabbathū bihā illā yasīrā",
                "translation": "Agar (dushman) shaharning har tomondan kirib kelganida va ularga (dinlaridan) qaytish so'ralsa, albatta buni qilar edilar va bunga faqat ozgina kechiktirishardi.",
                "tafsir": "Munofiqlarning dinlaridan qaytishga tayyorligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٥",
                "numberLatin": "15",
                "arabic": "وَلَقَدْ كَانُوا۟ عَـٰهَدُوا۟ ٱللَّـهَ مِن قَبْلُ لَا يُوَلُّونَ ٱلْأَدْبَـٰرَ ۚ وَكَانَ عَهْدُ ٱللَّـهِ مَسْـُٔولًۭا",
                "transcription": "wa-laqad kānū ʿāhadū llāha min qablu lā yuwallūna l-adbāra wa kāna ʿahdu llāhi mas'ūlā",
                "translation": "Albatta ular ilgari Alloh bilan ahd qilgan ediki, orqa o'girib qochmaydi. Alloh bilan qilingan ahd so'raladigan narsadir.",
                "tafsir": "Mo'minlarning Alloh bilan qilgan ahdi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٦",
                "numberLatin": "16",
                "arabic": "قُل لَّن يَنفَعَكُمُ ٱلْفِرَارُ إِن فَرَرْتُم مِّنَ ٱلْمَوْتِ أَوِ ٱلْقَتْلِ وَإِذًۭا لَّا تُمَتَّعُونَ إِلَّا قَلِيلًۭا",
                "transcription": "qul lan yanfaʿakumu l-firāru in farartum mina l-mawti awi l-qatli wa idhan lā tumattaʿūna illā qalīlā",
                "translation": "(Ey Muhammad,) ayt: \"Agar o'limdan yoki o'ldirilishdan qochsangiz ham, qochish sizga foyda bermaydi. Bunday holda siz faqat ozgina bahramand bo'lasiz\".",
                "tafsir": "O'limdan qochib qutilishning imkonsizligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٧",
                "numberLatin": "17",
                "arabic": "قُلْ مَن ذَا ٱلَّذِى يَعْصِمُكُم مِّنَ ٱللَّـهِ إِنْ أَرَادَ بِكُمْ سُوٓءًا أَوْ أَرَادَ بِكُمْ رَحْمَةًۭ ۚ وَلَا يَجِدُونَ لَهُم مِّن دُونِ ٱللَّـهِ وَلِيًّۭا وَلَا نَصِيرًۭا",
                "transcription": "qul man dhā lladhī yaʿṣimukum mina llāhi in arāda bikum sū'an aw arāda bikum raḥmatan wa lā yajidūna lahum min dūni llāhi waliyyan wa lā naṣīrā",
                "translation": "Ayt: \"Agar Alloh sizga yomonlik yoki rahmatni xohlasa, sizni Undan kim himoya qiladi?\" Ular Allohdan o'zga hech bir himoyachi va yordamchi topa olmaydilar.",
                "tafsir": "Allohning irodasiga qarshilik qilishning imkonsizligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٨",
                "numberLatin": "18",
                "arabic": "۞ قَدْ يَعْلَمُ ٱللَّـهُ ٱلْمُعَوِّقِينَ مِنكُمْ وَٱلْقَآئِلِينَ لِإِخْوَٰنِهِمْ هَلُمَّ إِلَيْنَا ۖ وَلَا يَأْتُونَ ٱلْبَأْسَ إِلَّا قَلِيلًۭا",
                "transcription": "qad yaʿlamu llāhu l-muʿawwiqīna minkum wa l-qā'ilīna li-ikhwānihim halumma ilaynā wa lā ya'tūna l-ba'sa illā qalīlā",
                "translation": "Alloh aralaringizdagi to'sqinlik qiluvchilarni va birodarlariga: \"Bizga kelin\" deyuvchilarni biladi. Ular jangga juda kam kelishardi.",
                "tafsir": "Munofiqlarning jihoddan qochish usullari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٩",
                "numberLatin": "19",
                "arabic": "أَشِحَّةً عَلَيْكُمْ ۖ فَإِذَا جَآءَ ٱلْخَوْفُ رَأَيْتَهُمْ يَنظُرُونَ إِلَيْكَ تَدُورُ أَعْيُنُهُمْ كَٱلَّذِى يُغْشَىٰ عَلَيْهِ مِنَ ٱلْمَوْتِ ۖ فَإِذَا ذَهَبَ ٱلْخَوْفُ سَلَقُوكُم بِأَلْسِنَةٍ حِدَادٍ أَشِحَّةً عَلَى ٱلْخَيْرِ ۚ أُو۟لَـٰٓئِكَ لَمْ يُؤْمِنُوا۟ فَأَحْبَطَ ٱللَّـهُ أَعْمَـٰلَهُمْ ۚ وَكَانَ ذَٰلِكَ عَلَى ٱللَّـهِ يَسِيرًۭا",
                "transcription": "ashīḥatan ʿalaykum fa-idhā jā'a l-khawfu ra'aytahum yanẓurūna ilayka tadūru aʿyunuhum ka-lladhī yughshā ʿalayhi mina l-mawti fa-idhā dhahaba l-khawfu salaqūkum bi-alsinatin ḥidādin ashīḥatan ʿalā l-khayri ulā'ika lam yu'minū fa-aḥbaṭa llāhu aʿmālahum wa kāna dhālika ʿalā llāhi yasīrā",
                "translation": "Sizga nisbatan xasislik qiladilar. Qo'rquv paytida esa, o'lim arafasida bo'lgan kishining ko'zlari aylanadigan kabi, ularning ko'zlari aylanib, sizga qaraydiganini ko'rasiz. Qo'rquv ketgach esa, yaxshilik haqida xasislik qilib, sizga o'tkir tillar bilan tuhmat qiladilar. Ular imon keltirmaganlar, shuning uchun Alloh ularning amallarini bekor qildi. Bu Alloh uchun oson ishdir.",
                "tafsir": "Munofiqlarning xarakteri va ularning amallarining bekor qilinishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٢٠",
                "numberLatin": "20",
                "arabic": "يَحْسَبُونَ ٱلْأَحْزَابَ لَمْ يَذْهَبُوا۟ ۖ وَإِن يَأْتِ ٱلْأَحْزَابُ يَوَدُّوا۟ لَوْ أَنَّهُم بَادُونَ فِى ٱلْأَعْرَابِ يَسْـَٔلُونَ عَنْ أَنۢبَآئِكُمْ ۖ وَلَوْ كَانُوا۟ فِيكُم مَّا قَـٰتَلُوٓا۟ إِلَّا قَلِيلًۭا",
                "transcription": "yaḥsabūna l-aḥzāba lam yadhhabū wa in ya'ti l-aḥzābu yawaddū law annahum bādūna fī l-aʿrābi yas'alūna ʿan anbā'ikum wa law kānū fīkum mā qātalū illā qalīlā",
                "translation": "Ular (munofiqlar) ahzob (dushman guruhlari) ketmagan deb o'ylashadi. Agar ahzob yana kelsa, ular badaviy arablar orasida bo'lishni istashardi va sizlarning xabarlaringizni so'rar edilar. Agar ular orangizda bo'lsalar ham, juda ozgina jang qilar edilar.",
                "tafsir": "Munofiqlarning harbiy vaziyatga munosabati haqida.",
                "copySymbol": "📋"
            }
          ]
        },
        {
          id: 34,
          name: "Saba",
          arabicName: "سبإ",
          meaning: "Saba",
          ayahCount: 54,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "ٱلْحَمْدُ لِلَّهِ ٱلَّذِى لَهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
              transcription: "Al-hamdu lillahi alladhii lahu maa fi as-samaawaati wamaa fi al-ardi",
              translation: "Hamd o‘sha Allohgaki, osmonlar va yerdagi hamma narsa Unikidir",
              tafsir: "Allohga hamd va Uning hamma narsaga egaligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "يَعْلَمُ مَا يَلِجُ فِى ٱلْأَرْضِ وَمَا يَخْرُجُ مِنْهَا",
              transcription: "Ya'lamu maa yaliju fi al-ardi wamaa yakhruju minhaa",
              translation: "U yerga kirgan va undan chiqqan narsalarni biladi",
              tafsir: "Allohning hamma narsani biluvchi ilmi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "وَقَالَ ٱلَّذِينَ كَفَرُوا۟ لَا تَأْتِينَا ٱلسَّاعَةُ",
              transcription: "Wa qaala alladhiina kafaruu laa ta'tiinaa as-saa'atu",
              translation: "Kofirlar dedilar: 'Bizga qiyomat kelmaydi'",
              tafsir: "Kofirlarning qiyomatni inkor qilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "لِيَجْزِىَ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ",
              transcription: "Liyajziya alladhiina aamanuu wa 'amiluu as-saalihaati",
              translation: "Iymon keltirib, solih amal qilganlarni mukofotlash uchun",
              tafsir: "Mo‘minlarning yaxshi amallari uchun mukofoti haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "وَٱلَّذِينَ سَعَوْا۟ فِىٓ ءَايَٰتِنَا مُعَٰجِزِينَ",
              transcription: "Walladhiina sa'aw fi aayaatinaa mu'aajiziin",
              translation: "Oyatlarimizni yengmoqchi bo‘lganlar",
              tafir: "Allohning oyatlariga qarshi chiqqanlarning oqibati.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "وَيَرَى ٱلَّذِينَ أُوتُوا۟ ٱلْعِلْمَ ٱلَّذِىٓ أُنزِلَ إِلَيْكَ",
              transcription: "Wa yaraa alladhiina uutuu al-'ilma alladhii unzila ilayka",
              translation: "Ilm berilganlar senga nozil qilingan narsaning haq ekanligini ko‘radilar",
              tafsir: "Qur’onning haqiqatini ilm egalari tushunishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "وَقَالَ ٱلَّذِينَ كَفَرُوا۟ هَلْ نَدُلُّكُمْ عَلَىٰ رَجُلٍۢ",
              transcription: "Wa qaala alladhiina kafaruu hal nadullukum 'alaa rajulin",
              translation: "Kofirlar dedilar: 'Sizlarga bir odamni ko‘rsataylikmi?'",
              tafir: "Kofirlarning payg‘ambarni masxara qilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "وَلَقَدْ مَكَّنَّٰهُمْ فِيمَآ إِن مَّكَّنَّٰكُمْ فِيهِ",
              transcription: "Walaqad makkannaahum fiimaa in makkannaakum fiihi",
              translation: "Biz ularga sizlarga bergan narsada imkon berdik",
              tafir: "O‘tgan ummatlarga berilgan ne’matlar va ularning noshukurligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "أَوَلَمْ يَسِيرُوا۟ فِى ٱلْأَرْضِ فَيَنظُرُوا۟ كَيْفَ كَانَ عَٰقِبَةُ",
              transcription: "Awalam yasiiruu fi al-ardi fayanzuruu kayfa kaana 'aaqibatu",
              translation: "Yer yuzida sayr qilmadilarmi, oldingilarning oqibatini ko‘rish uchun?",
              tafir: "O‘tgan ummatlarning halokati va ibrat olish haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "وَإِذَا تُتْلَىٰ عَلَيْهِمْ ءَايَٰتُنَا بَيِّنَٰتٍۢ",
              transcription: "Wa idhaa tutlaa 'alayhim aayaatunaa bayyinaatin",
              translation: "Ularga aniq oyatlarimiz o‘qilganda",
              tafir: "Kofirlarning oyatlarni rad qilishi va ularning oqibati.",
              copySymbol: "📋"
            },
              {
                "numberArabic": "١١",
                "numberLatin": "11",
                "arabic": "أَنِ ٱعْمَلْ سَـٰبِغَـٰتٍۢ وَقَدِّرْ فِى ٱلسَّرْدِ ۖ وَٱعْمَلُوا۟ صَـٰلِحًا ۖ إِنِّى بِمَا تَعْمَلُونَ بَصِيرٌۭ",
                "transcription": "ani i'mal sābighātin wa qaddir fi s-sardi wa'malu sālihan innī bimā ta'malūna basīr",
                "translation": "(Biz Dovudga buyurdik): \"Keng zirhlar yasang va halqalarni bir-biriga moslab ishla. Yaxshi amallar qiling. Albatta Men sizlar qilayotgan ishlaringizni koʻruvchiman\".",
                "tafsir": "Dovud payg'ambarga atalgan ilohiy inoyat va uning qobiliyatlari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٢",
                "numberLatin": "12",
                "arabic": "وَلِسُلَيْمَـٰنَ ٱلرِّيحَ غُدُوُّهَا شَهْرٌۭ وَرَوَاحُهَا شَهْرٌۭ ۖ وَأَسَلْنَا لَهُۥ عَيْنَ ٱلْقِطْرِ ۖ وَمِنَ ٱلْجِنِّ مَن يَعْمَلُ بَيْنَ يَدَيْهِ بِإِذْنِ رَبِّهِۦ ۖ وَمَن يَزِغْ مِنْهُمْ عَنْ أَمْرِنَا نُذِقْهُ مِنْ عَذَابِ ٱلسَّعِيرِ",
                "transcription": "wa li-sulaymāna r-rīḥa guduwwuhā shahrun wa rawāḥuhā shahrun wa asalnā lahu ʿayna l-qiṭri wa mina l-jinni man yaʿmalu bayna yadayhi bi-idhni rabbihi wa man yazigh minhum ʿan amrinā nudhiquhu min ʿadhābi s-saʿīr",
                "translation": "Sulaymonga esa, ertalabki yoʻli bir oy, kechki yoʻli bir oy (masofada) boʻlgan shamolni boʻysundirdik. U uchun mis eritiladigan manba oqizdik. Jinlardan boʻlsa, uning oldida Robbining izni bilan ish qiladiganlar bor edi. Kim ularning orasida Bizning amrimizdan silsa, unga alanga azobidan tattirarmiz.",
                "tafsir": "Sulaymon payg'ambar ato etilgan mo''jizalar va qudrat haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٣",
                "numberLatin": "13",
                "arabic": "يَعْمَلُونَ لَهُۥ مَا يَشَآءُ مِن مَّحَـٰرِيبَ وَتَمَـٰثِيلَ وَجِفَانٍۢ كَٱلْجَوَابِ وَقُدُورٍۢ رَّاسِيَـٰتٍ ۚ ٱعْمَلُوٓا۟ ءَالَ دَاوُۥدَ شُكْرًۭا ۚ وَقَلِيلٌۭ مِّنْ عِبَادِىَ ٱلشَّكُورُ",
                "transcription": "yaʿmalūna lahu mā yashā'u min maḥārība wa tamāthīla wa jifānin ka l-jawābi wa qudūrin rāsiyāti i'malū āla dāwūda shukran wa qalīlun min ʿibādiya sh-shakūr",
                "translation": "Ular (jinlar) unga xohlagan mehroblar, haykallar, havz kabi katta idishlar va mustahkam qozonlar yasashardi. Ey Dovud ahli! Shukr qiling. Mening bandalarimdan shakr qiluvchilar kamdir.",
                "tafsir": "Sulaymonga xizmat qilgan jinlarning ishlari va shukrning ahamiyati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٤",
                "numberLatin": "14",
                "arabic": "فَلَمَّا قَضَيْنَا عَلَيْهِ ٱلْمَوْتَ مَا دَلَّهُمْ عَلَىٰ مَوْتِهِۦٓ إِلَّا دَآبَّةُ ٱلْأَرْضِ تَأْكُلُ مِنسَأَتَهُۥ ۖ فَلَمَّا خَرَّ تَبَيَّنَتِ ٱلْجِنُّ أَن لَّوْ كَانُوا۟ يَعْلَمُونَ ٱلْغَيْبَ مَا لَبِثُوا۟ فِى ٱلْعَذَابِ ٱلْمُهِينِ",
                "transcription": "falammā qaḍaynā ʿalayhi l-mawta mā dallahum ʿalā mawtihi illā dābbatu l-arḍi ta'kulu minsa'atahu falammā kharrat tabayyanati l-jinnu an law kānū yaʿlamūna l-ghayba mā labithū fī l-ʿadhābi l-muhīn",
                "translation": "Biz unga o'lim hukm qilganimizda, ularga uning o'limini faqat yer hayvoni (qurt) yeyotgan tayog'ini ko'rsatdi. U (tayoq) qulab tushgach, jinlar aniq bildiki, agar ular g'aybni bilganida, xorlik azobida qolmas edilar.",
                "tafsir": "Sulaymonning o'limi va jinlarning g'aybni bilmasligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٥",
                "numberLatin": "15",
                "arabic": "لَقَدْ كَانَ لِسَبَإٍۢ فِى مَسْكَنِهِمْ ءَايَةٌۭ ۖ جَنَّتَانِ عَن يَمِينٍۢ وَشِمَالٍۢ ۖ كُلُوا۟ مِن رِّزْقِ رَبِّكُمْ وَٱشْكُرُوا۟ لَهُۥ ۚ بَلْدَةٌۭ طَيِّبَةٌۭ وَرَبٌّ غَفُورٌۭ",
                "transcription": "laqad kāna li-saba'in fī maskanihim āyatun jannatāni ʿan yamīnin wa shimālin kulū min rizqi rabbikum wa shkurū lahu baldatun tayyibatun wa rabbun ghafūr",
                "translation": "Albatta Saba ahli uchun ularning yashash joyida (quvvatli) mo''jiza bor edi: o'ng va chap tomonda ikkita bog'. (Ulga aytildi): \"Robbingizning rizqidan yeb, Unga shukr qiling. Toza (pokiza) bir diyor va (sizga) mag'firatli Robb\".",
                "tafsir": "Saba xalqining ne'matlari va ularning shukr qilishlari haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٦",
                "numberLatin": "16",
                "arabic": "فَأَعْرَضُوا۟ فَأَرْسَلْنَا عَلَيْهِمْ سَيْلَ ٱلْعَرِمِ وَبَدَّلْنَـٰهُم بِجَنَّتَيْهِمْ جَنَّتَيْنِ ذَوَاتَىْ أُكُلٍۢ خَمْطٍۢ وَأَثْلٍۢ وَشَىْءٍۢ مِّن سِدْرٍۢ قَلِيلٍۢ",
                "transcription": "fa-aʿraḍū fa-arsalnā ʿalayhim sayla l-ʿarimi wa baddalnāhum bi-jannatayhim jannatayni dhawātay ukulin khamtin wa athlin wa shay'in min sidrin qalīl",
                "translation": "Lekin ular (shukrdan) yuz o'girdilar. Biz ham ularga to'siqni yorib yuboradigan toshqin yubordik. Ular ikkita bog'ini achchiq mevali daraxtlar, talay daraxtlar va ozgina sidr daraxtlari bo'lgan ikkita bog' bilan almashtirdik.",
                "tafsir": "Saba xalqining nimetlardan behuda foydalanishi va ularga kelgan musibat haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٧",
                "numberLatin": "17",
                "arabic": "ذَٰلِكَ جَزَيْنَـٰهُم بِمَا كَفَرُوا۟ ۖ وَهَلْ نُجَـٰزِىٓ إِلَّا ٱلْكَفُورَ",
                "transcription": "dhālika jazaynāhum bimā kafarū wa hal nujāzī illā l-kafūr",
                "translation": "Bu jazoni ularga kufrlari sababli berdik. Biz faqat noshukr kishilarni jazolarmizmi?",
                "tafsir": "Kufr va nimetlarni inkor qilishning oqibati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٨",
                "numberLatin": "18",
                "arabic": "وَجَعَلْنَا بَيْنَهُمْ وَبَيْنَ ٱلْقُرَى ٱلَّتِى بَـٰرَكْنَا فِيهَا قُرًۭى ظَـٰهِرَةًۭ وَقَدَّرْنَا فِيهَا ٱلسَّيْرَ ۖ سِيرُوا۟ فِيهَا لَيَالِىَ وَأَيَّامًۭا ءَامِنِينَ",
                "transcription": "wa jaʿalnā baynahum wa bayna l-qurā llatī bāraknā fīhā quran zāhiratan wa qaddarnā fīhā s-sayra sīrū fīhā layāliya wa ayyāman āminīn",
                "translation": "Biz ular bilan barakotli qilgan qishloqlar orasida aniq ko'rinadigan qishloqlar qildik va oralarida sayr qilishni belgiladik. (Ulga aytdik): \"Kechayu kunduz xavfsiz yuring\".",
                "tafsir": "Allohning Saba xalqiga atagan ne'matlari va xavfsizlik haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٩",
                "numberLatin": "19",
                "arabic": "فَقَالُوا۟ رَبَّنَا بَـٰعِدْ بَيْنَ أَسْفَارِنَا وَظَلَمُوٓا۟ أَنفُسَهُمْ فَجَعَلْنَـٰهُمْ أَحَادِيثَ وَمَزَّقْنَـٰهُمْ كُلَّ مُمَزَّقٍ ۚ إِنَّ فِى ذَٰلِكَ لَـَٔايَـٰتٍۢ لِّكُلِّ صَبَّارٍۢ شَكُورٍۢ",
                "transcription": "fa qālū rabbanā bāʿid bayna asfārinā wa zalamū anfusahum fa jaʿalnāhum aḥādītha wa mazzaqnāhum kulla mumazzaqin inna fī dhālika la'āyātin li-kulli sabbārin shakūr",
                "translation": "Lekin ular: \"Robbimiz! Safarlarimiz orasini uzoqlashtir\" dedilar va o'zlariga zulm qildilar. Biz ularni (keyingi avlodlar uchun) ertak qilib qo'ydik va ularni butunlay parchalab yubordik. Albatta bunda har bir sabrli va shukr qiluvchi uchun oyatlar (ibratlar) bor.",
                "tafsir": "Saba xalqining nimetlarni suiiste'mol qilishi va ularning halokati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٢٠",
                "numberLatin": "20",
                "arabic": "وَلَقَدْ صَدَّقَ عَلَيْهِمْ إِبْلِيسُ ظَنَّهُۥ فَٱتَّبَعُوهُ إِلَّا فَرِيقًۭا مِّنَ ٱلْمُؤْمِنِينَ",
                "transcription": "wa laqad saddaqa ʿalayhim iblīsu zannahu fa ttabaʿūhu illā farīqan mina l-mu'minīn",
                "translation": "Albatta iblis o'z gumonini ularga tasdiq etdi va mo'minlardan bir guruhdan boshqalari unga ergashdilar.",
                "tafsir": "Iblisning odamlarga nisbati va unga ergashishning oqibati haqida.",
                "copySymbol": "📋"
            }
          ]
        },
        {
          id: 35,
          name: "Fatir",
          arabicName: "فاطر",
          meaning: "Yaratuvchi",
          ayahCount: 45,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "ٱلْحَمْدُ لِلَّهِ فَاطِرِ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
              transcription: "Al-hamdu lillahi faatiri as-samaawaati wal-ardi",
              translation: "Hamd osmonlar va yerni yaratuvchi Allohgadir",
              tafsir: "Allohning yaratuvchi sifati va hamd Unaga xos ekanligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "مَا يَفْتَحِ ٱللَّهُ لِلنَّاسِ مِن رَّحْمَةٍۢ فَلَا مُمْسِكَ لَهَا",
              transcription: "Maa yaftahi allaahu linnaasi min rahmatin falaa mumsika lahaa",
              translation: "Alloh odamlarga rahmat eshiklarini ochsa, uni to‘suvchi yo‘q",
              tafsir: "Allohning rahmati cheksiz va Uning ixtiyori haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "يَٰٓأَيُّهَا ٱلنَّاسُ ٱذْكُرُوا۟ نِعْمَتَ ٱللَّهِ عَلَيْكُمْ",
              transcription: "Yaa ayyuhaa an-naasu idhkuruu ni'mata allaahi 'alaykum",
              translation: "Ey odamlar, Allohning sizlarga ne’matini eslang",
              tafsir: "Allohning ne’matlari va shukronasi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "وَإِن يُكَذِّبُوكَ فَقَدْ كُذِّبَتْ رُسُلٌۭ مِّن قَبْلِكَ",
              transcription: "Wa in yukadhdhibuuka faqad kudhdhibat rusulun min qablika",
              translation: "Agar seni yolg‘on desalar, sendan oldin rasullar ham yolg‘onlangan",
              tafsir: "Payg‘ambarlarning inkor qilinishi va sabr haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "إِنَّمَا ٱلْحَيَوٰةُ ٱلدُّنْيَا غُرُورٌۭ",
              transcription: "Innamaa al-hayaatu ad-dunyaa ghuruukun",
              translation: "Dunyo hayoti faqat aldovdir",
              tafsir: "Dunyo hayotining o‘tkinchiligi va aldovligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "إِنَّ ٱلشَّيْطَٰنَ لَكُمْ عَدُوٌّۭ فَٱتَّخِذُوهُ عَدُوًّۭا",
              transcription: "Inna ash-shaytaana lakum 'aduwwun fattakhidhuuhu 'aduwwan",
              translation: "Shayton sizlarga dushmandir, uni dushman deb biling",
              tafsir: "Shaytonning dushmanligi va undan ehtiyot bo‘lish haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "ٱلَّذِينَ كَفَرُوا۟ لَهُمْ عَذَابٌۭ شَدِيدٌۭ",
              transcription: "Alladhiina kafaruu lahum 'adhaabun shadiid",
              translation: "Kofirlar uchun qattiq azob bor",
              tafsir: "Kofirlarning oxiratdagi jazo olishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "أَفَمَن زُيِّنَ لَهُۥ سُوٓءُ عَمَلِهِۦ فَرَءَاهُ حَسَنًۭا",
              transcription: "Afaman zuyyina lahu suu'u 'amalihi fara'aahu hasanan",
              translation: "Yomon amali chiroyli ko‘rsatilgan kishi haqmi?",
              tafsir: "Yomon amallarni chiroyli ko‘rishning adashishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "ٱللَّهُ ٱلَّذِى سَخَّرَ لَكُمُ ٱلْبَحْرَ",
              transcription: "Allaahu alladhii sakhkhara lakumu al-bahra",
              translation: "Alloh sizlar uchun dengizni bo‘ysundirdi",
              tafir: "Allohning dengizni insonlarga xizmat qildirishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "مَن كَانَ يُرِيدُ ٱلْعِزَّةَ فَلِلَّهِ ٱلْعِزَّةُ جَمِيعًۭا",
              transcription: "Man kaana yuriidu al-'izzata falillaahi al-'izzatu jamii'an",
              translation: "Kim izzat istasa, izzat butunlay Allohnikidir",
              tafir: "Haqiqiy izzat va qudratning Allohga xosligi haqida.",
              copySymbol: "📋"
            },
              {
                "numberArabic": "١١",
                "numberLatin": "11",
                "arabic": "وَٱللَّـهُ خَلَقَكُم مِّن تُرَابٍۢ ثُمَّ مِن نُّطْفَةٍۢ ثُمَّ جَعَلَكُمْ أَزْوَٰجًۭا ۚ وَمَا تَحْمِلُ مِنْ أُنثَىٰ وَلَا تَضَعُ إِلَّا بِعِلْمِهِۦ ۚ وَمَا يُعَمَّرُ مِن مُّعَمَّرٍۢ وَلَا يُنقَصُ مِنْ عُمُرِهِۦٓ إِلَّا فِى كِتَـٰبٍ ۚ إِنَّ ذَٰلِكَ عَلَى ٱللَّـهِ يَسِيرٌۭ",
                "transcription": "wa llāhu khalaqakum min turābin thumma min nuṭfatin thumma jaʿalakum azwājan wa mā taḥmilu min unthā wa lā taḍaʿu illā bi-ʿilmihi wa mā yuʿammaru muʿammarin wa lā yunqaṣu min ʿumurihi illā fī kitābin inna dhālika ʿalā llāhi yasīr",
                "translation": "Alloh sizni tuproqdan, keyin nutfadan yaratdi, so'ngra sizni juft-juft qildi. Hech bir ayol homilador bo'lmaydi va tug'maydi, magar Allohning ilmi bilan. Hech bir kishining umri uzaytirilmaydi va qisqartirilmaydi, magar kitobda (Lavhul Mahfuzda) yozilgan bo'lmasa. Albatta bu Alloh uchun oson ishdir.",
                "tafsir": "Inson yaratilishi va hayotining barcha jihatlari Allohning ilmi va qudratida ekanligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٢",
                "numberLatin": "12",
                "arabic": "وَمَا يَسْتَوِى ٱلْبَحْرَانِ هَـٰذَا عَذْبٌۭ فُرَاتٌۭ سَآئِغٌۭ شَرَابُهُۥ وَهَـٰذَا مِلْحٌ أُجَاجٌۭ ۖ وَمِن كُلٍّۢ تَأْكُلُونَ لَحْمًۭا طَرِيًّۭا وَتَسْتَخْرِجُونَ حِلْيَةًۭ تَلْبَسُونَهَا ۖ وَتَرَى ٱلْفُلْكَ فِيهِ مَوَاخِرَ لِتَبْتَغُوا۟ مِن فَضْلِهِۦ وَلَعَلَّكُمْ تَشْكُرُونَ",
                "transcription": "wa mā yastawī l-baḥrāni hādhā ʿadhbun furātun sā'ighun sharābuhu wa hādhā milhun ujājun wa min kullin ta'kulūna laḥman ṭariyyan wa tastakhrijūna ḥilyatan talbasūnahā wa tarā l-fulka fīhi mawākhira li-tabtaghū min faḍlihi wa laʿallakum tashkurūn",
                "translation": "Ikki dengiz bir xil emas: bu shirin, chanqoqni qondiradigan ichimlik, bu esa sho'r va achchiq. Har ikkisidan yangi go'sht yeyasiz va bezaklar chiqarasiz ki, kiyib olasiz. Dengizda kemalarni ko'rasiz ki, uning marvaridlarini izlab yursin va ehtimolki shukr qilasiz.",
                "tafsir": "Allohning tabiatdagi turli ne'matlari va ularga shukr qilish haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٣",
                "numberLatin": "13",
                "arabic": "يُولِجُ ٱلَّيْلَ فِى ٱلنَّهَارِ وَيُولِجُ ٱلنَّهَارَ فِى ٱلَّيْلِ وَسَخَّرَ ٱلشَّمْسَ وَٱلْقَمَرَ كُلٌّۭ يَجْرِى لِأَجَلٍۢ مُّسَمًّى ۚ ذَٰلِكُمُ ٱللَّـهُ رَبُّكُمْ لَهُ ٱلْمُلْكُ ۚ وَٱلَّذِينَ تَدْعُونَ مِن دُونِهِۦ مَا يَمْلِكُونَ مِن قِطْمِيرٍ",
                "transcription": "yūliju l-layla fī n-nahāri wa yūliju n-nahāra fī l-layli wa sakhkhara sh-shamsa wa l-qamara kullun yajrī li-ajalin musamman dhālikumu llāhu rabbukum lahu l-mulku wa alladhīna tadʿūna min dūnihi mā yamlikūna min qiṭmīr",
                "translation": "U kechani kunduzga va kunduzni kechaga kiritadi. Quyosh va oyni xizmatga olgan. Har biri belgilangan muddatgacha harakat qiladi. Bu sizning Robbingiz Allohdir. Mulk Unga xosdir. Siz Allohdan o'zga duo qilganlar (butlar) esa bir qo'ziqorin po'stigina ham egasi emaslar.",
                "tafsir": "Allohning qudrati va barcha narsalarning Uning irodasiga bo'ysunishi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٤",
                "numberLatin": "14",
                "arabic": "إِن تَدْعُوهُمْ لَا يَسْمَعُوا۟ دُعَآءَكُمْ وَلَوْ سَمِعُوا۟ مَا ٱسْتَجَابُوا۟ لَكُمْ ۖ وَيَوْمَ ٱلْقِيَـٰمَةِ يَكْفُرُونَ بِشِرْكِكُمْ ۚ وَلَا يُنَبِّئُكَ مِثْلُ خَبِيرٍۢ",
                "transcription": "in tadʿūhum lā yasmaʿū duʿā'akum wa law samiʿū mā astajābū lakum wa yawma l-qiyāmati yakfurūna bi-shirkikum wa lā yunabbi'uka mithlu khabīr",
                "translation": "Agar siz ularni (butlarni) chaqirsangiz, ular sizning duoingizni eshitmaydi. Agar eshitsalar ham, sizga javob bera olmaydi. Qiyomat kuni esa ular sizning shirk qilganingizni inkor etadilar. Hech kim (Alloh kabi) xabardor qilib aytuvchi yo'q.",
                "tafsir": "Butlarning noqobilligi va shirkning behudaligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٥",
                "numberLatin": "15",
                "arabic": "يَـٰٓأَيُّهَا ٱلنَّاسُ أَنتُمُ ٱلْفُقَرَآءُ إِلَى ٱللَّـهِ ۖ وَٱللَّـهُ هُوَ ٱلْغَنِىُّ ٱلْحَمِيدُ",
                "transcription": "yā ayyuhā n-nāsu antumu l-fuqarā'u ilā llāhi wa llāhu huwa l-ghaniyyu l-ḥamīd",
                "translation": "Ey odamlar! Siz Allohga muhtojsiz. Alloh esa behojat va hamga layoqatli Zotdir.",
                "tafsir": "Insonning Allohga qaramligi va Uning g'aniyligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٦",
                "numberLatin": "16",
                "arabic": "إِن يَشَأْ يُذْهِبْكُمْ وَيَأْتِ بِخَلْقٍۢ جَدِيدٍۢ",
                "transcription": "in yasha' yudhhibkum wa ya'ti bi-khalqin jadīd",
                "translation": "Agar U xohlasa, sizni yo'q qilib, yangi xalqni keltiradi.",
                "tafsir": "Allohning qudrati va yangi xalq yaratish qobiliyati haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٧",
                "numberLatin": "17",
                "arabic": "وَمَا ذَٰلِكَ عَلَى ٱللَّـهِ بِعَزِيزٍۢ",
                "transcription": "wa mā dhālika ʿalā llāhi bi-ʿazīz",
                "translation": "Bu Alloh uchun qiyin emas.",
                "tafsir": "Allohning qudratining cheksizligi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٨",
                "numberLatin": "18",
                "arabic": "وَلَا تَزِرُ وَازِرَةٌۭ وِزْرَ أُخْرَىٰ ۚ وَإِن تَدْعُ مُثْقَلَةٌ إِلَىٰ حِمْلِهَا لَا يُحْمَلْ مِنْهُ شَىْءٌۭ وَلَوْ كَانَ ذَا قُرْبَىٰ ۗ إِنَّمَا تُنذِرُ ٱلَّذِينَ يَخْشَوْنَ رَبَّهُم بِٱلْغَيْبِ وَأَقَامُوا۟ ٱلصَّلَوٰةَ ۚ وَمَن تَزَكَّىٰ فَإِنَّمَا يَتَزَكَّىٰ لِنَفْسِهِۦ ۚ وَإِلَى ٱللَّـهِ ٱلْمَصِيرُ",
                "transcription": "wa lā taziru wāziratun wizra ukhrā wa in tadʿu muthqalatun ilā ḥimlihā lā yuḥmalu minhu shay'un wa law kāna dhā qurbā innamā tundhiri alladhīna yakhshawna rabbahum bi-l-ghaybi wa aqāmū ṣ-ṣalāta wa man tazakkā fa innamā yatazakkā li-nafsihi wa ilā llāhi l-maṣīr",
                "translation": "Hech bir gunohkor boshqasining gunohini yuk olmaydi. Agar og'ir yukli (gunohkor) o'z yukini olib yurishga chaqirsa, undan hech narsa yuklanmaydi, hatto yaqin qarindoshi bo'lsa ham. Sen faqat o'z Robbilarini g'aybda (ko'rmasdan) qo'rqib, namozni to'kis ado etuvchilarni ogohlantirasan. Kim poklansa, faqat o'z nefsi uchun poklanadi. Qaytish Allohgadir.",
                "tafsir": "Har bir insonning o'z gunohi uchun javobgarligi va hidoyat haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "١٩",
                "numberLatin": "19",
                "arabic": "وَمَا يَسْتَوِى ٱلْأَعْمَىٰ وَٱلْبَصِيرُ",
                "transcription": "wa mā yastawī l-aʿmā wa l-baṣīr",
                "translation": "Ko'r bilan ko'ruvchi bir xil emas.",
                "tafsir": "Haqiqatni ko'ra oluvchi va ko'ra olmuvchilar farqi haqida.",
                "copySymbol": "📋"
              },
              {
                "numberArabic": "٢٠",
                "numberLatin": "20",
                "arabic": "وَلَا ٱلظُّلُمَـٰتُ وَلَا ٱلنُّورُ",
                "transcription": "wa lā ẓ-ẓulumātu wa lā n-nūr",
                "translation": "Zulmatlar va nur bir xil emas.",
                "tafsir": "Haqiqat va dalolat farqi haqida.",
                "copySymbol": "📋"
            }
          ]
        },
        {
          id: 36,
          name: "Yasin",
          arabicName: "يس",
          meaning: "Yasin",
          ayahCount: 83,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "يسٓ",
              transcription: "Yaa Siin",
              translation: "Yasin",
              tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "وَٱلْقُرْءَانِ ٱلْحَكِيمِ",
              transcription: "Wal-qur'aani al-hakiim",
              translation: "Hikmatli Qur’onga qasam",
              tafsir: "Qur’onning hikmatli va muqaddas kitob ekanligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "إِنَّكَ لَمِنَ ٱلْمُرْسَلِينَ",
              transcription: "Innaka lamin al-mursaliin",
              translation: "Albatta, sen yuborilgan payg‘ambarlardansan",
              tafsir: "Payg‘ambarning risolatini tasdiqlash haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "عَلَىٰ صِرَٰطٍۢ مُّسْتَقِيمٍۢ",
              transcription: "‘Alaa siraatin mustaqiim",
              translation: "To‘g‘ri yo‘lda",
              tafsir: "Payg‘ambarning to‘g‘ri yo‘lni ko‘rsatishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "تَنزِيلَ ٱلْعَزِيزِ ٱلرَّحِيمِ",
              transcription: "Tanziila al-'aziizi ar-rahiim",
              translation: "Qudratli va rahmli Zotdan nozil qilingan",
              tafsir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "لِتُنذِرَ قَوْمًۭا مَّآ أُنذِرَ ءَابَآؤُهُمْ",
              transcription: "Litundhira qawman maa undhira aabaa'uhum",
              translation: "Ota-bobolari ogohlantirilmagan qavmni ogohlantirish uchun",
              tafsir: "Payg‘ambarning odamlarni ogohlantirish vazifasi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "قَدْ حَقَّ ٱلْقَوْلُ عَلَىٰٓ أَكْثَرِهِمْ فَهُمْ لَا يُؤْمِنُونَ",
              transcription: "Qad haqqa al-qawlu 'alaa aktharihim fahum laa yu'minuun",
              translation: "Ularning ko‘piga so‘z (azob) haq bo‘ldi, ular iymon keltirmaydilar",
              tafsir: "Kofirlarning inkor qilishi va azobga loyiqligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "إِنَّا جَعَلْنَا فِىٓ أَعْنَٰقِهِمْ أَغْلَٰلًۭا",
              transcription: "Innaa ja'alnaa fii a'naaqihim aghlaalan",
              translation: "Biz ularning bo‘yinlariga kishanlar qo‘ydik",
              tafsir: "Kofirlarning qalblaridagi to‘siqlar tasvirlanadi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "وَجَعَلْنَا مِنۢ بَيْنِ أَيْدِيهِمْ سَدًّۭا",
              transcription: "Wa ja'alnaa min bayni aydiihim saddan",
              translation: "Ularning oldilariga to‘siq qo‘ydik",
              tafir: "Kofirlarning haqiqatni ko‘rmasligi tasviri.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "وَسَوَآءٌ عَلَيْهِمْ ءَأَنذَرْتَهُمْ أَمْ لَمْ تُنذِرْهُمْ",
              transcription: "Wa sawaa'un 'alayhim a-andhartahum am lam tundhirhum",
              translation: "Ularni ogohlantirsang ham, ogohlantirmasang ham baribir",
              tafir: "Kofirlarning ogohlantirishga e’tibor bermasligi.",
              copySymbol: "📋"
            }
          ]
        },
        {
          id: 37,
          name: "As-Saffat",
          arabicName: "الصافات",
          meaning: "Saf tortuvchilar",
          ayahCount: 182,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "وَٱلصَّٰٓفَّٰتِ صَفًّۭا",
              transcription: "Was-saaffaati saffan",
              translation: "Saf tortib turganlarga qasam",
              tafsir: "Farishtalar yoki boshqa saf tortuvchilar haqida qasam.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "فَٱلزَّٰجِرَٰتِ زَجْرًۭا",
              transcription: "Faz-zaajiraati zajran",
              translation: "Haydab yuboruvchilarga qasam",
              tafsir: "Farishtalar yoki bulutlarni boshqaruvchilar haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "فَٱلتَّٰلِيَٰتِ ذِكْرًۭا",
              transcription: "Fat-taaliyaati dhikran",
              translation: "Eslatma o‘quvchilarga qasam",
              tafsir: "Qur’on o‘quvchi farishtalar yoki boshqa zikr qiluvchilar.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "إِنَّ إِلَٰهَكُمْ لَوَٰحِدٌۭ",
              transcription: "Inna ilaahakum lawaahidun",
              translation: "Albatta, ilohingiz yagonadir",
              tafsir: "Allohning yagona iloh ekanligini tasdiqlash.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "رَبُّ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَمَا بَيْنَهُمَا",
              transcription: "Rabbu as-samaawaati wal-ardi wamaa baynahumaa",
              translation: "Osmonlar va yer va ular orasidagilarning Robbisi",
              tafsir: "Allohning koinotdagi hokimiyati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "إِنَّا زَيَّنَّا ٱلسَّمَآءَ ٱلدُّنْيَا بِزِينَةٍ ٱلْكَوَاكِبِ",
              transcription: "Innaa zayyannaa as-samaa'a ad-dunyaa biziinatin al-kawaakibi",
              translation: "Biz dunyo osmonini yulduzlar bilan bezadik",
              tafir: "Osmonning yulduzlar bilan bezatilishi va Allohning qudrati.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "وَحِفْظًۭا مِّن كُلِّ شَيْطَٰنٍۢ مَّارِدٍۢ",
              transcription: "Wa hifzan min kulli shaytaanin maaridin",
              translation: "Har bir isyonkor shaytondan himoya qilish uchun",
              tafir: "Osmonlarning shaytonlardan himoyalanishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "لَا يَسَّمَّعُونَ إِلَى ٱلْمَلَإِ ٱلْأَعْلَىٰ",
              transcription: "Laa yassamma'uuna ilaa al-mala'i al-a'laa",
              translation: "Ular yuqori majlisga quloq sola olmaydilar",
              tafir: "Shaytonlarning farishtalar majlisiga yaqinlasholmasligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "يُقْذَفُونَ مِن كُلِّ جَانِبٍۢ",
              transcription: "Yuqdhafuuna min kulli jaanibin",
              translation: "Ular har tomondan quviladilar",
              tafir: "Shaytonlarning osmondan quvilishi va jazolanishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "إِلَّا مَنْ خَطِفَ ٱلْخَطْفَةَ فَأَتْبَعَهُۥ شِهَابٌۭ ثَاقِبٌۭ",
              transcription: "Illaa man khatifa al-khatfata fa-atba'ahu shihaabun thaaqibun",
              translation: "Faqat o‘g‘irlab bir narsa olgan bo‘lsa, uni yorqin shihob ta’qib qiladi",
              tafir: "Shaytonlarning o‘g‘irlashga urinishi va shihob bilan jazolanishi.",
              copySymbol: "📋"
            }
          ]
        },
        {
          id: 38,
          name: "Sad",
          arabicName: "ص",
          meaning: "Sad",
          ayahCount: 88,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "صٓ ۚ وَٱلْقُرْءَانِ ذِى ٱلذِّكْرِ",
              transcription: "Saad wal-qur'aani dhii adh-dhikri",
              translation: "Sad. Eslatma (zikr) sohibi Qur’onga qasam",
              tafsir: "Qur’onning zikr va hikmatli kitob ekanligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "بَلِ ٱلَّذِينَ كَفَرُوا۟ فِى عِزَّةٍۢ وَشِقَاقٍۢ",
              transcription: "Bali alladhiina kafaruu fii 'izzatin wa shiqaqin",
              translation: "Yo‘q, kofirlar mag‘rurlik va qarama-qarshilikdadirlar",
              tafsir: "Kofirlarning takabburligi va haqqa qarshi chiqishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "كَمْ أَهْلَكْنَا مِن قَبْلِهِم مِّن قَرْنٍۢ",
              transcription: "Kam ahlaknaa min qablihim min qarnin",
              translation: "Ulardan oldin qancha avlodlarni halok qildik",
              tafsir: "O‘tgan ummatlarning halokati va ibrat olish haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "وَعَجِبُوٓا۟ أَن جَآءَهُم مُّنذِرٌۭ مِّنْهُمْ",
              transcription: "Wa 'ajibuu an jaa'ahum mundhirun minhum",
              translation: "Ular orasidan ogohlantiruvchi kelganiga hayron bo‘ldilar",
              tafsir: "Kofirlarning payg‘ambarga hayron qolishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "وَقَالُوا۟ سَٰحِرٌۭ كَذَّابٌۭ",
              transcription: "Wa qaaluu saahirun kadh-dhaabun",
              translation: "Ular dedilar: 'Bu sehrgar, yolg‘onchi'",
              tafsir: "Kofirlarning payg‘ambarni yolg‘on va sehrgar deb atashi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "قُلْ إِنَّمَآ أَنَا۠ مُنذِرٌۭ",
              transcription: "Qul innamaa ana mundhirun",
              translation: "Ayting: 'Men faqat ogohlantiruvchiman'",
              tafsir: "Payg‘ambarning ogohlantiruvchi roliga ishora.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "وَمَا خَلَقْنَا ٱلسَّمَآءَ وَٱلْأَرْضَ وَمَا بَيْنَهُمَا بَٰطِلًۭا",
              transcription: "Wamaa khalaqnaa as-samaa'a wal-arda wamaa baynahumaa baatilan",
              translation: "Osmon va yer va ular orasidagilarni behuda yaratmadik",
              tafsir: "Koinotning maqsadli yaratilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "ذَٰلِكَ ظَنُّ ٱلَّذِينَ كَفَرُوا۟ ۚ فَوَيْلٌۭ لِّلَّذِينَ كَفَرُوا۟",
              transcription: "Dhaalika zhannu alladhiina kafaruu fawaylun lilladhiina kafaruu",
              translation: "Bu kofirlarning gumoni, kofirlarga vayl bo‘lsin",
              tafir: "Kofirlarning noto‘g‘ri e’tiqodi va oqibati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "أَمْ عِندَهُمْ خَزَآئِنُ رَحْمَةِ رَبِّكَ",
              transcription: "Am 'indahum khazaa'inu rahmati rabbika",
              translation: "Yoki ularning yonida Robbingning rahmat xazinalari bormi?",
              tafir: "Allohning rahmatini taqsimlash faqat Uning ixtiyorida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "أَمْ لَهُم مُّلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
              transcription: "Am lahum mulku as-samaawaati wal-ardi",
              translation: "Yoki osmonlar va yer mulki ularga tegishlimi?",
              tafir: "Allohning yagona mulk egaligi va kofirlarning mag‘rurligi.",
              copySymbol: "📋"
            }
          ]
        },
        {
          id: 39,
          name: "Az-Zumar",
          arabicName: "الزمر",
          meaning: "Guruhlar",
          ayahCount: 75,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "تَنزِيلُ ٱلْكِتَٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْحَكِيمِ",
              transcription: "Tanziilu al-kitaabi mina allaahi al-'aziizi al-hakiim",
              translation: "Kitobning nozil bo‘lishi qudratli va hikmatli Allohdandir",
              tafsir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "إِنَّآ أَنزَلْنَآ إِلَيْكَ ٱلْكِتَٰبَ بِٱلْحَقِّ",
              transcription: "Innaa anzalnaa ilayka al-kitaaba bil-haqqi",
              translation: "Biz senga Kitobni haq bilan nozil qildik",
              tafsir: "Qur’onning haqiqat bilan nozil qilinishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "أَلَا لِلَّهِ ٱلدِّينُ ٱلْخَالِصُ",
              transcription: "Alaa lillahi ad-diinu al-khaalisu",
              translation: "Faqat Alloh uchun pok din bormi?",
              tafsir: "Din faqat Allohga xos bo‘lishi kerakligi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "لَوْ أَرَادَ ٱللَّهُ أَن يَتَّخِذَ وَلَدًۭا",
              transcription: "Law araada allaahu an yattakhidha waladan",
              translation: "Agar Alloh farzand olishni xohlasa edi",
              tafsir: "Allohning farzanddan pokligi va yagona ilohligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ بِٱلْحَقِّ",
              transcription: "Khalaqa as-samaawaati wal-arda bil-haqqi",
              translation: "Osmonlar va yerni haq bilan yaratdi",
              tafsir: "Koinotning maqsadli va haq bilan yaratilishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "خَلَقَكُم مِّن نَّفْسٍۢ وَٰحِدَةٍۢ ثُمَّ جَعَلَ مِنْهَا زَوْجَهَا",
              transcription: "Khalaqakum min nafsin waahidatin thumma ja'ala minhaa zawjahaa",
              translation: "Sizlarni bir nafsdan yaratdi, so‘ng undan juftini qildi",
              tafir: "Insonning bir nafsdan va juft sifatida yaratilishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "إِن تَكْفُرُوا۟ فَإِنَّ ٱللَّهَ غَنِىٌّ عَنكُمْ",
              transcription: "In takfuruu fa-inna allaaha ghaniyyun 'ankum",
              translation: "Agar kufr keltirsangiz, Alloh sizlarga muhtoj emas",
              tafir: "Allohning mustaqilligi va kofirlarning zarar ko‘rishi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "وَإِذَا مَسَّ ٱلْإِنسَٰنَ ضُرٌّۭ دَعَا رَبَّهُۥ",
              transcription: "Wa idhaa massa al-insaana durrun da'aa rabbahu",
              translation: "Insonga zarar yetganda Robbisiga iltijo qiladi",
              tafir: "Insonning qiyinchilikda Allohga yuzlanishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "أَمَّنْ هُوَ قَٰنِتٌ ءَانَآءَ ٱلَّيْلِ سَاجِدًۭا",
              transcription: "Amman huwa qaanitun aanaa'a al-layli saajidan",
              translation: "Kechasi sajda va qiyomda ibodat qiluvchi kishimi?",
              tafir: "Ibodat qiluvchi mo‘minning fazilati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "قُلْ يَٰعِبَادِىَ ٱلَّذِينَ ءَامَنُوا۟ ٱتَّقُوا۟ رَبَّكُمْ",
              transcription: "Qul yaa 'ibaadiya alladhiina aamanuu ittaquu rabbakum",
              translation: "Ayting: 'Ey iymon keltirgan bandalarim, Robbingizdan qo‘rqing'",
              tafir: "Mo‘minlarga taqvo va Allohdan qo‘rqish buyuriladi.",
              copySymbol: "📋"
            }
          ]
        },
        {
          id: 40,
          name: "G'ofir",
          arabicName: "غافر",
          meaning: "Kechiruvchi",
          ayahCount: 85,
          place: "Makka",
          prelude: {
            bismillah: {
              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
              transcription: "Bismillahir-Rahmanir-Rahiim",
              translation: "Mehribon va rahmli Alloh nomi bilan",
              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
              copySymbol: "📋"
            }
          },
          ayahs: [
            {
              numberArabic: "١",
              numberLatin: "1",
              arabic: "حمٓ",
              transcription: "Haa Miim",
              translation: "Ha, Mim",
              tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٢",
              numberLatin: "2",
              arabic: "تَنزِيلُ ٱلْكِتَٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْعَلِيمِ",
              transcription: "Tanziilu al-kitaabi mina allaahi al-'aziizi al-'aliim",
              translation: "Kitobning nozil bo‘lishi qudratli va biluvchi Allohdandir",
              tafsir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٣",
              numberLatin: "3",
              arabic: "غَافِرِ ٱلذَّنۢبِ وَقَابِلِ ٱلتَّوْبِ شَدِيدِ ٱلْعِقَابِ",
              transcription: "Ghaafiri adh-dhanbi wa qaabili at-tawbi shadiidi al-'iqaabi",
              translation: "Gunohlarni kechiruvchi, tavbani qabul qiluvchi, jazo berishda qattiq",
              tafsir: "Allohning kechiruvchi va adolatli sifatlari haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٤",
              numberLatin: "4",
              arabic: "مَا يُجَٰدِلُ فِىٓ ءَايَٰتِ ٱللَّهِ إِلَّا ٱلَّذِينَ كَفَرُوا۟",
              transcription: "Maa yujaadilu fii aayaati allaahi illaa alladhiina kafaruu",
              translation: "Allohning oyatlari haqida faqat kofirlar bahslashadi",
              tafsir: "Kofirlarning oyatlarni rad qilishi va bahslari.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٥",
              numberLatin: "5",
              arabic: "كَذَّبَتْ قَبْلَهُمْ قَوْمُ نُوحٍۢ وَٱلْأَحْزَابُ مِنۢ بَعْدِهِمْ",
              transcription: "Kadhdhabat qablahum qawmu nuuhin wal-ahzaabu min ba'dihim",
              translation: "Ulardan oldin Nuh qavmi va undan keyingi guruhlar yolg‘on dedilar",
              tafsir: "O‘tgan qavmlarning payg‘ambarlarni yolg‘on deb inkor qilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٦",
              numberLatin: "6",
              arabic: "وَكَذَٰلِكَ حَقَّتْ كَلِمَةُ رَبِّكَ عَلَى ٱلَّذِينَ كَفَرُوا۟",
              transcription: "Wa kadhaalika haqqat kalimatu rabbika 'alaa alladhiina kafaruu",
              translation: "Robbingning kofirlarga nisbatan so‘zi shunday haq bo‘ldi",
              tafsir: "Kofirlar uchun azobning muqarrar bo‘lishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٧",
              numberLatin: "7",
              arabic: "ٱلَّذِينَ يَحْمِلُونَ ٱلْعَرْشَ وَمَنْ حَوْلَهُۥ يُسَبِّحُونَ",
              transcription: "Alladhiina yahmiluuna al-'arsha wa man hawlahu yusabbihuun",
              translation: "Arshni ko‘taruvchilar va uning atrofidagilar tasbih aytadilar",
              tafsir: "Farishtalarning Allohni ulug‘lashi va ibodati haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٨",
              numberLatin: "8",
              arabic: "رَبَّنَا وَأَدْخِلْهُمْ جَنَّٰتِ عَدْنٍ ٱلَّتِى وَعَدْتَهُمْ",
              transcription: "Rabbanaa wa adkhilhum jannaati 'adnin allatii wa'adtahum",
              translation: "Robbimiz, ularni va’da qilgan Adn jannatlariga kirit",
              tafsir: "Farishtalarning mo‘minlar uchun duosi va jannat haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "٩",
              numberLatin: "9",
              arabic: "وَقِهِمُ ٱلسَّيِّـَٔاتِ ۚ وَمَن تَقِ ٱلسَّيِّـَٔاتِ يَوْمَئِذٍۢ",
              transcription: "Wa qihimu as-sayyi'aati wa man taqi as-sayyi'aati yawma'idhin",
              translation: "Ularni yomonliklardan saqla, o‘sha kuni yomonliklardan saqlagan kishi",
              tafsir: "Allohning mo‘minlarni yomonliklardan himoya qilishi haqida.",
              copySymbol: "📋"
            },
            {
              numberArabic: "١٠",
              numberLatin: "10",
              arabic: "إِنَّ ٱلَّذِينَ كَفَرُوا۟ يُنَادَوْنَ لَمَقْتُ ٱللَّهِ أَكْبَرُ",
              transcription: "Inna alladhiina kafaruu yunaadawna lamaqtu allaahi akbaru",
              translation: "Kofirlarga nido qilinadi: 'Allohning g‘azabi sizning g‘azabingizdan kattaroq'",
              tafsir: "Kofirlarning do‘zaxda Allohning g‘azabini bilishi haqida.",
              copySymbol: "📋"
            }
          ]
        },
       
          {
            id: 41,
            name: "Fussilat",
            arabicName: "فصلت",
            meaning: "Tafsil qilingan",
            ayahCount: 54,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "تَنزِيلٌۭ مِّنَ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Tanziilun mina ar-rahmaani ar-rahiim",
                translation: "Rahmon va Rahiimdan nozil qilingan",
                tafsir: "Qur’onning Allohning rahmati sifatida nozil qilingani haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "كِتَٰبٌۭ فُصِّلَتْ ءَايَٰتُهُۥ قُرْءَانًا عَرَبِيًّۭا",
                transcription: "Kitaabun fussilat aayaatuhu qur'aanan 'arabiyyan",
                translation: "Oyatlar tafsil qilingan arabcha Qur’on kitobidir",
                tafsir: "Qur’onning aniq va arab tilida nozil qilingani haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "بَشِيرًۭا وَنَذِيرًۭا فَأَعْرَضَ أَكْثَرُهُمْ",
                transcription: "Bashiiran wa nadhiiran fa-a'rada aktharuhum",
                translation: "Xushxabar beruvchi va ogohlantiruvchi, lekin ko‘plari yuz o‘girdilar",
                tafsir: "Qur’onning hidoyat va ogohlantirish roli, ammo inkor qiluvchilar haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "وَقَالُوا۟ قُلُوبُنَا فِىٓ أَكِنَّةٍۢ مِّمَّا تَدْعُونَآ إِلَيْهِ",
                transcription: "Wa qaaluu quluubunaa fii akinantin mimmaa tad'uunaa ilayhi",
                translation: "Ular dedilar: 'Qalblarimiz seni chaqirayotgan narsaga pardalangan'",
                tafsir: "Kofirlarning qalb qattiqligi va haqiqatni rad qilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "قُلْ إِنَّمَآ أَنَا۠ بَشَرٌۭ مِّثْلُكُمْ يُوحَىٰٓ إِلَىَّ",
                transcription: "Qul innamaa ana basharun mithlukum yuuhaa ilayya",
                translation: "Ayting: 'Men sizlar kabi odamman, faqat menga vahiy keladi'",
                tafsir: "Payg‘ambarning insoniy tabiati va vahiy oluvchi ekanligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "ٱلَّذِينَ لَا يُؤْتُونَ ٱلزَّكَوٰةَ وَهُم بِٱلْءَاخِرَةِ كَٰفِرُونَ",
                transcription: "Alladhiina laa yu'tuuna az-zakaata wahum bil-aakhirati kaafiruun",
                translation: "Zakat bermaydiganlar va oxiratni inkor qiluvchilar",
                tafsir: "Kofirlarning zakotdan bosh tortishi va oxiratni rad qilishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "إِنَّ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ لَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍۢ",
                transcription: "Inna alladhiina aamanuu wa 'amiluu as-saalihaati lahum ajrun ghayru mamnuunin",
                translation: "Iymon keltirib, solih amal qilganlarga cheksiz mukofot bor",
                tafsir: "Mo‘minlarning yaxshi amallari uchun abadiy mukofoti haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "قُلْ أَئِنَّكُمْ لَتَكْفُرُونَ بِٱلَّذِى خَلَقَ ٱلْأَرْضَ فِى يَوْمَيْنِ",
                transcription: "Qul a-innakum latakfuruuna billadhii khalaqa al-arda fii yawmayni",
                translation: "Ayting: 'Yerni ikki kunda yaratganga kufr keltirasizlarmi?'",
                tafsir: "Allohning yaratuvchi qudrati va kofirlarning inkor qilishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "وَجَعَلَ فِيهَا رَوَٰسِىَ مِن فَوْقِهَا وَبَٰرَكَ فِيهَا",
                transcription: "Wa ja'ala fiihaa rawaasiya min fawqihaa wa baaraka fiihaa",
                translation: "Unda baland tog‘lar qildi va baraka berdi",
                tafsir: "Allohning yerga baraka va mustahkamlik bergani haqida.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 42,
            name: "Ash-Shura",
            arabicName: "الشورى",
            meaning: "Maslahat",
            ayahCount: 53,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "عٓسٓقٓ",
                transcription: "‘Ayn Siin Qaaf",
                translation: "‘Ayn, Sin, Qof",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "كَذَٰلِكَ يُوحِىٓ إِلَيْكَ وَإِلَى ٱلَّذِينَ مِن قَبْلِكَ",
                transcription: "Kadhaalika yuuhi ilayka wa ilaa alladhiina min qablika",
                translation: "Shunday qilib, senga va sendan oldingilarga vahiy qiladi",
                tafsir: "Allohning payg‘ambarlarga vahiy yuborishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "لَهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                transcription: "Lahu maa fi as-samaawaati wamaa fi al-ardi",
                translation: "Osmonlar va yerdagi hamma narsa Unikidir",
                tafsir: "Allohning koinotdagi yagona egaligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "تَكَادُ ٱلسَّمَٰوَٰتُ يَتَفَطَّرْنَ مِن فَوْقِهِنَّ",
                transcription: "Takaadu as-samaawaatu yatafattarna min fawqihinna",
                translation: "Osmonlar yuqoridan yorilishga yaqin",
                tafsir: "Allohning ulug‘vorligi oldida koinotning hayrati tasviri.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "وَٱلَّذِينَ ٱتَّخَذُوا۟ مِن دُونِهِۦٓ أَوْلِيَآءَ",
                transcription: "Walladhiina ittakhadhuu min duunihi awliyaa'a",
                translation: "Undan boshqa do‘stlar tutganlar",
                tafsir: "Shirk qiluvchilarning Allohni qoldirib boshqa himoyachilar izlashi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَكَذَٰلِكَ أَوْحَيْنَآ إِلَيْكَ قُرْءَانًا عَرَبِيًّۭا",
                transcription: "Wa kadhaalika aw haynaa ilayka qur'aanan 'arabiyyan",
                translation: "Shunday qilib, senga arabcha Qur’on vahiy qildik",
                tafsir: "Qur’onning arab tilida nozil qilinganligi va uning maqsadi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "وَلَوْ شَآءَ ٱللَّهُ لَجَعَلَهُمْ أُمَّةًۭ وَٰحِدَةًۭ",
                transcription: "Wa law shaa'a allaahu laja'alahum ummatan waahidatan",
                translation: "Agar Alloh xohlasa edi, ularni yagona ummat qilardi",
                tafsir: "Allohning odamlarni turli yo‘llarga yo‘naltirishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "أَمِ ٱتَّخَذُوا۟ مِن دُونِهِۦٓ أَوْلِيَآءَ",
                transcription: "Ami ittakhadhuu min duunihi awliyaa'a",
                translation: "Yoki Undan boshqa himoyachilar tutdilar?",
                tafsir: "Allohdan boshqa himoyachilar izlashning noto‘g‘riligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "وَمَا ٱخْتَلَفْتُمْ فِيهِ مِن شَىْءٍۢ فَحُكْمُهُۥٓ إِلَى ٱللَّهِ",
                transcription: "Wa maa ikhtalaftum fiihi min shay'in fahukmuhu ilaa allaahi",
                translation: "Nima haqida ixtilof qilsangiz, uning hukmi Allohgadir",
                tafsir: "Ixtiloflarning Allohning hukmi bilan hal qilinishi.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 43,
            name: "Az-Zukhruf",
            arabicName: "الزخرف",
            meaning: "Zargarlik",
            ayahCount: 89,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "وَٱلْكِتَٰبِ ٱلْمُبِينِ",
                transcription: "Wal-kitaabi al-mubiini",
                translation: "Aniq kitobga qasam",
                tafsir: "Qur’onning aniq va haqiqiy kitob ekanligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "إِنَّا جَعَلْنَٰهُ قُرْءَانًا عَرَبِيًّۭا لَّعَلَّكُمْ تَعْقِلُونَ",
                transcription: "Innaa ja'alnaahu qur'aanan 'arabiyyan la'allakum ta'qiluun",
                translation: "Biz uni arabcha Qur’on qildik, shoyad aql yurasizlar",
                tafsir: "Qur’onning arab tilida tushunarli bo‘lishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "وَإِنَّهُۥ فِىٓ أُمِّ ٱلْكِتَٰبِ لَدَيْنَا لَعَلِىٌّ حَكِيمٌ",
                transcription: "Wa innahu fii ummi al-kitaabi ladaynaa la'aliyyun hakiimun",
                translation: "U bizning huzurimizda asl kitobda ulug‘ va hikmatlidir",
                tafsir: "Qur’onning Lavhul Mahfuzdagi ulug‘ maqomi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "أَفَنَضْرِبُ عَنكُمُ ٱلذِّكْرَ صَفْحًا أَن كُنتُمْ قَوْمًۭا مُّسْرِفِينَ",
                transcription: "Afanadribu 'ankumu adh-dhikra safhan an kuntum qawman musrifiin",
                translation: "Isrofgar qavm bo‘lganingiz uchun zikrni sizdan yuz o‘giraylikmi?",
                tafsir: "Qur’onning kofirlarga ham nozil qilinganligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "وَكَمْ أَرْسَلْنَا مِن نَّبِىٍّۢ فِى ٱلْأَوَّلِينَ",
                transcription: "Wa kam arsalnaa min nabiyyin fi al-awwaliin",
                translation: "Oldingi qavmlarga qancha payg‘ambar yubordik",
                tafsir: "Payg‘ambarlarning o‘tgan ummatlarga yuborilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَمَا يَأْتِيهِم مِّن نَّبِىٍّ إِلَّا كَانُوا۟ بِهِۦ يَسْتَهْزِئُونَ",
                transcription: "Wa maa ya'tiihim min nabiyyin illaa kaanuu bihi yastahzi'uun",
                translation: "Ularga biror payg‘ambar kelmaganki, uni masxara qilmagan bo‘lsinlar",
                tafsir: "Kofirlarning payg‘ambarlarni masxara qilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "فَأَهْلَكْنَآ أَشَدَّ مِنْهُم بَطْشًۭا",
                transcription: "Fa-ahlaknaa ashadda minhum batshan",
                translation: "Biz ulardan kuchliroqlarini halok qildik",
                tafsir: "O‘tgan kofir qavmlarning halokati haqida ogohlantirish.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "وَلَئِن سَأَلْتَهُم مَّنْ خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ",
                transcription: "Wa la-in sa'altahum man khalaqa as-samaawaati wal-arda",
                translation: "Agar ulardan osmon va yerni kim yaratganini so‘rasang",
                tafsir: "Kofirlarning Allohning yaratuvchiligini tan olishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "ٱلَّذِى جَعَلَ لَكُمُ ٱلْأَرْضَ مَهْدًۭا",
                transcription: "Alladhii ja'ala lakumu al-arda mahdan",
                translation: "U sizlar uchun yerni beshik qildi",
                tafsir: "Allohning yerni insonlar uchun qulay qilgani haqida.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 44,
            name: "Ad-Dukhan",
            arabicName: "الدخان",
            meaning: "Tutun",
            ayahCount: 59,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "وَٱلْكِتَٰبِ ٱلْمُبِينِ",
                transcription: "Wal-kitaabi al-mubiini",
                translation: "Aniq kitobga qasam",
                tafsir: "Qur’onning aniq va haqiqiy kitob ekanligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةٍۢ مُّبَٰرَكَةٍ",
                transcription: "Innaa anzalnaahu fii laylatin mubaarakatin",
                translation: "Biz uni muborak kechada nozil qildik",
                tafsir: "Qur’onning Qadr kechasida nozil qilingani haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "فِيهَا يُفْرَقُ كُلُّ أَمْرٍ حَكِيمٍ",
                transcription: "Fiihaa yufraqu kullu amrin hakiimin",
                translation: "Unda har bir hikmatli ish ajratiladi",
                tafsir: "Qadr kechasida taqdirlar belgilanishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "أَمْرًۭا مِّنْ عِندِنَآ ۚ إِنَّا كُنَّا مُرْسِلِينَ",
                transcription: "Amran min 'indinaa innaa kunnaa mursiliin",
                translation: "Bizdan bo‘lgan amr bilan, biz yuboruvchilar edik",
                tafsir: "Allohning payg‘ambarlar va vahiy yuborishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "رَحْمَةًۭ مِّن رَّبِّكَ ۚ إِنَّهُۥ هُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
                transcription: "Rahmatan min rabbika innahu huwa as-samii'u al-'aliimu",
                translation: "Robbingdan rahmat sifatida, U eshituvchi va biluvchidir",
                tafsir: "Allohning rahmati va ilmi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "رَبِّ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَمَا بَيْنَهُمَآ",
                transcription: "Rabbi as-samaawaati wal-ardi wamaa baynahumaa",
                translation: "Osmonlar va yer va ular orasidagilarning Robbisi",
                tafsir: "Allohning koinotdagi yagona hokimiyati haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "لَآ إِلَٰهَ إِلَّا هُوَ يُحْىِۦ وَيُمِيتُ",
                transcription: "Laa ilaaha illaa huwa yuhyii wa yumiitu",
                translation: "Undan boshqa iloh yo‘q, U tiriltiradi va o‘ldiradi",
                tafsir: "Allohning yagona ilohligi va hayot va o‘lim Uning qo‘lida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "بَلْ هُمْ فِى شَكٍّۢ يَلْعَبُونَ",
                transcription: "Bal hum fii shakkin yal'abuun",
                translation: "Yo‘q, ular shakda o‘ynab yuribdilar",
                tafsir: "Kofirlarning haqiqatdan shakda bo‘lib, o‘yin-kulgi bilan shug‘ullanishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "فَٱرْتَقِبْ يَوْمَ تَأْتِى ٱلسَّمَآءُ بِدُخَانٍۢ مُّبِينٍ",
                transcription: "Fartaqib yawma ta'tii as-samaa'u bidukhaanin mubiinin",
                translation: "Osmon aniq tutun bilan keladigan kunni kuting",
                tafsir: "Qiyomatning alomatlaridan biri bo‘lgan tutun haqida.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 45,
            name: "Al-Jathiya",
            arabicName: "الجاثية",
            meaning: "Tiz cho‘kuvchilar",
            ayahCount: 37,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "تَنزِيلُ ٱلْكِتَٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْحَكِيمِ",
                transcription: "Tanziilu al-kitaabi mina allaahi al-'aziizi al-hakiimi",
                translation: "Kitobning nozil bo‘lishi qudratli va hikmatli Allohdandir",
                tafsir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "إِنَّ فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ لَءَايَٰتٍۢ لِّلْمُؤْمِنِينَ",
                transcription: "Inna fi as-samaawaati wal-ardi la-aayaatin lil-mu'miniin",
                translation: "Osmonlar va yerda mo‘minlar uchun alomatlar bor",
                tafsir: "Koinotdagi Allohning alomatlari va mo‘minlarning tafakkuri.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "وَفِى خَلْقِكُمْ وَمَا يَبُثُّ مِن دَآبَّةٍ ءَايَٰتٌۭ",
                transcription: "Wa fii khalqikum wamaa yabuththu min daabbatin aayaatun",
                translation: "Sizlarning yaratilishingizda va jonzotlarda alomatlar bor",
                tafsir: "Inson va jonzotlarning yaratilishidagi mo‘jizalar haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "وَٱخْتِلَٰفِ ٱلَّيْلِ وَٱلنَّهَارِ وَمَآ أَنزَلَ ٱللَّهُ مِنَ ٱلسَّمَآءِ",
                transcription: "Wa ikhtilaafi al-layli wan-nahaari wamaa anzala allaahu mina as-samaa'i",
                translation: "Kechayu kunduzning almashinishi va Allohning osmondan yuborgan narsasi",
                tafsir: "Tabiatdagi Allohning qudrati va ne’matlari haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "تِلْكَ ءَايَٰتُ ٱللَّهِ نَتْلُوهَا عَلَيْكَ بِٱلْحَقِّ",
                transcription: "Tilka aayaatu allaahi natluuhaa 'alayka bil-haqqi",
                translation: "Bu Allohning oyatlari, ularni senga haq bilan o‘qiymiz",
                tafsir: "Qur’on oyatlarining haqiqat ekanligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَيْلٌۭ لِّكُلِّ أَفَّاكٍ أَثِيمٍۢ",
                transcription: "Waylun likulli affaakin athiimin",
                translation: "Har bir yolg‘onchi va gunohkorga vayl bo‘lsin",
                tafsir: "Yolg‘onchilar va gunohkorlarning oqibati haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "يَسْمَعُ ءَايَٰتِ ٱللَّهِ تُتْلَىٰ عَلَيْهِ ثُمَّ يُصِرُّ مُسْتَكْبِرًۭا",
                transcription: "Yasma'u aayaati allaahi tutlaa 'alayhi thumma yusirru mustakbiran",
                translation: "Alloh oyatlarini eshitadi, lekin mag‘rur bo‘lib qaysarlik qiladi",
                tafsir: "Kofirlarning oyatlarni rad qilishi va takabburligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "بَلْ هُوَ كَذَّابٌ أَشِرٌۭ",
                transcription: "Bal huwa kadhdhaabun ashirun",
                translation: "Yo‘q, u yolg‘onchi va haddan oshuvchidir",
                tafsir: "Kofirlarning yolg‘onchiligi va isrofgarchiligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "سَنُرِيهِمْ ءَايَٰتِنَا فِى ٱلْءَافَاقِ وَفِىٓ أَنفُسِهِمْ",
                transcription: "Sanuriihim aayaatinaa fi al-aafaaqi wa fii anfusihim",
                translation: "Ularga ufaqda va o‘zlarida oyatlarimizni ko‘rsatamiz",
                tafsir: "Allohning alomatlarining koinot va insonda namoyon bo‘lishi.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 46,
            name: "Al-Ahqaf",
            arabicName: "الأحقاف",
            meaning: "Qum tepalar",
            ayahCount: 35,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "حمٓ",
                transcription: "Haa Miim",
                translation: "Ha, Mim",
                tafsir: "Muqatta’at harflari, ularning ma’nosi Allohga ma’lum.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "تَنزِيلُ ٱلْكِتَٰبِ مِنَ ٱللَّهِ ٱلْعَزِيزِ ٱلْحَكِيمِ",
                transcription: "Tanziilu al-kitaabi mina allaahi al-'aziizi al-hakiimi",
                translation: "Kitobning nozil bo‘lishi qudratli va hikmatli Allohdandir",
                tafsir: "Qur’onning Allohdan kelgan ilohiy kitob ekanligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "مَا خَلَقْنَا ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ وَمَا بَيْنَهُمَآ إِلَّا بِٱلْحَقِّ",
                transcription: "Maa khalaqnaa as-samaawaati wal-arda wamaa baynahumaa illaa bil-haqqi",
                translation: "Osmonlar va yer va ular orasidagilarni faqat haq bilan yaratdik",
                tafsir: "Koinotning maqsadli va haq bilan yaratilishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "قُلْ أَرَءَيْتُم مَّا تَدْعُونَ مِن دُونِ ٱللَّهِ",
                transcription: "Qul ara'aytum maa tad'uuna min duuni allaahi",
                translation: "Ayting: 'Allohdan boshqa chaqirganlaringizni ko‘rdingizmi?'",
                tafsir: "Butlarga ibodat qilishning noto‘g‘riligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "وَمَنْ أَضَلُّ مِمَّن يَدْعُوا۟ مِن دُونِ ٱللَّهِ",
                transcription: "Wa man adallu mimman yad'uu min duuni allaahi",
                translation: "Allohdan boshqaga iltijo qilgandan ko‘ra adashgan kim bor?",
                tafsir: "Shirkning eng katta adashish ekanligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "وَإِذَا حُشِرَ ٱلنَّاسُ كَانُوا۟ لَهُمْ أَعْدَآءًۭ",
                transcription: "Wa idhaa hushira an-naasu kaanuu lahum a'daa'an",
                translation: "Odamlar yig‘ilganda, ular ularga dushman bo‘ladilar",
                tafsir: "Butlarning qiyomatda o‘z ibodat qiluvchilariga dushman bo‘lishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَإِذَا تُتْلَىٰ عَلَيْهِمْ ءَايَٰتُنَا بَيِّنَٰتٍۢ",
                transcription: "Wa idhaa tutlaa 'alayhim aayaatunaa bayyinaatin",
                translation: "Ularga aniq oyatlarimiz o‘qilganda",
                tafsir: "Kofirlarning Qur’on oyatlarini rad qilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "أَمْ يَقُولُونَ ٱفْتَرَىٰهُ ۖ قُلْ إِنِ ٱفْتَرَيْتُهُۥ",
                transcription: "Am yaquuluuna iftaraahu qul ini iftaraytuhu",
                translation: "Ular 'U uydirdi' deydilarmi? Ayting: 'Agar uydirgan bo‘lsam'",
                tafsir: "Kofirlarning Qur’onni uydirma deb da’vo qilishi va rad javobi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "قُلْ مَا كُنتُ بِدْعًۭا مِّنَ ٱلرُّسُلِ",
                transcription: "Qul maa kuntu bid'an mina ar-rusuli",
                translation: "Ayting: 'Men rasullardan yangilik emasman'",
                tafsir: "Payg‘ambarning boshqa rasullar kabi ekanligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "قُلْ أَرَءَيْتُمْ إِن كَانَ مِنْ عِندِ ٱللَّهِ",
                transcription: "Qul ara'aytum in kaana min 'indi allaahi",
                translation: "Ayting: 'Agar bu Allohdan bo‘lsa, deb o‘ylaysizmi?'",
                tafsir: "Qur’onning Allohdan ekanligiga ishonmaslikning oqibati.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 47,
            name: "Muhammad",
            arabicName: "محمد",
            meaning: "Muhammad",
            ayahCount: 38,
            place: "Madina",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "ٱلَّذِينَ كَفَرُوا۟ وَصَدُّوا۟ عَن سَبِيلِ ٱللَّهِ",
                transcription: "Alladhiina kafaruu wa sadduu 'an sabiili allaahi",
                translation: "Kofir bo‘lib, Alloh yo‘lidan to‘sganlar",
                tafsir: "Kofirlarning Alloh yo‘lidan to‘sishi va oqibati haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "وَٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّٰلِحَٰتِ",
                transcription: "Walladhiina aamanuu wa 'amiluu as-saalihaati",
                translation: "Iymon keltirib, solih amal qilganlar",
                tafsir: "Mo‘minlarning yaxshi amallari va mukofoti haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "ذَٰلِكَ بِأَنَّ ٱلَّذِينَ كَفَرُوا۟ ٱتَّبَعُوا۟ ٱلْبَٰطِلَ",
                transcription: "Dhaalika bi-anna alladhiina kafaruu ittaba'uu al-baatila",
                translation: "Chunki kofirlar botilga ergashdilar",
                tafsir: "Kofirlarning yolg‘on yo‘lga ergashishi va mo‘minlarning haq yo‘li.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "فَإِذَا لَقِيتُمُ ٱلَّذِينَ كَفَرُوا۟ فَضَرْبَ ٱلرِّقَابِ",
                transcription: "Fa-idhaa laqiitumu alladhiina kafaruu fadharba ar-riqaabi",
                translation: "Kofirlarni uchratganingizda bo‘yinlarini uring",
                tafsir: "Jihod va kofirlarga qarshi jang haqidagi hukm.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "سَيَهْدِيهِمْ وَيُصْلِحُ بَالَهُمْ",
                transcription: "Sayahdiidhim wa yuslihu baalahum",
                translation: "Ularni hidoyat qiladi va hollarini isloh qiladi",
                tafsir: "Allohning mo‘minlarni hidoyat va yaxshilik bilan qo‘llab-quvvatlashi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "وَيُدْخِلُهُمْ جَنَّٰتٍۢ تَجْرِى تَحْتَهَا ٱلْأَنْهَٰرُ",
                transcription: "Wa yudkhiluhum jannaatin tajrii tahtahaa al-anhaaru",
                translation: "Ularni ostidan daryolar oqib yotgan jannatlarga kiritadi",
                tafsir: "Mo‘minlarning jannat bilan mukofotlanishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ إِن تَنصُرُوا۟ ٱللَّهَ",
                transcription: "Yaa ayyuhaa alladhiina aamanuu in tansuruu allaaha",
                translation: "Ey iymon keltirganlar, agar Allohga yordam bersangiz",
                tafsir: "Mo‘minlarning Alloh yo‘lida yordam berishi va mukofoti.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "وَٱلَّذِينَ كَفَرُوا۟ فَتَعْسًۭا لَّهُمْ",
                transcription: "Walladhiina kafaruu fata'san lahum",
                translation: "Kofirlar uchun esa halokat bo‘lsin",
                tafsir: "Kofirlarning yomon oqibati va Allohning adolati.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "ذَٰلِكَ بِأَنَّهُمْ كَرِهُوا۟ مَآ أَنزَلَ ٱللَّهُ",
                transcription: "Dhaalika bi-annahum karihuu maa anzala allaahu",
                translation: "Chunki ular Alloh nozil qilgan narsani yomon ko‘rdilar",
                tafsir: "Kofirlarning Qur’onni rad qilishi va oqibati.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "أَفَلَمْ يَسِيرُوا۟ فِى ٱلْأَرْضِ فَيَنظُرُوا۟ كَيْفَ كَانَ عَٰقِبَةُ",
                transcription: "Afalam yasiiruu fi al-ardi fayanzuruu kayfa kaana 'aaqibatu",
                translation: "Yer yuzida sayr qilmadilarmi, oldingilarning oqibatini ko‘rish uchun?",
                tafsir: "O‘tgan ummatlarning halokati va ibrat olish haqida.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 48,
            name: "Al-Fath",
            arabicName: "الفتح",
            meaning: "Fath",
            ayahCount: 29,
            place: "Madina",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "إِنَّا فَتَحْنَا لَكَ فَتْحًۭا مُّبِينًۭا",
                transcription: "Innaa fatahnaa laka fathan mubiinan",
                translation: "Biz senga aniq fath berdik",
                tafsir: "Hudaybiya sulhi va islomning g‘alabasi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "لِّيَغْفِرَ لَكَ ٱللَّهُ مَا تَقَدَّمَ مِن ذَنۢبِكَ",
                transcription: "Liyaghfira laka allaahu maa taqaddama min dhanbika",
                translation: "Alloh sening oldingi va keyingi gunohlaringni mag‘firat qilsin",
                tafsir: "Payg‘ambarning gunohlardan poklanishi va ulug‘lanishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "وَيَنصُرَكَ ٱللَّهُ نَصْرًا عَزِيزًۭا",
                transcription: "Wa yansuraka allaahu nasran 'aziizan",
                translation: "Alloh senga qudratli yordam bersin",
                tafsir: "Allohning payg‘ambarga qudratli yordami haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "هُوَ ٱلَّذِىٓ أَنزَلَ ٱلسَّكِينَةَ فِى قُلُوبِ ٱلْمُؤْمِنِينَ",
                transcription: "Huwa alladhii anzala as-sakiinata fii quluubi al-mu'miniin",
                translation: "U mo‘minlar qalbiga sakinat nozil qildi",
                tafsir: "Mo‘minlarning qalbiga xotirjamlik berilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "لِيُدْخِلَ ٱلْمُؤْمِنِينَ وَٱلْمُؤْمِنَٰتِ جَنَّٰتٍ",
                transcription: "Liyudkhila al-mu'miniina wal-mu'minaati jannaatin",
                translation: "Mo‘min va mo‘minalarni jannatlarga kiritish uchun",
                tafsir: "Mo‘minlarning jannat bilan mukofotlanishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "وَيُعَذِّبَ ٱلْمُنَٰفِقِينَ وَٱلْمُنَٰفِقَٰتِ",
                transcription: "Wa yu'adhdhiba al-munaafiqiina wal-munaafiqaati",
                translation: "Munofiq va munofiqalarni azoblasin",
                tafsir: "Munofiqlarning yomon oqibati va jazo olishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَلِلَّهِ جُنُودُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
                transcription: "Wa lillahi junoodu as-samaawaati wal-ardi",
                translation: "Osmonlar va yerning lashkarlari Allohnikidir",
                tafsir: "Allohning koinotdagi qudrati va lashkarlari haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "إِنَّآ أَرْسَلْنَٰكَ شَٰهِدًۭا وَمُبَشِّرًۭا وَنَذِيرًۭا",
                transcription: "Innaa arsalnaaka shaahidan wa mubashshiran wa nadhiiran",
                translation: "Biz seni guvoh, xushxabar beruvchi va ogohlantiruvchi qilib yubordik",
                tafsir: "Payg‘ambarning risolatdagi rollari haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "لِّتُؤْمِنُوا۟ بِٱللَّهِ وَرَسُولِهِۦ وَتُعَزِّرُوهُ",
                transcription: "Litu'minuu billaahi wa rasuulihi wa tu'azziruuhu",
                translation: "Alloh va Rasuliga iymon keltiring va uni hurmat qiling",
                tafsir: "Mo‘minlarning Alloh va Rasuliga sadoqati haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "إِنَّ ٱلَّذِينَ يُبَايِعُونَكَ إِنَّمَا يُبَايِعُونَ ٱللَّهَ",
                transcription: "Inna alladhiina yubaayi'uunaka innamaa yubaayi'uuna allaaha",
                translation: "Senga bay’at qilganlar aslida Allohga bay’at qiladilar",
                tafsir: "Bay’atning Allohga sadoqat sifatida qabul qilinishi.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 49,
            name: "Al-Hujurat",
            arabicName: "الحجرات",
            meaning: "Xujralar",
            ayahCount: 18,
            place: "Madina",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تُقَدِّمُوا۟ بَيْنَ يَدَىِ ٱللَّهِ وَرَسُولِهِۦ",
                transcription: "Yaa ayyuhaa alladhiina aamanuu laa tuqaddimuu bayna yaday allaahi wa rasuulihi",
                translation: "Ey iymon keltirganlar, Alloh va Rasulidan oldinga o‘tmang",
                tafir: "Mo‘minlarning Alloh va Rasulga hurmati va itoati haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ لَا تَرْفَعُوٓا۟ أَصْوَٰتَكُمْ فَوْقَ صَوْتِ ٱلنَّبِىِّ",
                transcription: "Yaa ayyuhaa alladhiina aamanuu laa tarfa'uu aswaatakum fawqa sawti an-nabiyyi",
                translation: "Ey iymon keltirganlar, ovozingizni Nabiy ovozidan baland qilmang",
                tafir: "Payg‘ambarga hurmat ko‘rsatish va adab haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "إِنَّ ٱلَّذِينَ يَغُضُّونَ أَصْوَٰتَهُمْ عِندَ رَسُولِ ٱللَّهِ",
                transcription: "Inna alladhiina yaghudduuna aswaatahum 'inda rasuuli allaahi",
                translation: "Rasululloh huzurida ovozlarini pasaytirganlar",
                tafir: "Payg‘ambarga hurmat qilgan mo‘minlarning fazilati.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "إِنَّ ٱلَّذِينَ يُنَادُونَكَ مِن وَرَآءِ ٱلْحُجُرَٰتِ",
                transcription: "Inna alladhiina yunaaduunaka min waraa'i al-hujuraati",
                translation: "Seni xujralar ortidan chaqirganlar",
                tafir: "Payg‘ambarni noo‘rin chaqirishning adabsizligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "وَلَوْ أَنَّهُمْ صَبَرُوا۟ حَتَّىٰ تَخْرُجَ إِلَيْهِمْ",
                transcription: "Wa law annahum sabaruu hattaa takhruja ilayhim",
                translation: "Agar ular sen chiqquncha sabr qilsalar edi",
                tafir: "Mo‘minlarning sabr va adab bilan harakat qilishi kerakligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ إِن جَآءَكُمْ فَاسِقٌۢ بِنَبَإٍۢ",
                transcription: "Yaa ayyuhaa alladhiina aamanuu in jaa'akum faasiqun binaba'in",
                translation: "Ey iymon keltirganlar, agar bir fosiq xabar keltirsa",
                tafir: "Xabarlarning to‘g‘riligini tekshirish zarurligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٧",
                numberLatin: "7",
                arabic: "وَٱعْلَمُوٓا۟ أَنَّ فِيكُمْ رَسُولَ ٱللَّهِ",
                transcription: "Wa'lamuu anna fiikum rasuula allaahi",
                translation: "Bilinglarki, orangizda Rasululloh bor",
                tafir: "Payg‘ambarning mo‘minlar orasidagi muhim o‘rni.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٨",
                numberLatin: "8",
                arabic: "فَضْلًۭا مِّنَ ٱللَّهِ وَنِعْمَةًۭ",
                transcription: "Fadlan mina allaahi wa ni'matan",
                translation: "Allohning fazli va ne’mati sifatida",
                tafir: "Payg‘ambarning mavjudligi Allohning katta ne’mati ekanligi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٩",
                numberLatin: "9",
                arabic: "وَإِن طَآئِفَتَانِ مِّنَ ٱلْمُؤْمِنِينَ ٱقْتَتَلُوا۟",
                transcription: "Wa in taa'ifataani mina al-mu'miniina iqtataluu",
                translation: "Agar mo‘minlardan ikki guruh jang qilsa",
                tafir: "Mo‘minlar o‘rtasidagi nizolarni sulh bilan hal qilish haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "١٠",
                numberLatin: "10",
                arabic: "إِنَّمَا ٱلْمُؤْمِنُونَ إِخْوَةٌۭ فَأَصْلِحُوا۟ بَيْنَ أَخَوَيْكُمْ",
                transcription: "Innama al-mu'minuuna ikhwatun fa-aslihuu bayna akhawaykum",
                translation: "Mo‘minlar faqat birodardirlar, birodarlaringiz o‘rtasini isloh qiling",
                tafir: "Mo‘minlarning birodarlik rishtasi va tinchlik o‘rnatish.",
                copySymbol: "📋"
              }
            ]
          },
          {
            id: 50,
            name: "Qof",
            arabicName: "ق",
            meaning: "Qof",
            ayahCount: 45,
            place: "Makka",
            prelude: {
              bismillah: {
                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                transcription: "Bismillahir-Rahmanir-Rahiim",
                translation: "Mehribon va rahmli Alloh nomi bilan",
                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                copySymbol: "📋"
              }
            },
            ayahs: [
              {
                numberArabic: "١",
                numberLatin: "1",
                arabic: "ق ۚ وَٱلْقُرْءَانِ ٱلْمَجِيدِ",
                transcription: "Qaaf wal-qur'aani al-majiidi",
                translation: "Qof. Ulug‘vor Qur’onga qasam",
                tafsir: "Qur’onning ulug‘ligi va muqaddasligi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٢",
                numberLatin: "2",
                arabic: "بَلْ عَجِبُوٓا۟ أَن جَآءَهُم مُّنذِرٌۭ مِّنْهُمْ",
                transcription: "Bal 'ajibuu an jaa'ahum mundhirun minhum",
                translation: "Yo‘q, ular orasidan ogohlantiruvchi kelganiga hayron bo‘ldilar",
                tafsir: "Kofirlarning payg‘ambarga hayron qolishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٣",
                numberLatin: "3",
                arabic: "أَءِذَا مِتْنَا وَكُنَّا تُرَابًۭا ۖ ذَٰلِكَ رَجْعٌۢ بَعِيدٌۭ",
                transcription: "A-idhaa mitnaa wa kunnaa turaaban dhaalika raj'un ba'iidun",
                translation: "O‘lib, tuproq bo‘lganimizdan keyinmi? Bu uzoq qaytish",
                tafsir: "Kofirlarning tirilishni inkor qilishi haqida.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٤",
                numberLatin: "4",
                arabic: "قَدْ عَلِمْنَا مَا تَنقُصُ ٱلْأَرْضُ مِنْهُمْ",
                transcription: "Qad 'alimnaa maa tanqusu al-ardu minhum",
                translation: "Biz yer ulardan nimalarni kamaytirishini bildik",
                tafsir: "Allohning hamma narsani bilishi va tirilish imkoni.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٥",
                numberLatin: "5",
                arabic: "بَلْ كَذَّبُوا۟ بِٱلْحَقِّ لَمَّا جَآءَهُمْ",
                transcription: "Bal kadhdhabuu bil-haqqi lammaa jaa'ahum",
                translation: "Yo‘q, ular haq kelganda uni yolg‘on dedilar",
                tafsir: "Kofirlarning Qur’on va haqiqatni inkor qilishi.",
                copySymbol: "📋"
              },
              {
                numberArabic: "٦",
                numberLatin: "6",
                arabic: "أَفَلَمْ يَنظُرُوٓا۟ إِلَى ٱلسَّمَآءِ فَوْقَهُمْ كَيْفَ بَنَيْنَٰهَا",
                transcription: "Afalam yanzuruu ilaa as-samaa'i fawqahum kayfa banaynaahaa",
                translation: "Ular yuqoridagi osmonni ko‘rmadilarmi, uni qanday qurdik?",
                tafsir: "Allohning osmonni muhkam va bezakli yaratganligi haqida.",
                copySymbol: "📋"
              },
                {
                  numberArabic: "٧",
                  numberLatin: "7",
                  arabic: "وَٱلْأَرْضَ مَدَدْنَٰهَا وَأَلْقَيْنَا فِيهَا رَوَٰسِىَ",
                  transcription: "Wal-arda madadnaahaa wa alqaynaa fiihaa rawaasiya",
                  translation: "Yerni yoydik va unda tog‘larni joylashtirdik",
                  tafsir: "Allohning yerni keng va mustahkam qilgani va hayot uchun jonzotlar yaratgani.",
                  copySymbol: "📋"
                },
                {
                  numberArabic: "٨",
                  numberLatin: "8",
                  arabic: "تَبْصِرَةًۭ وَذِكْرَىٰ لِكُلِّ عَبْدٍۢ مُّنِيبٍۢ",
                  transcription: "Tabsiratan wa dhikraa likulli 'abdin muniibin",
                  translation: "Har bir inobat qiluvchi qul uchun basirat va eslatma",
                  tafsir: "Allohning yaratilishdagi alomatlari mo‘minlar uchun o‘git ekanligi.",
                  copySymbol: "📋"
                },
                {
                  numberArabic: "٩",
                  numberLatin: "9",
                  arabic: "وَنَزَّلْنَا مِنَ ٱلسَّمَآءِ مَآءًۭ مُّبَٰرَكًۭا",
                  transcription: "Wa nazzalnaa mina as-samaa'i maa'an mubaarakan",
                  translation: "Osmondan muborak suv nozil qildik",
                  tafsir: "Allohning yomg‘ir orqali yerni jonlantirishi va ne’matlar bergani.",
                  copySymbol: "📋"
                },
                {
                  numberArabic: "١٠",
                  numberLatin: "10",
                  arabic: "وَٱلنَّخْلَ بَاسِقَٰتٍۢ لَّهَا طَلْعٌۭ نَّضِيدٌۭ",
                  transcription: "Wan-nakhla baasiqaatin lahaa tal'un nadiidun",
                  translation: "Baland xurmolarni, ularda yaxshi mevalar bilan",
                  tafsir: "Allohning xurmo daraxtlari va mevalarni rizq sifatida yaratgani.",
                  copySymbol: "📋"
                }
              ]
            },
          
            {
                id: 51,
                name: "Az-Zariyat",
                arabicName: "الذاريات",
                meaning: "Sochuvchilar",
                ayahCount: 60,
                place: "Makka",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "وَٱلذَّٰرِيَٰتِ ذَرْوًۭا",
                    transcription: "Wal-dhaariyaati dharwan",
                    translation: "Sochuvchi shamollar bilan qasam",
                    tafsir: "Allohning tabiatdagi qudrati va shamollarning harakati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "فَٱلْحَٰمِلَٰتِ وِقْرًۭا",
                    transcription: "Fal-haamilaati wiqran",
                    translation: "Yuk ko‘taruvchilar bilan qasam",
                    tafsir: "Bulutlarning yomg‘ir kabi og‘ir yuklarni ko‘tarishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "فَٱلْجَٰرِيَٰتِ يُسْرًۭا",
                    transcription: "Fal-jaariyaati yusran",
                    translation: "Oson yuguruvchilar bilan qasam",
                    tafsir: "Kemalar yoki suvda oqib yuruvchi narsalar haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "فَٱلْمُقَسِّمَٰتِ أَمْرًا",
                    transcription: "Fal-muqassimaati amran",
                    translation: "Ishlarni taqsim qiluvchilar bilan qasam",
                    tafsir: "Farishtalarning Allohning amrlarini taqsim qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "إِنَّمَا تُوعَدُونَ لَصَادِقٌۭ",
                    transcription: "Innamaa tuu'aduuna lasaadiqun",
                    translation: "Sizga va’da qilingan narsa albatta haqdir",
                    tafir: "Qiyomat va oxiratning haqiqat ekanligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "وَإِنَّ ٱلدِّينَ لَوَٰقِعٌۭ",
                    transcription: "Wa inna ad-diina lawaaqi'un",
                    translation: "Albatta hisob-kitob ro‘y beradi",
                    tafir: "Qiyomatdagi hisob-kitobning muqarrarligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "وَٱلسَّمَآءِ ذَاتِ ٱلْحُبُكِ",
                    transcription: "Was-samaa'i dhaati al-hubuki",
                    translation: "Yo‘llari to‘qilgan osmon bilan qasam",
                    tafir: "Osmonning muhkam va chiroyli yaratilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "إِنَّكُمْ لَفِى قَوْلٍۢ مُّخْتَلِفٍۢ",
                    transcription: "Innakum lafii qawlin mukhtalifin",
                    translation: "Sizlar turlicha gaplarda ekansizlar",
                    tafir: "Kofirlarning Qur’on haqida turli xil noma’qul da’volari haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "يُؤْفَكُ عَنْهُ مَنْ أُفِكَ",
                    transcription: "Yu'faku 'anhu man ufika",
                    translation: "Undan adashgan kishi adashadi",
                    tafir: "Haqiqatdan yuz o‘girganlarning adashishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "قُتِلَ ٱلْخَرَّٰصُونَ",
                    transcription: "Qutila al-kharraasuuna",
                    translation: "Taxmin qiluvchilar halok bo‘lsin",
                    tafir: "Qur’onni yolg‘on deb taxmin qilgan kofirlarning oqibati haqida.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 52,
                name: "At-Tur",
                arabicName: "الطور",
                meaning: "Tur tog‘i",
                ayahCount: 49,
                place: "Makka",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "وَٱلطُّورِ",
                    transcription: "Wat-tuuri",
                    translation: "Tur tog‘i bilan qasam",
                    tafir: "Musa (a.s.) ga vahiy nozil bo‘lgan Tur tog‘i haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "وَكِتَٰبٍۢ مَّسْطُورٍۢ",
                    transcription: "Wa kitaabin mastuurin",
                    translation: "Yozilgan kitob bilan qasam",
                    tafir: "Qur’on yoki Lavhul Mahfuz haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "فِى رَقٍّۢ مَّنشُورٍۢ",
                    transcription: "Fii raqqin manshuurin",
                    translation: "Yoyilgan pergamentda",
                    tafir: "Kitobning ochiq va aniq ekanligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "وَٱلْبَيْتِ ٱلْمَعْمُورِ",
                    transcription: "Wal-bayti al-ma'muuri",
                    translation: "Ma’mur uy bilan qasam",
                    tafir: "Osmonlardagi farishtalar ibodat qiladigan Ka’ba haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "وَٱلسَّقْفِ ٱلْمَرْفُوعِ",
                    transcription: "Was-saqfi al-marfu'ui",
                    translation: "Baland qilingan tom bilan qasam",
                    tafir: "Osmonning muhkam va baland yaratilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "وَٱلْبَحْرِ ٱلْمَسْجُورِ",
                    transcription: "Wal-bahri al-masjuuri",
                    translation: "Yondirilgan dengiz bilan qasam",
                    tafir: "Dengizning qiyomatdagi holati yoki tabiiy qudrati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "إِنَّ عَذَابَ رَبِّكَ لَوَٰقِعٌۭ",
                    transcription: "Inna 'adhaaba rabbika lawaaqi'un",
                    translation: "Robbingning azobi albatta ro‘y beradi",
                    tafir: "Allohning azobining muqarrarligi haqida ogohlantirish.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "مَا لَهُۥ مِن دَافِعٍۢ",
                    transcription: "Maa lahu min daafi'in",
                    translation: "Uni hech kim daf qila olmaydi",
                    tafir: "Allohning azobidan qutulish imkonsizligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "يَوْمَ تَمُورُ ٱلسَّمَآءُ مَوْرًۭا",
                    transcription: "Yawma tamuuru as-samaa'u mawran",
                    translation: "Osmon larzaga keladigan kunda",
                    tafir: "Qiyomatdagi osmonning dahshatli holati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "وَتَسِيرُ ٱلْجِبَالُ سَيْرًۭا",
                    transcription: "Wa tasiiru al-jibaalu sayran",
                    translation: "Tog‘lar yuradigan kunda",
                    tafir: "Qiyomatda tog‘larning harakatlanishi va yo‘q bo‘lishi haqida.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 53,
                name: "An-Najm",
                arabicName: "النجم",
                meaning: "Yulduz",
                ayahCount: 62,
                place: "Makka",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "وَٱلنَّجْمِ إِذَا هَوَىٰ",
                    transcription: "Wan-najmi idhaa hawaa",
                    translation: "Yulduz botganida qasam",
                    tafir: "Yulduzlarning harakati va Allohning qudrati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "مَا ضَلَّ صَاحِبُكُمْ وَمَا غَوَىٰ",
                    transcription: "Maa dalla saahibukum wa maa ghawaa",
                    translation: "Do‘stingiz (Muhammad) adashmadi va yo‘ldan chiqmadi",
                    tafir: "Payg‘ambarning haqiqat yo‘lida ekanligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "وَمَا يَنطِقُ عَنِ ٱلْهَوَىٰٓ",
                    transcription: "Wa maa yantiqu 'ani al-hawaa",
                    translation: "U nafsdan gapirmaydi",
                    tafir: "Payg‘ambarning vahiy asosida gapirishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "إِنْ هُوَ إِلَّا وَحْىٌۭ يُوحَىٰ",
                    transcription: "In huwa illaa wahyun yuuhaa",
                    translation: "Bu faqat vahiy, u vahiy qilinadi",
                    tafir: "Qur’onning ilohiy vahiy ekanligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "عَلَّمَهُۥ شَدِيدُ ٱلْقُوَىٰ",
                    transcription: "‘Allamahu shadiidu al-quwaa",
                    translation: "Unga kuchli quvvat egasi o‘rgatdi",
                    tafir: "Jabroil (a.s.) orqali vahiy kelishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "ذُو مِرَّةٍۢ فَٱسْتَوَىٰ",
                    transcription: "Dhuu mirratin fa-istawaa",
                    translation: "Kuchli shakl egasi, so‘ng muvozanatlashdi",
                    tafir: "Jabroilning asl shaklda paydo bo‘lishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "وَهُوَ بِٱلْأُفُقِ ٱلْأَعْلَىٰ",
                    transcription: "Wa huwa bil-ufuqi al-a'laa",
                    translation: "U eng yuqori ufuqda edi",
                    tafir: "Payg‘ambarning Mi’rojda Jabroilni ko‘rishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "ثُمَّ دَنَا فَتَدَلَّىٰ",
                    transcription: "Thumma danaa fa-tadallaa",
                    translation: "So‘ng yaqinlashdi va pastga tushdi",
                    tafir: "Jabroilning Payg‘ambarga yaqinlashishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "فَكَانَ قَابَ قَوْسَيْنِ أَوْ أَدْنَىٰ",
                    transcription: "Fakaana qaaba qawsayni aw adnaa",
                    translation: "Ikki yoy masofasida yoki undan yaqinroq edi",
                    tafir: "Payg‘ambar va Jabroil o‘rtasidagi yaqinlik tasviri.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "فَأَوْحَىٰٓ إِلَىٰ عَبْدِهِۦ مَآ أَوْحَىٰ",
                    transcription: "Fa-awhaa ilaa 'abdihi maa awhaa",
                    translation: "U quliga vahiy qilgan narsani vahiy qildi",
                    tafir: "Allohning Payg‘ambarga vahiy yuborishi haqida.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 54,
                name: "Al-Qamar",
                arabicName: "القمر",
                meaning: "Oy",
                ayahCount: 55,
                place: "Makka",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "ٱقْتَرَبَتِ ٱلسَّاعَةُ وَٱنشَقَّ ٱلْقَمَرُ",
                    transcription: "Iqtarabati as-saa'atu wan-shaqqa al-qamaru",
                    translation: "Soat yaqinlashdi va oy yorildi",
                    tafir: "Qiyomatning yaqinligi va oyning yorilishi mo‘jizasi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "وَإِن يَرَوْا۟ آيَةًۭ يُعْرِضُواْ",
                    transcription: "Wa in yara aayatan yu'ridoo",
                    translation: "Agar biror alomat ko‘rsalar, yuz o‘giradilar",
                    tafir: "Kofirlarning mo‘jizalarni inkor qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "وَكَذَّبُواْ وَٱتَّبَعُوٓاْ أَهْوَآءَهُمْ",
                    transcription: "Wa kadhdhabu wat-taba'oo ahwaa'ahum",
                    translation: "Ular yolg‘on dedilar va nafslariga ergashdilar",
                    tafir: "Kofirlarning haqiqatni rad qilib, nafsiga ergashishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "وَلَقَدْ جَآءَهُم مِّنَ ٱلْأَنۢبَآءِ مَا فِيهِ مُزْدَجَرٌۭ",
                    transcription: "Wa laqad jaa'ahum mina al-anbaa'i maa fiihi muzdajarun",
                    translation: "Ularga ogohlantiruvchi xabarlar keldi",
                    tafir: "O‘tgan qavmlarning xabarlari orqali ogohlantirish.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "حِكْمَةٌۭ بَٰلِغَةٌۭ فَمَا تُغْنِ ٱلنُّذُرُ",
                    transcription: "Hikmatun baalighatun fama tughni an-nudhuru",
                    translation: "Yetuk hikmat, lekin ogohlantirishlar foyda bermadi",
                    tafir: "Qur’onning hikmati va kofirlarning undan foyda olmasligi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "فَتَوَلَّ عَنْهُمْ ۘ يَوْمَ يَدْعُ ٱلدَّاعِ إِلَىٰ شَىْءٍۢ نُّكُرٍۢ",
                    transcription: "Fatawalla 'anhum yawma yad'u ad-daa'i ilaa shay'in nukurin",
                    translation: "Ulardan yuz o‘gir, da’vat qiluvchi yomon narsaga chaqiradigan kunda",
                    tafir: "Qiyomatdagi da’vat va kofirlarning oqibati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "خُشَّعًا أَبْصَٰرُهُمْ يَخْرُجُونَ مِنَ ٱلْأَجْدَاثِ",
                    transcription: "Khushsha'an absaaruhum yakhrujuuna mina al-ajdaathi",
                    translation: "Ko‘zlari xoru bo‘lib, qabrlardan chiqadilar",
                    tafir: "Qiyomatda odamlarning qabrdan chiqish holati tasviri.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "مُهْطِعِينَ إِلَى ٱلدَّاعِ يَقُولُ ٱلْكَٰفِرُونَ هَٰذَا يَوْمٌ عَسِرٌۭ",
                    transcription: "Muhti'iina ilaa ad-daa'i yaquulu al-kaafiruuna haadhaa yawmun 'asirun",
                    translation: "Da’vat qiluvchiga shoshiladilar, kofirlar: 'Bu qiyin kun' deydilar",
                    tafir: "Kofirlarning qiyomatdagi dahshatli holati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "كَذَّبَتْ قَبْلَهُمْ قَوْمُ نُوحٍۢ",
                    transcription: "Kadhdhabat qablahum qawmu nuuhin",
                    translation: "Ulardan oldin Nuh qavmi yolg‘on dedi",
                    tafir: "Nuh qavmining payg‘ambarni inkor qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "فَكَذَّبُواْ عَبْدَنَا وَقَالُواْ مَجْنُونٌۭ",
                    transcription: "Fakadhdhabu 'abdanaa wa qaaluu majnuunun",
                    translation: "Qulimizni yolg‘on dedilar va 'jinnilik' dedilar",
                    tafir: "Nuh (a.s.) ni masxara qilgan qavmning holati.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 55,
                name: "Ar-Rahman",
                arabicName: "الرحمن",
                meaning: "Rahmon",
                ayahCount: 78,
                place: "Madina",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "ٱلرَّحْمَٰنُ",
                    transcription: "Ar-rahmaanu",
                    translation: "Rahmon",
                    tafir: "Allohning eng muhim sifatlaridan biri bo‘lgan rahmati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "عَلَّمَ ٱلْقُرْءَانَ",
                    transcription: "‘Allama al-qur'aana",
                    translation: "Qur’onni o‘rgatdi",
                    tafir: "Allohning insonlarga Qur’on orqali hidoyat bergani haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "خَلَقَ ٱلْإِنسَٰنَ",
                    transcription: "Khalaqa al-insaana",
                    translation: "Insonni yaratdi",
                    tafir: "Allohning insonni yaratgani va uning ulug‘ligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "عَلَّمَهُ ٱلْبَيَانَ",
                    transcription: "‘Allamahu al-bayaana",
                    translation: "Unga bayonni o‘rgatdi",
                    tafir: "Allohning insonga nutq va fikr qobiliyatini bergani.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "ٱلشَّمْسُ وَٱلْقَمَرُ بِحُسْبَانٍۢ",
                    transcription: "Ash-shamsu wal-qamaru bihusbaanin",
                    translation: "Quyosh va oy hisob bilan",
                    tafir: "Koinotdagi tartib va quyosh-oyning muayyan orbitada harakati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "وَٱلنَّجْمُ وَٱلشَّجَرُ يَسْجُدَانِ",
                    transcription: "Wan-najmu wash-shajaru yasjudaani",
                    translation: "Yulduz va daraxt sajda qiladilar",
                    tafir: "Tabiatdagi hamma narsa Allohga ibodat qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "وَٱلسَّمَآءَ رَفَعَهَا وَوَضَعَ ٱلْمِيزَانَ",
                    transcription: "Was-samaa'a rafa'ahaa wa wada'a al-miizaana",
                    translation: "Osmonni baland qildi va tarozuni qo‘ydi",
                    tafir: "Allohning osmonni muhkam qilgani va adolat tarozusi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "أَلَّا تَطْغَوْاْ فِى ٱلْمِيزَانِ",
                    transcription: "Allaa tatghaw fi al-miizaani",
                    translation: "Tarozuda haddan oshmang",
                    tafir: "Adolat va o‘lchovda to‘g‘ri bo‘lish haqida buyruq.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "وَأَقِيمُواْ ٱلْوَزْنَ بِٱلْقِسْطِ",
                    transcription: "Wa aqiimuu al-wazna bil-qisti",
                    translation: "Vaznni adolat bilan o‘lchang",
                    tafir: "Tijorat va o‘lchovda adolatli bo‘lish zarurligi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "وَٱلْأَرْضَ وَضَعَهَا لِلْأَنَامِ",
                    transcription: "Wal-arda wada'ahaa lil-anaami",
                    translation: "Yerni jonzotlar uchun qo‘ydi",
                    tafir: "Allohning yerni inson va boshqa jonzotlar uchun qulay qilgani.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 56,
                name: "Al-Waqi‘a",
                arabicName: "الواقعة",
                meaning: "Voqea",
                ayahCount: 96,
                place: "Makka",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "إِذَا وَقَعَتِ ٱلْوَاقِعَةُ",
                    transcription: "Idhaa waqati al-waaqi'atu",
                    translation: "Voqea ro‘y berganda",
                    tafsir: "Qiyomatning katta voqeasi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "لَيْسَ لِوَقْعَتِهَا كَاذِبَةٌۭ",
                    transcription: "Laysa liwaq'atihaa kaadhibatun",
                    translation: "Un ayda yolg‘on yo‘q",
                    tafsir: "Qiyamatning haqiqiy va muqarrar ekanligi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "خَافِضَةٌۭ رَّافِعَةٌۭ",
                    transcription: "Khaafidatun raafi'atun",
                    translation: "Past qiluvchi, baland qiluvchi",
                    tafsir: "Qiyamatda ba’zilarning past, ba’zilarning baland bo‘lishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "إِذَا رُجَّتِ ٱلْأَرْضُ رَجًّۭا",
                    transcription: "Idhaa rujjati al-ardu rajjan",
                    translation: "Yer qattiq silkinganda",
                    tafsir: "Qiyomatdagi yerning dahshatli silkinishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "وَبُسَّتِ ٱلْجِبَالُ بَسًّۭا",
                    transcription: "Wa bussati al-jibaalu bassan",
                    translation: "Tog‘lar maydalanganda",
                    tafsir: "Tog‘larning qiyomatda changga aylanishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "فَكَانَتْ هَبَآءًۭ مَّنبُثًۭا",
                    transcription: "Fakaana habaa'an manbuuthan",
                    translation: "Sochilgan chang bo‘lib ketganda",
                    tafsir: "Tog‘larning sochilib yo‘q bo‘lishi tasviri.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "وَكُنتُمْ أَزْوَٰجًۭا ثَلَٰثَةًۭ",
                    transcription: "Wa kuntum azwaajan thalaathatan",
                    translation: "Sizlar uch guruh bo‘lasiz",
                    tafsir: "Qiyamatdagi odamlarning uch guruhga bo‘linishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "فَأَصْحَٰبُ ٱلْمَيْمَنَةِ مَآ أَصْحَٰبُ ٱلْمَيْمَنَةِ",
                    transcription: "Fa-ashaabu al-maymanati maa ashaabu al-maymanati",
                    translation: "O‘ng taraf egalari, o‘ng taraf egalari nimalar!",
                    tafsir: "Jannatga kiruvchi baxtiyorlar haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "وَأَصْحَٰبُ ٱلْمَشْـَٔمَةِ مَآ أَصْحَٰبُ ٱلْمَشْـَٔمَةِ",
                    transcription: "Wa ashaabu al-mash'amati maa ashaabu al-mash'amati",
                    translation: "Chap taraf egalari, chap taraf egalari nimalar!",
                    tafsir: "Do‘zaxga kiruvchi baxtsizlar haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "وَٱلسَّٰبِقُونَ ٱلسَّٰبِقُونَ",
                    transcription: "Was-saabiquuna as-saabiquuna",
                    translation: "Oldinga o‘tganlar, oldinga o‘tganlar",
                    tafsir: "Iymonda va amalda eng oldinda bo‘lganlar haqida.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 57,
                name: "Al-Hadid",
                arabicName: "الحديد",
                meaning: "Temir",
                ayahCount: 29,
                place: "Madina",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
                    transcription: "Sabbaha lillahi maa fi as-samaawaati wal-ardi",
                    translation: "Osmonlar va yerdagi hamma narsa Allohni tasbih qiladi",
                    tafsir: "Koinotning Allohga ibodat qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "لَهُۥ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
                    transcription: "Lahu mulku as-samaawaati wal-ardi",
                    translation: "Osmonlar va yerning mulki Unikidir",
                    tafsir: "Allohning koinotdagi yagona hokimiyati haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "هُوَ ٱلْأَوَّلُ وَٱلْءَاخِرُ وَٱلظَّٰهِرُ وَٱلْبَاطِنُ",
                    transcription: "Huwa al-awwalu wal-aakhiru wadh-dhaahiru wal-baatinu",
                    translation: "U birinchi va oxirgi, zohir va botindir",
                    tafsir: "Allohning abadiy va har tomonlama kamil sifatlari.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "هُوَ ٱلَّذِى خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ فِى سِتَّةِ أَيَّامٍۢ",
                    transcription: "Huwa alladhii khalaqa as-samaawaati wal-arda fii sittati ayyaamin",
                    translation: "U osmonlar va yerni olti kunda yaratdi",
                    tafsir: "Allohning koinotni olti kunda yaratgani haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "لَهُۥ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ وَإِلَى ٱللَّهِ تُرْجَعُ ٱلْأُمُورُ",
                    transcription: "Lahu mulku as-samaawaati wal-ardi wa ilaa allaahi turja'u al-umuuru",
                    translation: "Osmonlar va yerning mulki Unikidir, ishlar Allohga qaytadi",
                    tafsir: "Allohning hokimiyati va barcha ishlarning yakuni haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "يُولِجُ ٱلَّيْلَ فِى ٱلنَّهَارِ وَيُولِجُ ٱلنَّهَارَ فِى ٱلَّيْلِ",
                    transcription: "Yuuliju al-layla fi an-nahaari wa yuuliju an-nahaara fi al-layli",
                    translation: "Kechani kunduzga, kunduzni kechaga kiritadi",
                    tafsir: "Allohning vaqt va tabiatni boshqarishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "ءَامِنُواْ بِٱللَّهِ وَرَسُولِهِۦ وَأَنفِقُواْ مِمَّا جَعَلَكُم مُّسْتَخْلَفِينَ فِيهِ",
                    transcription: "Aaminuu billaahi wa rasuulihi wa anfiqoo mimmaa ja'alakum mustakhlafiina fiihi",
                    translation: "Allohga va Rasuliga iymon keltiring va sizga berilgan narsadan infaq qiling",
                    tafsir: "Iymon va infaqning muhimligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "وَمَا لَكُمْ لَا تُؤْمِنُونَ بِٱللَّهِ",
                    transcription: "Wa maa lakum laa tu'minuuna billaahi",
                    translation: "Sizlarga nima bo‘ldi, Allohga iymon keltirmaysizlar?",
                    tafsir: "Kofirlarning iymon keltirmasligi haqida savol.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "هُوَ ٱلَّذِى يُنَزِّلُ عَلَىٰ عَبْدِهِۦٓ ءَايَٰتٍۢ بَيِّنَٰتٍۢ",
                    transcription: "Huwa alladhii yunazzilu 'alaa 'abdihi aayaatin bayyinaatin",
                    translation: "U quliga aniq oyatlarni nozil qiladi",
                    tafsir: "Allohning Qur’onni vahiy sifatida yuborishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "وَمَا لَكُمْ أَلَّا تُنفِقُواْ فِى سَبِيلِ ٱللَّهِ",
                    transcription: "Wa maa lakum allaa tunfiqoo fii sabiili allaahi",
                    translation: "Sizlarga nima bo‘ldi, Alloh yo‘lida infaq qilmaysizlar?",
                    tafsir: "Alloh yo‘lida mol sarflashning muhimligi.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 58,
                name: "Al-Mujadala",
                arabicName: "المجادلة",
                meaning: "Mujodala",
                ayahCount: 22,
                place: "Madina",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "قَدْ سَمِعَ ٱللَّهُ قَوْلَ ٱلَّتِى تُجَٰدِلُكَ فِى زَوْجِهَا",
                    transcription: "Qad sami'a allaahu qawla allatii tujaadiluka fii zawjihaa",
                    translation: "Alloh eriga nisbatan sen bilan mujodala qilgan ayolning so‘zini eshitdi",
                    tafsir: "Xuwayla binti Sa’laba va zihaar masalasi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "ٱلَّذِينَ يُظَٰهِرُونَ مِنكُم مِّن نِّسَآئِهِم مَّا هُنَّ أُمَّهَٰتِهِمْ",
                    transcription: "Alladhiina yudhaahiruuna minkum min nisaa'ihim maa hunna ummahaatihim",
                    translation: "Sizlardan xotinlariga zihaar qilganlar, ular onalari emas",
                    tafsir: "Zihaar amalining noto‘g‘riligi va uning hukmi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "وَٱلَّذِينَ يُظَٰهِرُونَ مِن نِّسَآئِهِمْ ثُمَّ يَعُودُونَ لِمَا قَالُواْ",
                    transcription: "Walladhiina yudhaahiruuna min nisaa'ihim thumma ya'uuduuna lima qaaluu",
                    translation: "Xotinlariga zihaar qilib, keyin qaytganlar",
                    tafsir: "Zihaar qilganlarning kafforati va qaytish yo‘li.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "فَمَن لَّمْ يَجِدْ فَصِيَامُ شَهْرَيْنِ مُتَتَابِعَيْنِ",
                    transcription: "Faman lam yajid fasiyaamu shahrayni mutataabi'ayni",
                    translation: "Kim topa olmasa, ikki oy ketma-ket ro‘za tutsin",
                    tafsir: "Zihaar kafforati sifatida ro‘za tutish hukmi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "إِنَّ ٱلَّذِينَ يُحَآدُّونَ ٱللَّهَ وَرَسُولَهُۥ",
                    transcription: "Inna alladhiina yuhaadduuna allaaha wa rasuulahu",
                    translation: "Alloh va Rasuliga qarshi chiqqanlar",
                    tafsir: "Allohning hukmlariga qarshilik qilganlarning oqibati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "يَوْمَ يَبْعَثُهُمُ ٱللَّهُ جَمِيعًۭا",
                    transcription: "Yawma yab'athuhumu allaahu jamii'an",
                    translation: "Alloh ularni hammasini tiriltiradigan kunda",
                    tafsir: "Qiyomatda barchaning hisob-kitobi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "أَلَمْ تَرَ أَنَّ ٱللَّهَ يَعْلَمُ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                    transcription: "Alam tara anna allaaha ya'lamu maa fi as-samaawaati wamaa fi al-ardi",
                    translation: "Alloh osmonlar va yerdagi narsalarni biladi, deb ko‘rmadingmi?",
                    tafsir: "Allohning hamma narsani biluvchi sifati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "يَعْلَمُ مَا تُسِرُّونَ وَمَا تُعْلِنُونَ",
                    transcription: "Ya'lamu maa tusirruuna wamaa tu'linuuna",
                    translation: "U yashirgan va oshkor qilgan narsalaringizni biladi",
                    tafsir: "Allohning yashirin va oshkor narsalarni bilishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ إِذَا تَنَٰجَيْتُمْ فَلَا تَتَنَٰجَوْاْ بِٱلْإِثْمِ",
                    transcription: "Yaa ayyuhaa alladhiina aamanuu idhaa tanaajaytum falaa tatanaajaw bil-ithmi",
                    translation: "Ey iymon keltirganlar, maxfiy suhbat qilsangiz, gunoh haqida suhbatlashmang",
                    tafsir: "Mo‘minlarning maxfiy suhbatda gunohdan saqlanishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "إِنَّمَا ٱلنَّجْوَىٰ مِنَ ٱلشَّيْطَٰنِ",
                    transcription: "Innama an-najwaa mina ash-shaytaani",
                    translation: "Maxfiy suhbat shaytondandir",
                    tafsir: "Yomon niyatli maxfiy suhbatlarning shaytondan kelishi.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 59,
                name: "Al-Hashr",
                arabicName: "الحشر",
                meaning: "Yig‘ilish",
                ayahCount: 24,
                place: "Madina",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                    transcription: "Sabbaha lillahi maa fi as-samaawaati wamaa fi al-ardi",
                    translation: "Osmonlar va yerdagi hamma narsa Allohni tasbih qiladi",
                    tafsir: "Koinotning Allohga ibodat qilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "هُوَ ٱلَّذِىٓ أَخْرَجَ ٱلَّذِينَ كَفَرُواْ مِنْ أَهْلِ ٱلْكِتَٰبِ",
                    transcription: "Huwa alladhii akhraja alladhiina kafaroo min ahli al-kitaabi",
                    translation: "U ahli kitobdan kofir bo‘lganlarni chiqarib yubordi",
                    tafsir: "Banu Nazir yahudiylarining Madinadan chiqarilishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "وَلَوْلَآ أَن كَتَبَ ٱللَّهُ عَلَيْهِمُ ٱلْجَلَآءَ",
                    transcription: "Wa lawlaa an kataba allaahu 'alayhimu al-jalaa'a",
                    translation: "Agar Alloh ularga surgunni yozmaganida",
                    tafsir: "Allohning kofirlarga surgun yoki azob yozgani haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "ذَٰلِكَ بِأَنَّهُمْ شَآقُّواْ ٱللَّهَ وَرَسُولَهُۥ",
                    transcription: "Dhaalika bi-annahum shaaqquu allaaha wa rasuulahu",
                    translation: "Chunki ular Alloh va Rasuliga qarshi chiqdilar",
                    tafsir: "Kofirlarning Allohga qarshilik qilganliklari uchun jazosi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "مَا قَطَعْتُم مِّن لِّينَةٍ أَوْ تَرَكْتُمُوهَا قَآئِمَةً",
                    transcription: "Maa qata'tum min liinatin aw taraktumuhaa qaa'imatan",
                    translation: "Xurmo daraxtlarini kesdingizmi yoki tik qoldirdingizmi",
                    tafsir: "Banu Nazir xurmo bog‘larining kesilishi va Allohning ruxsati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "وَمَآ أَفَآءَ ٱللَّهُ عَلَىٰ رَسُولِهِۦ مِنْهُمْ",
                    transcription: "Wa maa afaa'a allaahu 'alaa rasuulihi minhum",
                    translation: "Alloh Rasuliga ulardan fey bergani",
                    tafsir: "Fey (jang qilmasdan olingan mol-mulk) haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "مَآ أَفَآءَ ٱللَّهُ عَلَىٰ رَسُولِهِۦ مِنْ أَهْلِ ٱلْقُرَىٰ",
                    transcription: "Maa afaa'a allaahu 'alaa rasuulihi min ahli al-quraa",
                    translation: "Alloh Rasuliga qishloq ahlining mol-mulkidan fey bergani",
                    tafsir: "Fey molining taqsimoti va kimlarga berilishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "لِلْفُقَرَآءِ ٱلْمُهَٰجِرِينَ",
                    transcription: "Lil-fuqaraa'i al-muhaajiriina",
                    translation: "Kambag‘al muhojirlarga",
                    tafsir: "Fey molining muhojirlarga taqsim qilinishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "وَٱلَّذِينَ تَبَوَّءُو ٱلدَّارَ وَٱلْإِيمَٰنَ مِن قَبْلِهِمْ",
                    transcription: "Walladhiina tabawwa'uu ad-daara wal-iimaana min qablihim",
                    translation: "Oldinroq uylarida va iymonda mustahkam bo‘lganlar",
                    tafsir: "Ansorlarning muhojirlarni qo‘llab-quvvatlashi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "وَٱلَّذِينَ جَآءُو مِنۢ بَعْدِهِمْ يَقُولُونَ رَبَّنَا ٱغْفِرْ لَنَا",
                    transcription: "Walladhiina jaa'oo min ba'dihim yaquuluuna rabbanaa ighfir lanaa",
                    translation: "Ulardan keyin kelganlar: 'Robbimiz, bizni mag‘firat qil' deydilar",
                    tafsir: "Keyingi avlod mo‘minlarning duosi va iymoni.",
                    copySymbol: "📋"
                  }
                ]
              },
              {
                id: 60,
                name: "Al-Mumtahana",
                arabicName: "الممتحنة",
                meaning: "Sinovdan o‘tkazilgan",
                ayahCount: 13,
                place: "Madina",
                prelude: {
                  bismillah: {
                    arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                    transcription: "Bismillahir-Rahmanir-Rahiim",
                    translation: "Mehribon va rahmli Alloh nomi bilan",
                    tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                    copySymbol: "📋"
                  }
                },
                ayahs: [
                  {
                    numberArabic: "١",
                    numberLatin: "1",
                    arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ لَا تَتَّخِذُوٓاْ عَدُوِّى وَعَدُوَّكُمْ أَوْلِيَآءَ",
                    transcription: "Yaa ayyuhaa alladhiina aamanuu laa tattakhidhuu 'aduwwii wa 'aduwwakum awliyaa'a",
                    translation: "Ey iymon keltirganlar, mening va sizning dushmanlaringizni do‘st tutmang",
                    tafsir: "Kofirlarni do‘st tutishning man etilishi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٢",
                    numberLatin: "2",
                    arabic: "إِن يَثْقَفُوكُمْ يَكُونُواْ لَكُمْ أَعْدَآءًۭ",
                    transcription: "In yathqafuukum yakuunuu lakum a'daa'an",
                    translation: "Agar sizlarni topsalar, sizga dushman bo‘ladilar",
                    tafsir: "Kofirlarning mo‘minlarga dushmanligi haqida ogohlantirish.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٣",
                    numberLatin: "3",
                    arabic: "لَن تَنفَعَكُمْ أَرْحَامُكُمْ وَلَآ أَوْلَٰدُكُمْ",
                    transcription: "Lan tanfa'akum arhaamukum wa laa awlaadukum",
                    translation: "Qarindoshlaringiz va farzandlaringiz sizga foyda bermaydi",
                    tafsir: "Qiyomatda qarindoshlik foyda bermasligi haqida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٤",
                    numberLatin: "4",
                    arabic: "قَدْ كَانَتْ لَكُمْ أُسْوَةٌ حَسَنَةٌۭ فِىٓ إِبْرَٰهِيمَ",
                    transcription: "Qad kaanat lakum uswatun hasanatun fii ibraahiima",
                    translation: "Ibrohimda sizlar uchun yaxshi o‘rnak bor edi",
                    tafsir: "Ibrohim (a.s.) ning kofirlardan uzilishi o‘rnak sifatida.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٥",
                    numberLatin: "5",
                    arabic: "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةًۭ لِّلَّذِينَ كَفَرُواْ",
                    transcription: "Rabbanaa laa taj'alnaa fitnatan lilladhiina kafaruu",
                    translation: "Robbimiz, bizni kofirlar uchun fitna qilma",
                    tafsir: "Ibrohimning duosi va mo‘minlarning sinovdan himoyasi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٦",
                    numberLatin: "6",
                    arabic: "لَقَدْ كَانَ لَكُمْ فِيهِمْ أُسْوَةٌ حَسَنَةٌۭ",
                    transcription: "Laqad kaana lakum fiihim uswatun hasanatun",
                    translation: "Ularda sizlar uchun yaxshi o‘rnak bor edi",
                    tafsir: "Ibrohim va uning tarafdorlarining o‘rnak bo‘lishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٧",
                    numberLatin: "7",
                    arabic: "عَسَى ٱللَّهُ أَن يَجْعَلَ بَيْنَكُمْ وَبَيْنَ ٱلَّذِينَ عَادَيْتُم مِّنْهُم مَّوَدَّةًۭ",
                    transcription: "‘Asaa allaahu an yaj'ala baynakum wa bayna alladhiina 'aadaytum minhum mawaddatan",
                    translation: "Alloh sizlar va dushmanlaringiz o‘rtasida do‘stlik qilishi mumkin",
                    tafsir: "Allohning dushmanlarni do‘stga aylantirish qudrati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٨",
                    numberLatin: "8",
                    arabic: "لَا يَنْهَىٰكُمُ ٱللَّهُ عَنِ ٱلَّذِينَ لَمْ يُقَٰتِلُوكُمْ فِى ٱلدِّينِ",
                    transcription: "Laa yanhaakumu allaahu 'ani alladhiina lam yuqaatiluukum fi ad-diini",
                    translation: "Alloh sizlarni dinda jang qilmaganlar bilan yaxshilik qilishdan man qilmaydi",
                    tafsir: "Tinchlikdagi kofirlarga yaxshilik qilish ruxsati.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "٩",
                    numberLatin: "9",
                    arabic: "إِنَّمَا يَنْهَىٰكُمُ ٱللَّهُ عَنِ ٱلَّذِينَ قَٰتَلُوكُمْ فِى ٱلدِّينِ",
                    transcription: "Innamaa yanhaakumu allaahu 'ani alladhiina qaataluukum fi ad-diini",
                    translation: "Alloh sizlarni dinda jang qilganlar bilan do‘stlashishdan man qiladi",
                    tafsir: "Dushman kofirlarni do‘st tutishning man etilishi.",
                    copySymbol: "📋"
                  },
                  {
                    numberArabic: "١٠",
                    numberLatin: "10",
                    arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ إِذَا جَآءَكُمُ ٱلْمُؤْمِنَٰتُ مُهَٰجِرَٰتٍۢ",
                    transcription: "Yaa ayyuhaa alladhiina aamanuu idhaa jaa'akumu al-mu'minaatu muhaajiraatin",
                    translation: "Ey iymon keltirganlar, muhojir mo‘mina ayollar kelganda",
                    tafsir: "Mo‘mina ayollarning iymonini sinash va qabul qilish.",
                    copySymbol: "📋"
                  }
                ]
              },
              
                {
                  id: 61,
                  name: "As-Saff",
                  arabicName: "الصف",
                  meaning: "Saf",
                  ayahCount: 14,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "سَبَّحَ لِلَّهِ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                      transcription: "Sabbaha lillahi maa fi as-samaawaati wamaa fi al-ardi",
                      translation: "Osmonlar va yerdagi hamma narsa Allohni tasbih qiladi",
                      tafsir: "Koinotning Allohga ibodat qilishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ لِمَ تَقُولُونَ مَا لَا تَفْعَلُونَ",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu lima taquuluuna maa laa taf'aluuna",
                      translation: "Ey iymon keltirganlar, nega qilmaydigan narsani aytasizlar?",
                      tafsir: "Mo‘minlarning so‘zi va amali bir bo‘lishi kerakligi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "كَبُرَ مَقْتًا عِندَ ٱللَّهِ أَن تَقُولُواْ مَا لَا تَفْعَلُونَ",
                      transcription: "Kabura maqtan 'inda allaahi an taquuluu maa laa taf'aluuna",
                      translation: "Qilmaydigan narsani aytish Alloh nazdida katta gunohdir",
                      tafsir: "So‘z va amalda ikkiyuzlamachilikning og‘irligi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "إِنَّ ٱللَّهَ يُحِبُّ ٱلَّذِينَ يُقَٰتِلُونَ فِى سَبِيلِهِۦ صَفًّۭا",
                      transcription: "Inna allaaha yuhibbu alladhiina yuqaatiluuna fii sabiilihi saffan",
                      translation: "Alloh O‘z yo‘lida saf tortib jang qilganlarni yaxshi ko‘radi",
                      tafsir: "Alloh yo‘lida birlashib kurashishning fazli haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "وَإِذْ قَالَ مُوسَىٰ لِقَوْمِهِۦ يَٰقَوْمِ لِمَ تُؤْذُونَنِى",
                      transcription: "Wa idh qaala muusaa liqawmihi yaa qawmi lima tu'dhuunanii",
                      translation: "Muso o‘z qavmiga: 'Nega meni qiynaysizlar?' dedi",
                      tafsir: "Muso (a.s.) va uning qavmining payg‘ambarga qarshiligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "وَإِذْ قَالَ عِيسَى ٱبْنُ مَرْيَمَ يَٰبَنِىٓ إِسْرَٰٓءِيلَ",
                      transcription: "Wa idh qaala 'iisaa ibnu maryama yaa banii israa'iila",
                      translation: "Iso ibn Maryam: 'Ey Isroil o‘g‘illari' dedi",
                      tafsir: "Iso (a.s.) ning o‘z qavmiga da’vati haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "وَلَقَدْ أَرْسَلْنَا نُوحًۭا وَإِبْرَٰهِيمَ",
                      transcription: "Walaqad arsalnaa nuuhan wa ibraahiima",
                      translation: "Biz Nuh va Ibrohimni yubordik",
                      tafsir: "Allohning payg‘ambarlar yuborishi va ularning da’vati.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ كُونُوٓاْ أَنصَارَ ٱللَّهِ",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu kuunuu ansaara allaahi",
                      translation: "Ey iymon keltirganlar, Allohning yordamchilari bo‘ling",
                      tafsir: "Mo‘minlarning Alloh diniga yordam berishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "إِنَّ ٱللَّهَ ٱشْتَرَىٰ مِنَ ٱلْمُؤْمِنِينَ أَنفُسَهُمْ وَأَمْوَٰلَهُم",
                      transcription: "Inna allaaha ishtaraa mina al-mu'miniina anfusahum wa amwaalahum",
                      translation: "Alloh mo‘minlardan jonlari va mollarini sotib oldi",
                      tafsir: "Mo‘minlarning jannat evaziga fidoyilik qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ هَلْ أَدُلُّكُمْ عَلَىٰ تِجَٰرَةٍۢ",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu hal adullukum 'alaa tijaaratin",
                      translation: "Ey iymon keltirganlar, sizlarga foydali savdo ko‘rsataymi?",
                      tafsir: "Alloh yo‘lida fidoyilik qilishning savobli savdo ekanligi.",
                      copySymbol: "📋"
                    }
                  ]
                },
                {
                  id: 62,
                  name: "Al-Jumu‘a",
                  arabicName: "الجمعة",
                  meaning: "Juma",
                  ayahCount: 11,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                      transcription: "Yusabbihu lillahi maa fi as-samaawaati wamaa fi al-ardi",
                      translation: "Osmonlar va yerdagi hamma narsa Allohni tasbih qiladi",
                      tafsir: "Koinotning Allohga ibodat qilishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "هُوَ ٱلَّذِى بَعَثَ فِى ٱلْأُمِّيِّينَ رَسُولًۭا",
                      transcription: "Huwa alladhii ba'atha fi al-ummiyyiina rasuulan",
                      translation: "U savodsizlar orasida Rasul yubordi",
                      tafsir: "Payg‘ambarning ummiy (savodsiz) qavmga yuborilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "وَءَاخَرِينَ مِنْهُمْ لَمَّا يَلْحَقُواْ بِهِمْ",
                      transcription: "Wa aakhariina minhum lammaa yalhaquu bihim",
                      translation: "Va ularga hali qo‘shilmagan boshqalarga",
                      tafsir: "Payg‘ambarning boshqa avlodlarga ham yuborilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "ذَٰلِكَ فَضْلُ ٱللَّهِ يُؤْتِيهِ مَن يَشَآءُ",
                      transcription: "Dhaalika fadlu allaahi yu'tiihi man yashaa'u",
                      translation: "Bu Allohning fazli, uni xohlagan kishiga beradi",
                      tafsir: "Allohning iymon va hidoyat in’omi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "مَثَلُ ٱلَّذِينَ حُمِّلُواْ ٱلتَّوْرَىٰةَ ثُمَّ لَمْ يَحْمِلُوهَا",
                      transcription: "Mathalu alladhiina hummiluu at-tawraata thumma lam yahmiluhaa",
                      translation: "Tavrot berilgan, lekin uni ko‘tarmaganlarning misoli",
                      tafsir: "Yahudiylarning Tavrotga amal qilmasligi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "قُلْ يَٰٓأَهْلَ ٱلْكِتَٰبِ لَسْتُمْ عَلَىٰ شَىْءٍ",
                      transcription: "Qul yaa ahla al-kitaabi lastum 'alaa shay'in",
                      translation: "Ey ahli kitob, sizlar hech narsada emassizlar",
                      tafsir: "Ahli kitobning haqiqatdan yuz o‘girishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "وَمَنْ أَظْلَمُ مِمَّن مَّنَعَ مَسَٰجِدَ ٱللَّهِ",
                      transcription: "Wa man adhlamu mimman mana'a masaajida allaahi",
                      translation: "Allohning masjidlarini man qilganlardan ko‘ra zolimroq kim?",
                      tafsir: "Masjidlarga ibodatdan to‘sishning og‘ir gunohi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "قُلْ إِنَّ ٱلْمَوْتَ ٱلَّذِى تَفِرُّونَ مِنْهُ فَإِنَّهُۥ مُلَٰقِيكُمْ",
                      transcription: "Qul inna al-mawta alladhii tafiruuna minhu fa-innahu mulaaqiikum",
                      translation: "O‘limdan qochsangiz ham, u sizni topadi",
                      tafsir: "O‘limning muqarrarligi va undan qochib bo‘lmasligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ إِذَا نُودِىَ لِلصَّلَوٰةِ مِن يَوْمِ ٱلْجُمُعَةِ",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu idhaa nuudiya lis-salaati min yawmi al-jumu'ati",
                      translation: "Ey iymon keltirganlar, juma kuni namozga chaqirilganda",
                      tafsir: "Juma namozining muhimligi va unga shoshilish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "فَإِذَا قُضِيَتِ ٱلصَّلَوٰةُ فَٱنتَشِرُواْ فِى ٱلْأَرْضِ",
                      transcription: "Fa-idhaa qudiyati as-salaatu fantashiruu fi al-ardi",
                      translation: "Namoz tugagach, yerga tarqaling",
                      tafsir: "Juma namozidan keyin rizq izlashning ruxsati.",
                      copySymbol: "📋"
                    }
                  ]
                },
                {
                  id: 63,
                  name: "Al-Munafiqun",
                  arabicName: "المنافقون",
                  meaning: "Munofiqlar",
                  ayahCount: 11,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "إِذَا جَآءَكَ ٱلْمُنَٰفِقُونَ قَالُواْ نَشْهَدُ إِنَّكَ لَرَسُولُ ٱللَّهِ",
                      transcription: "Idhaa jaa'aka al-munaafiquuna qaaluu nashhadu innaka larasuulu allaahi",
                      translation: "Munofiqlar senga kelib: 'Sen Allohning Rasulisan' dedilar",
                      tafsir: "Munofiqlarning so‘zda iymon ko‘rsatib, yurakda inkor qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "ٱتَّخَذُوٓاْ أَيْمَٰنَهُمْ جُنَّةًۭ",
                      transcription: "Ittakhadhuu aymaanahum junnatan",
                      translation: "Ular qasamlarini qalqon qildilar",
                      tafsir: "Munofiqlarning yolg‘on qasam bilan o‘zlarini himoya qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "ذَٰلِكَ بِأَنَّهُمْ ءَامَنُواْ ثُمَّ كَفَرُواْ",
                      transcription: "Dhaalika bi-annahum aamanuu thumma kafaru",
                      translation: "Chunki ular iymon keltirdilar, so‘ng kofir bo‘ldilar",
                      tafsir: "Munofiqlarning iymondan keyin kufrga qaytishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "وَإِذَا رَأَيْتَهُمْ تُعْجِبُكَ أَجْسَامُهُمْ",
                      transcription: "Wa idhaa ra'aytahum tu'jibuk ajsaamuhum",
                      translation: "Ularni ko‘rsang, tashqi ko‘rinishlari senga yoqadi",
                      tafsir: "Munofiqlarning tashqi ko‘rinishi bilan ichki yolg‘onchiligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "وَإِذَا قِيلَ لَهُمْ تَعَالَوْاْ يَسْتَغْفِرْ لَكُمْ رَسُولُ ٱللَّهِ",
                      transcription: "Wa idhaa qiila lahum ta'aalaw yastaghfir lakum rasuulu allaahi",
                      translation: "Ularga: 'Keling, Rasul siz uchun mag‘firat so‘rasin' deyilsa",
                      tafsir: "Munofiqlarning mag‘firat so‘rashdan bosh tortishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "سَوَآءٌ عَلَيْهِمْ أَسْتَغْفَرْتَ لَهُمْ أَمْ لَمْ تَسْتَغْفِرْ",
                      transcription: "Sawa'un 'alayhim astaghfarta lahum am lam tastaghfir",
                      translation: "Ularga mag‘firat so‘rasang ham, so‘ramasang ham baribir",
                      tafsir: "Munofiqlarning mag‘firatga loyiq emasligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "هُمُ ٱلَّذِينَ يَقُولُونَ لَا تُنفِقُواْ عَلَىٰ مَنْ عِندَ رَسُولِ ٱللَّهِ",
                      transcription: "Humu alladhiina yaquuluuna laa tunfiqoo 'alaa man 'inda rasuuli allaahi",
                      translation: "Ular: 'Rasul yonidagilarga infaq qilmang' dedilar",
                      tafsir: "Munofiqlarning mo‘minlarga yordamni man qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "يَقُولُونَ لَئِن رَّجَعْنَآ إِلَى ٱلْمَدِينَةِ",
                      transcription: "Yaquuluuna la'in la'in raja'naa ila al-madiinati",
                      translation: "Ular: 'Madinaga qaytsak', dedilar",
                      tafsir: "Munofiqlarning Madinada hokimiyat da’vo qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱتَّقُواْ ٱللَّهَ",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu ittaquu allaaha",
                      translation: "Ey iymon keltirganlar, Allohdan qo‘rqing",
                      tafsir: "Mo‘minlarga taqvo va Allohdan qo‘rqish buyuriladi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "وَلَا تَعْجَبْكَ أَمْوَٰلُهُمْ وَأَوْلَٰدُهُمْ",
                      transcription: "Wa laa ta'jabka amwaaluhum wa awlaaduhum",
                      translation: "Ularning mol-mulki va farzandlari seni hayron qilmasin",
                      tafsir: "Dunyo ne’matlarining o‘tkinchi ekanligi haqida.",
                      copySymbol: "📋"
                    }
                  ]
                },
                {
                  id: 64,
                  name: "At-Taghabun",
                  arabicName: "التغابن",
                  meaning: "Aldanish",
                  ayahCount: 18,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "يُسَبِّحُ لِلَّهِ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ",
                      transcription: "Yusabbihu lillahi maa fi as-samaawaati wamaa fi al-ardi",
                      translation: "Osmonlar va yerdagi hamma narsa Allohni tasbih qiladi",
                      tafsir: "Koinotning Allohga ibodat qilishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "هُوَ ٱلَّذِي خَلَقَكُمْ فَمِنكُمْ كَافِرٌۭ وَمِنكُم مُّؤْمِنٌ",
                      transcription: "Huwa alladhii khalaqakum faminkum kaafirun waminkum mu'minun",
                      translation: "U sizlarni yaratdi, ba’zingiz kofir, ba’zingiz mo‘min",
                      tafsir: "Allohning insonlarni yaratgani va ularning ikki yo‘l tanlashi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "خَلَقَ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ بِٱلْحَقِّ",
                      transcription: "Khalaqa as-samaawaati wal-arda bil-haqqi",
                      translation: "Osmonlar va yerni haq bilan yaratdi",
                      tafsir: "Allohning koinotni haq va adolat bilan yaratgani.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "يَعْلَمُ مَا فِى ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
                      transcription: "Ya'lamu maa fi as-samaawaati wal-ardi",
                      translation: "Osmonlar va yerdagi narsalarni biladi",
                      tafsir: "Allohning hamma narsani biluvchi sifati.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "أَلَمْ يَأْتِكُمْ نَبَأُ ٱلَّذِينَ كَفَرُواْ مِن قَبْلُ",
                      transcription: "Alam ya'tikum naba'u alladhiina kafaru min qablu",
                      translation: "Sizga oldingi kofirlarning xabari kelmadimi?",
                      tafsir: "O‘tgan kofir qavmlarning oqibati haqida ogohlantirish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "ذَٰلِكَ بِأَنَّهُ كَانَتْ تَأْتِيهِمْ رُسُلُهُم بِٱلْبَيِّنَٰتِ",
                      transcription: "Dhaalika bi-annahu kaanat ta'tiihim rusuluhum bil-bayyinaati",
                      translation: "Chunki ularga rasullari aniq dalillar bilan kelgan edi",
                      tafsir: "Kofirlarning payg‘ambarlar va dalillarni inkor qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "زَعَمَ ٱلَّذِينَ كَفَرُواْ أَن لَّن يُبْعَثُواْ",
                      transcription: "Za'ama alladhiina kafaru an lan yub'athuu",
                      translation: "Kofirlar: 'Biz tirilmaymiz' dedilar",
                      tafsir: "Kofirlarning qayta tirilishni inkor qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "فَٱلْيَوْمَ ٱلَّذِينَ ءَامَنُواْ مِنَ ٱلْكُفَّارِ يَضْحَكُونَ",
                      transcription: "Falyawma alladhiina aamanuu mina al-kuffaari yadhakuuna",
                      translation: "Bugun mo‘minlar kofirlardan kuladilar",
                      tafsir: "Jannatdagi mo‘minlarning kofirlarga nisbatan ustunligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "يَٰٓأَيُّهَا ٱلنَّاسِ إِنَّ وَعْدَ ٱللَّهِ حَقُّ فَلَا تَغرُّرُّنَّكُمُ ٱلْحَيَوٰةُ ٱلدُّنَّيَا",
                      transcription: "Yaa ayyuhaa annaasi inna wa'da allaahi haqqun falaa taghurrannakumu al-hayaaqu",
                      translation: "Ey odamlar, Allohning va’dasi haqdir, dunyo hayoti sizni aldamas",
                      tafsir: "Dunyo hayotining o‘tkinchiligi va Alloh va’dasi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "وَلَا يَغُرَّنَّكُمْ بِٱلَّهِ ٱلْغَرُورُ",
                      transcription: "Wa laa yaghurrannakum billaahi al-gharuuru",
                      translation: "Shayton sizni Alloh bilan aldamas",
                      tafsir: "Shaytonning insonni aldashiga qarshi ogohlantirish.",
                      copySymbol: "📋"
                    }
                  ]
                },
                {
                  id: 65,
                  name: "At-Talaq",
                  arabicName: "الطلاق",
                  meaning: "Taloq",
                  ayahCount: 12,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    },
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "يَٰٓأَيُّهَا ٱلنَّبِيُّ إِذَا طَلَّقْتُمُ ٱلنِّسَآءَ",
                      transcription: "Yaa ayyuhaa an-nabiyyu idhaa tallaqtumu an-nisaa'a",
                      translation: "Ey Nabiy, xotinlarni taloq qilganingizda",
                      tafsir: "Taloqning shar’iy qoidalari va vaqtiga rioya qilish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "فَإِذَا بَلَغْنَ أَجَلَهُنَّ فَأَمْسِكُوهُنَّ بِمَعْرُوفٍ",
                      transcription: "Fa'idhaa balaghna ajalahunna fa-amsikuuhunna bima'ruufin",
                      translation: "Ularning muddati yetganda, ularni yaxshilik bilan ushlang",
                      tafsir: "Taloqdan keyin xotinni yaxshilik bilan qaytarish yoki ozod qilish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "وَمَن يَتَّقِ ٱللَّهَ يَجْعَل لَّهُۥ مَخْرَجًۭ",
                      transcription: "Wa man yattaqi allaaha yaj'al lahu makhrajan",
                      translation: "Kim Allohdan qorqsa, Alloh unga chiqish yo‘lini beradi",
                      tafsir: "Taqvo sohibiga Allohning yordami va rizqi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "وَٱلَّٰٓـِٔى يَئِسْنَ مِنَ ٱلْمَحِيضِ مِن نِّسَآئِكُمْ",
                      transcription: "Walladhiina ya'isna mina al-mahiidi min nisaa'ikum",
                      translation: "Xotinlaringizdan hayz ko‘rmaydiganlar",
                      tafsir: "Katta yoshdagi ayollarning idda muddati haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "ذَٰلِكَ أَمْرُ ٱللَّهِ أَنزَلَهُۥٓ إِلَيْكُمْ",
                      transcription: "Dhaalika amru allaahi anzalahu ilaykum",
                      translation: "Bu Allohning amri, uni sizlarga nozil qildi",
                      tafsir: "Taloq masalasidagi ilohiy hukmlarning muhimligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "أَسْكِنُوهُنَّ مِنْ حَيْثُ سَكَنتُم مِّن وُجْدِكُمْ",
                      transcription: "Askinuuhunna min haythu sakantum min wujdikum",
                      translation: "Ularni o‘zingiz yashagan joydan joylashtiring",
                      tafsir: "Taloq vaqtida xotinlarga yashash joyi berish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "لِيُنفِقْ ذُو سَعَةٍۢ مِّن سَعَتِهِۦ",
                      transcription: "Liyunfiq dhuu sa'atin min sa'atihi",
                      translation: "Keng imkoniyatli kishi o‘z imkoniyatidan infaq qilsin",
                      tafsir: "Taloqda xotinlarga moddiy ta’minot berish.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "وَكَأَيِّن مِّن قَرْيَةٍ عَتَتْ عَنْ أَمْرِ رَبِّهَا",
                      transcription: "Wa ka'ayyin min qaryatin 'atat 'an amri rabbihaa",
                      translation: "Qancha qishloqlar Robbining amriga qarshi chiqdi",
                      tafsir: "Alloh amriga qarshi chiqqanlarning oqibati.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "فَأَخَذَهُمُ ٱللَّهُ بِذُنُوبِهِمْ",
                      transcription: "Fa-akhadhahumu allaahu bidhunuubihim",
                      translation: "Alloh ularni gunohlari sababli ushladi",
                      tafsir: "Gunohkorlarning azobga duch kelishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "أَعَدَّ ٱللَّهُ لَهُمْ عَذَابًۭا شَدِيدًۭ",
                      transcription: "A'adda allaahu lahum 'adhaaban shadiidan",
                      translation: "Alloh ularga qattiq azob tayyorladi",
                      tafsir: "Kofirlar va gunohkorlar uchun tayyorlangan azob.",
                      copySymbol: "📋"
                    }
                  ]
                },
                {
                  id: 66,
                  name: "At-Tahrim",
                  arabicName: "التحريم",
                  meaning: "Taqiqlash",
                  ayahCount: 12,
                  place: "Madina",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "يَٰٓأَيُّهَا ٱلنَّبِيُّ لِمَ تُحَرِّمُ مَآ أَحَلَّ ٱللَّهُ لَكَ",
                      transcription: "Yaa ayyuhaa an-nabiyyu lima tuharrimu maa ahalla allaahu laka",
                      translation: "Ey Nabiy, nega Alloh senga halol qilgan narsani harom qilasan?",
                      tafsir: "Payg‘ambarning xotinlariga nisbatan qilgan qasami haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "قَدْ فَرَضَ ٱللَّهُ لَكُمْ تَحِلَّةَ أَيْمَٰنِكُمْ",
                      transcription: "Qad farada allaahu lakum tahillata aymaanikum",
                      translation: "Alloh sizlarga qasamlaringizni yechishni farz qildi",
                      tafsir: "Qasamni buzishning kafforati haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "وَإِذْ أَسَرَّ ٱلنَّبِيُّ إِلَىٰ بَعْضِ أَزْوَٰجِهِۦ حَدِيثًۭا",
                      transcription: "Wa idh asarra an-nabiyyu ilaa ba'di azwaajihi hadiithan",
                      translation: "Nabiy ba’zi xotinlariga sir so‘z aytdi",
                      tafsir: "Payg‘ambarning xotinlari bilan sir saqlash masalasi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤",
                      numberLatin: "4",
                      arabic: "إِن تَتُوبَآ إِلَىَ ٱللَّهِ فَقَدْ صَغَتْ قُلُوبُكُمَا",
                      transcription: "In tatubaa ilaa allaahi faqad saghat quluubukumaa",
                      translation: "Agar Allohga tavba qilsangiz, qalblaringiz egilgan",
                      tafsir: "Xotinlarning xatolaridan tavba qilishi kerakligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "عَسَىٰ رَبُّهُۥٓ إِن طَلَّقَكُنَّ أَن يُبْدِلَهُۥٓ أَزْوَٰجًا خَيْرًۭا",
                      transcription: "‘Asaa rabbuhu in tallaqakunna an yubdilahu azwaajan khayran",
                      translation: "Agar u sizni taloq qilsa, Robbi unga yaxshiroq xotinlar beradi",
                      tafsir: "Payg‘ambarga sadoqatli xotinlarning va’dasi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ قُواْ أَنفُسَكُمْ وَأَهْلِيكُمْ نَارًۭا",
                      transcription: "Yaa ayyuhaa alladhiina aamanuu quu anfusakum wa ahliikum naaran",
                      translation: "Ey iymon keltirganlar, o‘zingiz va ahlingizni do‘zaxdan saqlang",
                      tafir: "Mo‘minlarning o‘zlarini va oilalarini gunohdan himoya qilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "وَٱلَّذِينَ كَفَرُواْ يُضْرَبُونَ مَثَلًۭا لِّلَّذِينَ مِن قَبْلِهِمْ",
                      transcription: "Walladhiina kafaru yudrabuuna mathalan lilladhiina min qablihim",
                      translation: "Kofirlarga oldingilar misol qilinadi",
                      tafsir: "Kofirlarning o‘tgan qavmlar kabi oqibati.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "عَسَىٰٓ أَن يَتُوبَ ٱللَّهُ عَلَىٰٱلَّذِينَ ءَامَنُواْ",
                      transcription: "‘Asaa an yatuba allaahu 'alaa alladhiina aamanuu",
                      translation: "Alloh mo‘minlarga tavba qilishi mumkin",
                      tafir: "Mo‘minlarning tavba qilish imkoniyati haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "وَلَقَدْ ضَرَبَ لَكُمْ مَثَلًۭا مِّنَ ٱلَّذِينَ مِن قَبْلِكُمْ",
                      transcription: "Walaqad daraba lakum mathalan mina alladhiina min qablikum",
                      translation: "Sizlarga oldingi kishilardan misol keltirildi",
                      tafir: "O‘tgan qavmlardan ibrat olish haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "ضَرَبَ ٱللَّهُ مَثَلًۭا لِّلَّذِينَ كَفَرُواْ ٱمْرَأَتَ نُوحٍۢ",
                      transcription: "Daraba allaahu mathalan lilladhiina kafaruu imra'ata nuuhin",
                      translation: "Alloh kofirlarga Nuhning xotini misol qildi",
                      tafir: "Nuh va Lut xotinlarining kufri misol sifatida.",
                      copySymbol: "📋"
                    }
                  ]
                },
                  {
                    id: 67,
                    name: "Al-Mulk",
                    arabicName: "الملك",
                    meaning: "Mulk",
                    ayahCount: 30,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "تَبَٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍۢ قَدِيرٌ",
                        transcription: "Tabaaraka alladhii biyadihi al-mulku wahuwa ‘alaa kulli shay’in qadiirun",
                        translation: "Mulk Uning qo‘lida bo‘lgan Zot barakali va U hamma narsaga qodirdir",
                        tafsir: "Allohning mulk va qudratining ulug‘ligini tasvirlaydi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًۭا",
                        transcription: "Alladhii khalaqa al-mawta wal-hayaata liyabluwakum ayyukum ahsanu ‘amalan",
                        translation: "U o‘lim va hayotni yaratdi, qaysi biringiz amalda yaxshiroq ekanligingizni sinash uchun",
                        tafsir: "Hayot va o‘lim sinov sifatida berilganligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "ٱلَّذِى خَلَقَ سَبْعَ سَمَٰوَٰتٍۢ طِبَاقًۭا ۖ مَّا تَرَىٰ فِى خَلْقِ ٱلرَّحْمَٰنِ مِن تَفَٰوُتٍۢ",
                        transcription: "Alladhii khalaqa sab‘a samaawaatin tibaqan maa taraa fii khalqi ar-rahmaani min tafaawutin",
                        translation: "U yetti osmonni qat-qat yaratdi, Rahmonning yaratishida hech qanday nomuvofiqlik ko‘rmaysan",
                        tafsir: "Osmonlarning mukammal yaratilishi va Allohning qudrati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "ٱرْجِعِ ٱلْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ ٱلْبَصَرُ خَاسِئًۭا وَهُوَ حَسِيرٌۭ",
                        transcription: "Irji‘i al-basara karratayni yanqalib ilayka al-basaru khaasi’an wahuwa hasiirun",
                        translation: "Ko‘zingni qaytar, ikki marta qara, ko‘z xijolat bo‘lib, charchagan holda qaytadi",
                        tafsir: "Alloh yaratishidagi mukammallikni ko‘rish uchun takroriy qarash.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "وَلَقَدْ زَيَّنَّا ٱلسَّمَآءَ ٱلدُّنْيَا بِمَصَٰبِيحَ وَجَعَلْنَٰهَا رُجُومًۭا لِّلشَّيَٰطِينِ",
                        transcription: "Walaqad zayyanna as-samaa’a ad-dunyaa bimasaabiiha waja‘alnaahaa rujuuman lish-shayaatiini",
                        translation: "Biz dunyo osmonini chiroqlar bilan bezadik va ularni shaytonlar uchun otilma qildik",
                        tafsir: "Yulduzlarning osmonni bezashi va shaytonlarga qarshi ishlatilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "وَأَعْتَدْنَا لَهُمْ عَذَابَ ٱلسَّعِيرِ",
                        transcription: "Wa a‘tadnaa lahum ‘adhaaba as-sa‘iiri",
                        translation: "Va ularga alangali olov azobini tayyorladik",
                        tafsir: "Shaytonlar va kofirlar uchun do‘zax azobi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَلِلَّذِينَ كَفَرُواْ بِرَبِّهِمْ عَذَابُ جَهَنَّمَ ۖ وَبِئْسَ ٱلْمَصِيرُ",
                        transcription: "Walilladhiina kafaruu birabbihim ‘adhaabu jahannama wabi’sa al-masiiru",
                        translation: "Robbilarini inkor qilganlar uchun jahannam azobi bor, bu qanchalik yomon manzil!",
                        tafsir: "Kofirlarning do‘zaxdagi yomon oqibati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "إِذَآ أُلْقُواْ فِيهَا سَمِعُواْ لَهَا شَهِيقًۭا وَهِىَ تَفُورُ",
                        transcription: "Idhaa ulquu fiihaa sami‘uu lahaa shahiiqan wahiya tafuuru",
                        translation: "Ular unda tashlanganda, uning g‘ichirlaganini eshitadilar, u qaynamoqda",
                        tafsir: "Do‘zaxning dahshatli tovushlari va qaynashi tasviri.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "تَكَادُ تَمَيَّزُ مِنَ ٱلْغَيْظِ ۖ كُلَّمَآ أُلْقِىَ فِيهَا فَوْجٌۭ سَأَلَهُمْ خَزَنَتُهَآ أَلَمْ يَأْتِكُمْ نَذِيرٌۭ",
                        transcription: "Takaadu tamayyazu mina al-ghayzi kullamaa ulqiya fiihaa fawjun sa’alahum khazanatuhaa alam ya’tikum nadhiirun",
                        translation: "U g‘azabdan yorilib ketay deb turadi, har safar bir guruh tashlansa, uning posbonlari: 'Sizga ogohlantiruvchi kelmaganmidi?' deb so‘raydi",
                        tafsir: "Do‘zaxning g‘azabi va posbonlarning savoli.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "قَالُواْ بَلَىٰ قَدْ جَآءَنَا نَذِيرٌۭ فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ ٱللَّهُ مِن شَىْءٍ",
                        transcription: "Qaaluu balaa qad jaa’anaa nadhiirun fakadhdhabnaa wa qulnaa maa nazzala allaahu min shay’in",
                        translation: "Ular: 'Ha, bizga ogohlantiruvchi kelgan edi, lekin biz yolg‘on dedik va Alloh hech narsa nozil qilmadi dedik' derlar",
                        tafsir: "Kofirlarning ogohlantiruvchilarni inkor qilishi va pushaymonligi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 68,
                    name: "Al-Qalam",
                    arabicName: "القلم",
                    meaning: "Qalam",
                    ayahCount: 52,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "ن ۚ وَٱلْقَلَمِ وَمَا يَسْطُرُونَ",
                        transcription: "Nun wal-qalami wamaa yasturuuna",
                        translation: "Nun, qalam va ular yozgan narsalar bilan qasam",
                        tafsir: "Qalamning ilmu bilim ramzi sifatida muhimligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "مَآ أَنتَ بِنِعْمَةِ رَبِّكَ بِمَجْنُونٍۢ",
                        transcription: "Maa anta bini‘mati rabbika bimajnuunin",
                        translation: "Sen Robbingning ne’mati bilan jinni emassan",
                        tafsir: "Payg‘ambarning kofirlar tomonidan jinnilikda ayblanishini rad qilish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَإِنَّ لَكَ لَأَجْرًا غَيْرَ مَمْنُونٍۢ",
                        transcription: "Wa inna laka la’ajran ghayra mamnuunin",
                        translation: "Albatta senga uzluksiz mukofot bor",
                        tafsir: "Payg‘ambarga Alloh tomonidan ulkan mukofot va’da qilinishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍۢ",
                        transcription: "Wa innaka la‘alaa khuluqin ‘adhiimin",
                        translation: "Sen albatta ulug‘ axloq ustidasan",
                        tafsir: "Payg‘ambarning yuqori axloqiy fazilatlari ta’kidlanadi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "فَسَتُبْصِرُ وَيُبْصِرُونَ",
                        transcription: "Fasatubsiru wayubsiiruuna",
                        translation: "Sen ko‘rasan va ular ham ko‘radilar",
                        tafsir: "Haqiqatning payg‘ambar va kofirlar uchun oydinlashishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "بِأَييِّكُمُ ٱلْمَفْتُونُ",
                        transcription: "Bi’ayyikumu al-maftuunu",
                        translation: "Qaysi biringiz jinni ekanligini",
                        tafsir: "Haqiqiy jinnilik kofirlarning o‘zida ekanligini ko‘rsatish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "إِنَّ رَبَّكَ هُوَ أَعْلَمُ بِمَن ضَلَّ عَن سَبِيلِهِۦ وَهُوَ أَعْلَمُ بِٱلْمُهْتَدِينَ",
                        transcription: "Inna rabbaka huwa a‘lamu biman dalla ‘an sabiilihi wahuwa a‘lamu bil-muhtadiina",
                        translation: "Robbing yo‘ldan adashganlarni ham, hidoyat topganlarni ham yaxshi biladi",
                        tafsir: "Allohning adashganlar va to‘g‘ri yo‘lda yuruvchilarni bilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "فَلَا تُطِعِ ٱلْمُكَذِّبِينَ",
                        transcription: "Falaa tuti‘i al-mukadhdhibiina",
                        translation: "Yolg‘onchilarga itoat qilma",
                        tafsir: "Payg‘ambarga kofirlarning so‘zlariga ergashmaslik buyuriladi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَدُّواْ لَوْ تُدْهِنُ فَيُدْهِنُونَ",
                        transcription: "Wadduu law tudhinu fayudhinoona",
                        translation: "Ular sen yumshasang, ular ham yumshardi deb o‘ylaydilar",
                        tafsir: "Kofirlarning Payg‘ambarni dinni yumshatishga undashi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَلَا تُطِعْ كُلَّ حَلَّافٍۢ مَّهِينٍۢ",
                        transcription: "Wa laa tuti‘ kulla hallaafin mahiinin",
                        translation: "Har bir yolg‘on qasam ichuvchi, pastkashga itoat qilma",
                        tafsir: "Yolg‘onchi va axloqsiz odamlarga ergashmaslik haqida ogohlantirish.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 69,
                    name: "Al-Haqqah",
                    arabicName: "الحاقة",
                    meaning: "Haqiqat",
                    ayahCount: 52,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "ٱلْحَآقَّةُ",
                        transcription: "Al-haaqqatu",
                        translation: "Haqiqat",
                        tafsir: "Qiyomatning haqiqiy va muqarrar ekanligini ta’kidlash.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "مَا ٱلْحَآقَّةُ",
                        transcription: "Maa al-haaqqatu",
                        translation: "Haqiqat nima?",
                        tafsir: "Qiyomatning ulkan va dahshatli ekanligiga ishora.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَمَآ أَدْرَىٰكَ مَا ٱلْحَآقَّةُ",
                        transcription: "Wa maa adraaka maa al-haaqqatu",
                        translation: "Haqiqat nimaligini senga nima bildirdi?",
                        tafsir: "Qiyomatning ahamiyatini va dahshatini ta’kidlash.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "كَذَّبَتْ ثَمُودُ وَعَادٌۢ بِٱلْقَارِعَةِ",
                        transcription: "Kadhdhabat thamuudu wa ‘aadun bil-qaari‘ati",
                        translation: "Samud va Od qavmlari Qaari‘ani (qiyomatni) yolg‘on dedilar",
                        tafsir: "O‘tmishdagi qavmlarning qiyomatni inkor qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "فَأَمَّا ثَمُودُ فَأُهْلِكُواْ بِٱلطَّاغِيَةِ",
                        transcription: "Fa’ammaa thamuudu fa’uhlikuu bit-taaghiyati",
                        translation: "Samud qavmi haddan oshgan (ovoz bilan) halok qilindi",
                        tafsir: "Samud qavmining dahshatli ovoz bilan halok bo‘lishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "وَأَمَّا عَادٌۭ فَأُهْلِكُواْ بِرِيحٍۢ صَرْصَرٍ عَاتِيَةٍۢ",
                        transcription: "Wa ammaa ‘aadun fa’uhlikuu biriihin sarsarin ‘aatiyatin",
                        translation: "Od qavmi esa sovuq va qattiq shamol bilan halok qilindi",
                        tafsir: "Od qavmining kuchli shamol bilan yo‘q qilinishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "سَخَّرَهَا عَلَيْهِمْ سَبْعَ لَيَالٍۢ وَثَمَٰنِيَةَ أَيَّامٍ حُسُومًۭا",
                        transcription: "Sakhkharahaa ‘alayhim sab‘a layaalin wa thamaaniyata ayyaamin husuuman",
                        translation: "U (shamol) ular ustiga yetti kecha va sakkiz kun uzluksiz yuborildi",
                        tafsir: "Od qavmining sakkiz kunlik doimiy shamol azobi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "فَتَرَى ٱلْقَوْمَ فِيهَا صَرْعَىٰ كَأَنَّهُمْ أَعْجَازُ نَخْلٍ خَاوِيَةٍۢ",
                        transcription: "Fataraa al-qawma fiihaa sar‘aa ka’annahum a‘jaazu nakhlin khaawiyatin",
                        translation: "Ularning qavmini yiqilib tushgan, bo‘sh xurmo poyalari kabi ko‘rasan",
                        tafsir: "Od qavmining halokatdan keyin xurmo poyalari kabi yiqilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "فَهَلْ تَرَىٰ لَهُم مِّنۢ بَاقِيَةٍۢ",
                        transcription: "Fahal taraa lahum min baaqiyatin",
                        translation: "Ulardan biror narsa qoldimi?",
                        tafir: "Zolim qavmlarning butunlay yo‘q bo‘lib ketishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَجَآءَ فِرْعَوْنُ وَمَن قَبْلَهُۥ وَٱلْمُؤْتَفِكَٰتُ بِٱلْخَاطِئَةِ",
                        transcription: "Wa jaa’a fir‘awnu wa man qablahu wal-mu’tafikaatu bil-khaati’ati",
                        translation: "Fir’avn, undan oldingilar va ag‘darilgan shaharlar gunoh bilan kelishdi",
                        tafsir: "Fir’avn va boshqa zolimlarning gunohlari tufayli halokati.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                {
                  id: 70,
                  name: "Al-Ma‘arij",
                  arabicName: "المعارج",
                  meaning: "Zinapoyalar",
                  ayahCount: 44,
                  place: "Makka",
                  prelude: {
                    bismillah: {
                      arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                      transcription: "Bismillahir-Rahmanir-Rahiim",
                      translation: "Mehribon va rahmli Alloh nomi bilan",
                      tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                      copySymbol: "📋"
                    }
                  },
                  ayahs: [
                    {
                      numberArabic: "١",
                      numberLatin: "1",
                      arabic: "سَأَلَ سَسَآئِلُلٌ بِعَذَابٍ۬",
                      transcription: "Sa'ala saa'ilun bi'adhaabin",
                      translation: "Bir so‘rovchi azob so‘radi",
                      tafsir: "Kofirning qiyomat azobini masxara qilishi haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٢",
                      numberLatin: "2",
                      arabic: "لِّلْكَٰفِرِينَ لَيْسَ لَهُۥ دَافِعٌ",
                      transcription: "Lilkaafiriina laysa lahuu daafi'un",
                      translation: "Kofirlarga, uni daf qiluvchi yo‘q",
                      tafsir: "Qiyomat azobidan hechilarning qutulolmasligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٣",
                      numberLatin: "3",
                      arabic: "مِّنَ ٱللَّهِ ذِى ٱلْمَعَٰرِجِ",
                      transcription: "Mina allaahi dhii al-ma‘aariji",
                      translation: "Allohdan, zinapoyalar egasidan",
                      tafsir: "Allohning ulug‘ligi va osmonlarga chiqish yo‘llari haqida.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٤�",
                      numberLatin: "4",
                      arabic: "تَعْرُجُ ٱلْمَلَٰٓئِكَةُ وَٱلرُّوحُ إِلَيْهِ",
                      transcription: "Ta'ruju al-malaa'ikatu war-ruuhu ilayhi",
                      translation: "Farishtalar va Ruh unga ko‘tariladi",
                      tafsir: "Farishtalar va Jabroilning Alloh huzuriga ko‘tarilishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٥",
                      numberLatin: "5",
                      arabic: "فَٱصْبِرْ صَبْرًۭا جَمِيلًۭا",
                      transcription: "Fasbir sabran jamiilan",
                      translation: "Chiroyli sabr qil",
                      tafsir: "Payg‘ambarga kofirlarning masxaralariga sabr qilish buyurigi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٦",
                      numberLatin: "6",
                      arabic: "إِنَّهُمْ يَرَوْنَهُ بَعِيدًۭا",
                      transcription: "Innahum yarawnahu ba‘iidan",
                      translation: "Ular uni (qiyamatni) uzoq deb ko‘radilar",
                      tafsir: "Kofirlarning qiyomatni uzoq deb hisoblashi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٧",
                      numberLatin: "7",
                      arabic: "وَنَرَٰهُ قَرِيبًۭا",
                      transcription: "Wa naraahu qariiban",
                      translation: "Biz esa uni yaqin deb ko‘ramiz",
                      tafsir: "Qiyomatning mo‘minlar uchun yaqin ekanligi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "٨",
                      numberLatin: "8",
                      arabic: "يَوْمَ تَكُونُ ٱلسَّمَآءُ مَوْلَةً",
                      transcription: "Yawma takuunu as-samaa'u mawlatan",
                      translation: "Osmon kunda eritilgan qo‘rg‘oshin kabi bo‘ladi",
                      tafsir: "Qiyomatdagi osmonning dahshatli holati.",
                      copySymbol: "📋�"
                    },
                    {
                      numberArabic: "٩",
                      numberLatin: "9",
                      arabic: "وَتَكُونُ ٱلْجِبَالُ كَٱلْعِهْنِ",
                      transcription: "Wa takuunu al-jibaalu kal'ihni",
                      translation: "Tog‘lar yun kabi bo‘ladi",
                      tafir: "Qiyomatda tog‘larning parchalanib, yengil bo‘lishi.",
                      copySymbol: "📋"
                    },
                    {
                      numberArabic: "١٠",
                      numberLatin: "10",
                      arabic: "وَلَا يَسْـَٔلُ حَمِيمٌ حَمِيمًۭا",
                      transcription: "Wa laa yas'alu hamiimun hamiiman",
                      translation: "Yaqin do‘st yaqin do‘stdan so‘ramaydi",
                      tafir: "Qiyomatda hech kim boshqasini o‘ylamaydi.",
                      copySymbol: "📋"
                    }
                  ]
                },
                  {
                    id: 71,
                    name: "Nuh",
                    arabicName: "نوح",
                    meaning: "Nuh",
                    ayahCount: 28,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "إِنَّآ أَرْسَلْنَا نُوحًا إِلَىٰ قَوْمِهِۦٓ",
                        transcription: "Innaa arsalnaa nuuhan ilaa qawmihi",
                        translation: "Biz Nuhni o‘z qavmiga yubordik",
                        tafsir: "Nuh (a.s.) ning payg‘ambar sifatida yuborilishi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "قَالَ يَٰقَوْمِ إِنِّى لَكُمْ نَذِيرٌۭ مُّبِينٌ",
                        transcription: "Qaala yaa qawmi innii lakum nadhiirun mubiinun",
                        translation: "U dedi: 'Ey qavmim, men sizlar uchun ogohlantiruvchiman'",
                        tafsir: "Nuhning qavmini Allohning azobidan ogohlantirishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "أَنِ ٱعْبُدُواْ ٱللَّهَ وَٱتَّقُوهُ وَأَطِيعُونِ",
                        transcription: "Ani u‘buduu allaaha wattaquuhu wa atii‘uuni",
                        translation: "Allohga ibodat qiling, Undan qorqing va menga itoat qiling",
                        tafsir: "Nuhning qavmiga Allohga ibodat va taqvo da’vati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "يَغْفِرْ لَكُم مِّن ذُنُوبِكُمْ وَيُؤَخِّرْكُمْ إِلَىٰٓ أَجَلٍۢ مُّسَمًّى",
                        transcription: "Yaghfir lakum min dhunuubikum wa yu’akhkhirkum ilaa ajalin musamman",
                        translation: "U gunohlaringizni mag‘firat qiladi va sizni belgilangan muddatgacha kechiktiradi",
                        tafsir: "Itoat qilganlarning mag‘firat va muhlat topishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "قَالَ رَبِّ إِنِّى دَعَوْتُ قَوْمِى لَيْلًۭا وَنَهَارًۭا",
                        transcription: "Qaala rabbi innii da‘awtu qawmii laylan wa nahaaran",
                        translation: "U dedi: 'Robbim, men qavmimni kechayu kunduz da’vat qildim'",
                        tafsir: "Nuhning qavmini tinmay da’vat qilgan sadoqati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "فَلَمْ يَزِدْهُمْ دُعَآءِىٓ إِلَّا فِرَارًۭا",
                        transcription: "Falam yazidhum du‘aa’ii illaa firaaran",
                        translation: "Lekin da’vatim ularni faqat qochishga undadi",
                        tafsir: "Qavmning haqiqatdan yuz o‘girishi va qochishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَإِنِّى كُلَّمَا دَعَوْتُهُمْ لِتَغْفِرَ لَهُمْ",
                        transcription: "Wa innii kullamaa da‘awtuhum litaghfira lahum",
                        translation: "Har safar ularni mag‘firat uchun da’vat qilsam",
                        tafsir: "Nuhning qavmini mag‘firatga chorlashdagi harakati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "ثُمَّ إِنِّى دَعَوْتُهُمْ جِهَارًۭا",
                        transcription: "Thumma innii da‘awtuhum jihaaran",
                        translation: "So‘ng ularni oshkora da’vat qildim",
                        tafsir: "Nuhning da’vatni oshkora va yashirin qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "ثُمَّ إِنِّىٓ أَعْلَنتُ لَهُمْ وَأَسْرَرْتُ لَهُمْ إِسْرَارًۭا",
                        transcription: "Thumma innii a‘lantu lahum wa asrartu lahum israaran",
                        translation: "Keyin oshkora va yashirin ularga aytib berdim",
                        tafsir: "Nuhning da’vatni har xil usulda qilganligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "فَقُلْتُ ٱسْتَغْفِرُواْ رَبَّكُمْ إِنَّهُۥ كَانَ غَفَّارًۭا",
                        transcription: "Faqultu istaghfiruu rabbakum innahu kaana ghaffaaran",
                        translation: "Dedim: 'Robbingizdan mag‘firat so‘rang, U mag‘firat qiluvchidir'",
                        tafsir: "Nuhning qavmini tavba va mag‘firatga da’vat qilishi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 72,
                    name: "Al-Jinn",
                    arabicName: "الجن",
                    meaning: "Jinlar",
                    ayahCount: 28,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "قُلْ أُوحِىَ إِلَىَّ أَنَّهُ ٱسْتَمَعَ نَفَرٌۭ مِّنَ ٱلْجِنِّ",
                        transcription: "Qul uuhiya ilayya annahu istama‘a nafarun mina al-jinni",
                        translation: "Ayt: 'Menga vahiy qilindiki, jinlardan bir guruh tingladi'",
                        tafsir: "Jinlarning Qur’onni tinglashi va Payg‘ambarga vahiy kelishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "فَقَالُوٓاْ إِنَّا سَمِعْنَا قُرْءَانًا عَجَبًۭا",
                        transcription: "Faqaaluu innaa sami‘naa qur’aanan ‘ajaban",
                        translation: "Ular dedilar: 'Biz ajoyib Qur’on eshitdik'",
                        tafsir: "Jinlarning Qur’onni mu’jiza sifatida e’tirof qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "أَنَّهُۥ تَعَٰلَىٰ جَدُّ رَبِّنَا مَا ٱتَّخَذَ صَٰحِبَةًۭ وَلَا وَلَدًۭا",
                        transcription: "Annahu ta‘aalaa jaddu rabbinaa maa ittakhadha saahibatan wa laa waladan",
                        translation: "Robbimiz ulug‘dir, U xotin yoki farzand tutmagan",
                        tafsir: "Jinlarning Allohning yagonaligi va pokligini tasdiqlashi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "وَأَنَّهُۥ كَانَ يَقُولُ سَفِيهُنَا عَلَى ٱللَّهِ شَطَطًۭا",
                        transcription: "Wa annahu kaana yaquulu safiihunaa ‘alaa allaahi shatatan",
                        translation: "Bizning ahmoqlarimiz Alloh haqida nojo‘ya gaplar aytardi",
                        tafsir: "Jinlarning avvalgi noto‘g‘ri e’tiqodlari haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "وَأَنَّا ظَنَنَّآ أَن لَّن تَقُولَ ٱلْإِنسُ وَٱلْجِنُّ عَلَى ٱللَّهِ كَذِبًۭا",
                        transcription: "Wa annaa zanannaa an lan taquula al-insu wal-jinnu ‘alaa allaahi kadhiban",
                        translation: "Biz inson va jinlar Allohga yolg‘on to‘qimaydi deb o‘ylagandik",
                        tafsir: "Jinlarning avvalgi noto‘g‘ri taxminlari.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "وَأَنَّهُۥ كَانَ رِجَالٌۭ مِّنَ ٱلْإِنسِ يَعُوذُونَ بِرِجَالٍۢ مِّنَ ٱلْجِنِّ",
                        transcription: "Wa annahu kaana rijaalun mina al-insi ya‘uudhuuna birijaalin mina al-jinni",
                        translation: "Insonlardan ba’zi erkaklar jinlardan panoh so‘rardi",
                        tafsir: "Insonlarning jinlarga sig‘inish odati haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَأَنَّهُمْ ظَنُّواْ كَمَا ظَنَنتُمْ أَن لَّن يَبْعَثَ ٱللَّهُ أَحَدًۭا",
                        transcription: "Wa annahum zannuu kamaa zanantum an lan yab‘atha allaahu ahadan",
                        translation: "Ular sizlar kabi Alloh hech kimni tiriltirmaydi deb o‘yladi",
                        tafsir: "Jin va insonlarning qayta tirilishni inkor qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَأَنَّا لَمَسْنَا ٱلسَّمَآءَ فَوَجَدْنَٰهَا مُلِئَتْ حَرَسًۭا شَدِيدًۭا",
                        transcription: "Wa annaa lamasnaa as-samaa’a fawajadnaahaa muli’at harasan shadiidan",
                        translation: "Biz osmonni tutdik, uni qattiq qo‘riqlangan deb topdik",
                        tafsir: "Jinlarning osmonni tinglashdan to‘silishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَأَنَّا كُنَّا نَقْعُدُ مِنْهَا مَقَٰعِدَ لِلسَّمْعِ",
                        transcription: "Wa annaa kunnaa naq‘udu minhaa maqaa‘ida lis-sam‘i",
                        translation: "Biz unda tinglash uchun o‘tirar edik",
                        tafsir: "Jinlarning avval osmon xabarlarini tinglash odati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَأَنَّا لَا نَدْرِىٓ أَشَرٌّ أُرِيدَ بِمَن فِى ٱلْأَرْضِ",
                        transcription: "Wa annaa laa nadrii asharrun uriida biman fi al-ardi",
                        translation: "Yerdagilarga yomonlikmi yoki yaxshilikmi niyat qilinganini bilmaymiz",
                        tafsir: "Jinlarning osmon xabarlaridan mahrum bo‘lishi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 73,
                    name: "Al-Muzzammil",
                    arabicName: "المزمل",
                    meaning: "O‘ranib olgan",
                    ayahCount: 20,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "يَٰٓأَيُّهَا ٱلْمُزَّمِّلُ",
                        transcription: "Yaa ayyuhaa al-muzzammilu",
                        translation: "Ey o‘ranib olgan!",
                        tafsir: "Payg‘ambarga vahiy kelganda adyolga o‘ranib olgani haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "قُمِ ٱلَّيْلَ إِلَّا قَلِيلًۭا",
                        transcription: "Qumi al-layla illaa qaliilan",
                        translation: "Kechani ozgina vaqt bundan mustasno turib ibodat qil",
                        tafsir: "Payg‘ambarga tahajjud namozini o‘qish buyurilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "نِصْفَهُۥٓ أَوِ ٱنقُصْ مِنْهُ قَلِيلًۭا",
                        transcription: "Nisfahu awi nqus minhu qaliilan",
                        translation: "Yarmini yoki undan ozgina kamaytir",
                        tafsir: "Tahajjudning kechaning yarmi yoki undan ozroq o‘qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "أَوْ زِدْ عَلَيْهِ وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًۭا",
                        transcription: "Aw zid ‘alayhi wa rattili al-qur’aana tartiilan",
                        translation: "Yoki ko‘paytir va Qur’onni tartil bilan o‘qi",
                        tafsir: "Qur’onni sekin va tushunib o‘qish buyurilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "إِنَّا سَنُلْقِى عَلَيْكَ قَوْلًۭا ثَقِيلًۭا",
                        transcription: "Innaa sanulqii ‘alayka qawlan thaqiilan",
                        translation: "Biz senga og‘ir so‘z (Qur’on) tashlaymiz",
                        tafsir: "Qur’onning mas’uliyatli va og‘ir vazifa ekanligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "إِنَّ نَاشِئَةَ ٱلَّيْلِ هِىَ أَشَدُّ وَطْـًۭٔا وَأَقْوَمُ قِيلًۭا",
                        transcription: "Inna naashi’ata al-layli hiya ashaddo wat’an wa aqwamu qiilan",
                        translation: "Kecha ibodati qattiqroq va so‘zda to‘g‘riroqdir",
                        tafsir: "Tahajjudning ruhiy va ma’naviy foydalari.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "إِنَّ لَكَ فِى ٱلنَّهَارِ سَبْحًۭا طَوِيلًۭا",
                        transcription: "Inna laka fi an-nahaari sabhan tawiilan",
                        translation: "Kunduzi senga uzoq mashg‘ulot bor",
                        tafsir: "Kunduzgi ishlar va kechasi ibodatning muvozanati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَٱذْكُرِ ٱسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًۭا",
                        transcription: "Wadhkuri isma rabbika wa tabattal ilayhi tabtiilan",
                        translation: "Robbing ismini zikr qil va Unga butunlay bag‘ishlan",
                        tafsir: "Allohni zikr qilish va ibodatda sadoqat.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "رَّبُّ ٱلْمَشْرِقِ وَٱلْمَغْرِبِ لَآ إِلَٰهَ إِلَّا هُوَ",
                        transcription: "Rabbu al-mashriqi wal-maghribi laa ilaaha illaa huwa",
                        translation: "Sharq va g‘arbning Robbi, Undan boshqa iloh yo‘q",
                        tafsir: "Allohning yagona iloh ekanligi va hokimiyati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَٱصْبِرْ عَلَىٰ مَا يَقُولُونَ وَٱهْجُرْهُمْ هَجْرًۭا جَمِيلًۭا",
                        transcription: "Wasbir ‘alaa maa yaquuluuna wahjurhum hajran jamiilan",
                        translation: "Ularning gaplariga sabr qil va ulardan chiroyli tarzda ajral",
                        tafsir: "Kofirlarning e’tirozlariga sabr va ulardan uzilish.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 74,
                    name: "Al-Muddaththir",
                    arabicName: "المدثر",
                    meaning: "Yopinib olgan",
                    ayahCount: 56,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "يَٰٓأَيُّهَا ٱلْمُدَّثِّرُ",
                        transcription: "Yaa ayyuhaa al-muddaththiru",
                        translation: "Ey yopinib olgan!",
                        tafsir: "Payg‘ambarga vahiy kelganda yopinib olgani haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "قُمْ فَأَنذِرْ",
                        transcription: "Qum fa’andhir",
                        translation: "Tur va ogohlantir",
                        tafsir: "Payg‘ambarga da’vat va ogohlantirish vazifasi buyurilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَرَبَّكَ فَكَبِّرْ",
                        transcription: "Wa rabbaka fakabbir",
                        translation: "Robbingni ulug‘la",
                        tafsir: "Allohni ulug‘lash va Uning buyukligini e’lon qilish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "وَثِيَابَكَ فَطَهِّرْ",
                        transcription: "Wa thiyaabaka fatahhir",
                        translation: "Kiyimlaringni pok qil",
                        tafsir: "Tashqi va ichki poklikka rioya qilish buyurigi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "وَٱلرُّجْزَ فَٱهْجُرْ",
                        transcription: "War-rujza fahjur",
                        translation: "Nopoklikdan uzil",
                        tafsir: "Shirk va gunohlardan butunlay ajralish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "وَلَا تَمْنُن تَسْتَكْثِرُ",
                        transcription: "Wa laa tamnun tastakthiru",
                        translation: "Ko‘p deb minnat qilib ehson qilma",
                        tafsir: "Yaxshilikni minnatsiz va Alloh uchun qilish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَلِرَبِّكَ فَٱصْبِرْ",
                        transcription: "Wa lirabbika fasbir",
                        translation: "Robbing uchun sabr qil",
                        tafsir: "Da’vatdagi sinovlarga sabr qilish buyurigi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "فَإِذَا نُقِرَ فِى ٱلنَّاقُورِ",
                        transcription: "Fa’idhaa nuqira fi an-naaquuri",
                        translation: "Qachonki surnay chalinsa",
                        tafsir: "Qiyomatning boshlanishi va surnay chalinishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "فَذَٰلِكَ يَوْمَئِذٍۢ يَوْمٌ عَسِيرٌۭ",
                        transcription: "Fadhaalika yawma’idhin yawmun ‘asiirun",
                        translation: "O‘sha kun qiyin kun bo‘ladi",
                        tafsir: "Qiyomatning kofirlar uchun og‘irligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "عَلَى ٱلْكَٰفِرِينَ غَيْرُ يَسِيرٍۭ",
                        transcription: "‘Alaa al-kaafiriina ghayru yasiirin",
                        translation: "Kofirlarga oson bo‘lmaydi",
                        tafsir: "Qiyomatda kofirlarning qiyin ahvoli.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 75,
                    name: "Al-Qiyama",
                    arabicName: "القيامة",
                    meaning: "Qiyomat",
                    ayahCount: 40,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "لَآ أُقْسِمُ بِيَوْمِ ٱلْقِيَٰمَةِ",
                        transcription: "Laa uqsimu biyawmi al-qiyaamati",
                        translation: "Yo‘q, qiyomat kuni bilan qasam",
                        tafsir: "Qiyomat kunining haqiqati va muhimligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "وَلَآ أُقْسِمُ بِٱلنَّفْسِ ٱللَّوَّامَةِ",
                        transcription: "Wa laa uqsimu binnafsi allawwaamati",
                        translation: "Va o‘zini qoralovchi nafs bilan qasam",
                        tafsir: "Insonning vijdoni va o‘zini ayblashi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "أَيَحْسَبُ ٱلْإِنسَٰنُ أَلَّن نَّجْمَعَ عِظَامَهُۥ",
                        transcription: "Ayahsabu al-insaanu allan najma‘a ‘izaamahu",
                        translation: "Inson suyaklarini yig‘maymiz deb o‘ylaydimi?",
                        tafsir: "Qayta tirilishni inkor qilganlarning xatosi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "بَلَىٰ قَٰدِرِينَ عَلَىٰٓ أَن نُّسَوِّىَ بَنَانَهُۥ",
                        transcription: "Balaa qaadirina ‘alaa an nusawwiya banaanahu",
                        translation: "Ha, biz uning barmoq uchlarini ham tekislay olamiz",
                        tafsir: "Allohning insonni mukammal qayta yaratish qudrati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "بَلْ يُرِيدُ ٱلْإِنسَٰنُ لِيَفْجُرَ أَمَامَهُۥ",
                        transcription: "Bal yuriidu al-insaanu liyafjura amaamahu",
                        translation: "Lekin inson oldinda gunoh qilishni xohlaydi",
                        tafsir: "Insonning o‘z nafsiga ergashib gunohga moyilligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "ٶ",
                        numberLatin: "6",
                        arabic: "يَسْـَٔلُ أَيَّانَ يَوْمُ ٱلْقِيَٰمَةِ",
                        transcription: "Yas’alu ayyaana yawmu al-qiyaamati",
                        translation: "U so‘raydi: 'Qiyomat kuni qachon?'",
                        tafsir: "Kofirlarning qiyomatni masxara qilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "فَإِذَا بَرِقَ ٱلْبَصَرُ",
                        transcription: "Fa’idhaa bariqa al-basaru",
                        translation: "Ko‘zlar chaqnaganda",
                        tafsir: "Qiyomatdagi dahshatli manzaralar tasviri.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَخَسَفَ ٱلْقَمَرُ",
                        transcription: "Wa khasafa al-qamaru",
                        translation: "Va oy qorayganda",
                        tafsir: "Qiyomatda oyning nuri o‘chishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَجُمِعَ ٱلشَّمْسُ وَٱلْقَمَرُ",
                        transcription: "Wa jumi‘a ash-shamsu wal-qamaru",
                        translation: "Quyosh va oy birlashtirilganda",
                        tafsir: "Qiyomatda koinot tartibining buzilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "يَقُولُ ٱلْإِنسَٰنُ يَوْمَئِذٍ أَيْنَ ٱلْمَفَرُّ",
                        transcription: "Yaquulu al-insaanu yawma’idhin ayna al-mafarru",
                        translation: "Inson o‘sha kuni: 'Qochish yo‘li qayerda?' deydi",
                        tafsir: "Qiyomatda qochish imkonsizligi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 76,
                    name: "Al-Insan",
                    arabicName: "الإنسان",
                    meaning: "Inson",
                    ayahCount: 31,
                    place: "Madina",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "هَلْ أَتَىٰ عَلَى ٱلْإِنسَٰنِ حِينٌۭ مِّنَ ٱلدَّهْرِ لَمْ يَكُن شَيْـًۭٔا مَّذْكُورًۭا",
                        transcription: "Hal ataa ‘ala al-insaani hiinun mina ad-dahri lam yakun shay’an madhkuuran",
                        translation: "Insonga bir zamon kelgan emasmiki, u esga olinmas edi?",
                        tafsir: "Insonning yaratilishdan oldingi yo‘qligi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "إِنَّا خَلَقْنَا ٱلْإِنسَٰنَ مِن نُّطْفَةٍ أَمْشَاجٍۢ",
                        transcription: "Innaa khalaqnaa al-insaana min nutfatin amshaajin",
                        translation: "Biz insonni aralash nutfadan yaratdik",
                        tafsir: "Insonning nutfadan yaratilishi va sinovi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "إِنَّا هَدَيْنَٰهُ ٱلسَّبِيلَ إِمَّا شَاكِرًۭا وَإِمَّا كَفُورًۭا",
                        transcription: "Innaa hadaynaahu as-sabiila immaa shaakiran wa immaa kafuuran",
                        translation: "Biz unga yo‘l ko‘rsatdik, u shukr qiluvchi yoki kofir bo‘ladi",
                        tafsir: "Insonning iymon yoki kufr tanlash erkinligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "إِنَّآ أَعْتَدْنَا لِلْكَٰفِرِينَ سَلَٰسِلَا۟ وَأَغْلَٰلًۭا وَسَعِيرًۭا",
                        transcription: "Innaa a‘tadnaa lilkaafiriina salaasila wa aghlaalan wa sa‘iiran",
                        translation: "Biz kofirlarga zanjirlar, kishanlar va alanga tayyorladik",
                        tafsir: "Kofirlarning do‘zaxdagi azobi tasviri.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "إِنَّ ٱلْأَبْرَارَ يَشْرَبُونَ مِن كَأْسٍۢ كَانَ مِزَاجُهَا كَافُورًا",
                        transcription: "Inna al-abraara yashrabuuna min ka’sin kaana mizaajuhaa kaafuuran",
                        translation: "Solihlar kafo‘r aralash kosadan ichadilar",
                        tafsir: "Jannatdagi solihlarning ne’matlari haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "عَيْنًۭا يَشْرَبُ بِهَا عِبَادُ ٱللَّهِ",
                        transcription: "‘Aynan yashrabu bihaa ‘ibaadu allaahi",
                        translation: "Alloh bandalari ichadigan buloq",
                        tafsir: "Jannatdagi pokiza suv buloqlari.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "يُوفُونَ بِٱلنَّذْرِ وَيَخَافُونَ يَوْمًۭا كَانَ شَرُّهُۥ مُسْتَطِيرًۭا",
                        transcription: "Yuufuuna bin-nadhri wa yakhaafuuna yawman kaana sharruhu mustatiiran",
                        translation: "Ular nazrlarini bajaradilar va yomonligi keng tarqalgan kundan qorqadilar",
                        tafsir: "Solihlarning va’daga vofa qilishi va qiyomatdan qo‘rqishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَيُطْعِمُونَ ٱلطَّعَامَ عَلَىٰ حُبِّهِۦ مِسْكِينًۭا وَيَتِيمًۭا وَأَسِيرًۭا",
                        transcription: "Wa yut‘imuuna at-ta‘aama ‘alaa hubbihi miskiinan wa yatiiman wa asiiran",
                        translation: "Ular ovqatni sevsalar ham kambag‘al, yetim va asirga beradilar",
                        tafsir: "Solihlarning saxiyligi va fidoyiligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ ٱللَّهِ",
                        transcription: "Innamaa nut‘imukum liwajhi allaahi",
                        translation: "Biz sizlarni faqat Alloh rizoligi uchun ovqatlantiramiz",
                        tafsir: "Yaxshilikni faqat Alloh uchun qilish sadoqati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَنَخَافُ مِن رَّبِّنَا يَوْمًا عَبُوسًۭا قَمْطَرِيرًۭا",
                        transcription: "Wa nakhaafu min rabbinaa yawman ‘abusan qamtariiran",
                        translation: "Biz Robbimizdan qiyin va og‘ir kundan qo‘rqamiz",
                        tafsir: "Solihlarning qiyomatdan qo‘rqishi va taqvosi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 77,
                    name: "Al-Mursalat",
                    arabicName: "المرسلات",
                    meaning: "Yuborilganlar",
                    ayahCount: 50,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "وَٱلْمُرْسَلَٰتِ عُرْفًۭا",
                        transcription: "Wal-mursalaati ‘urfan",
                        translation: "Ketma-ket yuborilganlar bilan qasam",
                        tafsir: "Shamollar yoki farishtalarning Alloh amri bilan yuborilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "فَٱلْعَٰصِفَٰتِ عَصْفًۭا",
                        transcription: "Fal-‘aasifaati ‘asfan",
                        translation: "Qattiq esganlar bilan qasam",
                        tafsir: "Kuchli shamollar yoki farishtalarning tez harakati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَٱلنَّٰشِرَٰتِ نَشْرًۭا",
                        transcription: "Wan-naashiraati nashran",
                        translation: "Yoyganlar bilan qasam",
                        tafsir: "Bulutlarni yoyuvchi shamollar yoki vahiy tarqatuvchi farishtalar.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "فَٱلْفَٰرِقَٰتِ فَرْقًۭا",
                        transcription: "Fal-faaqiraati farqan",
                        translation: "Ajratuvchilar bilan qasam",
                        tafsir: "Haq va botilni ajratuvchi farishtalar yoki vahiy.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "فَٱلْمُلْقِيَٰتِ ذِكْرًۭا",
                        transcription: "Fal-mulqiyaati dhikran",
                        translation: "Zikr tashlovchilar bilan qasam",
                        tafsir: "Vahiyni payg‘ambarlarga yetkazuvchi farishtalar.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "ٶ",
                        numberLatin: "6",
                        arabic: "عُذْرًا أَوْ نُذْرًۭا",
                        transcription: "‘Udhran aw nudhran",
                        translation: "Uzr yoki ogohlantirish sifatida",
                        tafsir: "Vahiyning ogohlantirish va yo‘l ko‘rsatish vazifasi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "إِنَّمَا تُوعَدُونَ لَوَٰقِعٌۭ",
                        transcription: "Innamaa tuu‘aduuna lawaaqi‘un",
                        translation: "Sizga va’da qilingan narsa albatta ro‘y beradi",
                        tafsir: "Qiyomatning muqarrar ekanligi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "فَإِذَا ٱلنُّجُومُ طُمِسَتْ",
                        transcription: "Fa’idhaa an-nujuumu tumisat",
                        translation: "Yulduzlar o‘chganda",
                        tafsir: "Qiyomatda yulduzlarning nuri yo‘qolishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَإِذَا ٱلسَّمَآءُ فُرِجَتْ",
                        transcription: "Wa idhaa as-samaa’u furijat",
                        translation: "Osmon yorilganda",
                        tafsir: "Qiyomatda osmonning yorilishi va o‘zgarishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَإِذَا ٱلْجِبَالُ نُسِفَتْ",
                        transcription: "Wa idhaa al-jibaalu nusifat",
                        translation: "Tog‘lar uchirilganda",
                        tafsir: "Qiyomatda tog‘larning changga aylanishi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 78,
                    name: "An-Naba",
                    arabicName: "النبإ",
                    meaning: "Xabar",
                    ayahCount: 40,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "عَمَّ يَتَسَآءَلُونَ",
                        transcription: "‘Amma yatasa’aluuna",
                        translation: "Nimadan so‘rashmoqda?",
                        tafsir: "Kofirlarning qiyomat xabari haqida bahslashishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "عَنِ ٱلنَّبَإِ ٱلْعَظِيمِ",
                        transcription: "‘Ani an-naba’i al-‘adhiimi",
                        translation: "Ulug‘ xabar haqida",
                        tafsir: "Qiyomatning ulug‘ va muhim xabar ekanligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "ٱلَّذِى هُمْ فِيهِ مُخْتَلِفُونَ",
                        transcription: "Alladhii hum fiihi mukhtalifuuna",
                        translation: "Ular bu haqda ixtilofdalar",
                        tafsir: "Kofirlarning qiyomat haqida turli bahslari.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "كَلَّا سَيَعْلَمُونَ",
                        transcription: "Kallaa saya‘lamuuna",
                        translation: "Yo‘q, ular biladilar",
                        tafsir: "Kofirlarning haqiqatni tez orada bilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "ثُمَّ كَلَّا سَيَعْلَمُونَ",
                        transcription: "Thumma kallaa saya‘lamuuna",
                        translation: "Yana yo‘q, ular biladilar",
                        tafsir: "Qiyomatning haqiqat ekanligini tasdiqlash.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "أَلَمْ نَجْعَلِ ٱلْأَرْضَ مِهَٰدًۭا",
                        transcription: "Alam naj‘ali al-arda mihaadan",
                        translation: "Yerni beshik qilmadikmi?",
                        tafsir: "Allohning yerni inson uchun qulay qilgani.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَٱلْجِبَالَ أَوْتَادًۭا",
                        transcription: "Wal-jibaala awtaadan",
                        translation: "Tog‘larni qoziqlar qilmadikmi?",
                        tafsir: "Tog‘larning yerning barqarorligidagi roli.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَخَلَقْنَٰكُمْ أَزْوَٰجًۭا",
                        transcription: "Wa khalaqnaakum azwaajan",
                        translation: "Sizlarni juft-juft qilib yaratdik",
                        tafsir: "Insonning erkak va ayol sifatida yaratilishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَجَعَلْنَا نَوْمَكُمْ سُبَاتًۭا",
                        transcription: "Wa ja‘alnaa nawmakum subaatan",
                        translation: "Uyqungizni dam olish qildik",
                        tafsir: "Uyquning inson uchun ilohiy ne’mat ekanligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "وَجَعَلْنَا ٱلَّيْلَ لِبَاسًۭا",
                        transcription: "Wa ja‘alnaa al-layla libaasan",
                        translation: "Kechani libos qildik",
                        tafsir: "Kechaning tinchlik va yopuvchi xususiyati.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 79,
                    name: "An-Nazi‘at",
                    arabicName: "النازعات",
                    meaning: "Sug‘urib oluvchilar",
                    ayahCount: 46,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "وَٱلنَّٰزِعَٰتِ غَرْقًۭا",
                        transcription: "Wan-naazi‘aati gharqan",
                        translation: "Qattiq sug‘urib oluvchilar bilan qasam",
                        tafsir: "Jonlarni oluvchi farishtalar haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "وَٱلنَّٰشِطَٰتِ نَشْطًۭا",
                        transcription: "Wan-naashitaati nashtan",
                        translation: "Yumshoq tortib oluvchilar bilan qasam",
                        tafsir: "Mo‘minlarning jonini oson oluvchi farishtalar.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَٱلسَّٰبِحَٰتِ سَبْحًۭا",
                        transcription: "Was-saabihaati sabhan",
                        translation: "Suvda suzuvchilar bilan qasam",
                        tafsir: "Farishtalar yoki yulduzlarning tez harakati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "فَٱلسَّٰبِقَٰتِ سَبْقًۭا",
                        transcription: "Fas-saabiqaati sabqan",
                        translation: "Oldinga o‘tuvchilar bilan qasam",
                        tafsir: "Alloh amrini tez bajaruvchi farishtalar.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "فَٱلْمُدَبِّرَٰتِ أَمْرًۭا",
                        transcription: "Fal-mudabbiraati amran",
                        translation: "Ishlarni boshqaruvchilar bilan qasam",
                        tafsir: "Koinotni idora qiluvchi farishtalar.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٦",
                        numberLatin: "6",
                        arabic: "يَوْمَ تَرْجُفُ ٱلرَّاجِفَةُ",
                        transcription: "Yawma tarjufu ar-raajifatu",
                        translation: "Silkinuvchi silkingan kunda",
                        tafsir: "Qiyomatning birinchi surnay chalinishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "تَتْبَعُهَا ٱلرَّادِفَةُ",
                        transcription: "Tatba‘uhaa ar-raadifatu",
                        translation: "Undan keyin keluvchi keladi",
                        tafsir: "Ikkinchi surnay va qayta tirilish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "قُلُوبٌۭ يَوْمَئِذٍۢ وَاجِفَةٌۭ",
                        transcription: "Quluubun yawma’idhin waajifatun",
                        translation: "O‘sha kuni qalblar titraydi",
                        tafsir: "Qiyomatdagi qo‘rquv va dahshat.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "أَبْصَٰرُهَا خَٰشِعَةٌۭ",
                        transcription: "Absaaruhaa khaashi‘atun",
                        translation: "Ko‘zlari xoru bo‘ladi",
                        tafsir: "Qiyomatda odamlarning qo‘rquvdan pastga qarashi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "يَقُولُونَ أَءِنَّا لَمَرْدُودُونَ فِى ٱلْحَافِرَةِ",
                        transcription: "Yaquuluuna a’innaa lamarduuduuna fi al-haafirati",
                        translation: "Ular: 'Biz haqiqatdan qaytaramizmi?' deydilar",
                        tafsir: "Kofirlarning qayta tirilishga ishonmasligi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                  {
                    id: 80,
                    name: "Abasa",
                    arabicName: "عبس",
                    meaning: "Yuzini burdi",
                    ayahCount: 42,
                    place: "Makka",
                    prelude: {
                      bismillah: {
                        arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                        transcription: "Bismillahir-Rahmanir-Rahiim",
                        translation: "Mehribon va rahmli Alloh nomi bilan",
                        tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                        copySymbol: "📋"
                      }
                    },
                    ayahs: [
                      {
                        numberArabic: "١",
                        numberLatin: "1",
                        arabic: "عَبَسَ وَتَوَلَّىٰٓ",
                        transcription: "‘Abasa wa tawallaa",
                        translation: "Yuzini burdi va yuz o‘girdi",
                        tafsir: "Payg‘ambarning ko‘r odamga e’tibor bermasligi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٢",
                        numberLatin: "2",
                        arabic: "أَن جَآءَهُ ٱلْأَعْمَىٰ",
                        transcription: "An jaa’ahu al-a‘maa",
                        translation: "Chunki unga ko‘r keldi",
                        tafsir: "Abdulloh ibn Ummi Maktumning Payg‘ambarga kelishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٣",
                        numberLatin: "3",
                        arabic: "وَمَا يُدْرِيكَ لَعَلَّهُۥ يَزَّكَّىٰٓ",
                        transcription: "Wa maa yudriika la‘allahu yazakkaa",
                        translation: "Nimaligini bilasan, balki u poklanar?",
                        tafsir: "Ko‘rning iymon va poklanish imkoniyati.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٤",
                        numberLatin: "4",
                        arabic: "أَوْ يَذَّكَّرُ فَتَنفَعَهُ ٱلذِّكْرَىٰ",
                        transcription: "Aw yadhdhakkaru fatanfa‘ahu adh-dhikraa",
                        translation: "Yoki eslasa, unga zikr foyda berar",
                        tafsir: "Zikrning ko‘r kishiga foydasi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٥",
                        numberLatin: "5",
                        arabic: "أَمَّا مَنِ ٱسْتَغْنَىٰ",
                        transcription: "Ammaa mani istaghnaa",
                        translation: "Ammo o‘zini boy hisoblagan kishi",
                        tafsir: "Kofir boylarning mag‘rurligi haqida.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "ٶ",
                        numberLatin: "6",
                        arabic: "فَأَنتَ لَهُۥ تَصَدَّىٰ",
                        transcription: "Fa’anta lahu tasaddaa",
                        translation: "Sen unga e’tibor berasan",
                        tafsir: "Payg‘ambarning boy kishilarga e’tibor qaratishi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٧",
                        numberLatin: "7",
                        arabic: "وَمَا عَلَيْكَ أَلَّا يَزَّكَّىٰ",
                        transcription: "Wa maa ‘alayka allaa yazakkaa",
                        translation: "U poklanmasa, senga gunoh yo‘q",
                        tafsir: "Payg‘ambarning mas’uliyati faqat yetkazish ekanligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٨",
                        numberLatin: "8",
                        arabic: "وَأَمَّا مَن جَآءَكَ يَسْعَىٰ",
                        transcription: "Wa ammaa man jaa’aka yas‘aa",
                        translation: "Ammo senga intilib kelgan kishi",
                        tafsir: "Haqiqatni izlagan kishiga e’tibor berish.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "٩",
                        numberLatin: "9",
                        arabic: "وَهُوَ يَخْشَىٰ",
                        transcription: "Wa huwa yakhshaa",
                        translation: "Va u qo‘rqsa",
                        tafsir: "Allohdan qo‘rqqan kishining afzalligi.",
                        copySymbol: "📋"
                      },
                      {
                        numberArabic: "١٠",
                        numberLatin: "10",
                        arabic: "فَأَنتَ عَنْهُ تَلَهَّىٰ",
                        transcription: "Fa’anta ‘anhu talahhaa",
                        translation: "Sen undan o‘zingni chetga olasan",
                        tafsir: "Haqiqatni izlovchidan yuz o‘girmaslik ogohlantirilishi.",
                        copySymbol: "📋"
                      }
                    ]
                  },
                    {
                      id: 81,
                      name: "At-Takwir",
                      arabicName: "التكوير",
                      meaning: "O‘ralish",
                      ayahCount: 29,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "إِذَا ٱلشَّمْسُ كُوِّرَتْ",
                          transcription: "Idhaa ash-shamsu kuwwirat",
                          translation: "Quyosh o‘ralib yig‘ilganda",
                          tafsir: "Qiyomatda quyoshning nurini yo‘qotishi va yig‘ilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَإِذَا ٱلنُّجُومُ ٱنكَدَرَتْ",
                          transcription: "Wa idhaa an-nujuumu ankadarat",
                          translation: "Yulduzlar so‘nib tushganda",
                          tafsir: "Qiyomatda yulduzlarning o‘chishi va tarqalishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَإِذَا ٱلْجِبَالُ سُيِّرَتْ",
                          transcription: "Wa idhaa al-jibaalu suyyirat",
                          translation: "Tog‘lar yuritilganda",
                          tafsir: "Qiyomatda tog‘larning joyidan siljishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "وَإِذَا ٱلْعِشَارُ عُطِّلَتْ",
                          transcription: "Wa idhaa al-‘ishaaru ‘uttilat",
                          translation: "Tuya homiladorlar qarovsiz qolganda",
                          tafsir: "Qiyomatdagi umumiy tartibsizlik va e’tiborsizlik.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "وَإِذَا ٱلْوُحُوشُ حُشِرَتْ",
                          transcription: "Wa idhaa al-wuhuushu hushirat",
                          translation: "Yovvoyi hayvonlar yig‘ilganda",
                          tafir: "Qiyomatda barcha jonzotlarning hisob uchun yig‘ilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "وَإِذَا ٱلْبِحَارُ سُجِّرَتْ",
                          transcription: "Wa idhaa al-bihaaru sujjirat",
                          translation: "Dengizlar alanga olganda",
                          tafsir: "Qiyomatda dengizlarning yonishi va o‘zgarishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "وَإِذَا ٱلنُّفُوسُ زُوِّجَتْ",
                          transcription: "Wa idhaa an-nufuusu zuwwijat",
                          translation: "Nafslar juftlashtirilganda",
                          tafsir: "Qiyomatda odamlarning o‘z amallari bilan birlashishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "وَإِذَا ٱلْمَوْءُودَةُ سُئِلَتْ",
                          transcription: "Wa idhaa al-maw’uudatu su’ilat",
                          translation: "Diriday ko‘milgan qiz so‘ralganda",
                          tafsir: "Jaholat davrida qizlarning ko‘milishi va hisob berilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "بِأَىِّ ذَنۢبٍۢ قُتِلَتْ",
                          transcription: "Bi’ayyi dhambin qutilat",
                          translation: "Qaysi gunoh bilan o‘ldirildi?",
                          tafsir: "Adolatsiz o‘ldirilganlarning qiyomatdagi adolati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَإِذَا ٱلصُّحُفُ نُشِرَتْ",
                          transcription: "Wa idhaa as-suhufu nushirat",
                          translation: "Sahifalar yoyilganda",
                          tafsir: "Qiyomatda amal daftarlarining ochilishi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 82,
                      name: "Al-Infitar",
                      arabicName: "الإنفطار",
                      meaning: "Yorilish",
                      ayahCount: 19,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "إِذَا ٱلسَّمَآءُ ٱنفَطَرَتْ",
                          transcription: "Idhaa as-samaa’u infatarat",
                          translation: "Osmon yorilganda",
                          tafsir: "Qiyomatda osmonning yorilishi va o‘zgarishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَإِذَا ٱلْكَوَاكِبُ ٱنتَثَرَتْ",
                          transcription: "Wa idhaa al-kawaakibu intatharat",
                          translation: "Yulduzlar tarqalganda",
                          tafsir: "Qiyomatda yulduzlarning so‘nishi va tarqalishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَإِذَا ٱلْبِحَارُ فُجِّرَتْ",
                          transcription: "Wa idhaa al-bihaaru fujjirat",
                          translation: "Dengizlar otilib chiqqanda",
                          tafsir: "Qiyomatda dengizlarning o‘zgarishi va to‘lib ketishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "وَإِذَا ٱلْقُبُورُ بُعْثِرَتْ",
                          transcription: "Wa idhaa al-qubuuru bu‘thirat",
                          translation: "Qabrlar ag‘darilganda",
                          tafsir: "Qiyomatda o‘liklarning qayta tirilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "عَلِمَتْ نَفْسٌۭ مَّا قَدَّمَتْ وَأَخَّرَتْ",
                          transcription: "‘Alimat nafsun maa qaddamat wa akhkharat",
                          translation: "Har bir nafs nima qilganini va qoldirganini bildi",
                          tafsir: "Qiyomatda har kishi o‘z amallarini aniq bilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "يَٰٓأَيُّهَا ٱلْإِنسَٰنُ مَا غَرَّكَ بِرَبِّكَ ٱلْكَرِيمِ",
                          transcription: "Yaa ayyuhaa al-insaanu maa gharraka birabbika al-kariimi",
                          translation: "Ey inson, seni saxiylik qiluvchi Robbingdan nima aldadi?",
                          tafsir: "Insonning Allohga qarshi mag‘rurligi va xatosi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "ٱلَّذِى خَلَقَكَ فَسَوَّىٰكَ فَعَدَلَكَ",
                          transcription: "Alladhii khalaqaka fasawwaaka fa‘adalaka",
                          translation: "U seni yaratdi, tekis qildi va muvozanatladi",
                          tafsir: "Allohning insonni mukammal yaratgani.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "فِىٓ أَىِّ صُورَةٍۢ مَّا شَآءَ رَكَّبَكَ",
                          transcription: "Fii ayyi suuratin maa shaa’a rakkabaka",
                          translation: "Xohlagan shaklda seni tarkib qildi",
                          tafsir: "Allohning insonni istagan shaklda yaratishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "كَلَّا بَلْ تُكَذِّبُونَ بِٱلدِّينِ",
                          transcription: "Kallaa bal tukadhdhibuuna bid-diini",
                          translation: "Yo‘q, sizlar dinni (hisobni) yolg‘on deysiz",
                          tafsir: "Kofirlarning qiyomat va hisobni inkor qilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَإِنَّ عَلَيْكُمْ لَحَٰفِظِينَ",
                          transcription: "Wa inna ‘alaykum lahaafidhiina",
                          translation: "Sizlar ustingizda albatta kuzatuvchilar bor",
                          tafsir: "Farishtalarning inson amallarini yozib borishi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 83,
                      name: "Al-Mutaffifin",
                      arabicName: "المطففين",
                      meaning: "O‘lchovda kam qiluvchilar",
                      ayahCount: 36,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "وَيْلٌۭ لِّلْمُطَفِّفِينَ",
                          transcription: "Waylun lilmutaffifiina",
                          translation: "Vay holiga o‘lchovda kam qiluvchilarning!",
                          tafsir: "O‘lchov va tortida adolatsizlik qiluvchilarning ogohlantirilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "ٱلَّذِينَ إِذَا ٱكْتَالُواْ عَلَى ٱلنَّاسِ يَسْتَوْفُونَ",
                          transcription: "Alladhiina idhaa iktaaluu ‘alaa an-naasi yastawfuuna",
                          translation: "Ular odamlardan o‘lchaganda to‘liq oladilar",
                          tafsir: "Adolatsizlarning o‘z foydasiga o‘lchov qilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَإِذَا كَالُوهُمْ أَو وَّزَنُوهُمْ يُخْسِرُونَ",
                          transcription: "Wa idhaa kaaluuhum aw wazanuhum yukhsiiruuna",
                          translation: "Lekin ularga o‘lchaganda yoki tortganda kamaytiradilar",
                          tafsir: "Boshqalarga zarar yetkazib o‘lchovda kam qilish.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "أَلَا يَظُنُّ أُوْلَٰٓئِكَ أَنَّهُم مَّبْعُوثُونَ",
                          transcription: "Alaa yazunnu ulaa’ika annahum mab‘uuthuuna",
                          translation: "Ular qayta tiriladilar deb o‘ylamaydilarmi?",
                          tafsir: "Adolatsizlarning qiyomatda hisob berishini unutishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "لِيَوْمٍ عَظِيمٍۢ",
                          transcription: "Liyawmin ‘adhiimin",
                          translation: "Ulug‘ kun uchun",
                          tafsir: "Qiyomatning ulkan va muhim kun ekanligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "يَوْمَ يَقُومُ ٱلنَّاسُ لِرَبِّ ٱلْعَٰلَمِينَ",
                          transcription: "Yawma yaquumu an-naasu lirabbi al-‘aalamiina",
                          translation: "Odamlar olamlar Robbi huzurida turgan kunda",
                          tafsir: "Qiyomatda barchaning Alloh oldida hisob berishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "كَلَّآ إِنَّ كِتَٰبَ ٱلْفُجَّارِ لَفِى سِجِّينٍۢ",
                          transcription: "Kallaa inna kitaaba al-fujjaari lafii sijjiinin",
                          translation: "Yo‘q, gunohkorlarning kitobi Sijjiyn dadir",
                          tafsir: "Fojirlarning amal daftari past darajada saqlanishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "وَمَآ أَدْرَىٰكَ مَا سِجِّينٌۭ",
                          transcription: "Wa maa adraaka maa sijjiinun",
                          translation: "Sijjiyn nimaligini senga nima bildirdi?",
                          tafsir: "Sijjiynning gunohkorlar uchun qamoqxona ekanligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "كِتَٰبٌۭ مَّرْقُومٌۭ",
                          transcription: "Kitaabun marqoomun",
                          translation: "Yozilgan kitobdir",
                          tafsir: "Gunohkorlarning amallari aniq yozilgan daftar.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَيْلٌۭ يَوْمَئِذٍۢ لِّلْمُكَذِّبِينَ",
                          transcription: "Waylun yawma’idhin lilmukadhdhibiina",
                          translation: "O‘sha kuni yolg‘onchilarning holiga vay!",
                          tafsir: "Qiyomatni yolg‘on deb hisoblaganlarning azobi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 84,
                      name: "Al-Inshiqaq",
                      arabicName: "الإنشقاق",
                      meaning: "Yorilish",
                      ayahCount: 25,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "إِذَا ٱلسَّمَآءُ ٱنشَقَّتْ",
                          transcription: "Idhaa as-samaa’u inshaqqat",
                          translation: "Osmon yorilganda",
                          tafsir: "Qiyomatda osmonning ikkiga bo‘linishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ",
                          transcription: "Wa adhinat lirabbihaa wa huqqat",
                          translation: "Robbiga bo‘ysundi va haqqa yetdi",
                          tafsir: "Osmonning Alloh amriga bo‘ysunishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَإِذَا ٱلْأَرْضُ مُدَّتْ",
                          transcription: "Wa idhaa al-ardu muddat",
                          translation: "Yer yoyilganda",
                          tafsir: "Qiyomatda yerni tekislanishi va kengayishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "وَأَلْقَتْ مَا فِيهَا وَتَخَلَّتْ",
                          transcription: "Wa alqat maa fiihaa wa takhallat",
                          translation: "Ichidagini tashladi va bo‘shadi",
                          tafsir: "Yerning qabrlaridagi o‘liklarni chiqarishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "وَأَذِنَتْ لِرَبِّهَا وَحُقَّتْ",
                          transcription: "Wa adhinat lirabbihaa wa huqqat",
                          translation: "Robbiga bo‘ysundi va haqqa yetdi",
                          tafsir: "Yerning Alloh amriga bo‘ysunishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "يَٰٓأَيُّهَا ٱلْإِنسَٰنُ إِنَّكَ كَادِحٌ إِلَىٰ رَبِّكَ كَدْحًۭا",
                          transcription: "Yaa ayyuhaa al-insaanu innaka kaadihun ilaa rabbika kadhan",
                          translation: "Ey inson, sen Robbiga qattiq harakat qilib borasan",
                          tafsir: "Insonning hayotdagi harakati Alloh huzuriga qaytishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "فَأَمَّا مَنْ أُوتِىَ كِتَٰبَهُۥ بِيَمِينِهِۦ",
                          transcription: "Fa’ammaa man uutiya kitaabahu biyamiinihi",
                          translation: "Kimning kitobi o‘ng qo‘liga berilsa",
                          tafsir: "Solihlarning amal daftari o‘ng qo‘lga berilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "فَسَوْفَ يُحَاسَبُ حِسَابًۭا يَسِيرًۭا",
                          transcription: "Fasawfa yuhaasabu hisaaban yasiiran",
                          translation: "U oson hisob qilinadi",
                          tafsir: "Solihlarning qiyomatda oson hisob topishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "وَيَنقَلِبُ إِلَىٰٓ أَهْلِهِۦ مَسْرُورًۭا",
                          transcription: "Wa yanqalibu ilaa ahlihi masruuran",
                          translation: "Va xursand bo‘lib ahliga qaytadi",
                          tafsir: "Solihlarning jannatda xursand bo‘lishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَأَمَّا مَنْ أُوتِىَ كِتَٰبَهُۥ وَرَآءَ ظَهْرِهِۦ",
                          transcription: "Wa ammaa man uutiya kitaabahu waraa’a zhahrihi",
                          translation: "Kimning kitobi orqa tarafdan berilsa",
                          tafsir: "Gunohkorlarning amal daftari orqadan berilishi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 85,
                      name: "Al-Buruj",
                      arabicName: "البروج",
                      meaning: "Burjlar",
                      ayahCount: 22,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "وَٱلسَّمَآءِ ذَاتِ ٱلْبُرُوجِ",
                          transcription: "Was-samaa’i dhaati al-buruuji",
                          translation: "Burjlar sohibi osmon bilan qasam",
                          tafsir: "Osmonning yulduzlar va burjlar bilan bezatilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَٱلْيَوْمِ ٱلْمَوْعُودِ",
                          transcription: "Wal-yawmi al-maw‘uudi",
                          translation: "Va’da qilingan kun bilan qasam",
                          tafsir: "Qiyomatning muqarrar kun ekanligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَشَاهِدٍۢ وَمَشْهُودٍۢ",
                          transcription: "Wa shaahidin wa mashhuudin",
                          translation: "Shohid va shohid qilingan bilan qasam",
                          tafsir: "Farishtalar va qiyomat kunining guvohligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "قُتِلَ أَصْحَٰبُ ٱلْأُخْدُودِ",
                          transcription: "Qutila ashaabu al-ukhdudi",
                          translation: "Xandaq sohiblari la’nati bo‘lsin",
                          tafsir: "Mo‘minlarni kuydirgan zolimlarning la’nati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "ٱلنَّارِ ذَاتِ ٱلْوَقُودِ",
                          transcription: "An-naari dhaati al-waquudi",
                          translation: "Yoqilg‘i sohibi olov",
                          tafsir: "Mo‘minlarni kuydirish uchun yoqilgan olov tasviri.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "إِذْ هُمْ عَلَيْهَا قُعُودٌۭ",
                          transcription: "Idh hum ‘alayhaa qu‘uudun",
                          translation: "Ular uning atrofida o‘tirganlarida",
                          tafsir: "Zolimlarning mo‘minlarni kuydirib tomosha qilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "وَهُمْ عَلَىٰ مَا يَفْعَلُونَ بِٱلْمُؤْمِنِينَ شُهُودٌۭ",
                          transcription: "Wa hum ‘alaa maa yaf‘aluuna bilmu’miniina shuhuudun",
                          translation: "Ular mo‘minlarga qilganlariga guvoh edilar",
                          tafsir: "Zolimlarning mo‘minlarga qilgan zulmining guvohlari.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "وَمَا نَقَمُواْ مِنْهُمْ إِلَّآ أَن يُؤْمِنُواْ بِٱللَّهِ",
                          transcription: "Wa maa naqamuu minhum illaa an yu’minuu billaahi",
                          translation: "Ularni faqat Allohga iymon keltirgani uchun jazoladilar",
                          tafsir: "Mo‘minlarning faqat iymonlari uchun azoblanishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "ٱلَّذِى لَهُۥ مُلْكُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضِ",
                          transcription: "Alladhii lahu mulku as-samaawaati wal-ardi",
                          translation: "Osmonlar va yerning mulki Uniki",
                          tafsir: "Allohning koinot ustidagi mutlaq hokimiyati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "إِنَّ ٱلَّذِينَ فَتَنُواْ ٱلْمُؤْمِنِينَ وَٱلْمُؤْمِنَٰتِ",
                          transcription: "Inna alladhiina fatanuu al-mu’miniina wal-mu’minaati",
                          translation: "Mo‘minlar va mo‘minalarni sinaganlar",
                          tafsir: "Mo‘minlarni azoblaganlarning qiyomatdagi jazosi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 86,
                      name: "At-Tariq",
                      arabicName: "الطارق",
                      meaning: "Tunda keluvchi",
                      ayahCount: 17,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "وَٱلسَّمَآءِ وَٱلطَّارِقِ",
                          transcription: "Was-samaa’i wat-taariqi",
                          translation: "Osmon va tunda keluvchi bilan qasam",
                          tafsir: "Yulduz yoki tunda keluvchi nurning Alloh qudrati belgisi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَمَآ أَدْرَىٰكَ مَا ٱلطَّارِقُ",
                          transcription: "Wa maa adraaka maa at-taariqu",
                          translation: "Tunda keluvchi nimaligini senga nima bildirdi?",
                          tafsir: "Tariqning muhim va sirli ekanligini ta’kidlash.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "ٱلنَّجْمُ ٱلثَّاقِبُ",
                          transcription: "An-najmu ath-thaaqibu",
                          translation: "Yorqin yulduz",
                          tafsir: "Yorqin yulduzning osmondagi mu’jizaviy holati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "إِن كُلُّ نَفْسٍۢ لَّمَّا عَلَيْهَا حَافِظٌۭ",
                          transcription: "In kullu nafsin lammaa ‘alayhaa haafidhun",
                          translation: "Har bir nafs ustida kuzatuvchi bor",
                          tafsir: "Farishtalarning inson amallarini kuzatishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "فَلْيَنظُرِ ٱلْإِنسَٰنُ مِمَّ خُلِقَ",
                          transcription: "Falyanzuri al-insaanu mimma khuliqa",
                          translation: "Inson o‘zi nimadan yaratilganiga nazar tashlasin",
                          tafsir: "Insonning o‘z yaratilishini o‘ylashi kerakligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "خُلِقَ مِن مَّآءٍۢ دَافِقٍۢ",
                          transcription: "Khuliqa min maa’in daafiqin",
                          translation: "U otilib chiqadigan suvdan yaratildi",
                          tafsir: "Insonning nutfadan yaratilishi haqida.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "يَخْرُجُ مِنۢ بَيْنِ ٱلصُّلْبِ وَٱلتَّرَآئِبِ",
                          transcription: "Yakhruju min bayni as-sulbi wat-taraa’ibi",
                          translation: "U umurtqa pog‘onasi va ko‘krak suyaklari orasidan chiqadi",
                          tafsir: "Insonning yaratilish jarayonining tasviri.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "إِنَّهُۥ عَلَىٰ رَجْعِهِۦ لَقَادِرٌۭ",
                          transcription: "Innahu ‘alaa raj‘ihi laqaadirun",
                          translation: "U (Alloh) uni qaytarishga albatta qodirdir",
                          tafsir: "Allohning insonni qayta tiriltirish qudrati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "يَوْمَ تُبْلَى ٱلسَّرَآئِرُ",
                          transcription: "Yawma tublaa as-saraa’iru",
                          translation: "Sirlar sinovdan o‘tadigan kunda",
                          tafsir: "Qiyomatda yashirin narsalarning ochilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "فَمَا لَهُۥ مِن قُوَّةٍۢ وَلَا نَاصِرٍۢ",
                          transcription: "Famaa lahu min quwwatin wa laa naasirin",
                          translation: "Uning na kuchi, na yordamchisi bo‘ladi",
                          tafsir: "Qiyomatda insonning yolg‘iz va ojiz qolishi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 87,
                      name: "Al-A‘la",
                      arabicName: "الأعلى",
                      meaning: "Oliy",
                      ayahCount: 19,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "سَبِّحِ ٱسْمَ رَبِّكَ ٱلْأَعْلَى",
                          transcription: "Sabbihi isma rabbika al-a‘laa",
                          translation: "Oliy Robbing ismini tasbih qil",
                          tafsir: "Allohning ulug‘ligini va pokligini zikr qilish.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "ٱلَّذِى خَلَقَ فَسَوَّىٰ",
                          transcription: "Alladhii khalaqa fasawwaa",
                          translation: "U yaratdi va muvozanatladi",
                          tafsir: "Allohning koinotni mukammal yaratishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَٱلَّذِى قَدَّرَ فَهَدَىٰ",
                          transcription: "Walladhii qaddara fahadaa",
                          translation: "U taqdir qildi va yo‘l ko‘rsatdi",
                          tafsir: "Allohning taqdir va hidoyat berishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "وَٱلَّذِىٓ أَخْرَجَ ٱلْمَرْعَىٰ",
                          transcription: "Walladhii akhraja al-mar‘aa",
                          translation: "U yaylovni chiqardi",
                          tafsir: "Allohning yerdan o‘simliklar chiqarishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "فَجَعَلَهُۥ غُثَآءً أَحْوَىٰ",
                          transcription: "Faja‘alahu ghuthaa’an ahwaa",
                          translation: "Uni qora chiqindiga aylantirdi",
                          tafsir: "O‘simliklarning vaqt o‘tishi bilan qurishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "سَنُقْرِئُكَ فَلَا تَنسَىٰٓ",
                          transcription: "Sanuqri’uka falaa tansaa",
                          translation: "Seni o‘qitamiz, sen unutmaysan",
                          tafsir: "Payg‘ambarga Qur’onni o‘rgatish va uni himoya qilish.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "إِلَّا مَا شَآءَ ٱللَّهُ",
                          transcription: "Illaa maa shaa’a allaahu",
                          translation: "Alloh xohlaganidan tashqari",
                          tafsir: "Allohning xohishi bilan hamma narsa bo‘lishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "وَنُيَسِّرُكَ لِلْيُسْرَىٰ",
                          transcription: "Wa nuyassiruka lilyusraa",
                          translation: "Seni eng oson yo‘lga yordam beramiz",
                          tafsir: "Payg‘ambarga oson yo‘l (Islom) ko‘rsatilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "فَذَكِّرْ إِن نَّفَعَتِ ٱلذِّكْرَىٰ",
                          transcription: "Fadhakkir in nafa‘ati adh-dhikraa",
                          translation: "Eslat, agar eslatma foyda bersa",
                          tafsir: "Payg‘ambarning odamlarni haqqa da’vat qilishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "سَيَذَّكَّرُ مَن يَخْشَىٰ",
                          transcription: "Sayadhakkaru man yakhshaa",
                          translation: "Qo‘rqqan kishi eslaydi",
                          tafsir: "Allohdan qo‘rqqanlar zikrdan foyda ko‘radi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 88,
                      name: "Al-Ghashiya",
                      arabicName: "الغاشية",
                      meaning: "Qoplaguvchi",
                      ayahCount: 26,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "هَلْ أَتَىٰكَ حَدِيثُ ٱلْغَٰشِيَةِ",
                          transcription: "Hal ataaka hadiithu al-ghaashiyati",
                          translation: "Qoplaguvchining xabari senga keldimi?",
                          tafsir: "Qiyomatning dahshatli holatini tasvirlash.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وُجُوهٌۭ يَوْمَئِذٍۢ خَٰشِعَةٌۭ",
                          transcription: "Wujuuhun yawma’idhin khaashi‘atun",
                          translation: "O‘sha kuni yuzlar xoru bo‘ladi",
                          tafsir: "Gunohkorlarning qiyomatdagi xoru zillik holati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "عَامِلَةٌۭ نَّاصِبَةٌۭ",
                          transcription: "‘Aamilatun naasibatun",
                          translation: "Mehnat qilgan va charchagan",
                          tafsir: "Gunohkorlarning behuda harakatlari va charchoqlari.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "تَصْلَىٰ نَارًا حَامِيَةًۭ",
                          transcription: "Taslaa naaran haamiyatan",
                          translation: "Issiq olovga kiradi",
                          tafsir: "Do‘zaxdagi qattiq olovning tasviri.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "تُسْقَىٰ مِنْ عَيْنٍ ءَانِيَةٍۢ",
                          transcription: "Tusqaa min ‘aynin aaniyatin",
                          translation: "Issiq buloqdan ichiriladi",
                          tafsir: "Do‘zaxdagi issiq va azobli suv.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "لَيْسَ لَهُمْ طَعَامٌ إِلَّا مِن ضَرِيعٍۢ",
                          transcription: "Laysa lahum ta‘aamun illaa min darii‘in",
                          translation: "Ularning taomi faqat zaharli o‘tdan iborat",
                          tafsir: "Do‘zaxdagi gunohkorlarning zaharli taomi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "لَّا يُسْمِنُ وَلَا يُغْنِى مِن جُوعٍۢ",
                          transcription: "Laa yusminu wa laa yughnii min juu‘in",
                          translation: "Na semirtiradi, na ochlikdan xalos qiladi",
                          tafsir: "Do‘zax taomining foydasiz va azobli ekanligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "وُجُوهٌۭ يَوْمَئِذٍۢ نَّاعِمَةٌۭ",
                          transcription: "Wujuuhun yawma’idhin naa‘imatun",
                          translation: "O‘sha kuni yuzlar farovon bo‘ladi",
                          tafsir: "Solihlarning jannatdagi baxtiyor yuzlari.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "لِّسَعْيِهَا رَاضِيَةٌۭ",
                          transcription: "Lisa‘yihaa raadiyatan",
                          translation: "O‘z harakatidan rozi bo‘ladi",
                          tafsir: "Solihlarning amallaridan qoniqishlari.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "فِى جَنَّةٍ عَالِيَةٍۢ",
                          transcription: "Fii jannatin ‘aaliyatin",
                          translation: "Yuqori jannatda bo‘ladi",
                          tafsir: "Solihlarning jannatdagi oliy maqomi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 89,
                      name: "Al-Fajr",
                      arabicName: "الفجر",
                      meaning: "Tong",
                      ayahCount: 30,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "وَٱلْفَجْرِ",
                          transcription: "Wal-fajri",
                          translation: "Tong bilan qasam",
                          tafsir: "Tongning Alloh qudrati belgisi ekanligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَلَيَالٍ عَشْرٍۢ",
                          transcription: "Wa layaalin ‘ashrin",
                          translation: "O‘n kecha bilan qasam",
                          tafsir: "Zulhijja oyining dastlabki o‘n kechasining muqaddasligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَٱلشَّفْعِ وَٱلْوَتْرِ",
                          transcription: "Wash-shaf‘i wal-watri",
                          translation: "Juft va toq bilan qasam",
                          tafsir: "Allohning yaratgan narsalaridagi muvozanat.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "وَٱلَّيْلِ إِذَا يَسْرِ",
                          transcription: "Wal-layli idhaa yasri",
                          translation: "Kecha yurganda qasam",
                          tafsir: "Kechasi vaqtning o‘tishi Alloh qudrati belgisi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "هَلْ فِى ذَٰلِكَ قَسَمٌۭ لِّذِى حِجْرٍۢ",
                          transcription: "Hal fii dhaalika qasamun lidhii hijrin",
                          translation: "Bunda aql egasi uchun qasam bormi?",
                          tafsir: "Bu belgilarda aqlli kishi uchun o‘ylar bor.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِعَادٍ",
                          transcription: "Alam tara kayfa fa‘ala rabbuka bi‘aadin",
                          translation: "Robbing Od qavmiga nima qilganini ko‘rmadingmi?",
                          tafsir: "Od qavmining Alloh azobi bilan halok bo‘lishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "إِرَمَ ذَاتِ ٱلْعِمَادِ",
                          transcription: "Irama dhaati al-‘imaadi",
                          translation: "Ustunlar sohibi Iramga",
                          tafsir: "Od qavmining Iram shahri va qudrati.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "ٱلَّتِى لَمْ يُخْلَقْ مِثْلُهَا فِى ٱلْبِلَٰدِ",
                          transcription: "Allatii lam yukhlaq mithluhaa fi al-bilaadi",
                          translation: "Mamlakatlarda misli yaratilmagan",
                          tafsir: "Iram shahrining beqiyos ulug‘vorligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "وَثَمُودَ ٱلَّذِينَ جَابُواْ ٱلصَّخْرَ بِٱلْوَادِ",
                          transcription: "Wa thamuuda alladhiina jaabuu as-sakhra bil-waadi",
                          translation: "Vodiydagi qoyalarni o‘ygan Samudga",
                          tafsir: "Samud qavmining qoyalarni o‘yib uylar qurishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَفِرْعَوْنَ ذِى ٱلْأَوْتَادِ",
                          transcription: "Wa fir‘awna dhii al-awtaadi",
                          translation: "Qoziqlar sohibi Fir’avnga",
                          tafsir: "Fir’avnning qudrati va zolimligi tasviri.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                    {
                      id: 90,
                      name: "Al-Balad",
                      arabicName: "البلد",
                      meaning: "Shahar",
                      ayahCount: 20,
                      place: "Makka",
                      prelude: {
                        bismillah: {
                          arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                          transcription: "Bismillahir-Rahmanir-Rahiim",
                          translation: "Mehribon va rahmli Alloh nomi bilan",
                          tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                          copySymbol: "📋"
                        }
                      },
                      ayahs: [
                        {
                          numberArabic: "١",
                          numberLatin: "1",
                          arabic: "لَآ أُقْسِمُ بِهَٰذَا ٱلْبَلَدِ",
                          transcription: "Laa uqsimu bihaadhaa al-baladi",
                          translation: "Yo‘q, bu shahar bilan qasam",
                          tafsir: "Makkani muqaddas shahar sifatida ta’kidlash.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٢",
                          numberLatin: "2",
                          arabic: "وَأَنتَ حِلُّۢ بِهَٰذَا ٱلْبَلَدِ",
                          transcription: "Wa anta hillun bihaadhaa al-baladi",
                          translation: "Sen bu shaharda yashaysan",
                          tafsir: "Payg‘ambarning Makkada bo‘lishining muhimligi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٣",
                          numberLatin: "3",
                          arabic: "وَوَالِدٍۢ وَمَا وَلَدَ",
                          transcription: "Wa waalidin wa maa walada",
                          translation: "Ota va uning tug‘gani bilan qasam",
                          tafsir: "Insonning yaratilishi va naslining davomi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٤",
                          numberLatin: "4",
                          arabic: "لَقَدْ خَلَقْنَا ٱلْإِنسَٰنَ فِى كَبَدٍ",
                          transcription: "Laqad khalaqnaa al-insaana fii kabadin",
                          translation: "Biz insonni mashaqqatda yaratdik",
                          tafsir: "Inson hayotining sinov va mashaqqat bilan kechishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٥",
                          numberLatin: "5",
                          arabic: "أَيَحْسَبُ أَن لَّن يَقْدِرَ عَلَيْهِ أَحَدٌۭ",
                          transcription: "Ayahsabu an lan yaqdira ‘alayhi ahadun",
                          translation: "U hech kim uni yengolmaydi deb o‘ylaydimi?",
                          tafsir: "Insonning mag‘rur bo‘lib Alloh qudratini unutishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٦",
                          numberLatin: "6",
                          arabic: "يَقُولُ أَهْلَكْتُ مَالًۭا لُّبَدًۭا",
                          transcription: "Yaquulu ahlaktu maalan lubadan",
                          translation: "U: 'Ko‘p mol sarfladim' deydi",
                          tafsir: "Insonning mol-mulki bilan mag‘rurlanishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٧",
                          numberLatin: "7",
                          arabic: "أَيَحْسَبُ أَن لَّمْ يَرَهُ أَحَدٌ",
                          transcription: "Ayahsabu an lam yarahu ahadun",
                          translation: "U hech kim uni ko‘rmadi deb o‘ylaydimi?",
                          tafsir: "Allohning inson amallarini doimo ko‘rishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٨",
                          numberLatin: "8",
                          arabic: "أَلَمْ نَجْعَل لَّهُ عَيْنَيْنِ",
                          transcription: "Alam naj‘al lahu ‘aynayni",
                          translation: "Unga ikki ko‘z bermadikmi?",
                          tafsir: "Allohning insonga ko‘rish ne’matini berishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "٩",
                          numberLatin: "9",
                          arabic: "وَلِسَانًۭا وَشَفَتَيْنِ",
                          transcription: "Wa lisaanan wa shafatayni",
                          translation: "Til va ikki lab bermadikmi?",
                          tafsir: "Allohning insonga nutq va so‘z ne’matini berishi.",
                          copySymbol: "📋"
                        },
                        {
                          numberArabic: "١٠",
                          numberLatin: "10",
                          arabic: "وَهَدَيْنَٰهُ ٱلنَّجْدَيْنِ",
                          transcription: "Wa hadaynaahu an-najdayni",
                          translation: "Unga ikki yo‘lni ko‘rsatmadikmi?",
                          tafsir: "Allohning insonga yaxshilik va yomonlik yo‘llarini ko‘rsatishi.",
                          copySymbol: "📋"
                        }
                      ]
                    },
                      {
                        id: 91,
                        name: "Ash-Shams",
                        arabicName: "الشمس",
                        meaning: "Quyosh",
                        ayahCount: 15,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "وَٱلشَّمْسِ وَضُحَىٰهَا",
                            transcription: "Wash-shamsi wa duhaahaa",
                            translation: "Quyosh va uning nuri bilan qasam",
                            tafsir: "Quyoshning yorug‘ligi Allohning qudrati belgisi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَٱلْقَمَرِ إِذَا تَلَىٰهَا",
                            transcription: "Wal-qamari idhaa talaahaa",
                            translation: "Oy va uning quyoshga ergashi bilan qasam",
                            tafsir: "Oyning quyoshga ergashi koinotdagi tartibni ko‘rsatadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "وَٱلنَّهَارِ إِذَا جَلَّىٰهَا",
                            transcription: "Wan-nahaari idhaa jallaahaa",
                            translation: "Kun va uning yoritishi bilan qasam",
                            tafsir: "Kunduzning yorug‘ligi Allohning ne’matidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "وَٱلَّيْلِ إِذَا يَغْشَىٰهَا",
                            transcription: "Wal-layli idhaa yaghshaahaa",
                            translation: "Kecha va uning qoplashi bilan qasam",
                            tafsir: "Kechaning zulmati Allohning hikmatidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "وَٱلسَّمَآءِ وَمَا بَنَىٰهَا",
                            transcription: "Was-samaa’i wa maa banaahaa",
                            translation: "Osmon va uni qurgan Zot bilan qasam",
                            tafsir: "Osmonning muhtashamligi Allohning qudratini aks ettiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "وَٱلْأَرْضِ وَمَا طَحَىٰهَا",
                            transcription: "Wal-ardi wa maa tahaahaa",
                            translation: "Yer va uni yoygan Zot bilan qasam",
                            tafsir: "Yerning kengligi va yaratilishi Allohning qudratidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "وَنَفْسٍۢ وَمَا سَوَّىٰهَا",
                            transcription: "Wa nafsin wa maa sawwaahaa",
                            translation: "Nafs va uni muvozanat qilgan Zot bilan qasam",
                            tafsir: "Inson nafsining yaratilishi va muvozanati haqida.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "فَأَلْهَمَهَا فُجُورَهَا وَتَقْوَىٰهَا",
                            transcription: "Fa’alhamahaa fujuurahaa wa taqwaahaa",
                            translation: "Unga yomonlik va taqvodorlikni ilhom qildi",
                            tafsir: "Alloh inson nafsiga yaxshilik va yomonlikni farqlash qobiliyatini bergan.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٩",
                            numberLatin: "9",
                            arabic: "قَدْ أَفْلَحَ مَن زَكَّىٰهَا",
                            transcription: "Qad aflaha man zakkaahaa",
                            translation: "Kim uni poklasa, albatta muvaffaq bo‘ldi",
                            tafsir: "Nafsni poklash orqali najot topish.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٠",
                            numberLatin: "10",
                            arabic: "وَقَدْ خَابَ مَن دَسَّىٰهَا",
                            transcription: "Wa qad khaaba man dassaahaa",
                            translation: "Kim uni iflos qilsa, albatta zarar ko‘rdi",
                            tafsir: "Nafsni gunoh bilan bulg‘ash zarar keltiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١١",
                            numberLatin: "11",
                            arabic: "كَذَّبَتْ ثَمُودُ بِطَغْوَىٰهَآ",
                            transcription: "Kadhdhabat thamuudu bitagwaahaa",
                            translation: "Samud qavmi haddan oshganligi sababli yolg‘on dedi",
                            tafsir: "Samud qavmining isyonkorligi va payg‘ambarni inkor qilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٢",
                            numberLatin: "12",
                            arabic: "إِذِ ٱنۢبَعَثَ أَشْقَىٰهَا",
                            transcription: "Idhi inba‘atha ashqaahaa",
                            translation: "Ularning eng baxtsizi o‘rnidan turdi",
                            tafsir: "Samud qavmining eng yomon odami tuya haqida fitna keltirdi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٣",
                            numberLatin: "13",
                            arabic: "فَقَالَ لَهُمْ رَسُولُ ٱللَّهِ نَاقَةَ ٱللَّهِ وَسُقْيَٰهَا",
                            transcription: "Faqaala lahum rasuulu allaahi naaqata allaahi wa suqyaahaa",
                            translation: "Allohning elchisi ularga: 'Allohning tuyasi va uning suv ichishi' dedi",
                            tafsir: "Payg‘ambar Solihning tuyani himoya qilish haqidagi ogohlantirishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٤",
                            numberLatin: "14",
                            arabic: "فَكَذَّبُوهُ فَعَقَرُوهَا فَدَمْدَمَ عَلَيْهِمْ رَبُّهُم بِذَنۢبِهِمْ فَسَوَّىٰهَا",
                            transcription: "Fakadhdhabuuhu fa‘aqaruhaa fadamdama ‘alayhim rabbuhum bidhanbihim fasawwaahaa",
                            translation: "Ular uni yolg‘on dedilar va tuyani so‘yishdi, Robbi ularni gunohlari uchun yo‘q qildi va tekisladi",
                            tafsir: "Samudning tuyani o‘ldirishi va Allohning azobi bilan halok bo‘lishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٥",
                            numberLatin: "15",
                            arabic: "وَلَا يَخَافُ عُقْبَٰهَا",
                            transcription: "Wa laa yakhaafu ‘uqbaahaa",
                            translation: "Va U (Alloh) uning oqibatidan qo‘rqmaydi",
                            tafsir: "Allohning adolatli jazosidan hech kim qochib qutula olmaydi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 92,
                        name: "Al-Layl",
                        arabicName: "الليل",
                        meaning: "Kecha",
                        ayahCount: 21,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "وَٱلَّيْلِ إِذَا يَغْشَىٰ",
                            transcription: "Wal-layli idhaa yaghshaa",
                            translation: "Kecha va uning qoplashi bilan qasam",
                            tafsir: "Kechaning zulmati Allohning qudrati belgisidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَٱلنَّهَارِ إِذَا تَجَلَّىٰ",
                            transcription: "Wan-nahaari idhaa tajallaa",
                            translation: "Kun va uning yorishishi bilan qasam",
                            tafsir: "Kunduzning yorug‘ligi Allohning ne’matidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "وَمَا خَلَقَ ٱلذَّكَرَ وَٱلْأُنثَىٰٓ",
                            transcription: "Wa maa khalaqa adh-dhakara wal-unthaa",
                            translation: "Erkak va ayolni yaratgan Zot bilan qasam",
                            tafsir: "Allohning erkak va ayolni yaratishi koinotdagi muvozanatni ko‘rsatadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "إِنَّ سَعْيَكُمْ لَشَتَّىٰ",
                            transcription: "Inna sa‘yakum lashattaa",
                            translation: "Albatta, sizning harakatlaringiz turlichadir",
                            tafsir: "Odamlarning harakatlari yaxshilik va yomonlik yo‘lida farqlanadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "فَأَمَّا مَنْ أَعْطَىٰ وَٱتَّقَىٰ",
                            transcription: "Fa’ammaa man a‘taa wattaqaa",
                            translation: "Kim (sadaqa) berdi va taqvo qildi",
                            tafsir: "Sadaqa berish va Allohdan qo‘rqish yaxshi amaldir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "وَصَدَّقَ بِٱلْحُسْنَىٰ",
                            transcription: "Wa saddaqa bil-husnaa",
                            translation: "Va eng yaxshi narsani tasdiqladi",
                            tafsir: "Haqiqat va iymonni tasdiqlash muvaffaqiyat kalitidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "فَسَنُيَسِّرُهُۥ لِلْيُسْرَىٰ",
                            transcription: "Fasanuyassiruhu lilyusraa",
                            translation: "Biz uni oson yo‘lga yordam beramiz",
                            tafsir: "Yaxshilik qilganlarga Alloh oson yo‘l ko‘rsatadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "وَأَمَّا مَنۢ بَخِلَ وَٱسْتَغْنَىٰ",
                            transcription: "Wa ammaa man bakhila wastaghnaa",
                            translation: "Kim baxillik qildi va o‘zini boy deb bildi",
                            tafsir: "Baxillik va mag‘rurlik yomon xislatlardir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٩",
                            numberLatin: "9",
                            arabic: "وَكَذَّبَ بِٱلْحُسْنَىٰ",
                            transcription: "Wa kadhdhaba bil-husnaa",
                            translation: "Va eng yaxshi narsani yolg‘on dedi",
                            tafsir: "Haqiqatni inkor qilish odamni adashtiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٠",
                            numberLatin: "10",
                            arabic: "فَسَنُيَسِّرُهُۥ لِلْعُسْرَىٰ",
                            transcription: "Fasanuyassiruhu lil-‘usraa",
                            translation: "Biz uni qiyin yo‘lga yordam beramiz",
                            tafsir: "Yomonlik qilganlarga Alloh qiyin yo‘l ko‘rsatadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١١",
                            numberLatin: "11",
                            arabic: "وَمَا يُغْنِى عَنْهُ مَالُهُۥٓ إِذَا تَرَدَّىٰ",
                            transcription: "Wa maa yughnii ‘anhu maalahu idhaa taraddaa",
                            translation: "U yiqilganda mol-mulki unga foyda bermaydi",
                            tafsir: "Mol-mulk qiyomatda foydasiz bo‘ladi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٢",
                            numberLatin: "12",
                            arabic: "إِنَّ عَلَيْنَا لَٱلْهُدَىٰ",
                            transcription: "Inna ‘alaynaa lal-hudaa",
                            translation: "Albatta, hidoyat bizning zimmamizdadir",
                            tafsir: "Alloh hidoyat beruvchi yagona Zotdir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٣",
                            numberLatin: "13",
                            arabic: "وَإِنَّ لَنَا لَلْءَاخِرَةَ وَٱلْأُولَىٰ",
                            transcription: "Wa inna lanaa lal-aakhirata wal-uulaa",
                            translation: "Albatta, oxirat va dunyo biznikidir",
                            tafsir: "Alloh dunyo va oxiratning egasidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٤",
                            numberLatin: "14",
                            arabic: "فَأَنذَرْتُكُمْ نَارًۭا تَلَظَّىٰ",
                            transcription: "Fa’andhartukum naaran talazhaa",
                            translation: "Sizlarni alangali olovdan ogohlantirdim",
                            tafsir: "Do‘zaxning dahshatli olovi haqida ogohlantirish.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٥",
                            numberLatin: "15",
                            arabic: "لَا يَصْلَىٰهَآ إِلَّا ٱلْأَشْقَى",
                            transcription: "Laa yaslaahaa illaa al-ashqaa",
                            translation: "Unga faqat eng baxtsiz kishi kiradi",
                            tafsir: "Do‘zaxga eng yomon odamlar kiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٦",
                            numberLatin: "16",
                            arabic: "ٱلَّذِى كَذَّبَ وَتَوَلَّىٰ",
                            transcription: "Alladhii kadhdhaba wa tawallaa",
                            translation: "U yolg‘on dedi va yuz o‘girdi",
                            tafsir: "Haqiqatni inkor qilib, Allohdan yuz o‘girganlar do‘zaxga kiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٧",
                            numberLatin: "17",
                            arabic: "وَسَيُجَنَّبُهَا ٱلْأَتْقَى",
                            transcription: "Wa sayujannabuhaa al-atqaa",
                            translation: "Eng taqvodor kishi undan saqlanadi",
                            tafsir: "Taqvodorlar do‘zaxdan himoya qilinadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٨",
                            numberLatin: "18",
                            arabic: "ٱلَّذِى يُؤْتِى مَالَهُۥ يَتَزَكَّىٰ",
                            transcription: "Alladhii yu’tii maalahu yatazakkaa",
                            translation: "U molini berib poklanadi",
                            tafsir: "Sadaqa berish orqali nafsni poklash.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٩",
                            numberLatin: "19",
                            arabic: "وَمَا لِأَحَدٍ عِندَهُۥ مِن نِّعْمَةٍۢ تُجْزَىٰٓ",
                            transcription: "Wa maa li’ahadin ‘indahu min ni‘matin tujzaa",
                            translation: "Uning yonida hech kimga qaytariladigan ne’mat yo‘q",
                            tafsir: "Sadaqa faqat Alloh rizoligi uchun beriladi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢٠",
                            numberLatin: "20",
                            arabic: "إِلَّا ٱبْتِغَآءَ وَجْهِ ٱللَّهِ",
                            transcription: "Illaa ibtighaa’a wajhi allaahi",
                            translation: "Faqat Allohning yuzini (rizoligini) istash uchun",
                            tafsir: "Amallar faqat Allohning roziligi uchun qilinadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢١",
                            numberLatin: "21",
                            arabic: "وَلَسَوْفَ يَرْضَىٰ",
                            transcription: "Wa lasawfa yardaa",
                            translation: "Va albatta u rozi bo‘ladi",
                            tafsir: "Alloh taqvodor bandadan rozi bo‘ladi va unga jannat beradi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 93,
                        name: "Ad-Duha",
                        arabicName: "الضحى",
                        meaning: "Kunduz",
                        ayahCount: 11,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "وَٱلضُّحَىٰ",
                            transcription: "Wad-duhaa",
                            translation: "Kunduz bilan qasam",
                            tafsir: "Kunduzning yorug‘ligi Allohning ne’matidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَٱلَّيْلِ إِذَا سَجَىٰ",
                            transcription: "Wal-layli idhaa sajaa",
                            translation: "Kecha va uning sokinligi bilan qasam",
                            tafsir: "Kechaning tinchligi Allohning hikmatidir.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
                            transcription: "Maa wadda‘aka rabbuka wa maa qalaa",
                            translation: "Robbing seni tark etmadi va nafratlanmadi",
                            tafsir: "Payg‘ambarga vahiyning kechikishi tashvishlanmaslik kerakligini bildiradi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "وَلَلْءَاخِرَةُ خَيْرٌۭ لَّكَ مِنَ ٱلْأُولَىٰ",
                            transcription: "Wa lal-aakhiratu khayrun laka mina al-uulaa",
                            translation: "Albatta, oxirat sen uchun dunyodan yaxshiroqdir",
                            tafsir: "Oxisratning dunyodan afzal ekanligi tasdiqlanadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "ٵ",
                            numberLatin: "5",
                            arabic: "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ",
                            transcription: "Wa lasawfa yu‘tiika rabbuka fatardaa",
                            translation: "Robbing senga beradi va sen rozi bo‘lasan",
                            tafsir: "Alloh Payg‘ambarga ko‘p ne’matlar berib, uni rozi qiladi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "أَلَمْ يَجِدْكَ يَتِيمًۭا فَـَٔاوَىٰ",
                            transcription: "Alam yajidka yatiiman fa’aawaa",
                            translation: "Seni yetim topib, panoh bermadimi?",
                            tafsir: "Allohning Payg‘ambarni yetimligida himoya qilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "وَوَجَدَكَ ضَآلًّۭا فَهَدَىٰ",
                            transcription: "Wa wajadaka daallan fahadaa",
                            translation: "Seni adashgan topib, hidoyat qilmadimi?",
                            tafsir: "Allohning Payg‘ambarni haq yo‘lga yo‘llashi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "وَوَجَدَكَ عَآئِلًۭا فَأَغْنَىٰ",
                            transcription: "Wa wajadaka ‘aa’ilan fa’aghnaa",
                            translation: "Seni muhtoj topib, boy qilmadimi?",
                            tafsir: "Allohning Payg‘ambarni muhtojlikdan xalos qilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٩",
                            numberLatin: "9",
                            arabic: "فَأَمَّا ٱلْيَتِيمَ فَلَا تَقْهَرْ",
                            transcription: "Fa’ammaa al-yatiima falaa taqhar",
                            translation: "Yetimga zulm qilma",
                            tafsir: "Yetimlarga yaxshi muomala qilish buyuriladi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١٠",
                            numberLatin: "10",
                            arabic: "وَأَمَّا ٱلسَّآئِلَ فَلَا تَنْهَرْ",
                            transcription: "Wa ammaa as-saa’ila falaa tanhar",
                            translation: "So‘rovchini haydama",
                            tafsir: "Muhtojlarga yordam berish va ularni rad qilmaslik.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "١١",
                            numberLatin: "11",
                            arabic: "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ",
                            transcription: "Wa ammaa bini‘mati rabbika fahaddith",
                            translation: "Robbingning ne’mati haqida gapir",
                            tafsir: "Allohning ne’matlarini zikr qilish va shukr qilish.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 94,
                        name: "Ash-Sharh",
                        arabicName: "الشرح",
                        meaning: "Kengaytirish",
                        ayahCount: 8,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ",
                            transcription: "Alam nashrah laka sadraka",
                            translation: "Sening ko‘ksingni kengaytirmadikmi?",
                            tafsir: "Allohning Payg‘ambarning ko‘ksini islom va vahiy bilan kengaytirishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَوَضَعْنَا عَنكَ وِزْرَكَ",
                            transcription: "Wa wada‘naa ‘anka wizraka",
                            transcription: "Wa wada‘naa ‘anka wizraka",
                            translation: "Sendan yukingni olib tashlamadikmi?",
                            tafsir: "Allohning Payg‘ambarni gunoh va tashvishlardan xalos qilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "ٱلَّذِىٓ أَنقَضَ ظَهْرَكَ",
                            transcription: "Alladhii anqada zahraka",
                            translation: "U sening belingni ezgan edi",
                            tafir: "Og‘ir yuk Payg‘ambarni charchatgan edi, lekin Alloh uni yengillashtirdi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "وَرَفَعْنَا لَكَ ذِكْرَكَ",
                            transcription: "Wa rafa‘naa laka dhikraka",
                            translation: "Sening zikringni baland qilmadikmi?",
                            tafsir: "Alloh Payg‘ambarning nomini ulug‘ladi va doimo zikr qilinadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
                            transcription: "Fa’inna ma‘a al-‘usri yusran",
                            translation: "Albatta, qiyinchilik bilan birga yengillik bordir",
                            tafsir: "Har bir qiyinchilikdan keyin yengillik kelishi haqida tasalli.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
                            transcription: "Inna ma‘a al-‘usri yusran",
                            translation: "Albatta, qiyinchilik bilan birga yengillik bordir",
                            tafsir: "Yengillikning muqarrar kelishi takrorlanib ta’kidlanadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "فَإِذَا فَرَغْتَ فَٱنصَبْ",
                            transcription: "Fa’idhaa faraghta fansab",
                            translation: "Bo‘shaganda (ibodatda) jiddiy bo‘l",
                            tafsir: "Vazifalarni bajarib bo‘lgach, Allohga ibodat qilish buyuriladi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "وَإِلَىٰ رَبِّكَ فَٱرْغَبْ",
                            transcription: "Wa ilaa rabbika farghab",
                            translation: "Robbingga yuzlan va Undan so‘ra",
                            tafsir: "Allohga tavakkul qilib, Undan yordam so‘rash kerak.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 95,
                        name: "At-Tin",
                        arabicName: "التين",
                        meaning: "Anjir",
                        ayahCount: 8,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "وَٱلتِّينِ وَٱلزَّيْتُونِ",
                            transcription: "Wat-tiini waz-zaytuuni",
                            translation: "Anjir va zaytun bilan qasam",
                            tafsir: "Anjir va zaytun muqaddas ne’matlar sifatida zikr qilinadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَطُورِ سِينِينَ",
                            transcription: "Wa tuuri siiniina",
                            translation: "Sino tog‘i bilan qasam",
                            tafsir: "Sino tog‘i Muso (a.s.)ga vahiy kelgan muqaddas joy.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "وَهَٰذَا ٱلْبَلَدِ ٱلْأَمِينِ",
                            transcription: "Wa haadhaa al-baladi al-amiini",
                            translation: "Bu xavfsiz shahar bilan qasam",
                            tafsir: "Makkaning muqaddas va xavfsiz shahar sifatida ta’kidi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "لَقَدْ خَلَقْنَا ٱلْإِنسَٰنَ فِىٓ أَحْسَنِ تَقْوِيمٍۢ",
                            transcription: "Laqad khalaqnaa al-insaana fii ahsani taqwiimin",
                            translation: "Biz insonni eng yaxshi shaklda yaratdik",
                            tafsir: "Insonning jismoniy va ma’naviy jihatdan mukammal yaratilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "ثُمَّ رَدَدْنَٰهُ أَسْفَلَ سَٰفِلِينَ",
                            transcription: "Thumma radadnaahu asfala saafiliina",
                            translation: "So‘ng uni eng past darajaga tushirdik",
                            tafsir: "Iymonsizlik va gunoh tufayli insonning past darajaga tushishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "إِلَّا ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ فَلَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍۢ",
                            transcription: "Illaa alladhiina aamanuu wa ‘amiluu as-saalihaati falahum ajrun ghayru mamnuunin",
                            translation: "Iymon keltirib, yaxshi amallar qilganlar bundan mustasno, ularga uzluksiz mukofot bor",
                            tafsir: "Iymon va solih amal bilan inson oliy maqomga erishadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "فَمَا يُكَذِّبُكَ بَعْدُ بِٱلدِّينِ",
                            transcription: "Famaa yukadhdhibuka ba‘du bid-diini",
                            translation: "Endi seni din (qiyomat) haqida nima yolg‘onchi qiladi?",
                            tafsir: "Qiyomatning haqiqat ekanligini inkor qilishning asossizligi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "أَلَيْسَ ٱللَّهُ بِأَحْكَمِ ٱلْحَٰكِمِينَ",
                            transcription: "Alaysa allaahu bi’ahkami al-haakimiina",
                            translation: "Alloh hukm qiluvchilarning eng adolatlisi emasmi?",
                            tafsir: "Allohning adolatli hukmronligi ta’kidlanadi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                          {
                            id: 96,
                            name: "Al-Alaq",
                            arabicName: "العلق",
                            meaning: "Laxta",
                            ayahCount: 19,
                            place: "Makka",
                            prelude: {
                              bismillah: {
                                arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                                transcription: "Bismillahir-Rahmanir-Rahiim",
                                translation: "Mehribon va rahmli Alloh nomi bilan",
                                tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                                copySymbol: "📋"
                              }
                            },
                            ayahs: [
                              {
                                numberArabic: "١",
                                numberLatin: "1",
                                arabic: "ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ",
                                transcription: "Iqra’ bismi rabbika alladhii khalaqa",
                                translation: "Robbing nomi bilan o‘qi, U yaratdi",
                                tafsir: "Payg‘ambarga birinchi vahiy sifatida o‘qish buyuriladi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٢",
                                numberLatin: "2",
                                arabic: "خَلَقَ ٱلْإِنسَٰنَ مِنْ عَلَقٍ",
                                transcription: "Khalaqa al-insaana min ‘alaqin",
                                translation: "Insonni laxtadan yaratdi",
                                tafsir: "Insonning oddiy laxtadan yaratilishi Allohning qudratini ko‘rsatadi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٣",
                                numberLatin: "3",
                                arabic: "ٱقْرَأْ وَرَبُّكَ ٱلْأَكْرَمُ",
                                transcription: "Iqra’ wa rabbuka al-akramu",
                                translation: "O‘qi, Robbing eng saxiydir",
                                tafsir: "Allohning saxiy va ilim beruvchi Zot ekanligi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٤",
                                numberLatin: "4",
                                arabic: "ٱلَّذِى عَلَّمَ بِٱلْقَلَمِ",
                                transcription: "Alladhii ‘allama bil-qalami",
                                translation: "U qalam bilan o‘rgatdi",
                                tafsir: "Allohning insonga yozish orqali ilim berishi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٥",
                                numberLatin: "5",
                                arabic: "عَلَّمَ ٱلْإِنسَٰنَ مَا لَمْ يَعْلَمْ",
                                transcription: "‘Allama al-insaana maa lam ya‘lam",
                                translation: "Insonga bilmagan narsasini o‘rgatdi",
                                tafsir: "Allohning insonga ilim va bilim bergani.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٦",
                                numberLatin: "6",
                                arabic: "كَلَّآ إِنَّ ٱلْإِنسَٰنَ لَيَطْغَىٰٓ",
                                transcription: "Kallaa inna al-insaana layatghaa",
                                translation: "Yo‘q, albatta inson haddan oshadi",
                                tafsir: "Insonning mag‘rurligi va isyonkorligi haqida ogohlantirish.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٧",
                                numberLatin: "7",
                                arabic: "أَن رَّءَاهُ ٱسْتَغْنَىٰٓ",
                                transcription: "An ra’aahu istaghnaa",
                                translation: "Chunki u o‘zini boy deb bildi",
                                tafsir: "Insonning mol-mulk tufayli mag‘rur bo‘lishi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٨",
                                numberLatin: "8",
                                arabic: "إِنَّ إِلَىٰ رَبِّكَ ٱلرُّجْعَىٰ",
                                transcription: "Inna ilaa rabbika ar-ruj‘aa",
                                translation: "Albatta, Robbingga qaytish bordir",
                                tafsir: "Hamma Alloh huzuriga qaytadi va hisob beradi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "٩",
                                numberLatin: "9",
                                arabic: "أَرَءَيْتَ ٱلَّذِى يَنْهَىٰ",
                                transcription: "Ara’ayta alladhii yanhaa",
                                translation: "Namoz o‘qishdan man qilgan kimsani ko‘rdingmi?",
                                tafsir: "Ibodatni man qilgan kishining holati haqida so‘roq.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٠",
                                numberLatin: "10",
                                arabic: "عَبْدًا إِذَا صَلَّىٰٓ",
                                transcription: "‘Abdan idhaa sallaa",
                                translation: "Bir bandani namoz o‘qishdan man qiladi",
                                tafsir: "Abu Jahlnamoz o‘qishdan to‘sishga urinishi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١١",
                                numberLatin: "11",
                                arabic: "أَرَءَيْتَ إِن كَانَ عَلَى ٱلْهُدَىٰٓ",
                                transcription: "Ara’ayta in kaana ‘alaa al-hudaa",
                                translation: "Agar u (banda) hidoyatda bo‘lsa-chi?",
                                tafsir: "Hidoyatdagi bandani man qilishning noto‘g‘riligi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٢",
                                numberLatin: "12",
                                arabic: "أَوْ أَمَرَ بِٱلتَّقْوَىٰٓ",
                                transcription: "Aw amara bit-taqwaa",
                                translation: "Yoki taqvoga buyursa-chi?",
                                tafsir: "Taqvo va yaxshilikni targ‘ib qilgan odamning haqligi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٣",
                                numberLatin: "13",
                                arabic: "أَرَءَيْتَ إِن كَذَّبَ وَتَوَلَّىٰ",
                                transcription: "Ara’ayta in kadhdhaba wa tawallaa",
                                translation: "Agar u yolg‘on desa va yuz o‘girsa-chi?",
                                tafsir: "Haqiqatni inkor qilgan kishining oqibati haqida ogohlantirish.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٤",
                                numberLatin: "14",
                                arabic: "أَلَمْ يَعْلَمْ بِأَنَّ ٱللَّهَ يَرَىٰ",
                                transcription: "Alam ya‘lam bi’anna allaaha yaraa",
                                translation: "U Allohning ko‘rishini bilmadimi?",
                                tafsir: "Allohning hamma narsani ko‘ruvchi ekanligi haqida eslatma.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٥",
                                numberLatin: "15",
                                arabic: "كَلَّا لَئِن لَّمْ يَنتَهِ لَنَسْفَعًۢا بِٱلنَّاصِيَةِ",
                                transcription: "Kallaa la’in lam yantahi lanasfa‘an bin-naasiyati",
                                translation: "Yo‘q, agar u to‘xtamasa, albatta peshonasidan tortamiz",
                                tafsir: "Zolimning jazo topishi haqida ogohlantirish.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٦",
                                numberLatin: "16",
                                arabic: "نَاصِيَةٍۢ كَٰذِبَةٍ خَاطِئَةٍۢ",
                                transcription: "Naasiyatin kaadhibatin khaati’atin",
                                translation: "Yolg‘onchi va gunohkor peshona",
                                tafsir: "Zolimning yolg‘on va gunohkorligi ta’kidlanadi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٧",
                                numberLatin: "17",
                                arabic: "فَلْيَدْعُ نَادِيَهُۥ",
                                transcription: "Falyad‘u naadiyahu",
                                translation: "U o‘z jamoasini chaqirsin",
                                tafsir: "Zolimning yordam so‘rashga urinishi foydasizligi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٨",
                                numberLatin: "18",
                                arabic: "سَنَدْعُ ٱلزَّبَانِيَةَ",
                                transcription: "Sanad‘u az-zabaaniyata",
                                translation: "Biz zaboniyalarni (do‘zax posbonlarini) chaqiramiz",
                                tafsir: "Allohning do‘zax posbonlari zolimni jazolaydi.",
                                copySymbol: "📋"
                              },
                              {
                                numberArabic: "١٩",
                                numberLatin: "19",
                                arabic: "كَلَّا لَا تُطِعْهُ وَٱسْجُدْ وَٱقْتَرِب",
                                transcription: "Kallaa laa tuti‘hu wasjud waqtarib",
                                translation: "Yo‘q, unga itoat qilma, sajda qil va (Allohga) yaqinlash",
                                tafsir: "Zolimga ergashmaslik va Allohga ibodat qilish buyuriladi. Bu oyat sajda oyatidir.",
                                copySymbol: "🕋"
                              }
                            ]
                          },
                      {
                        id: 97,
                        name: "Al-Qadr",
                        arabicName: "القدر",
                        meaning: "Qadr",
                        ayahCount: 5,
                        place: "Makka",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ",
                            transcription: "Innaa anzalnaahu fii laylati al-qadri",
                            translation: "Biz uni (Qur’oni) Qadr kechasida nozil qildik",
                            tafsir: "Qur’onning Qadr kechasida nozil bo‘lishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَمَآ أَدْرَىٰكَ مَا لَيْلَةُ ٱلْقَدْرِ",
                            transcription: "Wa maa adraaka maa laylatu al-qadri",
                            translation: "Qadr kechasi nimaligini senga nima bildirdi?",
                            tafsir: "Qadr kechasining ulug‘ligini ta’kidlash.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "لَيْلَةُ ٱلْقَدْرِ خَيْرٌۭ مِّنْ أَلْفِ شَهْرٍۢ",
                            transcription: "Laylatu al-qadri khayrun min alfi shahrin",
                            translation: "Qadr kechasi ming oydan yaxshiroqdir",
                            tafsir: "Qadr kechasining ming oy ibodatidan afzal ekanligi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "تَنَزَّلُ ٱلْمَلَٰٓئِكَةُ وَٱلرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍۢ",
                            transcription: "Tanazzalu al-malaa’ikatu war-ruuhu fiihaa bi’idhni rabbihim min kulli amrin",
                            translation: "Unda farishtalar va Ruh Robblari izni bilan har bir ish uchun tushadi",
                            tafsir: "Qadr kechasida farishtalar va Jibrilning tushishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "سَلَٰمٌ هِىَ حَتَّىٰ مَطْلَعِ ٱلْفَجْرِ",
                            transcription: "Salaamun hiya hattaa matla‘i al-fajri",
                            translation: "U tong otguncha tinchlikdir",
                            tafsir: "Qadr kechasining tinchlik va xavfsizlik kechasi ekanligi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 98,
                        name: "Al-Bayyinah",
                        arabicName: "البينة",
                        meaning: "Oydinlik",
                        ayahCount: 8,
                        place: "Madina",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "لَمْ يَكُنِ ٱلَّذِينَ كَفَرُواْ مِنْ أَهْلِ ٱلْكِتَٰبِ وَٱلْمُشْرِكِينَ مُنفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ ٱلْبَيِّنَةُ",
                            transcription: "Lam yakuni alladhiina kafaruu min ahli al-kitaabi wal-mushrikiina munfakkina hattaa ta’tiyahumu al-bayyinatu",
                            translation: "Kitob ahli va mushriklardan kofir bo‘lganlar oydin dalil kelgunicha to‘xtamas edilar",
                            tafsir: "Kofirlarning haqiqat kelgunicha inkor qilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "رَسُولٌۭ مِّنَ ٱللَّهِ يَتْلُواْ صُحُفًۭا مُّطَهَّرَةًۭ",
                            transcription: "Rasoolun mina allaahi yatluu suhufan mutahharatan",
                            translation: "Allohdan kelgan elchi pok sahifalarni o‘qiydi",
                            tafsir: "Payg‘ambar va Qur’onning pokligi haqida.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "فِيهَا كُتُبٌۭ قَيِّمَةٌۭ",
                            transcription: "Fiihaa kutubun qayyimatun",
                            translation: "Unda to‘g‘ri kitoblar bor",
                            tafsir: "Qur’onda to‘g‘ri va qimmatli qonunlar mavjud.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "وَمَا تَفَرَّقَ ٱلَّذِينَ أُوتُواْ ٱلْكِتَٰبَ إِلَّا مِنۢ بَعْدِ مَا جَآءَتْهُمُ ٱلْبَيِّنَةُ",
                            transcription: "Wa maa tafarraqa alladhiina uutuu al-kitaaba illaa min ba‘di maa jaa’athumu al-bayyinatu",
                            translation: "Kitob berilganlar oydin dalil kelgandan keyin bo‘linishdi",
                            tafsir: "Yahudiy va nasorolarning haqiqatdan keyin bo‘linishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "وَمَآ أُمِرُواْ إِلَّا لِيَعْبُدُواْ ٱللَّهَ مُخْلِصِينَ لَهُ ٱلدِّينَ حُنَفَآءَ",
                            transcription: "Wa maa umiruu illaa liya‘buduu allaaha mukhlisiina lahu ad-diina hunafaa’a",
                            translation: "Ular faqat Allohga ixlos bilan ibodat qilishga va to‘g‘ri yo‘lda bo‘lishga buyurilgan edi",
                            tafsir: "Allohga ixlos bilan ibodat qilishning muhimligi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "إِنَّ ٱلَّذِينَ كَفَرُواْ مِنْ أَهْلِ ٱلْكِتَٰبِ وَٱلْمُشْرِكِينَ فِى نَارِ جَهَنَّمَ خَٰلِدِينَ فِيهَآ",
                            transcription: "Inna alladhiina kafaruu min ahli al-kitaabi wal-mushrikiina fii naari jahannama khaalidiina fiihaa",
                            translation: "Kitob ahli va mushriklardan kofir bo‘lganlar jahannam olovida abadiy qoladilar",
                            tafsir: "Kofirlarning do‘zaxdagi abadiy jazosi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "إِنَّ ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ أُوْلَٰٓئِكَ هُمْ خَيْرُ ٱلْبَرِيَّةِ",
                            transcription: "Inna alladhiina aamanuu wa ‘amiluu as-saalihaati ulaa’ika hum khayru al-bariyyati",
                            translation: "Iymon keltirib, solih amal qilganlar – ular yaratilganlarning eng yaxshisidir",
                            tafsir: "Iymon va yaxshi amal qilganlarning eng yuqori maqomi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "جَزَآؤُهُمْ عِندَ رَبِّهِمْ جَنَّٰتُ عَدْنٍۢ تَجْرِى مِن تَحْتِهَا ٱلْأَنْهَٰرُ",
                            transcription: "Jazaa’uhum ‘inda rabbihim jannaatu ‘adnin tajrii min tahtihaa al-anhaaru",
                            translation: "Ularning mukofoti Robbi huzurida – ostidan daryolar oqadigan abadiy jannatlardir",
                            tafsir: "Mo‘minlarning jannatdagi abadiy mukofoti tasvirlanadi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                      {
                        id: 99,
                        name: "Az-Zalzalah",
                        arabicName: "الزلزلة",
                        meaning: "Zilzila",
                        ayahCount: 8,
                        place: "Madina",
                        prelude: {
                          bismillah: {
                            arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                            transcription: "Bismillahir-Rahmanir-Rahiim",
                            translation: "Mehribon va rahmli Alloh nomi bilan",
                            tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                            copySymbol: "📋"
                          }
                        },
                        ayahs: [
                          {
                            numberArabic: "١",
                            numberLatin: "1",
                            arabic: "إِذَا زُلْزِلَتِ ٱلْأَرْضُ زِلْزَالَهَا",
                            transcription: "Idhaa zulzilati al-ardu zilzaalahaa",
                            translation: "Yer o‘z zilzilasi bilan silkinganda",
                            tafsir: "Qiyomatdagi yerni qattiq silkinishi tasviri.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٢",
                            numberLatin: "2",
                            arabic: "وَأَخْرَجَتِ ٱلْأَرْضُ أَثْقَالَهَا",
                            transcription: "Wa akhrajati al-ardu athqaalahaa",
                            translation: "Yer o‘z yuklarini chiqarganda",
                            tafsir: "Yerning qabrlardagi o‘liklarni chiqarishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٣",
                            numberLatin: "3",
                            arabic: "وَقَالَ ٱلْإِنسَٰنُ مَا لَهَا",
                            transcription: "Wa qaala al-insaanu maa lahaa",
                            translation: "Inson: 'Unga nima bo‘ldi?' deydi",
                            tafsir: "Insonning qiyomatdagi hayrat va dahshati.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٤",
                            numberLatin: "4",
                            arabic: "يَوْمَئِذٍۢ تُحَدِّثُ أَخْبَارَهَا",
                            transcription: "Yawma’idhin tuhaddithu akhbaarahaa",
                            translation: "O‘sha kuni u o‘z xabarlarini aytadi",
                            tafsir: "Yerning odamlarning amallari haqida guvohlik berishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٥",
                            numberLatin: "5",
                            arabic: "بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا",
                            transcription: "Bi’anna rabbaka awhaa lahaa",
                            translation: "Chunki Robbing unga vahiy qildi",
                            tafsir: "Yerning Allohning amri bilan gapirishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٦",
                            numberLatin: "6",
                            arabic: "يَوْمَئِذٍۢ يَصْدُرُ ٱلنَّاسُ أَشْتَاتًۭا لِّيُرَوْاْ أَعْمَٰلَهُمْ",
                            transcription: "Yawma’idhin yasduru an-naasu ashtaatan liyuraw a‘maalahum",
                            translation: "O‘sha kuni odamlar guruh-guruh bo‘lib chiqadilar, o‘z amallarini ko‘rish uchun",
                            tafsir: "Qiyomatda odamlarning amallari ko‘rsatilishi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٧",
                            numberLatin: "7",
                            arabic: "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًۭا يَرَهُۥ",
                            transcription: "Faman ya‘mal mithqaala dharratin khayran yarahu",
                            translation: "Kim zarra miqdorida yaxshilik qilsa, uni ko‘radi",
                            tafsir: "Eng kichik yaxshilik ham mukofotlanadi.",
                            copySymbol: "📋"
                          },
                          {
                            numberArabic: "٨",
                            numberLatin: "8",
                            arabic: "وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍۢ شَرًّۭا يَرَهُۥ",
                            transcription: "Wa man ya‘mal mithqaala dharratin sharran yarahu",
                            translation: "Kim zarra miqdorida yomonlik qilsa, uni ko‘radi",
                            tafsir: "Eng kichik yomonlik ham jazolanadi.",
                            copySymbol: "📋"
                          }
                        ]
                      },
                        {
                          id: 100,
                          name: "Al-Adiyat",
                          arabicName: "العاديات",
                          meaning: "Yuguruvchilar",
                          ayahCount: 11,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "وَٱلْعَٰدِيَٰتِ ضَبْحًۭا",
                              transcription: "Wal-‘aadiyaati dabhan",
                              translation: "Yugurib nafas oluvchilar bilan qasam",
                              tafsir: "Jangda yugurgan otlarning kuch va shiddati tasviri.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "فَٱلْمُورِيَٰتِ قَدْحًۭا",
                              transcription: "Fal-muuriyaati qadhan",
                              translation: "Uchqun chiqaruvchilar bilan qasam",
                              tafsir: "Otlarning tuyog‘idan uchqun chiqishi tasviri.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "فَٱلْمُغِيرَٰتِ صُبْحًۭا",
                              transcription: "Fal-mughiiraati subhan",
                              translation: "Tongda hujum qiluvchilar bilan qasam",
                              tafsir: "Otlarning tongda dushmanga hujumi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "فَأَثَرْنَ بِهِۦ نَقْعًۭا",
                              transcription: "Fa’atharna bihi naq‘an",
                              translation: "U bilan chang ko‘taruvchilar bilan qasam",
                              tafsir: "Otlarning yugurishi bilan chang ko‘tarilishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "فَوَسَطْنَ بِهِۦ جَمْعًۭا",
                              transcription: "Fawasatna bihi jam‘an",
                              translation: "U bilan jamoaga kiruvchilar bilan qasam",
                              tafsir: "Otlarning dushman o‘rtasiga kirishi tasviri.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "إِنَّ ٱلْإِنسَٰنَ لِرَبِّهِۦ لَكَنُودٌۭ",
                              transcription: "Inna al-insaana lirabbihi lakanuudun",
                              translation: "Albatta, inson Robbisiga noshukurdir",
                              tafsir: "Insonning Allohning ne’matlariga noshukurligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٧",
                              numberLatin: "7",
                              arabic: "وَإِنَّهُۥ عَلَىٰ ذَٰلِكَ لَشَهِيدٌۭ",
                              transcription: "Wa innahu ‘alaa dhaalika lashahiidun",
                              translation: "Va u bunga albatta guvohdir",
                              tafsir: "Insonning o‘z noshukurligiga guvoh ekanligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٨",
                              numberLatin: "8",
                              arabic: "وَإِنَّهُۥ لِحُبِّ ٱلْخَيْرِ لَشَدِيدٌۭ",
                              transcription: "Wa innahu lihubbi al-khayri lashadiidun",
                              translation: "Va u mol-dunyoga muhabbatda albatta qattiqdir",
                              tafsir: "Insonning dunyo moliga haddan tashqari muhabbati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٩",
                              numberLatin: "9",
                              arabic: "أَفَلَا يَعْلَمُ إِذَا بُعْثِرَ مَا فِى ٱلْقُبُورِ",
                              transcription: "Afalaa ya‘lamu idhaa bu‘thira maa fii al-qubuuri",
                              translation: "U bilmaydimi, qabrlardagi narsalar chiqarilganda",
                              tafsir: "Qiyomatda qabrlardan tirilish haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "١٠",
                              numberLatin: "10",
                              arabic: "وَحُصِّلَ مَا فِى ٱلصُّدُورِ",
                              transcription: "Wa hussila maa fii as-suduuri",
                              translation: "Va ko‘kslardagi narsalar oshkor qilinganda",
                              tafsir: "Qiyomatda yuraklardagi niyatlar oshkor bo‘lishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "١١",
                              numberLatin: "11",
                              arabic: "إِنَّ رَبَّهُم بِهِمْ يَوْمَئِذٍۢ لَّخَبِيرٌۭ",
                              transcription: "Inna rabbahum bihim yawma’idhin lakhabiirun",
                              translation: "Albatta, o‘sha kuni Robbi ulardan xabardordir",
                              tafsir: "Allohning qiyomatda hamma narsadan xabardor ekanligi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 101,
                          name: "Al-Qari’a",
                          arabicName: "القارعة",
                          meaning: "Urg‘uchi",
                          ayahCount: 11,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "ٱلْقَارِعَةُ",
                              transcription: "Al-Qari‘atu",
                              translation: "Urg‘uchi!",
                              tafsir: "Qiyomatning dahshatli nomi – Urg‘uchi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "مَا ٱلْقَارِعَةُ",
                              transcription: "Maa al-Qari‘atu",
                              translation: "Urg‘uchi nima?",
                              tafsir: "Qiyomatning ulkanligini ta’kidlash uchun savol.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "وَمَآ أَدْرَىٰكَ مَا ٱلْقَارِعَةُ",
                              transcription: "Wa maa adraaka maa al-Qari‘atu",
                              translation: "Urg‘uchi nimaligini senga nima bildirdi?",
                              tafsir: "Qiyomatning dahshatli ekanligini ta’kidlash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "يَوْمَ يَكُونُ ٱلنَّاسُ كَٱلْفَرَاشِ ٱلْمَبْثُوثِ",
                              transcription: "Yawma yakoonu an-naasu kal-faraashi al-mabthuuthi",
                              translation: "O‘sha kuni odamlar tarqoq kapalaklar kabi bo‘ladi",
                              tafsir: "Qiyomatda odamlarning sarosimaga tushishi tasvirlanadi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "وَتَكُونُ ٱلْجِبَالُ كَٱلْعِهْنِ ٱلْمَنفُوشِ",
                              transcription: "Wa takoonu al-jibaalu kal-‘ihni al-manfuushi",
                              translation: "Tog‘lar yungday tarqoq bo‘ladi",
                              tafsir: "Qiyomatda tog‘larning parchalanishi tasviri.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "فَأَمَّا مَن ثَقُلَتْ مَوَٰزِينُهُۥ",
                              transcription: "Fa’ammaa man thaqulat mawaaziinuhu",
                              translation: "Kimning tarozisi og‘ir kelsa",
                              tafsir: "Yaxshi amallari ko‘p bo‘lganlarning muvaffaqiyati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٧",
                              numberLatin: "7",
                              arabic: "فَهُوَ فِى عِيشَةٍۢ رَّاضِيَةٍۢ",
                              transcription: "Fahuwa fii ‘iishatin raadiyatin",
                              translation: "U rozi bo‘ladigan hayotda bo‘ladi",
                              tafsir: "Yaxshilarning jannatdagi baxtli hayoti.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٨",
                              numberLatin: "8",
                              arabic: "وَأَمَّا مَنْ خَفَّتْ مَوَٰزِينُهُۥ",
                              transcription: "Wa ammaa man khaffat mawaaziinuhu",
                              translation: "Kimning tarozisi yengil kelsa",
                              tafsir: "Yomon amallari ko‘p bo‘lganlarning holati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٩",
                              numberLatin: "9",
                              arabic: "فَأُمُّهُۥ هَاوِيَةٌۭ",
                              transcription: "Fa’ummuhu haawiyatun",
                              translation: "Uning panohi hoviya bo‘ladi",
                              tafsir: "Hoviya – do‘zaxning chuqur joyi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "١٠",
                              numberLatin: "10",
                              arabic: "وَمَآ أَدْرَىٰكَ مَا هِيَهْ",
                              transcription: "Wa maa adraaka maa hiyah",
                              translation: "Hoviya nimaligini senga nima bildirdi?",
                              tafsir: "Do‘zaxning dahshatli ekanligini ta’kidlash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "١١",
                              numberLatin: "11",
                              arabic: "نَارٌ حَامِيَةٌۭ",
                              transcription: "Naarun haamiyatun",
                              translation: "Yonib turgan olovdir",
                              tafsir: "Do‘zaxning qaynoq olovi tasviri.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 102,
                          name: "At-Takathur",
                          arabicName: "التكاثر",
                          meaning: "Ko‘paytirish",
                          ayahCount: 8,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "أَلْهَىٰكُمُ ٱلتَّكَاثُرُ",
                              transcription: "Alhaakumu at-takaathuru",
                              translation: "Ko‘paytirish sizni chalg‘itdi",
                              tafsir: "Dunyoviy narsalarni ko‘paytirishga berilish insonni Allohdan uzoqlashtiradi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "حَتَّىٰ زُرْتُمُ ٱلْمَقَابِرَ",
                              transcription: "Hattaa zurtumu al-maqaabira",
                              translation: "To qabrlarni ziyorat qilguningizcha",
                              tafsir: "O‘lim kelgunicha dunyo ortidan yugurish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "كَلَّا سَوْفَ تَعْلَمُونَ",
                              transcription: "Kallaa sawfa ta‘lamuuna",
                              translation: "Yo‘q, tez orada bilasizlar",
                              tafsir: "Qiyomatda haqiqatni bilish haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ",
                              transcription: "Thumma kallaa sawfa ta‘lamuuna",
                              translation: "Yana yo‘q, tez orada bilasizlar",
                              tafsir: "Haqiqatni bilish muqarrarligini takroriy ta’kidlash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "كَلَّا لَوْ تَعْلَمُونَ عِلْمَ ٱلْيَقِينِ",
                              transcription: "Kallaa law ta‘lamuuna ‘ilma al-yaqiini",
                              translation: "Yo‘q, agar yqin ilm bilan bilsangiz edi",
                              tafsir: "Haqiqiy bilim bilan Allohning azobini anglash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "لَتَرَوُنَّ ٱلْجَحِيمَ",
                              transcription: "Latarawunna al-jahiima",
                              translation: "Albatta, jahimni ko‘rasizlar",
                              tafsir: "Do‘zaxni ko‘rish muqarrarligi haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٧",
                              numberLatin: "7",
                              arabic: "ثُمَّ لَتَرَوُنَّهَا عَيْنَ ٱلْيَقِينِ",
                              transcription: "Thumma latarawunnahaa ‘ayna al-yaqiini",
                              translation: "So‘ng uni yqin ko‘z bilan ko‘rasizlar",
                              tafsir: "Do‘zaxni yaqindan ko‘rish tasdiqlanadi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٨",
                              numberLatin: "8",
                              arabic: "ثُمَّ لَتُسْـَٔلُنَّ يَوْمَئِذٍ عَنِ ٱلنَّعِيمِ",
                              transcription: "Thumma latus’alunna yawma’idhin ‘ani an-na‘iimi",
                              translation: "So‘ng o‘sha kuni ne’matlar haqida so‘ralasizlar",
                              tafsir: "Dunyo ne’matlari uchun qiyomatda hisob berish.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 103,
                          name: "Al-AsrEADr",
                          arabicName: "العصر",
                          meaning: "Asr",
                          ayahCount: 3,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "وَٱلْعَصْرِ",
                              transcription: "Wal-‘asri",
                              translation: "Asr bilan qasam",
                              tafsir: "Vaqtning muhimligi va uning o‘tkinchiligi haqida eslatma.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ",
                              transcription: "Inna al-insaana lafii khusrin",
                              translation: "Albatta, inson ziyonda",
                              tafir: "Insonning vaqtni behuda o‘tkazishi zarar keltiradi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "إِلَّا ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ وَتَوَاصَوْاْ بِٱلْحَقِّ وَتَوَاصَوْاْ بِٱلصَّبْرِ",
                              transcription: "Illaa alladhiina aamanuu wa ‘amiluu as-saalihaati wa tawaasaw bil-haqqi wa tawaasaw bis-sabri",
                              translation: "Magar iymon keltirganlar, solih amal qilganlar, haqqa vasiyat qilganlar va sabrga vasiyat qilganlar",
                              tafsir: "Muvaffaqiyat iymon, yaxshi amal, haq va sabr bilan erishiladi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 104,
                          name: "Al-Humaza",
                          arabicName: "الهمزة",
                          meaning: "G‘iybatchi",
                          ayahCount: 9,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "وَيْلٌۭ لِّكُلِّ هُمَزَةٍۢ لُّمَزَةٍ",
                              transcription: "Waylun likulli humazatin lumazatin",
                              translation: "Har bir g‘iybatchi va ayb qidiruvchiga vaye",
                              tafsir: "G‘iybat va ayb qidirishning yomonligi haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "ٱلَّذِى جَمَعَ مَالًۭا وَعَدَّدَهُۥ",
                              transcription: "Alladhii jama‘a maalan wa ‘addadahu",
                              translation: "U mol-dunyo yig‘ib, uni sanaydi",
                              tafsir: "Molga berilish va uni sanashning foydasizligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "يَحْسَبُ أَنَّ مَالَهُۥٓ أَخْلَدَهُۥ",
                              transcription: "Yahsabu anna maalahu akhladahu",
                              translation: "U o‘z mol-dunyosi uni abadiy qiladi deb o‘ylaydi",
                              tafsir: "Molning abadiylik bermasligi haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "كَلَّا ۖ لَيُنۢبَذَنَّ فِى ٱلْحُطَمَةِ",
                              transcription: "Kallaa layunbadhanna fii al-hutamati",
                              translation: "Yo‘q, u albatta hutamaga tashlanadi",
                              tafsir: "Hutama – do‘zaxning olovi haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "وَمَآ أَدْرَىٰكَ مَا ٱلْحُطَمَةُ",
                              transcription: "Wa maa adraaka maa al-hutamatu",
                              translation: "Hutama nimaligini senga nima bildirdi?",
                              tafsir: "Do‘zax olovining dahshatli ekanligini ta’kidlash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "نَارُ ٱللَّهِ ٱلْمُوقَدَةُ",
                              transcription: "Naaru allaahi al-muuqadatu",
                              translation: "Allohning yondirilgan olovi",
                              tafsir: "Do‘zaxning Alloh tomonidan yondirilgan olovi tasviri.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٧",
                              numberLatin: "7",
                              arabic: "ٱلَّتِى تَطَّلِعُ عَلَى ٱلْأَفْـِٔدَةِ",
                              transcription: "Allatii tattali‘u ‘alaa al-af’idati",
                              translation: "U yuraklarga kirib boradi",
                              tafsir: "Do‘zax olovining chuqur ta’siri haqida.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٨",
                              numberLatin: "8",
                              arabic: "إِنَّهَا عَلَيْهِم مُّؤْصَدَةٌۭ",
                              transcription: "Innahaa ‘alayhim mu’sadatun",
                              translation: "U ular ustida yopiq bo‘ladi",
                              tafsir: "Do‘zaxning yopiq va qochib bo‘lmas joy ekanligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٩",
                              numberLatin: "9",
                              arabic: "فِى عَمَدٍۢ مُّمَدَّدَةٍۢ",
                              transcription: "Fii ‘amadin mumaddadatin",
                              translation: "Uzoq ustunlarda",
                              tafsir: "Do‘zaxdagi azobning qattiqligi tasviri.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 105,
                          name: "Al-Fil",
                          arabicName: "الفيل",
                          meaning: "Fil",
                          ayahCount: 5,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَٰبِ ٱلْفِيلِ",
                              transcription: "Alam tara kayfa fa‘ala rabbuka bi’ashaabi al-fiili",
                              translation: "Robbing fil egalari bilan nima qilganini ko‘rmadingmi?",
                              tafsir: "Abraha va uning fil askarining halokati haqida eslatma.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "أَلَمْ يَجْعَلْ كَيْدَهُمْ فِى تَضْلِيلٍۢ",
                              transcription: "Alam yaj‘al kaydahum fii tadliilin",
                              translation: "Ularning hiylasini adashtirishda qo‘ymadimi?",
                              tafsir: "Allohning Abrahaning rejalarini barbod qilishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ",
                              transcription: "Wa arsala ‘alayhim tayran abaabiila",
                              translation: "Ularning ustiga abobil qushlarini yubordi",
                              tafsir: "Allohning qushlar orqali dushmanni yo‘q qilishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "تَرْمِيهِم بِحِجَارَةٍۢ مِّن سِجِّيلٍۢ",
                              transcription: "Tarmiihim bihijaaratin min sijjiilin",
                              translation: "Ularni loydan qotgan toshlar bilan urdi",
                              tafsir: "Qushlarning qattiq toshlar bilan dushmanni urishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "فَجَعَلَهُمْ كَعَصْفٍۢ مَّأْكُولٍۢ",
                              transcription: "Faja‘alahum ka‘asfin ma’kuulin",
                              translation: "Ularni yem bo‘lgan somon kabi qildi",
                              tafsir: "Dushman armiyasining butunlay yo‘q bo‘lishi tasviri.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 106,
                          name: "Quraysh",
                          arabicName: "قريش",
                          meaning: "Quraysh",
                          ayahCount: 4,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "لِإِيلَٰفِ قُرَيْشٍ",
                              transcription: "Li’iilaafi qurayshin",
                              translation: "Qurayshning o‘rganishi uchun",
                              tafsir: "Quraysh qabilasining xavfsizligi haqida eslatma.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "إِيلَٰفِهِمْ رِحْلَةَ ٱلشِّتَآءِ وَٱلصَّيْفِ",
                              transcription: "Iilaafihim rihlata ash-shitaa’i was-sayfi",
                              translation: "Ularning qish va yoz safarlariga o‘rganishi",
                              tafsir: "Qurayshning savdo safarlaridagi xavfsizlik ne’mati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "فَلْيَعْبُدُواْ رَبَّ هَٰذَا ٱلْبَيْتِ",
                              transcription: "Falyabuduu rabba haadhaa al-bayti",
                              translation: "Bu uy (Ka’ba) ning Robbiga ibodat qilsinlar",
                              tafsir: "Allohga shukr qilish va ibodat qilish buyuriladi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "ٱلَّذِىٓ أَطْعَمَهُم مِّن جُوعٍۢ وَءَامَنَهُم مِّنْ خَوْفٍۢ",
                              transcription: "Alladhii at‘amahum min juu‘in wa aamanahum min khawfin",
                              translation: "U ularni ochlikdan to‘yirdi va qo‘rquvdan amon qildi",
                              tafsir: "Allohning Qurayshga bergan ne’matlari eslatiladi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 107,
                          name: "Al-Ma’un",
                          arabicName: "الماعون",
                          meaning: "Yordam",
                          ayahCount: 7,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "أَرَءَيْتَ ٱلَّذِى يُكَذِّبُ بِٱلدِّينِ",
                              transcription: "Ara’ayta alladhii yukadhdhibu bid-diini",
                              translation: "Dinni yolg‘on deb bilgan kimsani ko‘rdingmi?",
                              tafsir: "Qiyomatni inkor qiluvchilar haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "فَذَٰلِكَ ٱلَّذِى يَدُعُّ ٱلْيَتِيمَ",
                              transcription: "Fadhaalika alladhii yadu‘u al-yatiima",
                              translation: "U yetimni itarib yuboradi",
                              tafsir: "Yetimlarga yomon muomala qiluvchilarning holati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "وَلَا يَحُضُّ عَلَىٰ طَعَامِ ٱلْمِسْكِينِ",
                              transcription: "Wa laa yahuddu ‘alaa ta‘aami al-miskiini",
                              translation: "Va kambag‘alni ovqatlantirishga undamaydi",
                              tafsir: "Muhtojlarga yordam bermaslikning yomonligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "فَوَيْلٌۭ لِّلْمُصَلِّينَ",
                              transcription: "Fawaylun lil-musalliina",
                              translation: "Namozxonlarga vaye",
                              tafsir: "Riyokor namozxonlar haqida ogohlantirish.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "ٱلَّذِينَ هُمْ عَن صَلَاتِهِمْ سَاهُونَ",
                              transcription: "Alladhiina hum ‘an salaatihim saahuuna",
                              translation: "Ular namozlarida beparvodirlar",
                              tafsir: "Namozga beparvo bo‘lishning yomonligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "ٱلَّذِينَ هُمْ يُرَآءُونَ",
                              transcription: "Alladhiina hum yuraa’uuna",
                              translation: "Ular riyokorlik qiladilar",
                              tafsir: "Riyokorlik bilan ibodat qilishning zarari.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٧",
                              numberLatin: "7",
                              arabic: "وَيَمْنَعُونَ ٱلْمَاعُونَ",
                              transcription: "Wa yamna‘uuna al-maa‘uuna",
                              translation: "Va yordamni man qiladilar",
                              tafsir: "Kichik yordamdan baxillik qilishning yomonligi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 108,
                          name: "Al-Kawthar",
                          arabicName: "الكوثر",
                          meaning: "Kavsar",
                          ayahCount: 3,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ",
                              transcription: "Innaa a‘taynaaka al-kawthara",
                              translation: "Biz senga Kavsarni berdik",
                              tafsir: "Kavsar – jannatdagi daryo yoki ko‘p xayrlar.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "فَصَلِّ لِرَبِّكَ وَٱنْحَرْ",
                              transcription: "Fasalli lirabbika wanhar",
                              translation: "Robbing uchun namoz o‘qi va qurbonlik qil",
                              tafsir: "Allohga shukrona sifatida ibodat va qurbonlik.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ",
                              transcription: "Inna shaani’aka huwa al-abtaru",
                              translation: "Sening dushmaning – o‘zi abtardir",
                              tafsir: "Payg‘ambarni haqorat qiluvchilarning o‘zlari zarar ko‘radi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 109,
                          name: "Al-Kafirun",
                          arabicName: "الكافرون",
                          meaning: "Kofirlar",
                          ayahCount: 6,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "قُلْ يَٰٓأَيُّهَا ٱلْكَٰفِرُونَ",
                              transcription: "Qul yaa ayyuhaa al-kaafiruuna",
                              translation: "Ayting: 'Ey kofirlar!'",
                              tafsir: "Payg‘ambarga kofirlarga qarshi pozitsiyani e’lon qilish buyuriladi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "لَآ أَعْبُدُ مَا تَعْبُدُونَ",
                              transcription: "Laa a‘budu maa ta‘buduuna",
                              translation: "Men sizlar ibodat qilgan narsaga ibodat qilmayman",
                              tafsir: "Allohdan boshqa narsaga ibodat qilmaslik ta’kidi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "وَلَآ أَنتُمْ عَٰبِدُونَ مَآ أَعْبُدُ",
                              transcription: "Wa laa antum ‘aabiduuna maa a‘budu",
                              translation: "Sizlar men ibodat qilgan Zotga ibodat qilmaysizlar",
                              tafsir: "Kofirlarning Allohga ibodat qilmasligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "وَلَآ أَنَا۠ عَابِدٌۭ مَّا عَبَدتُّمْ",
                              transcription: "Wa laa ana ‘aabidun maa ‘abadtum",
                              translation: "Men sizlar ibodat qilgan narsaga ibodat qiluvchi emasman",
                              tafsir: "Payg‘ambar kofirlarning butlariga qarshi pozitsiyasi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "وَلَآ أَنتُمْ عَٰبِدُونَ مَآ أَعْبُدُ",
                              transcription: "Wa laa antum ‘aabiduuna maa a‘budu",
                              translation: "Sizlar men ibodat qilgan Zotga ibodat qilmaysizlar",
                              tafsir: "Iymon va kufr o‘rtasidagi farq ta’kidlanadi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "لَكُمْ دِينُكُمْ وَلِىَ دِينِ",
                              transcription: "Lakum diinukum waliya diini",
                              translation: "Sizlarga o‘z diningiz, menga o‘z dinim",
                              tafsir: "Dinlar o‘rtasidagi chegara aniq belgilandi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 110,
                          name: "An-Nasr",
                          arabicName: "النصر",
                          meaning: "Yordam",
                          ayahCount: 3,
                          place: "Madina",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ",
                              transcription: "Idhaa jaa’a nasru allaahi wal-fathu",
                              translation: "Allohning yordami va fath kelsa",
                              tafsir: "Allohning Payg‘ambarga yordami va Makkani fath qilishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "وَرَأَيْتَ ٱلنَّاسَ يَدْخُلُونَ فِى دِينِ ٱللَّهِ أَفْوَاجًا",
                              transcription: "Wa ra’ayta an-naasa yadkhuluuna fii diini allaahi afwaajan",
                              translation: "Odamlarning Alloh diniga guruh-guruh bo‘lib kirishini ko‘rsang",
                              tafsir: "Islomning keng tarqalishi haqida bashorat.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَٱسْتَغْفِرْهُ ۚ إِنَّهُۥ كَانَ تَوَّابًۭا",
                              transcription: "Fasabbih bihamdi rabbika wastaghfirhu innahu kaana tawwaaban",
                              translation: "Robbingga hamd bilan tasbih ayt va Undan mag‘firat so‘ra, U tavba qabul qiluvchidir",
                              tafsir: "G‘alabadan keyin shukr va istig‘for qilish buyuriladi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 111,
                          name: "Al-Masad",
                          arabicName: "المسد",
                          meaning: "Masad",
                          ayahCount: 5,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "تَبَّتْ يَدَآ أَبِى لَهَبٍۢ وَتَبَّ",
                              transcription: "Tabbat yadaa abii lahabin wa tabba",
                              translation: "Abu Lahabning ikki qo‘li halok bo‘lsin va halok bo‘ldi",
                              tafsir: "Abu Lahabning Payg‘ambarga dushmanligi va uning oqibati.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "مَآ أَغْنَىٰ عَنْهُ مَالُهُۥ وَمَا كَسَبَ",
                              transcription: "Maa aghnaa ‘anhu maalahu wa maa kasaba",
                              translation: "Uning mol-mulki va kasbi unga foyda bermadi",
                              tafsir: "Dunyo molining azobdan qutqara olmasligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "سَيَصْلَىٰ نَارًۭا ذَاتَ لَهَبٍۢ",
                              transcription: "Sayaslaa naaran dhaata lahabin",
                              translation: "U alangali olovga kiradi",
                              tafsir: "Abu Lahabning do‘zaxdagi jazosi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "وَٱمْرَأَتُهُۥ حَمَّالَةَ ٱلْحَطَبِ",
                              transcription: "Wamra’atuhu hammaalata al-hatabi",
                              translation: "Uning xotini – o‘tin tashuvchi",
                              tafsir: "Abu Lahabning xotinining fitnasi va jazosi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "فِى جِيدِهَا حَبْلٌۭ مِّن مَّسَدٍۢ",
                              transcription: "Fii jiidihaa hablun min masadin",
                              translation: "Uning bo‘ynida masaddan arqon bo‘ladi",
                              tafsir: "Uning do‘zaxdagi azobi tasviri.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 112,
                          name: "Al-Ikhlas",
                          arabicName: "الإخلاص",
                          meaning: "Ixlos",
                          ayahCount: 4,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
                              transcription: "Qul huwa allaahu ahadun",
                              translation: "Ayting: U Alloh yagona",
                              tafsir: "Allohning yagona Zot ekanligi ta’kidlanadi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "ٱللَّهُ ٱلصَّمَدُ",
                              transcription: "Allaahu as-samadu",
                              translation: "Alloh – Samad (hech kimga muhtoj emas)",
                              tafsir: "Allohning hech kimga muhtoj emasligi va mukammalligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
                              transcription: "Lam yalid wa lam yuulad",
                              translation: "U tug‘magan va tug‘ilmagan",
                              tafsir: "Allohning ota-ona va farzanddan pok ekanligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
                              transcription: "Wa lam yakun lahu kufuwan ahadun",
                              translation: "Va Unga hech kim teng emas",
                              tafsir: "Allohning tengi yo‘qligi ta’kidlanadi.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 113,
                          name: "Al-Falaq",
                          arabicName: "الفلق",
                          meaning: "Tong",
                          ayahCount: 5,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ",
                              transcription: "Qul a‘uudhu birabbi al-falaqi",
                              translation: "Ayting: Tong Robbiga panoh beraman",
                              tafsir: "Tongning Robbiga panoh so‘rash haqida buyruq.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "مِن شَرِّ مَا خَلَقَ",
                              transcription: "Min sharri maa khalaqa",
                              translation: "U yaratgan narsalarning yomonligidan",
                              tafsir: "Barcha yomonliklardan Allohga panoh so‘rash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
                              transcription: "Wa min sharri ghaasiqin idhaa waqaba",
                              translation: "Qorong‘u tushganda uning yomonligidan",
                              tafsir: "Kechaning yomonliklaridan panoh so‘rash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ",
                              transcription: "Wa min sharri an-naffaathaati fii al-‘uqadi",
                              translation: "Tugunlarga puflagichlarning yomonligidan",
                              tafsir: "Sehrgarlarning yomonligidan panoh so‘rash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
                              transcription: "Wa min sharri haasidin idhaa hasada",
                              translation: "Hasadchining hasad qilganidagi yomonligidan",
                              tafsir: "Hasadchilarning yomonligidan panoh so‘rash.",
                              copySymbol: "📋"
                            }
                          ]
                        },
                        {
                          id: 114,
                          name: "An-Nas",
                          arabicName: "الناس",
                          meaning: "Odamlar",
                          ayahCount: 6,
                          place: "Makka",
                          prelude: {
                            bismillah: {
                              arabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
                              transcription: "Bismillahir-Rahmanir-Rahiim",
                              translation: "Mehribon va rahmli Alloh nomi bilan",
                              tafsir: "Barcha yaxshi ishlarni Alloh nomi bilan boshlash kerakligini o'rgatadi.",
                              copySymbol: "📋"
                            }
                          },
                          ayahs: [
                            {
                              numberArabic: "١",
                              numberLatin: "1",
                              arabic: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ",
                              transcription: "Qul a‘uudhu birabbi an-naasi",
                              translation: "Ayting: Odamlar Robbiga panoh beraman",
                              tafsir: "Odamlarning Robbiga panoh so‘rash haqida buyruq.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٢",
                              numberLatin: "2",
                              arabic: "مَلِكِ ٱلنَّاسِ",
                              transcription: "Maliki an-naasi",
                              translation: "Odamlarning Podshohiga",
                              tafsir: "Allohning odamlar ustidagi hukmronligi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٣",
                              numberLatin: "3",
                              arabic: "إِلَٰهِ ٱلنَّاسِ",
                              transcription: "Ilaahi an-naasi",
                              translation: "Odamlarning Ilohiga",
                              tafsir: "Allohning yagona iloh ekanligi ta’kidlanadi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٤",
                              numberLatin: "4",
                              arabic: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ",
                              transcription: "Min sharri al-waswaasi al-khannaasi",
                              translation: "Yashirin vasvasachining yomonligidan",
                              tafsir: "Shaytonning yashirin vasvasalaridan panoh so‘rash.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٥",
                              numberLatin: "5",
                              arabic: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ",
                              transcription: "Alladhii yuwaswisu fii suduuri an-naasi",
                              translation: "U odamlarning ko‘kslariga vasvasa soladi",
                              tafsir: "Shaytonning insonlarga yomonlik ilhom qilishi.",
                              copySymbol: "📋"
                            },
                            {
                              numberArabic: "٦",
                              numberLatin: "6",
                              arabic: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ",
                              transcription: "Mina al-jinnati wan-naasi",
                              translation: "Jinlar va odamlardan",
                              tafsir: "Yomonlik jinlar va odamlardan kelishi mumkin.",
                              copySymbol: "📋"
                            }
                          ]
                        }
                      ];
                      
                  

// TO'G'RILANGAN FUNKSIYALAR
function displaySuraList() {
  const suraList = document.getElementById('suraList');
  if (!suraList) return;
  
  suraList.innerHTML = '';
  
  surahs.forEach(surah => {
    const suraItem = document.createElement('div');
    suraItem.className = 'sura-item';
    suraItem.innerHTML = `
      <div class="sura-name">
        <span class="sura-number">${surah.id}</span>
        <div>
          <div class="sura-name-latin">${surah.name}</div>
          <div style="font-size: 14px; color: #666;">${surah.meaning}</div>
        </div>
        <div class="sura-name-arabic">${surah.arabicName}</div>
      </div>
      <div class="sura-meta">
        <span>${surah.place}</span>
        <span>${surah.ayahCount} oyat</span>
      </div>
    `;
    suraItem.onclick = () => showSura(surah);
    suraList.appendChild(suraItem);
  });
}

function showSura(surah) {
  const suraContent = document.getElementById('suraContent');
  if (!suraContent) return;

  suraContent.innerHTML = `
    <button class="back-btn" onclick="displaySuraList()">⬅ Ortga qaytish</button>
    <div class="sura-header">
      <h2>${surah.arabicName} (${surah.name})</h2>
      <div class="sura-info">
        <span>📍 ${surah.place}</span>
        <span>📖 ${surah.ayahCount} oyat</span>
        <span>💎 ${surah.meaning}</span>
      </div>
    </div>
    
    ${surah.prelude && surah.prelude.bismillah ? `
      <div class="bismillah">
        <div class="arabic-text">${surah.prelude.bismillah.arabic}</div>
        <div class="transcription">${surah.prelude.bismillah.transcription}</div>
        <div class="translation">${surah.prelude.bismillah.translation}</div>
      </div>
    ` : ''}
    
    <div class="ayah-container">
      ${surah.ayahs.map((ayah, index) => `
        <div class="ayah">
          <div class="ayah-number">${ayah.numberArabic}</div>
          <div class="ayah-content">
            <div class="ayah-arabic">${ayah.arabic}</div>
            <div class="ayah-transcription">${ayah.transcription}</div>
            <div class="ayah-translation">${ayah.translation}</div>
            <div class="ayah-tafsir">
              <strong>Tafsir:</strong> ${ayah.tafsir}
            </div>
          </div>
          <button class="copy-btn" onclick="copyAyah(${surah.id}, ${index})" title="Nusxa olish">
            ${ayah.copySymbol}
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

function copyAyah(surahId, ayahIndex) {
  const surah = surahs.find(s => s.id === surahId);
  if (!surah || !surah.ayahs[ayahIndex]) return;

  const ayah = surah.ayahs[ayahIndex];
  const textToCopy = `${surah.name} surasi ${ayahIndex + 1}-oyat\n\n${ayah.arabic}\n\n${ayah.transcription}\n\n${ayah.translation}\n\nTafsir: ${ayah.tafsir}`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    alert("✅ Oyat nusxa olindi!");
  }).catch(() => {
    alert("❌ Nusxa olishda xato yuz berdi");
  });
}

// DOM yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
  displaySuraList();
});
// Ko'rsatishni boshqarish
function toggleArabic() {
  const arabicElements = document.querySelectorAll('.ayah-text');
  arabicElements.forEach(el => {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
}

function toggleTranscription() {
  const transcriptionElements = document.querySelectorAll('.ayah-transcription');
  transcriptionElements.forEach(el => {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
}

function toggleTranslation() {
  const translationElements = document.querySelectorAll('.ayah-translation');
  translationElements.forEach(el => {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
}

function toggleTafsir() {
  const tafsirElements = document.querySelectorAll('.ayah-tafsir');
  tafsirElements.forEach(el => {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  });
}

// DOM yuklanganda Qur'on bo'limini ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
  const quranSection = document.getElementById('quran_section');
  if (quranSection && quranSection.classList.contains('active')) {
    displaySuraList();
  }
});

// Qidiruv funksiyasi
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('suraSearch');
  const searchBtn = document.getElementById('searchBtn');
  const suraList = document.getElementById('suraList');

  if (searchBtn && searchInput && suraList) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim().toLowerCase();
      const filteredSurahs = surahs.filter(surah =>
        surah.name.toLowerCase().includes(query) ||
        surah.arabicName.includes(query) ||
        surah.meaning.toLowerCase().includes(query)
      );

      suraList.innerHTML = '';
      if (filteredSurahs.length === 0) {
        suraList.innerHTML = '<p style="text-align: center; color: #666;">Hech narsa topilmadi.</p>';
      } else {
        filteredSurahs.forEach(surah => {
          const suraItem = document.createElement('div');
          suraItem.className = 'sura-item';
          suraItem.innerHTML = `
            <div class="sura-name">
              <span class="sura-number">${surah.id}</span>
              <div>
                <div class="sura-name-latin">${surah.name}</div>
                <div style="font-size: 14px; color: #666;">${surah.meaning}</div>
              </div>
              <div class="sura-name-arabic">${surah.arabicName}</div>
            </div>
            <div class="sura-meta">
              <span>${surah.place}</span>
              <span>${surah.ayahCount} oyat</span>
            </div>
          `;
          suraItem.onclick = () => showSura(surah);
          suraList.appendChild(suraItem);
        });
      }
    });

    // Enter tugmasi bilan qidirish
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }
});

// Boshqa bo'limlar uchun funksiyalar
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar menyusi elementlari
  const sidebarItems = document.querySelectorAll('#sidebar li');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.getAttribute('onclick').match(/'([^']+)'/)[1];
      loadSection(sectionId);
    });
  });

  // Barcha back-button elementlari uchun listener
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('back-button')) {
      loadSection('bosh_sahifa');
    }
  });
});

window.onload = function() {
  showSection('homeSection'); // yoki boshqa default bo‘limingiz
};

function showSura(surah) {
  document.getElementById('suraList').style.display = 'none';
  document.getElementById('suraContent').style.display = 'block';

  document.getElementById('suraTitle').textContent = `${surah.id}. ${surah.name} surasi`;
  document.getElementById('suraPlace').textContent = `${surah.place}da nozil bo‘lgan`;
  document.getElementById('ayahCount').textContent = `${surah.ayahCount} oyat`;

  const bismillah = document.getElementById('bismillah');
  if (surah.id === 9) {
    bismillah.style.display = 'none';
  } else {
    bismillah.style.display = 'block';
  }

  const ayahContainer = document.getElementById('ayahContainer');
  ayahContainer.innerHTML = '';

  // 🚨 Bu yerga qo‘shing:
  if (!surah.ayahs || surah.ayahs.length === 0) {
    ayahContainer.innerHTML = `<p class="no-ayah">Bu suraning oyatlari hali mavjud emas.</p>`;
    return;
  }

  // Oyatlar mavjud bo‘lsa, forEach ishlaydi
  surah.ayahs.forEach((ayah, index) => {
    const div = document.createElement('div');
    div.className = 'ayah-item';
    div.innerHTML = `
      <div class="ayah-number">${index + 1}</div>
      <div class="ayah-arabic">${ayah.arabic}</div>
      <div class="ayah-transcription">${ayah.transcription}</div>
      <div class="ayah-translation">${ayah.translation}</div>
      <div class="ayah-tafsir">${ayah.tafsir}</div>
    `;
    ayahContainer.appendChild(div);
  });
}

document.getElementById('backBtn').onclick = () => {
  document.getElementById('suraContent').style.display = 'none';
  document.getElementById('suraList').style.display = 'block';
};

window.onload = () => {
  if (document.getElementById('quron').classList.contains('active')) {
    displaySuraList();
  }
};
