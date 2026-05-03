from __future__ import annotations

from typing import Any

from django.http import HttpRequest


def phylo_shell(request: HttpRequest) -> dict[str, Any]:
    """Sidebar + shell: saved run count for the signed-in user."""
    if not request.user.is_authenticated:
        return {"phylo_saved_runs": 0}
    from .models import AnalysisRun

    return {"phylo_saved_runs": AnalysisRun.objects.filter(user=request.user).count()}
