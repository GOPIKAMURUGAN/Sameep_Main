require('dotenv').config();
const mongoose = require('mongoose');
const Master = require('../models/Master');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/categoryApp';
  const dbName = process.env.MONGODB_DBNAME || 'categoryApp';

  await mongoose.connect(uri, { dbName });

  const name = 'Sizuki';
  const type = 'brand';
  const imageUrl = '/uploads/1760082212948.jpg';

  const update = {
    name,
    type,
    imageUrl,
    sequence: 0,
    fieldType: null,
    options: [],
    autoCalc: false,
  };

  const res = await Master.findOneAndUpdate(
    { name, type },
    { $set: update },
    { upsert: true, new: true }
  );

  console.log('Upserted brand:', res);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
