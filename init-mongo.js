db = db.getSiblingDB("sha");

// Create app user with restricted privileges
db.createUser({
  user: "app_user",
  pwd: process.env.MONGO_APP_PASSWORD || "changeme",
  roles: [
    {
      role: "readWrite",
      db: "sha"
    }
  ]
});

// Create collections with indexes for common queries
db.createCollection("users");
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.createCollection("properties");
db.properties.createIndex({ landlordId: 1 });
db.properties.createIndex({ location: "2dsphere" });

db.createCollection("bookings");
db.bookings.createIndex({ studentId: 1 });
db.bookings.createIndex({ propertyId: 1 });
db.bookings.createIndex({ createdAt: -1 });

db.createCollection("messages");
db.messages.createIndex({ senderId: 1 });
db.messages.createIndex({ recipientId: 1 });
db.messages.createIndex({ createdAt: -1 });

console.log("SHA database initialized with collections and indexes");
