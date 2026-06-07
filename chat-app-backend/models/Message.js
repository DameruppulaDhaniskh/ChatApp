const db = require('../config/database');

class Message {
    static async create(messageData) {
        const { chat_id, sender_id, content, sentiment } = messageData;

        const [result] = await db.execute(
            'INSERT INTO messages (chat_id, sender_id, content, sentiment) VALUES (?, ?, ?, ?)',
            [chat_id, sender_id, content, sentiment || 'neutral']
        );

        // Update chat's updated_at
        await db.execute(
            'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [chat_id]
        );

        return result.insertId;
    }

    static async getChatMessages(chatId, limit = 50) {
        const [rows] = await db.execute(`
            SELECT 
                m.id,
                m.content,
                m.sender_id,
                m.is_read,
                m.created_at,
                m.sentiment,
                u.full_name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.chat_id = ?
            ORDER BY m.created_at ASC
            LIMIT ?
        `, [chatId, limit]);

        return rows;
    }

    static async markAsRead(chatId, userId) {
        await db.execute(
            'UPDATE messages SET is_read = TRUE WHERE chat_id = ? AND sender_id != ?',
            [chatId, userId]
        );
    }
}

module.exports = Message;