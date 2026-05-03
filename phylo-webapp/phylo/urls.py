from django.urls import path

from .views import (
    UserLoginView,
    UserLogoutView,
    algo_lab,
    character_analysis,
    dashboard,
    distance_analysis,
    home,
    recent_runs,
    register_view,
    results_index,
    run_detail,
    run_graphs,
    run_payload_api,
    save_run_api,
    run_steps,
    run_summary,
)

urlpatterns = [
    path("", home, name="home"),
    path("dashboard/", dashboard, name="dashboard"),
    path("analysis/lab/", algo_lab, name="algo_lab"),
    path("analysis/distance/", distance_analysis, name="distance_analysis"),
    path("analysis/character/", character_analysis, name="character_analysis"),
    path("recent/", recent_runs, name="recent_runs"),
    path("results/", results_index, name="results_index"),
    path("results/<int:run_id>/", run_summary, name="run_summary"),
    path("results/<int:run_id>/graphs/", run_graphs, name="run_graphs"),
    path("results/<int:run_id>/steps/", run_steps, name="run_steps"),
    path("history/<int:run_id>/", run_detail, name="run_detail"),
    path("api/runs/<int:run_id>/", run_payload_api, name="run_payload_api"),
    path("api/runs/save/", save_run_api, name="save_run_api"),
    path("register/", register_view, name="register"),
    path("login/", UserLoginView.as_view(), name="login"),
    path("logout/", UserLogoutView.as_view(), name="logout"),
]
