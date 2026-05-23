const db = require('../config/database');

class Chat {
    static async findOrCreate(user1Id, user2Id) {
        // Find existing chat
        const [existing] = await db.execute(`
            SELECT * FROM chats 
            WHERE (user1_id = ? AND user2_id = ?) 
            OR (user1_id = ? AND user2_id = ?)
        `, [user1Id, user2Id, user2Id, user1Id]);
        
        if (existing.length > 0) {
            return existing[0];
        }
        
        // Create new chat
        const [result] = await db.execute(
            'INSERT INTO chats (user1_id, user2_id) VALUES (?, ?)',
            [Math.min(user1Id, user2Id), Math.max(user1Id, user2Id)]
        );
        
        return { id: result.insertId, user1_id: user1Id, user2_id: user2Id };
    }
    
    static async getUserChats(userId) {
        const [rows] = await db.execute(`
            SELECT 
                c.id,
                c.updated_at,
                CASE 
                    WHEN c.user1_id = ? THEN u2.id 
                    ELSE u1.id 
                END as other_user_id,
                CASE 
                    WHEN c.user1_id = ? THEN u2.full_name 
                    ELSE u1.full_name 
                END as other_user_name,
                CASE 
                    WHEN c.user1_id = ? THEN u2.status 
                    ELSE u1.status 
                END as other_user_status,
                (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE chat_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
            FROM chats c
            JOIN users u1 ON c.user1_id = u1.id
            JOIN users u2 ON c.user2_id = u2.id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.updated_at DESC
        `, [userId, userId, userId, userId, userId, userId]);
        
        return rows;
    }
}

module.exports = Chat;