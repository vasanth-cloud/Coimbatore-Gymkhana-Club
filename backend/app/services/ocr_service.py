import io
import os
import re
import shutil
import numpy as np
from PIL import Image, ImageEnhance, ImageOps

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    pytesseract = None
    HAS_PYTESSERACT = False

# Set Tesseract executable path if not automatically found on Windows
if HAS_PYTESSERACT:
    TESSERACT_CMD = shutil.which("tesseract")
    if not TESSERACT_CMD:
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                break


class IDCardOCRService:

    @staticmethod
    def process_id_card_image(image_bytes: bytes) -> dict:
        """
        Processes an uploaded ID card image (Aadhaar Card, PAN Card, Driving License, etc.)
        using OCR and extracts member registration fields.
        """
        if not HAS_PYTESSERACT:
            raise ValueError("pytesseract module is not installed in current Python environment")

        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Could not open image file: {str(e)}")

        # Convert to RGB mode
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")

        # 1. Auto-crop dark letterboxing/borders if screenshot/photo viewer
        cropped_image = IDCardOCRService._crop_document_area(image)

        # 2. High-Resolution Contrast & Sharpness Preprocessing
        processed_image = IDCardOCRService._preprocess_image(cropped_image)

        # 3. Dual-PSM Fast OCR Strategy (PSM 3 for layout + PSM 6 for block text)
        t1 = pytesseract.image_to_string(processed_image, lang="eng", config="--psm 3")
        t2 = pytesseract.image_to_string(processed_image, lang="eng", config="--psm 6")
        
        combined_text = f"{t1}\n{t2}"

        # Parse extracted text for Indian ID Cards (Aadhaar, PAN, License)
        extracted_data = IDCardOCRService._parse_id_text(combined_text)
        extracted_data["raw_text"] = combined_text.strip()

        return extracted_data

    @staticmethod
    def _crop_document_area(image: Image.Image) -> Image.Image:
        """
        Detects document bounding box and crops away dark padding/letterboxing.
        """
        try:
            arr = np.array(image)
            gray_arr = arr.mean(axis=2)
            # Find non-dark pixels (brightness > 40)
            mask = gray_arr > 40
            nonzero = np.argwhere(mask)
            if nonzero.size > 0:
                ymin, xmin = nonzero.min(axis=0)
                ymax, xmax = nonzero.max(axis=0)
                
                # Ensure minimum width & height bounding box
                h, w = gray_arr.shape
                if (xmax - xmin) > w * 0.2 and (ymax - ymin) > h * 0.2:
                    return image.crop((xmin, ymin, xmax, ymax))
        except Exception:
            pass
        return image

    @staticmethod
    def _preprocess_image(image: Image.Image) -> Image.Image:
        """
        Optimizes image dimensions, contrast, grayscale, and sharpness for physical ID card photos.
        """
        # Grayscale & Auto-contrast
        gray = ImageOps.grayscale(image)
        autocontrasted = ImageOps.autocontrast(gray, cutoff=2)
        w, h = gray.size

        # Cap max dimension to 1800px for speed while maintaining clear text detail
        if h > 2000 or w > 2400:
            scale = 1800.0 / float(max(w, h))
            scaled = autocontrasted.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        elif h < 1000:
            scale = 1600.0 / float(h)
            scaled = autocontrasted.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        else:
            scaled = autocontrasted

        # Contrast enhancement
        enhancer = ImageEnhance.Contrast(scaled)
        enhanced = enhancer.enhance(1.8)

        # Sharpness enhancement
        sharpness = ImageEnhance.Sharpness(enhanced)
        enhanced = sharpness.enhance(1.4)

        return enhanced

    @staticmethod
    def _is_garbage_ocr_name(name_str: str) -> bool:
        """
        Detects garbled OCR noise produced when scanning non-Latin text (e.g. Tamil script) in lang='eng'
        or UI label misreads.
        """
        words = name_str.split()
        if not words:
            return True

        # Common OCR garbage consonant clusters and noise tokens from non-English scripts & UI misreads
        invalid_clusters = [
            "bjs", "hws", "whw", "jsf", "sth", "thw", "fth", "jst", "fst", "tsh",
            "bhw", "stn", "vj", "vw", "xj", "qj", "zxz", "gfr", "rce", "gtt", "bwp",
            "eet", "eio", "obh", "owh", "bj", "tshw", "bahu", "misses", "ier", "tard", "nock",
            "meron", "dete", "usted", "hetolagar", "sercenn", "pisort", "usirenebd", "uternbd"
        ]

        invalid_exact_words = {
            "bahu", "misses", "ier", "tard", "nock", "meron", "dete", "eet", "eieot",
            "usted", "hetolagar", "sercenn", "pisort", "usirenebd", "ateeigs", "uternbd",
            "wide", "usrernmnbd", "eerciment", "eero", "oboue", "owhws", "obhws", "bjsthiw",
            "thw", "edit", "profile", "registration", "member", "details", "mobile",
            "emergency", "contact", "purpose", "declaration", "accepted", "signed",
            "cancel", "delete", "changes", "sports", "activities", "upload", "file",
            "camera", "live", "auto", "fill", "autofill", "option", "options", "card",
            "residential", "institution", "organization", "company", "occupation"
        }

        for word in words:
            w_lower = word.lower()

            if w_lower in invalid_exact_words:
                return True
            
            # Check forbidden noise clusters
            for cluster in invalid_clusters:
                if cluster in w_lower:
                    return True

            # Check for 4 or more consecutive consonants (e.g. 'bjsthiw' has 5)
            consonants_run = 0
            max_consonants_run = 0
            for char in w_lower:
                if char in "bcdfghjklmnpqrstvwxyz":
                    consonants_run += 1
                    if consonants_run > max_consonants_run:
                        max_consonants_run = consonants_run
                else:
                    consonants_run = 0
            
            if max_consonants_run >= 4:
                return True

            # Check vowel ratio
            vowels_count = sum(1 for c in w_lower if c in "aeiouy")
            vowel_ratio = vowels_count / len(w_lower)
            if vowel_ratio < 0.20 or vowel_ratio > 0.75:
                return True

        return False

    @staticmethod
    def _parse_id_text(text: str) -> dict:
        result = {
            "document_type": "Identity Card",
            "full_name": None,
            "father_guardian_name": None,
            "date_of_birth": None,
            "gender": None,
            "phone": None,
            "aadhaar_card_no": None,
            "pan_card_no": None,
            "license_no": None,
            "address": None,
        }

        if not text or not text.strip():
            return result

        clean_text = text.replace("\r", "")

        # -------------------------------------------------------------
        # 1. AADHAAR CARD NUMBER (12 digits, e.g. 6821 1343 8177)
        # -------------------------------------------------------------
        aadhaar_match = re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", clean_text)
        if aadhaar_match:
            candidate = aadhaar_match.group(0).replace(" ", "")
            if len(candidate) == 12:
                result["aadhaar_card_no"] = candidate
                result["document_type"] = "Aadhaar Card"

        # -------------------------------------------------------------
        # 2. PAN CARD NUMBER (10 chars, e.g. ABCDE1234F)
        # -------------------------------------------------------------
        pan_match = re.search(r"\b[A-Z]{5}\d{4}[A-Z]{1}\b", clean_text)
        if pan_match:
            result["pan_card_no"] = pan_match.group(0).upper()
            if result["document_type"] == "Identity Card":
                result["document_type"] = "PAN Card"

        # -------------------------------------------------------------
        # 3. DRIVING LICENSE / VOTER ID NUMBER
        # -------------------------------------------------------------
        dl_match = re.search(r"\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{11}\b|\b[A-Z]{2}\d{13}\b|\b[A-Z]{3}\d{7}\b", clean_text)
        if dl_match:
            result["license_no"] = dl_match.group(0).replace(" ", "").replace("-", "")
            if result["document_type"] == "Identity Card":
                result["document_type"] = "Driving License"

        # -------------------------------------------------------------
        # 4. MOBILE PHONE NUMBER (10 digits starting with 6-9, optional +91 or spaces)
        # -------------------------------------------------------------
        phone_match = re.search(r"(?:\+91[\s\-]?)?\b([6-9]\d{4}\s?\d{5})\b|\b([6-9]\d{9})\b", clean_text)
        if phone_match:
            raw_phone = phone_match.group(1) or phone_match.group(2)
            result["phone"] = raw_phone.replace(" ", "")

        # -------------------------------------------------------------
        # 5. DATE OF BIRTH / DOB (DD/MM/YYYY, DD-MM-YYYY, or DD . MM . YYYY)
        # -------------------------------------------------------------
        dob_match = re.search(r"\b(\d{2})[\s\/\.-]+(\d{2})[\s\/\.-]+(\d{4})\b", clean_text)
        if dob_match:
            day, month, year = dob_match.group(1), dob_match.group(2), dob_match.group(3)
            if 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
                result["date_of_birth"] = f"{day}/{month}/{year}"
        else:
            yob_match = re.search(r"\b(?:Year of Birth|YOB|DOB)[:\s\.\-]+(19\d{2}|20[0-2]\d)\b", clean_text, re.IGNORECASE)
            if yob_match:
                result["date_of_birth"] = f"01/01/{yob_match.group(1)}"

        # -------------------------------------------------------------
        # 6. GENDER (Male / Female / Transgender)
        # -------------------------------------------------------------
        if re.search(r"\b(female|femal|women|woman)\b", clean_text, re.IGNORECASE):
            result["gender"] = "Female"
        elif re.search(r"\b(male|man|boy)\b", clean_text, re.IGNORECASE):
            result["gender"] = "Male"

        lines = [line.strip() for line in clean_text.split("\n") if line.strip()]
        ignore_keywords = {
            "government", "india", "unique", "identification", "authority",
            "income", "tax", "department", "republic", "driving", "licence",
            "license", "transport", "aadhaar", "card", "signature", "male",
            "female", "dob", "date", "birth", "address", "enrollment", "help",
            "father", "mother", "husband", "issue", "valid", "pin", "code",
            "to", "enrolment", "no", "your", "download", "year", "govt", "open",
            "with", "edit", "safer", "gece", "gore", "aero", "state", "district",
            "tamil", "nadu", "dharmapuri", "chennai", "coimbatore", "karnataka",
            "kerala", "andhra", "telangana", "delhi", "mumbai", "india", "jpg", "png",
            "jpeg", "so", "do", "wo", "co", "husband", "guardian",
            "dete", "meron", "eet", "eieot", "usted", "hetolagar", "sercenn", "pisort",
            "usirenebd", "ateeigs", "uternbd", "wide", "usrernmnbd", "eerciment",
            "eero", "oboue", "owhws", "obhws", "bjsthiw", "thw",
            "bahu", "misses", "ier", "tard", "nock", "profile", "registration",
            "member", "details", "mobile", "emergency", "contact", "purpose",
            "declaration", "accepted", "signed", "cancel", "delete", "changes",
            "sports", "activities", "upload", "file", "camera", "live", "auto",
            "fill", "autofill", "option", "options", "residential", "institution",
            "organization", "company", "occupation", "scanner", "entry", "navigation",
            "system", "connected", "backend", "fastapi", "postgresql", "directory",
            "futoedetals", "futo", "peto", "applicant", "blood", "group", "full", "name"
        }

        # -------------------------------------------------------------
        # 7. FATHER / GUARDIAN / CARE OF NAME (Strict prefix requirement)
        # -------------------------------------------------------------
        father_match = re.search(
            r"\b(S\/O|C\/O|D\/O|W\/O|SO|CO|DO|WO|Father|Husband|Thanthai)[:\s\.\-]+([A-Za-z\s]+)",
            clean_text,
            re.IGNORECASE,
        )
        if father_match:
            raw_father = father_match.group(2).split("\n")[0].strip()
            raw_father = re.sub(r"\b(DOB|Date|Birth|Male|Female|Address|Pin|Aadhaar|Card|No|VID|Name|Guardian|Gender)\b.*", "", raw_father, flags=re.IGNORECASE)
            clean_father = re.sub(r"[^a-zA-Z\s]", "", raw_father).strip()
            if 2 <= len(clean_father) <= 50 and clean_father.lower() not in ignore_keywords and not IDCardOCRService._is_garbage_ocr_name(clean_father):
                result["father_guardian_name"] = clean_father.title()

        # -------------------------------------------------------------
        # 8. APPLICANT FULL NAME HEURISTIC & SCORING
        # -------------------------------------------------------------
        candidate_names = []
        for line in lines:
            if re.match(r"^(S\/O|C\/O|D\/O|W\/O|SO|CO|DO|WO|Father|Husband|Address|DOB|Date|Aadhaar|VID|Enrolment|Govt|Government|Edit|Member|Update|Auto|Full|Applicant|Blood|Group)\b", line, re.IGNORECASE):
                continue

            clean_line = re.sub(r"[^a-zA-Z\s]", "", line).strip()
            words = clean_line.split()

            if 1 <= len(words) <= 4:
                is_valid = True
                for w in words:
                    w_lower = w.lower()
                    if w_lower in ignore_keywords or len(w) < 2:
                        is_valid = False
                        break

                if is_valid and len(clean_line) >= 3 and not IDCardOCRService._is_garbage_ocr_name(clean_line):
                    candidate_names.append((clean_line.title(), line))

        if candidate_names:
            best_candidate = None
            best_score = -1

            father_name = result.get("father_guardian_name")
            for cand, raw_line in candidate_names:
                score = 0

                # Match father name / surname
                if father_name and father_name.lower() in cand.lower():
                    score += 50

                # Bonus for ALL CAPS in raw OCR (official ID card names are almost always ALL CAPS)
                if raw_line.isupper() and len(raw_line.strip()) >= 4:
                    score += 35

                # Standard Title Case format
                if cand.istitle():
                    score += 10

                # Ideal name word length
                cand_words = cand.split()
                if len(cand_words) == 2:
                    score += 15
                elif len(cand_words) == 3:
                    score += 10

                if score > best_score:
                    best_score = score
                    best_candidate = cand

            result["full_name"] = best_candidate

        # -------------------------------------------------------------
        # 9. RESIDENTIAL ADDRESS & PINCODE
        # -------------------------------------------------------------
        pincode_match = re.search(r"\b\d{6}\b", clean_text)
        addr_parts = []
        in_addr_section = False

        for line in lines:
            # Fix state misreads in Tamil Nadu addresses
            line = re.sub(r"\b(Tard Nock|Tard Nack|Tami! Nadu|Tami1 Nadu|Taml Nadu|Tanil Nadu|Tarnil Nadu)\b", "Tamil Nadu", line, flags=re.IGNORECASE)
            
            l_lower = line.lower()
            if any(kw in l_lower for kw in ["address", "addr", "street", "nagar", "road", "post", "dist", "coimbatore", "chennai", "dharmapuri", "door", "flat", "pincode", "tamil nadu"]):
                in_addr_section = True

            if in_addr_section:
                clean_l = re.sub(r"^(Address|ADDRESS|Addr|Residential Address)[:\s]*", "", line, flags=re.IGNORECASE).strip()
                if clean_l and not re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", clean_l) and not re.search(r"\b\d{2}[\/\.-]\d{2}[\/\.-]\d{4}\b", clean_l):
                    if clean_l not in addr_parts and not any(ui_kw in clean_l.lower() for ui_kw in ["declaration", "accepted", "signed", "delete member", "save changes", "sports activities"]):
                        addr_parts.append(clean_l)

            if pincode_match and pincode_match.group(0) in line:
                in_addr_section = False

        if addr_parts:
            result["address"] = ", ".join(addr_parts[:4])

        return result


