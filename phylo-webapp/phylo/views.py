import json

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.views import LoginView, LogoutView
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from .forms import RegistrationForm, StyledAuthenticationForm
from .models import AnalysisRun


def home(_: HttpRequest) -> HttpResponse:
    return redirect("dashboard")


def register_view(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "Account created successfully.")
            return redirect("dashboard")
    else:
        form = RegistrationForm()
    return render(request, "phylo/register.html", {"form": form})


class UserLoginView(LoginView):
    template_name = "phylo/login.html"
    authentication_form = StyledAuthenticationForm

    def get_success_url(self) -> str:
        return reverse("dashboard")


class UserLogoutView(LogoutView):
    http_method_names = ["get", "post", "options"]
    next_page = "login"

    def get(self, request: HttpRequest, *args: object, **kwargs: object) -> HttpResponse:
        return self.post(request, *args, **kwargs)


@login_required
def dashboard(request: HttpRequest) -> HttpResponse:
    return redirect("algo_lab")


@login_required
def algo_lab(request: HttpRequest) -> HttpResponse:
    """Client-side D3 algorithm lab (UPGMA, NJ, parsimony, etc.)."""
    return render(request, "phylo/algo_lab.html", {})


@login_required
def distance_analysis(request: HttpRequest) -> HttpResponse:
    """Legacy URL: tree building is now in the Algorithm lab."""
    if request.method == "POST":
        messages.info(
            request,
            "Distance-based trees are built in the Algorithm lab in your browser. Use Run there to see UPGMA, NJ, and related methods.",
        )
        return redirect("algo_lab")
    return render(request, "phylo/algo_lab.html", {})


@login_required
def character_analysis(request: HttpRequest) -> HttpResponse:
    """Legacy URL: parsimony and character methods are in the Algorithm lab."""
    if request.method == "POST":
        messages.info(
            request,
            "Character-based analyses run in the Algorithm lab. Open Fitch, Sankoff, NNI, or Perfect phylogeny there.",
        )
        return redirect("algo_lab")
    return render(request, "phylo/algo_lab.html", {})


@login_required
def results_index(request: HttpRequest) -> HttpResponse:
    runs = AnalysisRun.objects.filter(user=request.user)
    return render(request, "phylo/results_index.html", {"runs": runs})


@login_required
def recent_runs(request: HttpRequest) -> HttpResponse:
    runs = AnalysisRun.objects.filter(user=request.user)[:20]
    return render(request, "phylo/recent_runs.html", {"runs": runs})


@login_required
def run_payload_api(request: HttpRequest, run_id: int) -> JsonResponse:
    run = get_object_or_404(AnalysisRun, id=run_id, user=request.user)
    return JsonResponse(
        {
            "ok": True,
            "run": {
                "id": run.id,
                "analysis_type": run.analysis_type,
                "title": run.title,
                "created_at": run.created_at.isoformat(),
                "input_payload": json.loads(run.input_payload),
                "result_payload": json.loads(run.result_payload),
            },
        }
    )


def _load_run_context(request: HttpRequest, run_id: int) -> dict[str, object]:
    run = get_object_or_404(AnalysisRun, id=run_id, user=request.user)
    result_payload = json.loads(run.result_payload)
    return {
        "run": run,
        "input_payload": json.loads(run.input_payload),
        "result_payload": result_payload,
        "is_distance": run.analysis_type in ("UPGMA", "NJ"),
    }


@login_required
def run_summary(request: HttpRequest, run_id: int) -> HttpResponse:
    return render(request, "phylo/run_summary.html", _load_run_context(request, run_id))


@login_required
def run_graphs(request: HttpRequest, run_id: int) -> HttpResponse:
    return render(request, "phylo/run_graphs.html", _load_run_context(request, run_id))


@login_required
def run_steps(request: HttpRequest, run_id: int) -> HttpResponse:
    return render(request, "phylo/run_steps.html", _load_run_context(request, run_id))


@login_required
def run_detail(request: HttpRequest, run_id: int) -> HttpResponse:
    return redirect("run_summary", run_id=run_id)


@login_required
@require_POST
def save_run_api(request: HttpRequest) -> JsonResponse:
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    analysis_type = str(payload.get("analysis_type", "")).strip()[:20]
    if not analysis_type:
        return JsonResponse({"ok": False, "error": "Missing analysis_type."}, status=400)

    title = str(payload.get("title", "")).strip()[:180]
    input_payload = payload.get("input_payload", {})
    result_payload = payload.get("result_payload", {})

    run = AnalysisRun.objects.create(
        user=request.user,
        title=title,
        analysis_type=analysis_type,
        input_payload=json.dumps(input_payload),
        result_payload=json.dumps(result_payload),
    )
    return JsonResponse({"ok": True, "run_id": run.id})
