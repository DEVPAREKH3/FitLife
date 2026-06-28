const bcrypt = require('bcryptjs');

const db = {
  users: [],
  bmis: [],
  diets: [],
  workouts: []
};

// Seed a default user for testing if memory DB is clean
const defaultUserPasswordHash = bcrypt.hashSync('password123', 12);
db.users.push({
  _id: '60c72b2f9b1d8b2bad000001',
  name: 'Demo User',
  email: 'demo@example.com',
  password: defaultUserPasswordHash,
  age: 25,
  gender: 'male',
  height: 175,
  weight: 70,
  fitnessGoal: 'maintain',
  createdAt: new Date(),
  updatedAt: new Date()
});

function initMockDb(models) {
  const { User, BMI, Diet, Workout } = models;

  // --- MOCK USER ---
  const wrapUser = (u) => {
    if (!u) return null;
    const doc = Object.create(User.prototype);
    Object.assign(doc, u);
    doc.comparePassword = function(plain) {
      return bcrypt.compare(plain, u.password);
    };
    doc.select = function() { return doc; };
    return doc;
  };

  User.findOne = async function(query) {
    const u = db.users.find(user => {
      for (let k in query) {
        if (user[k] !== query[k]) return false;
      }
      return true;
    });
    return wrapUser(u);
  };

  User.findById = async function(id) {
    const u = db.users.find(user => user._id.toString() === id.toString());
    const doc = wrapUser(u);
    if (doc) {
      doc.select = function() { return doc; };
    }
    return doc;
  };

  User.findByIdAndUpdate = async function(id, update, options) {
    const userIndex = db.users.findIndex(u => u._id.toString() === id.toString());
    if (userIndex === -1) return null;
    const user = db.users[userIndex];
    const setUpdates = update.$set || update;
    Object.assign(user, setUpdates, { updatedAt: new Date() });
    return wrapUser(user);
  };

  User.prototype.save = async function() {
    if (!this._id) {
      this._id = Math.random().toString(36).substring(2, 15);
    }
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    const userObj = {
      _id: this._id,
      name: this.name,
      email: this.email,
      password: this.password,
      age: this.age,
      gender: this.gender,
      height: this.height,
      weight: this.weight,
      fitnessGoal: this.fitnessGoal,
      otp: this.otp,
      otpExpires: this.otpExpires,
      createdAt: this.createdAt || new Date(),
      updatedAt: new Date()
    };
    const existingIndex = db.users.findIndex(u => u.email === this.email);
    if (existingIndex !== -1) {
      db.users[existingIndex] = userObj;
    } else {
      db.users.push(userObj);
    }
    return wrapUser(userObj);
  };

  // --- MOCK BMI ---
  BMI.prototype.save = async function() {
    this._id = Math.random().toString(36).substring(2, 15);
    this.createdAt = new Date();
    const obj = {
      _id: this._id,
      userId: this.userId,
      weight: this.weight,
      height: this.height,
      bmi: this.bmi,
      category: this.category,
      date: this.date || new Date(),
      createdAt: this.createdAt
    };
    db.bmis.push(obj);
    return obj;
  };

  BMI.find = function(query) {
    let results = db.bmis.filter(b => b.userId.toString() === query.userId.toString());
    const chain = {
      sort: function() { return this; },
      limit: function() { return this; },
      then: function(cb) {
        if (cb) cb(results);
        return Promise.resolve(results);
      }
    };
    Object.setPrototypeOf(chain, Promise.prototype);
    return chain;
  };

  // --- MOCK DIET ---
  Diet.prototype.save = async function() {
    this._id = Math.random().toString(36).substring(2, 15);
    const obj = {
      _id: this._id,
      userId: this.userId,
      mealName: this.mealName,
      mealType: this.mealType,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fats: this.fats,
      date: this.date || new Date(),
      createdAt: new Date()
    };
    db.diets.push(obj);
    return obj;
  };

  Diet.find = function(query) {
    let results = db.diets.filter(d => {
      if (d.userId.toString() !== query.userId.toString()) return false;
      if (query.date && query.date.$gte && query.date.$lte) {
        const dDate = new Date(d.date);
        return dDate >= query.date.$gte && dDate <= query.date.$lte;
      }
      return true;
    });

    const chain = {
      sort: function(opt) {
        const key = Object.keys(opt)[0];
        const dir = opt[key];
        results.sort((a, b) => (a[key] > b[key] ? 1 : -1) * dir);
        return this;
      },
      skip: function(n) {
        results = results.slice(n);
        return this;
      },
      limit: function(n) {
        results = results.slice(0, n);
        return this;
      },
      then: function(cb) {
        if (cb) cb(results);
        return Promise.resolve(results);
      }
    };
    Object.setPrototypeOf(chain, Promise.prototype);
    return chain;
  };

  Diet.countDocuments = async function(query) {
    return db.diets.filter(d => d.userId.toString() === query.userId.toString()).length;
  };

  Diet.findOneAndDelete = async function(query) {
    const idx = db.diets.findIndex(d => d._id.toString() === query._id.toString() && d.userId.toString() === query.userId.toString());
    if (idx === -1) return null;
    const removed = db.diets.splice(idx, 1);
    return removed[0];
  };

  // --- MOCK WORKOUT ---
  Workout.prototype.save = async function() {
    this._id = Math.random().toString(36).substring(2, 15);
    const obj = {
      _id: this._id,
      userId: this.userId,
      exercise: this.exercise,
      category: this.category,
      sets: this.sets,
      reps: this.reps,
      weight: this.weight,
      duration: this.duration,
      date: this.date || new Date(),
      createdAt: new Date()
    };
    db.workouts.push(obj);
    return obj;
  };

  Workout.find = function(query) {
    let results = db.workouts.filter(w => {
      if (w.userId.toString() !== query.userId.toString()) return false;
      return true;
    });
    const chain = {
      sort: function(opt) {
        const key = Object.keys(opt)[0];
        const dir = opt[key];
        results.sort((a, b) => (a[key] > b[key] ? 1 : -1) * dir);
        return this;
      },
      skip: function(n) {
        results = results.slice(n);
        return this;
      },
      limit: function(n) {
        results = results.slice(0, n);
        return this;
      },
      then: function(cb) {
        if (cb) cb(results);
        return Promise.resolve(results);
      }
    };
    Object.setPrototypeOf(chain, Promise.prototype);
    return chain;
  };

  Workout.countDocuments = async function(query) {
    return db.workouts.filter(w => w.userId.toString() === query.userId.toString()).length;
  };

  Workout.findOneAndDelete = async function(query) {
    const idx = db.workouts.findIndex(w => w._id.toString() === query._id.toString() && w.userId.toString() === query.userId.toString());
    if (idx === -1) return null;
    const removed = db.workouts.splice(idx, 1);
    return removed[0];
  };

  Workout.aggregate = async function(pipeline) {
    const matchStage = pipeline.find(p => p.$match);
    const groupStage = pipeline.find(p => p.$group);

    let filtered = db.workouts;
    if (matchStage && matchStage.$match) {
      const { userId, date } = matchStage.$match;
      filtered = filtered.filter(w => {
        if (w.userId.toString() !== userId.toString()) return false;
        if (date && date.$gte) {
          return new Date(w.date) >= date.$gte;
        }
        return true;
      });
    }

    if (groupStage && groupStage.$group) {
      const g = groupStage.$group;
      const idExpr = g._id;

      const groups = {};
      for (const w of filtered) {
        let key = '';
        if (typeof idExpr === 'string') {
          key = w[idExpr.replace('$', '')];
        } else if (idExpr && idExpr.$dateToString) {
          const dateVal = new Date(w.date);
          key = dateVal.toISOString().split('T')[0];
        }

        if (!groups[key]) {
          groups[key] = {
            _id: key,
            totalDuration: 0,
            totalSets: 0,
            exercises: [],
            count: 0
          };
        }

        groups[key].totalDuration += w.duration || 0;
        groups[key].totalSets += w.sets || 0;
        groups[key].count += 1;
        if (w.exercise && !groups[key].exercises.includes(w.exercise)) {
          groups[key].exercises.push(w.exercise);
        }
      }

      let results = Object.values(groups);
      const sortStage = pipeline.find(p => p.$sort);
      if (sortStage && sortStage.$sort) {
        const key = Object.keys(sortStage.$sort)[0];
        const dir = sortStage.$sort[key];
        results.sort((a, b) => (a[key] > b[key] ? 1 : -1) * dir);
      }
      return results;
    }

    return [];
  };

  console.log('⚠️  MongoDB connection failed. Started in fallback IN-MEMORY DB mode.');
}

module.exports = { initMockDb };
