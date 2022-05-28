const express = require('express')
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000

// middleWare


// user Name: computer-parts
// password : XjF2bUJUaX7HkFGf

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ffsjs.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// collection

const partsCollection = client.db('computer-parts').collection('all-parts');


// jwt

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "UnAuthorization access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}

// Verify Admin

const verifyAdmin = async (req, res, next) => {
    const requester = req.decoded.email;
    const requesterAccount = await userCollection.findOne({ email: requester })
    if (requesterAccount.role === 'admin') {
        next();
    }
    else {
        res.status(403).send({ message: 'Forbidden' });
    }
}

async function run() {
    try {
        await client.connect();
        console.log("database connected")

        // all_parts get 

        app.get('/allParts', async(req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        })

        // add Product

        app.post('/product', async (req, res) => {
            const query = req.body;
            const result = await partsCollection.insertOne(query)
            res.send(result)
        })
    } 
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Computer')
})

app.listen(port, () => {
    console.log(`Computer app listening on port ${port}`)
})