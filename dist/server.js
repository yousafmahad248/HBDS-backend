var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// models/BloodRequest.js
var require_BloodRequest = __commonJS({
  "models/BloodRequest.js"(exports2, module2) {
    var mongoose2 = require("mongoose");
    var bloodRequestSchema = new mongoose2.Schema({
      hospitalId: { type: mongoose2.Schema.Types.ObjectId, ref: "Hospital", required: true },
      hospitalName: { type: String, required: true },
      location: { type: String, required: true },
      latitude: { type: Number },
      longitude: { type: Number },
      patientName: { type: String, required: true },
      bloodGroup: { type: String, required: true },
      units: { type: Number, required: true },
      urgency: { type: String, enum: ["Critical", "High", "Normal"], default: "Normal" },
      description: { type: String },
      status: { type: String, enum: ["Open", "Fulfilled", "Closed"], default: "Open" },
      targetAudience: { type: String, enum: ["Hospitals", "Donors"], default: "Hospitals" },
      alertedHospitals: [{
        hospitalId: { type: mongoose2.Schema.Types.ObjectId, ref: "Hospital" },
        status: { type: String, enum: ["Pending", "Declined"], default: "Pending" }
      }],
      acceptedBy: { type: mongoose2.Schema.Types.ObjectId, ref: "User" }
    }, { timestamps: true });
    module2.exports = mongoose2.model("BloodRequest", bloodRequestSchema);
  }
});

// models/Hospital.js
var require_Hospital = __commonJS({
  "models/Hospital.js"(exports2, module2) {
    var mongoose2 = require("mongoose");
    var hospitalSchema = new mongoose2.Schema({
      hospitalName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      phone: { type: String },
      website: { type: String },
      location: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      profilePicture: { type: String },
      resetPasswordOTP: { type: String },
      resetPasswordExpires: { type: Date },
      // GeoJSON for high-performance location searches
      locationPoint: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [73.0479, 33.6844] }
        // [longitude, latitude]
      }
    }, { timestamps: true });
    hospitalSchema.index({ locationPoint: "2dsphere" });
    module2.exports = mongoose2.model("Hospital", hospitalSchema);
  }
});

// models/User.js
var require_User = __commonJS({
  "models/User.js"(exports2, module2) {
    var mongoose2 = require("mongoose");
    var userSchema = new mongoose2.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      gender: { type: String, enum: ["Male", "Female"] },
      phone: { type: String },
      role: { type: String, enum: ["donor", "normal"], default: "donor" },
      bloodGroup: { type: String },
      location: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      profilePicture: { type: String },
      lastDonationDate: { type: Date },
      // CNIC: 13-digit national identity card number (stored as string to preserve leading zeros)
      cnic: { type: String },
      // Blood Report: base64-encoded image/document uploaded by the donor during registration
      bloodReport: { type: String },
      resetPasswordOTP: { type: String },
      resetPasswordExpires: { type: Date },
      // GeoJSON for high-performance location searches
      locationPoint: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: [73.0479, 33.6844] }
        // [longitude, latitude]
      }
    }, { timestamps: true });
    userSchema.index({ locationPoint: "2dsphere" });
    module2.exports = mongoose2.model("User", userSchema);
  }
});

// utils/emailService.js
var require_emailService = __commonJS({
  "utils/emailService.js"(exports2, module2) {
    var nodemailer = require("nodemailer");
    var sendEmail = async (options) => {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("\n======================================================");
        console.log("\u26A0\uFE0F SIMULATED EMAIL (No credentials found in .env) \u26A0\uFE0F");
        console.log("======================================================");
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: 
${options.message}`);
        console.log("======================================================\n");
        return Promise.resolve();
      }
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      const mailOptions = {
        from: `"HBDS Admin" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
      };
      await transporter.sendMail(mailOptions);
    };
    module2.exports = sendEmail;
  }
});

