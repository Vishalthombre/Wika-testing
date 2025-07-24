const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to ensure planner access
function requirePlanner(req, res, next) {
  if (!req.session.user || req.session.user.department !== 'planner') {
    return res.redirect('/login');
  }
  next();
}

// GET: Planner Dashboard
router.get('/dashboard/planner', requirePlanner, async (req, res) => {
  try {
    const [tickets] = await db.query(`
      SELECT 
        t.*, 
        u.name AS assigned_to_name 
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.global_id
      ORDER BY t.created_at DESC
    `);

    const [executers] = await db.query(
      "SELECT global_id, name FROM users WHERE department = 'executer'"
    );

    res.render('dashboard-planner', {
  tickets,
  executers,
  user: req.session.user // ✅ Add this line to fix the error
});

  } catch (err) {
    console.error('Planner dashboard error:', err);
    res.send("Error loading planner dashboard");
  }
});

// POST: Assign Ticket
router.post('/planner/assign', requirePlanner, async (req, res) => {
  const { ticketId, executerId } = req.body;

  try {
    await db.query(
      'UPDATE tickets SET assigned_to = ?, status = ? WHERE id = ?',
      [executerId, 'Assigned', ticketId]
    );
    res.redirect('/dashboard/planner');
  } catch (err) {
    console.error('Assignment error:', err);
    res.send('❌ Failed to assign executer.');
  }
});

module.exports = router;
