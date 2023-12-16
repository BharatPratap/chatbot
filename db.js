// db.js

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = 'mongodb+srv://admin:SmQh1uMpK0c1Nry8@cluster0.lwtew.mongodb.net/?retryWrites=true&w=majority';


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

function getClient() {
    return client;
}

module.exports = { connect, getClient };
