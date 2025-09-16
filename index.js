const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();


// use middleware
app.use(cors());
app.use(express.json());

// data base connection


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@job-portal-cluster.yfcasvz.mongodb.net/?retryWrites=true&w=majority&appName=job-portal-cluster`;

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

    // database collection list
    const jobsCollection = client.db("job-portal").collection("jobs-circular");


    // get all jobs circular data
    app.get("/all_jobs", async(req,res) => {
        const jobsData = jobsCollection.find();
        const result = await jobsData.toArray();
        res.send(result);
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});

