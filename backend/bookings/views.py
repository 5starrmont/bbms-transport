from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import FileResponse
from django.db import transaction, models
from django.db.models import Sum, Q
from django.utils import timezone
from .models import Bus, Station, Schedule, Booking, Payment, OperatorProfile
from .serializers import (
    BusSerializer, 
    StationSerializer,
    ScheduleSerializer, 
    BookingSerializer, 
    PaymentSerializer,
    OperatorProfileSerializer
)
from .mpesa import MpesaClient
from .utils import generate_ticket_pdf, send_ticket_email, send_ticket_sms
import os

class StationViewSet(viewsets.ModelViewSet):
    queryset = Station.objects.all()
    serializer_class = StationSerializer
    permission_classes = [permissions.AllowAny]

class BusViewSet(viewsets.ModelViewSet):
    serializer_class = BusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Bus.objects.all()
        station_id = self.request.query_params.get('at_station')
        if station_id:
            queryset = queryset.filter(current_location_id=station_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        bus = self.get_object()
        if Schedule.objects.filter(bus=bus).exists():
            return Response(
                {"error": "Cannot delete bus assigned to active schedules. Delete schedules first."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Schedule.objects.all().select_related('bus', 'origin', 'destination').order_by('departure_time')
        
        if not self.request.user.is_authenticated:
            queryset = queryset.filter(
                departure_time__gt=timezone.now(),
                status='SCHEDULED'
            )
        
        origin = self.request.query_params.get('origin')
        destination = self.request.query_params.get('destination')
        date = self.request.query_params.get('date')
        
        if origin:
            queryset = queryset.filter(origin_id=origin)
        if destination:
            queryset = queryset.filter(destination_id=destination)
        if date:
            queryset = queryset.filter(departure_time__date=date)
            
        return queryset

    def create(self, request, *args, **kwargs):
        bus_id = request.data.get('bus')
        destination_id = request.data.get('destination') 
        departure_time = request.data.get('departure_time')
        price = request.data.get('price')

        try:
            profile = request.user.operator_profile
            origin_station = profile.station
        except Exception:
            return Response({"error": "Only authorized operators can create schedules."}, status=403)

        if not destination_id:
            return Response({"error": "Destination station is required."}, status=400)

        try:
            with transaction.atomic():
                schedule = Schedule.objects.create(
                    bus_id=bus_id,
                    origin=origin_station,
                    destination_id=destination_id,
                    departure_time=departure_time,
                    price=price,
                    status='SCHEDULED'
                )
                
                serializer = self.get_serializer(schedule)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def station_board(self, request):
        try:
            profile = request.user.operator_profile
            station = profile.station
        except Exception:
            return Response({"error": "Operator profile or station not found"}, status=404)

        if not station:
            return Response({"error": "No station assigned to this operator"}, status=400)

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timezone.timedelta(days=1)

        # Departures: ONLY show 'SCHEDULED' trips for today.
        departures = Schedule.objects.filter(
            origin=station,
            departure_time__range=(today_start, today_end),
            status='SCHEDULED'
        ).select_related('bus', 'destination').order_by('departure_time')

        # Arrivals: ONLY show trips that have actually 'DEPARTED' from their origin.
        arrivals = Schedule.objects.filter(
            destination=station,
            status='DEPARTED'
        ).select_related('bus', 'origin').order_by('departure_time')

        return Response({
            "station": station.name,
            "departures": ScheduleSerializer(departures, many=True).data,
            "arrivals": ScheduleSerializer(arrivals, many=True).data
        })

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        raw_status = request.data.get('status', '').strip().upper()
        if raw_status not in dict(Schedule.STATUS_CHOICES):
            return Response({"error": f"Invalid status: {raw_status}"}, status=400)

        try:
            with transaction.atomic():
                schedule = Schedule.objects.select_for_update().get(pk=pk)
                schedule.status = raw_status
                
                if raw_status == 'ARRIVED':
                    schedule.actual_arrival_time = timezone.now()
                    bus = schedule.bus
                    bus.current_location = schedule.destination
                    bus.save()
                
                elif raw_status == 'DEPARTED':
                    bus = schedule.bus
                    bus.current_location = None 
                    bus.save()

                schedule.save()
                
            serializer = self.get_serializer(schedule)
            return Response(serializer.data)
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def admin_list(self, request):
        try:
            station = request.user.operator_profile.station
        except Exception:
            return Response({"error": "No station assigned"}, status=400)

        # FIX: Remove .exclude(status='ARRIVED') so they show in history
        # Filter for trips where THIS station is either the Origin OR the Destination
        queryset = Schedule.objects.filter(
            Q(origin=station) | Q(destination=station)
        ).select_related('bus', 'origin', 'destination').order_by('-departure_time')

        destination = request.query_params.get('destination')
        date = request.query_params.get('date')
        bus_num = request.query_params.get('bus_number')

        if destination: queryset = queryset.filter(destination_id=destination)
        if date: queryset = queryset.filter(departure_time__date=date)
        if bus_num: queryset = queryset.filter(bus__bus_number__icontains=bus_num)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        schedule = self.get_object()
        if Booking.objects.filter(schedule=schedule, status='PAID').exists():
            return Response(
                {"error": "Cannot cancel trip with paid bookings."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        schedule_id = request.data.get('schedule')
        try:
            schedule = Schedule.objects.get(id=schedule_id)
            if schedule.status != 'SCHEDULED' or schedule.departure_time < timezone.now():
                return Response(
                    {"error": "Booking is closed for this trip."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Schedule.DoesNotExist:
            pass
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['get'], authentication_classes=[], permission_classes=[])
    def download_ticket(self, request, pk=None):
        try:
            booking = Booking.objects.get(pk=pk, status='PAID')
            pdf_buffer = generate_ticket_pdf(booking)
            return FileResponse(
                pdf_buffer, 
                as_attachment=True, 
                filename=f"TwendeBus_Ticket_{booking.id}.pdf"
            )
        except Booking.DoesNotExist:
            return Response({"error": "Paid booking not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify_ticket(self, request, pk=None):
        try:
            booking = Booking.objects.get(pk=pk)
            active_schedule_id = request.data.get('schedule_id')
            if active_schedule_id and str(booking.schedule.id) != str(active_schedule_id):
                return Response({
                    "error": f"Wrong Bus! This ticket is for {booking.schedule.origin.name} to {booking.schedule.destination.name}"
                }, status=status.HTTP_400_BAD_REQUEST)

            if booking.status != 'PAID':
                return Response({"error": "Ticket not paid."}, status=status.HTTP_400_BAD_REQUEST)
            
            if booking.is_checked_in:
                return Response({"error": "Ticket already used!"}, status=status.HTTP_400_BAD_REQUEST)
            
            booking.is_checked_in = True
            booking.save()
            
            return Response({
                "status": "success",
                "passenger": booking.passenger_name,
                "seat": booking.seat_number,
                "bus": booking.schedule.bus.bus_number,
                "route": f"{booking.schedule.origin.name} to {booking.schedule.destination.name}"
            })
        except Booking.DoesNotExist:
            return Response({"error": "Invalid ticket QR code."}, status=status.HTTP_404_NOT_FOUND)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-paid_at')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        today = timezone.now().date()
        today_revenue = Payment.objects.filter(paid_at__date=today).aggregate(Sum('amount'))['amount__sum'] or 0
        today_count = Payment.objects.filter(paid_at__date=today).count()
        return Response({
            "today_revenue": today_revenue,
            "today_count": today_count
        })

    @action(detail=False, methods=['post'])
    def stk_push(self, request):
        phone_number = request.data.get('phone_number')
        amount = request.data.get('amount')
        booking_id = request.data.get('booking_id')
        
        if not phone_number or not amount or not booking_id:
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found"}, status=status.HTTP_404_NOT_FOUND)

        client = MpesaClient()
        callback_url = os.getenv('MPESA_CALLBACK_URL')
        
        formatted_phone = phone_number
        if formatted_phone.startswith('0'): formatted_phone = '254' + formatted_phone[1:]
        elif formatted_phone.startswith('+254'): formatted_phone = formatted_phone[1:]

        response = client.stk_push(formatted_phone, int(float(amount)), callback_url)
        
        if response.get('ResponseCode') == '0':
            booking.merchant_request_id = response.get('MerchantRequestID')
            booking.save()
            
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
                try: send_ticket_sms(booking)
                except: pass
                if booking.passenger_email:
                    try: 
                        pdf_buffer = generate_ticket_pdf(booking)
                        send_ticket_email(booking, pdf_buffer)
                    except: pass
            except Booking.DoesNotExist: pass
            
        return Response({"ResultCode": 0, "ResultDesc": "Acknowledged"})

class UserProfileViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        try:
            profile = user.operator_profile
            return Response({
                "username": user.username,
                "station": profile.station.name if profile.station else None,
                "station_id": profile.station.id if profile.station else None,
                "is_operator": profile.is_active_operator
            })
        except AttributeError:
            return Response({
                "username": user.username,
                "station": None,
                "is_operator": user.is_staff or user.is_superuser
            })