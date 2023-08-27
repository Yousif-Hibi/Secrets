//jshint esversion:6
require('dotenv').config();
const express  = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));


app.use(session({
    secret:"thisIsALittleSecret.",
    resave: false,
    saveUninitialized:false
}));



app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB",{useNewUrlParser: true});

userSchema =new mongoose.Schema({
email: String,
password: String,
googleId : String,
secret : String
});

userSchema.plugin(passportLocalMongoose);
  
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    done(null, id);
})
passport.use(new GoogleStrategy({
    clientID: process.env.Client_ID,
    clientSecret: process.env.Client_secret,
    callbackURL: "http://localhost:3000/auth/google/secret",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" 
},
    function (accessToken, refreshToken, profile, cb) {
      
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/",function(req,res){
  res.render("home");  
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});


app.get("/logout",function(req,res){

    req.logout((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
   
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secret',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        User.find({ "secret": { $ne: null } })
            .then(function (foundUser) {
                res.render("secrets", { usersWithSecrets: foundUser });
            })
            .catch(function (err) {
                console.log(err);
            })

    });
app.get("/submit",function(req,res){

if(req.isAuthenticated()){
    res.render("submit");
}
else{
    res.redirect("/login");
}


})



app.post("/register", function (req, res) {

   

    User.register({ username: req.body.username, active: false }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.render("/secrets");
            })
        }

});
 

    
});

app.post("/login",function(req,res){
    const user = new User({
        username : req.body.username,
         password : req.body.password

    })
    req.login(user, function (err) {
        if (err) { console.log(err); }
       else{
            passport.authenticate("local")(req, res, function () {
                res.render("/secrets");
            })
       }
    });

});

app.post("/submit",function(req,res){

const submittedSecret =req.body.secret;

User.findById(req.user).then(function(foundUser){

   
     
            foundUser.secret = submittedSecret;
            foundUser.save();
            res.redirect("secrets");
            
        

});

});












app.listen(3000,function(){
    console.log("Server started on port 3000");
});