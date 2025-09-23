const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");


// use middleware
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log("Inside the logger middleware")
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("Cookie in the middleware", req.cookies)

  if(!token){
    return res.status(401).send({message: "Unauthorized Access"})
  }

  // verifi
  jwt.verify(token, process.env.JWT_ACCCESS_SECRET, (err, decode) => {
    if(err){
      return res.status(401).send({message: "Unauthorized Access"})
    }
    req.decode = decode;
    next()
  })  
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
    await client.connect();

    // database collection list
    const jobsCollection = client.db("job-portal").collection("jobs-circular");
    const jobsApplicationCollection = client.db("job-portal").collection("jobs-application");


    // JWT token related api
    app.post("/jwt", async (req, res) => {
      const email = req.body.email;
      const token = jwt.sign(email, process.env.JWT_ACCCESS_SECRET, { expiresIn: "1d" });
      // set token inside of the cookies
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,


      })
      res.send({ success: true })
    })


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
    app.get("/jobs/applications", logger, verifyToken, async (req, res) => {
      const email = req.query.email;

      if(email !== req.decode.email){
        return res.status(403).send({message: "Forbidden Access"})
      }


      const query = { hr_email: email };
      const jobs = await jobsCollection.find(query).toArray();
      for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() };
        const application_count = await jobsApplicationCollection.countDocuments(applicationQuery)
        job.application_count = application_count;
      }
      // console.log("Inside serside cookies", req.cookies);
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
    app.get("/applications", async (req, res) => {
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

