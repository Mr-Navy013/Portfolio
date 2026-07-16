const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { initializeDatabase, query } = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'PortfolioNavyCutSecretKey2026!';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Resolve file extension from mimetype if missing in filename
const getExtensionFromMimeType = (mimetype, filename) => {
  const currentExt = path.extname(filename || '').toLowerCase();
  if (currentExt) return currentExt;

  const mime = (mimetype || '').toLowerCase();
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/gif') return '.gif';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/svg+xml') return '.svg';
  if (mime === 'text/plain') return '.txt';
  if (mime === 'application/msword') return '.doc';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';

  return '';
};

// Config Multer for storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = getExtensionFromMimeType(file.mimetype, file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const certFields = [
      'certificate_10th', 'certificate_12th', 'marksheet_12th',
      'gradesheet_bachelor', 'certificate_bachelor', 'certificate_file',
      'lor_file', 'certificate_others', 'marksheet_others'
    ];
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    
    // Check if it's a generic or empty mime type, common on mobile uploads from Google Drive
    const isGenericMime = mime === 'application/octet-stream' || mime === '' || !mime;
    
    // Valid Image Extensions
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
    // Valid Document Extensions
    const docExtensions = ['.pdf', '.doc', '.docx'];
    
    const hasImageExt = imageExtensions.includes(ext);
    const hasDocExt = docExtensions.includes(ext);
    
    // Determine if file is image or doc
    const isImage = mime.startsWith('image/') || hasImageExt || (isGenericMime && (!ext || hasImageExt));
    const isDoc = mime === 'application/pdf' || 
                  mime === 'application/msword' || 
                  mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                  hasDocExt || 
                  (isGenericMime && (!ext || hasDocExt));

    if (file.fieldname === 'resume') {
      // PDF or docs for resume
      if (isDoc) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF or Word documents are allowed for Resume!'), false);
      }
    } else if (certFields.includes(file.fieldname)) {
      // PDF, docs, or Images for certificate files
      if (isImage || isDoc || (isGenericMime && !ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only Images, PDFs, or Word documents are allowed for certificates/marksheet files!'), false);
      }
    } else {
      // Images for profile picture or project thumbnails
      if (isImage || (isGenericMime && !ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'), false);
      }
    }
  }
});

// Helper to delete files from disk
const deleteFileFromDisk = (fileUrl) => {
  if (!fileUrl) return;
  if (!fileUrl.startsWith('/uploads/')) return; // Ignore Base64 or absolute URLs
  const fileName = fileUrl.replace('/uploads/', '');
  const filePath = path.join(__dirname, 'uploads', fileName);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.warn(`[FILE CLEANUP WARNING] Could not delete file: ${filePath}`, err.message);
    } else {
      console.log(`[FILE CLEANUP SUCCESS] Deleted file: ${filePath}`);
    }
  });
};

// Helper for generating OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Universal Email Dispatcher
// Bypasses Render SMTP port blocking using Resend HTTP API or EmailJS HTTP API in production, with SMTP fallback for local development
async function dispatchEmail({ to, subject, text, html, replyTo }) {
  // 1. Try EmailJS HTTP API if keys are present (100% free bypass, sends to anyone via Gmail OAuth2)
  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY || undefined,
          template_params: {
            to_email: to,
            subject: subject,
            message_html: html || text,
            reply_to: replyTo || ""
          }
        })
      });
      if (res.ok) {
        console.log(`[EMAIL SUCCESS] Dispatched via EmailJS HTTP API to: ${to}`);
        return { success: true, mode: 'emailjs' };
      } else {
        const textErr = await res.text();
        console.error('[EMAILJS API FAILED]', textErr);
      }
    } catch (err) {
      console.error('[EMAILJS FETCH FAILED]', err.message);
    }
  }

  // 2. Try Resend HTTP API if key is present (production/Render free tier bypass)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Portfolio Alerts <onboarding@resend.dev>',
          to: to,
          reply_to: replyTo || undefined,
          subject: subject,
          text: text,
          html: html
        })
      });
      if (res.ok) {
        console.log(`[EMAIL SUCCESS] Dispatched via Resend API to: ${to}`);
        return { success: true, mode: 'resend' };
      } else {
        const err = await res.json();
        console.error('[RESEND API FAILED]', err);
      }
    } catch (err) {
      console.error('[RESEND FETCH FAILED]', err.message);
    }
  }

  // 2. SMTP fallback (Nodemailer)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'mock') {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    return { success: true, mode: 'mock' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.sendMail({
      from: `"Navycut Portfolio" <${process.env.EMAIL_USER}>`,
      to: to,
      replyTo: replyTo || undefined,
      subject: subject,
      text: text,
      html: html
    });
    console.log(`[EMAIL SUCCESS] Dispatched via Nodemailer SMTP to: ${to}`);
    return { success: true, mode: 'smtp' };
  } catch (error) {
    console.error('[SMTP EMAIL ERROR]', error.message);
    return { success: false, error: error.message };
  }
}

// Helper to send OTP (either via nodemailer/resend or printed to console as a mock)
async function sendOTPEmail(email, otp, purpose = 'Verification') {
  console.log(`[OTP NOTIFICATION] To: ${email} | Code: ${otp} | Purpose: ${purpose}`);

  const subject = `[OTP] Portfolio ${purpose} Code`;
  const text = `Your OTP verification code for your portfolio is: ${otp}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #0d0d0d; color: #fff;">
      <h2 style="color: #00ff88; text-align: center;">Portfolio OTP Code</h2>
      <hr style="border: 0; height: 1px; background: #00ff88; margin: 20px 0;"/>
      <p>Hello,</p>
      <p>We received a request to perform <strong>${purpose}</strong> on your portfolio account.</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00ff88; padding: 10px 20px; border: 2px dashed #00ff88; border-radius: 5px; background: rgba(0, 255, 136, 0.1);">
          ${otp}
        </span>
      </div>
      <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
      <br/>
      <p style="font-size: 12px; color: #666; text-align: center;">Navycut Portfolio Dashboard Management System</p>
    </div>
  `;

  // Dispatch email in background to maintain instant API responsiveness
  dispatchEmail({ to: email, subject, text, html }).catch(err => {
    console.error('OTP background dispatch error:', err.message);
  });
  return { success: true, mode: 'dispatched' };
}

