const mysql = require('mysql2/promise');

const passwords = [
  'Navy@0013',
  'Navy@1234',
  'navy',
  '',
  'root',
  'admin',
  'password',
  '1234',
  '123456',
  'mysql'
];

async function check() {
  for (const pw of passwords) {
    try {
      console.log(`Trying MySQL connection with password: "${pw}"...`);
      const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: pw
      });
      console.log(`\n=============================================`);
      console.log(`SUCCESS! Connected successfully with password: "${pw}"`);
      console.log(`=============================================\n`);
      await connection.end();
      return;
    } catch (err) {
      console.log(`Failed with password: "${pw}". Error code: ${err.code}`);
    }
  }
  console.log('\nCould not connect with any common password.');
}

check();
