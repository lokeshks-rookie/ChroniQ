"""Hospital and Doctor Discovery Routes."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.common import HospitalStatus
from app.models.hospitals import Department, Doctor, Hospital
from app.schemas.hospitals import DoctorResponse, HospitalResponse

router = APIRouter(tags=["Discovery"])


def _to_hospital_response(h: Hospital) -> HospitalResponse:
    return HospitalResponse(
        id=h.custom_id or str(h.id),
        name=h.name,
        city=h.city,
        address=h.address,
        phone=h.phone,
        email=h.email,
        location=h.location,
        timings=h.timings,
        facilities=h.facilities,
        rating_avg=h.rating_avg,
        rating_count=h.rating_count,
        status=h.status,
        settings=h.settings,
        created_at=h.created_at,
        updated_at=h.updated_at,
    )


def _to_doctor_response(d: Doctor) -> DoctorResponse:
    return DoctorResponse(
        id=d.custom_id or str(d.id),
        user_id=d.user_id,
        hospital_id=d.hospital_id,
        department_id=d.department_id,
        name=d.name,
        specialty=d.specialty,
        qualifications=d.qualifications,
        experience_years=d.experience_years,
        fee=d.fee,
        languages=d.languages,
        gender=d.gender,
        bio=d.bio,
        photo_url=d.photo_url,
        avg_consult_minutes=d.avg_consult_minutes,
        rating_avg=d.rating_avg,
        rating_count=d.rating_count,
        room=d.room,
        is_active=d.is_active,
    )


@router.get("/hospitals", response_model=List[HospitalResponse])
async def list_hospitals(
    city: Optional[str] = None,
    specialty: Optional[str] = None,
    rating: Optional[float] = None,
    search: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 25.0,
):
    """List active hospitals with filtering and near-me geospatial search."""
    query: Dict[str, Any] = {"status": HospitalStatus.ACTIVE}

    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}

    if rating:
        query["rating_avg"] = {"$gte": rating}

    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    if lat is not None and lng is not None:
        query["location"] = {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius_km * 1000,
            }
        }

    hospitals = await Hospital.find(query).to_list()

    # If specialty filter provided, narrow by hospitals with doctors of that specialty
    if specialty:
        matching_doctors = await Doctor.find(
            Doctor.specialty == specialty,
            Doctor.is_active == True,
        ).to_list()
        hosp_ids = {d.hospital_id for d in matching_doctors}
        hospitals = [h for h in hospitals if (h.custom_id in hosp_ids or str(h.id) in hosp_ids)]

    return [_to_hospital_response(h) for h in hospitals]


@router.get("/hospitals/{id}", response_model=Dict[str, Any])
async def get_hospital(id: str):
    """Get hospital details including departments and doctors."""
    hospital = await Hospital.find_one(Hospital.custom_id == id)
    if not hospital:
        hospital = await Hospital.get(id)
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

    h_id = hospital.custom_id or str(hospital.id)
    departments = await Department.find(
        Department.hospital_id == h_id,
        Department.is_active == True,
    ).to_list()

    doctors = await Doctor.find(
        Doctor.hospital_id == h_id,
        Doctor.is_active == True,
    ).to_list()

    return {
        **_to_hospital_response(hospital).dict(),
        "departments": [
            {
                "id": d.custom_id or str(d.id),
                "name": d.name,
                "room": d.room,
                "token_prefix": d.token_prefix,
            }
            for d in departments
        ],
        "doctors": [_to_doctor_response(d) for d in doctors],
    }


@router.get("/doctors", response_model=List[DoctorResponse])
async def list_doctors(
    specialty: Optional[str] = None,
    hospital_id: Optional[str] = None,
    city: Optional[str] = None,
    gender: Optional[str] = None,
    language: Optional[str] = None,
    fee_max: Optional[int] = None,
    rating_min: Optional[float] = None,
    search: Optional[str] = None,
):
    """Find doctors across hospitals with clinical and logistical filters."""
    query: Dict[str, Any] = {"is_active": True}

    if specialty:
        query["specialty"] = specialty
    if hospital_id:
        query["hospital_id"] = hospital_id
    if gender:
        query["gender"] = gender
    if language:
        query["languages"] = language
    if fee_max is not None:
        query["fee"] = {"$lte": fee_max}
    if rating_min is not None:
        query["rating_avg"] = {"$gte": rating_min}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"specialty": {"$regex": search, "$options": "i"}},
        ]

    doctors = await Doctor.find(query).to_list()

    # Filter by city if specified
    if city:
        hospitals_in_city = await Hospital.find(
            {"city": {"$regex": f"^{city}$", "$options": "i"}},
        ).to_list()
        city_hosp_ids = {h.custom_id or str(h.id) for h in hospitals_in_city}
        doctors = [d for d in doctors if d.hospital_id in city_hosp_ids]

    return [_to_doctor_response(d) for d in doctors]


@router.get("/doctors/{id}", response_model=DoctorResponse)
async def get_doctor(id: str):
    """Fetch complete public doctor profile."""
    doctor = await Doctor.find_one(Doctor.custom_id == id)
    if not doctor:
        doctor = await Doctor.get(id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return _to_doctor_response(doctor)


@router.get("/specialties", response_model=List[str])
async def list_specialties():
    """List distinct specialties offered across active doctors."""
    docs = await Doctor.find(Doctor.is_active == True).to_list()
    specialties = sorted(list({d.specialty for d in docs if d.specialty}))
    return specialties
