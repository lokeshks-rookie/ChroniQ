"""Patient Router: Family Members, Documents, Reviews, Support Tickets."""
from datetime import timedelta
import random
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.models.accounts import FamilyMember, User
from app.models.booking import Appointment
from app.models.common import Channel, DocumentCategory, Role, SupportCategory, SupportTicketStatus, utcnow
from app.models.hospitals import Doctor, Hospital
from app.models.system import MedicalDocument, Review, SupportTicket
from app.schemas.patient import (
    DocumentResponse,
    DocumentUpdate,
    FamilyMemberCreate,
    FamilyMemberResponse,
    FamilyMemberUpdate,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
    SupportTicketCreate,
    SupportTicketResponse,
)
from app.services.document_service import save_patient_document

router = APIRouter(tags=["Patient Services"])


# ==========================================
# Patient Profile & Family Members
# ==========================================

@router.get("/patients/me/profile")
@router.get("/patient/profile")
async def get_patient_profile(current_user: User = Depends(get_current_user)):
    """Get profile of current logged-in patient."""
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "phone": current_user.phone,
        "email": current_user.email,
        "age": current_user.age,
        "gender": current_user.gender,
        "preferred_language": current_user.preferred_language,
        "role": current_user.role,
        "created_at": current_user.created_at,
    }


@router.get("/patients/me/family", response_model=List[dict])
@router.get("/family-members", response_model=List[dict])
async def get_family_members(current_user: User = Depends(get_current_user)):
    """List family members for current patient."""
    members = await FamilyMember.find(
        {"$or": [{"user_id": current_user.id}, {"user_id": str(current_user.id)}]}
    ).to_list()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "name": m.name,
            "age": m.age,
            "gender": m.gender,
            "relation": m.relation,
            "created_at": m.created_at,
        }
        for m in members
    ]


@router.post("/family-members", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_family_member(
    payload: FamilyMemberCreate,
    current_user: User = Depends(get_current_user),
):
    """Add a new dependent family member (max allowed configured by policy)."""
    settings = get_settings()
    existing_count = await FamilyMember.find(
        {"$or": [{"user_id": current_user.id}, {"user_id": str(current_user.id)}]}
    ).count()
    if existing_count >= settings.MAX_FAMILY_MEMBERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum family member limit ({settings.MAX_FAMILY_MEMBERS}) reached.",
        )

    fm = FamilyMember(
        user_id=str(current_user.id),
        name=payload.name,
        age=payload.age,
        gender=payload.gender,
        relation=payload.relation,
        created_at=utcnow(),
    )
    await fm.insert()
    return {
        "id": str(fm.id),
        "user_id": str(fm.user_id),
        "name": fm.name,
        "age": fm.age,
        "gender": fm.gender,
        "relation": fm.relation,
        "created_at": fm.created_at,
    }


