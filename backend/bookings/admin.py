from django.contrib import admin
from .models import Bus, Route, Schedule, Booking, Payment

@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('bus_number', 'capacity')
    search_fields = ('bus_number',)

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('origin', 'destination', 'distance_km')
    list_filter = ('origin', 'destination')

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('bus', 'route', 'departure_time', 'price')
    list_filter = ('departure_time', 'route')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('passenger_name', 'schedule', 'seat_number', 'status', 'created_at')
    list_filter = ('status', 'schedule')
    search_fields = ('passenger_name',)

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'amount', 'transaction_id', 'phone_number', 'paid_at')
    readonly_fields = ('paid_at',)