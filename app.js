//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const { default: mongoose } = require("mongoose");
const encrypt = require('mongoose-encryption');  //2.DB encryption
require('dotenv').config();
const md5 = require('md5'); //3.hashing algo
const bcrypt = require('bcrypt'); //4.salting + hashing
const saltRounds = 10;
 
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

//mongoDB
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser:true});
const userSchema = new mongoose.Schema({
    email:String,
    password:String
})

///////DB encryption////////
// var secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] }); //will encrypt on calling SAVE, decrypt on calling FIND

const User = new mongoose.model('User', userSchema);

app.get('/',function(req,res){
    res.render('home');
})

app.get('/login',function(req,res){
    res.render('login', {error:""});
})

app.get('/register',function(req,res){
    res.render('register');
})

app.post('/register', function(req,res){

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        newUser.save(function(err){
            if(err){
                console.log(err);
            }else{
                res.render('secrets');
            }
        });
    });
    
});

app.post('/login', function(req,res){
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email:username}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                bcrypt.compare(password, foundUser.password).then (function( result) {
                    if(result==true){
                        res.render('secrets');
                    }else{
                        res.render('login',{ error: "Email or password is incorrect!"});
                    }
                });
                
            }else{
                res.render('login',{ error: "Email or password is incorrect!"});
            }
        }
    })
})



app.listen(3000, function(){
  console.log("server started on port 3000");
});