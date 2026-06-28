/**
 * Workout Controller — Log, History, Weekly Summary
 */
angular.module('fitlife').controller('WorkoutCtrl', [
  '$scope', '$timeout', 'WorkoutService',
  function ($scope, $timeout, WorkoutService) {

    /* ── State ─────────────────────────────────────── */
    $scope.tab     = 'log';     // 'log' | 'history' | 'summary'
    $scope.loading = false;
    $scope.submitting = false;
    $scope.msg     = { type: '', text: '' };

    $scope.workouts = [];
    $scope.summary  = { daily: [], categories: [] };
    $scope.page     = 1;
    $scope.totalPages = 1;

    $scope.categories = ['chest','back','legs','cardio','shoulders','arms','core','full-body'];

    /* ── Form model ─────────────────────────────────── */
    const today = new Date().toISOString().slice(0,10);
    $scope.form = {
      exercise: '', category: 'cardio',
      sets: null, reps: null, weight: 0, duration: 30,
      date: today
    };

    /* ── Tab switching ──────────────────────────────── */
    $scope.setTab = function (t) {
      $scope.tab = t;
      $scope.msg = { type: '', text: '' };
      if (t === 'history') loadHistory();
      if (t === 'summary') loadSummary();
    };

    /* ── Log workout ────────────────────────────────── */
    $scope.logWorkout = function () {
      $scope.msg = { type: '', text: '' };
      if (!$scope.form.exercise || !$scope.form.category || !$scope.form.duration) {
        $scope.msg = { type: 'error', text: 'Exercise, category and duration are required.' };
        return;
      }
      $scope.submitting = true;

      WorkoutService.log($scope.form)
        .then(function () {
          $scope.msg = { type: 'success', text: '✅ Workout logged successfully!' };
          $scope.form = { exercise: '', category: 'cardio', sets: null, reps: null, weight: 0, duration: 30, date: today };
          $timeout(function () { $scope.msg = { type: '', text: '' }; }, 3500);
        })
        .catch(function (err) {
          $scope.msg = { type: 'error', text: (err.data && err.data.message) || 'Failed to log workout.' };
        })
        .finally(function () { $scope.submitting = false; });
    };

    /* ── History ────────────────────────────────────── */
    function loadHistory() {
      $scope.loading = true;
      WorkoutService.getHistory($scope.page)
        .then(function (res) {
          $scope.workouts   = res.data.data.workouts;
          $scope.totalPages = res.data.data.totalPages;
        })
        .catch(function () { $scope.msg = { type: 'error', text: 'Failed to load history.' }; })
        .finally(function () { $scope.loading = false; });
    }

    $scope.nextPage = function () { if ($scope.page < $scope.totalPages) { $scope.page++; loadHistory(); } };
    $scope.prevPage = function () { if ($scope.page > 1) { $scope.page--; loadHistory(); } };

    $scope.deleteWorkout = function (id) {
      if (!confirm('Delete this workout?')) return;
      WorkoutService.remove(id)
        .then(function () { $scope.workouts = $scope.workouts.filter(function (w) { return w._id !== id; }); })
        .catch(function () { alert('Failed to delete workout.'); });
    };

    /* ── Weekly summary ─────────────────────────────── */
    let summaryChart;

    function loadSummary() {
      $scope.loading = true;
      WorkoutService.weeklySummary()
        .then(function (res) {
          $scope.summary.daily      = res.data.data.dailySummary;
          $scope.summary.categories = res.data.data.categorySummary;
          $timeout(function () { buildSummaryChart(res.data.data.dailySummary); }, 50);
        })
        .catch(function () { $scope.msg = { type: 'error', text: 'Failed to load summary.' }; })
        .finally(function () { $scope.loading = false; });
    }

    function buildSummaryChart(dailySummary) {
      const ctx = document.getElementById('summaryChart');
      if (!ctx) return;
      if (summaryChart) summaryChart.destroy();

      const days = getLast7();
      summaryChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: days.map(fmtLabel),
          datasets: [{
            label: 'Duration (min)',
            data: days.map(function (d) {
              const f = dailySummary.find(function (x) { return x._id === d; });
              return f ? f.totalDuration : 0;
            }),
            backgroundColor: 'rgba(124,58,237,0.65)',
            borderColor: '#7c3aed',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#94a3b8' }, beginAtZero: true }
          }
        }
      });
    }

    /* ── Helpers ────────────────────────────────────── */
    function getLast7() {
      return Array.from({ length: 7 }, function (_, i) {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
      });
    }
    function fmtLabel(iso) {
      return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    }

    $scope.fmtDate = function (iso) {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    $scope.categoryClass = function (cat) {
      const map = { chest:'cat-chest', back:'cat-back', legs:'cat-legs', cardio:'cat-cardio',
                    shoulders:'cat-shoulders', arms:'cat-arms', core:'cat-core', 'full-body':'cat-full-body' };
      return 'badge ' + (map[cat] || 'badge-purple');
    };

    $scope.totalWeekDuration = function () {
      return $scope.summary.daily.reduce(function (a, d) { return a + d.totalDuration; }, 0);
    };
  }
]);
