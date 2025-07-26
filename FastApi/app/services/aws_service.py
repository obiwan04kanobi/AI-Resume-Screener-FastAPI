# app/services/aws_service.py
import boto3
from ..config import settings
import datetime

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