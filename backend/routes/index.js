const express = require('express');
const router = express.Router();

// Placeholder for future routes
// router.use('/users', require('./userRoutes'));
// router.use('/posts', require('./postRoutes'));

router.get('/', (req, res) => {
  res.json({
    message: 'Swish API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health'
    }
  });
});

module.exports = router;
