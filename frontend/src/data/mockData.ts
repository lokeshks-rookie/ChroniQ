/**
 * Mock data shaped to match the ChroniQ MongoDB collections.
 * Swap each getter → real API call in one line when the backend is live.
 */
import { bookingApi, getApiErrorMessage } from '@/services/api';

// ─── Hospital ─────────────────────────────────────────────────────────────────

export interface MockHospital {
  _id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  rating_avg: number;
  rating_count: number;
  facilities: string[];    // medical departments / specialties
  amenities: string[];     // physical amenities: Parking, Pharmacy, ICU, etc.
  about: string;
  timings: string;
  status: 'active' | 'pending' | 'suspended';
  /** Approx lat/lng for Google Maps "Get Directions" link */
  lat: number;
  lng: number;
  /** true if the hospital is open right now (mock: 24×7 = always open) */
  openNow: boolean;
}

export const mockHospitals: MockHospital[] = [
  {
    _id: 'hosp_city_01',
    name: 'City Hospital',
    city: 'Chennai',
    address: '42 Anna Salai, Thousand Lights, Chennai 600006',
    phone: '+91 44 2829 0000',
    rating_avg: 4.8,
    rating_count: 1420,
    facilities: ['Cardiology', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Dermatology', 'ENT'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Cafeteria', 'Emergency 24x7'],
    about: 'City Hospital Chennai is a premier tertiary care center equipped with state-of-the-art diagnostic facilities, modern modular operation suites, and round-the-clock emergency medical response.',
    timings: '24×7',
    status: 'active',
    lat: 13.0604,
    lng: 80.2508,
    openNow: true,
  },
  {
    _id: 'hosp-001',
    name: 'Apollo Hospitals',
    city: 'Chennai',
    address: '21 Greams Lane, Thousand Lights, Chennai — 600 006',
    phone: '+91 44 2829 3333',
    rating_avg: 4.7,
    rating_count: 2843,
    facilities: ['Cardiology', 'Neurology', 'Oncology', 'Emergency', 'Nephrology', 'Gastroenterology'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Cafeteria', 'Blood Bank'],
    about:
      'Apollo Hospitals Chennai is a flagship quaternary-care hospital with over 550 beds, internationally accredited by JCI and NABH. With 24×7 emergency services and specialised multidisciplinary teams, it serves patients from across South Asia and beyond.',
    timings: '24×7',
    status: 'active',
    lat: 13.0604,
    lng: 80.2496,
    openNow: true,
  },
  {
    _id: 'hosp-002',
    name: 'MIOT International',
    city: 'Chennai',
    address: '4/112 Mount Poonamallee Rd, Manapakkam, Chennai — 600 089',
    phone: '+91 44 4200 2288',
    rating_avg: 4.5,
    rating_count: 1920,
    facilities: ['Orthopaedics', 'Rheumatology', 'Spine Surgery', 'Physiotherapy', 'Sports Medicine'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Cafeteria'],
    about:
      'MIOT International is Asia\'s most advanced orthopaedic hospital with 1000 beds. Renowned for complex joint replacements, spinal surgeries, and sports medicine, it attracts patients from 40+ countries seeking world-class musculoskeletal care.',
    timings: '24×7',
    status: 'active',
    lat: 13.0261,
    lng: 80.1696,
    openNow: true,
  },
  {
    _id: 'hosp-003',
    name: 'Kovai Medical Center',
    city: 'Coimbatore',
    address: 'Avanashi Road, Civil Aerodrome Post, Coimbatore — 641 014',
    phone: '+91 422 4323 800',
    rating_avg: 4.6,
    rating_count: 1538,
    facilities: ['Cardiology', 'Paediatrics', 'Urology', 'Gastroenterology', 'Pulmonology'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Blood Bank'],
    about:
      'Kovai Medical Center & Hospital (KMCH) is a leading multi-specialty tertiary care hospital in Coimbatore with 750 beds. Accredited by NABH, it delivers advanced cardiac, paediatric, and gastroenterology care to patients across the western region of Tamil Nadu.',
    timings: '24×7',
    status: 'active',
    lat: 11.0168,
    lng: 77.0033,
    openNow: true,
  },
  {
    _id: 'hosp-004',
    name: 'Fortis Malar Hospital',
    city: 'Chennai',
    address: '52 1st Main Rd, Gandhi Nagar, Adyar, Chennai — 600 020',
    phone: '+91 44 4289 2222',
    rating_avg: 4.4,
    rating_count: 1201,
    facilities: ['Cardiac Sciences', 'Orthopaedics', 'Nephrology', 'Dermatology', 'General Medicine'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access'],
    about:
      'Fortis Malar Hospital is a 180-bed super-speciality hospital in Adyar, Chennai. Known for its cardiac sciences and nephrology programmes, it is backed by the Fortis Healthcare network and holds NABH accreditation.',
    timings: '8 AM – 10 PM',
    status: 'active',
    lat: 13.0066,
    lng: 80.2504,
    openNow: true,
  },
  {
    _id: 'hosp-005',
    name: 'Aravind Eye Hospital',
    city: 'Madurai',
    address: '1 Anna Nagar, Madurai — 625 020',
    phone: '+91 452 435 6100',
    rating_avg: 4.9,
    rating_count: 4120,
    facilities: ['Ophthalmology', 'Retina', 'Glaucoma', 'Paediatric Eye Care', 'Cornea'],
    amenities: ['Parking', 'Pharmacy', 'Lab', 'Wheelchair Access', 'Cafeteria'],
    about:
      'Aravind Eye Hospital is one of the world\'s largest and most productive eye-care facilities. Founded in 1976, it performs over 400,000 surgeries annually, with a mission to eliminate needless blindness regardless of patients\' ability to pay.',
    timings: '7 AM – 8 PM',
    status: 'active',
    lat: 9.9252,
    lng: 78.1198,
    openNow: false,
  },
  {
    _id: 'hosp-006',
    name: 'Sri Ramakrishna Hospital',
    city: 'Coimbatore',
    address: '395 Sarojini Naidu Rd, Sidhapudur, Coimbatore — 641 044',
    phone: '+91 422 4500 000',
    rating_avg: 4.3,
    rating_count: 988,
    facilities: ['Neurology', 'General Surgery', 'Gynaecology', 'Pulmonology', 'Psychiatry'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Blood Bank'],
    about:
      'Sri Ramakrishna Hospital is a 600-bed multi-speciality hospital in Coimbatore offering comprehensive care across 40 specialities. It is a mission-driven institution providing affordable healthcare to patients from rural Tamil Nadu.',
    timings: '24×7',
    status: 'active',
    lat: 11.0054,
    lng: 76.9648,
    openNow: true,
  },
  {
    _id: 'hosp-007',
    name: 'CMC Vellore',
    city: 'Vellore',
    address: 'IDA Scudder Rd, Vellore — 632 004',
    phone: '+91 416 228 1000',
    rating_avg: 4.8,
    rating_count: 5621,
    facilities: ['General Medicine', 'Neurology', 'Oncology', 'Paediatrics', 'Psychiatry', 'Cardiology'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access', 'Cafeteria', 'Blood Bank'],
    about:
      'Christian Medical College (CMC) Vellore is a globally renowned teaching hospital and research institute. With over 2,700 beds, it is consistently ranked among India\'s top hospitals and provides highly specialised care for complex and rare conditions.',
    timings: '24×7',
    status: 'active',
    lat: 12.9241,
    lng: 79.1325,
    openNow: true,
  },
  {
    _id: 'hosp-008',
    name: 'Meenakshi Mission Hospital',
    city: 'Madurai',
    address: 'Lake Area, Melur Rd, Madurai — 625 107',
    phone: '+91 452 435 8888',
    rating_avg: 4.2,
    rating_count: 743,
    facilities: ['Cardiology', 'Gynaecology', 'Endocrinology', 'General Surgery', 'Urology'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Cafeteria'],
    about:
      'Meenakshi Mission Hospital & Research Centre is a 650-bed hospital in Madurai providing multi-specialty services across southern Tamil Nadu. It operates a dedicated Heart Centre and Women & Child Care division.',
    timings: '24×7',
    status: 'active',
    lat: 9.9616,
    lng: 78.1314,
    openNow: true,
  },
  {
    _id: 'hosp-009',
    name: 'Kauvery Hospital',
    city: 'Trichy',
    address: '104A, 6th Cross, Tenur, Trichy — 620 017',
    phone: '+91 431 404 0404',
    rating_avg: 4.5,
    rating_count: 1102,
    facilities: ['Cardiology', 'Nephrology', 'Urology', 'Gastroenterology', 'Neurology'],
    amenities: ['Parking', 'Pharmacy', 'ICU', 'Lab', 'Wheelchair Access'],
    about:
      'Kauvery Hospital Trichy is a 350-bed multi-specialty hospital recognised for its cardiac and nephrology programmes. With a strong ICU infrastructure and 24×7 emergency, it is a trusted referral centre for central Tamil Nadu.',
    timings: '24×7',
    status: 'active',
    lat: 10.7905,
    lng: 78.7047,
    openNow: true,
  },
  {
    _id: 'hosp-010',
    name: 'SIMS Hospital',
    city: 'Chennai',
    address: '1, Jawaharlal Nehru Salai, Vadapalani, Chennai — 600 026',
    phone: '+91 44 4396 3900',
    rating_avg: 4.1,
    rating_count: 672,
    facilities: ['Orthopaedics', 'Neurology', 'General Medicine', 'Rheumatology', 'Dermatology'],
    amenities: ['Parking', 'Pharmacy', 'Lab', 'Wheelchair Access'],
    about:
      'SIMS Hospital (Sri Ramachandra Institute of Higher Education & Research) is a 400-bed multi-specialty hospital in Vadapalani, Chennai. It provides advanced orthopaedic, neurological, and general medicine care to the western suburbs of the city.',
    timings: '8 AM – 9 PM',
    status: 'active',
    lat: 13.0527,
    lng: 80.2120,
    openNow: false,
  },
  {
    _id: 'hosp-011',
    name: 'G. Kuppuswamy Naidu Memorial Hospital',
    city: 'Coimbatore',
    address: 'Post Box 6327, Nethaji Rd, Coimbatore — 641 001',
    phone: '+91 422 234 1212',
    rating_avg: 4.0,
    rating_count: 538,
    facilities: ['General Medicine', 'Gynaecology', 'Paediatrics', 'Dermatology', 'Pulmonology'],
    amenities: ['Parking', 'Pharmacy', 'Lab', 'Wheelchair Access'],
    about:
      'G. Kuppuswamy Naidu Memorial Hospital is a 450-bed charitable hospital in Coimbatore run by the Kuppuswamy Naidu Charitable Trust. It provides affordable primary and secondary care across general medicine and surgical specialities.',
    timings: '7 AM – 7 PM',
    status: 'active',
    lat: 11.0133,
    lng: 76.9671,
    openNow: false,
  },
  {
    _id: 'hosp-012',
    name: 'Mahatma Eye Hospital',
    city: 'Trichy',
    address: '6, Seshapuram, Trichy — 620 002',
    phone: '+91 431 277 4080',
    rating_avg: 4.6,
    rating_count: 1890,
    facilities: ['Ophthalmology', 'Retina', 'Cornea', 'Cataract Surgery', 'Glaucoma'],
    amenities: ['Parking', 'Pharmacy', 'Lab', 'Wheelchair Access', 'Cafeteria'],
    about:
      'Mahatma Eye Hospital is one of the top eye-care centres in central Tamil Nadu, offering full-spectrum ophthalmic services. The hospital is recognised for high-volume cataract surgeries, retinal detachment repairs, and corneal transplants.',
    timings: '8 AM – 6 PM',
    status: 'active',
    lat: 10.8050,
    lng: 78.6856,
    openNow: false,
  },
];

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface MockDoctor {
  _id: string;
  hospitalId: string;
  name: string;
  specialty: string;       // must match a value in the hospital's facilities[]
  qualification: string;
  experience: number;      // years
  fee: number;             // INR per consult
  languages: string[];
  gender: 'male' | 'female';
  bio: string;
  nextSlot: string | null; // e.g. "Today, 3:30 PM" | null if unavailable
  rating_avg: number;
  rating_count: number;
  /** Initials used as avatar fallback — real app would have a photo URL */
  initials: string;
  /** Warm gradient index 0–4, maps to AVATAR_GRADIENTS */
  avatarGradient: number;
}

/** Five warm-palette avatar gradients, all on-brand */
export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #190801 0%, #552C1B 100%)',
  'linear-gradient(135deg, #552C1B 0%, #9A6E56 100%)',
  'linear-gradient(135deg, #9A6E56 0%, #B88C70 100%)',
  'linear-gradient(135deg, #301003 0%, #694436 100%)',
  'linear-gradient(135deg, #453526 0%, #9A6E56 100%)',
];

export const mockDoctors: MockDoctor[] = [
  // ── City Hospital (hosp_city_01) ──────────────────────────────────────────
  {
    _id: 'doc_card_1', hospitalId: 'hosp_city_01', name: 'Dr. Anand Ramanathan',
    specialty: 'Cardiology', qualification: 'MBBS, MD (Gen Med), DM (Cardiology), FACC',
    experience: 18, fee: 800, languages: ['English', 'Tamil', 'Hindi'],
    gender: 'male',
    bio: 'Specialist in coronary angioplasty and preventive cardiology with over 18 years of clinical leadership.',
    nextSlot: 'Today, 10:00 AM', rating_avg: 4.9, rating_count: 512,
    initials: 'AR', avatarGradient: 0,
  },
  {
    _id: 'doc_card_2', hospitalId: 'hosp_city_01', name: 'Dr. Meena Raj',
    specialty: 'Cardiology', qualification: 'MBBS, MD, DNB (Cardiology)',
    experience: 11, fee: 700, languages: ['English', 'Tamil'],
    gender: 'female',
    bio: 'Focus on heart rhythm disorders, pacemaker management, and non-invasive cardiac evaluation.',
    nextSlot: 'Today, 11:30 AM', rating_avg: 4.8, rating_count: 320,
    initials: 'MR', avatarGradient: 1,
  },
  {
    _id: 'doc_genm_1', hospitalId: 'hosp_city_01', name: 'Dr. Rajesh Deshmukh',
    specialty: 'General Medicine', qualification: 'MBBS, MD (Internal Medicine)',
    experience: 15, fee: 500, languages: ['English', 'Hindi', 'Marathi'],
    gender: 'male',
    bio: 'Comprehensive internal medicine, diabetes management, and chronic infectious illnesses.',
    nextSlot: 'Today, 2:00 PM', rating_avg: 4.7, rating_count: 640,
    initials: 'RD', avatarGradient: 2,
  },
  {
    _id: 'doc_orth_1', hospitalId: 'hosp_city_01', name: 'Dr. Vikramaditya Seth',
    specialty: 'Orthopedics', qualification: 'MBBS, MS (Orthopedics), MCh',
    experience: 16, fee: 750, languages: ['English', 'Hindi', 'Bengali'],
    gender: 'male',
    bio: 'Joint replacement specialist, complex trauma reconstruction, and arthroscopy.',
    nextSlot: 'Today, 3:30 PM', rating_avg: 4.9, rating_count: 480,
    initials: 'VS', avatarGradient: 3,
  },
  {
    _id: 'doc_pedi_1', hospitalId: 'hosp_city_01', name: 'Dr. Meera Nambiar',
    specialty: 'Pediatrics', qualification: 'MBBS, MD (Pediatrics), Fellowship in Neonatology',
    experience: 14, fee: 650, languages: ['English', 'Malayalam', 'Tamil'],
    gender: 'female',
    bio: 'Newborn care, developmental milestones, pediatric allergy and asthma.',
    nextSlot: 'Today, 4:30 PM', rating_avg: 4.9, rating_count: 530,
    initials: 'MN', avatarGradient: 4,
  },
  {
    _id: 'doc_derm_1', hospitalId: 'hosp_city_01', name: 'Dr. Sunita Varma',
    specialty: 'Dermatology', qualification: 'MBBS, MD (Dermatology)',
    experience: 12, fee: 700, languages: ['English', 'Hindi', 'Telugu'],
    gender: 'female',
    bio: 'Clinical dermatology, trichology, eczema, and psoriasis therapeutics.',
    nextSlot: 'Today, 5:30 PM', rating_avg: 4.8, rating_count: 380,
    initials: 'SV', avatarGradient: 0,
  },
  // ── Apollo (hosp-001) ────────────────────────────────────────────────────
  {
    _id: 'doc-001', hospitalId: 'hosp-001', name: 'Dr. Priya Nair',
    specialty: 'Cardiology', qualification: 'MD, DM (Cardiology), AIIMS Delhi',
    experience: 18, fee: 1200, languages: ['Tamil', 'English', 'Hindi'],
    gender: 'female',
    bio: 'Dr. Priya Nair is a senior interventional cardiologist with 18 years of experience in complex coronary interventions, structural heart disease, and preventive cardiology. She trained at AIIMS New Delhi and has performed over 3,000 angioplasties. She is known for her patient-first approach and clear communication with families during critical care.',
    nextSlot: 'Today, 4:00 PM', rating_avg: 4.8, rating_count: 392,
    initials: 'PN', avatarGradient: 0,
  },
  {
    _id: 'doc-002', hospitalId: 'hosp-001', name: 'Dr. Ramesh Kumar',
    specialty: 'Neurology', qualification: 'MD, DM (Neurology), NIMHANS',
    experience: 22, fee: 1500, languages: ['Tamil', 'English'],
    gender: 'male',
    bio: 'Dr. Ramesh Kumar is one of Chennai\'s most sought-after neurologists, specialising in epilepsy, movement disorders, and neuro-immunology. A NIMHANS alumnus with 22 years of practice, he leads Apollo\'s epilepsy clinic and has been instrumental in establishing the hospital\'s advanced EEG and video-telemetry programme.',
    nextSlot: 'Tomorrow, 10:00 AM', rating_avg: 4.9, rating_count: 511,
    initials: 'RK', avatarGradient: 1,
  },
  {
    _id: 'doc-003', hospitalId: 'hosp-001', name: 'Dr. Anitha Suresh',
    specialty: 'Oncology', qualification: 'MD, DNB (Medical Oncology)',
    experience: 14, fee: 1800, languages: ['Tamil', 'English'],
    gender: 'female',
    bio: 'Dr. Anitha Suresh is a medical oncologist specialising in breast, lung, and gastrointestinal cancers. With 14 years in oncology, she brings a multidisciplinary tumour-board approach to every case. She is passionate about integrating supportive care with curative treatment to improve quality of life throughout therapy.',
    nextSlot: null, rating_avg: 4.6, rating_count: 278,
    initials: 'AS', avatarGradient: 2,
  },
  {
    _id: 'doc-004', hospitalId: 'hosp-001', name: 'Dr. Venkat Rajan',
    specialty: 'Nephrology', qualification: 'MD, DM (Nephrology)',
    experience: 11, fee: 1000, languages: ['Tamil', 'English', 'Telugu'],
    gender: 'male',
    bio: 'Dr. Venkat Rajan specialises in chronic kidney disease management, dialysis, and kidney transplant follow-up. In 11 years of practice he has managed over 1,500 transplant recipients and runs a dedicated CKD retardation clinic that has significantly reduced progression to end-stage renal disease in his patient cohort.',
    nextSlot: 'Today, 6:00 PM', rating_avg: 4.5, rating_count: 185,
    initials: 'VR', avatarGradient: 3,
  },
  {
    _id: 'doc-005', hospitalId: 'hosp-001', name: 'Dr. Shalini Menon',
    specialty: 'Gastroenterology', qualification: 'MD, DM (Gastroenterology), CMC Vellore',
    experience: 9, fee: 900, languages: ['Tamil', 'English', 'Malayalam'],
    gender: 'female',
    bio: 'Dr. Shalini Menon is a gastroenterologist and hepatologist trained at CMC Vellore, with expertise in therapeutic endoscopy, inflammatory bowel disease, and liver cirrhosis management. She is known for her meticulous endoscopic technique and her ability to explain complex GI conditions in plain language to patients and families.',
    nextSlot: 'Today, 5:30 PM', rating_avg: 4.7, rating_count: 223,
    initials: 'SM', avatarGradient: 4,
  },

  // ── MIOT (hosp-002) ──────────────────────────────────────────────────────
  {
    _id: 'doc-006', hospitalId: 'hosp-002', name: 'Dr. Suresh Babu',
    specialty: 'Orthopaedics', qualification: 'MS (Ortho), MCh (Joint Replacement), Edinburgh',
    experience: 20, fee: 1400, languages: ['Tamil', 'English'],
    gender: 'male',
    bio: 'Dr. Suresh Babu is Asia\'s leading joint-replacement surgeon, having performed over 8,000 knee and hip replacements. He trained at the University of Edinburgh and introduced minimally invasive joint replacement techniques to India. Patients travel from 30+ countries to be operated on by him, and his results consistently match the best international benchmarks.',
    nextSlot: 'Tomorrow, 9:00 AM', rating_avg: 4.9, rating_count: 640,
    initials: 'SB', avatarGradient: 0,
  },
  {
    _id: 'doc-007', hospitalId: 'hosp-002', name: 'Dr. Kavitha Rajan',
    specialty: 'Physiotherapy', qualification: 'BPT, MPT (Musculoskeletal), SPT',
    experience: 8, fee: 600, languages: ['Tamil', 'English'],
    gender: 'female',
    bio: 'Dr. Kavitha Rajan is a senior physiotherapist specialising in post-surgical musculoskeletal rehabilitation and sports injury recovery. She designs individualised rehab protocols for post-joint-replacement and post-spinal-surgery patients, helping them regain strength and mobility faster than standard protocols.',
    nextSlot: 'Today, 2:00 PM', rating_avg: 4.6, rating_count: 198,
    initials: 'KR', avatarGradient: 2,
  },
  {
    _id: 'doc-008', hospitalId: 'hosp-002', name: 'Dr. Arun Krishnamurthy',
    specialty: 'Spine Surgery', qualification: 'MS (Ortho), Fellowship (Spine), AO Spine',
    experience: 15, fee: 1600, languages: ['Tamil', 'English', 'Kannada'],
    gender: 'male',
    bio: 'Dr. Arun Krishnamurthy is a fellowship-trained spine surgeon with expertise in complex deformity correction, minimally invasive lumbar fusions, and cervical disc replacement. He holds an AO Spine fellowship and regularly teaches at national orthopaedic conferences. His complication rates are among the lowest in the country for high-risk spinal procedures.',
    nextSlot: null, rating_avg: 4.8, rating_count: 312,
    initials: 'AK', avatarGradient: 4,
  },

  // ── Kovai Medical (hosp-003) ─────────────────────────────────────────────
  {
    _id: 'doc-009', hospitalId: 'hosp-003', name: 'Dr. Murugan Selvam',
    specialty: 'Cardiology', qualification: 'MD, DM (Cardiology), SCTIMST',
    experience: 16, fee: 1100, languages: ['Tamil', 'English'],
    gender: 'male',
    bio: 'Dr. Murugan Selvam trained at the Sree Chitra Tirunal Institute for Medical Sciences — one of India\'s premier cardiac centres — and brings 16 years of interventional cardiology expertise to Kovai Medical Center. He specialises in primary angioplasty for acute MI, complex bifurcation stenting, and heart failure management.',
    nextSlot: 'Today, 3:00 PM', rating_avg: 4.7, rating_count: 310,
    initials: 'MS', avatarGradient: 1,
  },
  {
    _id: 'doc-010', hospitalId: 'hosp-003', name: 'Dr. Deepa Chandran',
    specialty: 'Paediatrics', qualification: 'MD (Paediatrics), Fellowship (Neonatology)',
    experience: 12, fee: 800, languages: ['Tamil', 'English', 'Malayalam'],
    gender: 'female',
    bio: 'Dr. Deepa Chandran is a paediatrician and neonatologist with 12 years of experience caring for children from newborns to adolescents. She heads the NICU at Kovai Medical Center, which runs at international standards of care. She is loved by families for her gentle demeanour and her skill at putting anxious parents at ease during stressful medical situations.',
    nextSlot: 'Tomorrow, 11:00 AM', rating_avg: 4.8, rating_count: 445,
    initials: 'DC', avatarGradient: 3,
  },
  {
    _id: 'doc-011', hospitalId: 'hosp-003', name: 'Dr. Balasubramanian K.',
    specialty: 'Gastroenterology', qualification: 'MD, DM (Gastroenterology)',
    experience: 19, fee: 1300, languages: ['Tamil', 'English'],
    gender: 'male',
    bio: 'Dr. Balasubramanian is a senior gastroenterologist with 19 years of experience in advanced therapeutic endoscopy, including ERCP, EUS, and endoscopic mucosal resection. He manages a high-volume clinic at Kovai Medical Center focusing on inflammatory bowel disease and hepatobiliary disorders in the western Tamil Nadu region.',
    nextSlot: null, rating_avg: 4.5, rating_count: 187,
    initials: 'BK', avatarGradient: 0,
  },

  // ── Aravind Eye (hosp-005) ───────────────────────────────────────────────
  {
    _id: 'doc-012', hospitalId: 'hosp-005', name: 'Dr. Meena Krishnan',
    specialty: 'Ophthalmology', qualification: 'MS (Ophthalmology), DNB',
    experience: 17, fee: 700, languages: ['Tamil', 'English'],
    gender: 'female',
    bio: 'Dr. Meena Krishnan is a comprehensive ophthalmologist with 17 years at Aravind Eye Hospital. She has personally performed over 25,000 cataract surgeries, many in underserved rural communities through Aravind\'s outreach camps. She is also a trained cornea specialist and manages complex anterior-segment conditions that are referred from across Tamil Nadu.',
    nextSlot: 'Today, 9:00 AM', rating_avg: 4.9, rating_count: 820,
    initials: 'MK', avatarGradient: 2,
  },
  {
    _id: 'doc-013', hospitalId: 'hosp-005', name: 'Dr. Jayaraj Pillai',
    specialty: 'Retina', qualification: 'MS (Ophthalmology), Fellowship (Vitreo-Retina), Sankara Nethralaya',
    experience: 13, fee: 900, languages: ['Tamil', 'English', 'Malayalam'],
    gender: 'male',
    bio: 'Dr. Jayaraj Pillai completed his vitreo-retinal fellowship at Sankara Nethralaya and has since built one of Aravind\'s busiest retina services. He specialises in diabetic retinopathy, retinal detachment repair, and macular degeneration management. He regularly speaks at international retina conferences and has published extensively on surgical outcomes in proliferative diabetic retinopathy.',
    nextSlot: 'Tomorrow, 10:30 AM', rating_avg: 4.8, rating_count: 543,
    initials: 'JP', avatarGradient: 1,
  },

  // ── CMC Vellore (hosp-007) ───────────────────────────────────────────────
  {
    _id: 'doc-014', hospitalId: 'hosp-007', name: 'Dr. Thomas George',
    specialty: 'Neurology', qualification: 'MD, DM (Neurology), CMC Vellore',
    experience: 24, fee: 1600, languages: ['English', 'Tamil', 'Malayalam'],
    gender: 'male',
    bio: 'Dr. Thomas George is a professor of neurology at CMC Vellore with 24 years of clinical and academic experience. His research on autoimmune encephalitis and rare demyelinating disorders has been published in top-tier international journals. He heads the Neurology outpatient department and sees the most complex cases referred from across South Asia.',
    nextSlot: null, rating_avg: 4.9, rating_count: 910,
    initials: 'TG', avatarGradient: 0,
  },
  {
    _id: 'doc-015', hospitalId: 'hosp-007', name: 'Dr. Leela Mathew',
    specialty: 'Paediatrics', qualification: 'MD (Paediatrics), DCH, MRCP (UK)',
    experience: 20, fee: 1400, languages: ['English', 'Tamil', 'Malayalam'],
    gender: 'female',
    bio: 'Dr. Leela Mathew is a senior paediatrician and associate professor at CMC Vellore. She holds the MRCP (UK) and has 20 years of experience in paediatric infectious disease and clinical nutrition. Her ward is well-known for its holistic, family-centred care model, and she is one of the most requested doctors at CMC for second opinions on complex paediatric cases.',
    nextSlot: 'Today, 3:00 PM', rating_avg: 4.8, rating_count: 688,
    initials: 'LM', avatarGradient: 3,
  },
  {
    _id: 'doc-016', hospitalId: 'hosp-007', name: 'Dr. Ranjit Cherian',
    specialty: 'Cardiology', qualification: 'MD, DM (Cardiology), FACC',
    experience: 28, fee: 2000, languages: ['English', 'Tamil'],
    gender: 'male',
    bio: 'Dr. Ranjit Cherian is a Fellow of the American College of Cardiology (FACC) and one of India\'s most respected interventional cardiologists. With 28 years at CMC Vellore, he has pioneered several catheterisation techniques and trained over 100 cardiologists now practising across South Asia. His subspecialty is complex left-main and chronic total occlusion PCI.',
    nextSlot: 'Tomorrow, 2:00 PM', rating_avg: 4.9, rating_count: 1042,
    initials: 'RC', avatarGradient: 4,
  },
  {
    _id: 'doc-017', hospitalId: 'hosp-007', name: 'Dr. Sarah Abraham',
    specialty: 'Psychiatry', qualification: 'MD (Psychiatry), MRCPsych (UK)',
    experience: 14, fee: 1200, languages: ['English', 'Tamil'],
    gender: 'female',
    bio: 'Dr. Sarah Abraham is a consultant psychiatrist and MRCPsych holder with 14 years of experience in adult psychiatry. Her clinical focus is on mood disorders, psychosis, and trauma-informed care. She is a strong advocate for destigmatising mental health in India and runs a widely followed patient-education programme on anxiety and depression management.',
    nextSlot: 'Today, 5:00 PM', rating_avg: 4.7, rating_count: 334,
    initials: 'SA', avatarGradient: 2,
  },
];

// ─── Hospital Review ─────────────────────────────────────────────────────────

export interface MockReview {
  _id: string;
  hospitalId: string;
  reviewer: string;        // first name + last initial
  rating: number;          // 1–5
  comment: string;
  date: string;            // ISO-ish readable
}

// ─── Doctor Review ────────────────────────────────────────────────────────────

export interface MockDoctorReview {
  _id: string;
  doctorId: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
}

export const mockDoctorReviews: MockDoctorReview[] = [
  // doc-001 Dr. Priya Nair
  { _id: 'drev-001', doctorId: 'doc-001', reviewer: 'Suresh M.', rating: 5, date: 'Sep 2026',
    comment: 'Dr. Nair explained my angioplasty in terms I could actually understand. She was calm and reassuring throughout. Best cardiac care I have received.' },
  { _id: 'drev-002', doctorId: 'doc-001', reviewer: 'Kamala V.', rating: 5, date: 'Aug 2026',
    comment: 'She took 30 minutes to go through my ECG results step by step. Never felt rushed. Highly recommend her to anyone with heart issues.' },
  { _id: 'drev-003', doctorId: 'doc-001', reviewer: 'Rajan P.', rating: 4, date: 'Aug 2026',
    comment: 'Very knowledgeable doctor. Waiting time is around 45 minutes, but worth it for the quality of consultation.' },

  // doc-002 Dr. Ramesh Kumar
  { _id: 'drev-004', doctorId: 'doc-002', reviewer: 'Ananya S.', rating: 5, date: 'Sep 2026',
    comment: 'Dr. Kumar correctly diagnosed my epilepsy type after two other hospitals missed it. His systematic approach and deep knowledge are unmatched.' },
  { _id: 'drev-005', doctorId: 'doc-002', reviewer: 'Mohan B.', rating: 5, date: 'Aug 2026',
    comment: 'My tremors are now under control after two years of struggling. He adjusted my medication thoughtfully and the improvement was noticeable within weeks.' },
  { _id: 'drev-006', doctorId: 'doc-002', reviewer: 'Sindhu R.', rating: 5, date: 'Jul 2026',
    comment: 'Brilliant neurologist. He listens carefully, never dismisses symptoms, and explains the science behind his treatment decisions clearly.' },

  // doc-006 Dr. Suresh Babu
  { _id: 'drev-007', doctorId: 'doc-006', reviewer: 'Aravind M.', rating: 5, date: 'Aug 2026',
    comment: 'Dr. Babu performed my bilateral knee replacement. I was walking without support on day 3. His surgical precision is extraordinary.' },
  { _id: 'drev-008', doctorId: 'doc-006', reviewer: 'Priya C.', rating: 5, date: 'Jul 2026',
    comment: 'Came from Singapore for a hip revision. He reviewed all my previous X-rays thoroughly before deciding on approach. Results are excellent.' },
  { _id: 'drev-009', doctorId: 'doc-006', reviewer: 'Venkat T.', rating: 4, date: 'Jun 2026',
    comment: 'Outstanding surgeon. Post-op physio coordination could be improved, but the surgical outcome itself is five stars.' },

  // doc-010 Dr. Deepa Chandran
  { _id: 'drev-010', doctorId: 'doc-010', reviewer: 'Anbu S.', rating: 5, date: 'Aug 2026',
    comment: 'Dr. Deepa was incredible with my son. She is patient, warm, and incredibly competent. Would not take my children to anyone else.' },
  { _id: 'drev-011', doctorId: 'doc-010', reviewer: 'Latha K.', rating: 5, date: 'Jul 2026',
    comment: 'My premature baby was under her care in the NICU. She kept us informed every step of the way and my daughter is now thriving.' },

  // doc-012 Dr. Meena Krishnan
  { _id: 'drev-012', doctorId: 'doc-012', reviewer: 'Selvi A.', rating: 5, date: 'Aug 2026',
    comment: 'Cataract done in 20 minutes, no pain, vision clear the next morning. Dr. Meena is a master of her craft.' },
  { _id: 'drev-013', doctorId: 'doc-012', reviewer: 'Murugan P.', rating: 5, date: 'Jul 2026',
    comment: 'She has an amazing ability to detect problems early. Found early-stage glaucoma in my routine check and started treatment immediately.' },

  // doc-016 Dr. Ranjit Cherian
  { _id: 'drev-014', doctorId: 'doc-016', reviewer: 'Thomas V.', rating: 5, date: 'Sep 2026',
    comment: 'Dr. Cherian performed a CTO PCI on my 100% blocked artery. No other hospital was willing to attempt it. He opened it successfully and my function is restored.' },
  { _id: 'drev-015', doctorId: 'doc-016', reviewer: 'Grace M.', rating: 5, date: 'Aug 2026',
    comment: 'My father has been his patient for 12 years. Dr. Cherian has kept a complex cardiac case stable with thoughtful long-term management. We trust him completely.' },

  // doc-017 Dr. Sarah Abraham
  { _id: 'drev-016', doctorId: 'doc-017', reviewer: 'Joshua P.', rating: 5, date: 'Aug 2026',
    comment: 'Dr. Abraham is the most empathetic psychiatrist we have encountered. She treated my mother with dignity and the treatment plan has made a real difference.' },
  { _id: 'drev-017', doctorId: 'doc-017', reviewer: 'Nisha T.', rating: 5, date: 'Jul 2026',
    comment: 'She does not just prescribe and move on — she spends time understanding the whole picture. My anxiety is finally manageable for the first time in years.' },
];

export const mockReviews: MockReview[] = [
  // hosp-001 Apollo
  { _id: 'rev-001', hospitalId: 'hosp-001', reviewer: 'Preethi S.', rating: 5, date: 'Aug 2026',
    comment: 'Outstanding cardiac care. Dr. Priya Nair was exceptionally thorough and the pre-op team explained every step. Recovery went smoothly.' },
  { _id: 'rev-002', hospitalId: 'hosp-001', reviewer: 'Mohammed A.', rating: 5, date: 'Jul 2026',
    comment: 'My father had emergency bypass surgery here. The response time was incredible and the ICU staff were attentive around the clock. Very grateful.' },
  { _id: 'rev-003', hospitalId: 'hosp-001', reviewer: 'Lakshmi R.', rating: 4, date: 'Jul 2026',
    comment: 'Good overall experience. Waiting time in OPD can be reduced — about 40 minutes before consultation. Doctors are knowledgeable.' },
  { _id: 'rev-004', hospitalId: 'hosp-001', reviewer: 'Karthik V.', rating: 4, date: 'Jun 2026',
    comment: 'Excellent neurology team. ChroniQ made it easy to book the slot without calling the hospital — saved a lot of hassle.' },
  { _id: 'rev-005', hospitalId: 'hosp-001', reviewer: 'Sunita P.', rating: 5, date: 'Jun 2026',
    comment: 'The pharmacy and lab are right inside — we never had to run out. Nurses were friendly and attentive all through the stay.' },

  // hosp-002 MIOT
  { _id: 'rev-006', hospitalId: 'hosp-002', reviewer: 'Aravind M.', rating: 5, date: 'Aug 2026',
    comment: 'Best orthopaedic hospital in India, hands down. Dr. Suresh Babu performed my knee replacement and I was walking in 3 days. Incredible result.' },
  { _id: 'rev-007', hospitalId: 'hosp-002', reviewer: 'Geetha K.', rating: 5, date: 'Jul 2026',
    comment: 'Came from Malaysia specifically for spinal fusion. The team was world-class and follow-up was diligent. Highly recommend for overseas patients.' },
  { _id: 'rev-008', hospitalId: 'hosp-002', reviewer: 'Ravi T.', rating: 4, date: 'Jun 2026',
    comment: 'Good experience overall. International standard facility. Room was comfortable. The cafeteria could use better vegetarian options.' },

  // hosp-003 Kovai Medical
  { _id: 'rev-009', hospitalId: 'hosp-003', reviewer: 'Anbu S.', rating: 5, date: 'Aug 2026',
    comment: 'Fantastic children\'s ward. Dr. Deepa was so patient and gentle with my son. We drove from Salem and it was absolutely worth it.' },
  { _id: 'rev-010', hospitalId: 'hosp-003', reviewer: 'Rekha B.', rating: 4, date: 'Jul 2026',
    comment: 'Good cardiac unit. The queue management system (via ChroniQ) worked very well — I waited only 10 minutes past my slot.' },

  // hosp-005 Aravind Eye
  { _id: 'rev-011', hospitalId: 'hosp-005', reviewer: 'Selvi A.', rating: 5, date: 'Aug 2026',
    comment: 'World-class eye care at an affordable price. Cataract surgery done in 20 minutes. Vision restored the next day. Simply miraculous.' },
  { _id: 'rev-012', hospitalId: 'hosp-005', reviewer: 'Narendran V.', rating: 5, date: 'Jul 2026',
    comment: 'Aravind Eye Hospital is a national treasure. The retina team is exceptional — Dr. Jayaraj explained my condition with diagrams. Very reassuring.' },

  // hosp-007 CMC Vellore
  { _id: 'rev-013', hospitalId: 'hosp-007', reviewer: 'Elisa M.', rating: 5, date: 'Sep 2026',
    comment: 'CMC is in a league of its own. My rare neurological condition baffled three hospitals. Here, the diagnosis was accurate on day two and treatment began immediately.' },
  { _id: 'rev-014', hospitalId: 'hosp-007', reviewer: 'Joshua P.', rating: 5, date: 'Aug 2026',
    comment: 'The psychiatric care my mother received was compassionate and evidence-based. Dr. Sarah Abraham is remarkable — clear communication, no stigma.' },
  { _id: 'rev-015', hospitalId: 'hosp-007', reviewer: 'Yamuna C.', rating: 4, date: 'Aug 2026',
    comment: 'Excellent care but getting an appointment requires planning well ahead. The ChroniQ slot-booking feature helped — I got a confirmed slot instead of the walk-in queue.' },
];

// ─── Amenity icon map ─────────────────────────────────────────────────────────
// Maps amenity label → lucide icon name (used in UI via dynamic rendering)

export const AMENITY_ICONS: Record<string, string> = {
  'Parking': 'ParkingCircle',
  'Pharmacy': 'Pill',
  'ICU': 'HeartPulse',
  'Lab': 'FlaskConical',
  'Wheelchair Access': 'Accessibility',
  'Cafeteria': 'UtensilsCrossed',
  'Blood Bank': 'Droplets',
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export const mockStats = {
  hospitals: 48,
  doctors: 620,
  appointmentsBooked: 32400,
  avgWaitReduction: 67, // percent
};

export const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopaedics', 'Oncology', 'Gynaecology',
  'Paediatrics', 'Dermatology', 'Ophthalmology', 'Gastroenterology',
  'Pulmonology', 'Urology', 'Nephrology', 'General Medicine', 'General Surgery',
  'Psychiatry', 'Endocrinology', 'Rheumatology', 'Physiotherapy',
];

export const CITIES = [
  'Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli',
  'Vellore', 'Erode', 'Tiruppur', 'Dindigul', 'Bengaluru', 'Hyderabad',
  'Mumbai', 'Delhi', 'Pune',
];

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface HospitalFilters {
  query: string;
  city: string;
  specialty: string;
  ratingMin: number;
  openNow: boolean;
}

// ─── Pure query functions — swap internals for API calls later ────────────────

/** GET /hospitals/:id */
export function getHospitalById(id: string): MockHospital | null {
  return mockHospitals.find((h) => h._id === id) ?? null;
}

/** GET /doctors/:id */
export function getDoctorById(id: string): MockDoctor | null {
  return mockDoctors.find((d) => d._id === id) ?? null;
}

/** GET /doctors?hospital_id=&specialty= */
export function getDoctorsByHospital(
  hospitalId: string,
  specialty?: string,
): MockDoctor[] {
  return mockDoctors.filter(
    (d) =>
      d.hospitalId === hospitalId &&
      (specialty ? d.specialty === specialty : true),
  );
}

/** GET /reviews?hospital_id= */
export function getReviewsByHospital(hospitalId: string): MockReview[] {
  return mockReviews.filter((r) => r.hospitalId === hospitalId);
}

/** GET /reviews?doctor_id= */
export function getReviewsByDoctor(doctorId: string): MockDoctorReview[] {
  return mockDoctorReviews.filter((r) => r.doctorId === doctorId);
}

// ─── Slot preview ─────────────────────────────────────────────────────────────

export interface SlotDay {
  label: string;        // 'Today', 'Tomorrow', 'Wed 24 Sep', …
  date: string;         // ISO date string YYYY-MM-DD
  slots: string[];      // available time strings, e.g. ['9:00 AM', '11:30 AM']
}

/**
 * GET /doctors/:id/slots?date=
 * Returns a 5-day preview window of available slots for the given doctor.
 * Times are deterministic based on doctor ID so they look consistent.
 */
export function getSlotPreview(doctorId: string): SlotDay[] {
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Seed slot generation from doctorId for stable output
  const seed = doctorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const POOL = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
                '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM'];

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    // Fewer slots on weekends, none on Sunday
    const count = isWeekend
      ? (d.getDay() === 0 ? 0 : Math.max(0, ((seed + i) % 3)))
      : Math.max(1, ((seed + i * 3) % 6) + 1);
    // Pick `count` slots deterministically
    const slots = count === 0
      ? []
      : POOL.filter((_, idx) => (idx + seed + i) % Math.max(1, Math.floor(POOL.length / count)) === 0).slice(0, count);

    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;

    return {
      label,
      date: d.toISOString().split('T')[0],
      slots,
    };
  });
}

/**
 * Pure filter function — swap for real GET /hospitals?city=&specialty=&rating_min=&open_now=
 */
export function filterHospitals(
  hospitals: MockHospital[],
  filters: HospitalFilters,
): MockHospital[] {
  const q = filters.query.trim().toLowerCase();
  return hospitals.filter((h) => {
    if (h.status !== 'active') return false;
    if (q && !h.name.toLowerCase().includes(q)) return false;
    if (filters.city && h.city !== filters.city) return false;
    if (filters.specialty && !h.facilities.includes(filters.specialty)) return false;
    if (filters.ratingMin > 0 && h.rating_avg < filters.ratingMin) return false;
    if (filters.openNow && !h.openNow) return false;
    return true;
  });
}

// ─── Doctor Filter & Sort ─────────────────────────────────────────────────────

export interface DoctorFilters {
  query: string;
  specialty: string;
  hospital: string;
  city: string;
  gender: string;
  language: string;
  feeMax: number;
  ratingMin: number;
}

export function filterDoctors(
  doctors: MockDoctor[],
  filters: DoctorFilters,
): MockDoctor[] {
  const q = filters.query.trim().toLowerCase();
  return doctors.filter((d) => {
    if (q && !d.name.toLowerCase().includes(q) && !d.specialty.toLowerCase().includes(q)) return false;
    if (filters.specialty && d.specialty !== filters.specialty) return false;
    if (filters.hospital && d.hospitalId !== filters.hospital) return false;
    if (filters.city) {
      const hosp = mockHospitals.find((h) => h._id === d.hospitalId);
      if (!hosp || hosp.city !== filters.city) return false;
    }
    if (filters.gender && d.gender !== filters.gender) return false;
    if (filters.language && !d.languages.includes(filters.language)) return false;
    if (filters.feeMax > 0 && d.fee > filters.feeMax) return false;
    if (filters.ratingMin > 0 && d.rating_avg < filters.ratingMin) return false;
    return true;
  });
}

export type DoctorSortKey = 'earliest' | 'rating' | 'fee_asc';

export function sortDoctors(doctors: MockDoctor[], sortKey: DoctorSortKey): MockDoctor[] {
  const sorted = [...doctors];
  switch (sortKey) {
    case 'earliest':
      return sorted.sort((a, b) => {
        if (!a.nextSlot && !b.nextSlot) return 0;
        if (!a.nextSlot) return 1;
        if (!b.nextSlot) return -1;
        return 0; // both have slots, keep original order
      });
    case 'rating':
      return sorted.sort((a, b) => b.rating_avg - a.rating_avg);
    case 'fee_asc':
      return sorted.sort((a, b) => a.fee - b.fee);
    default:
      return sorted;
  }
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export type AppointmentStatus = 'upcoming' | 'in_queue' | 'called' | 'completed' | 'cancelled';

export interface MockAppointment {
  _id: string;
  doctorId: string;
  hospitalId: string;
  doctorName: string;
  hospitalName: string;
  specialty: string;
  date: string;       // YYYY-MM-DD
  time: string;       // e.g. '10:00 AM'
  status: AppointmentStatus;
  token: string;       // e.g. 'CARD-014'
  booking_code: string;
  reason: string;
  patientName: string;
  queuePosition?: number;
  eta?: string;        // e.g. '~15 min'
  fee: number;
}

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const tomorrowDate = new Date(today);
tomorrowDate.setDate(today.getDate() + 1);
const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 5);
const nextWeekStr = nextWeek.toISOString().split('T')[0];

export const mockMyAppointments: MockAppointment[] = [
  {
    _id: 'apt-001', doctorId: 'doc-001', hospitalId: 'hosp-001',
    doctorName: 'Dr. Priya Nair', hospitalName: 'Apollo Hospitals',
    specialty: 'Cardiology', date: todayStr, time: '4:00 PM',
    status: 'in_queue', token: 'CARD-014', booking_code: 'CQ-2026-09814',
    reason: 'Routine cardiac check-up', patientName: 'Test Patient',
    queuePosition: 3, eta: '~15 min', fee: 1200,
  },
  {
    _id: 'apt-002', doctorId: 'doc-006', hospitalId: 'hosp-002',
    doctorName: 'Dr. Suresh Babu', hospitalName: 'MIOT International',
    specialty: 'Orthopaedics', date: nextWeekStr, time: '9:00 AM',
    status: 'upcoming', token: 'ORTH-007', booking_code: 'CQ-2026-09815',
    reason: 'Knee pain follow-up', patientName: 'Test Patient',
    fee: 1400,
  },
  {
    _id: 'apt-003', doctorId: 'doc-010', hospitalId: 'hosp-003',
    doctorName: 'Dr. Deepa Chandran', hospitalName: 'Kovai Medical Center',
    specialty: 'Paediatrics', date: '2026-09-10', time: '11:00 AM',
    status: 'completed', token: 'PAED-022', booking_code: 'CQ-2026-08990',
    reason: 'Child vaccination', patientName: 'Test Patient',
    fee: 800,
  },
];

export function mockGetMyNextAppointment(): MockAppointment | null {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('chroniq_user')) {
      return null;
    }
  } catch {}
  const active = mockMyAppointments.filter(
    (a) => a.status === 'upcoming' || a.status === 'in_queue' || a.status === 'called'
  );
  return active.length > 0 ? active[0] : null;
}


// ─── Notification ─────────────────────────────────────────────────────────────

export interface MockNotification {
  _id: string;
  type: 'booking_confirmed' | 'reminder' | 'queue_update' | 'general';
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export const mockNotifications: MockNotification[] = [
  {
    _id: 'notif-001', type: 'queue_update',
    title: "You're 3rd in queue",
    body: 'Dr. Priya Nair — Apollo Hospitals. Estimated wait: ~15 min.',
    time: '10 min ago', read: false,
  },
  {
    _id: 'notif-002', type: 'booking_confirmed',
    title: 'Booking confirmed',
    body: `Dr. Suresh Babu — MIOT International on ${nextWeekStr} at 9:00 AM. Token: ORTH-007.`,
    time: '2 hours ago', read: false,
  },
  {
    _id: 'notif-003', type: 'reminder',
    title: 'Appointment tomorrow',
    body: 'Reminder: You have an appointment with Dr. Suresh Babu tomorrow at 9:00 AM.',
    time: '1 day ago', read: true,
  },
  {
    _id: 'notif-004', type: 'general',
    title: 'Welcome to ChroniQ',
    body: 'Your account has been verified. Start booking appointments today.',
    time: '3 days ago', read: true,
  },
];

export function mockGetRecentNotifications(limit = 4): MockNotification[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('chroniq_user')) {
      return [];
    }
  } catch {}
  return mockNotifications.slice(0, limit);
}


