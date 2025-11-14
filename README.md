# 📱 MyPocket – Personal Finance Tracker (V1 Prototype)
**Developer:** Mohammed Atif  
**Tech Stack:** Vite + JavaScript • Supabase • Capacitor • Gemini AI

MyPocket is a modern personal finance management app built for real daily usage.  
It tracks expenses, scans receipts, processes voice entries, manages budgets, and offers predictive insights — all inside a clean, mobile-ready interface.

This repository contains the **full V1 (PV4 Prototype)** codebase.  
The official **V2** with advanced stability + AI improvements is coming soon.

---

## 🚀 Key Features

### **📝 1. Expense Inputs (Three Modes)**
- **Manual Entry** with category suggestions  
- **Photo Receipt Scan** using OCR (Gemini Vision)  
- **Voice Notes** auto-transcribed into expenses  

### **📊 2. Dashboard**
- Total spending overview  
- Category-wise distribution  
- Smart charts (auto-generated)  
- Light + Dark mode support  

### **👥 3. Friends, Groups & Bill Splitting**
- Add friends  
- Create groups  
- Split bills automatically  
- Each person gets their share added to their own budget  

### **💰 4. Budgeting Tools**
- Category limit tracking  
- Alerts at 80% and 100%  
- Suggests spending adjustments  
- Weekly insights  

### **🔁 5. Recurring Expenses**
Supports:
- Weekly  
- Monthly  
- Yearly  
All run until the specified **end date** automatically.

### **🌍 6. Multi-Currency Support**
- Base currency: **INR**  
- Auto-converted values stored in database  

### **🧠 7. ARVS AI Engine**
- Smart category prediction  
- Expense extraction from photos  
- Expense extraction from voice  
- Predictive spending behavior  

### **📦 8. Supabase Integration**
- Auth (Email login)  
- Postgres Database  
- Secure Row-Level Security  
- Temporary Storage Cleanup System  

### **📱 9. Mobile App via Capacitor**
- Android APK included inside repo  
- Works on all devices  
- Uses camera, mic, filesystem, push notifications  

---

## 🗂 Folder Structure (Simplified)

mypocket/
│── android/ # Capacitor Android project
│── dist/ # Production build output
│── public/ # Static assets
│── src/ # Main app source code
│ ├── components/
│ ├── pages/
│ ├── supabase/
│ └── utils/
│── index.html
│── package.json
│── capacitor.config.ts
│── README.md

yaml
Copy code

---

## 📥 Installation & Dev Setup

### **1. Clone the repo**
```sh
git clone https://github.com/atifvirani/Mypocket
cd Mypocket
2. Install dependencies
sh
Copy code
npm install
3. Run the app
sh
Copy code
npm run dev
4. Build
sh
Copy code
npm run build
📱 Building the Android App (Capacitor)
sh
Copy code
npm run build
npx cap copy
npx cap sync
npx cap open android
Then build APK inside Android Studio.

📸 Screenshots
(Add your screenshots here)

scss
Copy code
![Dashboard](./screenshots/dashboard.png)
![Add Expense](./screenshots/add-expense.png)
![Receipts](./screenshots/receipt.png)
🔮 Roadmap (V2 Update Coming)
Fully polished UI

Offline mode

Data export (PDF, Excel)

Pro version / subscriptions

Better insights

Auto recurring expense engine

Better error handling

