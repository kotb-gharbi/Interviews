from fastapi import Form, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from stream_chat import StreamChat
from tensorflow.keras.models import load_model
from PIL import Image
import jwt
from datetime import datetime, timedelta
import uuid
import io
import os


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

EMOTIONS = ['angry','disgust','fear','happy','neutral','sad','surprise']
MODEL_PATH = "mini_xception_final_model.h5"

API_KEY = "kjxrrgdgge8t"
API_SECRET = "xjj3ef9p733dh8fsbtjbsqf63rczk79swhraggtfvuey4z9naqcnvgfbtx3uwrth"
server_client = StreamChat(api_key=API_KEY, api_secret=API_SECRET)

ALGORITHM = "HS256"

@app.post("/generate-token")
async def generate_token(user_id: str = Form(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    
    try:

        token = server_client.create_token(user_id)
        return {"token": token}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/create-channel")
async def create_channel(meet_id: str = Form(...), user_id: str = Form(...)):
    if not meet_id or not user_id:
        raise HTTPException(status_code=400, detail="Missing meet_id or user_id")
    
    channel_id = f"meet_{meet_id}"

    try:
        channel = server_client.channel(
            "messaging",
            channel_id,
            {
                "name": f"{channel_id}",
                "members": [user_id],
                "created_by": user_id
            }
        )
        
        channel.create(user_id)
        return {"channel_id": channel_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating channel: {str(e)}")
    
@app.post("/add-to-meeting-channel")
async def add_to_meeting_channel(meet_id: str = Form(...), user_id: str = Form(...)):
    if not meet_id or not user_id:
        raise HTTPException(status_code=400, detail="Missing meet_id or user_id")
    
    channel_id = f"meet_{meet_id}"
    
    try:
        channel = server_client.channel("messaging", channel_id)
        channel.add_members([user_id])
        return {"status": "success", "channel_id": channel_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding to channel: {str(e)}")
    

@app.post("/generate-chat-token")
async def generate_chat_token(user_id: str = Form(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    
    try:
        chat_token = server_client.create_token(user_id)
        return {
            "chat_token": chat_token
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.on_event("startup")
def load_model_once():
    try:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
        
        app.state.model = load_model(MODEL_PATH)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load model: {str(e)}")
        raise

# Helper function for image preprocessing
def preprocess_image(image_bytes):
    try:
        # Convert bytes to grayscale image and resize to 48x48
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = img.convert('L')
            img_array = np.array(img, dtype=np.float32) / 255.0
            return np.expand_dims(img_array, axis=(0, -1)) # Add batch and channel dims
    except Exception as e:
        raise ValueError(f"Image processing failed: {str(e)}")

@app.post("/predict-emotion")
async def predict_emotion(file: UploadFile = File(...)):
    try:
        # Validate input
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Read and preprocess image (resizing happens here)
        contents = await file.read()
        processed_image = preprocess_image(contents)

        # Make prediction
        model = app.state.model
        predictions = model.predict(processed_image)
        emotion_idx = np.argmax(predictions)
        confidence = float(np.max(predictions))

        return {
            "emotion": EMOTIONS[emotion_idx],
            "confidence": confidence,
            "all_predictions": dict(zip(EMOTIONS, predictions[0].tolist()))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))