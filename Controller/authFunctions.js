const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // (authentication) for member login
require('dotenv').config()
const Member = require("../Database/member");

/* Sign up a member (member, president, treasurer) */
const memberSignup = async(req, role, res) => {
  try{
    let nameNotTaken = await validateMemberName(req.name);
    if(!nameNotTaken){
      return res.status(400).json({
        message: `Message is already registered.`
      });
    }

    let emailNotRegistered = await validateEmail(req.email);
    if(!emailNotRegistered){
      return res.status(400).json({
        message: `Email is already registered.`
      });
    }

    const password = await bcrypt.hash(req.password, 12);
    const newMember = new Member ({
      ...req,
      password,
      role
    });

    await newMember.save(); // writes to the database
    return res.status(201).json({
      message: "Hurray! You are now successfully registered. Please login."
    });

  }catch (err){
    return res.status(500).json({
      message: `${err.message}`
    });
  }
};

const validateMemberName = async name => {
  let member = await Member.findOne({ name });
  return member ? false : true;
};

const validateEmail = async email => {
  let member = await Member.findOne({ email });
  return member ? false : true;
};

/* Log in a member (member, president, treasurer) */
const memberLogin = async (req, role, res) => {

  let { name, password } = req;
  // console.log(name, password);
  // setTimeout(() => console.log(name, password), 3000);

  // Check if the username exists
  const member = await Member.findOne({ name });
  //const member = Member.findOne({ name });
  if(!member){
    return res.status(404).json({
      message: "Invalid login credential"
    });
  }
  // It is better to check the email instead and set the username as display name

  // Check role
  if(member.role !== role){
    return res.status(403).json({
      message: "Please make sure you are logging in from the right place"
    });
  }

  // Check password
  let isMatch = await bcrypt.compare(password, member.password);
  if (isMatch) {
    // Sign in the token and issue it to the user
    let token = jwt.sign(
      {
        role: member.role,
        name: member.name,
        email: member.email
      },
      process.env.APP_SECRET,
      { expiresIn: "3 days" }
    );

    // This has technically no effect yet, just showing information
    let result = {
      name: member.name,
      role: member.role,
      email: member.email,
      token: token,
      expiresIn: 72
    };

    return res.status(200).json({
      ...result,
      message: "You are now logged in."
    });
  }else{
    return res.status(403).json({
      message: "Incorrect username or password."
    });
  }
};

// Authentication
const memberAuth = (req, res, next) => {
  console.log(req.headers);
  const authHeader = req.headers['authorization'];
  if(!authHeader) return res.status(401).json({
    message: "Missing Token"
  });

  console.log(authHeader);
  const token = authHeader.split(' ')[1];
  console.log(token)
  jwt.verify(
    token,
    process.env.APP_SECRET,
    (err, decoded) => {
      if(err) return res.status(401).json({
        message: "Wrong Token"
      });
      console.log("-----DECODE------")
      console.log(decoded);  // decoded is a claim(payload)
      console.log(decoded.name);
      req.name = decoded.name;
      next();
    },
  );
};

// Authorization (assumed Authenticated)
const checkRole = roles => async(req, res, next) => {
  let { name } = req;
  const member = await Member.findOne({ name });
  !roles.includes(member.role)
    ? res.status(403).json("Sorry you do not have access to this route")
    : next();
}

module.exports = {
  memberSignup,
  memberLogin,
  memberAuth,
  checkRole
};


