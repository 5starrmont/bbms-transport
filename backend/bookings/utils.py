from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
import io
import qrcode
import africastalking
import os
from django.core.mail import EmailMessage
from django.conf import settings
from .models import Payment 

def generate_ticket_pdf(booking):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A6)
    width, height = A6

    brand_purple = HexColor("#7c3aed")
    dark_bg = HexColor("#0f172a")
    text_slate = HexColor("#64748b")

    # Header Background
    p.setFillColor(dark_bg)
    p.rect(0, height - 30*mm, width, 30*mm, fill=1, stroke=0)
    
    p.setFillColor(HexColor("#ffffff"))
    p.setFont("Helvetica-Bold", 16)
    p.drawString(10*mm, height - 12*mm, "TwendeBus") 
    
    p.setFont("Helvetica", 8)
    p.setFillColor(HexColor("#a78bfa"))
    p.drawString(10*mm, height - 17*mm, "YOUR JOURNEY, SIMPLIFIED") 

    # Departure Info Block
    p.setFillColor(HexColor("#f8fafc"))
    p.rect(0, height - 50*mm, width, 20*mm, fill=1, stroke=0)
    
    p.setFillColor(text_slate)
    p.setFont("Helvetica-Bold", 7)
    p.drawString(10*mm, height - 37*mm, "DEPARTURE DATE")
    p.drawString(55*mm, height - 37*mm, "DEPARTURE TIME")

    p.setFillColor(dark_bg)
    p.setFont("Helvetica-Bold", 10)
    dep_date = booking.schedule.departure_time.strftime('%d %b, %Y')
    dep_time = booking.schedule.departure_time.strftime('%I:%M %p')
    
    p.drawString(10*mm, height - 43*mm, dep_date.upper())
    p.drawString(55*mm, height - 43*mm, dep_time)

    # Details Section
    p.setFillColor(text_slate)
    p.setFont("Helvetica", 8)
    p.drawString(10*mm, height - 60*mm, "PASSENGER NAME")
    p.drawString(10*mm, height - 72*mm, "ROUTE")
    p.drawString(10*mm, height - 84*mm, "BUS PLATE") # Added Bus Plate Label

    p.setFillColor(dark_bg)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(10*mm, height - 65*mm, booking.passenger_name.upper())
    p.drawString(10*mm, height - 77*mm, f"{booking.schedule.origin} >> {booking.schedule.destination}")
    p.drawString(10*mm, height - 89*mm, f"{booking.schedule.bus.bus_number}") # Added Bus Plate Number

    # Seat Box
    p.setFillColor(brand_purple)
    p.roundRect(width - 30*mm, height - 85*mm, 20*mm, 18*mm, 3, fill=1, stroke=0)
    p.setFillColor(HexColor("#ffffff"))
    p.setFont("Helvetica-Bold", 6)
    p.drawCentredString(width - 20*mm, height - 72*mm, "SEAT")
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width - 20*mm, height - 80*mm, str(booking.seat_number))

    payment = Payment.objects.filter(booking=booking).first()
    receipt_no = payment.transaction_id if payment else "N/A"
    
    # QR Code
    qr_data = f"TICKET_ID:{booking.id}|RECEIPT:{receipt_no}|SEAT:{booking.seat_number}"
    qr = qrcode.QRCode(version=1, box_size=10, border=0)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")
    
    # Position QR code slightly lower to make room for bus plate
    p.drawInlineImage(img_qr, width/2 - 15*mm, 18*mm, width=30*mm, height=30*mm)

    # Footer
    p.setDash(2, 2)
    p.setStrokeColor(HexColor("#cbd5e1"))
    p.line(10*mm, 15*mm, width - 10*mm, 15*mm)
    
    p.setFillColor(text_slate)
    p.setFont("Helvetica", 7)
    # Changed from M-PESA REF to generic REF
    p.drawCentredString(width/2, 10*mm, f"REF: {receipt_no}")
    p.setFont("Helvetica-Oblique", 6)
    p.drawCentredString(width/2, 6*mm, "Please present this QR code for scanning during boarding.")

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer

def send_ticket_email(booking, pdf_buffer):
    if not booking.passenger_email:
        return

    subject = f"Your TwendeBus Ticket - {booking.schedule.origin} to {booking.schedule.destination}"
    body = (
        f"Hello {booking.passenger_name},\n\n"
        f"Thank you for choosing TwendeBus! Your journey is confirmed.\n\n"
        f"Bus Plate: {booking.schedule.bus.bus_number}\n"
        f"Departure: {booking.schedule.departure_time.strftime('%d %b, %Y at %I:%M %p')}\n"
        f"Seat: {booking.seat_number}\n\n"
        f"Please find your boarding pass attached to this email.\n\n"
        f"Safe Travels,\nThe TwendeBus Team"
    )

    email = EmailMessage(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [booking.passenger_email],
    )
    email.attach(f"TwendeBus_Ticket_{booking.id}.pdf", pdf_buffer.getvalue(), 'application/pdf')
    email.send()

def send_ticket_sms(booking):
    username = os.getenv('AT_USERNAME')
    api_key = os.getenv('AT_API_KEY')
    
    if not username or not api_key:
        print("SMS Error: AT credentials missing in .env")
        return

    africastalking.initialize(username, api_key)
    sms = africastalking.SMS

    payment = Payment.objects.filter(booking=booking).first()
    if not payment:
        return

    travel_date = booking.schedule.departure_time.strftime('%d %b, %Y')
    travel_time = booking.schedule.departure_time.strftime('%I:%M %p')
    
    message = (
        f"TwendeBus Confirmed!\n\n"
        f"Bus: {booking.schedule.bus.bus_number}\n"
        f"Ticket: #{booking.id}\n"
        f"Route: {booking.schedule.origin} - {booking.schedule.destination}\n"
        f"Date: {travel_date}\n"
        f"Time: {travel_time}\n"
        f"Seat: {booking.seat_number}\n"
        f"Ref: {payment.transaction_id}\n\n"
        f"Safe Journey!"
    )

    try:
        phone = payment.phone_number
        if not phone.startswith('+'):
            if phone.startswith('254'): phone = '+' + phone
            elif phone.startswith('0'): phone = '+254' + phone[1:]
            
        sms.send(message, [phone])
        booking.sms_sent = True
        booking.save()
        print(f"SMS Sent to {phone}")
    except Exception as e:
        print(f"SMS Failed: {str(e)}")