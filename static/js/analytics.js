const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dayInputIds = ["day-mon", "day-tue", "day-wed", "day-thu", "day-fri", "day-sat", "day-sun"];

let lineChart = null;
let barChart = null;

function readInputs() {
  const students = parseFloat(document.getElementById("num-students").value) || 0;
  const avgFood = parseFloat(document.getElementById("avg-food").value) || 0;
  const actuals = dayInputIds.map((id) => parseFloat(document.getElementById(id).value) || 0);
  return { students, avgFood, actuals };
}

function computeAndRender() {
  const { students, avgFood, actuals } = readInputs();
  const expectedPerDay = students * avgFood;
  const expectedSeries = dayLabels.map(() => expectedPerDay);
  const wastageSeries = actuals.map((a) => Math.max(expectedPerDay - a, 0));

  const totalExpected = expectedPerDay * 7;
  const totalConsumed = actuals.reduce((sum, v) => sum + v, 0);
  const totalWasted = Math.max(totalExpected - totalConsumed, 0);
  const wastePct = totalExpected > 0 ? (totalWasted / totalExpected) * 100 : 0;

  document.getElementById("res-expected").textContent = totalExpected.toFixed(2);
  document.getElementById("res-consumed").textContent = totalConsumed.toFixed(2);
  document.getElementById("res-wasted").textContent = totalWasted.toFixed(2);
  document.getElementById("res-pct").textContent = wastePct.toFixed(2) + "%";

  const lineCtx = document.getElementById("lineChart").getContext("2d");
  const barCtx = document.getElementById("barChart").getContext("2d");

  if (lineChart) lineChart.destroy();
  if (barChart) barChart.destroy();

  lineChart = new Chart(lineCtx, {
    type: "line",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: "Expected (kg)",
          data: expectedSeries,
          borderColor: "#c2542a",
          backgroundColor: "transparent",
          tension: 0,
        },
        {
          label: "Actual consumed (kg)",
          data: actuals,
          borderColor: "#2fa38c",
          backgroundColor: "transparent",
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    },
  });

  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: dayLabels,
      datasets: [
        {
          label: "Daily wastage (kg)",
          data: wastageSeries,
          backgroundColor: "#d9a06b",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

document.getElementById("update-btn").addEventListener("click", computeAndRender);
window.addEventListener("DOMContentLoaded", computeAndRender);
