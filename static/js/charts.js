/**
 * Chart.js Integration Module
 * Renders interactive dynamic visualizations for sentiment and feedback analytics.
 * Styled for Modern Clean Light UI Theme.
 */

const AppCharts = {
  sentimentPieChart: null,
  facultyBarChart: null,
  subjectStackedChart: null,
  ratingDistChart: null,
  timelineChart: null,

  // Common light theme chart defaults
  commonOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#475569",
          font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#ffffff",
        bodyColor: "#f1f5f9",
        borderColor: "#cbd5e1",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4
      }
    }
  },

  destroyChart(instance) {
    if (instance) {
      instance.destroy();
    }
    return null;
  },

  // 1. Sentiment Distribution Doughnut / Pie Chart
  renderSentimentPie(canvasId, sentimentCounts) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.sentimentPieChart = this.destroyChart(this.sentimentPieChart);

    const pos = sentimentCounts.Positive || 0;
    const neg = sentimentCounts.Negative || 0;
    const neu = sentimentCounts.Neutral || 0;

    const ctx = canvas.getContext("2d");
    this.sentimentPieChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Positive", "Negative", "Neutral"],
        datasets: [{
          data: [pos, neg, neu],
          backgroundColor: [
            "#059669", // Emerald Green for Positive
            "#e11d48", // Rose Red for Negative
            "#d97706"  // Amber Orange for Neutral
          ],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        ...this.commonOptions,
        cutout: "68%",
        plugins: {
          ...this.commonOptions.plugins,
          legend: {
            position: "bottom",
            labels: {
              color: "#475569",
              padding: 14
            }
          }
        }
      }
    });
  },

  // 2. Faculty Performance Bar Chart
  renderFacultyBar(canvasId, facultyList) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.facultyBarChart = this.destroyChart(this.facultyBarChart);

    const labels = facultyList.map(f => f.name.replace(/^(Dr\.|Prof\.)\s*/, ""));
    const ratings = facultyList.map(f => f.avg_rating);
    const counts = facultyList.map(f => f.total_reviews);

    const ctx = canvas.getContext("2d");
    this.facultyBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Average Rating (out of 5)",
            data: ratings,
            backgroundColor: "rgba(79, 70, 229, 0.85)",
            borderColor: "#4f46e5",
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y"
          },
          {
            label: "Reviews Count",
            data: counts,
            backgroundColor: "rgba(5, 150, 105, 0.4)",
            borderColor: "#059669",
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            ticks: { color: "#64748b", maxRotation: 30 },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            min: 0,
            max: 5,
            ticks: { color: "#64748b", stepSize: 1 },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            min: 0,
            ticks: { color: "#64748b", stepSize: 2 },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  },

  // 3. Subject-wise Sentiment Stacked Bar Chart
  renderSubjectStacked(canvasId, subjectList) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.subjectStackedChart = this.destroyChart(this.subjectStackedChart);

    const labels = subjectList.map(s => s.code);
    const posData = subjectList.map(s => s.positive_count);
    const neuData = subjectList.map(s => s.neutral_count);
    const negData = subjectList.map(s => s.negative_count);

    const ctx = canvas.getContext("2d");
    this.subjectStackedChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Positive",
            data: posData,
            backgroundColor: "#059669",
            borderRadius: 4
          },
          {
            label: "Neutral",
            data: neuData,
            backgroundColor: "#d97706",
            borderRadius: 4
          },
          {
            label: "Negative",
            data: negData,
            backgroundColor: "#e11d48",
            borderRadius: 4
          }
        ]
      },
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#64748b" },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          y: {
            stacked: true,
            ticks: { color: "#64748b", stepSize: 1 },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  },

  // 4. Rating Distribution Chart
  renderRatingDist(canvasId, ratingDist) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.ratingDistChart = this.destroyChart(this.ratingDistChart);

    const ctx = canvas.getContext("2d");
    this.ratingDistChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
        datasets: [{
          label: "Number of Reviews",
          data: [
            ratingDist["1"] || 0,
            ratingDist["2"] || 0,
            ratingDist["3"] || 0,
            ratingDist["4"] || 0,
            ratingDist["5"] || 0
          ],
          backgroundColor: [
            "#e11d48",
            "#f97316",
            "#d97706",
            "#84cc16",
            "#059669"
          ],
          borderRadius: 6
        }]
      },
      options: {
        ...this.commonOptions,
        plugins: {
          ...this.commonOptions.plugins,
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: "#64748b" },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          y: {
            ticks: { color: "#64748b", stepSize: 1 },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  },

  // 5. Timeline Line Chart
  renderTimeline(canvasId, timelineData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.timelineChart = this.destroyChart(this.timelineChart);

    const labels = timelineData.map(t => t.date);
    const positiveTrend = timelineData.map(t => t.positive);
    const negativeTrend = timelineData.map(t => t.negative);

    const ctx = canvas.getContext("2d");
    this.timelineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Positive Feedback",
            data: positiveTrend,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.08)",
            fill: true,
            tension: 0.3
          },
          {
            label: "Negative Feedback",
            data: negativeTrend,
            borderColor: "#e11d48",
            backgroundColor: "rgba(225, 29, 72, 0.08)",
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            ticks: { color: "#64748b" },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          },
          y: {
            ticks: { color: "#64748b", stepSize: 1 },
            grid: { color: "rgba(0, 0, 0, 0.05)" }
          }
        }
      }
    });
  }
};
