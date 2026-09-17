import mongoose from 'mongoose';

const uri = "mongodb://swishhproject_db_user:Swish2026@ac-knggboa-shard-00-00.l5jvtoe.mongodb.net:27017,ac-knggboa-shard-00-01.l5jvtoe.mongodb.net:27017,ac-knggboa-shard-00-02.l5jvtoe.mongodb.net:27017/swish?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri)
  .then(() => {
    console.log("Connected successfully to direct URI");
    process.exit(0);
  })
  .catch(err => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
