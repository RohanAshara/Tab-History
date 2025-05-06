// Global variables for charts
let chartInstance = null;
let userHistoryData = [];

// Function to display history
function displayHistory() {
  chrome.storage.local.get({ userHistory: [] }, (result) => {
    userHistoryData = result.userHistory; // Store in global variable for charts
    const container = document.getElementById("historyList");
    container.innerHTML = ""; // Clear previous content

    if (userHistoryData.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No browsing history recorded yet</div>';
      return;
    }

    // Display most recent entries first
    userHistoryData
      .slice()
      .reverse()
      .forEach((entry) => {
        const div = document.createElement("div");
        div.className = "entry";

        div.innerHTML = `
        <div class="title">${entry.title || "Unknown Page"}</div>
        <div class="url">${entry.url}</div>
        <div class="meta">
          <span>Visited: ${entry.visitedAt}</span>
          <span>Time: ${entry.timeSpent}</span>
        </div>
      `;

        container.appendChild(div);
      });
  });
}

// Function to display filtered history based on selected time range
function updateHistoryByTimeRange() {
  const timeRangeSelect = document.querySelector("#history-tab #timeRange");
  const selectedRange = timeRangeSelect.value;

  const filteredData = filterHistoryByTimeRange(userHistoryData, selectedRange);
  const container = document.getElementById("historyList");
  container.innerHTML = "";

  if (filteredData.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No browsing history found for this time range</div>';
    return;
  }

  // Display most recent entries first
  filteredData
    .slice()
    .reverse()
    .forEach((entry) => {
      const div = document.createElement("div");
      div.className = "entry";

      div.innerHTML = `
      <div class="title">${entry.title || "Unknown Page"}</div>
      <div class="url">${entry.url}</div>
      <div class="meta">
        <span>Visited: ${entry.visitedAt}</span>
        <span>Time: ${entry.timeSpent}</span>
      </div>
    `;

      container.appendChild(div);
      console.log("time range selected:", selectedRange)
    });
}

// Clear history function
function clearHistory() {
  if (confirm("Are you sure you want to clear all browsing history?")) {
    chrome.storage.local.set({ userHistory: [] }, () => {
      displayHistory();
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
    });
  }
}

// Parse duration string to seconds
function parseDuration(durationStr) {
  let seconds = 0;

  if (durationStr.includes("hr")) {
    const hours = parseInt(durationStr.match(/(\d+) hr/)[1] || 0);
    seconds += hours * 3600;
  }

  if (durationStr.includes("min")) {
    const minutes = parseInt(durationStr.match(/(\d+) min/)[1] || 0);
    seconds += minutes * 60;
  }

  if (durationStr.includes("sec")) {
    const secs = parseInt(durationStr.match(/(\d+) sec/)[1] || 0);
    seconds += secs;
  }

  return seconds;
}

// Get domain from URL
function getDomain(url) {
  try {
    const domain = new URL(url).hostname;
    return domain;
  } catch (e) {
    return url;
  }
}

// Filter history by time range
function filterHistoryByTimeRange(data, range) {
  const now = new Date();
  let startTime;

  switch (range) {
    case "day":
      startTime = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startTime = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startTime = new Date(now.setMonth(now.getMonth() - 1));
      break;
    default: // 'all'
      return data;
  }

  return data.filter((entry) => {
    const entryDate = new Date(entry.visitedAt);
    return entryDate >= startTime;
  });
}

// Process data for charts
function processDataForCharts(data, timeRange) {
  // Filter data by time range
  const filteredData = filterHistoryByTimeRange(data, timeRange);

  // Group by domain and sum time spent
  const domainTimeMap = {};

  filteredData.forEach((entry) => {
    const domain = getDomain(entry.url);
    const timeSpentSeconds = parseDuration(entry.timeSpent);

    if (domainTimeMap[domain]) {
      domainTimeMap[domain] += timeSpentSeconds;
    } else {
      domainTimeMap[domain] = timeSpentSeconds;
    }
  });

  // Convert to arrays for Chart.js
  const domains = Object.keys(domainTimeMap);
  const timeSpent = Object.values(domainTimeMap);

  // Format time for display (convert seconds to minutes)
  const formattedTimeSpent = timeSpent.map((seconds) => {
    if (seconds < 60) return seconds + "s";
    return Math.round(seconds / 60) + "m";
  });

  return {
    domains,
    timeSpent,
    formattedTimeSpent,
  };
}

// Update chart based on type and time range
function updateChart() {
  const chartType = document.getElementById("chartType").value;
  const timeRange = document.getElementById("timeRange").value;
  const chartCanvas = document.getElementById("statsChart");

  // Process data
  const { domains, timeSpent, formattedTimeSpent } = processDataForCharts(
    userHistoryData,
    timeRange
  );

  // Destroy previous chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Check if we have data
  if (!domains.length) {
    document.getElementById("chartMessage").textContent =
      "No data available for the selected time period";
    document.getElementById("chartMessage").style.display = "block";
    return;
  }

  // Generate random colors for chart segments
  const colors = domains.map(() => {
    const r = Math.floor(Math.random() * 200) + 55; // Avoid too dark colors
    const g = Math.floor(Math.random() * 200) + 55;
    const b = Math.floor(Math.random() * 200) + 55;
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  });

  // Create chart configuration
  const chartConfig = {
    type: chartType,
    data: {
      labels: domains,
      datasets: [
        {
          label: "Time Spent",
          data: timeSpent,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#fff",
          },
        },
      },
    },
  };

  // Create the chart
  chartInstance = new Chart(chartCanvas, chartConfig);
}

// Tab switching
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and content
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab
      tab.classList.add("active");

      // Show corresponding content
      const tabName = tab.getAttribute("data-tab");
      document.getElementById(`${tabName}-tab`).classList.add("active");
    });
  });
}

function debounce(func, delay) {
  let timeout;
  return function () {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, arguments), delay);
  };
}

document.getElementById('myInput').addEventListener('input', function () {
  const query = this.value.toLowerCase();
  const entries = document.querySelectorAll('#historyList .entry');
  let hasMatch = false;

  entries.forEach(entry => {
    const title = entry.querySelector('.title')?.textContent.toLowerCase() || '';
    const url = entry.querySelector('.url')?.textContent.toLowerCase() || '';
    const match = title.includes(query) || url.includes(query);
    entry.style.display = match ? 'block' : 'none';
    if (match) hasMatch = true;
  });

  const historyList = document.getElementById("historyList");
  const existingMsg = document.getElementById("noResultsMessage");

  if (!hasMatch) {
    if (!existingMsg) {
      const msg = document.createElement("div");
      msg.id = "noResultsMessage";
      msg.className = "empty-state";
      msg.textContent = "No matching history found.";
      historyList.appendChild(msg);
    }
  } else {
    if (existingMsg) existingMsg.remove();
  }
});


// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  // Initialize canvas
  const canvas = document.getElementById("statsChart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentNode.clientWidth || 500;
    canvas.height = canvas.parentNode.clientHeight || 300;
  }

  displayHistory();
  setupTabs();

  // Handle time range change in history tab
  document
    .querySelector("#history-tab #timeRange").addEventListener("change", updateHistoryByTimeRange);

  // Set up clear button
  document
    .getElementById("clearHistory").addEventListener("click", clearHistory);

  // Set up generate chart button
  document
    .getElementById("generateChart").addEventListener("click", updateChart);
});
