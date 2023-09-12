const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion,ObjectId  } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//middle ware
app.use(cors());
app.use(express.json());


// db connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0mh3qht.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    await client.connect(); 
    const blogsCollection = client.db("psychologyBuzz").collection("blogs");
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