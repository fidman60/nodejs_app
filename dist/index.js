import express from 'express';
import { MongoClient } from 'mongodb';
const app = express();
app.use(express.static(__dirname + '/views'));
MongoClient.connect('mongodb://localhost:27017/user_db', (err, db) => {
  if (err) throw err;
  console.log("DB has been created !");
  db.close();
});
app.get('/', (req, res) => {
  res.render('index.ejs');
});