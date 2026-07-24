const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // (authentication) for member login
require('dotenv').config()

const Member = require("../Database/member");
const FailedLogin = require("../Database/failedLogin");

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
      //message: `${err.message}`     // not disclose the error msg
      message: "Error on Server Side"
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

/* Record a failed login attempt. */
const normalizeIp = (ip) => {
  if(!ip) return ip;
  if(ip.startsWith("::ffff:")) return ip.slice(7);
  if(ip === "::1") return "127.0.0.1";
  return ip;
};

const checkForSpike = async (name, ip) => {
  try{
    const windowMs = Number(process.env.SPIKE_WINDOW_MS);
    const since = new Date(Date.now() - windowMs);
    const windowMin = Math.round(windowMs/60000);

    // Target-scoped: many failure against one account
    const accountFails = await FailedLogin.countDocuments({
      attemptedName: name,
      createdAt: { $gte: since }
    });

    if(accountFails >= Number(process.env.SPIKE_THRESHOLD_ACCOUNT)){
      console.warn(
        `[SPIKE] account "${name}" - ${accountFails} failed attempts in ${windowMin} min(s)`
      );
    }

    // Source-scoped: many failures from one address, across any accounts
    if(ip){
      const ipFails = await FailedLogin.countDocuments({
        ip: ip,
        createdAt: { $gte: since }
      });

      if(ipFails >= Number(process.env.SPIKE_THRESHOLD_IP)){
        console.warn(
          `[SPIKE] ip ${ip} - ${ipFails} failed attempts in ${windowMin} min(s)`
        );
      }
    }
  }catch{
    // do not break the logic flow
    console.error("[SPIKE] Failed to run spike check");
  }
};

const logFailedLogin = async (name, role, reason, req) => {
  try{
    const failedLogin = new FailedLogin({
      attemptedName: name || "(none)",
      attemptedRole: role,
      reason: reason,
      ip: normalizeIp(req?.ip),
      userAgent: req?.headers?.["user-agent"]
    });
    await failedLogin.save();
    await checkForSpike(name || "(none)", normalizeIp(req?.ip));
  }catch{
    // logging must never break the login flow
    console.error("[LOG] Failed to write failed-login record");
  }
};

/* Log in a member (member, president, treasurer) */
const memberLogin = async (req, role, res, httpReq) => {

  let { name, password } = req;
  // console.log(name, password);

  // Check if the username exists
  const member = await Member.findOne({ name });
  if(!member){
    // Add log for failed attempt : USER_NOT_FOUND
    await logFailedLogin(name, role, "USER_NOT_FOUND", httpReq);
    // Normally 404 for user not found. but we are not disclosing this information
    return res.status(401).json(INVALID_CREDENTIALS);
  }

  // Check role
  if(member.role !== role){
    // Logging role mismatch
    await logFailedLogin(name, role, "ROLE_MISMATCH", httpReq);
    // Not disclosing the role mismatch to users
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
    await logFailedLogin(name, role, "WRONG_PASSWORD", httpReq);
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


