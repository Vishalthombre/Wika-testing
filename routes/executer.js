const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to ensure executer is logged in
function requireExecuter(req, res, next) {
  if (!req.session.user || req.session.user.department !== 'executer') {
    return res.redirect('/login');
  }
  next();
}

// GET: Executer Dashboard
router.get('/dashboard/executer', requireExecuter, async (req, res) => {
  const globalId = req.session.user.globalId;

  try {
    const [tickets] = await db.query(`
      SELECT 
        t.*, 
        u.name AS planner_name 
      FROM tickets t
      LEFT JOIN users u ON t.planner_id = u.global_id
      WHERE t.assigned_to = ?
      ORDER BY t.created_at DESC
    `, [globalId]);

  res.render('dashboard-executer', {
  tickets,
  user: req.session.user // ✅ Pass user to fix navbar include
});
  } catch (err) {
    console.error('Executer dashboard error:', err);
    res.send('Error loading executer dashboard.');
  }
});

// POST: Start ticket
router.post('/executer/start', requireExecuter, async (req, res) => {
  const { ticketId } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE tickets SET status = ? WHERE id = ?',
      ['In Progress', ticketId]
    );

    if (result.affectedRows === 0) {
      console.error("No ticket updated. Possibly invalid ticket ID:", ticketId);
      return res.send("❌ Ticket not found.");
    }
    console.log("Ticket start result:", result);
    res.redirect('/dashboard/executer');
  } catch (err) {
    console.error("Error in /executer/start:", err);
    res.send('Error starting the ticket.');
  }
});


// POST: Complete ticket
router.post('/executer/complete', requireExecuter, async (req, res) => {
  const { ticketId, completion_note } = req.body;

  try {
    await db.query(`
      UPDATE tickets 
      SET status = ?, completion_note = ?
      WHERE id = ?
    `, ['Completed', completion_note, ticketId]);

    res.redirect('/dashboard/executer');
  } catch (err) {
    console.error('Error completing ticket:', err);
    res.send('Error completing the ticket.');
  }
});

module.exports = router;
