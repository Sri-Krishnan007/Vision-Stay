from pymongo import MongoClient

# MongoDB Atlas URI
MONGO_URI = "mongodb+srv://srikrish2705guru_db_user:4Sm3yX1gtSoNZLJP@visionstay-updated.7jknq8a.mongodb.net/?appName=VisionStay-updated"

# Connect to MongoDB
client = MongoClient(MONGO_URI)

# Select database
db = client["visionstay_db"]

# Select collection
admins_col = db["admins"]

# Admin document
admin_data = {
    "username": "admin",
    "password": "admin123",
    "role": "admin"
}

# Check if admin already exists
existing_admin = admins_col.find_one({"username": "admin"})

if existing_admin:
    print("Admin already exists.")
else:
    admins_col.insert_one(admin_data)
    print("Admin created successfully.")

# Close connection
client.close()
