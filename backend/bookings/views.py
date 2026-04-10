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
        # Ensure we have the basic info needed for the push
        if not phone_number or not amount:
            return Response({"error": "phone_number and amount are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        client = MpesaClient()
        callback_url = os.getenv('MPESA_CALLBACK_URL')
        
        response = client.stk_push(phone_number, amount, callback_url)
        return Response(response)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def callback(self, request):
        # This is where Safaricom sends the result
        data = request.data
        # For now, we print to console to verify the connection
        print(f"M-Pesa Callback Data received: {data}") 
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})