const mongoose = require('mongoose');
require('dotenv').config();

// Attempting to connect using one of the shards directly to test if standard DNS works
const testUri = 'mongodb://yousafmahad248_db_user:mahad123@ac-x0ncslz-shard-00-00.uijdfe6.mongodb.net:27017/test?ssl=true&authSource=admin';

mongoose.connect(testUri)
  .then(() => {
    console.log('Successfully connected to shard directly!');
    const replicaSet = mongoose.connection.getClient().topology.description.setName;
    console.log('Replica Set Name:', replicaSet);
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to connect to shard directly:', err);
    process.exit(1);
  });
