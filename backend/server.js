const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
connectDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Swish API is running',
    timestamp: new Date().toISOString()
  });
});

// Basic route structure
app.use('/api', require('./routes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
