(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Storage keys & defaults
  // ---------------------------------------------------------------------
  const KEYS = {
    settings: "hfw_settings",
    menus: "hfw_menus",
    holidays: "hfw_holidays",
    feedback: "hfw_feedback",
    alerts: "hfw_alerts",
  };

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MEALS = ["Breakfast", "Lunch", "Dinner"];

  const DEFAULT_SETTINGS = {
    totalStudents: 100,
    avgKgPerStudent: 0.2,
    wastageAlertPct: 35,
    lowDemandDislikeRatio: 0.45,
  };

  const DEFAULT_MENUS = {
    Sunday: {
      Breakfast: [mkDish("Bread Toast"), mkDish("Jam")],
      Lunch: [mkDish("Special Meal"), mkDish("Sweet")],
      Dinner: [mkDish("Soup"), mkDish("Sandwich")],
    },
    Monday: {
      Breakfast: [mkDish("Idli"), mkDish("Sambar")],
      Lunch: [mkDish("Rice"), mkDish("Dal"), mkDish("Curry")],
      Dinner: [mkDish("Chapati"), mkDish("Paneer Curry")],
    },
    Tuesday: {
      Breakfast: [mkDish("Upma"), mkDish("Chutney")],
      Lunch: [mkDish("Rice"), mkDish("Rasam"), mkDish("Curry")],
      Dinner: [mkDish("Fried Rice"), mkDish("Manchurian")],
    },
    Wednesday: {
      Breakfast: [mkDish("Dosa"), mkDish("Chutney")],
      Lunch: [mkDish("Rice"), mkDish("Sambar"), mkDish("Curry")],
      Dinner: [mkDish("Chapati"), mkDish("Chana Masala")],
    },
    Thursday: {
      Breakfast: [mkDish("Poha"), mkDish("Tea")],
      Lunch: [mkDish("Rice"), mkDish("Dal"), mkDish("Curry")],
      Dinner: [mkDish("Noodles"), mkDish("Gobi Manchurian")],
    },
    Friday: {
      Breakfast: [mkDish("Vada"), mkDish("Sambar")],
      Lunch: [mkDish("Biryani"), mkDish("Raita")],
      Dinner: [mkDish("Chapati"), mkDish("Mixed Veg Curry")],
    },
    Saturday: {
      Breakfast: [mkDish("Poori"), mkDish("Potato Masala"), mkDish("Masala Dosa")],
      Lunch: [mkDish("Rice"), mkDish("Sambar"), mkDish("Curry")],
      Dinner: [mkDish("Pulao"), mkDish("Paneer Curry")],
    },
  };

  function mkDish(name) {
    return { id: "d_" + Math.random().toString(36).slice(2, 10), name: name };
  }

  // ---------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  let settings = load(KEYS.settings, DEFAULT_SETTINGS);
  let menus = load(KEYS.menus, DEFAULT_MENUS);
  let holidays = load(KEYS.holidays, []);
  let feedback = load(KEYS.feedback, []); // {date, dishId, dishName, meal, day, likes, dislikes}
  let alerts = load(KEYS.alerts, []); // {id, type, title, message, timestamp}

  function persistAll() {
    save(KEYS.settings, settings);
    save(KEYS.menus, menus);
    save(KEYS.holidays, holidays);
    save(KEYS.feedback, feedback);
    save(KEYS.alerts, alerts);
  }

  // ---------------------------------------------------------------------
  // Domain helpers
  // ---------------------------------------------------------------------
  function weekdayName(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return DAYS[d.getDay()];
  }

  function formatDMY(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function findFeedback(date, dishId) {
    return feedback.find((f) => f.date === date && f.dishId === dishId);
  }

  function vote(date, dish, meal, day, type) {
    let rec = findFeedback(date, dish.id);
    if (!rec) {
      rec = { date, dishId: dish.id, dishName: dish.name, meal, day, likes: 0, dislikes: 0 };
      feedback.push(rec);
    }
    if (type === "like") rec.likes += 1;
    else rec.dislikes += 1;
    save(KEYS.feedback, feedback);
    recomputeAlerts();
    showToast(type === "like" ? "Thanks — like recorded." : "Feedback noted.");
    render();
  }

  function preparedKg() {
    return settings.totalStudents * settings.avgKgPerStudent;
  }

  function insightsRows() {
    const prepared = preparedKg();
    return feedback
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((f) => {
        const estNeed = f.likes * settings.avgKgPerStudent;
        const waste = Math.max(prepared - estNeed, 0);
        const wastePct = prepared > 0 ? (waste / prepared) * 100 : 0;
        const totalVotes = f.likes + f.dislikes;
        const dislikeRatio = totalVotes > 0 ? f.dislikes / totalVotes : 0;
        let flag = "OK";
        if (wastePct > settings.wastageAlertPct) flag = "High waste";
        else if (dislikeRatio >= settings.lowDemandDislikeRatio && totalVotes > 0) flag = "Low demand";
        return { ...f, prepared, estNeed, waste, wastePct, flag };
      });
  }

  function recomputeAlerts() {
    const rows = insightsRows();
    rows.forEach((row) => {
      if (row.flag === "OK") return;
      const type = row.flag === "High waste" ? "high" : "low";
      const already = alerts.find(
        (a) => a.date === row.date && a.dishId === row.dishId && a.type === type
      );
      if (already) return;
      const title = (type === "high" ? "High wastage: " : "Low demand: ") + row.dishName;
      const message =
        type === "high"
          ? `${formatDMY(row.date)} — ${row.wastePct.toFixed(0)}% of prepared food may be wasted (likes: ${row.likes}).`
          : `${formatDMY(row.date)} — dislike ratio is high (likes: ${row.likes}, dislikes: ${row.dislikes}).`;
      alerts.unshift({
        id: "a_" + Math.random().toString(36).slice(2, 10),
        type,
        title,
        message,
        date: row.date,
        dishId: row.dishId,
        timestamp: new Date().toISOString(),
      });
    });
    save(KEYS.alerts, alerts);
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById("fw-notif-badge");
    if (alerts.length > 0) {
      badge.style.display = "inline-block";
      badge.textContent = alerts.length;
    } else {
      badge.style.display = "none";
    }
  }

  function showToast(msg) {
    const toast = document.getElementById("fw-toast");
    toast.textContent = msg;
    toast.style.display = "block";
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.style.display = "none";
    }, 2200);
  }

  // ---------------------------------------------------------------------
  // Tab state & rendering
  // ---------------------------------------------------------------------
  let activeTab = "menu";
  const content = document.getElementById("fw-content");

  const renderers = {
    menu: renderYourMenu,
    overview: renderOverview,
    settings: renderSettings,
    menus: renderMenus,
    holidays: renderHolidays,
    insights: renderInsights,
    alerts: renderAlertLog,
  };

  function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".fw-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    render();
  }

  function render() {
    content.innerHTML = "";
    renderers[activeTab]();
    updateBadge();
  }

  document.querySelectorAll(".fw-tab").forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.tab));
  });
  document.getElementById("fw-notif-btn").addEventListener("click", () => setTab("alerts"));

  // ---------------------------------------------------------------------
  // "Your menu & feedback" (student view)
  // ---------------------------------------------------------------------
  function renderYourMenu() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Your menu & feedback"));
    card.appendChild(
      el("p", "fw-muted", "Pick a date to see that day's planned menu (Mon–Sun rotation). Likes help estimate demand.")
    );

    const dateWrap = el("div", null);
    dateWrap.appendChild(el("label", "fw-label", "Date"));
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "fw-input";
    dateInput.value = window._fwSelectedDate || todayStr();
    dateWrap.appendChild(dateInput);
    card.appendChild(dateWrap);

    const dayLabel = el("p", "fw-muted");
    card.appendChild(dayLabel);
    content.appendChild(card);

    function renderMenuForDate(dateStr) {
      window._fwSelectedDate = dateStr;
      const day = weekdayName(dateStr);
      dayLabel.textContent = `Menu for ${day} (${dateStr})`;

      // remove old meal cards
      document.querySelectorAll(".fw-meal-card").forEach((n) => n.remove());

      if (holidays.includes(dateStr)) {
        const holidayCard = el("div", "fw-card fw-meal-card");
        holidayCard.appendChild(el("p", "fw-empty", "No mess service today — marked as a holiday."));
        content.appendChild(holidayCard);
        return;
      }

      MEALS.forEach((meal) => {
        const dishes = (menus[day] && menus[day][meal]) || [];
        const mealCard = el("div", "fw-card fw-meal-card");
        const block = el("div", "fw-meal-block");
        block.appendChild(el("span", "fw-pill " + meal.toLowerCase(), meal));
        block.appendChild(el("h2", null, meal));
        mealCard.appendChild(block);

        if (dishes.length === 0) {
          mealCard.appendChild(el("p", "fw-empty", "No dishes added for this meal yet."));
        } else {
          dishes.forEach((dish) => {
            const rec = findFeedback(dateStr, dish.id);
            const likes = rec ? rec.likes : 0;
            const dislikes = rec ? rec.dislikes : 0;

            const row = el("div", "fw-dish-row");
            const left = el("div");
            left.appendChild(el("div", "fw-dish-name", dish.name));
            left.appendChild(el("div", "fw-dish-votes", `👍 ${likes} · 👎 ${dislikes}`));
            row.appendChild(left);

            const btns = el("div", "fw-vote-btns");
            const likeBtn = el("button", "fw-like", "Like");
            likeBtn.addEventListener("click", () => vote(dateStr, dish, meal, day, "like"));
            const dislikeBtn = el("button", "fw-dislike", "Dislike");
            dislikeBtn.addEventListener("click", () => vote(dateStr, dish, meal, day, "dislike"));
            btns.appendChild(likeBtn);
            btns.appendChild(dislikeBtn);
            row.appendChild(btns);

            mealCard.appendChild(row);
          });
        }
        content.appendChild(mealCard);
      });
    }

    dateInput.addEventListener("change", () => renderMenuForDate(dateInput.value));
    renderMenuForDate(dateInput.value);
  }

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------
  function renderOverview() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Overview"));
    card.appendChild(el("p", "fw-muted", "Wastage is estimated from likes vs full hostel capacity (see Settings)."));

    const rows = insightsRows();
    const totalPrepared = rows.reduce((s, r) => s + r.prepared, 0);
    const totalWaste = rows.reduce((s, r) => s + r.waste, 0);
    const overallRate = totalPrepared > 0 ? (totalWaste / totalPrepared) * 100 : 0;

    const stats = el("div", "fw-stats-grid");
    stats.appendChild(statCard("Hostel students", settings.totalStudents));
    stats.appendChild(statCard("Overall wastage rate", overallRate.toFixed(1) + "%"));
    stats.appendChild(statCard("Feedback records", feedback.length));
    card.appendChild(stats);

    const chartGrid = el("div", "fw-chart-grid");
    const donutWrap = el("div");
    donutWrap.appendChild(el("p", "fw-muted", "Prepared vs wasted (all data)"));
    const donutCanvas = document.createElement("canvas");
    donutWrap.appendChild(donutCanvas);
    chartGrid.appendChild(donutWrap);

    const barWrap = el("div");
    barWrap.appendChild(el("p", "fw-muted", "Wastage by dish (kg)"));
    const barCanvas = document.createElement("canvas");
    barWrap.appendChild(barCanvas);
    chartGrid.appendChild(barWrap);

    card.appendChild(chartGrid);
    content.appendChild(card);

    new Chart(donutCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Consumed (est.)", "Wasted"],
        datasets: [
          {
            data: [Math.max(totalPrepared - totalWaste, 0), totalWaste],
            backgroundColor: ["#8be9d5", "#ef4444"],
            borderWidth: 0,
          },
        ],
      },
      options: { plugins: { legend: { position: "bottom", labels: { color: "#e9e6f5" } } } },
    });

    const byDish = {};
    rows.forEach((r) => {
      byDish[r.dishName] = (byDish[r.dishName] || 0) + r.waste;
    });
    const dishLabels = Object.keys(byDish);
    new Chart(barCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: dishLabels,
        datasets: [{ label: "Waste (kg)", data: dishLabels.map((d) => byDish[d]), backgroundColor: "#8b5cf6" }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#a29cc9" } },
          y: { ticks: { color: "#a29cc9" }, beginAtZero: true },
        },
      },
    });
  }

  function statCard(label, value) {
    const c = el("div", "fw-stat-card");
    c.appendChild(el("div", "fw-stat-label", label));
    c.appendChild(el("div", "fw-stat-value", String(value)));
    return c;
  }

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  function renderSettings() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Settings"));
    card.appendChild(el("p", "fw-muted", "Student count and per-student food assumptions drive preparation and wastage math."));

    const fields = [
      ["Total students in hostel", "totalStudents"],
      ["Avg kg food per student (per dish slot)", "avgKgPerStudent"],
      ["Alert if wastage % exceeds", "wastageAlertPct"],
      ["Low demand: dislike ratio ≥", "lowDemandDislikeRatio"],
    ];

    const inputs = {};
    fields.forEach(([label, key]) => {
      const wrap = el("div");
      wrap.appendChild(el("label", "fw-label", label));
      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.className = "fw-input";
      input.value = settings[key];
      inputs[key] = input;
      wrap.appendChild(input);
      card.appendChild(wrap);
    });

    const saveBtn = el("button", "fw-btn", "Save settings");
    saveBtn.addEventListener("click", () => {
      Object.keys(inputs).forEach((key) => {
        const v = parseFloat(inputs[key].value);
        if (!isNaN(v)) settings[key] = v;
      });
      save(KEYS.settings, settings);
      recomputeAlerts();
      showToast("Settings saved.");
    });
    card.appendChild(saveBtn);
    content.appendChild(card);
  }

  // ---------------------------------------------------------------------
  // Menus (day-wise dish management)
  // ---------------------------------------------------------------------
  function renderMenus() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Day-wise menus"));
    card.appendChild(el("p", "fw-muted", "Each weekday has its own breakfast, lunch and dinner list. Dish IDs stay stable for feedback history."));

    const row = el("div", "fw-row");

    const dayWrap = el("div");
    dayWrap.appendChild(el("label", "fw-label", "Day"));
    const daySelect = document.createElement("select");
    daySelect.className = "fw-select";
    DAYS.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      daySelect.appendChild(opt);
    });
    daySelect.value = window._fwSelectedDay || "Monday";
    dayWrap.appendChild(daySelect);
    row.appendChild(dayWrap);

    const mealWrap = el("div");
    mealWrap.appendChild(el("label", "fw-label", "Meal"));
    const mealSelect = document.createElement("select");
    mealSelect.className = "fw-select";
    MEALS.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      mealSelect.appendChild(opt);
    });
    mealSelect.value = window._fwSelectedMeal || "Breakfast";
    mealWrap.appendChild(mealSelect);
    row.appendChild(mealWrap);

    card.appendChild(row);

    const addRow = el("div", "fw-row");
    const nameWrap = el("div");
    const nameInput = document.createElement("input");
    nameInput.className = "fw-input";
    nameInput.placeholder = "New dish name";
    nameWrap.appendChild(nameInput);
    addRow.appendChild(nameWrap);

    const addBtnWrap = el("div");
    addBtnWrap.style.flex = "0 0 auto";
    const addBtn = el("button", "fw-btn", "Add dish");
    addBtnWrap.appendChild(addBtn);
    addRow.appendChild(addBtnWrap);
    card.appendChild(addRow);

    const listWrap = el("div");
    listWrap.style.marginTop = "18px";
    card.appendChild(listWrap);
    content.appendChild(card);

    function renderList() {
      const day = daySelect.value;
      const meal = mealSelect.value;
      window._fwSelectedDay = day;
      window._fwSelectedMeal = meal;
      listWrap.innerHTML = "";
      if (!menus[day]) menus[day] = { Breakfast: [], Lunch: [], Dinner: [] };
      const dishes = menus[day][meal] || [];
      if (dishes.length === 0) {
        listWrap.appendChild(el("p", "fw-empty", "No dishes yet — add one above."));
      }
      dishes.forEach((dish) => {
        const r = el("div", "fw-remove-row");
        r.appendChild(el("div", null, dish.name));
        const removeBtn = el("button", "fw-btn danger", "Remove");
        removeBtn.style.marginTop = "0";
        removeBtn.addEventListener("click", () => {
          menus[day][meal] = menus[day][meal].filter((d) => d.id !== dish.id);
          save(KEYS.menus, menus);
          renderList();
        });
        r.appendChild(removeBtn);
        listWrap.appendChild(r);
      });
    }

    daySelect.addEventListener("change", renderList);
    mealSelect.addEventListener("change", renderList);
    addBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const day = daySelect.value;
      const meal = mealSelect.value;
      if (!menus[day]) menus[day] = { Breakfast: [], Lunch: [], Dinner: [] };
      if (!menus[day][meal]) menus[day][meal] = [];
      menus[day][meal].push(mkDish(name));
      save(KEYS.menus, menus);
      nameInput.value = "";
      showToast("Dish added.");
      renderList();
    });

    renderList();
  }

  // ---------------------------------------------------------------------
  // Holidays
  // ---------------------------------------------------------------------
  function renderHolidays() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Holiday calendar"));

    const wrap = el("div");
    wrap.appendChild(el("label", "fw-label", "Date"));
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "fw-input";
    wrap.appendChild(dateInput);
    card.appendChild(wrap);

    const markBtn = el("button", "fw-btn", "Mark as holiday");
    card.appendChild(markBtn);

    card.appendChild(el("p", "fw-label", "Marked holidays"));
    const list = document.createElement("ul");
    list.className = "fw-holiday-list";
    card.appendChild(list);
    content.appendChild(card);

    function renderList() {
      list.innerHTML = "";
      if (holidays.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No holidays marked yet.";
        list.appendChild(li);
        return;
      }
      holidays
        .slice()
        .sort()
        .forEach((h) => {
          const li = document.createElement("li");
          const span = document.createElement("span");
          span.textContent = h;
          li.appendChild(span);
          const rm = el("button", "fw-btn danger", "Remove");
          rm.style.marginTop = "0";
          rm.style.padding = "4px 10px";
          rm.addEventListener("click", () => {
            holidays = holidays.filter((d) => d !== h);
            save(KEYS.holidays, holidays);
            renderList();
          });
          li.appendChild(rm);
          list.appendChild(li);
        });
    }

    markBtn.addEventListener("click", () => {
      const val = dateInput.value;
      if (!val) return;
      if (!holidays.includes(val)) {
        holidays.push(val);
        save(KEYS.holidays, holidays);
        showToast("Holiday marked.");
      }
      renderList();
    });

    renderList();
  }

  // ---------------------------------------------------------------------
  // Insights
  // ---------------------------------------------------------------------
  function renderInsights() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Consumption & wastage detail"));

    const refreshBtn = el("button", "fw-btn secondary", "Refresh");
    refreshBtn.style.marginBottom = "10px";
    card.appendChild(refreshBtn);

    const tableWrap = el("div");
    tableWrap.style.overflowX = "auto";
    card.appendChild(tableWrap);
    content.appendChild(card);

    function draw() {
      tableWrap.innerHTML = "";
      const rows = insightsRows();
      if (rows.length === 0) {
        tableWrap.appendChild(el("p", "fw-empty", "No feedback recorded yet. Vote on dishes in “Your menu” to populate this table."));
        return;
      }
      const table = document.createElement("table");
      table.className = "fw-table";
      const thead = document.createElement("thead");
      thead.innerHTML =
        "<tr><th>Date</th><th>Dish</th><th>Likes</th><th>Dislikes</th><th>Prepared (kg)</th><th>Est. need (kg)</th><th>Waste (kg)</th><th>Waste %</th><th>Flag</th></tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        const flagClass = r.flag === "High waste" ? "high" : r.flag === "Low demand" ? "low" : "ok";
        tr.innerHTML = `
          <td>${r.date}</td>
          <td>${r.dishName}</td>
          <td>${r.likes}</td>
          <td>${r.dislikes}</td>
          <td>${r.prepared.toFixed(2)}</td>
          <td>${r.estNeed.toFixed(2)}</td>
          <td>${r.waste.toFixed(2)}</td>
          <td>${r.wastePct.toFixed(1)}%</td>
          <td><span class="fw-flag ${flagClass}">${r.flag}</span></td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    refreshBtn.addEventListener("click", () => {
      recomputeAlerts();
      draw();
      showToast("Insights refreshed.");
    });

    draw();
  }

  // ---------------------------------------------------------------------
  // Alert log
  // ---------------------------------------------------------------------
  function renderAlertLog() {
    const card = el("div", "fw-card");
    card.appendChild(el("h1", null, "Admin notifications"));
    card.appendChild(el("p", "fw-muted", "High wastage and low-demand items appear here automatically."));

    const clearBtn = el("button", "fw-btn secondary", "Clear all");
    clearBtn.addEventListener("click", () => {
      alerts = [];
      save(KEYS.alerts, alerts);
      showToast("Notifications cleared.");
      render();
    });
    card.appendChild(clearBtn);

    const list = el("div");
    list.style.marginTop = "14px";
    if (alerts.length === 0) {
      list.appendChild(el("p", "fw-empty", "No alerts right now."));
    } else {
      alerts.forEach((a) => {
        const item = el("div", "fw-alert-item");
        item.appendChild(el("div", "fw-alert-title", a.title));
        item.appendChild(el("div", "fw-alert-msg", a.message));
        item.appendChild(el("div", "fw-alert-time", new Date(a.timestamp).toLocaleString()));
        list.appendChild(item);
      });
    }
    card.appendChild(list);
    content.appendChild(card);
  }

  // ---------------------------------------------------------------------
  // small DOM helper
  // ---------------------------------------------------------------------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------------------------------------------------------------------
  // init
  // ---------------------------------------------------------------------
  persistAll();
  recomputeAlerts();
  render();
})();
