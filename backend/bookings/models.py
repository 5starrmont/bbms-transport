from django.db import models
from django.contrib.auth.models import User

class Station(models.Model):
    name = models.CharField(max_length=100, unique=True)
    location_code = models.CharField(max_length=10, blank=True, null=True, help_text="e.g. NBO, MSA")

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Bus(models.Model):
    BUS_TYPES = [
        ('Economy', 'Economy'),
        ('Luxury', 'Luxury'),
        ('VIP', 'VIP'),
    ]

    bus_number = models.CharField(max_length=20, unique=True)
    capacity = models.PositiveIntegerField(default=40)
    bus_type = models.CharField(max_length=20, choices=BUS_TYPES, default='Luxury')
    
    # Links bus to a physical station for dispatch control
    current_location = models.ForeignKey(
        Station, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='buses_at_station'
    )

    # Driver Information
    driver_name = models.CharField(max_length=100, default="Not Assigned")
    driver_phone = models.CharField(max_length=15, blank=True, null=True)
    driver_license_number = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Buses"

    def __str__(self):
        return f"{self.bus_number} ({self.current_location})"

class Schedule(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('DEPARTED', 'Departed'),
        ('ARRIVED', 'Arrived'),
        ('CANCELLED', 'Cancelled'),
    ]

    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='schedules')
    
    # Direct station links instead of Routes
    origin = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='departures')
    destination = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='arrivals')
    
    departure_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    actual_arrival_time = models.DateTimeField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.bus.bus_number} | {self.origin} to {self.destination}"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]

    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='bookings')
    passenger_name = models.CharField(max_length=100)
    passenger_email = models.EmailField(max_length=254, null=True, blank=True) 
    seat_number = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    merchant_request_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    sms_sent = models.BooleanField(default=False) 
    is_checked_in = models.BooleanField(default=False) 
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.passenger_name} - Seat {self.seat_number}"

class Payment(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=15)
    paid_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment: {self.transaction_id} (Booking {self.booking.id})"

class OperatorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='operator_profile')
    phone_number = models.CharField(max_length=15, blank=True)
    station = models.ForeignKey(
        Station, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='operators'
    )
    is_active_operator = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} @ {self.station}"