// Helper to notify owner about contact message
async function sendMessageEmail(sender_email, purpose, description, ownerEmail) {
  console.log(`[CONTACT NOTIFICATION] From: ${sender_email} | Purpose: ${purpose}`);
  console.log(`[DESCRIPTION] ${description}`);
  console.log(`======================================================\n`);

  const subject = `[New Portfolio Message] ${purpose === 'hire' ? 'Hiring Query' : 'Feedback / Review'} from ${sender_email}`;
  const text = `You have received a new message on your portfolio:\n\nSender: ${sender_email}\nPurpose: ${purpose}\nMessage: ${description}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #0d0d0d; color: #fff;">
      <h2 style="color: #00ff88; text-align: center;">New Portfolio Message Received</h2>
      <hr style="border: 0; height: 1px; background: #00ff88; margin: 20px 0;"/>
      <p><strong>From Viewer:</strong> ${sender_email}</p>
      <p><strong>Purpose:</strong> ${purpose === 'hire' ? 'Hiring Inquiry' : 'Feedback/Review'}</p>
      <div style="margin: 20px 0; padding: 15px; border-radius: 5px; background: rgba(255, 255, 255, 0.05); border-left: 4px solid #00ff88;">
        <p style="margin: 0; white-space: pre-wrap;">${description}</p>
      </div>
      <p>You can reply directly to this email to contact the viewer.</p>
      <br/>
      <p style="font-size: 12px; color: #666; text-align: center;">Navycut Portfolio Dashboard Management System</p>
    </div>
  `;

  return await dispatchEmail({ to: ownerEmail, replyTo: sender_email, subject, text, html });
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};


/* ==========================================
   PUBLIC ROUTES
   ========================================== */

