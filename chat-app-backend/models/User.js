const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const { full_name, username, password } = userData;
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            'INSERT INTO users (full_name, username, password) VALUES (?, ?, ?)',
            [full_name, username, hashedPassword]
        );

        return result.insertId;
    }

    static async findByUsername(username) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, full_name, username, status, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async getAllUsers(excludeId) {
        const [rows] = await db.execute(
            'SELECT id, full_name, username, status FROM users WHERE id != ?',
            [excludeId]
        );
        return rows;
    }

    static async updateStatus(userId, status) {
        await db.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, userId]
        );
    }

    static async validatePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

module.exports = User;