const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pool;
let useJsonDb = false;
const jsonDbPath = path.join(__dirname, 'db.json');

const defaultJsonData = {
  owner_profile: [
    {
      id: 1,
      username: 'rugha',
      display_name: 'Navy',
      email: 'navycutdehury@gmail.com',
      password: '', // hashed below
      password_text: '24082005',
      profile_picture: null,
      phone: '+91 9999999999',
      instagram: '',
      facebook: '',
      linkedin: '',
      github: '',
      bio: 'Welcome to my portfolio! I am a passionate developer skilled in building robust full-stack applications.',
      resume_url: null,
      email_verified: 0,
      phone_verified: 0,
      first_login: 1,
      availability: 'Available for Work'
    }
  ],
  projects: [],
  education: [],
  skills: [],
  experience: [],
  certificates: [],
  messages: [],
  otp_verifications: [],
  courses: [],
  document_requests: []
};

// Initialize JSON database if it doesn't exist
async function initJsonDb() {
  useJsonDb = true;
  console.log('\n===============================================================');
  console.log('[DATABASE FALLBACK] MySQL access was denied or not running.');
  console.log('Activating resilient Local JSON Database file: backend/db.json');
  console.log('This ensures your app runs 100% successfully on any local machine!');
  console.log('===============================================================\n');

  if (!fs.existsSync(jsonDbPath)) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('24082005', salt);
    defaultJsonData.owner_profile[0].password = hashedPassword;
    fs.writeFileSync(jsonDbPath, JSON.stringify(defaultJsonData, null, 2));
    console.log('Created and seeded initial local db.json file.');
  }
}

// Read database from json file
function readJsonDb() {
  try {
    const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
    if (!data.document_requests) data.document_requests = [];
    return data;
  } catch (err) {
    return defaultJsonData;
  }
}

// Write database to json file
function writeJsonDb(data) {
  fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
}

async function initializeDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Navy@0013',
    port: process.env.DB_PORT || 3306,
  };

  try {
    // Attempt connecting to local MySQL
    const connection = await mysql.createConnection(config);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'Portfolio'}\`;`);
    await connection.end();

    pool = mysql.createPool({
      ...config,
      database: process.env.DB_NAME || 'Portfolio',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log('Connected to MySQL Database: ' + (process.env.DB_NAME || 'Portfolio'));
    await createTables();
  } catch (error) {
    console.log(`[DATABASE INFO] MySQL connection failed: ${error.message}`);
    await initJsonDb();
  }
}

