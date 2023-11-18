const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion,ObjectId  } = require('mongodb');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


//middle ware
app.use(cors());
app.use(express.json());


// db connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0mh3qht.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

  const authHeader = req.headers.authorization;
  if (!authHeader) {
      return res.status(401).send('unauthorized access');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
      if (err) {
          return res.status(403).send({ message: 'forbidden access' })
      }
      req.decoded = decoded;
      next();
  })

}

async function run() {
  try {
    await client.connect(); 
    const blogsCollection = client.db("psychologyBuzz").collection("blogs");
    const postsCollection = client.db("psychologyBuzz").collection("posts");
    const appointmentCollection = client.db("psychologyBuzz").collection("appointments");
    const bookingsCollection = client.db("psychologyBuzz").collection("bookings");
    const usersCollection = client.db("psychologyBuzz").collection("users");
    const appointmentOptionCollection = client.db("psychologyBuzz").collection("appointmentSpecialty");

    // Note: Make sure you use verifyAdmin after verifyJWT
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get('/blogs', async (req, res) => {
        const query = {};
        const blogs = await blogsCollection.find(query).toArray();
        res.send(blogs);
    });

    app.get('/blogs/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const blogs = await blogsCollection.findOne(query);
        res.send(blogs);
    });

    app.post("/posts", async (req, res) => {
      const user = req.body;
      const result = await postsCollection.insertOne(user);
      res.send(result);
    });

    app.get('/posts', async (req, res) => {
      const query = {};
      const posts = await postsCollection.find(query).toArray();
      res.send(posts);
    });

    app.get("/posts/:id/comments", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const post = await postsCollection.findOne(filter);
      const comments = await post.comments;
      res.send(comments);
    });

     app.put("/posts/:id/comments", async (req, res) => {
      const id = req.params.id;
      const comment = req.body;
      const filter = { _id: ObjectId(id) };
      const post = await postsCollection.findOne(filter);
      const comments = post.comments;
      const newComments = [...comments, comment];
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          comments: newComments,
        },
      };
      const result = await postsCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    app.get('/appointments', async(req, res) =>{
      const query = {};
      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/appointments', async(req, res) =>{
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      res.send(result);
    })

    app.get('/appointmentSpecialty', async(req, res)=>{
      const query = {}
      const result = await appointmentOptionCollection.find(query).project({name: 1}).toArray();
      res.send(result);
    });

    app.post('/bookings', async(req, res) =>{
      const booking = req.body;
      const query = {
        appointmentDate : booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment
      }
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length){
        const message = `You already have an booking on ${booking.appointmentDate}`
        return res.send({acknowledged: false, message});
      }
      const result = await bookingsCollection.insertOne(booking);
      return res.send({acknowledged: true});
    });

    app.get('/bookings', async(req, res) =>{
      const email = req.query.email;
      const query = {email: email};
      const result  =  await bookingsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/bookings/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.get('/jwt', async(req, res) =>{
      const email = req.query.email;
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      if(user){
        const token  = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'})
        return res.send({accessToken: token});
      }
      res.status(403).asend({accessToken: ''})
    });

    app.get('/users', async(req, res)=>{
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email }
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' });
  });

    app.post('/users', async(req, res) =>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.put('/users/admin/:id', verifyJWT, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = {upsert: true};
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result);
    });

    app.delete('/users/:id', verifyJWT, verifyAdmin, async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    app.get('/doctors', verifyJWT, verifyAdmin, async(req, res) =>{
      const query = {};
      const doctors = await doctorsCollection.find(query).toArray();
      res.send(doctors);
    });

    app.post('/doctors', verifyJWT, verifyAdmin, async(req, res)=>{
      const doctor = req.body;
      const result = await doctorsCollection.insertOne(doctor);
      res.send(result);
    });

    app.delete('/doctors/:id', verifyJWT, async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const result = await appointmentCollection.deleteOne(filter);
      res.send(result);
    })
  }
  finally{

  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})