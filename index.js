const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
const { connect, getClient } = require('./db');

// Your OpenAI API key
const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;

connect();
let client;

const addUser = async (user) => {
    try {
        client = getClient();
        await client.connect();
        const database = client.db('dukaan');
        const usersCollection = database.collection('chatbot');
        const result = await usersCollection.insertOne(user);
        console.log(`User added with ID: ${result.insertedId}`);
    } finally {
        await client.close();
    }
}

app.post('/createClient', async (req, res) => {
    const {
        clientName,
        clientId
    } = req.body;
    client = getClient();
    await client.connect();
    const database = client.db('dukaan');
    const newClient = {
        clientName: clientName,
        clientId: clientId,
        createdAt: new Date(),
    }
    const usersCollection = database.collection('clients');
    const result = await usersCollection.insertOne(newClient);
    console.log(`User added with ID: ${result.insertedId}`);
    res.json({
        insertId: result.insertedId,
        clientId: clientId
    });

})

const verifyClient = async (clientId) => {
    client = getClient();
    await client.connect();
    const database = client.db('dukaan');
    const usersCollection = database.collection('clients');
    const result = await usersCollection.find({ clientId: clientId }).toArray();
    console.log(result.length > 0);
    return result.length > 0;
}

app.get('/createUser', async (req, res) => {
    const { clientId, customerReference, story } = req.body;
    const customerId = `${clientId}_${customerReference}_${moment().unix()}`;

    if (!(await verifyClient(clientId))) {
        res.json({
            message: "Invalid Credentials."
        });
        return;
    }

    const newUser = {
        customerId: customerId,
        messageHistory: [{
            "role": "system",
            "content": story
        }],
        createdAt: new Date(),
    };

    await addUser(newUser);
    res.json({ customerId: customerId });
});

app.post('/handleQuery', async (req, res) => {
    const { customerId, query } = req.body;

    try {
        client = getClient();
        await client.connect();
        const database = client.db('dukaan');
        const usersCollection = database.collection('chatbot');
        const obj = await usersCollection.find({ customerId: customerId }).toArray();
        console.log(obj);
        const messageHistory = obj[0].messageHistory;
        const queries = [
            ...messageHistory,
            {
                "role": "user",
                "content": query
            }
        ]
        await usersCollection.findOneAndUpdate({ customerId: customerId }, {
            $push: {
                messageHistory: {
                    "role": "user",
                    "content": query
                }
            }
        })
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',

            {
                "model": "gpt-3.5-turbo",
                "messages": [
                    ...queries
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(response.data["choices"][0]["message"]);
        const newMessage = response.data["choices"][0]["message"];
        await usersCollection.findOneAndUpdate({ customerId: customerId }, {
            $push: {
                messageHistory: newMessage
            }
        })
        res.json({ response: response.data["choices"][0]["message"]["content"] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
