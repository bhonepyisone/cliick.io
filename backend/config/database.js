const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MongoDB URI is optional - we use Supabase for production
        if (!process.env.MONGODB_URI) {
            console.log('⚠️  MongoDB URI not set - using Supabase for data storage');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error(`❌ Error connecting to MongoDB: ${error.message}`);
        console.log('⚠️  Continuing without MongoDB - using Supabase instead');
    }
};

module.exports = connectDB;
