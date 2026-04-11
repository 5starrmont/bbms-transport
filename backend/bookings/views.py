from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Bus, Route, Schedule, Booking, Payment
from .serializers import (
    BusSerializer, 
    RouteSerializer, 
    ScheduleSerializer, 
    BookingSerializer, 
    PaymentSerializer
)
from .mpesa import MpesaClient
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

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    @action(detail=False, methods=['post'])
    def stk_push(self, request):
        phone_number = request.data.get('phone_number')
        amount = request.data.get('amount')
        booking_id = request.data.get('booking_id')
        
        if not phone_number or not amount or not booking_id:
            return Response({"error": "phone_number, amount, and booking_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        client = MpesaClient()
        callback_url = os.getenv('MPESA_CALLBACK_URL')
        
        response = client.stk_push(phone_number, amount, callback_url)
        
        # Link the MerchantRequestID to the booking using our new model field
        if response.get('ResponseCode') == '0':
            merchant_id = response.get('MerchantRequestID')
            booking.merchant_request_id = merchant_id
            booking.save()
            print(f"STK Push initiated for Booking {booking.id}. MerchantID: {merchant_id}")
            
        return Response(response)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def callback(self, request):
        # Safaricom sends data inside a 'Body' -> 'stkCallback' structure
        data = request.data.get('Body', {}).get('stkCallback', {})
        result_code = data.get('ResultCode')
        merchant_request_id = data.get('MerchantRequestID')
        
        if result_code == 0:
            # Success! Extract metadata list
            items = data.get('CallbackMetadata', {}).get('Item', [])
            
            # Convert list of dicts to a single flat dictionary for easier access
            metadata = {item['Name']: item.get('Value') for item in items}
            
            receipt = metadata.get('MpesaReceiptNumber')
            amount = metadata.get('Amount')
            phone = metadata.get('PhoneNumber')

            # Find the booking linked to this MerchantRequestID using our new field
            try:
                booking = Booking.objects.get(merchant_request_id=merchant_request_id)
                booking.status = 'PAID'
                booking.save()

                # Create the payment record
                Payment.objects.create(
                    booking=booking,
                    amount=amount,
                    transaction_id=receipt,
                    phone_number=phone
                )
                print(f"--- DATABASE UPDATED ---")
                print(f"Booking {booking.id} marked as PAID. Receipt: {receipt}")

            except Booking.DoesNotExist:
                print(f"--- ERROR ---")
                print(f"Callback received for unknown MerchantRequestID: {merchant_request_id}")
            
            return Response({"ResultCode": 0, "ResultDesc": "Success"})
        
        else:
            result_desc = data.get('ResultDesc')
            print(f"--- PAYMENT FAILED/CANCELLED ---")
            print(f"Code: {result_code} | Reason: {result_desc}")
            return Response({"ResultCode": 0, "ResultDesc": "Acknowledged"})