/**
 * Chart.js Integration Module
 * Renders interactive dynamic visualizations for sentiment and feedback analytics.
 */

const AppCharts = {
  sentimentPieChart: null,
  facultyBarChart: null,
  subjectStackedChart: null,
  ratingDistChart: null,
  timelineChart: null,

  // Common dark theme chart defaults
  commonOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#9ca3af",
          font: { family: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", size: 12 }
        }
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f9fafb",
        bodyColor: "#e5e7eb",
        borderColor: "rgba(255, 255, 255, 0.15)",
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
  // Direct match to Page 11 code snippet: labels: ['Positive', 'Negative', 'Neutral']
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
            "#10b981", // Emerald Green for Positive
            "#f43f5e", // Rose Red for Negative
            "#f59e0b"  // Amber Orange for Neutral
          ],
          borderColor: "#111827",
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
              color: "#9ca3af",
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
            backgroundColor: "rgba(99, 102, 241, 0.8)",
            borderColor: "#6366f1",
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y"
          },
          {
            label: "Reviews Count",
            data: counts,
            backgroundColor: "rgba(16, 185, 129, 0.4)",
            borderColor: "#10b981",
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
            ticks: { color: "#9ca3af", maxRotation: 30 },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            min: 0,
            max: 5,
            ticks: { color: "#9ca3af", stepSize: 1 },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            min: 0,
            ticks: { color: "#9ca3af", stepSize: 2 },
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
            backgroundColor: "#10b981",
            borderRadius: 4
          },
          {
            label: "Neutral",
            data: neuData,
            backgroundColor: "#f59e0b",
            borderRadius: 4
          },
          {
            label: "Negative",
            data: negData,
            backgroundColor: "#f43f5e",
            borderRadius: 4
          }
        ]
      },
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#9ca3af" },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y: {
            stacked: true,
            ticks: { color: "#9ca3af", stepSize: 1 },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
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
            "#f43f5e",
            "#fb923c",
            "#f59e0b",
            "#84cc16",
            "#10b981"
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
            ticks: { color: "#9ca3af" },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y: {
            ticks: { color: "#9ca3af", stepSize: 1 },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
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
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.3
          },
          {
            label: "Negative Feedback",
            data: negativeTrend,
            borderColor: "#f43f5e",
            backgroundColor: "rgba(244, 63, 94, 0.1)",
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        ...this.commonOptions,
        scales: {
          x: {
            ticks: { color: "#9ca3af" },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          },
          y: {
            ticks: { color: "#9ca3af", stepSize: 1 },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          }
        }
      }
    });
  }
};