// ─── Family Members ───────────────────────────────────────────────────────────

export interface MockFamilyMember {
  _id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  relation: string;
}

export const mockFamilyMembers: MockFamilyMember[] = [
  { _id: 'fam-001', name: 'Ananya Sharma', age: 28, gender: 'female', relation: 'Spouse' },
  { _id: 'fam-002', name: 'Arjun Sharma', age: 5, gender: 'male', relation: 'Son' },
];

// ─── 14-Day Slot Grid (for booking page) ──────────────────────────────────────

export type SlotState = 'available' | 'held' | 'booked';

export interface BookingSlot {
  id: string;
  time: string;
  state: SlotState;
}

export interface SlotGridDay {
  label: string;
  date: string;
  dayOfWeek: string;
  dayNum: number;
  slots: BookingSlot[];
}

export function getSlots14Day(doctorId: string): SlotGridDay[] {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const seed = doctorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const POOL = [
    '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
    '2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM'
  ];

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const isSunday = d.getDay() === 0;
    const isSaturday = d.getDay() === 6;

    const totalSlots = isSunday ? 0 : isSaturday ? 4 : Math.max(3, ((seed + i * 3) % 8) + 3);
    const selectedPool = POOL.slice(0, totalSlots);

    const slots: BookingSlot[] = selectedPool.map((time, idx) => {
      const stateSeed = (seed + i * 7 + idx * 13) % 10;
      let state: SlotState = 'available';
      if (stateSeed === 3 || stateSeed === 7) state = 'booked';
      else if (stateSeed === 5) state = 'held';
      return { id: `slot-${doctorId}-${i}-${idx}`, time, state };
    });

    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;

    return {
      label,
      date: d.toISOString().split('T')[0],
      dayOfWeek: dayNames[d.getDay()],
      dayNum: d.getDate(),
      slots,
    };
  });
}