// models/Notification.js
var require_Notification = __commonJS({
  "models/Notification.js"(exports2, module2) {
    var mongoose2 = require("mongoose");
    var notificationSchema = new mongoose2.Schema({
      recipient: {
        type: mongoose2.Schema.Types.ObjectId,
        required: true,
        refPath: "recipientModel"
      },
      recipientModel: {
        type: String,
        required: true,
        enum: ["User", "Hospital"]
      },
      title: { type: String, required: true },
      message: { type: String, required: true },
      type: {
        type: String,
        enum: ["BLOOD_REQUEST", "REQUEST_ACCEPTED", "REQUEST_ESCALATED", "SYSTEM"],
        required: true
      },
      relatedId: { type: mongoose2.Schema.Types.ObjectId },
      // e.g. BloodRequest ID
      isRead: { type: Boolean, default: false }
    }, { timestamps: true });
    module2.exports = mongoose2.model("Notification", notificationSchema);
  }
});

// controllers/notificationController.js
var require_notificationController = __commonJS({
  "controllers/notificationController.js"(exports2) {
    var Notification = require_Notification();
    exports2.getNotifications = async (req, res) => {
      try {
        const recipientId = req.user.id;
        const recipientModel = req.user.role === "hospital" ? "Hospital" : "User";
        const notifications = await Notification.find({
          recipient: recipientId,
          recipientModel
        }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error fetching notifications" });
      }
    };
    exports2.markAsRead = async (req, res) => {
      try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
          return res.status(404).json({ message: "Notification not found" });
        }
        if (notification.recipient.toString() !== req.user.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }
        notification.isRead = true;
        await notification.save();
        res.status(200).json(notification);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server error" });
      }
    };
    exports2.markAllAsRead = async (req, res) => {
      try {
        const recipientId = req.user.id;
        const recipientModel = req.user.role === "hospital" ? "Hospital" : "User";
        await Notification.updateMany(
          { recipient: recipientId, recipientModel, isRead: false },
          { isRead: true }
        );
        res.status(200).json({ message: "All notifications marked as read" });
      } catch (error) {
        console.error("Error marking all as read:", error);
        res.status(500).json({ message: "Server error" });
      }
    };
    exports2.createNotification = async (data) => {
      try {
        const notification = new Notification(data);
        await notification.save();
        return notification;
      } catch (error) {
        console.error("Error creating internal notification:", error);
      }
    };
  }
});

