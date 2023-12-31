const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

app.use(cors({
    origin: [
        'https://amal-auth-b8696.web.app',
        'https://amal-auth-b8696.firebaseapp.com'
    ],
    credentials: true,
}))
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xgaxesu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "unAuthorized Access", status: 401 })
    };
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unAuthorized Access", status: 401 });
        }

        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        // await client.connect();

        // All Collections
        const foodCollection = client.db('restaurantDB').collection('foods');
        const categoryCollection = client.db('restaurantDB').collection('categories');
        const userCollection = client.db('restaurantDB').collection('users');
        const orderCollection = client.db('restaurantDB').collection('orders');

        // Auth
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res
                .cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                })
                .send({ success: true });
        });

        // GET all Foods / query + price
        app.get("/foods", async (req, res) => {
            let query = {};
            let sort = {};

            const itemsPerPage = 9;
            const page = req.query.page;

            if (req.query.category) {
                query.category = req.query.category;
            }

            if (req.query.search) {
                query.name = { $regex: new RegExp(req.query.search, "i") };
            }

            if (req.query.filter) {
                sort.price = req.query.filter
            }

            const result = await foodCollection
                .find(query)
                .sort(sort)
                .skip(page * itemsPerPage)
                .limit(itemsPerPage)
                .toArray();

            res.send(result);
        });

        // GET all foods for email checking system
        app.get("/allFoods", verifyToken, async (req, res) => {
            let query = {};

            if (req.query.email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden Access", status: 403 });
            }
            query.madeBy = req.query.email;


            const result = await foodCollection.find(query).toArray();
            res.send(result)
        });

        // GET all top foods 
        app.get("/topFoods", async (req, res) => {
            const result = await foodCollection.find({ count: { $gt: 0 } }).sort({ count: -1 }).limit(6).toArray();
            res.send(result)
        })

        // GET total food counts
        app.get("/foodsCount", async (req, res) => {
            const count = await foodCollection.estimatedDocumentCount();
            res.send({ count });
        })

        // GET a single food by id
        app.get("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await foodCollection.findOne(query);
            res.send(result);
        });

        // GET all Categories
        app.get("/categories", async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result);
        });

        // GET all Orders
        app.get('/orders', verifyToken, async (req, res) => {

            let query = {};

            if (req.query.email && req.decoded.email) {
                if (req.query.email !== req.decoded.email) {
                    console.log(req.query.email, req.decoded.email);
                    return res.status(403).send({ message: "Forbidden Access", status: 403 });
                }
                query.email = req.query.email
            }

            const result = await orderCollection.find(query).toArray();
            res.send(result);
        });

        // GET all users
        app.get("/users", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        // POST Orders
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        // POST Users
        app.post("/users", async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user)
            res.send(result);
        });

        // POST Foods
        app.post("/foods", async (req, res) => {
            const food = req.body;
            const result = await foodCollection.insertOne(food);
            res.send(result);
        });

        // PUT Update single food item by id
        app.put("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const food = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };

            const updateFood = {
                $set: {
                    name: food.name,
                    category: food.category,
                    image: food.image,
                    price: food.price,
                    madeBy: food.madeBy,
                    origin: food.origin,
                    ingredients: food.ingredients,
                    procedure: food.procedure,
                    quantity: food.quantity,
                }
            };

            const result = await foodCollection.updateOne(filter, updateFood, options);
            res.send(result);
        });

        // PATCH Update a single food by id
        app.patch("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const field = req.body;
            const filter = { _id: new ObjectId(id) };

            const updatedField = {
                $set: {
                    count: field.count
                },
            };

            const result = await foodCollection.updateOne(filter, updatedField);
            res.send(result)
        })

        // DELETE a single order by id
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });

        // DELETE a single food by id
        app.delete("/foods/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await foodCollection.deleteOne(query);
            res.send(result);
        });

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