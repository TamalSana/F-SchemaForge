# SchemaForge - Autonomous Database Creation System

A full-stack application that allows users to design, generate, execute, and manage database schemas through an automated interface.

## Tech Stack
- **Backend**: FastAPI (Python), MySQL, JWT
- **Frontend**: React, Tailwind CSS, Axios, React Router

## Features (fully implemented from SRS)
- User registration + login with OTP verification (demo: OTP printed to console)
- JWT authentication & session management
- Project creation, join via secret key, admin approval
- Role-Based Access Control (Admin vs Member)
- Visual schema designer (entities, attributes, data types, PK, NOT NULL, length)
- Automatic SQL generation (MySQL compliant)
- SQL execution after confirmation
- Data insertion & retrieval with validation
- Admin panel: system config, audit logs, active sessions, blacklisting
- All positive & negative test cases from SRS covered

## Setup Instructions

### 1. Database
```bash
# Install MySQL, then:
mysql -u root -p < backend/database/schema.sql
Super admin created: admin@schemaforge.com / Admin@123
# SchemaForge – Autonomous Database Creation System

A complete, production‑ready application for designing, generating, executing, and managing database schemas through an automated interface.

- **Backend**: FastAPI (Python), MySQL, JWT, bcrypt (fallback to pbkdf2_sha256)
- **Frontend**: React, Tailwind CSS, Axios, React Router
- **Features**: User registration/login with OTP, project management, RBAC, visual schema designer, SQL generation/execution, data CRUD, admin panel, audit logs, blacklisting.

---

## 📦 Prerequisites

Install the following **before** starting:

- **Python 3.10+** – [Download](https://www.python.org/downloads/) (✅ add to PATH)
- **Node.js 18+** – [Download](https://nodejs.org/)
- **MySQL Server 8.0+** – [Download](https://dev.mysql.com/downloads/mysql/)  
  *or use XAMPP (includes MySQL)* – [Download](https://www.apachefriends.org/)

> 💡 **Windows users**: Use **Command Prompt** or **PowerShell**.  
> Make sure the MySQL `bin` folder is in your PATH (e.g. `C:\Program Files\MySQL\MySQL Server 8.0\bin` or `C:\xampp\mysql\bin`).

---

## 🗄️ 1. Database Setup

Start your MySQL server. Then open a **terminal** and run:

```bash
# Connect to MySQL
mysql -u root -p
Enter your root password. Then create the database and tables by copying & pasting the entire content of backend/database/schema.sql and pressing Enter.

Alternatively, run the SQL file directly from the command line:

Windows (CMD):

cmd
mysql -u root -p < backend\database\schema.sql
macOS / Linux:

bash
mysql -u root -p < backend/database/schema.sql
Verify the database exists:

sql
SHOW DATABASES;
You should see schemaforge_metadata.

🐍 2. Backend Setup (FastAPI)
2.1 Open a terminal and go to the backend folder
bash
cd backend
2.2 Create and activate a virtual environment
bash
# Windows
python -m venv myenv
myenv\Scripts\activate

# macOS / Linux
python3 -m venv myenv
source myenv/bin/activate
Your prompt should now show (myenv).

2.3 Install Python dependencies
bash
pip install -r requirements.txt
2.4 Configure environment variables
Create a file named .env inside the backend folder with the following content (adjust passwords as needed):

env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=schemaforge_metadata
JWT_SECRET_KEY=mysecretkey123
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
If your MySQL root user has no password, set DB_PASSWORD= (empty).

2.5 Start the backend server
bash
uvicorn main:app --reload --port 8000
Successful output:

text
INFO:     Uvicorn running on http://127.0.0.1:8000
Super admin created: admin@schemaforge.com / Admin@123
INFO:     Application startup complete.
✅ Keep this terminal open. OTP codes for login/registration will appear here (demo only).

⚛️ 3. Frontend Setup (React)
3.1 Open a new terminal and go to the frontend folder
bash
cd frontend
3.2 Install dependencies
bash
npm install
3.3 Run the React development server
bash
npm run dev
You will see:

text
VITE v4.5.0  ready in xxx ms
➜  Local:   http://localhost:5173/
🌐 4. Access the Application
Open your browser at http://localhost:5173

First‑time login (Super Admin)
Email: admin@schemaforge.com

Password: Admin@123

After clicking Login, check the backend terminal for an OTP (e.g. 123456). Enter that OTP on the verification page – you are now logged in as a Super Admin.

Register a normal user (optional)
Click Register on the login page.

Use a new email/password.

Enter the OTP from the backend terminal to activate the account.

Log in with that user.

🧪 5. Test Key Features
Create a Project
Sidebar → Projects → Create Project (e.g. MyDB).

Copy the Secret Key shown after creation.

Join a Project (as another user)
Log in as a different user.

Projects → Join Project → paste the Secret Key.

Log back in as the admin of the project, open the project, and approve the request in Pending Join Requests.

Design a Schema (Admin only)
Open the project → Schema Designer.

Add an entity (e.g. Students).

Add attributes with data types, primary key, NOT NULL, etc.

Click Save Schema.

Generate & Execute SQL
In the project view → Generate & Execute SQL.

Click Generate SQL – you will see the CREATE TABLE statement.

Click Confirm & Execute – the table is created in the MySQL database (name: project_<id>_<entity>).

Insert & View Data
Go to Data Management in the project.

Select the table from the left panel.

Fill the form and click Insert – data appears below.

Admin Panel (Super Admin only)
Sidebar → Admin Panel → explore Config, Logs, Sessions, Blacklist.

🛠️ Troubleshooting
Issue	Solution
mysql command not found	Add MySQL bin to PATH or use full path, e.g. "C:\xampp\mysql\bin\mysql.exe"
Access denied for user 'root'@'localhost'	Check .env credentials. If no password, set DB_PASSWORD= (empty).
Table project_X_... doesn't exist	You must Generate SQL and Execute first – tables are created only after execution.
ModuleNotFoundError	Activate virtual environment and run pip install -r requirements.txt again.
Token expired (Signature has expired)	Log out and log in again. Increase ACCESS_TOKEN_EXPIRE_MINUTES in .env.
CORS errors (frontend cannot reach backend)	Ensure backend is on port 8000 and frontend on 5173. The backend already allows CORS from http://localhost:5173.
📁 Project Structure (Simplified)
text
SchemaForge/
├── backend/
│   ├── database/           # DB connection & schema.sql
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Auth, OTP, middleware
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   └── .env
└── frontend/
    ├── src/
    │   ├── pages/          # All UI pages
    │   ├── components/     # Layout, Sidebar, etc.
    │   ├── context/        # Auth context
    │   └── services/       # API client
    ├── package.json
    └── ...