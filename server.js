require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const validator = require("validator");
const mongoose = require("mongoose");
const { Schema } = mongoose;

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

// mongo config
const urlSchema = new Schema({
  url: String,
  nr: Number,
});

const Url = mongoose.model("Url", urlSchema, "urls");

mongoose.connect(
  process.env.DB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  function (err, db) {
    if (err) throw err;
    return db;
  }
);

var db = mongoose.connection;

var createAndSave = function (done) {
  var url0 = new Url({
    url: "https://www.duckduckgo.com",
    nr: 0,
  });
  url0.save
    .then((data) => {
      return data;
    })
    .catch((err) => {
      console.log(err);
    });
};

// parse application/json
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({
    greeting: "hello API",
  });
});

app.post("/api/shorturl", function (req, res) {
  if (
    validator.isURL(req.body.url, {
      require_protocol: true,
      protocols: ["http", "https"],
    })
  ) {
    Url.find()
      .sort({
        nr: -1,
      })
      .limit(1)
      .then((nr) => {
        let largest = nr[0].nr;
        new Url({
          url: req.body.url,
          nr: largest + 1,
        })
          .save()
          .then((data) => {
            res.json({
              original_url: req.body.url,
              short_url: largest + 1,
            });
          })
          .catch((err) => {
            console.log(err);
          });
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    res.json({
      error: "invalid url",
    });
  }
});

app.get("/api/shorturl/:no", function (req, res) {
  if (validator.isInt(req.params.no)) {
    Url.find({ nr: req.params.no })
      .then((result) => {
        var redirect = result[0].url;
        res.redirect(redirect);
      })
      .catch((err) => {
        console.log(err);
        res.json({
          error: "No short URL found for the given input",
        });
      });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
