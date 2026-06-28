/**
 * Auth Controller — Login (Password + OTP) & Register
 */
angular.module('fitlife').controller('AuthCtrl', [
  '$scope', '$location', '$rootScope', 'AuthService',
  function ($scope, $location, $rootScope, AuthService) {

    $scope.loginData    = {};
    $scope.registerData = { fitnessGoal: 'maintain', gender: 'male' };
    $scope.loading      = false;
    $scope.error        = '';
    $scope.success      = '';

    // OTP flow state
    $scope.otpStep      = false;
    $scope.otpSent      = false;
    $scope.otpData      = { email: '', otp: '' };

    /* ── Password Login ─────────────────────────────── */
    $scope.login = function () {
      $scope.error = '';
      if (!$scope.loginData.email || !$scope.loginData.password) {
        $scope.error = 'Please fill in all fields.';
        return;
      }
      $scope.loading = true;

      AuthService.login($scope.loginData)
        .then(function (res) {
          const { token, refreshToken, user } = res.data.data;
          AuthService.saveSession(token, refreshToken, user);
          $rootScope.isLoggedIn  = true;
          $rootScope.currentUser = user;
          $location.path('/dashboard');
        })
        .catch(function (err) {
          $scope.error = (err.data && err.data.message) || 'Login failed. Please try again.';
        })
        .finally(function () { $scope.loading = false; });
    };

    /* ── OTP Login ──────────────────────────────────── */
    $scope.startOtp = function () {
      $scope.otpStep = true;
      $scope.otpSent = false;
      $scope.error   = '';
      $scope.success = '';
    };

    $scope.sendOtp = function () {
      $scope.error = '';
      if (!$scope.otpData.email) {
        $scope.error = 'Please enter your email address.';
        return;
      }
      $scope.loading = true;

      AuthService.sendOtp($scope.otpData.email)
        .then(function () {
          $scope.otpSent = true;
          $scope.success = '✅ OTP sent to ' + $scope.otpData.email + '. Check your inbox!';
          setTimeout(function() { $scope.$apply(function() { $scope.success = ''; }); }, 5000);
        })
        .catch(function (err) {
          $scope.error = (err.data && err.data.message) || 'Failed to send OTP. Check SMTP configuration.';
        })
        .finally(function () { $scope.loading = false; });
    };

    $scope.loginWithOtp = function () {
      $scope.error = '';
      if (!$scope.otpData.email || !$scope.otpData.otp) {
        $scope.error = 'Please enter both email and OTP.';
        return;
      }
      if ($scope.otpData.otp.length !== 6) {
        $scope.error = 'OTP must be exactly 6 digits.';
        return;
      }
      $scope.loading = true;

      AuthService.loginWithOtp($scope.otpData.email, $scope.otpData.otp)
        .then(function (res) {
          const { token, refreshToken, user } = res.data.data;
          AuthService.saveSession(token, refreshToken, user);
          $rootScope.isLoggedIn  = true;
          $rootScope.currentUser = user;
          $location.path('/dashboard');
        })
        .catch(function (err) {
          $scope.error = (err.data && err.data.message) || 'Invalid or expired OTP. Please try again.';
        })
        .finally(function () { $scope.loading = false; });
    };

    /* ── Register ───────────────────────────────────── */
    $scope.register = function () {
      $scope.error = $scope.success = '';

      if (!$scope.registerData.name || !$scope.registerData.email || !$scope.registerData.password) {
        $scope.error = 'Name, email and password are required.';
        return;
      }
      if ($scope.registerData.password.length < 6) {
        $scope.error = 'Password must be at least 6 characters.';
        return;
      }
      $scope.loading = true;

      AuthService.register($scope.registerData)
        .then(function (res) {
          const { token, refreshToken, user } = res.data.data;
          AuthService.saveSession(token, refreshToken, user);
          $rootScope.isLoggedIn  = true;
          $rootScope.currentUser = user;
          $location.path('/dashboard');
        })
        .catch(function (err) {
          $scope.error = (err.data && err.data.message) || 'Registration failed. Please try again.';
        })
        .finally(function () { $scope.loading = false; });
    };
  }
]);
