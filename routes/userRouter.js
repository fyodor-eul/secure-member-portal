const { upload, handleUploadError } = require("../Middleware/uploadHandler");

const fs = require("fs");
const path = require("path");

const Member = require("../Database/member");
const FailedLogin = require("../Database/failedLogin")

const router = require('express').Router();
const {
  memberSignup, memberLogin, memberAuth, checkRole
} = require("../Controller/authFunctions");

// Registration
// Member Registration Route (async)
router.post("/register-member", async (req,res) => {
  //console.log(`[Register] Member: ${req.body}`);
  await memberSignup(req.body, "member", res);
});

// President Registration Route (async)
router.post("/register-president", async (req, res) => {
  //console.log(`[Register] President: ${req.body}`);
  await memberSignup(req.body, "president", res);
});

// Treasurer Registration Route
router.post("/register-treasurer", async (req, res) => {
  //console.log(`[Register] Treasurer: ${req.body}`);
  await memberSignup(req.body, "treasurer", res);
})

// Login
// Member Login Route
router.post("/login-member", async (req,res) => {
  //console.log(`[Login] Member: ${req.body}`);
  await memberLogin(req.body, "member", res, req);
});

// President Login Route
router.post("/login-president", async (req,res)=>{
  //console.log(`[Login] President: ${req.body}`);
  await memberLogin(req.body, "president", res, req);
});

// Treasurer Login Route
router.post("/login-treasurer", async(req,res)=>{
  //console.log(`[Login] Treasurer: ${req.body}`);
  await memberLogin(req.body, "treasurer", res, req);
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
    //console.log("--------MEMBER REQ DATA----------");
    //console.log(req);
    //console.log(req.body);
    //return res.json(`welcome ${req.name}`);
    return res.status(200).json({
      username: req.name,
      role: req.role
    });
  }
);

// Profile Upload
router.post("/member-upload-photo",
  memberAuth,
  checkRole(["member"]),
  upload.single("avatar"),
  handleUploadError,
  async (req, res) => {
    if(!req.file){
      return res.status(400).json({ message: "No file uploaded" });
    }
    //console.log("req.name =", req.name);
    //console.log("req.file =", req.file?.filename);
    const member = await Member.findOne({name: req.name});
    //console.log("member found =", !!member);

    if(!member){
      fs.unlinkSync(req.file.path); // remove the file
      return res.status(404).json({ message: "Member not found." });
    }

    // Delete the previous photo
    if(member.avatar){
      const oldPath = path.join(__dirname, "..", "uploads", member.avatar);
      if(fs.existsSync(oldPath)){
        fs.unlinkSync(oldPath);
      }
    }

    member.avatar = req.file.filename;
    await member.save();

    return res.status(200).json({
      message: "Upload Successful.",
      filename: req.file.filename,
      size: req.file.size
    });
  }
);

// View Profile Image
router.get("/my-photo",
  memberAuth,
  checkRole(["member"]),
  async (req,res) => {
    const member = await Member.findOne({ name: req.name });

    if(!member || !member.avatar){
      return res.status(404).json({ message: "No Photo Uploaded" });
    }

    const filePath = path.join(__dirname, "..", "uploads", member.avatar);
    if(!fs.existsSync(filePath)){
      return res.status(404).json({ message: "Photo Not Found" });
    }

    return res.sendFile(filePath);
  }
)

// President Protected Route
router.get("/president-protected",
  memberAuth,
  checkRole(["president"]),
  async (req, res) => {
    //console.log(`president data ${req}`)
    return res.json(`welcome ${req.name}`);
  }
);

// President only: View Failed Login Attempts
/*
router.get("/failed-logins",
  memberAuth,
  checkRole(["president"]),
  async(req, res)=>{
    const logs = await FailedLogin.find().sort({ createdAt: -1 }).limit(50);
    //console.log(logs);
    return res.status(200).json({ logs });
  }
)
*/
router.get("/failed-logins",
  memberAuth,
  checkRole(["president"]),
  async(req, res)=>{
    const logs = await FailedLogin.find().sort({ createdAt: -1 }).limit(50);

    const windowMs = Number(process.env.SPIKE_WINDOW_MS);
    const since = new Date(Date.now() - windowMs);

    const byAccount = await FailedLogin.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$attemptedName", count: { $sum: 1 } } },
      { $match: { count: { $gte: Number(process.env.SPIKE_THRESHOLD_ACCOUNT) } } }
    ]);

    const byIp = await FailedLogin.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$ip", count: { $sum: 1 } } },
      { $match: { count: { $gte: Number(process.env.SPIKE_THRESHOLD_IP) } } }
    ]);

    return res.status(200).json({
      logs,
      alerts:{
        accounts: byAccount.map(a => ({ name: a._id, count: a.count })),
        ips: byIp.map(a => ({ ip: a._id, count: a.count })),
        windowMinutes: Math.round(windowMs / 60000)
      }
    });
  }
);

// Treasurer Protected Route
router.get("/treasurer-protected",
  memberAuth,
  checkRole(["treasurer"]),
  async (req, res) => {
    //console.log(`treasurer data ${req}`)
    return res.json(`welcome ${req.name}`);
  }
);

module.exports = router;

