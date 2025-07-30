# BEM Chatting Platform

A real-time chatting platform built for BEM (Student Executive Board) organizations to facilitate communication and collaboration.

## Features

- Real-time Chatting: Kirim dan terima pesan secara instan antar anggota BEM.
- Friendship Management: Tambah teman, kirim/terima/tolak permintaan pertemanan.
- Message Requests: Kelola pesan dari non-teman sebagai permintaan pesan.
- User Search: Cari anggota BEM lain dengan mudah.
- Message Editing: Edit pesan yang sudah terkirim (ditandai dengan "Diedit").
- Message Deletion: Hapus pesan untuk diri sendiri ("Delete for me") atau batalkan pengiriman ("Unsend") untuk kedua belah pihak.
- Authentication: Sistem login dan registrasi pengguna yang aman.
- Persistent Navbar: Navbar yang selalu terlihat di seluruh halaman utama.
- Responsive UI: Desain yang adaptif untuk berbagai ukuran layar (mobile, tablet, desktop).
- Notifications & Suggestions: Notifikasi permintaan pertemanan dan saran pengguna di sidebar.

## Getting Started

1. Clone the repository:
  ```bash
  git clone https://github.com/aldofahrezy/bem-chatting-platform.git
  cd bem-chatting-app
  ```

2.  **Setup MongoDB Database:**
    This application requires a MongoDB database. You can either run MongoDB locally or use a cloud service like MongoDB Atlas. Ensure you have your MongoDB connection URI (e.g., `mongodb://localhost:27017/bemchat` or your Atlas URI).
  
3.  **Install Dependencies & Configure Environment Variables:**

    * **Backend:**
        Navigate to the `backend` directory, install dependencies, and create a `.env` file.
        ```bash
        cd backend
        npm install # or yarn install
        ```
        Create a `.env` file in your `backend/` directory based on `backend/.env.example` with the following content:
        ```
        MONGODB_URI=<Your MongoDB Connection URI>
        PORT=5001
        ```
        Replace the placeholders with your actual values.

    * **Frontend:**
        Navigate back to the project's root directory, install dependencies, and create a `.env.local` file.
        ```bash
        cd .. # Go back to the project root directory
        npm install # or yarn install
        ```
        Create a `.env.local` file in your project's root directory based on `.env.example` with the following content:
        ```
        NEXT_PUBLIC_BACKEND_URL=http://localhost:5001 # Adjust to your local backend URL
        ```

4.  **Run the Application:**

    * **Start Backend:**
        In your terminal, ensure you are in the `backend` directory, then run:
        ```bash
        npm run dev # or npm start
        ```

    * **Start Frontend:**
        Open a new terminal, ensure you are in the project's root directory, then run:
        ```bash
        npm run dev # or yarn dev
        ```

    The frontend application will be running at `http://localhost:3000`. Open your browser and access this URL to view the application.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

## License

This project is licensed under the MIT License.

---
