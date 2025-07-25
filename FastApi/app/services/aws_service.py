# app/services/aws_service.py
import boto3
from ..config import settings
import datetime
import json 
import re

# --- CLIENT INITIALIZATION (No changes here) ---
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


# def generate_presigned_urls(resume_filename: str):
#     s3_key = f"uploads/{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{resume_filename}"
    
#     put_url = s3_client.generate_presigned_url(
#         'put_object',
#         Params={"Bucket": settings.BUCKET_NAME, "Key": s3_key},
#         ExpiresIn=3600
#     )
    
#     get_url = s3_client.generate_presigned_url(
#         'get_object',
#         Params={"Bucket": settings.BUCKET_NAME, "Key": s3_key},
#         ExpiresIn=7 * 24 * 3600
#     )
#     return put_url, get_url, s3_key

# def analyze_resume_from_s3(s3_key: str):
#     try:
#         response = textract_client.detect_document_text(
#             Document={'S3Object': {'Bucket': settings.BUCKET_NAME, 'Name': s3_key}}
#         )
#         text = ' '.join([item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"])

#         if not text.strip():
#             return "", [], []

#         entities_response = comprehend_client.detect_entities(Text=text, LanguageCode='en')
#         phrases_response = comprehend_client.detect_key_phrases(Text=text, LanguageCode='en')

#         entities = [
#             {"Text": e["Text"], "Type": e["Type"]} 
#             for e in entities_response.get('Entities', []) 
#             if e["Type"] in ["PERSON", "ORGANIZATION", "DATE", "LOCATION"]
#         ]
        
#         skills = []
#         for phrase in phrases_response.get('KeyPhrases', []):
#             text = phrase.get("Text", "").strip()
#             word_count = len(text.split())
#             if 2 <= word_count <= 5 and '@' not in text and '|' not in text and not text.isnumeric():
#                 skills.append(text)
        
#         return text, entities, skills
#     except Exception as e:
#         print(f"Error during resume analysis for key {s3_key}: {e}")
#         raise

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
        
        # --- Process FORMS response for single-line fields ---
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
            
        # --- FIX: Process RAW TEXT with newlines for multi-line sections ---
        # 1. Join line blocks with newline characters to preserve document structure.
        raw_text = '\n'.join([block['Text'] for block in text_response['Blocks'] if block['BlockType'] == 'LINE'])
        
        # 2. Define a helper function to extract text between two keywords.
        def extract_text_between(start_key, end_key, text):
            pattern = re.compile(rf"{re.escape(start_key)}(.*?){re.escape(end_key)}", re.DOTALL | re.IGNORECASE)
            match = pattern.search(text)
            if match:
                content = match.group(1)
                # Clean up bullets and strip each line for clean output
                lines = [re.sub(r'^[\s•-]*', '', line).strip() for line in content.split('\n')]
                return '\n'.join(filter(None, lines))
            return ""

        # 3. Use the helper to extract each multi-line section.
        # Find a reliable end-marker for the last section.
        end_marker = "Powered by TCPDF" if "Powered by TCPDF" in raw_text else "Ideal Candidate"

        responsibilities_text = extract_text_between("Key Deliverables & Accountability", "Skill Set Requirement", raw_text)
        requirements_text = extract_text_between("Skill Set Requirement", "Ideal Candidate", raw_text)
        skills_text = extract_text_between("Ideal Candidate", end_marker, raw_text)
        
        # For the final section, we need a different approach if the end marker is the section title itself.
        if skills_text == "":
            if "Ideal Candidate" in raw_text:
                # Split the text at "Ideal Candidate" and take the second part.
                skills_section = raw_text.split("Ideal Candidate", 1)[1]
                lines = [re.sub(r'^[\s•-]*', '', line).strip() for line in skills_section.split('\n')]
                skills_text = '\n'.join(filter(None, lines))

        # --- Map extracted data to our form fields ---
        formatted_data = {
            # Data from FORMS (reliable for single-line)
            "jobTitle": extracted_forms.get("Job Title", ""),
            "band": extracted_forms.get("Band", ""),
            "department": extracted_forms.get("Department", ""),
            "preferredIndustry": extracted_forms.get("Preferred Industry", ""),
            "location": extracted_forms.get("Base Location", ""),
            "jobDescription": extracted_forms.get("About the Role", "").replace('\n', ' ').strip(),
            "qualifications": extracted_forms.get("Qualification", "").replace("/", "\n").strip(),
            
            # Data from new RAW TEXT parsing (reliable for multi-line)
            "responsibilities": responsibilities_text,
            "requirements": requirements_text,
            "skills": skills_text,
        }

        experience_str = extracted_forms.get("Experience", "")
        if experience_str:
            # Extract both min and max experience if available (e.g., "8-10 Years")
            numbers = re.findall(r'\d+', experience_str)
            if len(numbers) > 0:
                formatted_data["minExperience"] = int(numbers[0])
            if len(numbers) > 1:
                formatted_data["maxExperience"] = int(numbers[1])

        return formatted_data

    except Exception as e:
        print(f"Error during job PDF analysis: {e}")
        raise

# Helper functions for parsing the FORMS response (no changes here)
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
    """Reads a local file and sends its bytes to Textract and Comprehend for analysis."""
    try:
        with open(file_path, "rb") as document_file:
            file_bytes = document_file.read()

        # Send bytes to Textract
        response = textract_client.detect_document_text(
            Document={'Bytes': file_bytes}
        )
        text = ' '.join([item["Text"] for item in response["Blocks"] if item["BlockType"] == "LINE"])

        if not text.strip():
            return "", [], []

        # The rest of the analysis logic is the same
        entities_response = comprehend_client.detect_entities(Text=text, LanguageCode='en')
        phrases_response = comprehend_client.detect_key_phrases(Text=text, LanguageCode='en')

        entities = [
            {"Text": e["Text"], "Type": e["Type"]} 
            for e in entities_response.get('Entities', []) 
            if e["Type"] in ["PERSON", "ORGANIZATION", "DATE", "LOCATION"]
        ]
        
        skills = []
        for phrase in phrases_response.get('KeyPhrases', []):
            text = phrase.get("Text", "").strip()
            word_count = len(text.split())
            if 2 <= word_count <= 5 and '@' not in text and '|' not in text and not text.isnumeric():
                skills.append(text)
        
        return text, entities, skills
    except Exception as e:
        print(f"Error during local resume analysis for file {file_path}: {e}")
        raise