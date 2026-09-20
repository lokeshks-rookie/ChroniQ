"""Document File Upload and Storage Service."""
import os
from pathlib import Path
import uuid
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.models.common import DocumentCategory, utcnow
from app.models.system import MedicalDocument

ALLOWED_MIMES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


async def save_patient_document(
    patient_id: str,
    file: UploadFile,
    name: str,
    category: DocumentCategory,
    family_member_id: str = None,
    appointment_id: str = None,
) -> MedicalDocument:
    """Validate and persist an uploaded medical document."""
    settings = get_settings()

    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: PDF, PNG, JPG, WEBP.",
        )

    # Read content to check file size
    content = await file.read()
    size_bytes = len(content)

    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_MB} MB.",
        )

    # Check total user storage quota
    existing_docs = await MedicalDocument.find(MedicalDocument.patient_id == patient_id).to_list()
    current_total_bytes = sum(doc.size_bytes for doc in existing_docs)
    quota_bytes = settings.USER_QUOTA_MB * 1024 * 1024

    if current_total_bytes + size_bytes > quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User storage quota of {settings.USER_QUOTA_MB} MB exceeded.",
        )

    # Ensure upload directory exists
    upload_dir = Path(settings.UPLOAD_DIR) / patient_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".dat"
    disk_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = upload_dir / disk_filename

    with open(target_path, "wb") as f:
        f.write(content)

    doc = MedicalDocument(
        patient_id=patient_id,
        family_member_id=family_member_id,
        appointment_id=appointment_id,
        name=name or file.filename,
        category=category,
        mime=file.content_type,
        size_bytes=size_bytes,
        file_path=str(target_path),
        uploaded_at=utcnow(),
    )
    await doc.insert()
    return doc
