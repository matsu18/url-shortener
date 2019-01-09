'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
var dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

// this project needs a db !! // 
mongoose.connect(process.env.MONGOLAB_URI, { useMongoClient: true });

// Mongo Schema
var Schema = mongoose.Schema;
var urlSchema = new Schema({
  oUrl: String,
  sUrl: {type:Number,default:0}
});

// Model
var Url = mongoose.model('Url', urlSchema); 

// count of documents
var len;
function checkCount() {
  Url.count({}, (err, data) => {
    len = data;
    console.log("count: "+len);
  });
}

// URL syntax validator
function isUrlValid(url) {
    var res = url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if(res == null)
        return false;
    else
        return true;
}

// add http if missing
function addhttp(url) {
   if (!/^(f|ht)tps?:\/\//i.test(url)) {
      url = "http://" + url;
   }
   return url;
}

app.use(cors());

// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

//  redirect to original url using the short url
app.get("/api/shorturl/:index", function (req, res) {
  Url.findOne({sUrl: req.params.index})
      .then((doc) => {
           if (doc) {
             res.redirect(addhttp(doc.oUrl));
             console.log(doc.oUrl);
           } else {
             res.json({'error': "no data exist for this id"});
             console.log("no data exist for this id");
           }
        })
       .catch((err) => {
         res.json({'error': err});
         console.log(err);
        });
});


// insert new url into the db
app.post("/api/shorturl/new", function(req, res) {
checkCount();
 if (isUrlValid(req.body.url)) {
   var host = req.body.url.replace(/(^\w+:|^)\/\//, '');
    dns.lookup(host, function (err, addresses, family) {
      if (!addresses) {
        res.json({'error': "invalid URL"});
      } else {
         var url = new Url({oUrl:req.body.url, sUrl:len});
         url.save()
            .then(doc => {
            res.json({'original_url': doc.oUrl, 'short_url': doc.sUrl});
            console.log(doc);
           })
           .catch(err => {
            res.json({'error': err});
             console.error("error: "+err);
           })
      }
    });
 } else {
   res.json({'error': "invalid URL"});
 }
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
