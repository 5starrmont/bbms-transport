from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Bus, Station, Schedule, Booking, Payment, OperatorProfile

# 1. Allow editing Station/Phone directly inside the User edit page
class OperatorProfileInline(admin.StackedInline):
    model = OperatorProfile
    can_delete = False
    verbose_name_plural = 'Operator Profile'

class UserAdmin(BaseUserAdmin):
    inlines = (OperatorProfileInline,)

# Re-register User with the new inline
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# 2. Register the new Station model
@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ('name', 'location_code')
    search_fields = ('name', 'location_code')

# 3. Updated Model Registrations
@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('bus_number', 'driver_name', 'capacity', 'bus_type', 'current_location')
    search_fields = ('bus_number', 'driver_name')
    list_filter = ('bus_type', 'current_location')

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('bus', 'origin', 'destination', 'departure_time', 'price', 'status')
    list_filter = ('status', 'departure_time', 'origin', 'destination')
    search_fields = ('bus__bus_number', 'origin__name', 'destination__name')
    date_hierarchy = 'departure_time'

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('passenger_name', 'schedule', 'seat_number', 'status', 'is_checked_in')
    list_filter = ('status', 'is_checked_in', 'created_at')
    search_fields = ('passenger_name', 'passenger_email', 'merchant_request_id')
    raw_id_fields = ('schedule',) # Helpful when you have thousands of schedules

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'booking', 'amount', 'phone_number', 'paid_at')
    readonly_fields = ('paid_at',)
    search_fields = ('transaction_id', 'phone_number', 'booking__passenger_name')

@admin.register(OperatorProfile)
class OperatorProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'station', 'phone_number', 'is_active_operator')
    list_editable = ('station', 'is_active_operator')
    search_fields = ('user__username', 'phone_number')