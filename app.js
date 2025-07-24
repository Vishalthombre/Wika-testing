const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const app = express();
require('dotenv').config();
app.use(express.static('public'));
app.use(express.static('public'));


const session = require('express-session');
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // Set true only with HTTPS
})); 


app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));



// user routes
const ticketRoutes = require('./routes/ticket');
app.use('/', ticketRoutes);

//planner routes
const plannerRoutes = require('./routes/planner');
app.use('/', plannerRoutes);

// executer routes
const executerRoutes = require('./routes/executer');
app.use('/', executerRoutes);

 

app.get('/', (req, res) => res.redirect('/login'));

// Show Global ID form
app.get('/register', (req, res) => {
  res.render('register-id', { error: null });
});

// Check Global ID
app.post('/register/check', async (req, res) => {
  const globalId = req.body.globalId?.trim();
  if (!globalId) return res.render('register-id', { error: 'Global ID is required' });

  const [rows] = await db.query('SELECT * FROM users WHERE global_id = ?', [globalId]);
  const user = rows[0];

  if (!user) return res.render('register-id', { error: 'User not found' });
  if (user.password) return res.render('register-id', { error: 'User already registered' });

  res.render('register-details', { user });
});

// Complete registration (set password)
app.post('/register/complete', async (req, res) => {
  const { globalId, password } = req.body;
  if (!globalId || !password) return res.send('Global ID and password are required.');

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query('UPDATE users SET password = ? WHERE global_id = ?', [hashed, globalId]);

    if (!result.affectedRows) return res.send('Error: Global ID not found.');
    res.send('✅ Registration complete. <a href="/login">Login now</a>.');
  } catch (err) {
    console.error('Registration error:', err);
    res.send('❌ Registration failed.');
  }
});

// Login form
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
app.post('/login', async (req, res) => {
  const { globalId, password } = req.body;
  if (!globalId || !password)
    return res.render('login', { error: 'Both fields are required' });

  const [rows] = await db.query('SELECT * FROM users WHERE global_id = ?', [globalId]);
  const user = rows[0];

  if (!user || !user.password)
    return res.render('login', { error: 'Invalid Global ID or unregistered user' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.render('login', { error: 'Incorrect password' });

  // ✅ Save user in session
req.session.user = {
  id: user.id,
  globalId: user.global_id,
  name: user.name,
  email: user.email,
  department: user.department
};
console.log("Session set on login:", req.session.user);

switch (user.department) {
  case 'planner':
    return res.redirect('/dashboard/planner');
  case 'admin':
    return res.redirect('/dashboard/admin');
  case 'normal_user':
    return res.redirect('/dashboard/user');
  case 'executer':
    return res.redirect('/dashboard/executer');
  default:
    return res.send('❌ Unknown department.');
}

});

const isLoggedIn = (req, res, next) => {
  if (!req.session.user) return res.redirect('/login');
  next();
};

app.get('/dashboard/planner', isLoggedIn, (req, res) => {
  res.send(`<h2>Planner Dashboard</h2>Welcome, ${req.session.user.name}! <a href="/logout">Logout</a>`);
});

app.get('/dashboard/admin', isLoggedIn, (req, res) => {
  res.send(`<h2>Admin Dashboard</h2>Welcome, ${req.session.user.name}! <a href="/logout">Logout</a>`);
});

app.get('/dashboard/user', isLoggedIn, (req, res) => {
  res.send(`<h2>User Dashboard</h2>Welcome, ${req.session.user.name}! <a href="/logout">Logout</a>`);
});

app.get('/dashboard/executer', isLoggedIn, (req, res) => {
  res.send(`<h2>Executer Dashboard</h2>Welcome, ${req.session.user.name}! <a href="/logout">Logout</a>`);
});


app.get('/dashboard',isLoggedIn, (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.send(`Welcome ${req.session.user.name}! <a href="/logout">Logout</a>`);
});
// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Logout failed');
    res.redirect('/login');
  });
});


// Start server
app.listen(3000, () => console.log('🚀 Server running at http://localhost:3000'));
