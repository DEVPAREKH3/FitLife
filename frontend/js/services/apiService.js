/**
 * FitLife — API Service & HTTP Interceptor
 * Centralises all backend calls and attaches JWT to every request.
 */
angular
  .module('fitlife')

  /* ── JWT $http Interceptor ──────────────────────── */
  .factory('AuthInterceptor', ['$q', function ($q) {
    return {
      request: function (config) {
        const token = localStorage.getItem('fitlife_token');
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = 'Bearer ' + token;
        }
        return config;
      },
      responseError: function (rejection) {
        if (rejection.status === 401) {
          localStorage.removeItem('fitlife_token');
          localStorage.removeItem('fitlife_user');
          window.location.hash = '#/login';
        }
        return $q.reject(rejection);
      }
    };
  }])

  .config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('AuthInterceptor');
  }])

  /* ── Auth Service ───────────────────────────────── */
  .service('AuthService', ['$http', function ($http) {
    const API = 'http://localhost:5055/api/auth';

    this.register     = function (data)         { return $http.post(API + '/register',  data); };
    this.login        = function (data)         { return $http.post(API + '/login',     data); };
    this.sendOtp      = function (email)        { return $http.post(API + '/send-otp',  { email }); };
    this.loginWithOtp = function (email, otp)   { return $http.post(API + '/login-otp', { email, otp }); };

    this.saveSession = function (token, refreshToken, user) {
      localStorage.setItem('fitlife_token', token);
      localStorage.setItem('fitlife_refresh', refreshToken);
      localStorage.setItem('fitlife_user', JSON.stringify(user));
    };

    this.logout = function () {
      localStorage.removeItem('fitlife_token');
      localStorage.removeItem('fitlife_refresh');
      localStorage.removeItem('fitlife_user');
    };

    this.isLoggedIn = function () { return !!localStorage.getItem('fitlife_token'); };

    this.getUser = function () {
      try { return JSON.parse(localStorage.getItem('fitlife_user')) || null; }
      catch (e) { return null; }
    };
  }])

  /* ── User Service ───────────────────────────────── */
  .service('UserService', ['$http', function ($http) {
    const API = 'http://localhost:5055/api/user';
    this.getProfile    = function ()     { return $http.get(API + '/profile'); };
    this.updateProfile = function (data) { return $http.put(API + '/profile', data); };
  }])

  /* ── Workout Service ────────────────────────────── */
  .service('WorkoutService', ['$http', function ($http) {
    const API = 'http://localhost:5055/api/workout-logs';
    this.log           = function (data) { return $http.post(API + '/log',            data); };
    this.getHistory    = function (page) { return $http.get(API  + '/history?page='  + (page || 1)); };
    this.weeklySummary = function ()     { return $http.get(API  + '/weekly-summary'); };
    this.remove        = function (id)   { return $http.delete(API + '/' + id); };
  }])

  /* ── Nutrition Service ──────────────────────────── */
  .service('NutritionService', ['$http', function ($http) {
    const API = 'http://localhost:5055/api/nutrition-entries';
    this.log        = function (data) { return $http.post(API + '/log',     data); };
    this.getHistory = function (page) { return $http.get(API  + '/history?page=' + (page || 1)); };
    this.dailyStats = function (date) { return $http.get(API  + '/daily-stats?date=' + (date || '')); };
    this.remove     = function (id)   { return $http.delete(API + '/' + id); };
  }])

  /* ── BMI Service ────────────────────────────────── */
  .service('BmiService', ['$http', function ($http) {
    const API = 'http://localhost:5055/api/bmi';
    this.calculate  = function (data) { return $http.post(API + '/calculate', data); };
    this.getHistory = function ()     { return $http.get(API  + '/history'); };
  }]);
