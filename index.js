const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(decoded);
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");


// use middleware
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});





// verify firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: "Unauthorized access" })
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
    console.log("decoded info", decoded)
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" })
  }


};


// email verify middleware
const verifyTokenEmail = (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    return res.status(403).send({ message: "Forbidden access" })
  }

  next();
}




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
    // await client.connect();

    // database collection list
    const jobsCollection = client.db("job-portal").collection("jobs-circular");
    const jobsApplicationCollection = client.db("job-portal").collection("jobs-application");

    // get all jobs circular data
    app.get("/jobs", async (req, res) => {

      const email = req.query.email;
      const query = {};
      if (email) {
        query.hr_email = email;
      }

      const jobsData = jobsCollection.find(query);
      const result = await jobsData.toArray();
      res.send(result);
    })

    // get how many applicant apply for job
    app.get("/jobs/applications", verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobsCollection.find(query).toArray();
      for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() };
        const application_count = await jobsApplicationCollection.countDocuments(applicationQuery)
        job.application_count = application_count;
      }
      res.send(jobs);
    })

    // get specific job
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    // get application using applicant email
    app.get("/applications", verifyFirebaseToken, verifyTokenEmail, async (req, res) => {
      const email = req.query.email;
      const query = { email };
      const result = await jobsApplicationCollection.find(query).toArray();
      for (const application of result) {
        const jobId = application.jobId;
        const jobQuery = { _id: new ObjectId(jobId) };
        const job = await jobsCollection.findOne(jobQuery)
        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo
      }
      res.json(result)
    })

    // get applicant list for specific job
    app.get("/applications/jobs/:job_id", async (req, res) => {
      const job_id = req.params.job_id;
      const query = { jobId: job_id };
      const result = await jobsApplicationCollection.find(query).toArray();
      res.send(result);
    })


    // update applicant application status
    app.patch("/applications/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body.status;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: updatedStatus
        }
      }

      const result = await jobsApplicationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })


    // add job
    app.post("/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);

    })

    // job appliation upload
    app.post("/jobApplication", async (req, res) => {
      const application = req.body;
      const result = await jobsApplicationCollection.insertOne(application);
      res.send(result);
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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



// live link : https://job-portal-server-black-beta.vercel.app/