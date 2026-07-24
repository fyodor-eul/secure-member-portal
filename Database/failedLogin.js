const { Schema, model } = require('mongoose');

const FailedLoginSchema = new Schema(
  {
    // The username that was attempted, may or may not exist
    attemptedName: {
      type: String,
      required: true
    },

    // attempted user's role. user may not exist so, the role can be empty
    attemptedRole: {
      type: String,
    },

    // Why it failed. Server-side only, not disclosed to the client
    reason: {
      type: String,
      enum: ["USER_NOT_FOUND", "ROLE_MISMATCH", "WRONG_PASSWORD"],
      required: true
    },

    // Client's IP seen by Express
    ip: {
      type: String
    },

    // Client's User-Agent seen by Express
    userAgent: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = model("failedLogin", FailedLoginSchema);
