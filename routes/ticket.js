const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: User Dashboard
router.get('/dashboard/user', async (req, res) => {
  if (!req.session.user?.globalId) {
    return res.redirect('/login');
  }

  const globalId = req.session.user.globalId;

  try {
    const [tickets] = await db.query(`
      SELECT 
        t.*, 
        u.name AS assigned_to_name 
      FROM tickets t
      LEFT JOIN users u ON t.assigned_to = u.global_id
      WHERE t.global_id = ?
      ORDER BY t.created_at DESC
    `, [globalId]);

    res.render('dashboard-user', { user: req.session.user, tickets });
  } catch (err) {
    console.error('Error loading user dashboard:', err);
    res.status(500).send('Something went wrong loading your tickets.');
  }
});


// POST: Submit Ticket
router.post('/ticket/submit', async (req, res) => {
  if (!req.session?.user) {
    return res.status(401).send("Session not found. Please log in.");
  }

  const globalId = req.session.user.globalId;
  const { category, description, building_no, area_code, sub_area } = req.body;

  try {
    if (category === 'Facility Service') {
      if (!building_no || !area_code || !sub_area) {
        return res.status(400).send("⚠️ Missing Facility location details.");
      }

      await db.query(`
        INSERT INTO tickets (global_id, category, description, building_no, area_code, sub_area)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [globalId, category, description, building_no, area_code, sub_area]);

    } else {
      // Breakdown or Safety – insert without location fields
      await db.query(`
        INSERT INTO tickets (global_id, category, description)
        VALUES (?, ?, ?)
      `, [globalId, category, description]);
    }

    res.send("✅ Ticket submitted successfully! <a href='/dashboard/user'>Go back</a>");
  } catch (err) {
    console.error("Error submitting ticket:", err);
    res.status(500).send("❌ Failed to submit ticket.");
  }
});

module.exports = router;
  