from rest_framework import serializers
from .models import Bus, Station, Schedule, Booking, Payment, OperatorProfile

class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = ['id', 'name', 'location_code']

class BusSerializer(serializers.ModelSerializer):
    # This shows the station name instead of just an ID
    current_location_name = serializers.ReadOnlyField(source='current_location.name')

    class Meta:
        model = Bus
        fields = [
            'id', 
            'bus_number', 
            'capacity', 
            'bus_type', 
            'driver_name', 
            'driver_phone', 
            'driver_license_number',
            'current_location',
            'current_location_name'
        ]

class ScheduleSerializer(serializers.ModelSerializer):
    bus_details = BusSerializer(source='bus', read_only=True)
    
    # These fields extract the station names so the frontend doesn't show "null"
    origin_name = serializers.ReadOnlyField(source='origin.name')
    destination_name = serializers.ReadOnlyField(source='destination.name')
    
    booked_seats = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 
            'bus', 
            'origin', 
            'destination', 
            'origin_name',
            'destination_name',
            'departure_time', 
            'actual_arrival_time',
            'status', 
            'price', 
            'bus_details', 
            'booked_seats'
        ]

    def get_booked_seats(self, obj):
        return list(obj.bookings.filter(
            status__in=['PENDING', 'PAID']
        ).values_list('seat_number', flat=True))

class BookingSerializer(serializers.ModelSerializer):
    # Helpful for showing trip details in the booking confirmation
    origin_name = serializers.ReadOnlyField(source='schedule.origin.name')
    destination_name = serializers.ReadOnlyField(source='schedule.destination.name')

    class Meta:
        model = Booking
        fields = [
            'id', 'schedule', 'passenger_name', 'passenger_email', 
            'seat_number', 'status', 'merchant_request_id', 
            'is_checked_in', 'created_at', 'origin_name', 'destination_name'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    passenger_name = serializers.ReadOnlyField(source='booking.passenger_name')

    class Meta:
        model = Payment
        fields = [
            'id', 
            'booking', 
            'passenger_name', 
            'amount', 
            'transaction_id', 
            'phone_number', 
            'paid_at'
        ]

class OperatorProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    station_name = serializers.ReadOnlyField(source='station.name')

    class Meta:
        model = OperatorProfile
        fields = ['id', 'username', 'phone_number', 'station', 'station_name', 'is_active_operator']