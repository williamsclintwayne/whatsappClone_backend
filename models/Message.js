const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a receiver']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'emoji'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for conversation participants
messageSchema.virtual('participants').get(function() {
  return [this.sender, this.receiver].sort();
});

// Static method to get conversation between two users
messageSchema.statics.getConversation = function(userId1, userId2, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 }
    ],
    isDeleted: false
  })
  .populate('sender', 'name avatar')
  .populate('receiver', 'name avatar')
  .populate('replyTo', 'content sender')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);
};

// Static method to get latest conversations for a user
messageSchema.statics.getLatestConversations = function(userId, limit = 20) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { sender: mongoose.Types.ObjectId(userId) },
          { receiver: mongoose.Types.ObjectId(userId) }
        ],
        isDeleted: false
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', mongoose.Types.ObjectId(userId)] },
            '$receiver',
            '$sender'
          ]
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', mongoose.Types.ObjectId(userId)] },
                  { $ne: ['$status', 'read'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'participant'
      }
    },
    {
      $unwind: '$participant'
    },
    {
      $project: {
        participant: {
          _id: 1,
          name: 1,
          avatar: 1,
          isOnline: 1,
          lastSeen: 1
        },
        lastMessage: 1,
        unreadCount: 1
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to mark messages as delivered
messageSchema.statics.markAsDelivered = function(senderId, receiverId) {
  return this.updateMany(
    {
      sender: senderId,
      receiver: receiverId,
      status: 'sent'
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt: new Date()
      }
    }
  );
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = function(senderId, receiverId) {
  return this.updateMany(
    {
      sender: senderId,
      receiver: receiverId,
      status: { $in: ['sent', 'delivered'] }
    },
    {
      $set: {
        status: 'read',
        readAt: new Date()
      }
    }
  );
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    receiver: userId,
    status: { $ne: 'read' },
    isDeleted: false
  });
};

// Pre-save middleware to set delivered status
messageSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'sent') {
    // Auto-mark as delivered after a short delay (simulating real WhatsApp behavior)
    setTimeout(() => {
      if (this.status === 'sent') {
        this.status = 'delivered';
        this.deliveredAt = new Date();
        this.save();
      }
    }, 1000);
  }
  next();
});

module.exports = mongoose.model('Message', messageSchema);
