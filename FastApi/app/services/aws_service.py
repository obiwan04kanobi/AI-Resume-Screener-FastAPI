# app/services/aws_service.py
import boto3
from ..config import settings
import datetime
import json 
import re

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
# --- END OF INITIALIZATION ---

def generate_presigned_urls(resume_filename: str):
    s3_key = f"uploads/{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{resume_filename}"
    
    put_url = s3_client.generate_presigned_url(
        'put_object',
        Params={"Bucket": settings.BUCKET_NAME, "Key": s3_key},
        ExpiresIn=3600  # 1 hour for upload is fine
    )
    
    get_url = s3_client.generate_presigned_url(
        'get_object',
        Params={"Bucket": settings.BUCKET_NAME, "Key": s3_key},
        # FIX: Reduced expiration from 15 days to the 7-day maximum
        ExpiresIn=7 * 24 * 3600
    )
    return put_url, get_url, s3_key

def analyze_resume_from_s3(s3_key: str):
    try:
        response = textract_client.detect_document_text(
            Document={'S3Object': {'Bucket': settings.BUCKET_NAME, 'Name': s3_key}}
        )
        text = ' '.join([item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"])

        if not text.strip():
            return "", [], []

        entities_response = comprehend_client.detect_entities(Text=text, LanguageCode='en')
        phrases_response = comprehend_client.detect_key_phrases(Text=text, LanguageCode='en')

        # Filter for only the most relevant entity types
        entities = [
            {"Text": e["Text"], "Type": e["Type"]} 
            for e in entities_response.get('Entities', []) 
            if e["Type"] in ["PERSON", "ORGANIZATION", "DATE", "LOCATION"]
        ]
        
        # --- NEW: Smarter Skill Filtering Logic ---
        # This will produce a much cleaner and more relevant list of skills.
        skills = []
        for phrase in phrases_response.get('KeyPhrases', []):
            text = phrase.get("Text", "").strip()
            word_count = len(text.split())

            # Rule 1: Keep phrases between 2 and 5 words long.
            # Rule 2: Exclude phrases that contain noisy characters like '@' or '|'.
            # Rule 3: Ensure the phrase is not just a number.
            if 2 <= word_count <= 5 and '@' not in text and '|' not in text and not text.isnumeric():
                skills.append(text)
        # --- End of New Logic ---
        
        return text, entities, skills
    except Exception as e:
        print(f"Error during resume analysis for key {s3_key}: {e}")
        raise

def analyze_job_description_pdf(file_bytes: bytes) -> dict:
    """
    Analyzes a job description PDF using a hybrid of Textract's Forms
    and Raw Text analysis for the best accuracy.
    """
    try:
        # --- Step 1: Use Textract's FORMS feature for key-value pairs ---
        forms_response = textract_client.analyze_document(
            Document={'Bytes': file_bytes},
            FeatureTypes=["FORMS"]
        )
        
        # --- Step 2: Use Textract's DetectText for raw text extraction ---
        text_response = textract_client.detect_document_text(
            Document={'Bytes': file_bytes}
        )
        
        # --- Process FORMS response ---
        blocks_map = {block['Id']: block for block in forms_response['Blocks']}
        key_map = {}
        value_map = {}
        
        for block in forms_response['Blocks']:
            block_id = block['Id']
            if block['BlockType'] == "KEY_VALUE_SET":
                if 'KEY' in block['EntityTypes']:
                    key_map[block_id] = block
                else:
                    value_map[block_id] = block

        extracted_forms = {}
        for key_id, key_block in key_map.items():
            value_block = find_value_block(key_block, value_map)
            key_text = get_text(key_block, blocks_map)
            val_text = get_text(value_block, blocks_map)
            extracted_forms[key_text] = val_text
            
        # --- Process RAW TEXT to find "Skill Set Requirement" ---
        raw_text = ' '.join([block['Text'] for block in text_response['Blocks'] if block['BlockType'] == 'LINE'])
        
        skill_set_text = ""
        # Use regex to find text between "Skill Set Requirement" and "Ideal Candidate"
        match = re.search(r"Skill Set Requirement\s*(.*?)\s*Ideal Candidate", raw_text, re.DOTALL | re.IGNORECASE)
        if match:
            skill_set_text = match.group(1).strip()

        # --- Map extracted data to our form fields ---
        formatted_data = {
            "jobTitle": extracted_forms.get("Job Title", ""),
            "band": extracted_forms.get("Band", ""),
            "department": extracted_forms.get("Department", ""),
            "preferredIndustry": extracted_forms.get("Preferred Industry", ""),
            "location": extracted_forms.get("Base Location", ""),
            "jobDescription": extracted_forms.get("About the Role", ""),
            "responsibilities": extracted_forms.get("Key Deliverables & Accountability", "").replace("•", "\n").strip(),
            "qualifications": extracted_forms.get("Qualification", "").replace("/", "\n").strip(),
            "requirements": skill_set_text.replace("•", "\n").strip(), # Use raw text extraction for this field
            "skills": extracted_forms.get("Ideal Candidate", "").replace("•", "\n").strip(),
        }

        experience_str = extracted_forms.get("Experience", "")
        if experience_str:
            match = re.search(r'\d+', experience_str)
            if match:
                formatted_data["minExperience"] = int(match.group(0))

        return formatted_data

    except Exception as e:
        print(f"Error during job PDF analysis: {e}")
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
