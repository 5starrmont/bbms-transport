from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
import io
import qrcode
from .models import Payment 

def generate_ticket_pdf(booking):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A6)
    width, height = A6

    # Brand Colors
    brand_purple = HexColor("#7c3aed")
    dark_bg = HexColor("#0f172a")
    text_slate = HexColor("#64748b")

    # --- Header Background ---
    p.setFillColor(dark_bg)
    p.rect(0, height - 30*mm, width, 30*mm, fill=1, stroke=0)
    
    # --- Brand Name ---
    p.setFillColor(HexColor("#ffffff"))
    p.setFont("Helvetica-Bold", 16)
    p.drawString(10*mm, height - 12*mm, "TwendeBus") # Updated Brand Name
    
    p.setFont("Helvetica", 8)
    p.setFillColor(HexColor("#a78bfa"))
    p.drawString(10*mm, height - 17*mm, "YOUR JOURNEY, SIMPLIFIED") # Updated Tagline

    # --- Trip Schedule Section ---
    p.setFillColor(HexColor("#f8fafc"))
    p.rect(0, height - 50*mm, width, 20*mm, fill=1, stroke=0)
    
    p.setFillColor(text_slate)
    p.setFont("Helvetica-Bold", 7)
    p.drawString(10*mm, height - 37*mm, "DEPARTURE DATE")
    p.drawString(55*mm, height - 37*mm, "DEPARTURE TIME")

    p.setFillColor(dark_bg)
    p.setFont("Helvetica-Bold", 10)
    # Formatting date and time from the schedule
    dep_date = booking.schedule.departure_time.strftime('%d %b, %Y')
    dep_time = booking.schedule.departure_time.strftime('%I:%M %p')
    
    p.drawString(10*mm, height - 43*mm, dep_date.upper())
    p.drawString(55*mm, height - 43*mm, dep_time)

    # --- Passenger & Route ---
    p.setFillColor(text_slate)
    p.setFont("Helvetica", 8)
    p.drawString(10*mm, height - 60*mm, "PASSENGER NAME")
    p.drawString(10*mm, height - 72*mm, "ROUTE")

    p.setFillColor(dark_bg)
    p.setFont("Helvetica-Bold", 9)
    p.drawString(10*mm, height - 65*mm, booking.passenger_name.upper())
    p.drawString(10*mm, height - 77*mm, f"{booking.schedule.route.origin} >> {booking.schedule.route.destination}")

    # --- Seat Badge ---
    p.setFillColor(brand_purple)
    p.roundRect(width - 30*mm, height - 78*mm, 20*mm, 18*mm, 3, fill=1, stroke=0)
    p.setFillColor(HexColor("#ffffff"))
    p.setFont("Helvetica-Bold", 6)
    p.drawCentredString(width - 20*mm, height - 65*mm, "SEAT")
    p.setFont("Helvetica-Bold", 14)
    p.drawCentredString(width - 20*mm, height - 73*mm, str(booking.seat_number))

    # --- QR Code Generation ---
    payment = Payment.objects.filter(booking=booking).first()
    receipt_no = payment.transaction_id if payment else "N/A"
    
    qr_data = f"TICKET_ID:{booking.id}|RECEIPT:{receipt_no}|SEAT:{booking.seat_number}"
    qr = qrcode.QRCode(version=1, box_size=10, border=0)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img_qr = qr.make_image(fill_color="black", back_color="white")
    
    # Draw QR Code on PDF
    p.drawInlineImage(img_qr, width/2 - 15*mm, 20*mm, width=30*mm, height=30*mm)

    # --- Footer Info ---
    p.setDash(2, 2)
    p.setStrokeColor(HexColor("#cbd5e1"))
    p.line(10*mm, 18*mm, width - 10*mm, 18*mm)
    
    p.setFillColor(text_slate)
    p.setFont("Helvetica", 7)
    p.drawCentredString(width/2, 12*mm, f"M-PESA REF: {receipt_no}")
    p.setFont("Helvetica-Oblique", 6)
    p.drawCentredString(width/2, 8*mm, "Please present this QR code for scanning during boarding.")

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer