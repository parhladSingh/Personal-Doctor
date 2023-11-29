const express = require("express")
const hbs = require("hbs")
const app = express()

const OpenAI = require('openai')
const openai = new OpenAI({
  apiKey: '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',
});

const mongoose = require("mongoose")

const routes = require('./routes/main')

app.use('/static',express.static("public"))
app.use('',routes)

app.set('view engine','hbs')
app.set('views','views')
hbs.registerPartials("views/partials")

require('dotenv').config()

// mongodb connection
mongoose.connect(process.env.MONGO_URL).then(() => { 
  console.log("Database connected...");
}).catch((e) => {
  console.error("Error connecting to MongoDB:", e);
});

const { json } = require("body-parser")
const feedback = require("./models/feedback")
const patient = require("./models/patients")
const application = require("./models/applications")
const booking = require("./models/bookings")
const doctor = mongoose.connection.collection('doctors');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/feedback",async (req,res)=>{
  try {
    const feedbackadding = new feedback({
      userName: req.body.Username,
      phoneNo: req.body.Phone,
      description: req.body.description
    });

    await feedbackadding.save();
    res.status(201).render("index");

  } catch (error) {
    res.status(400).send(error);
  }
})
app.post("/patient",async (req,res)=>{
  try {
    const details = await patient.findOne({userName:req.body.Username})

    if (details) {
      res.status(409).send("Username already exists");
    } 
    else{
      const patientadding = new patient({
        userName: req.body.Username,
        phoneNo: req.body.Phone,
        email: req.body.Email,
        password: req.body.Password,
        rating: 5.0,
        totalCalls: 0
      });
  
      await patientadding.save();
      res.status(201).redirect("/patientLogin");
    }

  } catch (error) {
    res.status(400).send(error);
  }
})
app.post("/application",async (req,res)=>{
  try {
    const applicationadding = new application({
      yourName: req.body.Name,
      speciality: req.body.Speciality,
      phoneNo: req.body.Phone,
      email: req.body.Email,
      vision: req.body.Vision, 
      education: req.body.Education
    });

    await applicationadding.save();
    res.status(201).render("index");

  } catch (error) {
    res.status(400).send(error);
  }
})
app.post("/booking",async (req,res)=>{
  try {
    const bookingadding = new booking({
      userName: req.body.username,
      phoneNo: req.body.Phone,
      email: req.body.email,
      docUserName: req.body.nameOfDoctor,
      date: req.body.date,
      time: req.body.time,
      description: req.body.description,
      isAccepted: "undefined"
    });

    await bookingadding.save();
    res.status(201).render("index");

  } catch (error) {
    res.status(400).send(error);
  }
})
app.post("/patientLogin", async (req,res)=>{
  try {
    const username = req.body.Username
    const password = req.body.Password

    const data = await patient.findOne({userName:username})
    if(data.password == password){
      res.status(201).render("index",{data:data})
    } else{
      res.send("Password is not matching...")
    }
  } catch (error) {
    res.status(400).send("Invalid credentials...");
  }
})
app.post("/doctorLogin", async (req,res)=>{
  try {
    const usernameDoc = req.body.Username
    const passwordDoc = req.body.Password

    const dataDoctor = await doctor.findOne({username:usernameDoc})
    if(dataDoctor.password == passwordDoc){
      res.status(201).render("index",{dataDoctor:dataDoctor})
    } else{
      res.send("Password is not matching...")
    }
  } catch (error) {
    res.status(400).send("Invalid credentials...");
  }
})

app.post("/drugUses", async (req, res) => {
  const drugName = req.body.drugName;
  const capitalizedDrugName = drugName.charAt(0).toUpperCase() + drugName.slice(1);

  const prompt = "Uses of " + capitalizedDrugName;
  const gptPrompt =
    "write uses of " + capitalizedDrugName + " in 50 words. -- generate in paragraph -- remember this is a medicine name";

  const chatResponse = await openai.chat.completions.create({
    messages: [{ role: 'user', content: gptPrompt }],
    model: 'gpt-3.5-turbo',
    // max_tokens: 50
  });

  const ans = chatResponse.choices[0].message.content;
  res.render("drugUses", { ans, prompt });
});

app.get('/submitRating/:ratingCount/:userName',async (req,res)=>{
  const count = req.params.ratingCount
  const username = req.params.userName
  const data = await patient.findOne({userName:username})
  if (data) {
    var ratingCount = (parseFloat(data.rating) + parseInt(count))/2 
    const updatedPatient = await patient.findOneAndUpdate(
      { userName: username },
      { $inc: { totalCalls: 1 }, $set: { rating: ratingCount } },
      { new: true }
    );
    if (updatedPatient) {
      res.render("index") 
    }
  } else{
    const dataDoc = await doctor.findOne({username:username})
    var ratingCount = (parseFloat(dataDoc.rating) + parseInt(count))/2 
    const updatedDoc = await doctor.findOneAndUpdate(
      { username: username },
      { $inc: { totalCalls: 1 }, $set: { rating: ratingCount } },
      { new: true }
    );
    if (updatedDoc) {
      res.render("index") 
    }    
  }
})

require('./routes/helpers');

const PORT = process.env.PORT || 8089;
app.listen(PORT, ()=>{
    console.log(`server is responding at http://localhost:${PORT}/`)
})