// ─── Booking Mock Actions ─────────────────────────────────────────────────────

export async function mockHoldSlot(slotId: string): Promise<{ success: true; expiry: number }> {
  try {
    const res = await bookingApi.holdSlot(slotId);
    const heldUntil = res.data?.held_until;
    const expiry = heldUntil ? new Date(heldUntil).getTime() : (Date.now() + 5 * 60 * 1000);
    return { success: true, expiry };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'This slot is no longer available. Please choose another time slot.'));
  }
}

export async function mockReleaseSlot(slotId: string): Promise<{ success: true }> {
  try {
    await bookingApi.releaseSlot(slotId);
  } catch {
    // Ignore release errors
  }
  return { success: true };
}

export interface BookingPayload {
  doctorId: string;
  slotId: string;
  date: string;
  time: string;
  patientName: string;
  reason: string;
  symptoms?: string;
}

export interface BookingResult {
  appointment: MockAppointment;
}

export async function mockConfirmBooking(payload: BookingPayload): Promise<BookingResult> {
  const doctor = getDoctorById(payload.doctorId);
  const hospital = doctor ? getHospitalById(doctor.hospitalId) : null;

  try {
    const res = await bookingApi.createAppointment({
      doctor_id: payload.doctorId,
      slot_id: payload.slotId,
      date: payload.date,
      time: payload.time,
      patient_name: payload.patientName,
      reason: payload.reason,
      symptoms_note: payload.symptoms,
    });
    const appt = res.data;
    const mapped: MockAppointment = {
      _id: appt.id || `apt-${Date.now()}`,
      doctorId: appt.doctor_id || payload.doctorId,
      hospitalId: appt.hospital_id || doctor?.hospitalId || '',
      doctorName: appt.doctor_name || doctor?.name || 'Doctor',
      hospitalName: appt.hospital_name || hospital?.name || 'Hospital',
      specialty: appt.department_name || doctor?.specialty || '',
      date: payload.date,
      time: payload.time,
      status: 'upcoming',
      token: appt.token || `TOK-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      booking_code: appt.booking_code || `CQ-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
      reason: payload.reason,
      patientName: payload.patientName,
      fee: appt.fee || doctor?.fee || 0,
    };
    mockMyAppointments.unshift(mapped);
    return { appointment: mapped };
  } catch (err: any) {
    throw new Error(getApiErrorMessage(err, 'Failed to confirm booking.'));
  }
}