// controllers/requestController.js
var require_requestController = __commonJS({
  "controllers/requestController.js"(exports2) {
    var BloodRequest = require_BloodRequest();
    var Hospital = require_Hospital();
    var User = require_User();
    var { getDistance } = require("geolib");
    var sendEmail = require_emailService();
    var { createNotification } = require_notificationController();
    exports2.createRequest = async (req, res) => {
      try {
        const { patientName, bloodGroup, units, urgency, description } = req.body;
        const hospitalId = req.user.id;
        if (req.user.role !== "hospital") {
          return res.status(403).json({ msg: "Only hospitals can create blood requests" });
        }
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
          return res.status(404).json({ msg: "Hospital not found" });
        }
        const nearbyHospitals = await Hospital.find({
          _id: { $ne: hospitalId },
          locationPoint: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [hospital.longitude || 73.0479, hospital.latitude || 33.6844]
              },
              $maxDistance: 15e3
              // 15 km in meters
            }
          }
        });
        const alertedHospitals = nearbyHospitals.map((h) => ({
          hospitalId: h._id,
          status: "Pending"
        }));
        const newRequest = await BloodRequest.create({
          hospitalId,
          hospitalName: hospital.hospitalName,
          location: hospital.location || "Unknown Location",
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          patientName,
          bloodGroup,
          units,
          urgency: urgency || "Normal",
          description,
          targetAudience: "Hospitals",
          alertedHospitals,
          status: "Open"
        });
        for (const h of nearbyHospitals) {
          await sendEmail({
            email: h.email,
            subject: "URGENT: Blood Request from Nearby Hospital",
            message: `${hospital.hospitalName} is urgently requesting ${units} units of ${bloodGroup} blood. Please log into the app to accept or decline this request.`
          }).catch((err) => console.log("Email send error:", err));
          await createNotification({
            recipient: h._id,
            recipientModel: "Hospital",
            title: "New Blood Request Nearby",
            message: `${hospital.hospitalName} is requesting ${units} units of ${bloodGroup} blood.`,
            type: "BLOOD_REQUEST",
            relatedId: newRequest._id
          });
        }
        res.status(201).json(newRequest);
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.getAllRequests = async (req, res) => {
      try {
        const filters = { status: "Open" };
        if (req.query.bloodGroup) {
          filters.bloodGroup = req.query.bloodGroup;
        }
        if (req.user.role === "hospital") {
          filters.targetAudience = "Hospitals";
          filters.$or = [
            { hospitalId: req.user.id },
            { "alertedHospitals.hospitalId": req.user.id, "alertedHospitals.status": "Pending" }
          ];
        } else {
          filters.targetAudience = "Donors";
        }
        const requests = await BloodRequest.find(filters).sort({ createdAt: -1 });
        res.status(200).json(requests);
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.getMyRequests = async (req, res) => {
      try {
        const requests = await BloodRequest.find({ hospitalId: req.user.id }).sort({ createdAt: -1 }).populate("acceptedBy", "name phone email location cnic bloodReport");
        res.status(200).json(requests);
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.acceptRequest = async (req, res) => {
      try {
        const requestId = req.params.id;
        const request = await BloodRequest.findById(requestId);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        if (req.user.role !== "hospital") {
          const donor = await User.findById(req.user.id);
          if (donor) {
            if (donor.lastDonationDate) {
              const diffTime = (/* @__PURE__ */ new Date()).getTime() - new Date(donor.lastDonationDate).getTime();
              const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
              if (diffDays < 90) {
                const remainingDays = 90 - diffDays;
                return res.status(400).json({
                  msg: "You cannot donate blood for 3 months",
                  remainingDays
                });
              }
            }
            donor.lastDonationDate = /* @__PURE__ */ new Date();
            await donor.save();
          }
        }
        request.status = "Fulfilled";
        request.acceptedBy = req.user.id;
        await request.save();
        const requesterHospital = await Hospital.findById(request.hospitalId);
        if (requesterHospital) {
          if (req.user.role === "hospital") {
            const acceptorHospital = await Hospital.findById(req.user.id);
            if (acceptorHospital) {
              await sendEmail({
                email: requesterHospital.email,
                subject: "Blood Request Accepted!",
                message: `Great news! ${acceptorHospital.hospitalName} has accepted your blood request for ${request.bloodGroup} (${request.units} units). Please coordinate with them for the transfer. You can contact them at: ${acceptorHospital.phone || "their registered number"}.`
              }).catch((err) => console.log("Acceptance email error:", err));
            }
          } else {
            const acceptorDonor = await User.findById(req.user.id);
            if (acceptorDonor) {
              await sendEmail({
                email: requesterHospital.email,
                subject: "Blood Request Accepted by a Donor!",
                message: `Great news! A donor named ${acceptorDonor.name} has accepted your blood request for ${request.bloodGroup} (${request.units} units).

Donor Details:
Name: ${acceptorDonor.name}
Phone: ${acceptorDonor.phone || "Not provided"}
Email: ${acceptorDonor.email}
Location: ${acceptorDonor.location || "Not provided"}

Please coordinate with them for the blood donation.`
              }).catch((err) => console.log("Acceptance email error:", err));
              await createNotification({
                recipient: request.hospitalId,
                recipientModel: "Hospital",
                title: "Blood Request Accepted",
                message: `A donor named ${acceptorDonor.name} has accepted your request for ${request.bloodGroup} blood.`,
                type: "REQUEST_ACCEPTED",
                relatedId: request._id
              });
            }
          }
        }
        res.status(200).json({ msg: "Request accepted successfully." });
        notifyOtherParties(request, req.user.id);
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.declineRequest = async (req, res) => {
      try {
        if (req.user.role !== "hospital") {
          return res.status(403).json({ msg: "Only hospitals can decline hospital-targeted requests" });
        }
        const requestId = req.params.id;
        const request = await BloodRequest.findById(requestId);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        const alertedIndex = request.alertedHospitals.findIndex((a) => a.hospitalId.toString() === req.user.id);
        if (alertedIndex > -1) {
          request.alertedHospitals[alertedIndex].status = "Declined";
        }
        const allDeclined = request.alertedHospitals.every((a) => a.status === "Declined");
        if (allDeclined && request.alertedHospitals.length > 0 && request.targetAudience === "Hospitals") {
          request.targetAudience = "Donors";
          await exports2.escalateToDonors(request);
        }
        await request.save();
        res.status(200).json({ msg: "Request declined." });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.escalateToDonors = async (request) => {
      const nearbyDonors = await User.find({
        role: "donor",
        locationPoint: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [request.longitude || 73.0479, request.latitude || 33.6844]
            },
            $maxDistance: 15e3
          }
        }
      });
      for (const donor of nearbyDonors) {
        await sendEmail({
          email: donor.email,
          subject: "URGENT: Blood Donation Needed Nearby",
          message: `${request.hospitalName} urgently requires ${request.units} units of ${request.bloodGroup} blood. Since no other hospitals could fulfill it, we are asking donors like you. Please check the app.`
        }).catch((err) => console.log("Email send error:", err));
        await createNotification({
          recipient: donor._id,
          recipientModel: "User",
          title: "Urgent Blood Needed",
          message: `${request.hospitalName} urgently requires ${request.bloodGroup} blood.`,
          type: "REQUEST_ESCALATED",
          relatedId: request._id
        });
      }
    };
    exports2.updateRequest = async (req, res) => {
      try {
        const { patientName, bloodGroup, units, urgency, description } = req.body;
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        if (request.hospitalId.toString() !== req.user.id) {
          return res.status(403).json({ msg: "Not authorized to update this request" });
        }
        request.patientName = patientName || request.patientName;
        request.bloodGroup = bloodGroup || request.bloodGroup;
        request.units = units || request.units;
        request.urgency = urgency || request.urgency;
        request.description = description || request.description;
        await request.save();
        res.status(200).json(request);
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.deleteRequest = async (req, res) => {
      try {
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ msg: "Request not found" });
        if (request.hospitalId.toString() !== req.user.id) {
          return res.status(403).json({ msg: "Not authorized to delete this request" });
        }
        await BloodRequest.findByIdAndDelete(req.params.id);
        res.status(200).json({ msg: "Request deleted successfully" });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    var notifyOtherParties = async (request, acceptorId) => {
      try {
        const recipients = [];
        for (const alerted of request.alertedHospitals) {
          if (alerted.hospitalId.toString() !== acceptorId.toString()) {
            const h = await Hospital.findById(alerted.hospitalId);
            if (h) recipients.push(h.email);
          }
        }
        const nearbyDonors = await User.find({
          role: "donor",
          _id: { $ne: acceptorId },
          locationPoint: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [request.longitude || 73.0479, request.latitude || 33.6844]
              },
              $maxDistance: 15e3
            }
          }
        });
        for (const d of nearbyDonors) {
          recipients.push(d.email);
        }
        const uniqueRecipients = [...new Set(recipients)];
        for (const email of uniqueRecipients) {
          await sendEmail({
            email,
            subject: "Update: Blood Request Fulfilled",
            message: `The blood request for ${request.bloodGroup} blood at ${request.hospitalName} has been successfully fulfilled. Thank you for your willingness to help! The request is now closed as a donor/hospital is available.`
          }).catch((err) => console.log("Notification email error:", err));
        }
      } catch (error) {
        console.error("Error in notifyOtherParties:", error);
      }
    };
  }
});

// utils/cronJobs.js
var require_cronJobs = __commonJS({
  "utils/cronJobs.js"(exports2, module2) {
    var cron = require("node-cron");
    var BloodRequest = require_BloodRequest();
    var { escalateToDonors } = require_requestController();
    var startCronJobs2 = () => {
      cron.schedule("*/15 * * * *", async () => {
        try {
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1e3);
          const pendingRequests = await BloodRequest.find({
            targetAudience: "Hospitals",
            status: "Open",
            createdAt: { $lte: twoHoursAgo }
          });
          for (const request of pendingRequests) {
            request.targetAudience = "Donors";
            await request.save();
            await escalateToDonors(request);
            console.log(`Cron escalated request ${request._id} to donors due to 2 hour timeout.`);
          }
        } catch (error) {
          console.error("Cron Job Error:", error);
        }
      });
    };
    module2.exports = startCronJobs2;
  }
});

// controllers/authController.js
var require_authController = __commonJS({
  "controllers/authController.js"(exports2) {
    var User = require_User();
    var Hospital = require_Hospital();
    var bcrypt = require("bcryptjs");
    var jwt = require("jsonwebtoken");
    var sendEmail = require_emailService();
    var crypto = require("crypto");
    var generateToken = (id, role) => {
      return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: "30d"
      });
    };
    exports2.registerUser = async (req, res) => {
      try {
        const { name, email, password, gender, role, bloodGroup, location, latitude, longitude, phone, profilePicture, cnic, bloodReport } = req.body;
        let userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ msg: "User already exists" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
          name,
          email,
          password: hashedPassword,
          gender,
          role: role || "donor",
          bloodGroup,
          location,
          latitude,
          longitude,
          phone,
          profilePicture,
          cnic,
          bloodReport,
          locationPoint: {
            type: "Point",
            coordinates: [longitude || 73.0479, latitude || 33.6844]
          }
        });
        res.status(201).json({
          token: generateToken(user._id, user.role),
          user: { id: user._id, name: user.name, email: user.email, role: user.role },
          msg: "Registration successful"
        });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.registerHospital = async (req, res) => {
      try {
        const { hospitalName, email, password, address, latitude, longitude, phone, website, profilePicture } = req.body;
        let hospitalExists = await Hospital.findOne({ email });
        if (hospitalExists) return res.status(400).json({ msg: "Hospital already exists" });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hospital = await Hospital.create({
          hospitalName,
          email,
          password: hashedPassword,
          location: address,
          latitude,
          longitude,
          phone,
          website,
          profilePicture,
          locationPoint: {
            type: "Point",
            coordinates: [longitude || 73.0479, latitude || 33.6844]
          }
        });
        res.status(201).json({
          token: generateToken(hospital._id, "hospital"),
          hospital: { id: hospital._id, hospitalName: hospital.hospitalName, email: hospital.email },
          msg: "Hospital registration successful"
        });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.login = async (req, res) => {
      try {
        const { email, password, role } = req.body;
        let account;
        let authRole;
        if (role === "hospital") {
          account = await Hospital.findOne({ email });
          authRole = "hospital";
        } else {
          account = await User.findOne({ email });
          authRole = account ? account.role : "donor";
        }
        if (!account) return res.status(400).json({ msg: "Invalid credentials" });
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });
        res.json({
          token: generateToken(account._id, authRole),
          role: authRole,
          msg: "Login successful"
        });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.getMe = async (req, res) => {
      try {
        const { id, role } = req.user;
        if (role === "hospital") {
          const hospital = await Hospital.findById(id).select("-password");
          if (!hospital) return res.status(404).json({ msg: "Hospital not found" });
          res.json(hospital);
        } else {
          const user = await User.findById(id).select("-password");
          if (!user) return res.status(404).json({ msg: "User not found" });
          res.json(user);
        }
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.updateProfile = async (req, res) => {
      try {
        const { name, hospitalName, email, phone, bloodGroup, location, latitude, longitude, profilePicture, password, website } = req.body;
        const userId = req.user.id;
        if (req.user.role === "hospital") {
          const hospital = await Hospital.findById(userId);
          if (!hospital) return res.status(404).json({ msg: "Hospital not found" });
          if (hospitalName) hospital.hospitalName = hospitalName;
          if (email && email !== hospital.email) {
            const existingHospital = await Hospital.findOne({ email });
            const existingUser = await User.findOne({ email });
            if (existingHospital || existingUser) {
              return res.status(400).json({ msg: "Email already in use" });
            }
            hospital.email = email;
          }
          if (phone) hospital.phone = phone;
          if (location) hospital.location = location;
          if (latitude !== void 0) hospital.latitude = latitude;
          if (longitude !== void 0) hospital.longitude = longitude;
          if (latitude !== void 0 && longitude !== void 0) {
            hospital.locationPoint = {
              type: "Point",
              coordinates: [longitude, latitude]
            };
          }
          if (website) hospital.website = website;
          if (profilePicture) hospital.profilePicture = profilePicture;
          if (password) {
            const salt = await bcrypt.genSalt(10);
            hospital.password = await bcrypt.hash(password, salt);
          }
          await hospital.save();
          return res.json({
            msg: "Profile updated successfully",
            user: { id: hospital._id, hospitalName: hospital.hospitalName, email: hospital.email, role: "hospital", phone: hospital.phone, location: hospital.location, website: hospital.website, profilePicture: hospital.profilePicture }
          });
        } else {
          const user = await User.findById(userId);
          if (!user) return res.status(404).json({ msg: "User not found" });
          if (name) user.name = name;
          if (email && email !== user.email) {
            const existingHospital = await Hospital.findOne({ email });
            const existingUser = await User.findOne({ email });
            if (existingHospital || existingUser) {
              return res.status(400).json({ msg: "Email already in use" });
            }
            user.email = email;
          }
          if (phone) user.phone = phone;
          if (bloodGroup) user.bloodGroup = bloodGroup;
          if (location) user.location = location;
          if (latitude !== void 0) user.latitude = latitude;
          if (longitude !== void 0) user.longitude = longitude;
          if (latitude !== void 0 && longitude !== void 0) {
            user.locationPoint = {
              type: "Point",
              coordinates: [longitude, latitude]
            };
          }
          if (profilePicture) user.profilePicture = profilePicture;
          if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
          }
          await user.save();
          return res.json({
            msg: "Profile updated successfully",
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, bloodGroup: user.bloodGroup, location: user.location, latitude: user.latitude, longitude: user.longitude, profilePicture: user.profilePicture }
          });
        }
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.forgotPassword = async (req, res) => {
      try {
        const { email, role } = req.body;
        let account;
        if (role === "hospital") {
          account = await Hospital.findOne({ email });
        } else {
          account = await User.findOne({ email });
        }
        if (!account) {
          return res.status(404).json({ msg: "No account with that email address exists." });
        }
        const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
        account.resetPasswordOTP = otp;
        account.resetPasswordExpires = Date.now() + 10 * 60 * 1e3;
        await account.save();
        const message = `Your password reset OTP is: ${otp}. It will expire in 10 minutes.`;
        try {
          await sendEmail({
            email: account.email,
            subject: "Password Reset OTP",
            message,
            html: `<h3>Password Reset Request</h3><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`
          });
          res.status(200).json({ msg: "OTP sent to email." });
        } catch (err) {
          console.error("\n==== NODEMAILER ERROR ====\n", err, "\n==========================\n");
          account.resetPasswordOTP = void 0;
          account.resetPasswordExpires = void 0;
          await account.save();
          return res.status(500).json({ msg: "Email could not be sent", error: err.message });
        }
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.verifyOTP = async (req, res) => {
      try {
        const { email, otp, role } = req.body;
        let account;
        if (role === "hospital") {
          account = await Hospital.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        } else {
          account = await User.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        }
        if (!account) {
          return res.status(400).json({ msg: "Invalid or expired OTP." });
        }
        res.status(200).json({ msg: "OTP verified successfully." });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.resetPassword = async (req, res) => {
      try {
        const { email, otp, newPassword, role } = req.body;
        let account;
        if (role === "hospital") {
          account = await Hospital.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        } else {
          account = await User.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
        }
        if (!account) {
          return res.status(400).json({ msg: "Invalid or expired OTP." });
        }
        const salt = await bcrypt.genSalt(10);
        account.password = await bcrypt.hash(newPassword, salt);
        account.resetPasswordOTP = void 0;
        account.resetPasswordExpires = void 0;
        await account.save();
        res.status(200).json({ msg: "Password reset successful." });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
    exports2.getDonorBloodReport = async (req, res) => {
      try {
        const { id } = req.params;
        if (req.user.role !== "hospital") {
          return res.status(403).json({ msg: "Access denied. Only hospitals can view blood reports." });
        }
        const donor = await User.findById(id).select("name bloodReport");
        if (!donor) return res.status(404).json({ msg: "Donor not found" });
        if (!donor.bloodReport) {
          return res.status(404).json({ msg: "No blood report found for this donor" });
        }
        res.json({
          name: donor.name,
          bloodReport: donor.bloodReport
        });
      } catch (error) {
        res.status(500).json({ msg: "Server error", error: error.message });
      }
    };
  }
});

// middleware/authMiddleware.js
var require_authMiddleware = __commonJS({
  "middleware/authMiddleware.js"(exports2) {
    var jwt = require("jsonwebtoken");
    exports2.protect = async (req, res, next) => {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
          token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          req.user = decoded;
          next();
        } catch (error) {
          res.status(401).json({ msg: "Not authorized, token failed" });
        }
      }
      if (!token) {
        res.status(401).json({ msg: "Not authorized, no token" });
      }
    };
  }
});

// routes/authRoutes.js
var require_authRoutes = __commonJS({
  "routes/authRoutes.js"(exports2, module2) {
    var express2 = require("express");
    var router = express2.Router();
    var { registerUser, registerHospital, login, getMe, updateProfile, forgotPassword, verifyOTP, resetPassword } = require_authController();
    var { protect } = require_authMiddleware();
    router.post("/register-user", registerUser);
    router.post("/register-hospital", registerHospital);
    router.post("/login", login);
    router.get("/me", protect, getMe);
    router.put("/profile", protect, updateProfile);
    router.post("/forgot-password", forgotPassword);
    router.post("/verify-otp", verifyOTP);
    router.post("/reset-password", resetPassword);
    var { getDonorBloodReport } = require_authController();
    router.get("/donor/:id/blood-report", protect, getDonorBloodReport);
    module2.exports = router;
  }
});

// routes/requestRoutes.js
var require_requestRoutes = __commonJS({
  "routes/requestRoutes.js"(exports2, module2) {
    var express2 = require("express");
    var router = express2.Router();
    var { createRequest, getAllRequests, getMyRequests, acceptRequest, declineRequest, updateRequest, deleteRequest } = require_requestController();
    var { protect } = require_authMiddleware();
    router.post("/", protect, createRequest);
    router.get("/my-requests", protect, getMyRequests);
    router.get("/", protect, getAllRequests);
    router.put("/:id", protect, updateRequest);
    router.delete("/:id", protect, deleteRequest);
    router.post("/:id/accept", protect, acceptRequest);
    router.post("/:id/decline", protect, declineRequest);
    module2.exports = router;
  }
});

// routes/notificationRoutes.js
var require_notificationRoutes = __commonJS({
  "routes/notificationRoutes.js"(exports2, module2) {
    var express2 = require("express");
    var router = express2.Router();
    var { getNotifications, markAsRead, markAllAsRead } = require_notificationController();
    var { protect } = require_authMiddleware();
    router.get("/", protect, getNotifications);
    router.put("/:id/read", protect, markAsRead);
    router.put("/read-all", protect, markAllAsRead);
    module2.exports = router;
  }
});

// server.js
var express = require("express");
var mongoose = require("mongoose");
var cors = require("cors");
require("dotenv").config();
var app = express();
var startCronJobs = require_cronJobs();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/api/auth", require_authRoutes());
app.use("/api/requests", require_requestRoutes());
app.use("/api/notifications", require_notificationRoutes());
startCronJobs();
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB connected")).catch((err) => console.error("MongoDB connection error:", err));
var PORT = process.env.PORT || 5e3;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} at all interfaces`);
});
