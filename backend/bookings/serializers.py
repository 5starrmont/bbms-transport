from rest_framework import serializers
from .models import Bus, Route, Schedule, Booking, Payment

class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = '__all__'

class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'

class ScheduleSerializer(serializers.ModelSerializer):
    bus_details = BusSerializer(source='bus', read_only=True)
    route_details = RouteSerializer(source='route', read_only=True)
    # This field will return a list of integers, e.g., [2, 15, 20]
    booked_seats = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'bus', 'route', 'departure_time', 'price', 
            'bus_details', 'route_details', 'booked_seats'
        ]

    def get_booked_seats(self, obj):
        # We only want to show seats as "taken" if the booking is PENDING or PAID
        return list(obj.bookings.filter(
            status__in=['PENDING', 'PAID']
        ).values_list('seat_number', flat=True))

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        # fields = '__all__' will now automatically pick up passenger_email
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'