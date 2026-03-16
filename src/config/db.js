const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected at: ${process.env.PORT}`);
    } catch (error) {
        console.log('Error Occured as :', error);
        process.exit(1);
    }
}

module.exports = connectDB;