from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024

app = FastAPI(title="QuickAI API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


class ChatRequest(BaseModel):
    message: str
    image_id: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "image_upload": True}


@app.post("/chat")
def chat(request: ChatRequest):
    if not request.message.strip() and not request.image_id:
        raise HTTPException(status_code=400, detail="Message or image is required")

    if request.image_id:
        answer = (
            "I received your image successfully. Image analysis is ready to be connected "
            "to a vision model; for now the upload is stored safely and linked to this chat."
        )
    else:
        answer = f"I received: {request.message.strip()}"

    return {"answer": answer, "image_id": request.image_id}


@app.post("/chat/upload-image")
async def upload_image(file: UploadFile = File(...), message: str | None = Form(default=None)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, WebP, and GIF images are supported")

    data = await file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")

    extension = Path(file.filename or "image").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        extension = ".img"

    image_id = str(uuid4())
    target = UPLOAD_DIR / f"{image_id}{extension}"
    target.write_bytes(data)

    return {
        "image_id": image_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "message": message,
        "url": f"/uploads/{target.name}",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
