from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusViewSet, RouteViewSet, ScheduleViewSet, BookingViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'buses', BusViewSet)
router.register(r'routes', RouteViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'payments', PaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]