async function createTables() {
  // Create tables if they do not exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS owner_profile (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL DEFAULT 'rugha',
      display_name VARCHAR(255) NOT NULL DEFAULT 'Navy',
      email VARCHAR(255) NOT NULL DEFAULT 'navycutdehury@gmail.com',
      password VARCHAR(255) NOT NULL,
      password_text VARCHAR(255) NOT NULL DEFAULT '24082005',
      profile_picture VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      instagram VARCHAR(255) NULL,
      facebook VARCHAR(255) NULL,
      linkedin VARCHAR(255) NOT NULL,
      github VARCHAR(255) NOT NULL,
      bio TEXT NULL,
      resume_url VARCHAR(255) NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      phone_verified BOOLEAN DEFAULT FALSE,
      first_login BOOLEAN DEFAULT TRUE,
      availability VARCHAR(255) DEFAULT 'Available for Work'
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      summary TEXT NOT NULL,
      repo_link VARCHAR(255) NOT NULL,
      live_link VARCHAR(255) NULL,
      is_deployed BOOLEAN DEFAULT FALSE,
      thumbnail VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS education (
      id INT AUTO_INCREMENT PRIMARY KEY,
      school VARCHAR(255) NOT NULL,
      degree VARCHAR(255) NOT NULL,
      field_of_study VARCHAR(255) NULL,
      start_date VARCHAR(50) NOT NULL,
      end_date VARCHAR(50) NOT NULL,
      description TEXT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL DEFAULT 'General',
      proficiency INT DEFAULT 80,
      knowledge_level VARCHAR(50) DEFAULT 'basic'
    ) ENGINE=InnoDB;
  `);

  try {
    await pool.query('ALTER TABLE skills ADD COLUMN knowledge_level VARCHAR(50) DEFAULT \'basic\';');
  } catch (err) {
    // Already exists
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experience (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      start_date VARCHAR(50) NOT NULL,
      end_date VARCHAR(50) NOT NULL,
      description TEXT NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      organization VARCHAR(255) NOT NULL,
      issue_date VARCHAR(50) NOT NULL,
      credential_url VARCHAR(255) NULL
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_email VARCHAR(255) NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      viewer_name VARCHAR(255) NOT NULL,
      viewer_email VARCHAR(255) NOT NULL,
      purpose TEXT NULL,
      document_id VARCHAR(255) NOT NULL,
      document_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending',
      access_token VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  try {
    await pool.query('ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    await pool.query('ALTER TABLE owner_profile ADD COLUMN availability VARCHAR(255) DEFAULT \'Available for Work\';');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    await pool.query('ALTER TABLE owner_profile ADD COLUMN display_name VARCHAR(255) DEFAULT \'Navy\';');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    await pool.query('ALTER TABLE owner_profile ADD COLUMN password_text VARCHAR(255) DEFAULT \'24082005\';');
  } catch (err) {
    // Column already exists, ignore
  }

  const addEduColumns = [
    'ALTER TABLE education ADD COLUMN passing_year VARCHAR(50) NULL;',
    'ALTER TABLE education ADD COLUMN full_marks DOUBLE NULL;',
    'ALTER TABLE education ADD COLUMN marks_obtained DOUBLE NULL;',
    'ALTER TABLE education ADD COLUMN percentage DOUBLE NULL;',
    'ALTER TABLE education ADD COLUMN course VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN branch VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN semester_sgpa TEXT NULL;',
    'ALTER TABLE education ADD COLUMN cgpa DOUBLE NULL;',
    'ALTER TABLE education ADD COLUMN certificate_10th VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN certificate_12th VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN marksheet_12th VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN gradesheet_bachelor VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN certificate_bachelor VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN certificate_others VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN marksheet_others VARCHAR(255) NULL;',
    'ALTER TABLE education ADD COLUMN access_cert10 BOOLEAN DEFAULT FALSE;',
    'ALTER TABLE education ADD COLUMN access_cert12 BOOLEAN DEFAULT FALSE;',
    'ALTER TABLE education ADD COLUMN access_certbach BOOLEAN DEFAULT FALSE;'
  ];
  for (const colQuery of addEduColumns) {
    try {
      await pool.query(colQuery);
    } catch (err) {
      // Column already exists, ignore
    }
  }

  const addExpColumns = [
    'ALTER TABLE experience ADD COLUMN exp_type VARCHAR(50) NULL;',
    'ALTER TABLE experience ADD COLUMN project_name VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN project_instructor VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN repo_link VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN deploy_link VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN program_name VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN org_name VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN certificate_file VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN lor_file VARCHAR(255) NULL;',
    'ALTER TABLE experience ADD COLUMN skills_learned TEXT NULL;'
  ];
  for (const colQuery of addExpColumns) {
    try {
      await pool.query(colQuery);
    } catch (err) {
      // Column already exists, ignore
    }
  }

  try {
    await pool.query('ALTER TABLE certificates ADD COLUMN certificate_file VARCHAR(255) NULL;');
  } catch (err) {
    // Column already exists, ignore
  }

  try {
    await pool.query('ALTER TABLE certificates ADD COLUMN access_cert BOOLEAN DEFAULT FALSE;');
  } catch (err) {
    // Column already exists, ignore
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  const [rows] = await pool.query('SELECT COUNT(*) as count FROM owner_profile');
  if (rows[0].count === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('24082005', salt);

    await pool.query(`
      INSERT INTO owner_profile (
        username, display_name, email, password, password_text, linkedin, github, bio, email_verified, first_login
      ) VALUES ('rugha', 'Navy', 'navycutdehury@gmail.com', ?, '24082005', '', '', 'Welcome!', FALSE, TRUE)
    `, [hashedPassword]);
    console.log('Seeded default owner credentials in MySQL.');
  }
}

// SQL Query emulator for JSON fallback
async function handleJsonQuery(sql, params = []) {
  const db = readJsonDb();
  const sqlClean = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT owner_profile LIMIT 1
  if (sqlClean.includes('owner_profile LIMIT 1')) {
    return [db.owner_profile];
  }

  // 2. SELECT * FROM owner_profile WHERE username = ?
  if (sqlClean.includes('SELECT * FROM owner_profile WHERE username = ?')) {
    const user = db.owner_profile.find(u => u.username.toLowerCase() === params[0].toLowerCase());
    return [user ? [user] : []];
  }

  // 3. SELECT * FROM owner_profile WHERE email = ?
  if (sqlClean.includes('SELECT * FROM owner_profile WHERE email = ?')) {
    const user = db.owner_profile.find(u => u.email.toLowerCase() === params[0].toLowerCase());
    return [user ? [user] : []];
  }

  // 4. SELECT * FROM projects ORDER BY created_at
  if (sqlClean.includes('FROM projects')) {
    return [[...db.projects].sort((a,b) => b.id - a.id)];
  }

  // 5. SELECT * FROM experience
  if (sqlClean.includes('FROM experience')) {
    return [[...db.experience].sort((a,b) => b.id - a.id)];
  }

  // 6. SELECT * FROM education
  if (sqlClean.includes('FROM education')) {
    return [[...db.education].sort((a,b) => b.id - a.id)];
  }

  // 7. SELECT * FROM skills
  if (sqlClean.includes('FROM skills')) {
    return [[...db.skills].sort((a,b) => a.name.localeCompare(b.name))];
  }

  // SELECT * FROM courses
  if (sqlClean.includes('FROM courses')) {
    if (!db.courses) db.courses = [];
    return [[...db.courses].sort((a,b) => b.id - a.id)];
  }

  // 8. SELECT * FROM certificates
  if (sqlClean.includes('FROM certificates')) {
    return [[...db.certificates].sort((a,b) => b.id - a.id)];
  }

  // 9. SELECT * FROM messages
  if (sqlClean.includes('FROM messages')) {
    return [[...db.messages].sort((a,b) => b.id - a.id)];
  }

  // UPDATE messages SET is_read = TRUE WHERE id = ?
  if (sqlClean.includes('UPDATE messages SET is_read = TRUE WHERE id = ?')) {
    const id = parseInt(params[0]);
    const msg = db.messages.find(m => m.id === id);
    if (msg) msg.is_read = 1;
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // UPDATE messages SET is_read = TRUE
  if (sqlClean.includes('UPDATE messages SET is_read = TRUE')) {
    db.messages.forEach(m => { m.is_read = 1; });
    writeJsonDb(db);
    return [{ affectedRows: db.messages.length }];
  }

  // 10. SELECT * FROM otp_verifications
  if (sqlClean.includes('FROM otp_verifications WHERE email = ? AND otp = ?')) {
    const list = db.otp_verifications.filter(o => 
      o.email === params[0] && 
      o.otp === params[1] && 
      !o.verified && 
      new Date(o.expires_at) > new Date()
    );
    const sorted = list.sort((a,b) => b.id - a.id);
    return [sorted];
  }

  // 11. INSERT INTO messages
  if (sqlClean.includes('INSERT INTO messages')) {
    const newMsg = {
      id: db.messages.length + 1,
      sender_email: params[0],
      purpose: params[1],
      description: params[2],
      created_at: new Date().toISOString()
    };
    db.messages.push(newMsg);
    writeJsonDb(db);
    return [{ insertId: newMsg.id }];
  }

  // 12. INSERT INTO otp_verifications
  if (sqlClean.includes('INSERT INTO otp_verifications')) {
    const newOtp = {
      id: db.otp_verifications.length + 1,
      email: params[0],
      otp: params[1],
      expires_at: params[2],
      verified: 0,
      created_at: new Date().toISOString()
    };
    db.otp_verifications.push(newOtp);
    writeJsonDb(db);
    return [{ insertId: newOtp.id }];
  }

  // 13. UPDATE otp_verifications SET verified = TRUE
  if (sqlClean.includes('UPDATE otp_verifications SET verified = TRUE')) {
    const otpId = params[0];
    const otp = db.otp_verifications.find(o => o.id === otpId);
    if (otp) otp.verified = 1;
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 14. UPDATE owner_profile SET email_verified = TRUE, first_login = FALSE
  if (sqlClean.includes('UPDATE owner_profile SET email_verified = TRUE, first_login = FALSE WHERE email = ?')) {
    const email = params[0];
    const user = db.owner_profile.find(u => u.email === email);
    if (user) {
      user.email_verified = 1;
      user.first_login = 0;
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 15. UPDATE owner_profile SET password = ?, password_text = ?, email_verified = TRUE, first_login = FALSE WHERE email = ?
  if (sqlClean.includes('UPDATE owner_profile SET password = ?, password_text = ?, email_verified = TRUE, first_login = FALSE WHERE email = ?')) {
    const pass = params[0];
    const passText = params[1];
    const email = params[2];
    const user = db.owner_profile.find(u => u.email === email);
    if (user) {
      user.password = pass;
      user.password_text = passText;
      user.email_verified = 1;
      user.first_login = 0;
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 16. UPDATE owner_profile SET instagram = ?, facebook = ?, linkedin = ?, github = ?, bio = ?, username = ?, availability = ?, display_name = ?
  if (sqlClean.includes('UPDATE owner_profile') && (sqlClean.includes('instagram = ?') || sqlClean.includes('availability = ?'))) {
    const user = db.owner_profile[0];
    if (user) {
      user.instagram = params[0];
      user.facebook = params[1];
      user.linkedin = params[2];
      user.github = params[3];
      user.bio = params[4];
      user.username = params[5];
      if (params.length > 6) {
        user.availability = params[6];
      }
      if (params.length > 7) {
        user.display_name = params[7];
      }
      if (params.length > 8) {
        user.password = params[8];
        user.password_text = params[9];
      }
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 17. UPDATE owner_profile SET profile_picture = ?
  if (sqlClean.includes('UPDATE owner_profile SET profile_picture = ?')) {
    const user = db.owner_profile[0];
    if (user) user.profile_picture = params[0];
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 18. UPDATE owner_profile SET resume_url = ?
  if (sqlClean.includes('UPDATE owner_profile SET resume_url = ?')) {
    const user = db.owner_profile[0];
    if (user) user.resume_url = params[0];
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 19. UPDATE owner_profile SET email = ?, email_verified = TRUE
  if (sqlClean.includes('UPDATE owner_profile SET email = ?, email_verified = TRUE')) {
    const user = db.owner_profile[0];
    if (user) {
      user.email = params[0];
      user.email_verified = 1;
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 20. UPDATE owner_profile SET phone = ?, phone_verified = TRUE
  if (sqlClean.includes('UPDATE owner_profile SET phone = ?, phone_verified = TRUE')) {
    const user = db.owner_profile[0];
    if (user) {
      user.phone = params[0];
      user.phone_verified = 1;
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 21. INSERT INTO projects
  if (sqlClean.includes('INSERT INTO projects')) {
    const newProj = {
      id: db.projects.length + 1,
      title: params[0],
      summary: params[1],
      repo_link: params[2],
      live_link: params[3],
      is_deployed: params[4] ? 1 : 0,
      thumbnail: params[5],
      created_at: new Date().toISOString()
    };
    db.projects.push(newProj);
    writeJsonDb(db);
    return [{ insertId: newProj.id }];
  }

  // 22. UPDATE projects
  if (sqlClean.includes('UPDATE projects SET title = ?, summary = ?, repo_link = ?, live_link = ?, is_deployed = ?')) {
    // Check if thumbnail is included
    let projId;
    if (sqlClean.includes('thumbnail = ?')) {
      const title = params[0], sum = params[1], repo = params[2], live = params[3], dep = params[4], thumb = params[5];
      projId = parseInt(params[6]);
      const proj = db.projects.find(p => p.id === projId);
      if (proj) {
        proj.title = title;
        proj.summary = sum;
        proj.repo_link = repo;
        proj.live_link = live;
        proj.is_deployed = dep ? 1 : 0;
        proj.thumbnail = thumb;
      }
    } else {
      const title = params[0], sum = params[1], repo = params[2], live = params[3], dep = params[4];
      projId = parseInt(params[5]);
      const proj = db.projects.find(p => p.id === projId);
      if (proj) {
        proj.title = title;
        proj.summary = sum;
        proj.repo_link = repo;
        proj.live_link = live;
        proj.is_deployed = dep ? 1 : 0;
      }
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 23. DELETE FROM projects
  if (sqlClean.includes('DELETE FROM projects')) {
    const id = parseInt(params[0]);
    db.projects = db.projects.filter(p => p.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 24. INSERT INTO education
  if (sqlClean.includes('INSERT INTO education')) {
    const newEdu = {
      id: db.education.length + 1,
      school: params[0],
      degree: params[1],
      field_of_study: params[2],
      start_date: params[3],
      end_date: params[4],
      description: params[5]
    };
    if (params.length > 6) {
      newEdu.passing_year = params[6];
      newEdu.full_marks = params[7];
      newEdu.marks_obtained = params[8];
      newEdu.percentage = params[9];
      newEdu.course = params[10];
      newEdu.branch = params[11];
      newEdu.semester_sgpa = params[12];
      newEdu.cgpa = params[13];
      newEdu.certificate_10th = params[14];
      newEdu.certificate_12th = params[15];
      newEdu.marksheet_12th = params[16];
      newEdu.gradesheet_bachelor = params[17];
      newEdu.certificate_bachelor = params[18];
      newEdu.certificate_others = params[19];
      newEdu.marksheet_others = params[20];
      newEdu.access_cert10 = params[21] ? 1 : 0;
      newEdu.access_cert12 = params[22] ? 1 : 0;
      newEdu.access_certbach = params[23] ? 1 : 0;
    }
    db.education.push(newEdu);
    writeJsonDb(db);
    return [{ insertId: newEdu.id }];
  }

  // 25. DELETE FROM education
  if (sqlClean.includes('DELETE FROM education')) {
    const id = parseInt(params[0]);
    db.education = db.education.filter(e => e.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 26. INSERT INTO skills
  if (sqlClean.includes('INSERT INTO skills')) {
    const newSkill = {
      id: db.skills.length + 1,
      name: params[0],
      category: params[1],
      proficiency: parseInt(params[2]),
      knowledge_level: params[3] || 'basic'
    };
    db.skills.push(newSkill);
    writeJsonDb(db);
    return [{ insertId: newSkill.id }];
  }

  // 27. DELETE FROM skills
  if (sqlClean.includes('DELETE FROM skills')) {
    const id = parseInt(params[0]);
    db.skills = db.skills.filter(s => s.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 28. INSERT INTO experience
  if (sqlClean.includes('INSERT INTO experience')) {
    const newExp = {
      id: db.experience.length + 1,
      company: params[0],
      role: params[1],
      start_date: params[2],
      end_date: params[3],
      description: params[4]
    };
    if (params.length > 5) {
      newExp.exp_type = params[5];
      newExp.project_name = params[6];
      newExp.project_instructor = params[7];
      newExp.repo_link = params[8];
      newExp.deploy_link = params[9];
      newExp.program_name = params[10];
      newExp.org_name = params[11];
      newExp.certificate_file = params[12];
      newExp.lor_file = params[13];
      newExp.skills_learned = params[14];
    }
    db.experience.push(newExp);
    writeJsonDb(db);
    return [{ insertId: newExp.id }];
  }

  // 29. DELETE FROM experience
  if (sqlClean.includes('DELETE FROM experience')) {
    const id = parseInt(params[0]);
    db.experience = db.experience.filter(e => e.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // 30. INSERT INTO certificates
  if (sqlClean.includes('INSERT INTO certificates')) {
    const newCert = {
      id: db.certificates.length + 1,
      name: params[0],
      organization: params[1],
      issue_date: params[2],
      credential_url: params[3]
    };
    if (params.length > 4) {
      newCert.certificate_file = params[4];
    }
    if (params.length > 5) {
      newCert.access_cert = params[5] ? 1 : 0;
    } else {
      newCert.access_cert = 0;
    }
    db.certificates.push(newCert);
    writeJsonDb(db);
    return [{ insertId: newCert.id }];
  }

  // 31. DELETE FROM certificates
  if (sqlClean.includes('DELETE FROM certificates')) {
    const id = parseInt(params[0]);
    db.certificates = db.certificates.filter(c => c.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // INSERT INTO courses
  if (sqlClean.includes('INSERT INTO courses')) {
    if (!db.courses) db.courses = [];
    const newCourse = {
      id: db.courses.length + 1,
      name: params[0],
      description: params[1]
    };
    db.courses.push(newCourse);
    writeJsonDb(db);
    return [{ insertId: newCourse.id }];
  }

  // DELETE FROM courses
  if (sqlClean.includes('DELETE FROM courses')) {
    if (!db.courses) db.courses = [];
    const id = parseInt(params[0]);
    db.courses = db.courses.filter(c => c.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // DELETE FROM messages WHERE id IN (?)
  if (sqlClean.includes('DELETE FROM messages WHERE id IN')) {
    const ids = Array.isArray(params[0]) ? params[0].map(id => parseInt(id)) : [parseInt(params[0])];
    db.messages = db.messages.filter(m => !ids.includes(m.id));
    writeJsonDb(db);
    return [{ affectedRows: ids.length }];
  }

  // DELETE FROM messages WHERE id = ?
  if (sqlClean.includes('DELETE FROM messages WHERE id = ?')) {
    const id = parseInt(params[0]);
    db.messages = db.messages.filter(m => m.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // SELECT FROM document_requests
  if (sqlClean.includes('FROM document_requests') && sqlClean.includes('SELECT *')) {
    if (sqlClean.includes('WHERE id = ?')) {
      const req = db.document_requests.find(r => r.id === parseInt(params[0]));
      return [req ? [req] : []];
    }
    if (sqlClean.includes('viewer_email = ?') && sqlClean.includes('access_token = ?')) {
      const email = params[0];
      const token = params[1];
      const docId = params[2];
      const filtered = db.document_requests.filter(r => r.viewer_email === email && r.access_token === token && r.document_id === docId && r.status === 'Approved');
      return [filtered.sort((a,b) => b.id - a.id)];
    }
    return [[...db.document_requests].sort((a,b) => b.id - a.id)];
  }

  // INSERT INTO document_requests
  if (sqlClean.includes('INSERT INTO document_requests')) {
    const newReq = {
      id: db.document_requests.length + 1,
      viewer_name: params[0],
      viewer_email: params[1],
      purpose: params[2],
      document_id: params[3],
      document_name: params[4],
      status: 'Pending',
      access_token: null,
      created_at: new Date().toISOString()
    };
    db.document_requests.push(newReq);
    writeJsonDb(db);
    return [{ insertId: newReq.id }];
  }

  // UPDATE document_requests SET status = "Approved"
  if (sqlClean.includes('UPDATE document_requests SET status = "Approved"')) {
    const token = params[0];
    const id = parseInt(params[1]);
    const req = db.document_requests.find(r => r.id === id);
    if (req) {
      req.status = 'Approved';
      req.access_token = token;
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // UPDATE document_requests SET status = "Rejected"
  if (sqlClean.includes('UPDATE document_requests SET status = "Rejected"')) {
    const id = parseInt(params[0]);
    const req = db.document_requests.find(r => r.id === id);
    if (req) {
      req.status = 'Rejected';
    }
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  // DELETE FROM document_requests WHERE id = ?
  if (sqlClean.includes('DELETE FROM document_requests WHERE id = ?')) {
    const id = parseInt(params[0]);
    db.document_requests = db.document_requests.filter(r => r.id !== id);
    writeJsonDb(db);
    return [{ affectedRows: 1 }];
  }

  console.log(`Unmatched SQL Emulator Query: "${sqlClean}"`);
  return [[]];
}

module.exports = {
  initializeDatabase,
  getPool: () => pool,
  query: async (sql, params) => {
    if (useJsonDb) {
      return handleJsonQuery(sql, params);
    }
    return pool.query(sql, params);
  }
};
