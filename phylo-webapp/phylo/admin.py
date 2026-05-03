from django.contrib import admin

from .models import AnalysisRun


@admin.register(AnalysisRun)
class AnalysisRunAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "analysis_type", "title", "created_at")
    list_filter = ("analysis_type", "created_at")
    search_fields = ("title", "user__username")

# Register your models here.