// ─── All unique languages from doctor data ────────────────────────────────────

export const ALL_LANGUAGES = Array.from(
  new Set(mockDoctors.flatMap((d) => d.languages))
).sort();

// ─── Patient Portal Mock API Additions ────────────────────────────────────────

export function mockGetMyAppointments(): MockAppointment[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('chroniq_user')) {
      return [];
    }
  } catch {}
  return mockMyAppointments;
}

export function mockGetAppointmentById(id: string): MockAppointment | null {
  return mockMyAppointments.find(a => a._id === id) || null;
}

export function mockCancelAppointment(id: string): boolean {
  bookingApi.cancel(id, { reason: 'Patient cancelled' }).catch((err) => {
    console.warn('Backend cancel failed:', err);
  });
  const index = mockMyAppointments.findIndex(a => a._id === id);
  if (index !== -1) {
    mockMyAppointments[index].status = 'cancelled';
    return true;
  }
  return true;
}

export function mockGetNotifications(): MockNotification[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem('chroniq_user')) {
      return [];
    }
  } catch {}
  return mockNotifications;
}


export function mockMarkAsRead(id: string): void {
  const notif = mockNotifications.find(n => n._id === id);
  if (notif) {
    notif.read = true;
  }
}

/**
 * Simulates an SSE stream for the queue tracker.
 * Periodically decreases the position and updates ETA.
 * Returns a cleanup function.
 */
