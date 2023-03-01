//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const { default: mongoose } = require("mongoose");
require('dotenv').config();
// const encrypt = require('mongoose-encryption');  //2.DB encryption
// const md5 = require('md5'); //3.hashing algo
// const bcrypt = require('bcrypt'); //4.salting + hashing
// const saltRounds = 10;

//5.1 cookies and session using passport
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

//6.1 oauth
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate'); //6.3- to make findorcreate in 6.2 work

 
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

//5.2
app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true
}));

app.use(passport.initialize());
app.use(passport.session());

//mongoDB
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser:true});

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId: {type:String, unique:true},
    secret: Array
})

///////DB encryption////////
// var secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] }); //will encrypt on calling SAVE, decrypt on calling FIND

//5.3
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); //6.4


const User = new mongoose.model('User', userSchema);

//5.4
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
   
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err,user){
        done(err,user);
    })
  });

//6.2
// passport.use(new GoogleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/anonymo"
//   },
//   function(accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID_TWO,
    clientSecret: process.env.CLIENT_SECRET_TWO,
    callbackURL: "https://anonymo.cyclic.app/auth/google/anonymo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/',function(req,res){
    res.render('home');
})

app.get('/login',function(req,res){
    res.render('login', {error:""});
})

app.get('/register',function(req,res){
    res.render('register');
})

app.get('/secrets',function(req,res){
    User.find({'secret':{$ne:null}}, function(err,users){
        if(!err){
            if(users){
                res.render('secrets',{theSecrets:users});
            }else{
                console.log(err);
            }
        }else{
            console.log(err);
        }
    })    
})

app.get('/submit', function(req,res){
    //to not display secrets page when back btn is pressed after logout
    // res.set(
    //     'Cache-Control', 
    //     'no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0'
    // );
    if(req.isAuthenticated()){
        res.render('submit');  //if user logged in
    }else{
        res.redirect('/login'); //if not logged in
    }
})

//5.7
app.get('/logout', function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
    });
    res.redirect('/');
})


//6.4
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/anonymo', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });



app.post('/submit', function(req,res){
    // console.log(submittedSecret);
    // console.log(req.user);
    if(req.isAuthenticated()){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            }else{
                if(foundUser){
                    foundUser.secret.push(req.body.secret);
                    foundUser.save(function(){
                        res.redirect('/secrets');
                    });
                }
            }
        })
    }else{
        res.redirect('/login');
    }
    
})


app.post('/register', function(req,res){

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });
    //     newUser.save(function(err){
    //         if(err){
    //             console.log(err);
    //         }else{
    //             res.render('secrets');
    //         }
    //     });
    // });

    ///// 5.5 - using passport-local-mongoose - automatically salts and hashes //////
    User.register({username:req.body.username},req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect('/register');
        }else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            })
        }
    })
    
});

// app.post('/login', function(req,res){
//     // const username = req.body.username;
//     // const password = req.body.password;

//     // User.findOne({email:username}, function(err, foundUser){
//     //     if(err){
//     //         console.log(err);
//     //     }else{
//     //         if(foundUser){
//     //             bcrypt.compare(password, foundUser.password).then (function( result) {
//     //                 if(result==true){
//     //                     res.render('secrets');
//     //                 }else{
//     //                     res.render('login',{ error: "Email or password is incorrect!"});
//     //                 }
//     //             });
                
//     //         }else{
//     //             res.render('login',{ error: "Email or password is incorrect!"});
//     //         }
//     //     }
//     // })

//     ////5.6 - using passport's login function////
//     const newUser = new User({
//         username: req.body.username,
//         password:req.body.password
//     });
//     req.login(newUser, function(err){
//         if(err){
//             console.log(err);
//         }else{
//             passport.authenticate('local')(req,res,function(){
//                 res.redirect('/secrets');
//             })
//         }
//     })
// })

//5.6
app.post('/login', passport.authenticate('local',{
    successRedirect:'/secrets',
    failureRedirect:'/login',
}));



app.listen(3000, function(){
  console.log("server started on port 3000");
});