#!/bin/bash

# --- CONFIGURATION ---
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
NGROK_PORT=8000

# --- STARTING BACKEND ---
echo "🚀 Starting Django Backend..."
cd $BACKEND_DIR
source venv/bin/activate
python manage.py runserver & 
BACKEND_PID=$!
cd ..

# --- STARTING FRONTEND ---
echo "⚛️ Starting React Frontend..."
cd $FRONTEND_DIR
npm run dev &
FRONTEND_PID=$!
cd ..

# --- STARTING NGROK ---
echo "🌐 Starting Ngrok Tunnel on port $NGROK_PORT..."
# Using --log=stdout to keep it quiet, check http://localhost:4040 for the link
ngrok http $NGROK_PORT > /dev/null &
NGROK_PID=$!

# --- CLEANUP LOGIC ---
cleanup() {
    echo -e "\n🛑 Shutting down project..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    kill $NGROK_PID
    exit
}

trap cleanup SIGINT

echo "------------------------------------------------"
echo "✅ ALL SYSTEMS ONLINE"
echo "🖥️  Backend: http://127.0.0.1:8000"
echo "🎨 Frontend: Check your terminal for the Vite URL"
echo "📡 Ngrok: Check http://localhost:4040 for public URL"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop all services."

wait
