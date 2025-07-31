# app/services/aws_service.py
import boto3
from ..config import settings
import datetime
import json 
import re
import traceback 
import io
from PyPDF2 import PdfReader
import docx
from typing import Optional, Dict, Any
import magic  # For file type detection

# --- CLIENT INITIALIZATION ---
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
    endpoint_url=f"https://s3.{settings.AWS_REGION}.amazonaws.com",
    config=boto3.session.Config(signature_version='s3v4')
)

textract_client = boto3.client(
    'textract',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

comprehend_client = boto3.client(
    'comprehend',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION
)

def detect_file_type(file_bytes: bytes) -> str:
    """
    Detect the actual file type using python-magic
    """
    try:
        mime_type = magic.from_buffer(file_bytes, mime=True)
        print(f"🔍 Detected MIME type: {mime_type}")
        return mime_type
    except Exception as e:
        print(f"⚠️  Could not detect file type: {e}")
        return "unknown"

def extract_text_from_pdf_local(file_bytes: bytes) -> str:
    """
    Extract text from PDF using PyPDF2 as fallback
    """
    try:
        pdf_file = io.BytesIO(file_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        
        print(f"📄 PyPDF2 extracted {len(text)} characters")
        return text.strip()
    except Exception as e:
        print(f"❌ PyPDF2 extraction failed: {e}")
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """
    Extract text from DOCX files
    """
    try:
        doc_file = io.BytesIO(file_bytes)
        doc = docx.Document(doc_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        print(f"📄 DOCX extracted {len(text)} characters")
        return text.strip()
    except Exception as e:
        print(f"❌ DOCX extraction failed: {e}")
        return ""

def validate_pdf_for_textract(file_bytes: bytes) -> bool:
    """
    Validate if PDF is suitable for Textract
    """
    try:
        # Check file size (Textract has limits)
        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > 10:  # Textract limit is 10MB for synchronous calls
            print(f"⚠️  File too large for Textract: {file_size_mb:.2f}MB")
            return False
        
        # Try to read with PyPDF2 to ensure it's a valid PDF
        pdf_file = io.BytesIO(file_bytes)
        pdf_reader = PdfReader(pdf_file)
        
        if len(pdf_reader.pages) == 0:
            print("⚠️  PDF has no pages")
            return False
        
        # Check if PDF is encrypted
        if pdf_reader.is_encrypted:
            print("⚠️  PDF is encrypted")
            return False
        
        return True
    except Exception as e:
        print(f"⚠️  PDF validation failed: {e}")
        return False

def extract_resume_data_patterns(text: str) -> Dict[str, Any]:
    """
    Enhanced pattern matching for resume data extraction
    """
    extracted_data = {}
    
    # 1. Extract Email (multiple patterns)
    email_patterns = [
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        r'(?i)email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
        r'(?i)e-mail[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
    ]
    
    for pattern in email_patterns:
        email_match = re.search(pattern, text)
        if email_match:
            email = email_match.group(1) if email_match.lastindex else email_match.group(0)
            extracted_data['email'] = email.strip()
            print(f"✉️  Found Email: {extracted_data['email']}")
            break
    
    # 2. Extract Phone Number (Indian format with international variations)
    phone_patterns = [
        r'(?:\+91[-\s]?)?([6-9]\d{9})',
        r'(?:91[-\s]?)?([6-9]\d{9})',
        r'(?i)(?:phone|mobile|contact)[:\s]*(?:\+91[-\s]?)?([6-9]\d{9})',
        r'(\d{5}\s?\d{5})',  # 5-digit space format
        r'([6-9]\d{2}[-\s]?\d{3}[-\s]?\d{4})'  # Formatted phone numbers
    ]
    
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            phone = re.sub(r'[-\s]', '', phone_match.group(1))
            if len(phone) == 10 and phone.startswith(('6', '7', '8', '9')):
                extracted_data['contact'] = phone
                print(f"📞 Found Contact: {extracted_data['contact']}")
                break
    
    # 3. Extract Name (IMPROVED TWO-STEP LOGIC)
# 3. Extract Name (NEW 3-STEP LOGIC)
    lines = text.split('\n')
    # Heuristic 1: Check the raw text start for an all-caps name (robust against line merging)
    if 'name' not in extracted_data:
        potential_name_block = text[:50].strip()
        match = re.match(r'^([A-Z][A-Z\s.]+ [A-Z][A-Z\s.]+)', potential_name_block)
        if match:
            if 1 < len(match.group(1).split()) <= 3:
                extracted_data['name'] = match.group(1).strip().title()
                print(f"👤 Found Name (Initial Block): {extracted_data['name']}")

    # Heuristic 2 & 3 (Fallback): If the first heuristic failed, iterate through the first few lines.
    if 'name' not in extracted_data:
        for line in lines[:5]:
            clean_line = line.strip()
            if not clean_line or '@' in clean_line or 'http' in clean_line or len(clean_line) > 50:
                continue

            # Heuristic 2: Look for an all-caps name on its own line
            if clean_line.isupper() and 1 < len(clean_line.split()) <= 3 and re.match(r'^[A-Z\s.]+$', clean_line):
                extracted_data['name'] = clean_line.title()
                print(f"👤 Found Name (ALL CAPS Line): {extracted_data['name']}")
                break

            # Heuristic 3: Fallback for mixed-case names
            if 1 < len(clean_line.split()) <= 3 and re.match(r'^[a-zA-Z\s.]+$', clean_line):
                if not re.search(r'(?i)(details|summary|objective|profile)', clean_line):
                    extracted_data['name'] = clean_line.title()
                    print(f"👤 Found Name (Mixed Case Line): {extracted_data['name']}")
                    break
    
    # 4. Extract Address (look for address patterns)
    address_patterns = [
        r'(?i)address[:\s]*([^\n]+(?:\n[^\n]+)*?)(?=\n(?:phone|email|experience|education|skills|\w+:)|\Z)',
        r'(?i)(?:permanent|current)\s+address[:\s]*([^\n]+)',
        r'([A-Za-z\s,.-]+,\s*[A-Za-z\s]+[-\s]*\d{6})',  # Indian pincode pattern
    ]
    
    for pattern in address_patterns:
        address_match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
        if address_match:
            address = address_match.group(1).strip()
            # Clean up the address
            address = re.sub(r'\s+', ' ', address.replace('\n', ', '))
            if len(address) > 10:  # Reasonable address length
                extracted_data['address'] = address
                print(f"🏠 Found Address: {extracted_data['address']}")
                break
    
    # 5. Extract LinkedIn Profile
    linkedin_patterns = [
        r'(?i)linkedin[:\s]*(?:profile[:\s]*)?(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9-]+)',
        r'(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9-]+)',
        r'(?i)linkedin[:\s]*([a-zA-Z0-9-]+)'
    ]
    
    for pattern in linkedin_patterns:
        linkedin_match = re.search(pattern, text)
        if linkedin_match:
            linkedin_id = linkedin_match.group(1)
            full_url = f"https://linkedin.com/in/{linkedin_id}"
            extracted_data['linkedIn'] = full_url
            print(f"🔗 Found LinkedIn: {extracted_data['linkedIn']}")
            break
    
    # 6. Extract Age (if explicitly mentioned)
    age_patterns = [
        r'(?i)age[:\s]*(\d{2})',
        r'(?i)(\d{2})\s*years?\s*old',
        r'(?i)born[:\s]*\w+\s+\d{1,2},?\s*(\d{4})'  # Birth year to calculate age
    ]
    
    for pattern in age_patterns:
        age_match = re.search(pattern, text)
        if age_match:
            age_value = int(age_match.group(1))
            if pattern.endswith(r'(\d{4})'):  # Birth year pattern
                current_year = datetime.datetime.now().year
                age_value = current_year - age_value
            
            if 18 <= age_value <= 65:
                extracted_data['age'] = str(age_value)
                print(f"🎂 Found Age: {extracted_data['age']}")
                break
    
    # 7. Extract Experience Level
    experience_patterns = [
        r'(?i)(\d+(?:\.\d+)?)\s*(?:\+)?\s*years?\s*(?:of\s+)?experience',
        r'(?i)experience[:\s]*(\d+(?:\.\d+)?)\s*(?:\+)?\s*years?',
        r'(?i)(\d+)\s*(?:\+)?\s*years?\s*in\s+\w+',
    ]
    
    for pattern in experience_patterns:
        exp_match = re.search(pattern, text)
        if exp_match:
            years = float(exp_match.group(1))
            if years < 1:
                extracted_data['experience'] = "0-1 Year"
            elif years <= 5:
                extracted_data['experience'] = "1-5 Years"
            elif years <= 10:
                extracted_data['experience'] = "5-10 Years"
            else:
                extracted_data['experience'] = "10+ Years"
            print(f"💼 Found Experience: {extracted_data['experience']}")
            break
    
    # 8. Extract Education Details
    # Look for graduation year
    grad_year_patterns = [
        r'(?i)(?:graduated|graduation|passed)[:\s]*(\d{4})',
        r'(?i)(?:bachelor|master|b\.?tech|m\.?tech|bca|mca|ba|ma|bsc|msc)[^\n]*(\d{4})',
        r'(?i)(\d{4})[^\n]*(?:bachelor|master|b\.?tech|m\.?tech|bca|mca|ba|ma|bsc|msc)'
    ]
    
    for pattern in grad_year_patterns:
        year_match = re.search(pattern, text)
        if year_match:
            year = int(year_match.group(1))
            if 1990 <= year <= datetime.datetime.now().year:
                extracted_data['gradYear'] = str(year)
                print(f"🎓 Found Graduation Year: {extracted_data['gradYear']}")
                break
    
    # Look for 12th passing year
    twelve_patterns = [
        r'(?i)(?:12th|class\s*12|higher\s*secondary|intermediate)[^\n]*(\d{4})',
        r'(?i)(\d{4})[^\n]*(?:12th|class\s*12|higher\s*secondary|intermediate)'
    ]
    
    for pattern in twelve_patterns:
        twelve_match = re.search(pattern, text)
        if twelve_match:
            year = int(twelve_match.group(1))
            if 1990 <= year <= datetime.datetime.now().year:
                extracted_data['pass12'] = str(year)
                print(f"📚 Found 12th Year: {extracted_data['pass12']}")
                break
    
    return extracted_data

def analyze_resume_for_autofill(file_bytes: bytes) -> dict:
    """
    Enhanced resume analysis with multiple extraction methods and better error handling
    """
    print("\n--- Starting enhanced resume autofill analysis ---")
    
    try:
        # Step 1: Detect file type
        file_type = detect_file_type(file_bytes)
        print(f"📎 File type detected: {file_type}")
        
        text_content = ""
        extraction_method = "none"
        
        # Step 2: Try different extraction methods based on file type
        if 'pdf' in file_type.lower():
            print("🔄 Attempting PDF processing...")
            
            # First, try Textract if PDF is valid
            if validate_pdf_for_textract(file_bytes):
                try:
                    print("☁️  Trying AWS Textract...")
                    response = textract_client.detect_document_text(
                        Document={'Bytes': file_bytes}
                    )
                    
                    lines = [item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"]
                    text_content = '\n'.join(lines)
                    extraction_method = "textract"
                    print(f"✅ Textract successful: {len(lines)} lines extracted")
                    
                except Exception as textract_error:
                    print(f"❌ Textract failed: {textract_error}")
                    print("🔄 Falling back to PyPDF2...")
                    text_content = extract_text_from_pdf_local(file_bytes)
                    extraction_method = "pypdf2"
            else:
                print("🔄 PDF not suitable for Textract, using PyPDF2...")
                text_content = extract_text_from_pdf_local(file_bytes)
                extraction_method = "pypdf2"
        
        elif 'word' in file_type.lower() or 'officedocument' in file_type.lower():
            print("🔄 Processing DOCX file...")
            text_content = extract_text_from_docx(file_bytes)
            extraction_method = "docx"
        
        else:
            print(f"⚠️  Unsupported file type: {file_type}")
            return {"error": f"Unsupported file type: {file_type}"}
        
        # Step 3: Validate extracted text
        if not text_content or len(text_content.strip()) < 50:
            print("❌ Insufficient text extracted from document")
            return {"error": "Could not extract readable text from the document"}
        
        print(f"📄 Total text extracted: {len(text_content)} characters using {extraction_method}")
        
        # Step 4: Extract structured data using enhanced pattern matching
        print("🔍 Analyzing text for resume data...")
        extracted_data = extract_resume_data_patterns(text_content)
        
        # Step 5: Add metadata
        extracted_data['_extraction_method'] = extraction_method
        extracted_data['_text_length'] = len(text_content)
        
        print(f"🏁 Extraction complete. Found {len(extracted_data)} fields: {list(extracted_data.keys())}")
        print("--- Enhanced resume autofill analysis finished ---\n")
        
        return extracted_data
        
    except Exception as e:
        print(f"🚨🚨🚨 CRITICAL ERROR during resume autofill analysis 🚨🚨🚨")
        print(f"Exception Type: {type(e).__name__}")
        print(f"Exception Details: {e}")
        traceback.print_exc()
        print("--- End of error traceback ---\n")
        return {"error": f"Analysis failed: {str(e)}"}

def analyze_job_description_pdf(file_bytes: bytes) -> dict:
    """
    Analyzes a job description PDF using a hybrid of Textract's Tables, Forms,
    and Raw Text analysis for the best accuracy.
    Enhanced to handle tabular data, form fields, and raw text patterns.
    """
    try:
        print("🔄 Starting comprehensive job description PDF analysis...")
        
        # --- Step 1: Use Textract's TABLES and FORMS features ---
        print("☁️  Running Textract TABLES and FORMS analysis...")
        analyze_response = textract_client.analyze_document(
            Document={'Bytes': file_bytes},
            FeatureTypes=["TABLES", "FORMS"]
        )
        
        # --- Step 2: Use Textract's DetectText for raw text extraction ---
        print("☁️  Running Textract TEXT detection...")
        text_response = textract_client.detect_document_text(
            Document={'Bytes': file_bytes}
        )
        
        # --- Process TABLES response ---
        def extract_tables_data(blocks):
            """Extract key-value pairs from table structures"""
            tables_data = {}
            table_blocks = [block for block in blocks if block['BlockType'] == 'TABLE']
            
            for table_block in table_blocks:
                print(f"📊 Processing table with {len(table_block.get('Relationships', []))} relationships")
                
                # Get table cells
                cell_blocks = []
                if 'Relationships' in table_block:
                    for relationship in table_block['Relationships']:
                        if relationship['Type'] == 'CHILD':
                            for child_id in relationship['Ids']:
                                child_block = next((b for b in blocks if b['Id'] == child_id), None)
                                if child_block and child_block['BlockType'] == 'CELL':
                                    cell_blocks.append(child_block)
                
                # Organize cells by row and column
                cells_by_position = {}
                for cell in cell_blocks:
                    row_index = cell.get('RowIndex', 1)
                    col_index = cell.get('ColumnIndex', 1)
                    
                    # Extract cell text
                    cell_text = ""
                    if 'Relationships' in cell:
                        for rel in cell['Relationships']:
                            if rel['Type'] == 'CHILD':
                                for word_id in rel['Ids']:
                                    word_block = next((b for b in blocks if b['Id'] == word_id), None)
                                    if word_block and word_block['BlockType'] == 'WORD':
                                        cell_text += word_block['Text'] + ' '
                    
                    cells_by_position[(row_index, col_index)] = cell_text.strip()
                
                # Extract key-value pairs from table (assuming 2-column layout)
                max_row = max([pos[0] for pos in cells_by_position.keys()]) if cells_by_position else 0
                for row in range(1, max_row + 1):
                    key = cells_by_position.get((row, 1), "").strip()
                    value = cells_by_position.get((row, 2), "").strip()
                    
                    if key and value:
                        tables_data[key] = value
                        print(f"📋 Table extracted: {key} = {value}")
            
            return tables_data
        
        tables_data = extract_tables_data(analyze_response['Blocks'])
        
        # --- Process FORMS response with enhanced extraction ---
        blocks_map = {block['Id']: block for block in analyze_response['Blocks']}
        key_map = {}
        value_map = {}
        
        for block in analyze_response['Blocks']:
            block_id = block['Id']
            if block['BlockType'] == "KEY_VALUE_SET":
                if 'KEY' in block['EntityTypes']:
                    key_map[block_id] = block
                else:
                    value_map[block_id] = block
                    
        forms_data = {}
        for key_id, key_block in key_map.items():
            value_block = find_value_block(key_block, value_map)
            key_text = get_text(key_block, blocks_map)
            val_text = get_text(value_block, blocks_map) if value_block else ""
            if key_text and val_text:
                # Store both cleaned and raw versions
                clean_key = key_text.strip()
                clean_val = val_text.strip()
                forms_data[clean_key] = clean_val
                
                # Also store normalized versions for better matching
                normalized_key = re.sub(r'[^\w\s]', '', clean_key.lower().strip())
                forms_data[normalized_key] = clean_val
                
                print(f"📋 Forms extracted: '{clean_key}' = '{clean_val[:100]}{'...' if len(clean_val) > 100 else ''}'")
        
        print(f"📋 Total forms entries: {len(forms_data)}")
        print(f"📊 Tables extracted: {list(tables_data.keys())}")
        
        # Debug: Print all form keys to see what's available
        print("🔍 Available form keys:", list(forms_data.keys()))
        
        # --- Process RAW TEXT with improved handling ---
        def reconstruct_text_properly(blocks):
            """
            Reconstruct text with proper spacing and line breaks
            """
            # Get all text blocks with their positions
            text_blocks = []
            for block in blocks:
                if block['BlockType'] in ['LINE', 'WORD']:
                    bbox = block.get('Geometry', {}).get('BoundingBox', {})
                    text_blocks.append({
                        'text': block['Text'],
                        'type': block['BlockType'],
                        'top': bbox.get('Top', 0),
                        'left': bbox.get('Left', 0),
                        'height': bbox.get('Height', 0),
                        'width': bbox.get('Width', 0)
                    })
            
            # Sort by vertical position (top) first, then horizontal (left)
            text_blocks.sort(key=lambda x: (x['top'], x['left']))
            
            # Group into lines based on vertical proximity
            lines = []
            current_line = []
            current_top = None
            tolerance = 0.01  # Vertical tolerance for same line
            
            for block in text_blocks:
                if block['type'] == 'LINE':
                    # LINE blocks are already complete lines
                    if current_line:
                        lines.append(' '.join([b['text'] for b in current_line]))
                        current_line = []
                    lines.append(block['text'])
                    current_top = block['top']
                elif block['type'] == 'WORD':
                    # Handle WORD blocks - group by vertical position
                    if current_top is None or abs(block['top'] - current_top) > tolerance:
                        # New line
                        if current_line:
                            lines.append(' '.join([b['text'] for b in current_line]))
                        current_line = [block]
                        current_top = block['top']
                    else:
                        # Same line
                        current_line.append(block)
            
            # Don't forget the last line
            if current_line:
                lines.append(' '.join([b['text'] for b in current_line]))
            
            return '\n'.join(lines)
        
        # Try LINE blocks first (more reliable)
        line_blocks = [block for block in text_response['Blocks'] if block['BlockType'] == 'LINE']
        if line_blocks:
            raw_text = '\n'.join([block['Text'] for block in line_blocks])
        else:
            # Fallback to reconstructed text from WORD blocks
            raw_text = reconstruct_text_properly(text_response['Blocks'])
        
        print(f"📄 Raw text length: {len(raw_text)} characters")
        
        # --- Enhanced extraction functions ---
        def extract_field_value(field_name: str, text: str, forms_data: dict, tables_data: dict) -> str:
            """
            Enhanced field extraction using tables, forms, and raw text patterns
            Priority: Forms > Tables > Raw Text (since forms work better in AWS console)
            """
            # Step 1: Try forms data first with comprehensive key matching
            form_variations = [
                field_name,
                field_name.lower(),
                field_name.upper(),
                field_name.title(),
                field_name.replace(' ', ''),
                field_name.replace(' ', '_'),
                field_name.replace('_', ' '),
                re.sub(r'[^\w\s]', '', field_name.lower().strip()),  # Remove special chars
                re.sub(r'[^\w\s]', '', field_name.upper().strip())
            ]
            
            # Add specific variations for common fields
            if field_name.lower() == "about the role":
                form_variations.extend(["Role Description", "Job Description", "abouttherole", "role description", "job description"])
            elif field_name.lower() == "key deliverables & accountability":
                form_variations.extend(["Key Deliverables", "Responsibilities", "keydeliverablesaccountability", 
                                      "key deliverables", "responsibilities", "Key Responsibilities"])
            
            for variation in form_variations:
                if variation in forms_data:
                    value = forms_data[variation].strip()
                    if value and len(value) > 2:  # Ensure meaningful value
                        print(f"✅ Found {field_name} in forms (key: '{variation}'): {value[:100]}{'...' if len(value) > 100 else ''}")
                        return value
            
            # Step 2: Try tables data
            for variation in form_variations:
                if variation in tables_data:
                    value = tables_data[variation].strip()
                    if value and len(value) > 2:
                        print(f"✅ Found {field_name} in tables: {value[:100]}{'...' if len(value) > 100 else ''}")
                        return value
            
            # Step 3: Try raw text pattern matching as last resort
            patterns = [
                rf"(?i){re.escape(field_name)}\s*:?\s*([^\n\r]+)",
                rf"(?i){re.escape(field_name)}\s+([^\n\r]+)",
                rf"(?i)^{re.escape(field_name)}\s*([^\n\r]+)",
                rf"(?i){re.escape(field_name)}\s*-\s*([^\n\r]+)",
                rf"(?i){re.escape(field_name)}\s*\|\s*([^\n\r]+)"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text, re.MULTILINE)
                if match:
                    value = match.group(1).strip()
                    if value and len(value) > 2:
                        print(f"✅ Found {field_name} in raw text: {value[:100]}{'...' if len(value) > 100 else ''}")
                        return value
            
            print(f"⚠️  Could not find {field_name}")
            return ""
        
        def extract_text_between(start_key, end_key, text):
            """Extract text between two keywords with better handling and formatting preservation"""
            # Try exact match first
            pattern = re.compile(rf"{re.escape(start_key)}(.*?){re.escape(end_key)}", re.DOTALL | re.IGNORECASE)
            match = pattern.search(text)
            
            if match:
                content = match.group(1).strip()
                result = format_multiline_content(content)
                if result:
                    print(f"✅ Extracted text between '{start_key}' and '{end_key}': {len(result)} chars")
                    return result
            
            # Try partial match if exact doesn't work
            start_pattern = rf"(?i){re.escape(start_key)}"
            end_pattern = rf"(?i){re.escape(end_key)}"
            
            start_match = re.search(start_pattern, text)
            if start_match:
                remaining_text = text[start_match.end():]
                end_match = re.search(end_pattern, remaining_text)
                if end_match:
                    content = remaining_text[:end_match.start()].strip()
                    result = format_multiline_content(content)
                    if result:
                        print(f"✅ Extracted text between '{start_key}' and '{end_key}' (partial): {len(result)} chars")
                        return result
            
            print(f"⚠️  Could not extract text between '{start_key}' and '{end_key}'")
            return ""
        
        def format_multiline_content(content: str) -> str:
            """
            Format multi-line content preserving structure and creating proper bullet points
            Enhanced to handle incomplete sentences and text flow issues
            """
            if not content:
                return ""
            
            # First, try to reconstruct proper sentences by looking for common patterns
            lines = content.split('\n')
            reconstructed_lines = []
            current_sentence = ""
            
            for line in lines:
                cleaned_line = line.strip()
                if not cleaned_line:
                    continue
                
                # Remove leading bullets/symbols
                cleaned_line = re.sub(r'^[\s•\-\*\→\►\▪\▫\‣\⁃\◦\d+\.]+', '', cleaned_line).strip()
                if not cleaned_line:
                    continue
                
                # Check if this line seems to continue the previous one
                if current_sentence:
                    # If current line starts with lowercase or seems like a continuation
                    if (cleaned_line[0].islower() or 
                        current_sentence.endswith(',') or 
                        current_sentence.endswith('and') or
                        len(current_sentence.split()) < 3):  # Very short previous line
                        current_sentence += " " + cleaned_line
                    else:
                        # This looks like a new item
                        reconstructed_lines.append(current_sentence.strip())
                        current_sentence = cleaned_line
                else:
                    current_sentence = cleaned_line
            
            # Don't forget the last sentence
            if current_sentence:
                reconstructed_lines.append(current_sentence.strip())
            
            # Now format as bullet points, but try to preserve complete thoughts
            formatted_lines = []
            for line in reconstructed_lines:
                if len(line) > 3:  # Only include meaningful content
                    # Clean up any residual formatting issues
                    line = re.sub(r'\s+', ' ', line)  # Multiple spaces to single space
                    line = line.strip()
                    if line and not line in [item.replace('• ', '') for item in formatted_lines]:  # Avoid duplicates
                        formatted_lines.append(f"• {line}")
            
            result = '\n'.join(formatted_lines)
            
            # Additional fallback: if we still have very fragmented content, try different approach
            if not result or len(formatted_lines) == 0:
                # Try treating the whole content as flowing text and break it into logical chunks
                clean_content = re.sub(r'\s+', ' ', content.strip())
                # Split on common separators while preserving the content
                chunks = re.split(r'(?<=[a-z])\s+(?=[A-Z])', clean_content)
                formatted_lines = []
                for chunk in chunks:
                    chunk = chunk.strip()
                    if len(chunk) > 5:  # Only meaningful chunks
                        formatted_lines.append(f"• {chunk}")
                result = '\n'.join(formatted_lines)
            
            return result
        
        # --- Extract all fields using enhanced methods ---
        
        # Basic fields with enhanced extraction (Tables > Forms > Raw Text)
        job_title = extract_field_value("Job Title", raw_text, forms_data, tables_data)
        band = extract_field_value("Band", raw_text, forms_data, tables_data)
        
        # Enhanced Department extraction
        department = extract_field_value("Department", raw_text, forms_data, tables_data)
        if not department:
            # Try alternative patterns for department
            dept_patterns = [
                r"(?i)dept\.?\s*:?\s*([^\n\r]+)",
                r"(?i)division\s*:?\s*([^\n\r]+)",
                r"(?i)team\s*:?\s*([^\n\r]+)",
                r"(?i)function\s*:?\s*([^\n\r]+)"
            ]
            for pattern in dept_patterns:
                match = re.search(pattern, raw_text)
                if match:
                    department = match.group(1).strip()
                    print(f"✅ Found Department via alternative pattern: {department}")
                    break
        
        # Enhanced Qualifications extraction  
        qualifications = extract_field_value("Qualification", raw_text, forms_data, tables_data)
        if not qualifications:
            # Try alternative patterns for qualifications
            qual_patterns = [
                r"(?i)qualifications?\s*:?\s*([^\n\r]+)",
                r"(?i)education\s*:?\s*([^\n\r]+)",
                r"(?i)degree\s*:?\s*([^\n\r]+)",
                r"(?i)academic\s*:?\s*([^\n\r]+)",
                r"(?i)educational\s+requirement\s*:?\s*([^\n\r]+)"
            ]
            for pattern in qual_patterns:
                match = re.search(pattern, raw_text)
                if match:
                    qualifications = match.group(1).strip()
                    print(f"✅ Found Qualifications via alternative pattern: {qualifications}")
                    break
        
        # Other basic fields
        preferred_industry = extract_field_value("Preferred Industry", raw_text, forms_data, tables_data)
        location = extract_field_value("Base Location", raw_text, forms_data, tables_data)
        if not location:
            location = extract_field_value("Location", raw_text, forms_data, tables_data)
        
        job_description = extract_field_value("About the Role", raw_text, forms_data, tables_data)
        if not job_description:
            job_description = extract_field_value("Role Description", raw_text, forms_data, tables_data)
            if not job_description:
                job_description = extract_field_value("Job Description", raw_text, forms_data, tables_data)
        
        # Job Description - prioritize forms data
        job_description = extract_field_value("About the Role", raw_text, forms_data, tables_data)
        if not job_description:
            job_description = extract_field_value("Role Description", raw_text, forms_data, tables_data)
            if not job_description:
                job_description = extract_field_value("Job Description", raw_text, forms_data, tables_data)
        
        # Multi-line sections - prioritize forms data first
        responsibilities_text = ""
        
        # Try forms first for responsibilities
        responsibility_keys = [
            "Key Deliverables & Accountability",
            "Key Deliverables",
            "Responsibilities", 
            "Key Responsibilities",
            "keydeliverablesaccountability",
            "key deliverables accountability",
            "responsibilities"
        ]
        
        for key in responsibility_keys:
            if key in forms_data:
                responsibilities_text = forms_data[key]
                print(f"✅ Found Responsibilities in forms (key: '{key}'): {len(responsibilities_text)} chars")
                break
        
        # If not found in forms, try text extraction
        if not responsibilities_text:
            responsibilities_text = extract_text_between("Key Deliverables & Accountability", "Skill Set Requirement", raw_text)
            if not responsibilities_text:
                responsibilities_text = extract_text_between("Responsibilities", "Requirements", raw_text)
                if not responsibilities_text:
                    # Try tables as final fallback
                    responsibilities_text = tables_data.get("Key Deliverables & Accountability", "")
        
        # Format responsibilities if we found them
        if responsibilities_text and not responsibilities_text.startswith('•'):
            # Only format if not already formatted as bullet points
            responsibilities_text = format_multiline_content(responsibilities_text)

        # Similar approach for requirements
        requirements_text = ""
        
        requirement_keys = [
            "Skill Set Requirement",
            "Requirements",
            "Skills Required",
            "skillsetrequirement", 
            "skill set requirement",
            "requirements"
        ]
        
        for key in requirement_keys:
            if key in forms_data:
                requirements_text = forms_data[key]
                print(f"✅ Found Requirements in forms (key: '{key}'): {len(requirements_text)} chars")
                break
        
        if not requirements_text:
            requirements_text = extract_text_between("Skill Set Requirement", "Ideal Candidate", raw_text)
            if not requirements_text:
                requirements_text = extract_text_between("Requirements", "Skills", raw_text)
                if not requirements_text:
                    requirements_text = tables_data.get("Skill Set Requirement", "")
        
        # Format requirements if we found them
        if requirements_text and not requirements_text.startswith('•'):
            requirements_text = format_multiline_content(requirements_text)
        
        # Skills from Ideal Candidate section
        skills_text = ""
        if re.search(r'(?i)Ideal Candidate', raw_text):
            ideal_candidate_match = re.search(r'(?i)Ideal Candidate', raw_text)
            if ideal_candidate_match:
                skills_section = raw_text[ideal_candidate_match.end():]
                # Use the same formatting function for consistency
                skills_text = format_multiline_content(skills_section[:2000])  # Limit content length
                if skills_text:
                    print(f"✅ Found Skills from Ideal Candidate: {len(skills_text)} chars")

        # Fallback for skills from structured data
        if not skills_text:
            skills_text = tables_data.get("Ideal Candidate") or forms_data.get("Ideal Candidate", "")
            if not skills_text:
                skills_text = tables_data.get("Skills") or forms_data.get("Skills", "")
            if skills_text:
                print(f"✅ Found Skills in structured data: {len(skills_text)} chars")
        
        # --- Build formatted data ---
        formatted_data = {
            "jobTitle": job_title,
            "band": band,
            "department": department,
            "preferredIndustry": preferred_industry,
            "location": location,
            "jobDescription": job_description.replace('\n', ' ').strip() if job_description else "",
            "qualifications": qualifications,
            "responsibilities": responsibilities_text,
            "requirements": requirements_text,
            "skills": skills_text,
        }
        
        # Extract experience with enhanced pattern matching from all sources
        experience_str = extract_field_value("Experience", raw_text, forms_data, tables_data)
        if experience_str:
            numbers = re.findall(r'\d+', experience_str)
            if len(numbers) > 0:
                formatted_data["minExperience"] = int(numbers[0])
                print(f"✅ Found min experience: {numbers[0]}")
            if len(numbers) > 1:
                formatted_data["maxExperience"] = int(numbers[1])
                print(f"✅ Found max experience: {numbers[1]}")
            elif len(numbers) == 1:
                # If only one number, assume it's minimum experience
                formatted_data["maxExperience"] = int(numbers[0]) + 2  # Add 2 years as max
        
        # Log final results
        non_empty_fields = {k: v for k, v in formatted_data.items() if v}
        print(f"🏁 Comprehensive job analysis complete. Extracted {len(non_empty_fields)} fields: {list(non_empty_fields.keys())}")
        
        # Debug: Show extraction sources
        print("📊 Extraction Summary:")
        print(f"   Tables found: {len(tables_data)} key-value pairs")
        print(f"   Forms found: {len(forms_data)} key-value pairs") 
        print(f"   Raw text: {len(raw_text)} characters")
        
        return formatted_data
        
    except Exception as e:
        print(f"🚨 Error during comprehensive job PDF analysis: {e}")
        traceback.print_exc()
        raise

# Helper functions for parsing the FORMS response
def find_value_block(key_block, value_map):
    for relationship in key_block.get('Relationships', []):
        if relationship['Type'] == 'VALUE':
            for value_id in relationship['Ids']:
                return value_map.get(value_id)
    return None

def get_text(result, blocks_map):
    text = ''
    if 'Relationships' in result:
        for relationship in result['Relationships']:
            if relationship['Type'] == 'CHILD':
                for child_id in relationship['Ids']:
                    word = blocks_map[child_id]
                    if word['BlockType'] == 'WORD':
                        text += word['Text'] + ' '
    return text.strip()

def analyze_resume_from_local_file(file_path: str):
    """Reads a local file and sends its bytes to Textract for text extraction."""
    try:
        with open(file_path, "rb") as document_file:
            file_bytes = document_file.read()
            
        # Use the enhanced autofill function
        result = analyze_resume_for_autofill(file_bytes)
        
        if 'error' in result:
            return "", [], []
        
        # For backward compatibility, return text and empty lists
        text = result.get('_full_text', 'Extracted data available')
        return text, [], []
        
    except Exception as e:
        print(f"Error during local resume analysis for file {file_path}: {e}")
        raise