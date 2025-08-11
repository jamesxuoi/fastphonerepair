const mysql = require('mysql2')
require('dotenv').config()

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fixitfast',  // Hard-coded to test
    port: 3306
})

// Test connection and database selection
connection.connect((err) => {
    if (err) {
        console.log('❌ Connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL');
        // Test if we can select the database
        connection.query('SELECT DATABASE() AS db', (err, result) => {
            if (err) {
                console.log('❌ Database selection failed:', err);
            } else {
                console.log('✅ Using database:', result[0].db);
            }
        });
    }
});

module.exports = connection