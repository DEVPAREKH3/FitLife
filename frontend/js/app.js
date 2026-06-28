/**
 * FitLife — AngularJS 1.8 Application Module
 * Defines routes, auth guard, and global AppCtrl
 */
angular
  .module('fitlife', ['ngRoute'])

  /* ── Route Configuration ───────────────────────── */
  .config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    const v = '1.0.2';
    $routeProvider
      .when('/login',     { templateUrl: 'views/login.html?v=' + v,    controller: 'AuthCtrl' })
      .when('/register',  { templateUrl: 'views/register.html?v=' + v, controller: 'AuthCtrl' })
      .when('/dashboard', { templateUrl: 'views/dashboard.html?v=' + v,controller: 'DashboardCtrl' })
      .when('/workouts',  { templateUrl: 'views/workouts.html?v=' + v, controller: 'WorkoutCtrl' })
      .when('/diet',      { templateUrl: 'views/diet.html?v=' + v,     controller: 'DietCtrl' })
      .when('/bmi',       { templateUrl: 'views/bmi.html?v=' + v,      controller: 'BmiCtrl' })
      .when('/profile',   { templateUrl: 'views/profile.html?v=' + v,  controller: 'ProfileCtrl' })
      .otherwise({ redirectTo: '/dashboard' });
  }])

  /* ── Global App Controller ─────────────────────── */
  .controller('AppCtrl', ['$scope', '$rootScope', '$location', 'AuthService',
    function ($scope, $rootScope, $location, AuthService) {

      const AUTH_ROUTES = ['/login', '/register'];

      /* Expose to all child scopes */
      $rootScope.isLoggedIn = AuthService.isLoggedIn();
      $rootScope.currentUser = AuthService.getUser();

      /* Auth guard on every route change */
      $rootScope.$on('$routeChangeStart', function (_e, next) {
        const path = next.$$route ? next.$$route.originalPath : '/login';
        const loggedIn = AuthService.isLoggedIn();

        if (!loggedIn && AUTH_ROUTES.indexOf(path) === -1) {
          $location.path('/login');
        } else if (loggedIn && AUTH_ROUTES.indexOf(path) !== -1) {
          $location.path('/dashboard');
        }

        /* Sync sidebar state */
        $rootScope.isLoggedIn  = AuthService.isLoggedIn();
        $rootScope.currentUser = AuthService.getUser();
        $scope.sidebarOpen = false;
      });

      /* Sidebar toggle (mobile) */
      $scope.sidebarOpen = false;
      $scope.toggleSidebar = function () { $scope.sidebarOpen = !$scope.sidebarOpen; };
      $scope.closeSidebar  = function () { $scope.sidebarOpen = false; };

      /* Active nav link helper */
      $scope.isActive = function (path) { return $location.path() === path; };

      /* Logout */
      $scope.logout = function () {
        AuthService.logout();
        $rootScope.isLoggedIn  = false;
        $rootScope.currentUser = null;
        $location.path('/login');
      };

      /* User initials for avatar */
      $scope.getInitials = function (name) {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      };
    }
  ]);
