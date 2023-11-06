const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true,
}))
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xgaxesu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // await client.connect();

        // All Collections
        const foodCollection = client.db('restaurantDB').collection('foods');
        const categoryCollection = client.db('restaurantDB').collection('categories');
        const userCollection = client.db('restaurantDB').collection('users');

        // Auth
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.send(token)
        })


        // GET all Foods / query + price
        app.get("/foods", async (req, res) => {
            let query = {};

            if (req.query.category) {
                query.category = req.query.category
            }

            const result = await foodCollection.find(query).toArray();
            res.send(result);
        });

        // GET a single food by id
        app.get("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query);
            res.send(result);
        })

        // GET all Categories
        app.get("/categories", async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result);
        })

        // POST all Users
        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user)
            res.send(result);
        })






        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Restaurant is Busy.')
})

app.listen(port, () => {
    console.log(`restaurant server is running on port: ${port}`)
})