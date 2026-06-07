const db = require('../config/database');

class Friendship {
    static getMinMax(id1, id2) {
        return {
            user1_id: Math.min(id1, id2),
            user2_id: Math.max(id1, id2)
        };
    }

    static async sendRequest(senderId, receiverId) {
        const { user1_id, user2_id } = this.getMinMax(senderId, receiverId);

        const [result] = await db.execute(
            'INSERT INTO friendships (user1_id, user2_id, status, sender_id) VALUES (?, ?, "pending", ?) ON DUPLICATE KEY UPDATE status="pending", sender_id=?',
            [user1_id, user2_id, senderId, senderId]
        );
        return result.insertId;
    }

    static async acceptRequest(userId1, userId2) {
        const { user1_id, user2_id } = this.getMinMax(userId1, userId2);

        await db.execute(
            'UPDATE friendships SET status = "accepted" WHERE user1_id = ? AND user2_id = ?',
            [user1_id, user2_id]
        );
    }

    static async rejectOrCancelRequest(userId1, userId2) {
        const { user1_id, user2_id } = this.getMinMax(userId1, userId2);

        await db.execute(
            'DELETE FROM friendships WHERE user1_id = ? AND user2_id = ?',
            [user1_id, user2_id]
        );
    }

    static async getFriendshipStatus(userId1, userId2) {
        const { user1_id, user2_id } = this.getMinMax(userId1, userId2);

        const [rows] = await db.execute(
            'SELECT * FROM friendships WHERE user1_id = ? AND user2_id = ?',
            [user1_id, user2_id]
        );
        return rows[0] || null;
    }

    static async getUserFriendships(userId) {
        const [rows] = await db.execute(`
            SELECT 
                f.id,
                f.status,
                f.sender_id,
                f.created_at,
                f.updated_at,
                CASE 
                    WHEN f.user1_id = ? THEN u2.id 
                    ELSE u1.id 
                END as friend_id,
                CASE 
                    WHEN f.user1_id = ? THEN u2.full_name 
                    ELSE u1.full_name 
                END as friend_name,
                CASE 
                    WHEN f.user1_id = ? THEN u2.username 
                    ELSE u1.username 
                END as friend_username,
                CASE 
                    WHEN f.user1_id = ? THEN u2.status 
                    ELSE u1.status 
                END as friend_status
            FROM friendships f
            JOIN users u1 ON f.user1_id = u1.id
            JOIN users u2 ON f.user2_id = u2.id
            WHERE f.user1_id = ? OR f.user2_id = ?
        `, [userId, userId, userId, userId, userId, userId]);
        return rows;
    }
}

module.exports = Friendship;
