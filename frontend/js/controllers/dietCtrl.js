/**
 * Diet / Nutrition Controller
 * Includes Indian food presets, daily stats, macro doughnut chart, auto-diet generator, and PDF export.
 */
angular.module('fitlife').controller('DietCtrl', [
  '$scope', '$timeout', 'NutritionService', 'UserService',
  function ($scope, $timeout, NutritionService, UserService) {

    /* ── Indian Food Presets ────────────────────────── */
    $scope.presets = [
      { name:'Dal (1 bowl)',          mealType:'lunch',     calories:150, protein:9,  carbs:25, fats:2  },
      { name:'Roti / Chapati',        mealType:'lunch',     calories:120, protein:3,  carbs:24, fats:2  },
      { name:'Basmati Rice (1 cup)',  mealType:'lunch',     calories:206, protein:4,  carbs:45, fats:0  },
      { name:'Paneer (100g)',         mealType:'lunch',     calories:265, protein:18, carbs:3,  fats:20 },
      { name:'Tofu (100g)',           mealType:'lunch',     calories:76,  protein:8,  carbs:1.9,fats:4.8},
      { name:'Cheese (30g)',          mealType:'snack',     calories:120, protein:7,  carbs:0.4,fats:10 },
      { name:'Buttermilk (250ml)',    mealType:'snack',     calories:90,  protein:3,  carbs:12, fats:2  },
      { name:'Skimmed Milk (250ml)',  mealType:'breakfast', calories:90,  protein:8.5,carbs:12, fats:0.5},
      { name:'Fat Milk (250ml)',      mealType:'breakfast', calories:150, protein:8,  carbs:12, fats:8  },
      { name:'Whole Milk (250ml)',    mealType:'breakfast', calories:149, protein:8,  carbs:12, fats:8  },
      { name:'Curd / Dahi (100g)',    mealType:'snack',     calories:61,  protein:3,  carbs:5,  fats:3  },
      { name:'Chicken Curry',         mealType:'dinner',    calories:243, protein:25, carbs:8,  fats:13 },
      { name:'Egg Bhurji (2 eggs)',   mealType:'breakfast', calories:190, protein:14, carbs:4,  fats:13 },
      { name:'Idli (2 pieces)',       mealType:'breakfast', calories:134, protein:4,  carbs:28, fats:1  },
      { name:'Sambar (1 bowl)',       mealType:'lunch',     calories:105, protein:5,  carbs:18, fats:2  },
      { name:'Plain Dosa',            mealType:'breakfast', calories:168, protein:4,  carbs:32, fats:3  },
      { name:'Poha (1 plate)',        mealType:'breakfast', calories:250, protein:5,  carbs:50, fats:3  },
      { name:'Upma (1 plate)',        mealType:'breakfast', calories:220, protein:5,  carbs:42, fats:4  },
      { name:'Rajma (1 cup)',         mealType:'lunch',     calories:210, protein:14, carbs:38, fats:1  },
      { name:'Chhole (1 cup)',        mealType:'lunch',     calories:270, protein:14, carbs:45, fats:4  },
      { name:'Aloo Sabzi (1 bowl)',   mealType:'lunch',     calories:145, protein:3,  carbs:28, fats:3  },
      { name:'Plain Paratha',         mealType:'breakfast', calories:180, protein:4,  carbs:30, fats:6  },
      { name:'Sweet Lassi (1 glass)', mealType:'snack',     calories:240, protein:8,  carbs:38, fats:7  },
      { name:'Banana (1 medium)',     mealType:'snack',     calories:89,  protein:1,  carbs:23, fats:0  },
      { name:'Moong Dal Khichdi',     mealType:'dinner',    calories:260, protein:12, carbs:48, fats:2  },
      { name:'Pav Bhaji (2 pav)',     mealType:'dinner',    calories:350, protein:10, carbs:55, fats:10 },
      { name:'Boiled Egg (1)',        mealType:'breakfast', calories:78,  protein:6,  carbs:1,  fats:5  },
      { name:'Oats (1 bowl cooked)',  mealType:'breakfast', calories:166, protein:6,  carbs:28, fats:4  },
      { name:'Sprouts (1 cup)',       mealType:'snack',     calories:90,  protein:8,  carbs:15, fats:1  }
    ];

    /* ── State ─────────────────────────────────────── */
    $scope.tab           = 'log';
    $scope.submitting    = false;
    $scope.loading       = false;
    $scope.msg           = { type: '', text: '' };
    $scope.selectedPreset = null;
    $scope.entries       = [];
    $scope.dailyStats    = null;
    $scope.page          = 1;
    $scope.totalPages    = 1;

    // Diet recommendations state
    $scope.profile       = null;
    $scope.dietType      = 'veg'; // 'veg' | 'non-veg'
    $scope.recPlan       = null;
    $scope.recSummary    = null;

    const todayStr = new Date().toISOString().slice(0, 10);
    $scope.statsDate = todayStr;

    /* ── Form model ─────────────────────────────────── */
    $scope.form = {
      mealName: '', mealType: 'breakfast',
      calories: null, protein: null, carbs: null, fats: null,
      date: todayStr
    };

    /* ── Init ───────────────────────────────────────── */
    $scope.init = function() {
      $scope.loading = true;
      UserService.getProfile()
        .then(function (res) {
          $scope.profile = res.data.data;
          if ($scope.profile) {
            $scope.generateRecommendedPlan();
          }
        })
        .catch(function (err) {
          console.error('Failed to load profile for diet generation:', err);
        })
        .finally(function() {
          $scope.loading = false;
        });
    };

    /* ── Tab control ────────────────────────────────── */
    $scope.setTab = function (t) {
      $scope.tab = t;
      $scope.msg = { type: '', text: '' };
      if (t === 'history') loadHistory();
      if (t === 'today')   loadDailyStats();
      if (t === 'plan' && !$scope.profile) $scope.init();
    };

    /* ── Preset selection ───────────────────────────── */
    $scope.selectPreset = function (preset) {
      $scope.selectedPreset = preset.name;
      $scope.form.mealName  = preset.name;
      $scope.form.mealType  = preset.mealType;
      $scope.form.calories  = preset.calories;
      $scope.form.protein   = preset.protein;
      $scope.form.carbs     = preset.carbs;
      $scope.form.fats      = preset.fats;
    };

    $scope.clearPreset = function () {
      $scope.selectedPreset = null;
      $scope.form = { mealName: '', mealType: 'breakfast', calories: null, protein: null, carbs: null, fats: null, date: todayStr };
    };

    /* ── Log meal ───────────────────────────────────── */
    $scope.logMeal = function () {
      $scope.msg = { type: '', text: '' };
      const f = $scope.form;
      if (!f.mealName || f.calories === null || f.protein === null || f.carbs === null || f.fats === null) {
        $scope.msg = { type: 'error', text: 'All macro fields are required.' };
        return;
      }
      $scope.submitting = true;

      NutritionService.log(f)
        .then(function () {
          $scope.msg = { type: 'success', text: '✅ Meal logged successfully!' };
          $scope.clearPreset();
          $timeout(function () { $scope.msg = { type: '', text: '' }; }, 3500);
        })
        .catch(function (err) {
          $scope.msg = { type: 'error', text: (err.data && err.data.message) || 'Failed to log meal.' };
        })
        .finally(function () { $scope.submitting = false; });
    };

    /* ── Auto-diet Generator ────────────────────────── */
    $scope.changeDietType = function(type) {
      $scope.dietType = type;
      $scope.generateRecommendedPlan();
    };

    $scope.generateRecommendedPlan = function() {
      if (!$scope.profile) return;
      const w = parseFloat($scope.profile.weight) || 70;
      const h = parseFloat($scope.profile.height) || 170;
      const age = parseInt($scope.profile.age) || 25;
      const gender = $scope.profile.gender || 'male';
      const goal = $scope.profile.fitnessGoal || 'maintain';

      // 1. Compute BMR (Mifflin-St Jeor)
      let bmr = 0;
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * age + 5;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * age - 161;
      }

      // 2. TDEE (Moderate activity multiplier)
      const tdee = Math.round(bmr * 1.55);

      // 3. Calorie Target
      let calorieTarget = tdee;
      let goalText = '';
      if (goal === 'lose_weight') {
        calorieTarget = tdee - 500;
        goalText = 'Fat Loss (Caloric Deficit)';
      } else if (goal === 'build_muscle') {
        calorieTarget = tdee + 300;
        goalText = 'Lean Muscle Gain (Clean Surplus)';
      } else {
        calorieTarget = tdee;
        goalText = 'Weight Maintenance';
      }
      calorieTarget = Math.max(1200, Math.round(calorieTarget));

      // 4. Macros Splits
      let pRatio = 0.30, cRatio = 0.50, fRatio = 0.20;
      if (goal === 'lose_weight') {
        pRatio = 0.40; cRatio = 0.35; fRatio = 0.25;
      } else if (goal === 'build_muscle') {
        pRatio = 0.30; cRatio = 0.45; fRatio = 0.25;
      }

      const proteinG = Math.round((calorieTarget * pRatio) / 4);
      const carbsG = Math.round((calorieTarget * cRatio) / 4);
      const fatsG = Math.round((calorieTarget * fRatio) / 9);

      $scope.recSummary = {
        goalText: goalText,
        targetCalories: calorieTarget,
        protein: proteinG,
        carbs: carbsG,
        fats: fatsG
      };

      // 5. Generate diet meals
      const dietType = $scope.dietType; // 'veg' | 'eggetarian' | 'non-veg'
      let breakfast = [], lunch = [], snack = [], dinner = [];

      if (goal === 'lose_weight') {
        if (dietType === 'veg') {
          breakfast = [
            { name: 'Oats in Skimmed Milk with Honey', qty: '1 bowl', cal: 180, prot: 8, carb: 32, fat: 3 },
            { name: 'Sprouted Moong Dal Salad', qty: '1 cup', cal: 68, prot: 7, carb: 12, fat: 0 }
          ];
          lunch = [
            { name: 'Grilled Tofu with Spices', qty: '150g', cal: 180, prot: 16, carb: 4, fat: 10 },
            { name: 'Brown Rice / Quinoa', qty: '1/2 cup cooked', cal: 100, prot: 2, carb: 22, fat: 0 },
            { name: 'Mixed Cucumber & Tomato Salad', qty: '1 bowl', cal: 40, prot: 2, carb: 8, fat: 0 }
          ];
          snack = [
            { name: 'Roasted Chana', qty: '1 handful (30g)', cal: 110, prot: 6, carb: 18, fat: 2 },
            { name: 'Buttermilk (Skimmed)', qty: '1 glass (250ml)', cal: 90, prot: 3, carb: 12, fat: 2 }
          ];
          dinner = [
            { name: 'Paneer Tikka (Low fat paneer)', qty: '100g', cal: 200, prot: 16, carb: 4, fat: 12 },
            { name: 'Stir-fried Broccoli & Mushroom', qty: '1.5 cups', cal: 75, prot: 4, carb: 10, fat: 2 },
            { name: 'Curd (Skimmed)', qty: '100g', cal: 60, prot: 5, carb: 6, fat: 1 }
          ];
        } else if (dietType === 'eggetarian') {
          breakfast = [
            { name: 'Boiled Egg Whites (4) with Toast', qty: '4 whites + 1 slice', cal: 165, prot: 18, carb: 14, fat: 2 },
            { name: 'Skimmed Milk with Oats', qty: '1 bowl', cal: 180, prot: 8, carb: 32, fat: 3 }
          ];
          lunch = [
            { name: 'Egg White Bhurji (4 whites)', qty: '4 egg whites', cal: 100, prot: 14, carb: 2, fat: 2 },
            { name: 'Brown Rice / Quinoa', qty: '1/2 cup cooked', cal: 100, prot: 2, carb: 22, fat: 0 },
            { name: 'Mixed Salad with Lemon Dressing', qty: '1 bowl', cal: 45, prot: 2, carb: 9, fat: 0 }
          ];
          snack = [
            { name: 'Hard Boiled Egg (1 whole)', qty: '1 egg', cal: 78, prot: 6, carb: 1, fat: 5 },
            { name: 'Buttermilk (Skimmed)', qty: '1 glass (250ml)', cal: 90, prot: 3, carb: 12, fat: 2 }
          ];
          dinner = [
            { name: 'Egg Curry (2 whole eggs)', qty: '2 eggs in light gravy', cal: 220, prot: 14, carb: 8, fat: 14 },
            { name: 'Stir-fried Broccoli & Mushroom', qty: '1.5 cups', cal: 75, prot: 4, carb: 10, fat: 2 },
            { name: 'Curd (Skimmed)', qty: '100g', cal: 60, prot: 5, carb: 6, fat: 1 }
          ];
        } else {
          breakfast = [
            { name: 'Oats cooked in Skimmed Milk', qty: '1 bowl', cal: 180, prot: 8, carb: 32, fat: 3 },
            { name: 'Boiled Egg Whites', qty: '4 whites', cal: 68, prot: 14, carb: 2, fat: 0 }
          ];
          lunch = [
            { name: 'Grilled Chicken Breast', qty: '150g cooked', cal: 240, prot: 32, carb: 1, fat: 6 },
            { name: 'Brown Rice / Quinoa', qty: '1/2 cup cooked', cal: 100, prot: 2, carb: 22, fat: 0 },
            { name: 'Green Salad', qty: '1 bowl', cal: 40, prot: 2, carb: 8, fat: 0 }
          ];
          snack = [
            { name: 'Roasted Chana', qty: '30g', cal: 110, prot: 6, carb: 18, fat: 2 },
            { name: 'Whey Protein Isolate', qty: '1 scoop', cal: 120, prot: 25, carb: 2, fat: 1 }
          ];
          dinner = [
            { name: 'Baked Salmon / Grilled Fish', qty: '120g', cal: 220, prot: 20, carb: 4, fat: 12 },
            { name: 'Stir-fried Mixed Green Veggies', qty: '1.5 cups', cal: 75, prot: 4, carb: 10, fat: 2 }
          ];
        }
      } else { // build_muscle & maintain
        if (dietType === 'veg') {
          breakfast = [
            { name: 'Oats with Whole Milk, Honey & Nuts', qty: '1 large bowl', cal: 450, prot: 18, carb: 65, fat: 16 },
            { name: 'Paneer Scramble with Toast', qty: '150g Paneer + 1 slice', cal: 320, prot: 22, carb: 18, fat: 18 }
          ];
          lunch = [
            { name: 'Rich Paneer Tikka / Tofu Curry', qty: '200g cooked', cal: 420, prot: 26, carb: 8, fat: 30 },
            { name: 'Basmati Rice & Dal Tadka', qty: '1.5 cups rice + 1 bowl dal', cal: 450, prot: 14, carb: 85, fat: 6 },
            { name: 'Mixed Vegetables with Cheese', qty: '1 cup', cal: 150, prot: 7, carb: 10, fat: 10 }
          ];
          snack = [
            { name: 'Peanut Butter & Banana Sandwich', qty: '2 slices + 2 tbsp PB', cal: 390, prot: 13, carb: 42, fat: 18 },
            { name: 'Fat Milk with Almonds', qty: '1 glass + 10 almonds', cal: 240, prot: 11, carb: 15, fat: 14 }
          ];
          dinner = [
            { name: 'Tandoori Paneer Tikka', qty: '150g', cal: 320, prot: 24, carb: 6, fat: 22 },
            { name: 'Wheat Chapatis with Ghee', qty: '3 large chapatis', cal: 360, prot: 9, carb: 72, fat: 6 },
            { name: 'Dal Soup & Salad', qty: '1 bowl', cal: 120, prot: 6, carb: 18, fat: 2 }
          ];
        } else if (dietType === 'eggetarian') {
          breakfast = [
            { name: 'Whole Egg Omelette with Cheese', qty: '3 eggs + 30g cheese', cal: 370, prot: 26, carb: 3, fat: 28 },
            { name: 'Oats with Whole Milk, Honey & Nuts', qty: '1 bowl', cal: 380, prot: 14, carb: 55, fat: 12 }
          ];
          lunch = [
            { name: 'Egg Bhurji (3 whole eggs) with Paneer', qty: '3 eggs + 100g paneer', cal: 520, prot: 38, carb: 6, fat: 36 },
            { name: 'Basmati Rice & Dal Tadka', qty: '1.5 cups rice + 1 bowl dal', cal: 450, prot: 14, carb: 85, fat: 6 },
            { name: 'Mixed Salad', qty: '1 bowl', cal: 50, prot: 2, carb: 10, fat: 0 }
          ];
          snack = [
            { name: 'Boiled Eggs (2) with Peanut Butter Toast', qty: '2 eggs + 1 slice + 1 tbsp PB', cal: 360, prot: 20, carb: 20, fat: 20 },
            { name: 'Whole Milk with Almonds', qty: '1 glass + 10 almonds', cal: 240, prot: 11, carb: 15, fat: 14 }
          ];
          dinner = [
            { name: 'Egg Curry (3 eggs) in Rich Gravy', qty: '3 eggs', cal: 340, prot: 22, carb: 10, fat: 22 },
            { name: 'Wheat Chapatis with Ghee', qty: '3 large chapatis', cal: 360, prot: 9, carb: 72, fat: 6 },
            { name: 'Curd & Salad', qty: '150g curd + salad', cal: 100, prot: 7, carb: 9, fat: 4 }
          ];
        } else {
          breakfast = [
            { name: 'Oats with Fat Milk, Honey & Peanut Butter', qty: '1 large bowl', cal: 450, prot: 18, carb: 65, fat: 16 },
            { name: 'Whole Eggs Omelette', qty: '3 whole eggs', cal: 240, prot: 18, carb: 2, fat: 18 }
          ];
          lunch = [
            { name: 'Chicken Breast Curry', qty: '200g cooked', cal: 380, prot: 36, carb: 8, fat: 18 },
            { name: 'Basmati Rice & Dal Tadka', qty: '1.5 cups rice + 1 bowl dal', cal: 450, prot: 14, carb: 85, fat: 6 },
            { name: 'Mixed Green Salad with Cheese', qty: '1 bowl', cal: 140, prot: 7, carb: 8, fat: 10 }
          ];
          snack = [
            { name: 'Peanut Butter Sandwich', qty: '2 slices + 2 tbsp PB', cal: 350, prot: 12, carb: 36, fat: 18 },
            { name: 'Whey Protein in Whole Milk', qty: '1 scoop + 1 glass milk', cal: 270, prot: 33, carb: 14, fat: 8 }
          ];
          dinner = [
            { name: 'Grilled Fish / Minced Beef', qty: '180g cooked', cal: 320, prot: 30, carb: 4, fat: 15 },
            { name: 'Wheat Chapatis with Ghee', qty: '3 large chapatis', cal: 360, prot: 9, carb: 72, fat: 6 },
            { name: 'Salad & Veg Soup', qty: '1 bowl', cal: 120, prot: 6, carb: 18, fat: 2 }
          ];
        }
      }

      const bSum = sumMeal(breakfast), lSum = sumMeal(lunch), sSum = sumMeal(snack), dSum = sumMeal(dinner);
      const totalCal = bSum.cal + lSum.cal + sSum.cal + dSum.cal;
      const totalProt = bSum.prot + lSum.prot + sSum.prot + dSum.prot;
      const totalCarbs = bSum.carb + lSum.carb + sSum.carb + dSum.carb;
      const totalFats = bSum.fat + lSum.fat + sSum.fat + dSum.fat;

      $scope.recPlan = {
        meals: [
          { name: '🌅 Breakfast', items: breakfast, totals: bSum, mealType: 'breakfast' },
          { name: '☀️ Lunch', items: lunch, totals: lSum, mealType: 'lunch' },
          { name: '🍎 Evening Snack', items: snack, totals: sSum, mealType: 'snack' },
          { name: '🌙 Dinner', items: dinner, totals: dSum, mealType: 'dinner' }
        ],
        totals: { calories: totalCal, protein: totalProt, carbs: totalCarbs, fats: totalFats }
      };
    };

    function sumMeal(items) {
      return items.reduce((acc, it) => {
        acc.cal += it.cal;
        acc.prot += it.prot;
        acc.carb += it.carb;
        acc.fat += it.fat;
        return acc;
      }, { cal:0, prot:0, carb:0, fat:0 });
    }

    $scope.logRecommendedDiet = function() {
      if (!$scope.recPlan) return;
      $scope.submitting = true;
      $scope.msg = { type: '', text: '' };

      const promises = $scope.recPlan.meals.map(meal => {
        return NutritionService.log({
          mealName: 'Rec: ' + meal.items.map(it => it.name.split(' (')[0]).join(', ').slice(0, 50),
          mealType: meal.mealType,
          calories: meal.totals.cal,
          protein: meal.totals.prot,
          carbs: meal.totals.carb,
          fats: meal.totals.fat,
          date: todayStr
        });
      });

      Promise.all(promises)
        .then(function() {
          $scope.$apply(function() {
            $scope.msg = { type: 'success', text: '✅ Recommended diet logged successfully to your daily stats!' };
            $timeout(function () { $scope.msg = { type: '', text: '' }; }, 3500);
          });
        })
        .catch(function(err) {
          $scope.$apply(function() {
            $scope.msg = { type: 'error', text: 'Failed to log recommended diet. Some entries could not be saved.' };
          });
        })
        .finally(function() {
          $scope.$apply(function() {
            $scope.submitting = false;
          });
        });
    };

    /* ── PDF Export ─────────────────────────────────── */
    $scope.downloadDietPdf = function () {
      const element = document.getElementById('diet-report-container');
      if (!element) return;
      
      const opt = {
        margin:       10,
        filename:     'FitLife_Diet_Report.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    };

    $scope.downloadPlanPdf = function () {
      const element = document.getElementById('recommended-diet-container');
      if (!element) return;
      
      const opt = {
        margin:       10,
        filename:     'FitLife_Recommended_Diet_Plan.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save();
    };

    /* ── History ────────────────────────────────────── */
    function loadHistory() {
      $scope.loading = true;
      NutritionService.getHistory($scope.page)
        .then(function (res) {
          $scope.entries    = res.data.data.entries;
          $scope.totalPages = res.data.data.totalPages;
        })
        .catch(function () { $scope.msg = { type: 'error', text: 'Failed to load history.' }; })
        .finally(function () { $scope.loading = false; });
    }

    $scope.nextPage = function () { if ($scope.page < $scope.totalPages) { $scope.page++; loadHistory(); } };
    $scope.prevPage = function () { if ($scope.page > 1) { $scope.page--; loadHistory(); } };

    $scope.deleteEntry = function (id) {
      if (!confirm('Delete this meal entry?')) return;
      NutritionService.remove(id)
        .then(function () { $scope.entries = $scope.entries.filter(function (e) { return e._id !== id; }); })
        .catch(function () { alert('Failed to delete entry.'); });
    };

    /* ── Daily stats + doughnut ─────────────────────── */
    let macroChart;

    function loadDailyStats() {
      $scope.loading = true;
      NutritionService.dailyStats($scope.statsDate)
        .then(function (res) {
          $scope.dailyStats = res.data.data;
          $timeout(function () { buildMacroChart(res.data.data.totals); }, 50);
        })
        .catch(function () { $scope.msg = { type: 'error', text: 'Failed to load daily stats.' }; })
        .finally(function () { $scope.loading = false; });
    }

    $scope.changeStatsDate = function () { loadDailyStats(); };

    function buildMacroChart(totals) {
      const ctx = document.getElementById('macroChart');
      if (!ctx) return;
      if (macroChart) macroChart.destroy();

      const hasData = (totals.protein + totals.carbs + totals.fats) > 0;

      macroChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Protein', 'Carbs', 'Fats'],
          datasets: [{
            data: hasData ? [totals.protein, totals.carbs, totals.fats] : [1, 1, 1],
            backgroundColor: hasData
              ? ['rgba(124,58,237,0.85)', 'rgba(6,182,212,0.85)', 'rgba(245,158,11,0.85)']
              : ['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.05)', 'rgba(15,23,42,0.05)'],
            borderColor: hasData ? ['#7c3aed','#06b6d4','#d97706'] : ['#e2e8f0','#e2e8f0','#e2e8f0'],
            borderWidth: hasData ? 2 : 1
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#475569', font: { family: "'DM Sans'" }, padding: 14 }
            },
            tooltip: { callbacks: {
              label: function (c) { return c.label + ': ' + c.raw + 'g'; }
            }}
          }
        }
      });
    }

    /* ── Helpers ────────────────────────────────────── */
    $scope.fmtDate = function (iso) {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    $scope.mealTypeClass = function (t) {
      return 'badge meal-' + t;
    };

    // Run Initialization
    $scope.init();
  }
]);
