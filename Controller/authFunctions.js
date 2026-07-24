const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // (authentication) for member login
require('dotenv').config()
const Member = require("../Database/member");
const INVALID_CREDENTIALS = { message: "Invalid credentials provided." };

/* Sign up a member (member, president, treasurer) */
const memberSignup = async(req, role, res) => {

  /* Input Validation */
  if(!req.name || !req.email || !req.password){
    return res.status(400).json({
      message: "Name, email and password are required"
    });
  }

  try{
    let nameNotTaken = await validateMemberName(req.name);
    if(!nameNotTaken){
      return res.status(400).json({
        message: `Name is already registered.`
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
      name: req.name,
      email: req.email,
      password: password,
      role: role
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

  // Check if the username exists
  const member = await Member.findOne({ name });
  if(!member){
    // Normally 404 for user not found.
    return res.status(401).json(INVALID_CREDENTIALS);
  }

  // Check role
  if(member.role !== role){
    /*
    return res.status(403).json({
      message: "Please make sure you are logging in from the right place"
    });
    */
    return res.status(401).json(INVALID_CREDENTIALS);
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
    return res.status(401).json(INVALID_CREDENTIALS);
  }
};

// Authentication
const memberAuth = (req, res, next) => {
  //console.log(req.headers);
  const authHeader = req.headers['authorization'];
  if(!authHeader) return res.status(401).json({
    message: "Missing Token"
  });

  //console.log(authHeader);
  const token = authHeader.split(' ')[1];
  //console.log(token)
  jwt.verify(
    token,
    process.env.APP_SECRET,
    (err, decoded) => {
      if(err) return res.status(401).json({
        message: "Wrong Token"
      });
      //console.log("DECODED")
      //console.log(decoded);  // decoded is a claim(payload)
      //console.log(decoded.name);

      // pass this request to the next middleware with the added data
      req.name = decoded.name;
      req.role = decoded.role;

      next();
    },
  );
};

// Authorization (assumed Authenticated)
const checkRole = roles => async(req, res, next) => {
  // console.log("--CHECKROLE--");
  // console.log(req.name); // value passed by the previous middleware
  // console.log(req); // the giant one(whole request object)
  /*
  let { name } = req;
  const member = await Member.findOne({ name });
  !roles.includes(member.role)
    ? res.status(403).json({
      message: "Access Denied"
    })
    : next();
  */
  // Instead of checking against the database, check from varified JWT
  if(!req.role || !roles.includes(req.role)){
    return res.status(403).json({
      message: "Access denied"
    });
  }
  next();
}

module.exports = {
  memberSignup,
  memberLogin,
  memberAuth,
  checkRole
};


