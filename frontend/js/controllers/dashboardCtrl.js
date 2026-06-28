/**
 * Dashboard Controller
 * Loads today's nutrition stats, weekly workout summary, and BMI history.
 * Renders Chart.js charts after data arrives.
 */
angular.module('fitlife').controller('DashboardCtrl', [
  '$scope', '$timeout', 'WorkoutService', 'NutritionService', 'BmiService', 'UserService',
  function ($scope, $timeout, WorkoutService, NutritionService, BmiService, UserService) {

    /* ── State ─────────────────────────────────────── */
    $scope.loading = true;
    $scope.today   = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    $scope.weeklyWorkoutData  = [];
    $scope.weeklyNutritionData = [];
    $scope.latestBmi = null;
    $scope.recentWorkouts = [];
    $scope.recentMeals    = [];

    /* Estimated calories burned: ~5 cal/min average */
    $scope.calsBurned = 0;

    let workoutChart, nutritionChart, bmiChart;

    /* ── Chart helpers ──────────────────────────────── */
    const chartDefaults = {
      color: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.08)',
      font: { family: "'DM Sans', sans-serif", size: 12 }
    };

    function buildWorkoutChart(dailySummary) {
      const days   = getLast7Days();
      const labels = days.map(d => fmtLabel(d));
      const vals   = days.map(function (d) {
        const found = dailySummary.find(function (x) { return x._id === d; });
        return found ? found.totalDuration : 0;
      });

      const ctx = document.getElementById('workoutChart');
      if (!ctx) return;
      if (workoutChart) workoutChart.destroy();

      workoutChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Duration (min)',
            data: vals,
            backgroundColor: vals.map(function (v) {
              return v > 0 ? 'rgba(124,58,237,0.7)' : 'rgba(124,58,237,0.15)';
            }),
            borderColor: 'rgba(124,58,237,1)',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: function (c) { return c.raw + ' min'; }
          }}},
          scales: {
            x: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font } },
            y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font }, beginAtZero: true }
          }
        }
      });
    }

    function buildNutritionChart(weekData) {
      const days   = getLast7Days();
      const labels = days.map(d => fmtLabel(d));
      const vals   = days.map(function (d) {
        const found = weekData.find(function (x) { return x._id === d; });
        return found ? found.totalCalories : 0;
      });

      const ctx = document.getElementById('nutritionChart');
      if (!ctx) return;
      if (nutritionChart) nutritionChart.destroy();

      nutritionChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Calories',
            data: vals,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.1)',
            pointBackgroundColor: '#06b6d4',
            pointRadius: 4,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font } },
            y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font }, beginAtZero: true }
          }
        }
      });
    }

    function buildBmiChart(history) {
      const ctx = document.getElementById('bmiChart');
      if (!ctx || !history || history.length === 0) return;
      if (bmiChart) bmiChart.destroy();

      bmiChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(function (b) { return fmtDate(b.date); }),
          datasets: [{
            label: 'BMI',
            data: history.map(function (b) { return b.bmi; }),
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.1)',
            pointBackgroundColor: '#7c3aed',
            pointRadius: 4,
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font } },
            y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: chartDefaults.font } }
          }
        }
      });
    }

    /* ── Date helpers ───────────────────────────────── */
    function getLast7Days() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }
      return days;
    }

    function fmtLabel(iso) {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    }

    function fmtDate(iso) {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    /* Build weekly nutrition aggregation from history */
    function aggregateWeeklyNutrition(entries) {
      const map = {};
      const days = getLast7Days();
      days.forEach(function (d) { map[d] = { _id: d, totalCalories: 0 }; });
      entries.forEach(function (e) {
        const d = new Date(e.date).toISOString().split('T')[0];
        if (map[d]) map[d].totalCalories += e.calories;
      });
      return days.map(function (d) { return map[d]; });
    }

    /* ── Load data ──────────────────────────────────── */
    function loadDashboard() {
      const today = new Date().toISOString().split('T')[0];

      Promise.all([
        WorkoutService.weeklySummary().$promise   || WorkoutService.weeklySummary(),
        NutritionService.dailyStats(today),
        NutritionService.getHistory(1),
        BmiService.getHistory()
      ].map(function (p) { return p.catch ? p : { then: p.then.bind(p) }; }))
      .then(function () { /* handled below */ });

      /* Use .then chains for AngularJS $http promises */
      WorkoutService.weeklySummary().then(function (res) {
        const { dailySummary } = res.data.data;
        $scope.weeklyWorkoutData = dailySummary;
        $scope.calsBurned = dailySummary.reduce(function (a, d) { return a + d.totalDuration * 5; }, 0);
        $scope.todayWorkoutDuration = (function () {
          const todayStr = new Date().toISOString().split('T')[0];
          const t = dailySummary.find(function (d) { return d._id === todayStr; });
          return t ? t.totalDuration : 0;
        }());
        $timeout(function () { buildWorkoutChart(dailySummary); }, 50);
      });

      NutritionService.dailyStats(today).then(function (res) {
        $scope.today = res.data.data.totals;
      });

      NutritionService.getHistory(1).then(function (res) {
        const entries = res.data.data.entries;
        $scope.recentMeals = entries.slice(0, 5);
        const weekly = aggregateWeeklyNutrition(entries);
        $timeout(function () { buildNutritionChart(weekly); }, 50);
      });

      BmiService.getHistory().then(function (res) {
        const history = res.data.data;
        if (history.length > 0) {
          $scope.latestBmi = history[history.length - 1];
        }
        $timeout(function () { buildBmiChart(history); }, 50);
      });

      WorkoutService.getHistory(1).then(function (res) {
        $scope.recentWorkouts = res.data.data.workouts.slice(0, 5);
        $scope.loading = false;
      }).catch(function () { $scope.loading = false; });
    }

    $scope.bmiColorClass = function (cat) {
      const map = { Underweight: 'text-blue', Normal: 'text-green', Overweight: 'text-yellow', Obese: 'text-red' };
      return map[cat] || '';
    };

    $scope.netCalories = function () {
      return ($scope.today.calories || 0) - ($scope.calsBurned || 0);
    };

    loadDashboard();
  }
]);
