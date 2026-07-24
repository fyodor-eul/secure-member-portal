// Importing Schema and model from mongoose module
const { Schema, model } = require('mongoose');

// Defining the schema for Member
const MemberSchema = new Schema(
  {
    // Name field of the member
    name: {
      type: String,
      required: true
    },
    // Email field of the member
    email: {
      type: String,
      required: true
    },
    // Role(Authorization) field of the member
    role: {
      type: String,
      enum: ["president", "treasurer", "member"]
    },
    // Password(Authentication) field of the member
    password: {
      type: String,
      required: true
    },
    avatar:{
      type: String,
      default: null
    },
  },
  { timestamps: true } // Enable timestamps The schema is configured to automatcally include tmestamp fields (createdAt and updatedAt). 
);

module.exports = model("member", MemberSchema);