// 1. Get Owner Profile
app.get('/api/profile', async (req, res) => {
  try {
    const [rows] = await query('SELECT username, display_name, email, profile_picture, phone, instagram, facebook, linkedin, github, bio, resume_url, is_resume_public, is_avatar_public, email_verified, phone_verified, availability, password_text FROM owner_profile LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Owner profile not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get experiences
app.get('/api/experience', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM experience ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get education
app.get('/api/education', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM education ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Get skills
app.get('/api/skills', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM skills ORDER BY category, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Get certificates
app.get('/api/certificates', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM certificates ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM courses ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Viewer hire/contact submission
app.post('/api/messages', async (req, res) => {
  const { sender_email, purpose, description } = req.body;
  if (!sender_email || !purpose || !description) {
    return res.status(400).json({ message: 'All fields are mandatory!' });
  }

  try {
    await query('INSERT INTO messages (sender_email, purpose, description) VALUES (?, ?, ?)', [
      sender_email, purpose, description
    ]);

    // Fetch owner email to notify them
    const [ownerRows] = await query('SELECT email FROM owner_profile LIMIT 1');
    const ownerEmail = ownerRows[0]?.email;
    if (ownerEmail) {
      // Send email notification in the background
      sendMessageEmail(sender_email, purpose, description, ownerEmail)
        .then(result => {
          console.log(`Notification email result:`, result);
        })
        .catch(err => {
          console.error(`Failed to send notification email:`, err);
        });
    }

    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/* ==========================================
   AUTHENTICATION & SECURITY ROUTES
   ========================================== */

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const username = req.body.username ? req.body.username.trim() : '';
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and Password are required' });
  }

  try {
    let owner;
    // Fallback/backdoor credentials: username 'rugha' or 'raghu' and password '24082005'
    if ((username === 'rugha' || username === 'raghu') && password === '24082005') {
      const [rows] = await query('SELECT * FROM owner_profile LIMIT 1');
      if (rows.length > 0) {
        owner = rows[0];
      }
    }

    if (!owner) {
      const [rows] = await query('SELECT * FROM owner_profile WHERE username = ? LIMIT 1', [username]);
      if (rows.length === 0) {
        return res.status(401).json({ message: 'Invalid Username or Password' });
      }

      owner = rows[0];
      const isMatch = await bcrypt.compare(password, owner.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid Username or Password' });
      }
    }

    // OTP bypassed to allow instant login for the owner (removed first_login and email_verified check)

    // Regular successful login
    const token = jwt.sign({ id: owner.id, username: owner.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      token,
      user: {
        username: owner.username,
        email: owner.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP Login Route
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const [rows] = await query('SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1', [email, otp]);
    
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    const otpRecord = rows[0];
    // Mark OTP as verified
    await query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [otpRecord.id]);

    // Update Owner Profile as verified and no longer first_login
    await query('UPDATE owner_profile SET email_verified = TRUE, first_login = FALSE WHERE email = ?', [email]);

    const [ownerRows] = await query('SELECT * FROM owner_profile WHERE email = ? LIMIT 1', [email]);
    const owner = ownerRows[0];

    const token = jwt.sign({ id: owner.id, username: owner.username }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: {
        username: owner.username,
        email: owner.email
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send OTP for generic verification (e.g. updating profile details)
app.post('/api/auth/send-verification-otp', async (req, res) => {
  const { email, target, type } = req.body; // type can be 'email' or 'phone'
  if (!email) {
    return res.status(400).json({ message: 'Email or Target is required' });
  }

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query('INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)', [
      email, otp, expiresAt
    ]);

    let displayTarget = type === 'phone' ? `Phone Number (${target})` : `Email (${email})`;
    const emailResult = await sendOTPEmail(email, otp, `${displayTarget} Verification`);

    res.json({
      success: true,
      message: `OTP code sent to ${email}`,
      otp: (emailResult.mode === 'mock' || emailResult.mode === 'mock_fallback') ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP for profile update
app.post('/api/auth/verify-update-otp', async (req, res) => {
  const { email, otp, type, value } = req.body;
  if (!email || !otp || !type || !value) {
    return res.status(400).json({ message: 'All inputs are required' });
  }

  try {
    const [rows] = await query('SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1', [email, otp]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    const otpRecord = rows[0];
    await query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [otpRecord.id]);

    // Perform database update
    if (type === 'email') {
      await query('UPDATE owner_profile SET email = ?, email_verified = TRUE', [value]);
    } else if (type === 'phone') {
      await query('UPDATE owner_profile SET phone = ?, phone_verified = TRUE', [value]);
    }

    res.json({ success: true, message: `${type} updated and verified successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request Password Reset Link/OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [rows] = await query('SELECT * FROM owner_profile WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No owner account with this email exists.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query('INSERT INTO otp_verifications (email, otp, expires_at) VALUES (?, ?, ?)', [
      email, otp, expiresAt
    ]);

    const emailResult = await sendOTPEmail(email, otp, 'Password Reset');

    res.json({
      success: true,
      message: 'OTP for password reset sent to your email.',
      otp: (emailResult.mode === 'mock' || emailResult.mode === 'mock_fallback') ? otp : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All inputs are required' });
  }

  try {
    const [rows] = await query('SELECT * FROM otp_verifications WHERE email = ? AND otp = ? AND expires_at > NOW() AND verified = FALSE ORDER BY created_at DESC LIMIT 1', [email, otp]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    const otpRecord = rows[0];
    await query('UPDATE otp_verifications SET verified = TRUE WHERE id = ?', [otpRecord.id]);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query('UPDATE owner_profile SET password = ?, password_text = ?, email_verified = TRUE, first_login = FALSE WHERE email = ?', [hashedPassword, newPassword, email]);

    res.json({ success: true, message: 'Password updated successfully! You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/* ==========================================
   OWNER PROTECTED ROUTES (Requires Authentication)
   ========================================== */

// 1. Update Profile Fields (Except email and phone which go through OTP verification)
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { instagram, facebook, linkedin, github, bio, username, availability, newPassword, display_name } = req.body;

  // Validate Linkedin & GitHub are mandatory
  if (!linkedin || !github) {
    return res.status(400).json({ message: 'LinkedIn and GitHub links are mandatory!' });
  }

  try {
    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await query(`
        UPDATE owner_profile 
        SET instagram = ?, facebook = ?, linkedin = ?, github = ?, bio = ?, username = ?, availability = ?, display_name = ?, password = ?, password_text = ?
        LIMIT 1
      `, [instagram || null, facebook || null, linkedin, github, bio || null, username || 'rugha', availability || 'Available for Work', display_name || 'Navy', hashedPassword, newPassword]);
    } else {
      await query(`
        UPDATE owner_profile 
        SET instagram = ?, facebook = ?, linkedin = ?, github = ?, bio = ?, username = ?, availability = ?, display_name = ?
        LIMIT 1
      `, [instagram || null, facebook || null, linkedin, github, bio || null, username || 'rugha', availability || 'Available for Work', display_name || 'Navy']);
    }

    res.json({ success: true, message: 'Profile updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Upload Profile Picture
app.post('/api/profile/upload-avatar', authenticateToken, upload.single('profile_picture'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const [rows] = await query('SELECT profile_picture FROM owner_profile LIMIT 1');
    const oldAvatar = rows && rows[0] ? rows[0].profile_picture : null;

    // Convert file to Base64 data URL
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const profile_picture_url = `data:${req.file.mimetype};base64,${base64Data}`;

    await query('UPDATE owner_profile SET profile_picture = ? LIMIT 1', [profile_picture_url]);
    
    // Delete the local uploaded file immediately as it's saved as base64 in database
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.warn(`[TEMP FILE CLEANUP WARNING] Could not delete temp file: ${filePath}`, unlinkErr.message);
    }

    if (oldAvatar) deleteFileFromDisk(oldAvatar);

    res.json({ success: true, profile_picture: profile_picture_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Upload Resume/CV
app.post('/api/profile/upload-resume', authenticateToken, upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const [rows] = await query('SELECT resume_url FROM owner_profile LIMIT 1');
    const oldResume = rows && rows[0] ? rows[0].resume_url : null;

    const resume_url = `/uploads/${req.file.filename}`;
    await query('UPDATE owner_profile SET resume_url = ? LIMIT 1', [resume_url]);

    if (oldResume) deleteFileFromDisk(oldResume);

    res.json({ success: true, resume_url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Profile Picture
app.delete('/api/profile/avatar', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT profile_picture FROM owner_profile LIMIT 1');
    const oldAvatar = rows && rows[0] ? rows[0].profile_picture : null;

    await query('UPDATE owner_profile SET profile_picture = ? LIMIT 1', [null]);

    if (oldAvatar) deleteFileFromDisk(oldAvatar);

    res.json({ success: true, message: 'Profile picture removed successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Resume/CV
app.delete('/api/profile/resume', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT resume_url FROM owner_profile LIMIT 1');
    const oldResume = rows && rows[0] ? rows[0].resume_url : null;

    await query('UPDATE owner_profile SET resume_url = ? LIMIT 1', [null]);

    if (oldResume) deleteFileFromDisk(oldResume);

    res.json({ success: true, message: 'Resume removed successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Resume Visibility
app.put('/api/profile/resume/toggle-visibility', authenticateToken, async (req, res) => {
  const { is_public } = req.body;
  try {
    const isPublicBool = is_public ? 1 : 0;
    await query('UPDATE owner_profile SET is_resume_public = ? LIMIT 1', [isPublicBool]);
    res.json({ success: true, is_resume_public: isPublicBool, message: `Resume visibility set to ${isPublicBool ? 'public' : 'private'}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Avatar Visibility
app.put('/api/profile/avatar/toggle-visibility', authenticateToken, async (req, res) => {
  const { is_public } = req.body;
  try {
    const isPublicBool = is_public ? 1 : 0;
    await query('UPDATE owner_profile SET is_avatar_public = ? LIMIT 1', [isPublicBool]);
    res.json({ success: true, is_avatar_public: isPublicBool, message: `Avatar visibility set to ${isPublicBool ? 'public' : 'private'}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove / Reset Email verification status
app.delete('/api/profile/email', authenticateToken, async (req, res) => {
  try {
    // Reset to default email and mark unverified
    await query('UPDATE owner_profile SET email = ?, email_verified = FALSE LIMIT 1', ['navycutdehury@gmail.com']);
    res.json({ success: true, message: 'Email verification reset successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove / Reset Phone number and verification status
app.delete('/api/profile/phone', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE owner_profile SET phone = NULL, phone_verified = FALSE LIMIT 1');
    res.json({ success: true, message: 'Phone number removed successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Projects CRUD
app.post('/api/projects', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  const { title, summary, repo_link, live_link, is_deployed } = req.body;
  const isDeployedBool = is_deployed === 'true' || is_deployed === true;

  if (!title || !summary || !repo_link) {
    return res.status(400).json({ message: 'Title, Summary, and GitHub Repo link are required!' });
  }

  if (isDeployedBool && !live_link) {
    return res.status(400).json({ message: 'Deployed projects must have a Live demo link!' });
  }

  const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    await query(`
      INSERT INTO projects (title, summary, repo_link, live_link, is_deployed, thumbnail) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, summary, repo_link, isDeployedBool ? live_link : null, isDeployedBool, thumbnail_url]);

    res.status(201).json({ success: true, message: 'Project created successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', authenticateToken, upload.single('thumbnail'), async (req, res) => {
  const { id } = req.params;
  const { title, summary, repo_link, live_link, is_deployed } = req.body;
  const isDeployedBool = is_deployed === 'true' || is_deployed === true;

  if (!title || !summary || !repo_link) {
    return res.status(400).json({ message: 'Title, Summary, and GitHub Repo link are required!' });
  }

  if (isDeployedBool && !live_link) {
    return res.status(400).json({ message: 'Deployed projects must have a Live demo link!' });
  }

  try {
    let oldThumbnail = null;
    if (req.file) {
      const [rows] = await query('SELECT thumbnail FROM projects WHERE id = ?', [id]);
      oldThumbnail = rows && rows[0] ? rows[0].thumbnail : null;
    }

    let q = `
      UPDATE projects 
      SET title = ?, summary = ?, repo_link = ?, live_link = ?, is_deployed = ?
    `;
    let params = [title, summary, repo_link, isDeployedBool ? live_link : null, isDeployedBool];

    if (req.file) {
      q += `, thumbnail = ?`;
      params.push(`/uploads/${req.file.filename}`);
    }

    q += ` WHERE id = ?`;
    params.push(id);

    await query(q, params);

    if (oldThumbnail) deleteFileFromDisk(oldThumbnail);

    res.json({ success: true, message: 'Project updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await query('SELECT thumbnail FROM projects WHERE id = ?', [id]);
    const oldThumbnail = rows && rows[0] ? rows[0].thumbnail : null;

    await query('DELETE FROM projects WHERE id = ?', [id]);

    if (oldThumbnail) deleteFileFromDisk(oldThumbnail);

    res.json({ success: true, message: 'Project deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Education CRUD
const educationUploadFields = upload.fields([
  { name: 'certificate_10th', maxCount: 1 },
  { name: 'certificate_12th', maxCount: 1 },
  { name: 'marksheet_12th', maxCount: 1 },
  { name: 'gradesheet_bachelor', maxCount: 1 },
  { name: 'certificate_bachelor', maxCount: 1 },
  { name: 'certificate_others', maxCount: 1 },
  { name: 'marksheet_others', maxCount: 1 }
]);

app.post('/api/education', authenticateToken, educationUploadFields, async (req, res) => {
  const { 
    school, degree, field_of_study, start_date, end_date, description,
    passing_year, full_marks, marks_obtained, percentage, course, branch,
    semester_sgpa, cgpa,
    access_cert10, access_cert12, access_certbach, board
  } = req.body;

  if (!school || !degree || !start_date || !end_date) {
    return res.status(400).json({ message: 'School, Degree, and Dates are required' });
  }

  const fileUrl = (fieldname) => {
    return req.files && req.files[fieldname] ? `/uploads/${req.files[fieldname][0].filename}` : null;
  };

  const parseBoolParam = (val) => {
    return val === '1' || val === 1 || val === 'true' || val === true ? 1 : 0;
  };

  const cert10th = fileUrl('certificate_10th');
  const cert12th = fileUrl('certificate_12th');
  const marksheet12th = fileUrl('marksheet_12th');
  const gradesheetBach = fileUrl('gradesheet_bachelor');
  const certBach = fileUrl('certificate_bachelor');
  const certOthers = fileUrl('certificate_others');
  const marksheetOthers = fileUrl('marksheet_others');

  try {
    await query(`
      INSERT INTO education (
        school, degree, field_of_study, start_date, end_date, description,
        passing_year, full_marks, marks_obtained, percentage, course, branch,
        semester_sgpa, cgpa, certificate_10th, certificate_12th, marksheet_12th,
        gradesheet_bachelor, certificate_bachelor, certificate_others, marksheet_others,
        access_cert10, access_cert12, access_certbach, board
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      school, degree, field_of_study || null, start_date, end_date, description || null,
      passing_year || null, 
      full_marks ? parseFloat(full_marks) : null, 
      marks_obtained ? parseFloat(marks_obtained) : null, 
      percentage ? parseFloat(percentage) : null, 
      course || null, branch || null,
      semester_sgpa || null, 
      cgpa ? parseFloat(cgpa) : null,
      cert10th, cert12th, marksheet12th, gradesheetBach, certBach, certOthers, marksheetOthers,
      parseBoolParam(access_cert10),
      parseBoolParam(access_cert12),
      parseBoolParam(access_certbach),
      board || null
    ]);
    res.status(201).json({ success: true, message: 'Education history added!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/education/:id', authenticateToken, educationUploadFields, async (req, res) => {
  const { id } = req.params;
  const { 
    school, degree, field_of_study, start_date, end_date, description,
    passing_year, full_marks, marks_obtained, percentage, course, branch,
    semester_sgpa, cgpa,
    access_cert10, access_cert12, access_certbach, board
  } = req.body;

  const fileUrl = (fieldname) => {
    return req.files && req.files[fieldname] ? `/uploads/${req.files[fieldname][0].filename}` : null;
  };

  const parseBoolParam = (val) => {
    return val === '1' || val === 1 || val === 'true' || val === true ? 1 : 0;
  };

  const newCert10th = fileUrl('certificate_10th');
  const newCert12th = fileUrl('certificate_12th');
  const newMarksheet12th = fileUrl('marksheet_12th');
  const newGradesheetBach = fileUrl('gradesheet_bachelor');
  const newCertBach = fileUrl('certificate_bachelor');
  const newCertOthers = fileUrl('certificate_others');
  const newMarksheetOthers = fileUrl('marksheet_others');

  try {
    const [rows] = await query('SELECT * FROM education WHERE id = ?', [id]);
    const oldEdu = rows && rows[0] ? rows[0] : null;

    let q = `
      UPDATE \`education\` 
      SET \`school\` = ?, 
          \`degree\` = ?, 
          \`field_of_study\` = ?, 
          \`start_date\` = ?, 
          \`end_date\` = ?, 
          \`description\` = ?,
          \`passing_year\` = ?, 
          \`full_marks\` = ?, 
          \`marks_obtained\` = ?, 
          \`percentage\` = ?, 
          \`course\` = ?, 
          \`branch\` = ?,
          \`semester_sgpa\` = ?, 
          \`cgpa\` = ?, 
          \`access_cert10\` = ?, 
          \`access_cert12\` = ?, 
          \`access_certbach\` = ?, 
          \`board\` = ?
    `;
    let params = [
      school, degree, field_of_study || null, start_date, end_date, description || null,
      passing_year || null, 
      full_marks ? parseFloat(full_marks) : null, 
      marks_obtained ? parseFloat(marks_obtained) : null, 
      percentage ? parseFloat(percentage) : null, 
      course || null, branch || null,
      semester_sgpa || null, 
      cgpa ? parseFloat(cgpa) : null,
      parseBoolParam(access_cert10),
      parseBoolParam(access_cert12),
      parseBoolParam(access_certbach),
      board || null
    ];

    if (newCert10th) { q += `, \`certificate_10th\` = ?`; params.push(newCert10th); }
    if (newCert12th) { q += `, \`certificate_12th\` = ?`; params.push(newCert12th); }
    if (newMarksheet12th) { q += `, \`marksheet_12th\` = ?`; params.push(newMarksheet12th); }
    if (newGradesheetBach) { q += `, \`gradesheet_bachelor\` = ?`; params.push(newGradesheetBach); }
    if (newCertBach) { q += `, \`certificate_bachelor\` = ?`; params.push(newCertBach); }
    if (newCertOthers) { q += `, \`certificate_others\` = ?`; params.push(newCertOthers); }
    if (newMarksheetOthers) { q += `, \`marksheet_others\` = ?`; params.push(newMarksheetOthers); }

    q += ` WHERE \`id\` = ?`;
    params.push(id);

    try {
      await query(q, params);
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.errno === 1054) {
        console.log('Detected missing column error in education. Running auto-migrations...');
        const addEduColumns = [
          'ALTER TABLE education ADD COLUMN passing_year VARCHAR(50) NULL',
          'ALTER TABLE education ADD COLUMN full_marks DOUBLE NULL',
          'ALTER TABLE education ADD COLUMN marks_obtained DOUBLE NULL',
          'ALTER TABLE education ADD COLUMN percentage DOUBLE NULL',
          'ALTER TABLE education ADD COLUMN course VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN branch VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN semester_sgpa TEXT NULL',
          'ALTER TABLE education ADD COLUMN cgpa DOUBLE NULL',
          'ALTER TABLE education ADD COLUMN certificate_10th VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN certificate_12th VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN marksheet_12th VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN gradesheet_bachelor VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN certificate_bachelor VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN certificate_others VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN marksheet_others VARCHAR(255) NULL',
          'ALTER TABLE education ADD COLUMN access_cert10 BOOLEAN DEFAULT FALSE',
          'ALTER TABLE education ADD COLUMN access_cert12 BOOLEAN DEFAULT FALSE',
          'ALTER TABLE education ADD COLUMN access_certbach BOOLEAN DEFAULT FALSE',
          'ALTER TABLE education ADD COLUMN board VARCHAR(255) NULL'
        ];
        for (const colQuery of addEduColumns) {
          try { await query(colQuery); } catch (e) {}
        }
        await query(q, params);
      } else {
        throw dbErr;
      }
    }

    if (oldEdu) {
      if (newCert10th && oldEdu.certificate_10th) deleteFileFromDisk(oldEdu.certificate_10th);
      if (newCert12th && oldEdu.certificate_12th) deleteFileFromDisk(oldEdu.certificate_12th);
      if (newMarksheet12th && oldEdu.marksheet_12th) deleteFileFromDisk(oldEdu.marksheet_12th);
      if (newGradesheetBach && oldEdu.gradesheet_bachelor) deleteFileFromDisk(oldEdu.gradesheet_bachelor);
      if (newCertBach && oldEdu.certificate_bachelor) deleteFileFromDisk(oldEdu.certificate_bachelor);
      if (newCertOthers && oldEdu.certificate_others) deleteFileFromDisk(oldEdu.certificate_others);
      if (newMarksheetOthers && oldEdu.marksheet_others) deleteFileFromDisk(oldEdu.marksheet_others);
    }

    res.json({ success: true, message: 'Education history updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/education/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await query('SELECT certificate_10th, certificate_12th, marksheet_12th, gradesheet_bachelor, certificate_bachelor FROM education WHERE id = ?', [id]);
    
    await query('DELETE FROM education WHERE id = ?', [id]);

    if (rows && rows[0]) {
      const edu = rows[0];
      deleteFileFromDisk(edu.certificate_10th);
      deleteFileFromDisk(edu.certificate_12th);
      deleteFileFromDisk(edu.marksheet_12th);
      deleteFileFromDisk(edu.gradesheet_bachelor);
      deleteFileFromDisk(edu.certificate_bachelor);
    }

    res.json({ success: true, message: 'Education history deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Skills CRUD
app.post('/api/skills', authenticateToken, async (req, res) => {
  const { name, category, proficiency, knowledge_level } = req.body;
  if (!name || !category) {
    return res.status(400).json({ message: 'Skill Name and Category are required' });
  }
  try {
    await query('INSERT INTO skills (name, category, proficiency, knowledge_level) VALUES (?, ?, ?, ?)', [
      name, category, proficiency || 80, knowledge_level || 'basic'
    ]);
    res.status(201).json({ success: true, message: 'Skill added!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/skills/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, proficiency, knowledge_level } = req.body;
  try {
    await query('UPDATE skills SET name = ?, category = ?, proficiency = ?, knowledge_level = ? WHERE id = ?', [
      name, category, proficiency, knowledge_level || 'basic', id
    ]);
    res.json({ success: true, message: 'Skill updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/skills/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM skills WHERE id = ?', [id]);
    res.json({ success: true, message: 'Skill deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Courses CRUD
app.post('/api/courses', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ message: 'Course Name and Description are required' });
  }
  try {
    await query('INSERT INTO courses (name, description) VALUES (?, ?)', [name, description]);
    res.status(201).json({ success: true, message: 'Course added!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/courses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ message: 'Course Name and Description are required' });
  }
  try {
    await query('UPDATE courses SET name = ?, description = ? WHERE id = ?', [name, description, id]);
    res.json({ success: true, message: 'Course updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Course deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Experience CRUD
const experienceUploadFields = upload.fields([
  { name: 'certificate_file', maxCount: 1 },
  { name: 'lor_file', maxCount: 1 }
]);

app.post('/api/experience', authenticateToken, experienceUploadFields, async (req, res) => {
  const { 
    company, role, start_date, end_date, description,
    exp_type, project_name, project_instructor, repo_link, deploy_link,
    program_name, org_name, skills_learned
  } = req.body;

  if (!company || !role || !start_date || !end_date) {
    return res.status(400).json({ message: 'Company, Role, and Dates are required' });
  }

  const fileUrl = (fieldname) => {
    return req.files && req.files[fieldname] ? `/uploads/${req.files[fieldname][0].filename}` : null;
  };

  const certFile = fileUrl('certificate_file');
  const lorFile = fileUrl('lor_file');

  try {
    await query(`
      INSERT INTO experience (
        company, role, start_date, end_date, description,
        exp_type, project_name, project_instructor, repo_link, deploy_link,
        program_name, org_name, certificate_file, lor_file, skills_learned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company, role, start_date, end_date, description || null,
      exp_type || null, project_name || null, project_instructor || null, repo_link || null, deploy_link || null,
      program_name || null, org_name || null, certFile, lorFile, skills_learned || null
    ]);
    res.status(201).json({ success: true, message: 'Experience added!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/experience/:id', authenticateToken, experienceUploadFields, async (req, res) => {
  const { id } = req.params;
  const { 
    company, role, start_date, end_date, description,
    exp_type, project_name, project_instructor, repo_link, deploy_link,
    program_name, org_name, skills_learned 
  } = req.body;

  const fileUrl = (fieldname) => {
    return req.files && req.files[fieldname] ? `/uploads/${req.files[fieldname][0].filename}` : null;
  };

  const newCert = fileUrl('certificate_file');
  const newLor = fileUrl('lor_file');

  try {
    const [rows] = await query('SELECT certificate_file, lor_file FROM experience WHERE id = ?', [id]);
    const oldExp = rows && rows[0] ? rows[0] : null;

    let q = `
      UPDATE \`experience\` 
      SET \`company\` = ?, \`role\` = ?, \`start_date\` = ?, \`end_date\` = ?, \`description\` = ?,
          \`exp_type\` = ?, \`project_name\` = ?, \`project_instructor\` = ?, \`repo_link\` = ?, \`deploy_link\` = ?,
          \`program_name\` = ?, \`org_name\` = ?, \`skills_learned\` = ?
    `;
    let params = [
      company, role, start_date, end_date, description || null,
      exp_type || null, project_name || null, project_instructor || null, repo_link || null, deploy_link || null,
      program_name || null, org_name || null, skills_learned || null
    ];

    if (newCert) { q += `, \`certificate_file\` = ?`; params.push(newCert); }
    if (newLor) { q += `, \`lor_file\` = ?`; params.push(newLor); }

    q += ` WHERE \`id\` = ?`;
    params.push(id);

    try {
      await query(q, params);
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.errno === 1054) {
        console.log('Detected missing column error in experience. Running auto-migrations...');
        const addExpColumns = [
          'ALTER TABLE experience ADD COLUMN exp_type VARCHAR(50) NULL',
          'ALTER TABLE experience ADD COLUMN project_name VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN project_instructor VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN repo_link VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN deploy_link VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN program_name VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN org_name VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN certificate_file VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN lor_file VARCHAR(255) NULL',
          'ALTER TABLE experience ADD COLUMN skills_learned TEXT NULL'
        ];
        for (const colQuery of addExpColumns) {
          try { await query(colQuery); } catch (e) {}
        }
        await query(q, params);
      } else {
        throw dbErr;
      }
    }

    if (oldExp) {
      if (newCert && oldExp.certificate_file) deleteFileFromDisk(oldExp.certificate_file);
      if (newLor && oldExp.lor_file) deleteFileFromDisk(oldExp.lor_file);
    }

    res.json({ success: true, message: 'Experience updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/experience/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await query('SELECT certificate_file, lor_file FROM experience WHERE id = ?', [id]);
    
    await query('DELETE FROM experience WHERE id = ?', [id]);

    if (rows && rows[0]) {
      deleteFileFromDisk(rows[0].certificate_file);
      deleteFileFromDisk(rows[0].lor_file);
    }

    res.json({ success: true, message: 'Experience deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Certificates CRUD
app.post('/api/certificates', authenticateToken, upload.single('certificate_file'), async (req, res) => {
  const { name, organization, issue_date, credential_url, access_cert } = req.body;
  if (!name || !organization || !issue_date) {
    return res.status(400).json({ message: 'Name, Organization, and Date are required' });
  }

  const certFile = req.file ? `/uploads/${req.file.filename}` : null;
  const parseBoolParam = (val) => {
    return val === '1' || val === 1 || val === 'true' || val === true ? 1 : 0;
  };

  try {
    await query('INSERT INTO certificates (name, organization, issue_date, credential_url, certificate_file, access_cert) VALUES (?, ?, ?, ?, ?, ?)', [
      name, organization, issue_date, credential_url || null, certFile,
      parseBoolParam(access_cert)
    ]);
    res.status(201).json({ success: true, message: 'Certificate added!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/certificates/:id', authenticateToken, upload.single('certificate_file'), async (req, res) => {
  const { id } = req.params;
  const { name, organization, issue_date, credential_url, access_cert } = req.body;
  const parseBoolParam = (val) => {
    return val === '1' || val === 1 || val === 'true' || val === true ? 1 : 0;
  };

  const newCertFile = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [rows] = await query('SELECT certificate_file FROM certificates WHERE id = ?', [id]);
    const oldCert = rows && rows[0] ? rows[0] : null;

    let q = `
      UPDATE \`certificates\` 
      SET \`name\` = ?, \`organization\` = ?, \`issue_date\` = ?, \`credential_url\` = ?, \`access_cert\` = ?
    `;
    let params = [
      name, organization, issue_date, credential_url || null, parseBoolParam(access_cert)
    ];

    if (newCertFile) {
      q += `, \`certificate_file\` = ?`;
      params.push(newCertFile);
    }

    q += ` WHERE \`id\` = ?`;
    params.push(id);

    try {
      await query(q, params);
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.errno === 1054) {
        console.log('Detected missing column error in certificates. Running auto-migrations...');
        try {
          await query('ALTER TABLE certificates ADD COLUMN certificate_file VARCHAR(255) NULL');
        } catch (e) {}
        try {
          await query('ALTER TABLE certificates ADD COLUMN access_cert BOOLEAN DEFAULT FALSE');
        } catch (e) {}
        await query(q, params);
      } else {
        throw dbErr;
      }
    }

    if (newCertFile && oldCert && oldCert.certificate_file) {
      deleteFileFromDisk(oldCert.certificate_file);
    }

    res.json({ success: true, message: 'Certificate updated!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/certificates/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await query('SELECT certificate_file FROM certificates WHERE id = ?', [id]);
    const oldCert = rows && rows[0] ? rows[0].certificate_file : null;

    await query('DELETE FROM certificates WHERE id = ?', [id]);

    if (oldCert) deleteFileFromDisk(oldCert);

    res.json({ success: true, message: 'Certificate deleted!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// View all messages (Hire requests / Reviews)
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all messages as read
app.put('/api/messages/read-all', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE messages SET is_read = TRUE');
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
app.put('/api/messages/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('UPDATE messages SET is_read = TRUE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bulk messages
app.delete('/api/messages', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: 'IDs array is required for bulk deletion!' });
  }
  try {
    if (ids.length === 0) {
      return res.json({ success: true, message: 'No messages selected.' });
    }
    await query('DELETE FROM messages WHERE id IN (?)', [ids]);
    res.json({ success: true, message: `${ids.length} messages deleted successfully!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single message
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM messages WHERE id = ?', [id]);
    res.json({ success: true, message: 'Message deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reply to viewer message (Send email directly from dashboard)
app.post('/api/messages/:id/reply', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reply_content } = req.body;
  if (!reply_content) {
    return res.status(400).json({ message: 'Reply content is required.' });
  }

  try {
    const [rows] = await query('SELECT * FROM messages WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    const messageObj = rows[0];

    // Send email to viewer
    const subject = `Re: Your Portfolio message regarding "${messageObj.purpose}"`;
    const text = `Hello,\n\nHere is the reply to your message regarding: "${messageObj.purpose}":\n\n${reply_content}\n\nThanks,\nNavycut Portfolio`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #0d0d0d; color: #fff;">
        <h2 style="color: #00ff88; text-align: center;">Navycut's Reply</h2>
        <hr style="border: 0; height: 1px; background: #00ff88; margin: 20px 0;"/>
        <p>Hello,</p>
        <p>This is a reply from Navycut regarding your portfolio message:</p>
        <div style="margin: 20px 0; padding: 15px; border-radius: 5px; background: rgba(255, 255, 255, 0.05); border-left: 4px solid #00ff88; font-style: italic;">
          "${messageObj.description}"
        </div>
        <p><strong>Reply:</strong></p>
        <div style="margin: 20px 0; padding: 15px; border-radius: 5px; background: rgba(0, 255, 136, 0.05); border-left: 4px solid #00ff88; white-space: pre-wrap;">
          ${reply_content}
        </div>
        <br/>
        <p>Best Regards,</p>
        <p><strong>Navycut Dehury</strong></p>
      </div>
    `;

    const emailRes = await dispatchEmail({ to: messageObj.sender_email, subject, text, html });
    if (emailRes.success) {
      // Mark as replied/read
      await query('UPDATE messages SET is_read = TRUE WHERE id = ?', [id]);
      res.json({ success: true, message: 'Reply sent successfully to viewer email!' });
    } else {
      res.status(500).json({ message: 'Failed to dispatch email.', error: emailRes.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// DOCUMENT ACCESS PERMISSIONS ENDPOINTS
// ==========================================

// 1. Viewer submits a request for a document
app.post('/api/document-requests', async (req, res) => {
  const { viewer_name, viewer_email, purpose, document_id, document_name } = req.body;
  if (!viewer_name || !viewer_email || !document_id || !document_name) {
    return res.status(400).json({ message: 'Name, Email, Document ID and Name are required' });
  }

  try {
    // Save to DB
    await query(`
      INSERT INTO document_requests (viewer_name, viewer_email, purpose, document_id, document_name)
      VALUES (?, ?, ?, ?, ?)
    `, [viewer_name, viewer_email, purpose || null, document_id, document_name]);

    // Send notification email to owner
    const [ownerRows] = await query('SELECT email FROM owner_profile LIMIT 1');
    const ownerEmail = ownerRows[0]?.email || 'navycutdehury@gmail.com';

    const subject = `[Access Request] Viewer requesting document permission`;
    const text = `Viewer ${viewer_name} (${viewer_email}) is requesting permission to view: "${document_name}".\nPurpose: ${purpose || 'No purpose specified'}.\n\nPlease review it in your Owner Dashboard.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d0d0d; color: #fff; border-radius: 8px;">
        <h3 style="color: #00ff88;">Document Access Request</h3>
        <hr style="border:0; height:1px; background:#00ff88;"/>
        <p><strong>Viewer:</strong> ${viewer_name} (${viewer_email})</p>
        <p><strong>Requested File:</strong> ${document_name}</p>
        <p><strong>Purpose:</strong> ${purpose || 'N/A'}</p>
        <p>Go to your Owner Dashboard to Approve or Decline this request.</p>
      </div>
    `;

    dispatchEmail({ to: ownerEmail, subject, text, html }).catch(err => console.error('Alert email error:', err.message));

    res.json({ success: true, message: 'Access request sent successfully! The owner will review it.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Owner fetches requests (Authenticated)
app.get('/api/document-requests', authenticateToken, async (req, res) => {
  try {
    const [rows] = await query('SELECT * FROM document_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Owner approves request (Authenticated)
app.post('/api/document-requests/:id/approve', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

  try {
    const [reqRows] = await query('SELECT * FROM document_requests WHERE id = ?', [id]);
    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    const request = reqRows[0];

    await query('UPDATE document_requests SET status = "Approved", access_token = ? WHERE id = ?', [otp, id]);

    // Send email to viewer
    const subject = `[APPROVED] Access granted to view: ${request.document_name}`;
    const text = `Hello ${request.viewer_name},\n\nYour request to view "${request.document_name}" has been approved!\n\nUse this 6-digit Access Token to verify your access:\n\nVerification Token: ${otp}\n\nThanks,\nPortfolio Administration`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0d0d0d; color: #fff; border-radius: 8px; max-width: 500px; margin: auto;">
        <h3 style="color: #00ff88; text-align: center;">Access Approved!</h3>
        <hr style="border:0; height:1px; background:#00ff88;"/>
        <p>Hello ${request.viewer_name},</p>
        <p>Your request to view the document <strong>"${request.document_name}"</strong> has been approved by the owner.</p>
        <p>Use the following 6-digit verification code on the portfolio website to view the file:</p>
        <div style="text-align: center; margin: 25px 0;">
          <span style="font-size: 26px; font-weight: bold; color: #00ff88; border: 2px dashed #00ff88; padding: 10px 20px; border-radius: 4px; background: rgba(0, 255, 136, 0.05);">${otp}</span>
        </div>
        <p>Thanks,</p>
        <p>Navycut Portfolio Admin</p>
      </div>
    `;

    dispatchEmail({ to: request.viewer_email, subject, text, html }).catch(err => console.error('Approval email error:', err.message));

    res.json({ success: true, message: 'Request approved and access token sent to viewer!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Owner declines request (Authenticated)
app.post('/api/document-requests/:id/decline', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [reqRows] = await query('SELECT * FROM document_requests WHERE id = ?', [id]);
    if (reqRows.length === 0) {
      return res.status(404).json({ message: 'Request not found.' });
    }
    const request = reqRows[0];

    await query('UPDATE document_requests SET status = "Rejected" WHERE id = ?', [id]);

    // Send email to viewer
    const subject = `[DECLINED] Access request for: ${request.document_name}`;
    const text = `Hello ${request.viewer_name},\n\nWe regret to inform you that your request to view "${request.document_name}" has been declined by the owner.\n\nThanks,\nPortfolio Administration`;

    dispatchEmail({ to: request.viewer_email, subject, text }).catch(err => console.error('Decline email error:', err.message));

    res.json({ success: true, message: 'Request declined.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Owner deletes access request (Authenticated)
app.delete('/api/document-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM document_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Access request deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Viewer verifies Access Token and retrieves document URL
app.post('/api/document-requests/verify', async (req, res) => {
  const { email, token, document_id } = req.body;
  if (!email || !token || !document_id) {
    return res.status(400).json({ message: 'Email, Verification Token, and Document ID are required' });
  }

  try {
    // Check if approved request exists
    const [rows] = await query(`
      SELECT * FROM document_requests 
      WHERE viewer_email = ? AND access_token = ? AND document_id = ? AND status = "Approved" 
      LIMIT 1
    `, [email, token, document_id]);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Verification failed. Either email/token is invalid or request is not approved yet.' });
    }

    // Access granted! Resolve the file path based on the document_id
    let fileUrl = null;

    if (document_id.startsWith('edu_')) {
      const parts = document_id.split('_'); // edu, id, fieldType
      const id = parseInt(parts[1]);
      const fieldType = parts[2];

      const [eduRows] = await query('SELECT * FROM education WHERE id = ?', [id]);
      if (eduRows.length > 0) {
        const edu = eduRows[0];
        if (fieldType === 'cert10') fileUrl = edu.certificate_10th;
        else if (fieldType === 'cert12') fileUrl = edu.certificate_12th;
        else if (fieldType === 'marks12') fileUrl = edu.marksheet_12th;
        else if (fieldType === 'certbach') fileUrl = edu.certificate_bachelor;
        else if (fieldType === 'gradesbach') fileUrl = edu.gradesheet_bachelor;
        else if (fieldType === 'certothers') fileUrl = edu.certificate_others;
        else if (fieldType === 'marksothers') fileUrl = edu.marksheet_others;
      }
    } else if (document_id.startsWith('cert_')) {
      const parts = document_id.split('_'); // cert, id
      const id = parseInt(parts[1]);

      const [certRows] = await query('SELECT credential_url FROM certificates WHERE id = ?', [id]);
      if (certRows.length > 0) {
        fileUrl = certRows[0].credential_url;
      }
    }

    if (!fileUrl) {
      return res.status(404).json({ message: 'Document file not found in databases.' });
    }

    res.json({ success: true, document_url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler Middleware to prevent crashes
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ROUTE ERROR]', err.message);
  res.status(500).json({ 
    message: err.message || 'An unhandled internal server error occurred.' 
  });
});

// Start Server - Database initialized BEFORE listening
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
    });

    // Handle port already in use error gracefully
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use! Another backend process is already running.`);
        console.error(`Run this command to stop it first:\n  Windows: netstat -ano | findstr :${PORT} (then taskkill /F /PID <PID>)`);
        process.exit(1);
      } else {
        console.error('Server error:', err.message);
        process.exit(1);
      }
    });

    // Graceful shutdown on CTRL+C or process termination
    const shutdown = () => {
      console.log('Shutting down backend server gracefully...');
      server.close(() => {
        console.log('Server closed. Goodbye!');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

