require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.send('Server running...');
});

// Import your routes
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');

app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);

// Serve frontend static files
app.use('/', express.static(path.join(__dirname, 'public')));

// MongoDB connection
const PORT = process.env.PORT || 4000;
const mongoURI = process.env.MONGODB_URI; // Must be set in Render environment

if (!mongoURI) {
  console.error('❌ MONGODB_URI is not defined. Set it in Render Environment Variables.');
  process.exit(1); // Stop app if MongoDB URI is missing
}

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');

    // Start server after DB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectDB, 5000); // Retry if failed
  }
};

connectDB();
