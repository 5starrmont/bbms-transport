from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse # Added for PDF streaming
from .models import Bus, Route, Schedule, Booking, Payment
from .serializers import (
    BusSerializer, 
    RouteSerializer, 
    ScheduleSerializer, 
    BookingSerializer, 
    PaymentSerializer
)
from .mpesa import MpesaClient
from .utils import generate_ticket_pdf # We will create this file next
import os

class BusViewSet(viewsets.ModelViewSet):
    queryset = Bus.objects.all()
    serializer_class = BusSerializer

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    @action(detail=True, methods=['get'])
    def download_ticket(self, request, pk=None):
        try:
            # We only allow downloads for PAID bookings
            booking = Booking.objects.get(pk=pk, status='PAID')
            pdf_buffer = generate_ticket_pdf(booking)
            return FileResponse(
                pdf_buffer, 
                as_attachment=True, 
                filename=f"BBMS_Ticket_{booking.id}.pdf"
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Paid booking not found or payment pending."}, 
                status=status.HTTP_404_NOT_FOUND
            )

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @action(detail=False, methods=['post'])
    def stk_push(self, request):
        phone_number = request.data.get('phone_number')
        amount = request.data.get('amount')
        booking_id = request.data.get('booking_id')
        
        if not phone_number or not amount or not booking_id:
            return Response(
                {"error": "phone_number, amount, and booking_id are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        client = MpesaClient()
        callback_url = os.getenv('MPESA_CALLBACK_URL')
        
        formatted_phone = phone_number
        if formatted_phone.startswith('0'):
            formatted_phone = '254' + formatted_phone[1:]
        elif formatted_phone.startswith('+254'):
            formatted_phone = formatted_phone[1:]

        response = client.stk_push(formatted_phone, int(float(amount)), callback_url)
        
        if response.get('ResponseCode') == '0':
            merchant_id = response.get('MerchantRequestID')
            booking.merchant_request_id = merchant_id
            booking.save()
            print(f"STK Push initiated for Booking {booking.id}. MerchantID: {merchant_id}")
            
        return Response(response)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def callback(self, request):
        data = request.data.get('Body', {}).get('stkCallback', {})
        result_code = data.get('ResultCode')
        merchant_request_id = data.get('MerchantRequestID')
        
        if result_code == 0:
            items = data.get('CallbackMetadata', {}).get('Item', [])
            metadata = {item['Name']: item.get('Value') for item in items}
            
            receipt = metadata.get('MpesaReceiptNumber')
            amount = metadata.get('Amount')
            phone = metadata.get('PhoneNumber')

            try:
                booking = Booking.objects.get(merchant_request_id=merchant_request_id)
                booking.status = 'PAID'
                booking.save()

                Payment.objects.create(
                    booking=booking,
                    amount=amount,
                    transaction_id=receipt,
                    phone_number=phone
                )
                print(f"Payment Success: Booking {booking.id} PAID. Receipt: {receipt}")

            except Booking.DoesNotExist:
                print(f"Error: Unknown MerchantRequestID: {merchant_request_id}")
            
            return Response({"ResultCode": 0, "ResultDesc": "Success"})
        
        else:
            result_desc = data.get('ResultDesc')
            print(f"Payment Failed: {result_desc} (Code: {result_code})")
            return Response({"ResultCode": 0, "ResultDesc": "Acknowledged"})