@router.patch("/family-members/{id}", response_model=dict)
async def update_family_member(
    id: str,
    payload: FamilyMemberUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update details of a family member."""
    fm = await FamilyMember.get(id)
    if not fm or str(fm.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    if payload.name is not None:
        fm.name = payload.name
    if payload.age is not None:
        fm.age = payload.age
    if payload.gender is not None:
        fm.gender = payload.gender
    if payload.relation is not None:
        fm.relation = payload.relation

    await fm.save()
    return {
        "id": str(fm.id),
        "user_id": str(fm.user_id),
        "name": fm.name,
        "age": fm.age,
        "gender": fm.gender,
        "relation": fm.relation,
        "created_at": fm.created_at,
    }


@router.delete("/family-members/{id}", response_model=dict)
async def delete_family_member(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a family member."""
    fm = await FamilyMember.get(id)
    if not fm or str(fm.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    await fm.delete()
    return {"success": True, "message": "Family member deleted."}


# ==========================================
# Documents
# ==========================================

@router.get("/documents", response_model=List[dict])
async def list_documents(current_user: User = Depends(get_current_user)):
    """List uploaded medical documents for patient."""
    docs = await MedicalDocument.find(MedicalDocument.patient_id == str(current_user.id)).to_list()
    return [
        {
            "id": str(d.id),
            "patient_id": d.patient_id,
            "family_member_id": d.family_member_id,
            "appointment_id": d.appointment_id,
            "name": d.name,
            "category": d.category,
            "mime": d.mime,
            "size_bytes": d.size_bytes,
            "uploaded_at": d.uploaded_at,
        }
        for d in docs
    ]


@router.post("/documents", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: Optional[str] = Form("other"),
    family_member_id: Optional[str] = Form(None),
    appointment_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """Upload a medical document with quota enforcement."""
    cat_enum = DocumentCategory(category) if category in [e.value for e in DocumentCategory] else DocumentCategory.OTHER
    doc = await save_patient_document(
        patient_id=str(current_user.id),
        file=file,
        name=name or file.filename,
        category=cat_enum,
        family_member_id=family_member_id,
        appointment_id=appointment_id,
    )
    return {
        "id": str(doc.id),
        "patient_id": doc.patient_id,
        "name": doc.name,
        "category": doc.category,
        "mime": doc.mime,
        "size_bytes": doc.size_bytes,
        "uploaded_at": doc.uploaded_at,
    }


@router.patch("/documents/{id}", response_model=dict)
async def update_document(
    id: str,
    payload: DocumentUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update document label or category."""
    doc = await MedicalDocument.get(id)
    if not doc or doc.patient_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if payload.name:
        doc.name = payload.name
    if payload.category:
        doc.category = payload.category
    await doc.save()
    return {"id": str(doc.id), "name": doc.name, "category": doc.category}


@router.delete("/documents/{id}", response_model=dict)
async def delete_document(
    id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a document."""
    doc = await MedicalDocument.get(id)
    if not doc or doc.patient_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await doc.delete()
    return {"success": True, "message": "Document deleted"}


# ==========================================
# Reviews
# ==========================================

@router.post("/reviews", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
):
    """Submit a review for a completed appointment (one per appointment)."""
    appt = await Appointment.get(payload.appointment_id)
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    if appt.patient_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this appointment")

    # Ensure single review per appointment
    existing = await Review.find_one(Review.appointment_id == payload.appointment_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review has already been submitted for this appointment.",
        )

    now = utcnow()
    review = Review(
        appointment_id=payload.appointment_id,
        patient_id=str(current_user.id),
        doctor_id=appt.doctor_id,
        hospital_id=appt.hospital_id,
        doctor_rating=payload.doctor_rating,
        hospital_rating=payload.hospital_rating,
        comment=payload.comment,
        tags=payload.tags,
        wait_as_expected=payload.wait_as_expected,
        created_at=now,
        updated_at=now,
    )
    await review.insert()

    # Update doctor rating aggregates
    doctor = await Doctor.find_one(Doctor.custom_id == appt.doctor_id)
    if not doctor:
        doctor = await Doctor.get(appt.doctor_id)
    if doctor:
        old_count = doctor.rating_count or 0
        old_avg = doctor.rating_avg or 0.0
        new_count = old_count + 1
        new_avg = ((old_avg * old_count) + payload.doctor_rating) / new_count
        doctor.rating_count = new_count
        doctor.rating_avg = round(new_avg, 2)
        await doctor.save()

    # Update hospital rating aggregates
    hosp = await Hospital.find_one(Hospital.custom_id == appt.hospital_id)
    if not hosp:
        hosp = await Hospital.get(appt.hospital_id)
    if hosp:
        h_count = hosp.rating_count or 0
        h_avg = hosp.rating_avg or 0.0
        new_h_count = h_count + 1
        new_h_avg = ((h_avg * h_count) + payload.hospital_rating) / new_h_count
        hosp.rating_count = new_h_count
        hosp.rating_avg = round(new_h_avg, 2)
        await hosp.save()

    return {
        "id": str(review.id),
        "appointment_id": review.appointment_id,
        "doctor_id": review.doctor_id,
        "doctor_rating": review.doctor_rating,
        "hospital_rating": review.hospital_rating,
        "comment": review.comment,
        "tags": review.tags,
        "wait_as_expected": review.wait_as_expected,
        "created_at": review.created_at,
    }


@router.patch("/reviews/{id}", response_model=dict)
async def update_review(
    id: str,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_user),
):
    """Edit an existing review within the 48-hour edit window."""
    review = await Review.get(id)
    if not review or review.patient_id != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    now = utcnow()
    if review.created_at + timedelta(hours=48) < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 48-hour review edit window has expired.",
        )

    if payload.doctor_rating is not None:
        review.doctor_rating = payload.doctor_rating
    if payload.hospital_rating is not None:
        review.hospital_rating = payload.hospital_rating
    if payload.comment is not None:
        review.comment = payload.comment
    if payload.tags is not None:
        review.tags = payload.tags
    if payload.wait_as_expected is not None:
        review.wait_as_expected = payload.wait_as_expected

    review.updated_at = now
    await review.save()
    return {"id": str(review.id), "success": True, "updated_at": review.updated_at}


@router.get("/reviews/by-appointment/{id}")
async def get_review_by_appointment(id: str):
    """Get review submitted for a given appointment."""
    review = await Review.find_one(Review.appointment_id == id)
    if not review:
        return None
    return {
        "id": str(review.id),
        "appointment_id": review.appointment_id,
        "doctor_id": review.doctor_id,
        "doctor_rating": review.doctor_rating,
        "hospital_rating": review.hospital_rating,
        "comment": review.comment,
        "tags": review.tags,
        "wait_as_expected": review.wait_as_expected,
        "created_at": review.created_at,
    }


# ==========================================
# Support Tickets
# ==========================================

@router.post("/support/tickets", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: SupportTicketCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a new patient support ticket."""
    ref_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    reference = f"TICK-{ref_suffix}"
    ticket = SupportTicket(
        reference=reference,
        patient_id=str(current_user.id),
        category=payload.category,
        appointment_id=payload.appointment_id,
        hospital_id=payload.hospital_id,
        description=payload.description,
        contact_preference=payload.contact_preference,
        status=SupportTicketStatus.OPEN,
        created_at=utcnow(),
    )
    await ticket.insert()
    return {
        "id": str(ticket.id),
        "reference": ticket.reference,
        "status": ticket.status,
        "description": ticket.description,
        "created_at": ticket.created_at,
    }


@router.get("/support/tickets", response_model=List[dict])
async def list_support_tickets(current_user: User = Depends(get_current_user)):
    """List all support tickets submitted by current patient."""
    tickets = await SupportTicket.find(SupportTicket.patient_id == str(current_user.id)).to_list()
    return [
        {
            "id": str(t.id),
            "reference": t.reference,
            "category": t.category,
            "status": t.status,
            "description": t.description,
            "created_at": t.created_at,
        }
        for t in tickets
    ]
