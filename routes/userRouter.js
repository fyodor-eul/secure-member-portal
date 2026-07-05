const router = require('express').Router();
const {
  memberSignup, memberLogin, memberAuth, checkRole
} = require("../Controller/authFunctions");

// Registration
// Member Registration Route (async)
router.post("/register-member", async (req,res) => {
  console.log(`[Register] Member: ${req.body}`);
  await memberSignup(req.body, "member", res);
});

// President Registration Route (async)
router.post("/register-president", async (req, res) => {
  console.log(`[Register] President: ${req.body}`);
  await memberSignup(req.body, "president", res);
});

// Treasurer Registration Route
router.post("/register-treasurer", async (req, res) => {
  console.log(`[Register] Treasurer: ${req.body}`);
  await memberSignup(req.body, "treasurer", res);
})

// Login
// Member Login Route
router.post("/login-member", async (req,res) => {
  console.log(`[Login] Member: ${req.body}`);
  await memberLogin(req.body, "member", res);
});

// President Login Route
router.post("/login-president", async (req,res)=>{
  console.log(`[Login] President: ${req.body}`);
  await memberLogin(req.body, "president", res);
});

// Treasurer Login Route
router.post("/login-treasurer", async(req,res)=>{
  console.log(`[Login] Treasurer: ${req.body}`);
  await memberLogin(req.body, "treasurer", res);
})

// Public Unprotected Route
router.get("/public", (req,res) => {
  return res.status(200).json("Public Domain");
});

// Member Protected Route
router.get("/member-protected", 
  memberAuth,            // to authenticate 
  checkRole(["member"]), // to authorize
  async (req,res) => {
    console.log("--------MEMBER REQ DATA----------");
    console.log(req);
    console.log(req.body);
    return res.json(`welcome ${req.name}`);
  }
);

// President Protected Route
router.get("/president-protected",
  memberAuth,
  checkRole(["president"]),
  async (req, res) => {
    console.log(`president data ${req}`)
    return res.json(`welcome ${req.name}`);
  }
);

// Treasurer Protected Route
router.get("/treasurer-protected",
  memberAuth,
  checkRole(["treasurer"]),
  async (req, res) => {
    console.log(`treasurer data ${req}`)
    return res.json(`welcome ${req.name}`);
  }
);

module.exports = router;

