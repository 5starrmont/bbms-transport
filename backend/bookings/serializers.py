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
    # These show the nested details instead of just the ID numbers
    bus = BusSerializer(read_only=True)
    route = RouteSerializer(read_only=True)

    class Meta:
        model = Schedule
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'