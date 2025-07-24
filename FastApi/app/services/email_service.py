# app/services/email_service.py
import smtplib
from email.message import EmailMessage
from ..config import settings
from typing import List

def send_email(to_email: str, subject: str, plain_body: str, html_body: str, cc_emails: List[str] = None):
    """Sends a professional HTML email with a plain text fallback."""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_EMAIL
    msg["To"] = to_email
    if cc_emails:
        msg["Cc"] = ", ".join(cc_emails)
        
    msg.set_content(plain_body)
    msg.add_alternative(html_body, subtype='html')

    all_recipients = [to_email] + (cc_emails or [])

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        print(f"Email sent successfully to {', '.join(all_recipients)}")
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")

# NEW, CORRECTED CODE
def send_application_confirmation(to_email: str, first_name: str, job_title: str):
    subject = "Resume Upload Confirmation"
    body = f"Hi {first_name},\n\nYour resume for the position of {job_title} has been received. We will get back to you shortly.\n\nRegards,\nThe Hiring Team"

    # Perform the replacement first
    html_content = body.replace('\n', '<br>')
    html_body = f"<p>{html_content}</p>"

    # Pass the result to the send_email function
    send_email(to_email, subject, body, html_body)

# In app/services/email_service.py, replace the whole function with this:

def send_status_update_email(to_email: str, first_name: str, new_status: str, experience: str):
    """Determines which status email to send and formats it correctly."""
    subject = ""
    plain_body = ""
    html_body = ""
    APTITUDE_QUIZ_LINK = "https://forms.office.com/r/ZR3zEC9Hqt"

    email_template_wrapper = """
    <html><body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            {content}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.9em; color: #777;">Best regards,<br><strong>The HR Team</strong></p>
        </div>
    </body></html>
    """

    if new_status == "Advanced by HOD":
        if experience == "0-1 Year":
            subject = "Next Step in Your Application: Aptitude Quiz"
            plain_body = f"Hi {first_name},\n\nCongratulations! You have been advanced to the next stage. The next step is to complete a short aptitude quiz. Please use this link: {APTITUDE_QUIZ_LINK}\n\nWe wish you the best of luck!"
            html_content = f"""
                <h2 style="color: #264143;">Congratulations, {first_name}!</h2>
                <p>Your profile has been reviewed and you have been advanced to the next stage of our hiring process.</p>
                <p>The next step is to complete a short aptitude quiz. Please click the button below to access it:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{APTITUDE_QUIZ_LINK}" style="background-color: #0078d4; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start Aptitude Quiz</a>
                </p>
                <p>Please complete the quiz at your earliest convenience. We wish you the best of luck!</p>
            """
            html_body = email_template_wrapper.format(content=html_content)
        else:
            subject = "An Update on Your Application"
            plain_body = f"Hi {first_name},\n\nCongratulations! Your profile has been reviewed and advanced. Our recruitment team will be in touch with you shortly regarding the next steps in the process."
            html_content = f"""
                <h2 style="color: #264143;">Congratulations, {first_name}!</h2>
                <p>We are pleased to inform you that after a successful review, your application has been advanced to the next stage.</p>
                <p>Our recruitment team will be in contact with you soon to discuss the next steps in the hiring process.</p>
            """
            html_body = email_template_wrapper.format(content=html_content)

    elif new_status == "Advanced for Interview":
        subject = "Update: You've Been Selected for an Interview!"
        plain_body = f"Hi {first_name},\n\nGreat news! We would like to invite you for an interview. Our recruitment team will be in touch with you shortly via a separate email to coordinate the date and time."
        html_content = f"""
            <h2 style="color: #264143;">Great News, {first_name}!</h2>
            <p>We are delighted to inform you that you have been selected to move forward to the interview stage.</p>
            <p>Our recruitment team will be in contact with you very soon in a separate email to schedule your interview.</p>
        """
        html_body = email_template_wrapper.format(content=html_content)

    elif new_status == "Rejected":
        subject = "An Update on Your Application"
        plain_body = f"Hi {first_name},\n\nThank you for your interest and for taking the time to apply. After careful consideration, we have decided not to move forward with your application at this time."
        html_content = f"""
            <h2 style="color: #264143;">An Update on Your Application</h2>
            <p>Hi {first_name},</p>
            <p>Thank you for your interest. After careful consideration, we have decided not to move forward with your candidacy for this role at this time.</p>
            <p>We wish you the very best of luck in your job search.</p>
        """
        html_body = email_template_wrapper.format(content=html_content)

    else: # Generic catch-all for other statuses
        subject = f"Update on Your Application Status: {new_status}"
        plain_body = f"Hi {first_name},\n\nThis is an update regarding your application. Your status has been changed to: {new_status}."
        html_content = f"""
            <h2 style="color: #264143;">Application Status Update</h2>
            <p>Hi {first_name},</p>
            <p>This is a notification to let you know that the status of your application has been updated to: <strong>{new_status}</strong>.</p>
        """
        html_body = email_template_wrapper.format(content=html_content)

    if subject and plain_body and html_body:
        send_email(to_email, subject, plain_body, html_body)

def send_review_link_email(to_email: str, cc_emails: List[str], candidate_name: str, department: str, review_link: str):
    subject = f"Review Requested for Candidate: {candidate_name}"
    plain_body = f"Hello,\n\nPlease review the profile for {candidate_name} for a position in the {department} department.\nUse this secure link: {review_link}\n\nThank you."
    html_body = f"""
    <html><body>
        <h2>Candidate Review Request</h2>
        <p>Hello,</p>
        <p>You have been asked to review the profile for <strong>{candidate_name}</strong> for a position in the {department} department.</p>
        <p>Please use the secure link below to access the candidate's details. This link is valid for 10 days.</p>
        <p><a href="{review_link}">View Candidate Profile</a></p>
    </body></html>
    """
    send_email(to_email, subject, plain_body, html_body, cc_emails)

    
def send_verification_code_email(to_email: str, code: str):
    subject = "Your HR Portal Verification Code"
    plain_body = f"Your verification code is: {code}\n\nThis code will expire in 10 minutes."
    html_body = f"""
    <html><body>
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2 style="color: #264143;">HR Portal Verification</h2>
            <p>Your verification code is:</p>
            <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; background-color: #f0f0f0; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                {code}
            </p>
            <p style="color: #777;">This code will expire in 10 minutes.</p>
        </div>
    </body></html>
    """
    send_email(to_email, subject, plain_body, html_body)