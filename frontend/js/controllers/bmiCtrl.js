/**
 * BMI Controller — Calculate, display result, trend chart, history table, and auto-generate plans
 */
angular.module('fitlife').controller('BmiCtrl', [
  '$scope', '$timeout', 'BmiService', 'UserService',
  function ($scope, $timeout, BmiService, UserService) {

    /* ── State ─────────────────────────────────────── */
    $scope.tab        = 'calc';
    $scope.submitting = false;
    $scope.loading    = false;
    $scope.msg        = { type: '', text: '' };
    $scope.result     = null;
    $scope.history    = [];
    $scope.planTab    = 'diet'; // 'diet' | 'workout'

    // Detailed Body Metrics
    $scope.bodyMetrics = null;
    $scope.generatedDiet = null;
    $scope.generatedWorkout = null;

    const today = new Date().toISOString().slice(0, 10);
    $scope.form = {
      weight: null,
      height: null,
      date: today,
      age: 25,
      gender: 'male',
      activityLevel: 'moderate',
      requirement: 'gain_muscle', // 'gain_muscle' | 'fat_loss' | 'gain_weight' | 'aesthetic' | 'muscular'
      dietType: 'veg'
    };

    $scope.requirements = [
      { value: 'gain_muscle', label: '💪 Gain Muscle' },
      { value: 'fat_loss', label: '🔥 Fat Loss' },
      { value: 'gain_weight', label: '⚖️ Gain Weight' },
      { value: 'aesthetic', label: '✨ Aesthetic Body' },
      { value: 'muscular', label: '🏋️ Muscular Body' }
    ];

    $scope.activityLevels = [
      { value: 'sedentary', label: 'Sedentary (No/little exercise)' },
      { value: 'light', label: 'Light (Exercise 1-3 days/week)' },
      { value: 'moderate', label: 'Moderate (Exercise 3-5 days/week)' },
      { value: 'active', label: 'Active (Exercise 6-7 days/week)' }
    ];

    /* ── Init & Load User Profile ───────────────────── */
    $scope.init = function () {
      $scope.loading = true;
      UserService.getProfile()
        .then(function (res) {
          const profile = res.data.data;
          if (profile) {
            $scope.form.weight = profile.weight || null;
            $scope.form.height = profile.height || null;
            if (profile.age) $scope.form.age = profile.age;
            if (profile.gender) $scope.form.gender = profile.gender;
            if (profile.fitnessGoal) {
              if (profile.fitnessGoal === 'build_muscle') $scope.form.requirement = 'gain_muscle';
              else if (profile.fitnessGoal === 'lose_weight') $scope.form.requirement = 'fat_loss';
              else $scope.form.requirement = 'aesthetic';
            }
            $scope.previewBmi();
          }
        })
        .finally(function () {
          $scope.loading = false;
        });
    };

    /* ── Tab control ────────────────────────────────── */
    $scope.setTab = function (t) {
      $scope.tab = t;
      $scope.msg = { type: '', text: '' };
      if (t === 'history') loadHistory();
    };

    $scope.setPlanTab = function (t) {
      $scope.planTab = t;
    };

    /* ── Live preview ───────────────────────────────── */
    $scope.previewBmi = function () {
      const w = parseFloat($scope.form.weight);
      const h = parseFloat($scope.form.height);
      if (w > 0 && h > 0) {
        const hm = h / 100;
        const bmi = parseFloat((w / (hm * hm)).toFixed(1));
        $scope.previewVal = bmi;
        $scope.previewCat = getBmiCategory(bmi);
      } else {
        $scope.previewVal = null;
        $scope.previewCat = null;
      }
    };

    /* ── Calculate + Save ───────────────────────────── */
    $scope.calculate = function () {
      $scope.msg = { type: '', text: '' };
      if (!$scope.form.weight || !$scope.form.height || !$scope.form.age) {
        $scope.msg = { type: 'error', text: 'Weight, height, and age are required.' };
        return;
      }
      $scope.submitting = true;

      BmiService.calculate($scope.form)
        .then(function (res) {
          $scope.result = res.data.data;
          $scope.msg    = { type: 'success', text: '✅ BMI calculated and saved.' };
          
          // Generate customized diet and workout plans
          $scope.generatePlans();

          // Sync with profile if updated
          UserService.updateProfile({
            weight: $scope.form.weight,
            height: $scope.form.height,
            age: $scope.form.age,
            gender: $scope.form.gender,
            fitnessGoal: $scope.form.requirement === 'gain_muscle' || $scope.form.requirement === 'muscular' ? 'build_muscle' : ($scope.form.requirement === 'fat_loss' ? 'lose_weight' : 'maintain')
          });

          $timeout(function () { $scope.msg = { type: '', text: '' }; }, 3500);
        })
        .catch(function (err) {
          $scope.msg = { type: 'error', text: (err.data && err.data.message) || 'Failed to calculate BMI.' };
        })
        .finally(function () { $scope.submitting = false; });
    };

    /* ── Plan Auto-Generator ─────────────────────────── */
    $scope.generatePlans = function () {
      const w = parseFloat($scope.form.weight);
      const h = parseFloat($scope.form.height);
      const age = parseInt($scope.form.age) || 25;
      const gender = $scope.form.gender || 'male';
      const activity = $scope.form.activityLevel || 'moderate';
      const goal = $scope.form.requirement || 'gain_muscle';

      // 1. Calculate BMR (Mifflin-St Jeor)
      let bmr = 0;
      if (gender === 'male') {
        bmr = 10 * w + 6.25 * h - 5 * age + 5;
      } else {
        bmr = 10 * w + 6.25 * h - 5 * age - 161;
      }
      bmr = Math.round(bmr);

      // 2. Calculate TDEE
      const actMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
      const multiplier = actMultipliers[activity] || 1.55;
      const tdee = Math.round(bmr * multiplier);

      // 3. Set Target Calories based on Requirement
      let calorieTarget = tdee;
      let goalText = '';
      if (goal === 'fat_loss') {
        calorieTarget = tdee - 500;
        goalText = 'Fat Loss (Caloric Deficit)';
      } else if (goal === 'gain_weight') {
        calorieTarget = tdee + 500;
        goalText = 'Weight Gain (Caloric Surplus)';
      } else if (goal === 'gain_muscle') {
        calorieTarget = tdee + 300;
        goalText = 'Lean Muscle Gain (Clean Surplus)';
      } else if (goal === 'aesthetic') {
        calorieTarget = tdee - 200;
        goalText = 'Body Recomposition & Definition';
      } else if (goal === 'muscular') {
        calorieTarget = tdee + 500;
        goalText = 'Heavy Muscle Building & Strength';
      }
      calorieTarget = Math.max(1200, Math.round(calorieTarget));

      // 4. Macro Splits
      let pRatio = 0.30, cRatio = 0.50, fRatio = 0.20; // Default
      if (goal === 'fat_loss') {
        pRatio = 0.40; cRatio = 0.35; fRatio = 0.25;
      } else if (goal === 'gain_weight') {
        pRatio = 0.25; cRatio = 0.55; fRatio = 0.20;
      } else if (goal === 'gain_muscle') {
        pRatio = 0.30; cRatio = 0.45; fRatio = 0.25;
      } else if (goal === 'aesthetic') {
        pRatio = 0.35; cRatio = 0.40; fRatio = 0.25;
      } else if (goal === 'muscular') {
        pRatio = 0.35; cRatio = 0.45; fRatio = 0.20;
      }

      const proteinG = Math.round((calorieTarget * pRatio) / 4);
      const carbsG = Math.round((calorieTarget * cRatio) / 4);
      const fatsG = Math.round((calorieTarget * fRatio) / 9);

      // 5. Ideal Weight Range (BMI 18.5 - 24.9) & detailed metrics
      const hm = h / 100;
      const idealMin = Math.round(18.5 * (hm * hm));
      const idealMax = Math.round(24.9 * (hm * hm));
      const bmiVal = parseFloat((w / (hm * hm)).toFixed(1));
      const genderFactor = (gender === 'male') ? 1 : 0;
      const bodyFat = parseFloat(((1.20 * bmiVal) + (0.23 * age) - (10.8 * genderFactor) - 5.4).toFixed(1));

      const targetWeight = Math.round(22 * (hm * hm));
      const weightDiff = Math.abs(Math.round(w - targetWeight));
      let weightAdvice = '';
      if (w > targetWeight) {
        weightAdvice = `Lose ${weightDiff} kg to reach optimal weight (${targetWeight} kg for BMI of 22)`;
      } else if (w < targetWeight) {
        weightAdvice = `Gain ${weightDiff} kg to reach optimal weight (${targetWeight} kg for BMI of 22)`;
      } else {
        weightAdvice = `You are at the optimal weight for your height!`;
      }

      let healthRisk = '';
      let lifestyleAction = '';
      if (bmiVal < 18.5) {
        healthRisk = 'Moderate risk of nutrient deficiency and osteoporosis.';
        lifestyleAction = 'Focus on clean calorie surplus, moderate strength workouts, and proper hydration.';
      } else if (bmiVal < 25) {
        healthRisk = 'Minimal health risk. Excellent range!';
        lifestyleAction = 'Maintain balanced nutrition, consistent physical activity, and regular rest.';
      } else if (bmiVal < 30) {
        healthRisk = 'Increased risk of cardiovascular stress and joint strain.';
        lifestyleAction = 'Adopt a moderate calorie deficit, blend cardio with weight training, and sleep 7-8 hours.';
      } else {
        healthRisk = 'High risk of hypertension, type 2 diabetes, and severe joint strain.';
        lifestyleAction = 'Follow a controlled caloric deficit, do low-impact exercises, and consult a health professional.';
      }

      $scope.bodyMetrics = {
        bmr: bmr,
        tdee: tdee,
        targetCalories: calorieTarget,
        protein: proteinG,
        carbs: carbsG,
        fats: fatsG,
        idealMin: idealMin,
        idealMax: idealMax,
        goalText: goalText,
        bodyFat: bodyFat,
        weightAdvice: weightAdvice,
        healthRisk: healthRisk,
        lifestyleAction: lifestyleAction
      };

      // 6. Generate Custom Diet Plan
      generateDietData(calorieTarget, proteinG, carbsG, fatsG, goal, $scope.form.dietType);

      // 7. Generate Custom Workout Plan
      generateWorkoutData(goal);
    };

    function generateDietData(calories, protein, carbs, fats, goal, dietType) {
      // Create detailed food items depending on the goal and dietType
      let breakfast = [], lunch = [], snack = [], dinner = [];
      const isVeg = (dietType === 'veg');

      if (goal === 'fat_loss' || goal === 'aesthetic') {
        if (isVeg) {
          breakfast = [
            { name: 'Oats cooked in water / skimmed milk (50g dry oats)', qty: '1 bowl', cal: 180, prot: 8, carb: 32, fat: 3 },
            { name: 'Sprouted Moong Dal & Mixed Veggies Salad', qty: '1 cup', cal: 68, prot: 7, carb: 12, fat: 0 },
            { name: 'Green Tea or Black Coffee', qty: '1 cup', cal: 2, prot: 0, carb: 0, fat: 0 }
          ];
          lunch = [
            { name: 'Grilled Tofu/Paneer Tikka (low-fat)', qty: '150g cooked', cal: 240, prot: 22, carb: 4, fat: 14 },
            { name: 'Steamed Basmati Rice / Quinoa', qty: '1/2 cup cooked', cal: 100, prot: 2, carb: 22, fat: 0 },
            { name: 'Mixed Green Salad (Cucumber, Tomato, Spinach)', qty: '1 large bowl', cal: 40, prot: 2, carb: 8, fat: 0 }
          ];
          snack = [
            { name: 'Roasted Chana / Chickpeas', qty: '1 handful (30g)', cal: 110, prot: 6, carb: 18, fat: 2 },
            { name: 'Soy Protein Isolate in water', qty: '1 scoop', cal: 120, prot: 25, carb: 2, fat: 1 }
          ];
          dinner = [
            { name: 'Paneer Tikka (light oil)', qty: '100g', cal: 220, prot: 18, carb: 4, fat: 14 },
            { name: 'Stir-fried Broccoli, Beans & Mushrooms', qty: '1.5 cups', cal: 75, prot: 4, carb: 10, fat: 2 },
            { name: 'Curd / Dahi made from skimmed milk', qty: '100g', cal: 60, prot: 5, carb: 6, fat: 1.5 }
          ];
        } else {
          breakfast = [
            { name: 'Oats cooked in water / skimmed milk (50g dry oats)', qty: '1 bowl', cal: 180, prot: 8, carb: 32, fat: 3 },
            { name: 'Boiled Egg Whites', qty: '4 whites', cal: 68, prot: 14, carb: 2, fat: 0 },
            { name: 'Green Tea or Black Coffee', qty: '1 cup', cal: 2, prot: 0, carb: 0, fat: 0 }
          ];
          lunch = [
            { name: 'Grilled Chicken Breast', qty: '150g cooked', cal: 240, prot: 32, carb: 1, fat: 6 },
            { name: 'Steamed Basmati Rice / Quinoa', qty: '1/2 cup cooked', cal: 100, prot: 2, carb: 22, fat: 0 },
            { name: 'Mixed Green Salad (Cucumber, Tomato, Spinach)', qty: '1 large bowl', cal: 40, prot: 2, carb: 8, fat: 0 }
          ];
          snack = [
            { name: 'Roasted Chana / Chickpeas', qty: '1 handful (30g)', cal: 110, prot: 6, carb: 18, fat: 2 },
            { name: 'Whey Protein Isolate', qty: '1 scoop in water', cal: 120, prot: 25, carb: 2, fat: 1 }
          ];
          dinner = [
            { name: 'Baked Salmon', qty: '120g', cal: 220, prot: 20, carb: 4, fat: 12 },
            { name: 'Stir-fried Broccoli, Beans & Mushrooms', qty: '1.5 cups', cal: 75, prot: 4, carb: 10, fat: 2 },
            { name: 'Curd / Dahi made from skimmed milk', qty: '100g', cal: 60, prot: 5, carb: 6, fat: 1.5 }
          ];
        }
      } else { // gain_muscle, muscular, gain_weight
        if (isVeg) {
          breakfast = [
            { name: 'Oats with full cream milk, Honey & Peanut Butter', qty: '1 large bowl', cal: 450, prot: 18, carb: 65, fat: 16 },
            { name: 'Paneer & Veggie Scramble', qty: '150g', cal: 240, prot: 18, carb: 4, fat: 18 },
            { name: 'Banana / Apple', qty: '1 medium', cal: 90, prot: 1, carb: 23, fat: 0 }
          ];
          lunch = [
            { name: 'Rich Paneer Masala / Tofu Curry', qty: '200g cooked', cal: 380, prot: 22, carb: 10, fat: 28 },
            { name: 'Basmati Rice & Dal Tadka', qty: '1.5 cups rice + 1 bowl dal', cal: 450, prot: 14, carb: 85, fat: 6 },
            { name: 'Mixed Vegetables & Curd', qty: '1 bowl', cal: 110, prot: 5, carb: 12, fat: 4 }
          ];
          snack = [
            { name: 'Peanut Butter Sandwich on Whole Wheat Bread', qty: '2 slices + 2 tbsp PB', cal: 350, prot: 12, carb: 36, fat: 18 },
            { name: 'Soy Protein / Milkshake', qty: '1 scoop with milk', cal: 260, prot: 30, carb: 15, fat: 8 }
          ];
          dinner = [
            { name: 'Tandoori Paneer Tikka', qty: '150g', cal: 320, prot: 24, carb: 6, fat: 22 },
            { name: 'Roti / Wheat Chapatis with ghee', qty: '3 large chapatis', cal: 360, prot: 9, carb: 72, fat: 6 },
            { name: 'Mixed Salad & Dal Soup', qty: '1 bowl', cal: 120, prot: 6, carb: 18, fat: 2 }
          ];
        } else {
          breakfast = [
            { name: 'Oats with full cream milk, Honey & Peanut Butter', qty: '1 large bowl', cal: 450, prot: 18, carb: 65, fat: 16 },
            { name: 'Whole Eggs (Scrambled or Omelette)', qty: '3 whole eggs', cal: 240, prot: 18, carb: 2, fat: 18 },
            { name: 'Banana / Apple', qty: '1 medium', cal: 90, prot: 1, carb: 23, fat: 0 }
          ];
          lunch = [
            { name: 'Chicken Breast Curry', qty: '200g cooked', cal: 380, prot: 36, carb: 8, fat: 18 },
            { name: 'Basmati Rice & Dal Tadka', qty: '1.5 cups rice + 1 bowl dal', cal: 450, prot: 14, carb: 85, fat: 6 },
            { name: 'Mixed Vegetables & Curd', qty: '1 bowl', cal: 110, prot: 5, carb: 12, fat: 4 }
          ];
          snack = [
            { name: 'Peanut Butter Sandwich on Whole Wheat Bread', qty: '2 slices + 2 tbsp PB', cal: 350, prot: 12, carb: 36, fat: 18 },
            { name: 'Whey Protein Concentrate / Milkshake', qty: '1 scoop with milk', cal: 260, prot: 30, carb: 15, fat: 8 }
          ];
          dinner = [
            { name: 'Minced Beef / Grilled Fish', qty: '180g', cal: 320, prot: 30, carb: 4, fat: 15 },
            { name: 'Roti / Wheat Chapatis with ghee', qty: '3 large chapatis', cal: 360, prot: 9, carb: 72, fat: 6 },
            { name: 'Mixed Salad & Dal Soup', qty: '1 bowl', cal: 120, prot: 6, carb: 18, fat: 2 }
          ];
        }
      }

      // Sum breakfast, lunch, snack, dinner to ensure they roughly match totals
      const bSum = sumMeal(breakfast), lSum = sumMeal(lunch), sSum = sumMeal(snack), dSum = sumMeal(dinner);
      const totalCal = bSum.cal + lSum.cal + sSum.cal + dSum.cal;
      const totalProt = bSum.prot + lSum.prot + sSum.prot + dSum.prot;
      const totalCarbs = bSum.carb + lSum.carb + sSum.carb + dSum.carb;
      const totalFats = bSum.fat + lSum.fat + sSum.fat + dSum.fat;

      $scope.generatedDiet = {
        meals: [
          { name: '🌅 Breakfast', items: breakfast, totals: bSum },
          { name: '☀️ Lunch', items: lunch, totals: lSum },
          { name: '🍎 Evening Snack', items: snack, totals: sSum },
          { name: '🌙 Dinner', items: dinner, totals: dSum }
        ],
        totals: { calories: totalCal, protein: totalProt, carbs: totalCarbs, fats: totalFats }
      };
    }

    function sumMeal(items) {
      return items.reduce((acc, it) => {
        acc.cal += (parseFloat(it.cal) || 0);
        acc.prot += (parseFloat(it.prot) || 0);
        acc.carb += (parseFloat(it.carb) || 0);
        acc.fat += (parseFloat(it.fat) || 0);
        return acc;
      }, { cal:0, prot:0, carb:0, fat:0 });
    }

    function generateWorkoutData(goal) {
      let days = [];

      if (goal === 'fat_loss') {
        days = [
          {
            day: 'Day 1: Full-Body Conditioning',
            focus: 'Cardio & Circuit Training',
            exercises: [
              { name: 'Jumping Jacks / Jump Rope', details: '3 sets of 1 min (Warm-up)' },
              { name: 'Bodyweight Squats', details: '4 sets of 20 reps (No rest)' },
              { name: 'Push-ups (Knee or Regular)', details: '4 sets of 12-15 reps' },
              { name: 'Kettlebell Swings / Dumbbell Thrusters', details: '3 sets of 15 reps' },
              { name: 'Treadmill Incline Run', details: '20 minutes HIIT (30s sprint / 30s walk)' }
            ]
          },
          {
            day: 'Day 2: Core & Strength',
            focus: 'Waist slimming & Calorie burn',
            exercises: [
              { name: 'Planks (Front & Side)', details: '3 sets of 45-60 seconds hold' },
              { name: 'Bicycle Crunches', details: '3 sets of 25 reps per side' },
              { name: 'Dumbbell Romanian Deadlifts', details: '4 sets of 15 reps (Moderate weight)' },
              { name: 'Mountain Climbers', details: '3 sets of 45 seconds fast effort' },
              { name: 'Rowing Machine / Stationary Bike', details: '20 minutes moderate steady pace' }
            ]
          },
          {
            day: 'Day 3: Active Recovery & Flexibility',
            focus: 'Mobility & Stretching',
            exercises: [
              { name: 'Dynamic Body Stretching', details: '15 mins head-to-toe mobility' },
              { name: 'Yoga flow (Sun Salutations)', details: '5 rounds slowly' },
              { name: 'Brisk Walking outdoors', details: '30-45 minutes (Zone 2 cardio)' }
            ]
          },
          {
            day: 'Day 4: Upper Body Tone',
            focus: 'Sculpting shoulders, back & arms',
            exercises: [
              { name: 'Lat Pull-downs', details: '4 sets of 15 reps (Control speed)' },
              { name: 'Dumbbell Shoulder Press', details: '3 sets of 12 reps' },
              { name: 'Incline Dumbbell Flyes', details: '3 sets of 15 reps' },
              { name: 'Tricep Rope Push-downs', details: '3 sets of 15 reps' },
              { name: 'Elliptical Trainer', details: '15 minutes intervals' }
            ]
          },
          {
            day: 'Day 5: Lower Body & Legs conditioning',
            focus: 'Leg burn & glute targeting',
            exercises: [
              { name: 'Goblet Squats', details: '4 sets of 15 reps (Slow down)' },
              { name: 'Walking Lunges', details: '3 sets of 12 steps per leg' },
              { name: 'Leg Press', details: '3 sets of 15 reps' },
              { name: 'Calf Raises', details: '4 sets of 20 reps' },
              { name: 'Burpees', details: '3 sets of 10 reps (Finisher)' }
            ]
          }
        ];
      } else if (goal === 'aesthetic') {
        days = [
          {
            day: 'Day 1: Upper Body Aesthetics (V-Taper Focus)',
            focus: 'Wide Lats & Upper Chest',
            exercises: [
              { name: 'Pull-ups / Chin-ups', details: '4 sets of max reps (Wide grip)' },
              { name: 'Incline Dumbbell Bench Press', details: '4 sets of 10-12 reps (Upper chest)' },
              { name: 'Dumbbell Lateral Raises (Side Delts)', details: '5 sets of 15 reps (High volume)' },
              { name: 'Seated Cable Row', details: '4 sets of 12 reps (Hold squeeze)' },
              { name: 'Face Pulls (Rear Delts & Posture)', details: '4 sets of 15 reps' }
            ]
          },
          {
            day: 'Day 2: Lower Body Aesthetics',
            focus: 'Quads, Hamstrings & Glutes definition',
            exercises: [
              { name: 'Barbell Back Squats', details: '4 sets of 8-10 reps (Clean depth)' },
              { name: 'Romanian Deadlifts (Hamstrings)', details: '4 sets of 10 reps' },
              { name: 'Leg Extensions (Quad sweeps)', details: '3 sets of 12-15 reps (Hold top)' },
              { name: 'Standing Calf Raises', details: '4 sets of 15 reps' },
              { name: 'Hanging Leg Raises (Lower abs)', details: '4 sets of 12 reps' }
            ]
          },
          {
            day: 'Day 3: Active Rest & Core Aesthetics',
            focus: 'Abdominals & Recovery',
            exercises: [
              { name: 'Abs Circuit (Crunches, Flutter kicks, Russian twists)', details: '3 rounds, 20 reps each' },
              { name: 'Brisk Walk or Cycle', details: '20 minutes light cardio' }
            ]
          },
          {
            day: 'Day 4: Shoulders & Arm Sculpting',
            focus: '3D Delts, Biceps Peak & Triceps Sweep',
            exercises: [
              { name: 'Seated Barbell Overhead Press', details: '4 sets of 8-10 reps' },
              { name: 'Cable Lateral Raises (constant tension)', details: '4 sets of 12-15 reps' },
              { name: 'Incline Dumbbell Bicep Curls', details: '3 sets of 12 reps' },
              { name: 'Overhead Dumbbell Tricep Extension', details: '3 sets of 12 reps' },
              { name: 'Hammer Curls (Bicep/Forearm thickness)', details: '3 sets of 12 reps' }
            ]
          },
          {
            day: 'Day 5: Chest & Back Width',
            focus: 'Chest flyes, lat pullover & serratus',
            exercises: [
              { name: 'Flat Dumbbell Press', details: '4 sets of 10 reps' },
              { name: 'Dumbbell Pull-overs', details: '3 sets of 12 reps' },
              { name: 'Cable Crossover / Chest Dips', details: '3 sets of 15 reps' },
              { name: 'Lat Pull-downs (Underhand grip)', details: '4 sets of 12 reps' },
              { name: 'Plank Twists', details: '3 sets of 15 reps' }
            ]
          }
        ];
      } else { // gain_muscle, muscular, gain_weight
        days = [
          {
            day: 'Day 1: Heavy Push (Chest, Shoulders & Triceps)',
            focus: 'Compound Strength & Hypertrophy',
            exercises: [
              { name: 'Flat Barbell Bench Press', details: '4 sets of 6-8 reps (Heavy)' },
              { name: 'Overhead Barbell Press', details: '4 sets of 8 reps' },
              { name: 'Incline Dumbbell Press', details: '3 sets of 8-10 reps' },
              { name: 'Dumbbell Lateral Raises', details: '4 sets of 12 reps' },
              { name: 'Close-grip Bench Press (Triceps)', details: '3 sets of 10 reps' }
            ]
          },
          {
            day: 'Day 2: Heavy Pull (Back, Biceps & Rear Delts)',
            focus: 'Back Thickness & Width',
            exercises: [
              { name: 'Conventional Deadlifts', details: '3 sets of 5 reps (Heavy effort)' },
              { name: 'Barbell Bent-over Rows', details: '4 sets of 8 reps' },
              { name: 'Weighted Pull-ups', details: '3 sets of 8 reps' },
              { name: 'Dumbbell Rear Delt Flyes', details: '4 sets of 12 reps' },
              { name: 'Barbell Bicep Curls', details: '4 sets of 8-10 reps' }
            ]
          },
          {
            day: 'Day 3: Heavy Legs (Quads, Hamstrings & Calves)',
            focus: 'Lower Body Power',
            exercises: [
              { name: 'Barbell Back Squats', details: '4 sets of 6-8 reps (Heavy)' },
              { name: 'Romanian Deadlifts', details: '4 sets of 8 reps' },
              { name: 'Leg Press', details: '3 sets of 10 reps' },
              { name: 'Lying Leg Curls', details: '3 sets of 12 reps' },
              { name: 'Seated Calf Raises', details: '4 sets of 15 reps' }
            ]
          },
          {
            day: 'Day 4: Rest / Active Recovery',
            focus: 'Muscle Repair & Feeding',
            exercises: [
              { name: 'Light Stretching & Foam Rolling', details: '15 minutes' },
              { name: 'Abdominal Crunches & Planks', details: '3 sets' }
            ]
          },
          {
            day: 'Day 5: Full-Body Strength Hypertrophy',
            focus: 'Compound Overload',
            exercises: [
              { name: 'Dumbbell Lunges', details: '3 sets of 10 reps per leg' },
              { name: 'Weighted Dips', details: '3 sets of 8-10 reps' },
              { name: 'T-Bar Rows', details: '4 sets of 8 reps' },
              { name: 'Dumbbell Hammer Curls', details: '3 sets of 10 reps' },
              { name: 'Skull Crushers (Triceps)', details: '3 sets of 10 reps' }
            ]
          }
        ];
      }

      $scope.generatedWorkout = {
        days: days
      };
    }

    /* ── History + chart ────────────────────────────── */
    let bmiChart;

    function loadHistory() {
      $scope.loading = true;
      BmiService.getHistory()
        .then(function (res) {
          $scope.history = res.data.data;
          $timeout(function () { buildBmiChart($scope.history); }, 50);
        })
        .catch(function () { $scope.msg = { type: 'error', text: 'Failed to load history.' }; })
        .finally(function () { $scope.loading = false; });
    }

    function buildBmiChart(history) {
      const ctx = document.getElementById('bmiTrendChart');
      if (!ctx || !history || history.length === 0) return;
      if (bmiChart) bmiChart.destroy();

      bmiChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: history.map(function (b) {
            return new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }),
          datasets: [{
            label: 'BMI',
            data: history.map(function (b) { return b.bmi; }),
            borderColor: '#7c3aed',
            backgroundColor: 'rgba(124,58,237,0.12)',
            pointBackgroundColor: history.map(function (b) { return bmiColor(b.category); }),
            pointRadius: 5,
            tension: 0.4,
            fill: true
          },
          /* Reference lines */
          {
            label: 'Normal (18.5)',
            data: history.map(function () { return 18.5; }),
            borderColor: 'rgba(16,185,129,0.4)',
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Overweight (25)',
            data: history.map(function () { return 25; }),
            borderColor: 'rgba(245,158,11,0.4)',
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: "'DM Sans'" } } }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#94a3b8' }, min: 10, max: 40 }
          }
        }
      });
    }

    /* ── Helpers ────────────────────────────────────── */
    function getBmiCategory(bmi) {
      if (bmi < 18.5) return 'Underweight';
      if (bmi < 25)   return 'Normal';
      if (bmi < 30)   return 'Overweight';
      return 'Obese';
    }

    function bmiColor(cat) {
      const map = { Underweight:'#3b82f6', Normal:'#10b981', Overweight:'#f59e0b', Obese:'#ef4444' };
      return map[cat] || '#7c3aed';
    }

    $scope.bmiCatClass = function (cat) {
      const map = { Underweight:'bmi-underweight', Normal:'bmi-normal', Overweight:'bmi-overweight', Obese:'bmi-obese' };
      return 'bmi-cat ' + (map[cat] || '');
    };

    $scope.bmiColorStyle = function (cat) {
      return { color: bmiColor(cat) };
    };

    $scope.fmtDate = function (iso) {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    $scope.exportPlanPdf = function () {
      if (!$scope.bodyMetrics || !$scope.generatedDiet || !$scope.generatedWorkout) return;

      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.color = '#1e293b';
      element.style.fontFamily = "'DM Sans', sans-serif";

      let dietHtml = '';
      $scope.generatedDiet.meals.forEach(meal => {
        let itemsHtml = '';
        meal.items.forEach(item => {
          itemsHtml += `
            <div style="margin-bottom:10px">
              <strong style="color:#0f172a;font-size:14px">${item.name}</strong><br/>
              <span style="color:#475569;font-size:12px">Qty: ${item.qty} · ${item.cal} kcal (P: ${item.prot}g C: ${item.carb}g F: ${item.fat}g)</span>
            </div>
          `;
        });
        dietHtml += `
          <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:14px;break-inside:avoid">
            <h4 style="margin:0 0 10px;color:#3182ce;font-size:16px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">${meal.name}</h4>
            ${itemsHtml}
            <div style="border-top:1px solid #e2e8f0;margin-top:10px;padding-top:6px;font-size:12px;color:#475569;display:flex;justify-content:space-between">
              <span>Calories: <strong>${meal.totals.cal} kcal</strong></span>
              <span>Protein: <strong>${meal.totals.prot}g</strong></span>
            </div>
          </div>
        `;
      });

      let workoutHtml = '';
      $scope.generatedWorkout.days.forEach(d => {
        let exHtml = '';
        d.exercises.forEach(ex => {
          exHtml += `
            <div style="margin-bottom:10px;font-size:13px">
              <strong style="color:#0f172a;font-size:13px">${ex.name}</strong><br/>
              <span style="color:#475569;font-size:11px">${ex.details}</span>
            </div>
          `;
        });
        workoutHtml += `
          <div style="background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:14px;break-inside:avoid">
            <h4 style="margin:0 0 4px;color:#3182ce;font-size:15px;border-bottom:1px solid #e2e8f0;padding-bottom:6px">${d.day}</h4>
            <div style="font-size:11px;color:#64748b;margin-bottom:8px;font-style:italic">${d.focus}</div>
            ${exHtml}
          </div>
        `;
      });

      element.innerHTML = `
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #3182ce;padding-bottom:14px">
          <h1 style="margin:0;color:#3182ce;font-size:28px">FitLife Fitness & Nutrition Plan</h1>
          <p style="margin:6px 0 0;color:#475569">Custom fitness blueprint generated automatically based on your body composition</p>
        </div>

        <h3 style="color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin-bottom:14px">📊 Body Composition & Targets</h3>
        <table style="width:100%;margin-bottom:24px;font-size:14px">
          <tr>
            <td style="padding:6px 0"><strong>Weight:</strong> ${$scope.form.weight} kg</td>
            <td style="padding:6px 0"><strong>Height:</strong> ${$scope.form.height} cm</td>
          </tr>
          <tr>
            <td style="padding:6px 0"><strong>BMR:</strong> ${$scope.bodyMetrics.bmr} kcal/day</td>
            <td style="padding:6px 0"><strong>TDEE:</strong> ${$scope.bodyMetrics.tdee} kcal/day</td>
          </tr>
          <tr>
            <td style="padding:6px 0"><strong>Daily Target Calories:</strong> ${$scope.bodyMetrics.targetCalories} kcal/day</td>
            <td style="padding:6px 0"><strong>Goal:</strong> ${$scope.bodyMetrics.goalText}</td>
          </tr>
          <tr>
            <td style="padding:6px 0" colspan="2"><strong>Macronutrients Target:</strong> Protein: ${$scope.bodyMetrics.protein}g · Carbs: ${$scope.bodyMetrics.carbs}g · Fats: ${$scope.bodyMetrics.fats}g</td>
          </tr>
        </table>

        <h3 style="color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin-top:30px;margin-bottom:14px;page-break-before:always">🥗 Personalized Diet Plan</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${dietHtml}
        </div>

        <h3 style="color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:6px;margin-top:30px;margin-bottom:14px;page-break-before:always">💪 Personalized Workout Plan</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          ${workoutHtml}
        </div>
      `;

      const opt = {
        margin: 10,
        filename: 'FitLife_Personalized_Plan.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    };

    /* ── Plan Customization State & Operations ───────── */
    $scope.editingDietIndex = -1; // mealIndex
    $scope.editingDietItemIndex = -1; // itemIndex
    $scope.editDietItemObj = null;

    $scope.addingDietIndex = -1; // mealIndex
    $scope.newDietItemObj = null;

    $scope.editingWorkoutIndex = -1; // dayIndex
    $scope.editingWorkoutExIndex = -1; // exIndex
    $scope.editWorkoutExObj = null;

    $scope.addingWorkoutIndex = -1; // dayIndex
    $scope.newWorkoutExObj = null;

    // Diet item operations
    $scope.startEditDietItem = function(mealIndex, itemIndex, item) {
      $scope.cancelAddDietItem();
      $scope.editingDietIndex = mealIndex;
      $scope.editingDietItemIndex = itemIndex;
      $scope.editDietItemObj = angular.copy(item);
    };

    $scope.saveEditDietItem = function(mealIndex, itemIndex) {
      if (!$scope.editDietItemObj || !$scope.editDietItemObj.name) return;
      $scope.generatedDiet.meals[mealIndex].items[itemIndex] = $scope.editDietItemObj;
      $scope.recalculateDietTotals();
      $scope.cancelEditDietItem();
    };

    $scope.cancelEditDietItem = function() {
      $scope.editingDietIndex = -1;
      $scope.editingDietItemIndex = -1;
      $scope.editDietItemObj = null;
    };

    $scope.deleteDietItem = function(mealIndex, itemIndex) {
      $scope.cancelEditDietItem();
      $scope.cancelAddDietItem();
      $scope.generatedDiet.meals[mealIndex].items.splice(itemIndex, 1);
      $scope.recalculateDietTotals();
    };

    $scope.startAddDietItem = function(mealIndex) {
      $scope.cancelEditDietItem();
      $scope.addingDietIndex = mealIndex;
      $scope.newDietItemObj = { name: '', qty: '', cal: 0, prot: 0, carb: 0, fat: 0 };
    };

    $scope.saveAddDietItem = function(mealIndex) {
      if (!$scope.newDietItemObj || !$scope.newDietItemObj.name) return;
      $scope.generatedDiet.meals[mealIndex].items.push($scope.newDietItemObj);
      $scope.recalculateDietTotals();
      $scope.cancelAddDietItem();
    };

    $scope.cancelAddDietItem = function() {
      $scope.addingDietIndex = -1;
      $scope.newDietItemObj = null;
    };

    // Recalculate totals
    $scope.recalculateDietTotals = function() {
      let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFats = 0;
      $scope.generatedDiet.meals.forEach(meal => {
        meal.totals = sumMeal(meal.items);
        totalCal += meal.totals.cal;
        totalProt += meal.totals.prot;
        totalCarbs += meal.totals.carb;
        totalFats += meal.totals.fat;
      });
      $scope.generatedDiet.totals = {
        calories: totalCal,
        protein: totalProt,
        carbs: totalCarbs,
        fats: totalFats
      };
      
      // Update body metrics daily calories target display to sync up nicely
      if ($scope.bodyMetrics) {
        $scope.bodyMetrics.targetCalories = totalCal;
        $scope.bodyMetrics.protein = totalProt;
        $scope.bodyMetrics.carbs = totalCarbs;
        $scope.bodyMetrics.fats = totalFats;
      }
    };

    // Workout exercise operations
    $scope.startEditWorkoutEx = function(dayIndex, exIndex, ex) {
      $scope.cancelAddWorkoutEx();
      $scope.editingWorkoutIndex = dayIndex;
      $scope.editingWorkoutExIndex = exIndex;
      $scope.editWorkoutExObj = angular.copy(ex);
    };

    $scope.saveEditWorkoutEx = function(dayIndex, exIndex) {
      if (!$scope.editWorkoutExObj || !$scope.editWorkoutExObj.name) return;
      $scope.generatedWorkout.days[dayIndex].exercises[exIndex] = $scope.editWorkoutExObj;
      $scope.cancelEditWorkoutEx();
    };

    $scope.cancelEditWorkoutEx = function() {
      $scope.editingWorkoutIndex = -1;
      $scope.editingWorkoutExIndex = -1;
      $scope.editWorkoutExObj = null;
    };

    $scope.deleteWorkoutEx = function(dayIndex, exIndex) {
      $scope.cancelEditWorkoutEx();
      $scope.cancelAddWorkoutEx();
      $scope.generatedWorkout.days[dayIndex].exercises.splice(exIndex, 1);
    };

    $scope.startAddWorkoutEx = function(dayIndex) {
      $scope.cancelEditWorkoutEx();
      $scope.addingWorkoutIndex = dayIndex;
      $scope.newWorkoutExObj = { name: '', details: '' };
    };

    $scope.saveAddWorkoutEx = function(dayIndex) {
      if (!$scope.newWorkoutExObj || !$scope.newWorkoutExObj.name) return;
      $scope.generatedWorkout.days[dayIndex].exercises.push($scope.newWorkoutExObj);
      $scope.cancelAddWorkoutEx();
    };

    $scope.cancelAddWorkoutEx = function() {
      $scope.addingWorkoutIndex = -1;
      $scope.newWorkoutExObj = null;
    };

    // Run Initialization
    $scope.init();
  }
]);
