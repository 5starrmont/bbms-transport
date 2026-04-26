from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    BusViewSet, 
    StationViewSet, 
    ScheduleViewSet, 
    BookingViewSet, 
    PaymentViewSet,
    UserProfileViewSet
)

# The DefaultRouter automatically maps @action decorators.
router = DefaultRouter()

# Registering the ViewSets
router.register(r'buses', BusViewSet, basename='bus')
router.register(r'stations', StationViewSet, basename='station')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'payments', PaymentViewSet, basename='payment')

# User profile is handled via the list action in UserProfileViewSet
router.register(r'user/profile', UserProfileViewSet, basename='user-profile') 

urlpatterns = [
    # JWT Auth Endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints
    path('', include(router.urls)),
]