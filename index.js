const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET)
// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req,res,next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err,decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'Unauthorized access'});
    }
    req.decoded = decoded;
    next();
  })
}






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mjrrjle.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db('smartshop').collection('users')
    const productsCollection = client.db('smartshop').collection('products')


    // jwt
    app.post('/jwt', (req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {expiresIn: '2h'})
      res.send({token}) 
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }


    // save user in database
    app.post('/users', async(req,res)=>{
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await usersCollection.findOne(query);
        if(existingUser){
          return res.send({message: 'user exist'})
        }
        const result = await usersCollection.insertOne(user);
        res.send(result)
    })

    // get all users
    app.get('/users', verifyJWT, verifyAdmin, async(req,res) =>{
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.get('/users/admin/:email', verifyJWT, async(req,res) => {
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({admin:false})
      }
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

    // get all products
    app.get('/products', async(req,res)=>{
      const result = await productsCollection.find().toArray();
      res.send(result)
    })

    // get single product
    app.get('/products/:id',  async(req,res) => {
      const id = req.params.id;
      const result = await productsCollection.findOne({_id: new ObjectId(id)})
      res.send(result)
    })



    // payment api
app.post("/api/create-checkout-session", async (req, res) => {
  const { products } = req.body;

  const lineItems = products.map((product) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: product.name,
        images: [product.image],
      },
      unit_amount: Math.round(product.price * 100), 
    },
    quantity: product.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: "http://localhost:5173/success",
    cancel_url: "http://localhost:5173/cancel",
  });

  res.json({ id: session.id });
});









    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);










app.get('/', (req,res) => {
    res.send("Server is running");
})
app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})