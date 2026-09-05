import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { customerApi, saleApi } from '../api/services';
import { Customer, DetailedSale } from '../types';
import { MembershipCard } from '../components/MembershipCard';
import { ApplicationFormModal } from '../components/ApplicationFormModal';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  Search,
  Check,
  Loader2,
  UserCheck,
  CreditCard,
  Trash2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Download,
  MapPin,
  X,
  Edit2,
  Wine,
  Phone,
  Mail,
  Briefcase,
  ShieldAlert,
  HeartPulse,
  User,
  Calendar,
  FileText,
  Camera,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export const Customers: React.FC = () => {
  const { isAdmin } = useAuth();

  // Pagination States for Instant Lag-Free Performance
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Registration Form States
  const [customerCode, setCustomerCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [occupation, setOccupation] = useState('');
  const [institution, setInstitution] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [purpose, setPurpose] = useState('Sports Activities');
  const [declaration, setDeclaration] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [createdCustomers, setCreatedCustomers] = useState<Customer[]>([]);
  const [activeQRModal, setActiveQRModal] = useState<Customer | null>(null);
  const [applicationModalCustomer, setApplicationModalCustomer] = useState<Customer | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [listLoading, setListLoading] = useState<boolean>(true);

  // Edit Customer Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editOccupation, setEditOccupation] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [editAadhaar, setEditAadhaar] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editPurpose, setEditPurpose] = useState('Sports Activities');
  const [editDeclaration, setEditDeclaration] = useState(true);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);

  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Member Liquor History Modal State
  const [liquorHistoryCustomer, setLiquorHistoryCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<DetailedSale[]>([]);
  const [liquorLoading, setLiquorLoading] = useState(false);

  // Form & Bulk Import States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // OCR ID Card Scanner States
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [editIsScanningOCR, setEditIsScanningOCR] = useState(false);
  const [editOcrMessage, setEditOcrMessage] = useState('');

  // Live Camera Scanner Modal States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraIsEditMode, setCameraIsEditMode] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'ocr' | 'photo_reg' | 'photo_edit'>('ocr');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);

  // Native Mobile Phone Camera Capture Input Refs
  const regMobileCamRef = React.useRef<HTMLInputElement | null>(null);
  const editMobileCamRef = React.useRef<HTMLInputElement | null>(null);

  // Member Photo Compression helper (~400px JPEG base64 string)
  const compressPhotoToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 480;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas error'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const handleMemberPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const base64 = await compressPhotoToBase64(file);
      if (isEditMode) {
        setEditPhotoUrl(base64);
      } else {
        setPhotoUrl(base64);
      }
    } catch (err) {
      console.error('Photo processing error:', err);
      alert('Failed to process member photo image');
    }
  };

  // Stop current active webcam stream tracks
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Open camera modal window or native mobile camera
  const openCameraModal = (isEditMode = false, target: 'ocr' | 'photo_reg' | 'photo_edit' = 'ocr') => {
    setCameraIsEditMode(isEditMode);
    setCameraTarget(target);
    setShowCameraModal(true);
    setCameraError('');
  };

  // Close camera modal window
  const closeCameraModal = () => {
    stopCameraStream();
    setShowCameraModal(false);
    setCameraError('');
  };

  // Start webcam video stream using getUserMedia with multi-attempt mobile fallbacks
  const startCameraStream = async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setIsCameraStarting(true);
    setCameraError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC live video streams require HTTPS or localhost. Use Native Phone Camera below!');
      }

      let stream: MediaStream | null = null;

      // Attempt 1: Ideal facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        });
      } catch (e1) {
        // Attempt 2: Strict facing mode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode },
            audio: false,
          });
        } catch (e2) {
          // Attempt 3: General video stream
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Unable to access camera stream on this device.');
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera stream error:', err);
      const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      
      if (isHttp) {
        setCameraError('Mobile browsers block live video on HTTP local network IPs. Tap "OPEN NATIVE PHONE CAMERA" below!');
      } else {
        setCameraError(err.message || 'Camera access was denied or unavailable. Tap "OPEN NATIVE PHONE CAMERA" below!');
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Switch between rear and front camera
  const toggleCameraFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  // Auto start camera when modal opens
  useEffect(() => {
    if (showCameraModal) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [showCameraModal]);

  // Client-side image compression helper (downsamples huge 12MB+ phone photos to ~250KB JPEG in <50ms)
  const compressImageForOCR = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxDim = 1600;
        let { width, height } = img;

        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          'image/jpeg',
          0.82
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  // Unified File & Live Camera Image Processor
  const processIDCardFile = async (rawFile: File, isEditMode = false) => {
    if (isEditMode) {
      setEditIsScanningOCR(true);
      setEditOcrMessage('Compressing photo & scanning details...');
    } else {
      setIsScanningOCR(true);
      setOcrMessage('Compressing photo & scanning details...');
    }

    try {
      // 1. Client-side instant compression (12MB -> 250KB in <50ms)
      const file = await compressImageForOCR(rawFile);
      
      // 2. Upload to OCR backend
      const res = await customerApi.scanIDCard(file);
      const extractedList: string[] = [];

      if (isEditMode) {
        if (res.full_name) { setEditName(res.full_name); extractedList.push('Full Name'); }
        if (res.phone) { setEditPhone(res.phone); extractedList.push('Mobile #'); }
        if (res.father_guardian_name) { setEditFatherName(res.father_guardian_name); extractedList.push('Father/Guardian'); }
        if (res.date_of_birth) { setEditDob(res.date_of_birth); extractedList.push('DOB'); }
        if (res.gender) { setEditGender(res.gender); extractedList.push('Gender'); }
        if (res.aadhaar_card_no) { setEditAadhaar(res.aadhaar_card_no); extractedList.push('Aadhaar #'); }
        if (res.address) { setEditAddress(res.address); extractedList.push('Address'); }

        const docType = res.document_type || 'ID Card';
        if (extractedList.length > 0) {
          setEditOcrMessage(`✨ Auto-extracted ${extractedList.join(', ')} from ${docType}! Click Save below to update.`);
        } else {
          setEditOcrMessage(`Could not detect text automatically from ${docType}. Please check photo lighting.`);
        }
      } else {
        // Auto-fill form states
        if (res.full_name) { setFullName(res.full_name); extractedList.push('Full Name'); }
        if (res.phone) { setPhone(res.phone); extractedList.push('Mobile #'); }
        if (res.father_guardian_name) { setFatherName(res.father_guardian_name); extractedList.push('Father/Guardian'); }
        if (res.date_of_birth) { setDob(res.date_of_birth); extractedList.push('DOB'); }
        if (res.gender) { setGender(res.gender); extractedList.push('Gender'); }
        if (res.aadhaar_card_no) { setAadhaar(res.aadhaar_card_no); extractedList.push('Aadhaar #'); }
        if (res.address) { setAddress(res.address); extractedList.push('Address'); }

        // AUTOMATICALLY SAVE/REGISTER TO DATABASE
        const nameToSave = res.full_name || fullName || 'New Member';
        const codeToSave = customerCode.trim() || undefined; // Auto-generated by backend if undefined
        const phoneToSave = res.phone || phone.trim() || `9${Math.floor(100000000 + Math.random() * 899999999)}`;

        try {
          const newCust = await customerApi.createCustomer({
            customer_code: codeToSave,
            full_name: nameToSave,
            phone: phoneToSave,
            father_guardian_name: res.father_guardian_name || fatherName || undefined,
            date_of_birth: res.date_of_birth || dob || undefined,
            gender: res.gender || gender || 'Male',
            occupation: occupation || undefined,
            institution_organization: institution || undefined,
            aadhaar_card_no: res.aadhaar_card_no || aadhaar || undefined,
            email: email || undefined,
            blood_group: bloodGroup || undefined,
            emergency_contact_no: emergencyContact || undefined,
            purpose_of_membership: purpose || 'Sports Activities',
            address: res.address || address || undefined,
            declaration_accepted: true,
          });

          // Immediate local state update (no blocking wait)
          setCreatedCustomers((prev) => [newCust, ...prev]);
          setSuccessMsg(`🎉 Auto-Registered Member #${newCust.customer_code} (${newCust.full_name}) to Database!`);
          
          // Clear form fields for next registration
          setCustomerCode('');
          setFullName('');
          setPhone('');
          setFatherName('');
          setDob('');
          setOccupation('');
          setInstitution('');
          setAadhaar('');
          setEmail('');
          setBloodGroup('');
          setEmergencyContact('');
          setAddress('');

          // Reload customer list in background
          loadCustomers().catch(() => {});
        } catch (saveErr) {
          console.error('Auto-save error:', saveErr);
          setOcrMessage(`✨ Extracted ID details into form below! Enter Mobile Number & click 'REGISTER MEMBER TO DB'.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to scan ID card photo';
      if (isEditMode) setEditOcrMessage(`Error: ${msg}`);
      else setOcrMessage(`Error: ${msg}`);
    } finally {
      if (isEditMode) setEditIsScanningOCR(false);
      else setIsScanningOCR(false);
    }
  };

  const handleIDCardUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditMode = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // Reset input value so taking another photo always fires onChange
    processIDCardFile(file, isEditMode);
  };

  // Capture current video frame from webcam stream and trigger OCR processing or Member Photo save
  const capturePhotoAndScan = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState < 2) {
      setCameraError('Camera stream is not ready yet. Please wait a moment.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (cameraTarget === 'photo_reg' || cameraTarget === 'photo_edit') {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (cameraTarget === 'photo_edit') {
        setEditPhotoUrl(dataUrl);
      } else {
        setPhotoUrl(dataUrl);
      }
      closeCameraModal();
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Failed to capture snapshot from camera.');
        return;
      }
      const capturedFile = new File([blob], `id_card_cam_${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCameraModal();
      processIDCardFile(capturedFile, cameraIsEditMode);
    }, 'image/jpeg', 0.95);
  };

  const loadCustomers = async () => {
    try {
      setListLoading(true);
      const data = await customerApi.getCustomers();
      setCreatedCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Fetch authenticated QR code image blob when modal opens
  useEffect(() => {
    if (!activeQRModal) {
      setQrImageUrl(null);
      return;
    }
    let isMounted = true;
    setQrLoading(true);

    customerApi
      .getQRBlob(activeQRModal.id)
      .then((blob) => {
        if (isMounted) {
          const url = window.URL.createObjectURL(blob);
          setQrImageUrl(url);
        }
      })
      .catch((err) => {
        console.error('Failed to load authenticated QR image blob:', err);
      })
      .finally(() => {
        if (isMounted) setQrLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeQRModal]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const payload: any = {
        full_name: fullName,
        phone,
        address: address.trim() || undefined,
        father_guardian_name: fatherName.trim() || undefined,
        date_of_birth: dob.trim() || undefined,
        gender: gender || undefined,
        occupation: occupation.trim() || undefined,
        institution_organization: institution.trim() || undefined,
        aadhaar_card_no: aadhaar.trim() || undefined,
        email: email.trim() || undefined,
        blood_group: bloodGroup.trim() || undefined,
        emergency_contact_no: emergencyContact.trim() || undefined,
        purpose_of_membership: purpose || undefined,
        declaration_accepted: declaration,
        photo_url: photoUrl || undefined,
      };

      if (customerCode.trim()) payload.customer_code = customerCode.trim();

      const newCust = await customerApi.createCustomer(payload);
      setCreatedCustomers((prev) => [newCust, ...prev]);
      setSuccessMsg(`Saved #${newCust.customer_code} (${newCust.full_name}) to database!`);

      // Reset form
      setCustomerCode('');
      setFullName('');
      setPhone('');
      setAddress('');
      setFatherName('');
      setDob('');
      setOccupation('');
      setInstitution('');
      setAadhaar('');
      setEmail('');
      setBloodGroup('');
      setEmergencyContact('');
      setPhotoUrl(null);
      setActiveQRModal(newCust);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Customer Modal
  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditCode(customer.customer_code);
    setEditName(customer.full_name);
    setEditPhone(customer.phone);
    setEditAddress(customer.address || '');
    setEditFatherName(customer.father_guardian_name || '');
    setEditDob(customer.date_of_birth || '');
    setEditGender(customer.gender || 'Male');
    setEditOccupation(customer.occupation || '');
    setEditInstitution(customer.institution_organization || '');
    setEditAadhaar(customer.aadhaar_card_no || '');
    setEditEmail(customer.email || '');
    setEditBloodGroup(customer.blood_group || '');
    setEditEmergencyContact(customer.emergency_contact_no || '');
    setEditPurpose(customer.purpose_of_membership || 'Sports Activities');
    setEditDeclaration(customer.declaration_accepted ?? true);
    setEditPhotoUrl(customer.photo_url || null);
    setEditError('');
  };

  // Open Member Liquor Purchase History Modal
  const openLiquorHistory = async (customer: Customer) => {
    setLiquorHistoryCustomer(customer);
    setLiquorLoading(true);
    try {
      const data = await saleApi.getCustomerSales(customer.id);
      setCustomerSales(data);
    } catch (err) {
      console.error('Failed to fetch customer liquor history:', err);
    } finally {
      setLiquorLoading(false);
    }
  };

  // Submit Edit Customer
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditSubmitting(true);
    setEditError('');

    try {
      const updated = await customerApi.updateCustomer(editingCustomer.id, {
        customer_code: editCode.trim(),
        full_name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        father_guardian_name: editFatherName.trim(),
        date_of_birth: editDob.trim(),
        gender: editGender,
        occupation: editOccupation.trim(),
        institution_organization: editInstitution.trim(),
        aadhaar_card_no: editAadhaar.trim(),
        email: editEmail.trim(),
        blood_group: editBloodGroup.trim(),
        emergency_contact_no: editEmergencyContact.trim(),
        purpose_of_membership: editPurpose,
        declaration_accepted: editDeclaration,
        photo_url: editPhotoUrl || undefined,
      });

      setCreatedCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      setSuccessMsg(`Updated member #${updated.customer_code} (${updated.full_name})!`);
      setEditingCustomer(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.response?.data?.detail || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Universal Multi-Format Sheet Parser (.xlsx, .xls, .csv, .tsv, .ods)
  const handleSheetFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkResult(null);
    setBulkSubmitting(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Parse rows as raw JS objects using first row as headers
        const jsonObjects: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonObjects.length === 0) {
          alert('Sheet file is empty or missing data rows');
          setBulkSubmitting(false);
          return;
        }

        const parsedItems: any[] = [];

        for (let i = 0; i < jsonObjects.length; i++) {
          const row = jsonObjects[i];
          if (!row) continue;

          // Smart header resolution (case-insensitive substring lookup)
          const getVal = (...possibleHeaders: string[]) => {
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase();
              for (const ph of possibleHeaders) {
                if (cleanKey === ph.toLowerCase() || cleanKey.includes(ph.toLowerCase())) {
                  const val = String(row[key] || '').trim();
                  if (val) return val;
                }
              }
            }
            return '';
          };

          const cardCode = getVal('card', 'card no', 'card_no', 'card number', 'member id', 'code', 'slot');
          const fullName = getVal('full name', 'name', 'applicant name', 'member name');
          const phone = getVal('phone', 'mobile', 'contact', 'mobile no', 'phone no', 'cell');
          const father = getVal('father name', 'father', 'guardian', 'father/guardian');
          const dob = getVal('date of birth', 'dob', 'birth date', 'birth');
          const gender = getVal('gender', 'sex');
          const occupation = getVal('occupation', 'job', 'profession');
          const institution = getVal('institution', 'organization', 'company', 'org');
          const aadhaar = getVal('aadhaar', 'aadhaar card', 'aadhaar no', 'adhaar');
          const email = getVal('email', 'email id', 'mail');
          const blood = getVal('blood group', 'blood', 'bg');
          const emergency = getVal('emergency contact', 'emergency', 'emergency no');
          const purpose = getVal('purpose', 'purpose of membership');
          const address = getVal('address', 'residential address', 'location', 'addr');

          if (fullName && phone) {
            parsedItems.push({
              customer_code: cardCode || null,
              full_name: fullName,
              phone: phone,
              father_guardian_name: father || null,
              date_of_birth: dob || null,
              gender: gender || null,
              occupation: occupation || null,
              institution_organization: institution || null,
              aadhaar_card_no: aadhaar || null,
              email: email || null,
              blood_group: blood || null,
              emergency_contact_no: emergency || null,
              purpose_of_membership: purpose || null,
              address: address || null,
            });
          }
        }

        if (parsedItems.length === 0) {
          alert('Could not find valid rows with Name and Phone in the uploaded file. Please check column headers.');
          setBulkSubmitting(false);
          return;
        }

        const res = await customerApi.bulkImportCustomers(parsedItems);
        setBulkResult(res);
        await loadCustomers();
      } catch (err: any) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to process sheet file');
      } finally {
        setBulkSubmitting(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadSampleXlsxTemplate = () => {
    const sampleRows = [
      {
        'CARD': '101',
        'FULL NAME': 'MADANKUMAR V',
        'PHONE': '9080962162',
        'FATHER NAME': 'VARADARAJAN',
        'DOB': '15/05/1988',
        'GENDER': 'Male',
        'OCCUPATION': 'Business',
        'INSTITUTION': 'Apex Tech',
        'AADHAAR NO': '998877665544',
        'EMAIL': 'madan@example.com',
        'BLOOD GROUP': 'O+',
        'EMERGENCY CONTACT': '9876543210',
        'PURPOSE': 'Sports Activities',
        'ADDRESS': '3 MGR Nagar Ondipudur Coimbatore',
      },
      {
        'CARD': '102',
        'FULL NAME': 'BALAJI R',
        'PHONE': '8248196031',
        'FATHER NAME': 'RAMAKRISHNAN',
        'DOB': '20/08/1990',
        'GENDER': 'Male',
        'OCCUPATION': 'Software Engineer',
        'INSTITUTION': 'Cognizant',
        'AADHAAR NO': '112233445566',
        'EMAIL': 'balaji@example.com',
        'BLOOD GROUP': 'A+',
        'EMERGENCY CONTACT': '9123456789',
        'PURPOSE': 'Food / Bar',
        'ADDRESS': '12 Race Course Road Coimbatore',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Import Template');
    XLSX.writeFile(workbook, 'Coimbatore_Gymkhana_Member_Import_Template.xlsx');
  };

  const downloadSampleCsvTemplate = () => {
    const sampleCsv = `CARD,FULL NAME,PHONE,FATHER NAME,DOB,GENDER,OCCUPATION,INSTITUTION,AADHAAR NO,EMAIL,BLOOD GROUP,EMERGENCY CONTACT,PURPOSE,ADDRESS
101,MADANKUMAR V,9080962162,VARADARAJAN,15/05/1988,Male,Business,Apex Tech,998877665544,madan@example.com,O+,9876543210,Sports Activities,3 MGR Nagar Ondipudur Coimbatore
102,BALAJI R,8248196031,RAMAKRISHNAN,20/08/1990,Male,Software Engineer,Cognizant,112233445566,balaji@example.com,A+,9123456789,Food / Bar,12 Race Course Road Coimbatore`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Coimbatore_Gymkhana_Member_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export Entire Detailed Member Registration Records to Excel (.xlsx)
  const exportFullMembersToExcel = () => {
    if (!createdCustomers || createdCustomers.length === 0) {
      alert('No member records available to export.');
      return;
    }

    const exportData = createdCustomers.map((c) => ({
      'Card / Member Code': c.customer_code,
      'Full Name': c.full_name,
      'Mobile Number': c.phone,
      'Father / Guardian Name': c.father_guardian_name || '',
      'Date of Birth': c.date_of_birth || '',
      'Gender': c.gender || '',
      'Occupation': c.occupation || '',
      'Institution / Organization': c.institution_organization || '',
      'Aadhaar Card No.': c.aadhaar_card_no || '',
      'Email Address': c.email || '',
      'Blood Group': c.blood_group || '',
      'Emergency Contact No.': c.emergency_contact_no || '',
      'Purpose of Membership': c.purpose_of_membership || '',
      'Declaration Signed': c.declaration_accepted ? 'Yes' : 'No',
      'Residential Address': c.address || '',
      'Created At': c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit column widths for crisp Excel layout
    worksheet['!cols'] = [
      { wch: 18 }, // Card Code
      { wch: 25 }, // Full Name
      { wch: 16 }, // Mobile
      { wch: 24 }, // Father Name
      { wch: 14 }, // DOB
      { wch: 10 }, // Gender
      { wch: 22 }, // Occupation
      { wch: 26 }, // Institution
      { wch: 18 }, // Aadhaar
      { wch: 26 }, // Email
      { wch: 12 }, // Blood Group
      { wch: 20 }, // Emergency Contact
      { wch: 22 }, // Purpose
      { wch: 18 }, // Declaration
      { wch: 35 }, // Address
      { wch: 14 }, // Created At
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Full Member Directory');

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Coimbatore_Gymkhana_Club_Full_Members_${todayStr}.xlsx`);
  };

  const handleDeleteCustomer = async (customerId: number, name: string, code: string) => {
    if (!window.confirm(`Delete member "${name}" (#${code})? Slot #${code} will become available for new members.`)) {
      return;
    }

    try {
      await customerApi.deleteCustomer(customerId);
      setCreatedCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setSuccessMsg(`Member ${name} (#${code}) deleted.`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not delete customer');
    }
  };

  const filteredCustomers = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return createdCustomers;

    const cleanQuery = query.startsWith('#') ? query.slice(1) : query;

    return createdCustomers.filter((c) => {
      const matchesCode = c.customer_code.toLowerCase().includes(cleanQuery);
      const matchesName = c.full_name.toLowerCase().includes(query);
      const matchesPhone = c.phone.includes(cleanQuery);
      const matchesAadhaar = c.aadhaar_card_no ? c.aadhaar_card_no.includes(cleanQuery) : false;
      const matchesAddr = c.address ? c.address.toLowerCase().includes(query) : false;
      const matchesOccupation = c.occupation ? c.occupation.toLowerCase().includes(query) : false;

      return matchesCode || matchesName || matchesPhone || matchesAadhaar || matchesAddr || matchesOccupation;
    });
  }, [createdCustomers, search]);

  // Reset to Page 1 whenever search query or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / (pageSize || 1)));

  const paginatedCustomers = React.useMemo(() => {
    if (pageSize === 0) return filteredCustomers; // All
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  // Total liquor spend calculation for modal
  const totalMemberLiquorSpend = customerSales.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalMemberBottles = customerSales.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-4 rounded-2xl border border-[#21262d]">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <span>Coimbatore Gymkhana Club — Member Directory & Pass Cards</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Member Registration Form Fields • Mobile No • Occupation • Emergency Contact • Address • Edit Options
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportFullMembersToExcel}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download Detailed Member Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-amber-400 font-extrabold rounded-xl border border-[#30363d] text-xs flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Sheet (.xlsx)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Container */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        
        {/* Left Column: Registration Form (4 cols) */}
        <div className="xl:col-span-4 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 shadow-lg h-fit space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#21262d] pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Member Registration Form</h3>
              <p className="text-[11px] text-slate-400">Save full member details & generate pass card</p>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Member Portrait Photo Capture & Upload Widget */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex items-center gap-3">
            <div className="w-14 h-16 rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 relative">
              {photoUrl ? (
                <img src={photoUrl} alt="Member Portrait" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-slate-600" />
              )}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                Member Pass Photo (Live / Upload)
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openCameraModal(false, 'photo_reg')}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take Live Photo</span>
                </button>

                <label className="cursor-pointer px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleMemberPhotoUpload(e, false)}
                    className="hidden"
                  />
                </label>

                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-[11px] transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Auto-Fill from ID Card Photo Widget */}
          <div className="bg-[#0d1117] border border-amber-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Auto-Fill from ID Photo</span>
              </div>
              <span className="text-[10px] text-slate-400">Aadhaar, PAN, License</span>
            </div>

            <input
              type="file"
              accept="image/*, application/pdf"
              onChange={(e) => handleIDCardUpload(e, false)}
              className="hidden"
              id="regIDCardInput"
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleIDCardUpload(e, false)}
              className="hidden"
              ref={regMobileCamRef}
              id="regMobileCamInput"
            />

            <div className="grid grid-cols-2 gap-2">
              <label
                htmlFor="regIDCardInput"
                className="cursor-pointer py-2.5 px-3 bg-[#21262d] hover:bg-[#30363d] text-amber-400 border border-[#30363d] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 stroke-[2.5]" />
                <span>Upload ID File</span>
              </label>

              <button
                type="button"
                onClick={() => openCameraModal(false)}
                className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>Live Camera</span>
              </button>
            </div>

            {isScanningOCR && (
              <div className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>OCR Scanning ID Card...</span>
              </div>
            )}

            {ocrMessage && (
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{ocrMessage}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Applicant / Card No.
                </label>
                <input
                  type="text"
                  value={customerCode}
                  onChange={(e) => setCustomerCode(e.target.value)}
                  placeholder="e.g. 101, 1101"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-amber-400 placeholder-slate-600 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  minLength={10}
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9994310190"
                  className="w-full bg-[#0d1117] border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Full Applicant Name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Deepak R"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Father / Guardian Name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Ranganathan"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Date of Birth (DOB)
                </label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Blood Group
                </label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+, A+, B+"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-rose-400 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Business / Service"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Institution / Org
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Company / Org Name"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street, City, Pincode"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Email ID
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@gmail.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Emergency Contact No.
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Emergency Mobile #"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-rose-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Aadhaar Card No.
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                placeholder="12 Digit Aadhaar #"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Purpose of Membership
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="Sports Activities">Sports Activities</option>
                <option value="Food / Bar">Food / Bar</option>
                <option value="Outdoor Games">Outdoor Games</option>
                <option value="Indoor Games">Indoor Games</option>
                <option value="Library">Library</option>
                <option value="Cultural Events">Cultural Events</option>
                <option value="Other Activities">Other Activities</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="decl"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded"
              />
              <label htmlFor="decl" className="text-[11px] text-slate-300">
                Declaration Signed & Accepted (Club Rules & Regulations)
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Member Details...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>REGISTER MEMBER TO DB</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Member Records Table (8 cols) */}
        <div className="xl:col-span-8 bg-[#161b22] border border-[#21262d] rounded-2xl p-5 flex flex-col shadow-lg min-w-0">
          
          {/* Table Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#21262d]">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Member Directory ({createdCustomers.length})
              </h3>
              <p className="text-[11px] text-slate-400">View Member Cards, Mobile Numbers & Full Profiles</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin && (
                <button
                  onClick={exportFullMembersToExcel}
                  title="Export entire member registration dataset to Excel"
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
              )}

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Card #, Name, Mobile..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl pl-9 pr-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Table Content */}
          {listLoading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading member database...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex-1 min-h-56 flex flex-col items-center justify-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl p-6 text-center">
              <CreditCard className="w-10 h-10 stroke-1 mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">No member records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                    <th className="py-2.5 px-3">Card #</th>
                    <th className="py-2.5 px-3">Member Name & Profile</th>
                    <th className="py-2.5 px-3 text-amber-400">Mobile Number</th>
                    <th className="py-2.5 px-3">Occupation & Details</th>
                    <th className="py-2.5 px-3">Emergency Contact</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]/70 text-slate-200">
                  {paginatedCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#0d1117]/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-black text-amber-400 text-sm">
                        #{c.customer_code}
                      </td>
                      
                      {/* Member Name & Sub-details */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {c.photo_url ? (
                            <img
                              src={c.photo_url}
                              alt={c.full_name}
                              className="w-9 h-11 rounded-lg object-cover border border-amber-500/40 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-11 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center shrink-0 text-slate-500">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-100 text-sm">{c.full_name}</div>
                            {c.father_guardian_name && (
                              <span className="text-[10px] text-slate-400 block">S/o {c.father_guardian_name}</span>
                            )}
                            {c.blood_group && (
                              <span className="inline-block text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.2 rounded mt-0.5 mr-1">
                                {c.blood_group}
                              </span>
                            )}
                            {c.gender && (
                              <span className="inline-block text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded mt-0.5">
                                {c.gender}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number Prominent Column */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono font-black text-amber-400 text-sm">
                          <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Occupation & Address */}
                      <td className="py-2.5 px-3 text-[11px]">
                        {c.occupation ? (
                          <div className="font-bold text-slate-200 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{c.occupation}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No occupation</span>
                        )}
                        {c.address ? (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] flex items-center gap-1 mt-0.5" title={c.address}>
                            <MapPin className="w-3 h-3 text-amber-500/80 shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Emergency Contact */}
                      <td className="py-2.5 px-3 text-[11px]">
                        {c.emergency_contact_no ? (
                          <span className="font-mono text-rose-300 font-bold flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{c.emergency_contact_no}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openLiquorHistory(c)}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                            title="View Member Liquor Purchase History"
                          >
                            <Wine className="w-3.5 h-3.5" />
                            <span>Liquor</span>
                          </button>
                          <button
                            onClick={() => setApplicationModalCustomer(c)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1"
                            title="Print or Download Membership Application Form"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Application</span>
                          </button>
                          <button
                            onClick={() => setActiveQRModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black shadow-sm transition-all flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pass Card</span>
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="px-2.5 py-1 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] text-[11px] font-bold transition-all flex items-center gap-1"
                            title="Edit Member Details (Occupation, Email, Address, Emergency Contact)"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Instant High-Speed Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-2 border-t border-[#21262d] text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>
                    Showing{' '}
                    <strong className="text-slate-200">
                      {filteredCustomers.length === 0
                        ? 0
                        : (currentPage - 1) * (pageSize || filteredCustomers.length) + 1}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-slate-200">
                      {pageSize === 0
                        ? filteredCustomers.length
                        : Math.min(currentPage * pageSize, filteredCustomers.length)}
                    </strong>{' '}
                    of <strong className="text-amber-400">{filteredCustomers.length}</strong> members
                  </span>

                  <div className="flex items-center gap-1 ml-3">
                    <span className="text-[11px] text-slate-500 font-bold uppercase">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={0}>All ({createdCustomers.length})</option>
                    </select>
                  </div>
                </div>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-300 hover:text-slate-100 hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-[#0d1117] transition-all"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-300 hover:text-slate-100 hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-[#0d1117] transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-3 py-1 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs font-mono font-bold text-slate-200">
                      Page <strong className="text-amber-400">{currentPage}</strong> of{' '}
                      <strong>{totalPages}</strong>
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-300 hover:text-slate-100 hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-[#0d1117] transition-all"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-slate-300 hover:text-slate-100 hover:bg-[#21262d] disabled:opacity-30 disabled:hover:bg-[#0d1117] transition-all"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MEMBER DETAILS MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-2xl w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingCustomer(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                  <span>Edit Member Registration Profile — #{editingCustomer.customer_code}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update Mobile Number, Occupation, Email, Address, Emergency Contact & Application Info
                </p>
              </div>

              <button
                type="button"
                onClick={() => setApplicationModalCustomer(editingCustomer)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                title="Print or Download Member Application Form"
              >
                <FileText className="w-4 h-4" />
                <span>Print Application</span>
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {editError}
              </div>
            )}

            {/* Member Portrait Photo Capture & Upload Widget in Edit Modal */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex items-center gap-3">
              <div className="w-14 h-16 rounded-lg bg-[#161b22] border border-[#30363d] overflow-hidden flex items-center justify-center shrink-0 relative">
                {editPhotoUrl ? (
                  <img src={editPhotoUrl} alt="Member Portrait" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-600" />
                )}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                  Member Pass Photo (Live / Upload)
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openCameraModal(true, 'photo_edit')}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 transition-all shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Take Live Photo</span>
                  </button>

                  <label className="cursor-pointer px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMemberPhotoUpload(e, true)}
                      className="hidden"
                    />
                  </label>

                  {editPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditPhotoUrl(null)}
                      className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-[11px] transition-all"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Auto-Fill Details from ID Card Photo Widget in Edit Modal */}
            <div className="bg-[#0d1117] border border-amber-500/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Auto-Fill Details from ID Card Photo</span>
                </div>
                <span className="text-[10px] text-slate-400">Aadhaar, PAN, License</span>
              </div>

              <input
                type="file"
                accept="image/*, application/pdf"
                onChange={(e) => handleIDCardUpload(e, true)}
                className="hidden"
                id="editIDCardInput"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleIDCardUpload(e, true)}
                className="hidden"
                ref={editMobileCamRef}
                id="editMobileCamInput"
              />

              <div className="grid grid-cols-2 gap-2">
                <label
                  htmlFor="editIDCardInput"
                  className="cursor-pointer py-2.5 px-3 bg-[#21262d] hover:bg-[#30363d] text-amber-400 border border-[#30363d] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Upload ID File</span>
                </label>

                <button
                  type="button"
                  onClick={() => openCameraModal(true)}
                  className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <Camera className="w-4 h-4 stroke-[2.5]" />
                  <span>Live Camera</span>
                </button>
              </div>

              {editIsScanningOCR && (
                <div className="py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>OCR Extracting Details...</span>
                </div>
              )}

              {editOcrMessage && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{editOcrMessage}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Applicant / Card No.
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#0d1117] border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Applicant Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Father / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={editFatherName}
                    onChange={(e) => setEditFatherName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="text"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    placeholder="e.g. O+, A+, B+"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-rose-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    placeholder="Occupation..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Institution / Organization
                  </label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    placeholder="Company name..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Member residential address..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Email ID
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="member@email.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Emergency Contact No.
                  </label>
                  <input
                    type="text"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    placeholder="Emergency mobile #"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-rose-300 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Aadhaar Card No.
                  </label>
                  <input
                    type="text"
                    value={editAadhaar}
                    onChange={(e) => setEditAadhaar(e.target.value)}
                    placeholder="12 Digit Aadhaar #"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Purpose of Membership
                  </label>
                  <select
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sports Activities">Sports Activities</option>
                    <option value="Food / Bar">Food / Bar</option>
                    <option value="Outdoor Games">Outdoor Games</option>
                    <option value="Indoor Games">Indoor Games</option>
                    <option value="Library">Library</option>
                    <option value="Cultural Events">Cultural Events</option>
                    <option value="Other Activities">Other Activities</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editDecl"
                  checked={editDeclaration}
                  onChange={(e) => setEditDeclaration(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
                <label htmlFor="editDecl" className="text-[11px] text-slate-300">
                  Declaration Accepted & Signed
                </label>
              </div>

              <div className="pt-3 border-t border-[#21262d] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const custId = editingCustomer.id;
                    const custName = editingCustomer.full_name;
                    const custCode = editingCustomer.customer_code;
                    setEditingCustomer(null);
                    handleDeleteCustomer(custId, custName, custCode);
                  }}
                  className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Member</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>SAVE CHANGES</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER LIQUOR PURCHASE HISTORY MODAL */}
      {liquorHistoryCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 max-w-2xl w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-4">
            <button
              onClick={() => setLiquorHistoryCustomer(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-400 text-lg">
                  #{liquorHistoryCustomer.customer_code}
                </span>
                <h3 className="text-lg font-black text-slate-100">
                  {liquorHistoryCustomer.full_name} — Member Liquor Details
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Phone: {liquorHistoryCustomer.phone} • Full itemized bar liquor purchase log
              </p>
            </div>

            {/* Spend & Bottle Summary Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#0d1117] border border-[#30363d] p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Total Orders</span>
                <span className="font-black text-slate-200 font-mono text-sm">{customerSales.length} Transactions</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Bottles Purchased</span>
                <span className="font-black text-amber-400 font-mono text-sm">{totalMemberBottles} Drinks / Bottles</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-mono block">Total Bar Spend</span>
                <span className="font-black text-emerald-400 font-mono text-sm">₹{totalMemberLiquorSpend}</span>
              </div>
            </div>

            {/* Purchases Table */}
            {liquorLoading ? (
              <div className="py-8 flex justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading member liquor history...</span>
              </div>
            ) : customerSales.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border-2 border-dashed border-[#21262d] rounded-xl">
                No liquor purchases recorded for this member yet.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto overflow-x-auto border border-[#21262d] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0d1117] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#21262d]">
                      <th className="py-2 px-3">Date / Time</th>
                      <th className="py-2 px-3">Liquor Name</th>
                      <th className="py-2 px-3">Brand & Volume</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262d]/70 text-slate-200 text-[11px]">
                    {customerSales.map((s) => (
                      <tr key={s.id} className="hover:bg-[#0d1117]/60 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-400 whitespace-nowrap">
                          {s.sale_date ? new Date(s.sale_date).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-100">{s.product_name}</td>
                        <td className="py-2 px-3 text-slate-400">
                          {s.brand_name || 'N/A'} ({s.volume_ml}ml)
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-400">{s.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">₹{s.unit_price}</td>
                        <td className="py-2 px-3 text-right font-mono font-black text-amber-400">₹{s.total_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLiquorHistoryCustomer(null)}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Excel (.xlsx / .csv) Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 max-w-md w-full relative shadow-2xl animate-in fade-in zoom-in duration-200 space-y-3">
            <button
              onClick={() => {
                setShowBulkModal(false);
                setBulkResult(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Batch Import Member Records (CSV / XLSX / XLS)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Batch upload 1,000+ member cards, names, mobile numbers, occupation, DOB, & registration details automatically.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs">Download Sample Import Templates</span>
                  <span className="text-[10px] text-slate-400">All 15 Registration Fields</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadSampleXlsxTemplate}
                    className="py-1.5 px-3 bg-[#21262d] hover:bg-[#30363d] text-emerald-400 border border-[#30363d] font-extrabold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleCsvTemplate}
                    className="py-1.5 px-3 bg-[#21262d] hover:bg-[#30363d] text-amber-400 border border-[#30363d] font-extrabold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-[#30363d] hover:border-amber-500/50 rounded-xl text-center transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .tsv, .ods"
                  onChange={handleSheetFileUpload}
                  className="hidden"
                  id="excelFileInput"
                />
                <label htmlFor="excelFileInput" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <Upload className="w-6 h-6 text-amber-400" />
                  <span className="font-bold text-slate-200 text-xs">Click to select CSV or Excel sheet file</span>
                  <span className="text-[10px] text-slate-400">Supports .xlsx, .xls, .csv, .tsv, and .ods files (Up to 2,000 rows)</span>
                </label>
              </div>

              {bulkSubmitting && (
                <div className="p-3 text-center text-amber-400 text-xs flex justify-center items-center gap-2 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing and creating member accounts...</span>
                </div>
              )}

              {bulkResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <div className="font-bold text-emerald-400">
                    Imported {bulkResult.created_count} members successfully!
                  </div>
                  {bulkResult.skipped_count > 0 && (
                    <div className="text-slate-400 text-[11px]">
                      Skipped {bulkResult.skipped_count} existing or duplicate phone rows.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkResult(null);
                }}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Render Digital Membership Card Modal */}
      {activeQRModal && (
        <MembershipCard
          customer={activeQRModal}
          qrImageUrl={qrImageUrl}
          onClose={() => setActiveQRModal(null)}
        />
      )}

      {/* Render Official Membership Application Form Modal */}
      {applicationModalCustomer && (
        <ApplicationFormModal
          customer={applicationModalCustomer}
          onClose={() => setApplicationModalCustomer(null)}
        />
      )}

      {/* Live Camera Scanner Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl space-y-0">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#21262d] flex items-center justify-between bg-[#0d1117]">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Camera className="w-4 h-4" />
                <span>Live Camera ID Scanner</span>
              </div>
              <button
                type="button"
                onClick={closeCameraModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Stream Container */}
            <div className="relative bg-black aspect-[4/3] sm:aspect-video flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* ID Card Overlay Frame Guide */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full h-full max-w-sm max-h-[75%] border-2 border-dashed border-amber-400/80 rounded-xl bg-amber-400/5 shadow-[0_0_20px_rgba(245,158,11,0.2)] flex flex-col justify-between p-3">
                  <div className="flex justify-between text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                    <span>Aadhaar / PAN Card</span>
                    <span>Align Front</span>
                  </div>
                  <div className="text-center text-amber-300 text-xs font-semibold bg-slate-950/80 py-1 px-3 rounded-lg self-center backdrop-blur-sm border border-amber-400/30">
                    Center ID card inside frame
                  </div>
                </div>
              </div>

              {isCameraStarting && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 text-amber-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Starting camera stream...</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-4 z-10">
                  <AlertTriangle className="w-10 h-10 text-amber-400 animate-bounce" />
                  <p className="text-xs text-amber-200 font-semibold max-w-xs">{cameraError}</p>

                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => {
                        closeCameraModal();
                        if (cameraIsEditMode) editMobileCamRef.current?.click();
                        else regMobileCamRef.current?.click();
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Camera className="w-4 h-4 stroke-[2.5]" />
                      <span>OPEN NATIVE PHONE CAMERA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startCameraStream(facingMode)}
                      className="w-full py-2 px-3 bg-[#21262d] text-slate-300 hover:bg-[#30363d] text-xs font-bold rounded-xl border border-[#30363d] transition-all"
                    >
                      Retry Live Stream
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-[#0d1117] border-t border-[#21262d] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleCameraFacingMode}
                className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-[#30363d] transition-all"
                title="Switch between front and back camera"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Flip Camera</span>
              </button>

              <button
                type="button"
                onClick={capturePhotoAndScan}
                disabled={isCameraStarting || !!cameraError}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4 stroke-[2.5]" />
                <span>CAPTURE PHOTO & SCAN</span>
              </button>

              <button
                type="button"
                onClick={closeCameraModal}
                className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-slate-400 hover:text-slate-200 font-bold rounded-xl text-xs border border-[#30363d] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
