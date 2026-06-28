/**
 * Profile Controller — View & edit user profile
 */
angular.module('fitlife').controller('ProfileCtrl', [
  '$scope', '$rootScope', 'UserService', 'AuthService',
  function ($scope, $rootScope, UserService, AuthService) {

    $scope.loading    = true;
    $scope.submitting = false;
    $scope.editing    = false;
    $scope.msg        = { type: '', text: '' };
    $scope.profile    = {};
    $scope.form       = {};

    $scope.goals = [
      { value: 'lose_weight',   label: 'Lose Weight',   icon: '🔥' },
      { value: 'maintain',      label: 'Maintain',       icon: '⚖️' },
      { value: 'build_muscle',  label: 'Build Muscle',   icon: '💪' }
    ];

    $scope.genders = [
      { value: 'male',   label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'other',  label: 'Other' }
    ];

    /* ── Load profile ───────────────────────────────── */
    function load() {
      $scope.loading = true;
      UserService.getProfile()
        .then(function (res) {
          $scope.profile = res.data.data;
          $scope.form    = angular.copy($scope.profile);
        })
        .catch(function () {
          $scope.msg = { type: 'error', text: 'Failed to load profile.' };
        })
        .finally(function () { $scope.loading = false; });
    }

    /* ── Edit toggle ────────────────────────────────── */
    $scope.startEdit = function () {
      $scope.form = angular.copy($scope.profile);
      $scope.editing = true;
      $scope.msg = { type: '', text: '' };
    };

    $scope.cancelEdit = function () {
      $scope.editing = false;
      $scope.msg = { type: '', text: '' };
    };

    /* ── Fitness goal selector ──────────────────────── */
    $scope.selectGoal = function (val) { $scope.form.fitnessGoal = val; };

    /* ── Save profile ───────────────────────────────── */
    $scope.saveProfile = function () {
      $scope.msg = { type: '', text: '' };
      if (!$scope.form.name) {
        $scope.msg = { type: 'error', text: 'Name is required.' };
        return;
      }
      $scope.submitting = true;

      const payload = {
        name:        $scope.form.name,
        age:         $scope.form.age         || undefined,
        gender:      $scope.form.gender       || undefined,
        height:      $scope.form.height       || undefined,
        weight:      $scope.form.weight       || undefined,
        fitnessGoal: $scope.form.fitnessGoal  || undefined
      };

      UserService.updateProfile(payload)
        .then(function (res) {
          $scope.profile = res.data.data;
          $scope.editing = false;
          $scope.msg = { type: 'success', text: '✅ Profile updated successfully!' };

          /* Update session user name */
          const user = AuthService.getUser();
          if (user) {
            user.name = $scope.profile.name;
            localStorage.setItem('fitlife_user', JSON.stringify(user));
            $rootScope.currentUser = user;
          }
        })
        .catch(function (err) {
          $scope.msg = { type: 'error', text: (err.data && err.data.message) || 'Failed to update profile.' };
        })
        .finally(function () { $scope.submitting = false; });
    };

    /* ── Helpers ────────────────────────────────────── */
    $scope.getInitials = function (name) {
      if (!name) return '?';
      return name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
    };

    $scope.goalLabel = function (val) {
      const g = $scope.goals.find(function (g) { return g.value === val; });
      return g ? g.icon + ' ' + g.label : val;
    };

    $scope.bmi = function () {
      const h = parseFloat($scope.profile.height);
      const w = parseFloat($scope.profile.weight);
      if (!h || !w) return null;
      const hm = h / 100;
      return (w / (hm * hm)).toFixed(1);
    };

    load();
  }
]);
