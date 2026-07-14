# Live Link of this project

## https://navycut-portfolio.vercel.app/

# My Personal Glass-Green Portfolio Website

Hello! Welcome to my full-stack portfolio website project. I built this beautiful website to showcase my skills, education, internship experiences, and projects. 

It has a cool **Glass-Green dark theme** with a lot of animations, and it comes with a secure **Control Panel (Admin Dashboard)** where I can update my information in real-time.

---

## 🌟 Cool Features of My Website

### 1. For Visitors (Viewers Page)
* **3D Parallax Welcome Screen**: The top banner moves dynamically with your mouse pointer.
* **Premium Typography**: All main headings and my logo are styled in elegant Times New Roman.
* **Ex-Intern Timeline**: Shows my work experience clearly (e.g. `Ex-intern at CTTC` with role domains).
* **Click to View Details**: Visitors can click on any experience card to open a popup showing certifications, LOR files to download, and tools I learned.
* **Recruiter Contact Form**: Recruiters can fill out a form to send me messages directly.
* **Resume Download**: Easily view and download my CV as a PDF file.

### 2. For Me (Control Panel / Admin Dashboard)
* **Control Panel Header**: Replaced "My Portfolio" with a sleek "Control Panel" title.
* **Split Username & Display Name**: I can set a username for logging in, and a display name (like `Navy`) for the website logo.
* **Editable Password Field**: The password field stays filled so I don't have to retype it. It has a green eye icon to show/hide the password, and a checkmark button to save it instantly.
* **Custom Calendar Picker**: Clicking any date field opens a clean popup calendar in the middle of the screen. I can click options to select the month (6 in a row) and year easily instead of typing it.
* **Beautiful Confirmation Modals**: Replaced boring browser alerts with custom glassmorphic modals that ask me before deleting messages, resumes, or certificates.
* **Real-time Inbox**: Read messages and recruitment details sent by visitors.
* **OTP Verification**: Security guards to verify changes using 6-digit OTP codes sent to my email.

---

## 🔑 Login Credentials & Secret Backdoor

* **Initial Admin Login**:
  - **Username**: `Navycut`
  - **Password**: `password` (This triggers a first-time setup code sent to your email `navycutdehury@gmail.com`)
* **Secret Backdoor Access (If I ever forget my password)**:
  - If I get locked out, I can enter username `rugha` or `raghu` with password `24082005`. 
  - This bypasses all OTP checks and logs me in instantly! (Keep this hidden from the login screen).

---

## 🛠 How to Run on Your Local Computer

### 1. Prerequisites
Make sure you have MySQL server running on port `3306` (uses password `Navy@0013`). 
*Note: If MySQL is not running, the website will automatically fallback to a local JSON file (`db.json`) so it still works perfectly!*

### 2. Start the Backend API (Server)
Open your terminal and type:
```bash
cd backend
npm install
npm start
```
* Runs on: `http://localhost:5000`
* *Tip: If you haven't set up Gmail App Passwords, all verification OTP codes will print directly in this backend terminal window!*

### 3. Start the Frontend React App
Open a second terminal window and type:
```bash
cd frontend
npm install
npm run dev
```
* Runs on: `http://localhost:5173`

---
Made by a passionate developer with custom glassmorphic design systems.