export function mockQueueStream(
  appointmentId: string,
  onUpdate: (data: { position: number; eta: string; status: AppointmentStatus }) => void
): () => void {
  const apt = mockGetAppointmentById(appointmentId);
  if (!apt || apt.status === 'completed' || apt.status === 'cancelled') {
    return () => {}; // nothing to stream
  }

  let pos = apt.queuePosition || 5;
  let etaMins = parseInt(apt.eta?.replace(/[^0-9]/g, '') || '20', 10);
  let status: AppointmentStatus = apt.status;

  const interval = setInterval(() => {
    if (status === 'in_queue' && pos > 0) {
      pos -= 1;
      etaMins = Math.max(0, etaMins - 5);
      if (pos === 0) {
        status = 'called';
      }
    } else if (status === 'called') {
      // after some time, it goes to in consultation or completed (we'll just use completed for simplicity here as we don't have in_consultation as a type)
      status = 'completed';
      clearInterval(interval);
    }
    
    // Update the mock data in-place so other parts of the app reflect it
    apt.queuePosition = pos;
    apt.eta = `~${etaMins} min`;
    apt.status = status;

    onUpdate({ position: pos, eta: `~${etaMins} min`, status });
  }, 10000); // 10 seconds for demo purposes

  return () => clearInterval(interval);
}
