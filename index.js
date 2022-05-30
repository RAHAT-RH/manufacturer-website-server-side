const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectID = require("mongodb").ObjectId;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


// mongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ffsjs.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect()

        const productCollection = client.db('computer_products').collection('all_products');
        const orderCollection = client.db('computer_products').collection('all_orders');
        const reviewCollection = client.db('computer_products').collection('all_review');
        const userCollection = client.db('computer_products').collection('all_user');
        const paymentCollection = client.db('computer_products').collection('payments');
        const profileCollection = client.db('computer_products').collection('profile');

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

        // add product get

        app.get('/allProducts', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // add product get by id

        app.get('/allProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectID(id) };
            const result = await productCollection.findOne(query);
            res.send(result)
        })

        // get user by email orders

        app.get('/orders', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email
            // const authorization = req.headers.authorization;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const userOrder = await orderCollection.find(query).toArray();
                return res.send(userOrder);
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }

        })

        // single product order routes

        app.get('/orders/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectID(id)};
            const result = await orderCollection.findOne(query);
            res.send(result)
        })

        // all orders shoW

        app.get('/manageOrder', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // Single Order Delete

        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectID(id) };
            const result = await orderCollection.deleteOne(filter)
            res.send(result)
        })

        // get product

        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result)
        })

        // load review 

        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        //  add a review

        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result)
        })

        // Add my profile 

        app.post('/myProfile', async(req, res) => {
            const myProfile = req.body;
            const result = profileCollection.insertOne(myProfile);
            res.send(result);
        })

        // My profile get by email

        app.get('/myProfile/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email}
            const result = await profileCollection.findOne(query);
            res.send(result)
        })

        // order Collection 

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // insert user

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })

        app.get('/users', async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        });

        // user delete

        app.delete('/user/:id', async(req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectID(id) };
            const result = await userCollection.deleteOne(filter)
            res.send(result)
        })

        // unauthorized not make a Admin

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
        })

        // admin route

        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({email: email})
            const isAdmin = user.role === 'admin';
            res.send({admin : isAdmin})
        })

        // update profile 

        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
            const orders = req.body;
            const price = orders.totalPrice;
            const amount = price*100;
          
            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
              amount: amount,
              currency: "usd",
              payment_method_types: ['card']
            });
          
            res.send({
              clientSecret: paymentIntent.client_secret,
            });
          });

        //   patch

        app.patch('/order/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectID(id)};
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId,
                }
            }
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updateDoc);
            res.send(updateDoc)
        })

        // line end

    }

    finally {
        // await client.close();
    }
}

run().catch(console.dir)

// mongoDB end

app.get('/', (req, res) => {
    res.send('Hello Doctors Welcome To server site')
})

app.listen(port, () => {
    console.log(`Tech Parts Projects listening on port ${port}`)
})